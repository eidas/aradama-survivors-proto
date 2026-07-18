import Phaser from 'phaser';
import { Rng } from '../core/Rng';
import { SpatialHash } from '../core/SpatialHash';
import { ObjectPool } from '../core/ObjectPool';
import { xpForNext } from '../core/xp';
import { drawUpgrades } from '../core/upgradeDraw';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gem } from '../entities/Gem';
import { Projectile } from '../entities/Projectile';
import { CHARACTERS, MAMORI_UTSUSHI_HEAL, type CharacterId } from '../data/characters';
import { UPGRADES, type UpgradeDef } from '../data/upgrades';
import {
  BOSS_TIMEOUT,
  ENEMY_POOL_LIMIT,
  ENEMY_POOL_PREALLOC,
  GEM_POOL_LIMIT,
} from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { CentipedeController } from '../entities/Centipede';
import { recordRun } from '../core/save';
import { InputSystem } from '../systems/InputSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { AbilitySystem } from '../systems/AbilitySystem';
import { Hud } from '../ui/Hud';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

/** ゲームプレイ本体。システムを固定順で更新する(docs/02 §3.2) */
export class GameScene extends Phaser.Scene {
  rng!: Rng;
  runTime = 0;
  kills = 0;
  /** 敵タイプ別の撃破数(可奈美の見取り稽古用) */
  killsByType: Record<string, number> = {};
  xp = 0;
  level = 1;
  /** 強化の取得回数(id → 回数) */
  takes: Record<string, number> = {};
  /** 未消化のレベルアップ 3 択の数 */
  private pendingChoices = 0;
  private choosing = false;

  player!: Player;
  centipede: CentipedeController | null = null;
  private bossSpawned = false;
  enemies!: ObjectPool<Enemy>;
  gems!: ObjectPool<Gem>;
  projectiles!: ObjectPool<Projectile>;
  enemyHash!: SpatialHash<Enemy>;
  gemHash!: SpatialHash<Gem>;

  inputSystem!: InputSystem;
  spawnSystem!: SpawnSystem;
  enemySystem!: EnemySystem;
  playerSystem!: PlayerSystem;
  abilitySystem!: AbilitySystem;
  private pickupSystem!: PickupSystem;
  private hud!: Hud;
  private bg!: Phaser.GameObjects.TileSprite;
  private ended = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.rng = new Rng(Date.now() >>> 0);
    this.runTime = 0;
    this.kills = 0;
    this.killsByType = {};
    this.xp = 0;
    this.level = 1;
    this.takes = {};
    this.pendingChoices = 0;
    this.choosing = false;
    this.ended = false;
    this.centipede = null;
    this.bossSpawned = false;

    this.bg = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-tile')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(0);

    const charId = (this.registry.get('characterId') as CharacterId) ?? 'kanami';
    this.player = new Player(this, CHARACTERS[charId], 0, 0);
    this.enemies = new ObjectPool(() => new Enemy(this), ENEMY_POOL_PREALLOC, ENEMY_POOL_LIMIT);
    this.gems = new ObjectPool(() => new Gem(this), 200, GEM_POOL_LIMIT);
    this.projectiles = new ObjectPool(() => new Projectile(this), 30, 100);
    this.enemyHash = new SpatialHash<Enemy>(64);
    this.gemHash = new SpatialHash<Gem>(64);

    this.inputSystem = new InputSystem(this);
    this.spawnSystem = new SpawnSystem(this);
    this.enemySystem = new EnemySystem(this);
    this.playerSystem = new PlayerSystem(this);
    this.abilitySystem = new AbilitySystem(this);
    this.pickupSystem = new PickupSystem(this);
    this.hud = new Hud(this);

    this.cameras.main.startFollow(this.player.sprite, false, 0.15, 0.15);

    const onLevelUp = () => this.cameras.main.flash(150, 155, 92, 240, false);
    const onPlayerHit = () => this.cameras.main.shake(100, 0.004);
    this.events.on('level-up', onLevelUp);
    this.events.on('player-hit', onPlayerHit);
    this.events.once('shutdown', () => {
      this.events.off('level-up', onLevelUp);
      this.events.off('player-hit', onPlayerHit);
    });
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta, 50) / 1000; // dt 上限クランプ(docs/04 §3)
    this.runTime += dt;

    this.inputSystem.update();
    this.spawnSystem.update(dt);
    this.centipede?.update(dt, this); // 百足の連結移動(ハッシュ登録前)
    this.enemySystem.update(dt); // 移動・再生・空間ハッシュ再構築
    if (this.ended) return; // ボスの薙ぎ払いでラン終了した場合
    this.abilitySystem.update(dt); // 迅移・金剛身・八幡力(ハッシュ参照)
    if (this.ended) return;
    this.playerSystem.update(dt); // 移動・オート攻撃・斬撃波
    this.enemySystem.contact(); // 接触ダメージ
    this.pickupSystem.update(dt);
    this.hud.update();

    this.bg.setTilePosition(this.cameras.main.scrollX, this.cameras.main.scrollY);

    this.maybeOpenLevelUp();

    // 勝利条件はボス撃破(killEnemy 内)。18:00 を超えたら時間切れ敗北
    if (this.runTime >= BOSS_TIMEOUT) this.endRun(false);
  }

  /** 7:30 中ボス百足型の出現(SpawnSystem のイベントから) */
  spawnCentipede(): void {
    this.centipede = new CentipedeController();
    this.centipede.spawn(this);
    this.showBanner('中型荒魂 出現');
  }

  /** 15:00 大型集合体ボスの出現。撃破でクリア */
  spawnBoss(): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const boss = this.enemies.acquire();
    if (!boss) {
      // プール満杯なら最古の蟲型を 1 体消して確保する
      const victim = this.enemies.active.find((e) => e.def.id === 'insect');
      if (victim) {
        victim.despawn();
        this.enemies.release(victim);
      }
    }
    const slot = boss ?? this.enemies.acquire();
    if (!slot) return;
    const angle = this.rng.next() * Math.PI * 2;
    slot.spawn(
      ENEMIES.amalgam,
      this.player.x + Math.cos(angle) * 500,
      this.player.y + Math.sin(angle) * 500,
      1, // ボスは時間スケーリングなし(HP 2500 固定)
    );
    this.showBanner('大型荒魂 出現 — 討伐せよ');
  }

  /** 中央に 2.5 秒のバナー表示(ボス出現などの合図) */
  showBanner(text: string): void {
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, text, { fontSize: '40px', color: '#ff6040' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(110)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 1900,
      onComplete: () => banner.destroy(),
    });
  }

  /** 未消化のレベルアップがあれば 3 択を開く(1 回分ずつ) */
  private maybeOpenLevelUp(): void {
    if (this.choosing || this.pendingChoices <= 0 || this.ended) return;
    const ctx = { player: this.player };
    const options = drawUpgrades(
      UPGRADES,
      this.takes,
      () => this.rng.next(),
      3,
      (u) => u.isAvailable?.(ctx) ?? true,
    );
    if (options.length === 0) {
      this.pendingChoices = 0; // 全強化取り切り
      return;
    }
    this.choosing = true;
    this.scene.launch('LevelUp', { options, level: this.level });
    this.scene.pause();
  }

  /** LevelUpScene からの選択結果を適用 */
  applyUpgrade(upg: UpgradeDef): void {
    upg.apply({ player: this.player });
    this.takes[upg.id] = (this.takes[upg.id] ?? 0) + 1;
    this.pendingChoices--;
    this.choosing = false;
  }

  /** 守りの型(舞衣): 金剛身でダメージを防ぐたび写しが回復 */
  onGuarded(): void {
    const p = this.player;
    if (p.def.passive !== 'mamori') return;
    p.health.utsushi = Math.min(p.health.utsushiMax, p.health.utsushi + MAMORI_UTSUSHI_HEAL);
  }

  /** 金剛身解除の衝撃波などのリング演出 */
  showRing(x: number, y: number, radius: number): void {
    const ring = this.add.image(x, y, 'ring').setDepth(9).setScale(radius / 40);
    this.tweens.add({
      targets: ring,
      scale: (radius / 40) * 1.6,
      alpha: 0,
      duration: 250,
      onComplete: () => ring.destroy(),
    });
  }

  /** 敵撃破: ノロジェムをドロップしてプールへ返す。ボス撃破はクリア */
  killEnemy(enemy: Enemy): void {
    this.kills++;
    this.killsByType[enemy.def.id] = (this.killsByType[enemy.def.id] ?? 0) + 1;
    for (const drop of enemy.def.gemDrop) {
      for (let i = 0; i < drop.count; i++) {
        const gem = this.gems.acquire();
        if (gem) {
          gem.spawn(
            drop.size,
            enemy.x + this.rng.range(-10, 10),
            enemy.y + this.rng.range(-10, 10),
          );
        } else {
          // ジェムプール枯渇時は価値を直接 XP に計上(取りこぼし防止)
          this.addXp(drop.size === 'S' ? 1 : drop.size === 'M' ? 5 : 25);
        }
      }
    }
    this.showDissolve(enemy);
    const wasHead = enemy.def.id === 'centipedeHead';
    const wasBoss = enemy.def.id === 'amalgam';
    enemy.despawn();
    this.enemies.release(enemy);
    if (wasHead) this.centipede?.onHeadKilled(this); // 頭の撃破で残りの節も崩れる
    if (wasBoss) this.endRun(true);
  }

  /** 撃破ディゾルブ: 黒い体が崩れてノロに戻る 0.3 秒の演出。同時数は抑制 */
  private dissolveCount = 0;
  private showDissolve(enemy: Enemy): void {
    if (this.dissolveCount >= 40) return;
    this.dissolveCount++;
    const ghost = this.add
      .image(enemy.x, enemy.y, enemy.def.textureKey)
      .setDepth(4)
      .setTint(0x604080)
      .setScale(enemy.radius / enemy.def.radius);
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: ghost.scale * 0.6,
      duration: 300,
      onComplete: () => {
        ghost.destroy();
        this.dissolveCount--;
      },
    });
  }

  /** 中ボス撃破ボーナス: 強化ピック 1 回(docs/03 §5.1) */
  grantBonusChoice(): void {
    this.pendingChoices++;
    this.showBanner('中型荒魂 討伐 — 強化ボーナス');
  }

  addXp(value: number): void {
    this.xp += value;
    while (this.xp >= xpForNext(this.level)) {
      this.xp -= xpForNext(this.level);
      this.level++;
      this.pendingChoices++;
      this.events.emit('level-up', this.level);
    }
  }

  endRun(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    const record = { victory, timeSec: this.runTime, kills: this.kills, level: this.level };
    const bestUpdated = recordRun(record);
    // 最終ビルド一覧(取得した強化と回数)
    const build = UPGRADES.filter((u) => (this.takes[u.id] ?? 0) > 0).map(
      (u) => `${u.nameJa}${(this.takes[u.id] ?? 0) > 1 ? ` ×${this.takes[u.id]}` : ''}`,
    );
    this.scene.start('Result', {
      ...record,
      characterName: this.player.def.name,
      build,
      bestUpdated,
    });
  }

  /** デバッグ: 時間スキップ */
  skipTime(sec: number): void {
    this.runTime += sec;
  }
}
