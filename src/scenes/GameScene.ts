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
import { ENEMIES, killsByTypeToBreakdown } from '../data/enemies';
import { CentipedeController } from '../entities/Centipede';
import { recordRun } from '../core/save';
import { audio } from '../core/audio';
import { InputSystem } from '../systems/InputSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { AbilitySystem } from '../systems/AbilitySystem';
import { Hud } from '../ui/Hud';
import { GAME_WIDTH, GAME_HEIGHT, DEBUG } from '../config';

interface DissolveVfx {
  sprite: Phaser.GameObjects.Image;
  life: number;
  /** 開始時のスケール(敵ごとに半径が異なるため個体別に保持) */
  baseScale: number;
}

/** 撃破ディゾルブの生存時間(秒)・同時表示上限 */
const DISSOLVE_LIFETIME = 0.3;
const DISSOLVE_LIMIT = 40;

interface JinITrailVfx {
  sprite: Phaser.GameObjects.Image;
  life: number;
}

/** 迅移の残像トレイルの生存時間(秒)・同時表示上限(docs/03 §8) */
const JINI_TRAIL_LIFETIME = 0.25;
const JINI_TRAIL_LIMIT = 16;
const JINI_TRAIL_ALPHA = 0.5;

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
  /** レベルアップ3択の表示中か(PauseScene 起動判定用に公開) */
  get isChoosing(): boolean {
    return this.choosing;
  }

  player!: Player;
  centipede: CentipedeController | null = null;
  private bossSpawned = false;
  /** 出現中のボス(大型集合体)への参照。HUD のボス HP バー表示用(鉄則4: generation で世代照合) */
  boss: Enemy | null = null;
  bossGeneration = -1;
  /** デバッグ: 自動操縦(バランス計測ボット) */
  autopilot = false;
  /** デバッグ: 4 倍速シミュレーション */
  fastForward = false;
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
  /** 撃破ディゾルブ用のプール(事前確保・ラウンドロビンで再利用) */
  private dissolves: DissolveVfx[] = [];
  private dissolveCursor = 0;
  /** 迅移の残像トレイル用のプール(事前確保・ラウンドロビンで再利用) */
  private jinITrails: JinITrailVfx[] = [];
  private jinITrailCursor = 0;

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
    this.boss = null;
    this.bossGeneration = -1;
    this.autopilot = false;
    this.fastForward = false;

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

    this.dissolves = [];
    for (let i = 0; i < DISSOLVE_LIMIT; i++) {
      this.dissolves.push({
        sprite: this.add.image(0, 0, 'enemy-insect').setDepth(4).setTint(0x604080).setVisible(false),
        life: 0,
        baseScale: 1,
      });
    }
    this.dissolveCursor = 0;

    this.jinITrails = [];
    for (let i = 0; i < JINI_TRAIL_LIMIT; i++) {
      this.jinITrails.push({
        sprite: this.add.image(0, 0, 'player').setDepth(9).setTint(0x3050ff).setVisible(false),
        life: 0,
      });
    }
    this.jinITrailCursor = 0;

    this.inputSystem = new InputSystem(this);
    this.spawnSystem = new SpawnSystem(this);
    this.enemySystem = new EnemySystem(this);
    this.playerSystem = new PlayerSystem(this);
    this.abilitySystem = new AbilitySystem(this);
    this.pickupSystem = new PickupSystem(this);
    this.hud = new Hud(this);

    this.cameras.main.startFollow(this.player.sprite, false, 0.15, 0.15);

    // デバッグ: ヘッドレス計測ボットから状態を読むための公開(DEV のみ)
    if (DEBUG) (window as unknown as { __game: GameScene }).__game = this;

    const onLevelUp = () => {
      this.cameras.main.flash(150, 155, 92, 240, false);
      audio.levelUp();
    };
    const onPlayerHit = () => {
      this.cameras.main.shake(100, 0.004);
      audio.playerHit();
    };
    this.events.on('level-up', onLevelUp);
    this.events.on('player-hit', onPlayerHit);
    this.events.once('shutdown', () => {
      this.events.off('level-up', onLevelUp);
      this.events.off('player-hit', onPlayerHit);
    });
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    let dt = Math.min(delta, 50) / 1000; // dt 上限クランプ(docs/04 §3)
    if (this.fastForward) dt *= 4; // デバッグ: バランス計測用の倍速
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
    this.updateDissolves(dt);
    this.updateJinITrails(dt);
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
    this.boss = slot;
    this.bossGeneration = slot.generation;
    this.showBanner('大型荒魂 出現 — 討伐せよ');
    audio.bossRoar();
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

  /** ESC で一時停止メニューを開く(LevelUp 表示中は呼び出し元で無視される) */
  openPause(): void {
    if (this.choosing || this.ended) return;
    this.scene.launch('Pause');
    this.scene.pause();
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
    audio.kill();
    const wasHead = enemy.def.id === 'centipedeHead';
    const wasBoss = enemy.def.id === 'amalgam';
    enemy.despawn();
    this.enemies.release(enemy);
    if (wasHead) this.centipede?.onHeadKilled(this); // 頭の撃破で残りの節も崩れる
    if (wasBoss) this.endRun(true);
  }

  /** 撃破ディゾルブ: 黒紫の残骸が崩れてノロに戻る 0.3 秒の演出。プール化(鉄則2: ラン中の new / GC を避ける) */
  private showDissolve(enemy: Enemy): void {
    const v = this.dissolves[this.dissolveCursor];
    this.dissolveCursor = (this.dissolveCursor + 1) % this.dissolves.length;
    v.life = DISSOLVE_LIFETIME;
    v.baseScale = enemy.radius / enemy.def.radius;
    v.sprite
      .setTexture(enemy.def.textureKey)
      .setPosition(enemy.x, enemy.y)
      .setScale(v.baseScale)
      .setAlpha(1)
      .setVisible(true);
  }

  /** ディゾルブ VFX の毎フレーム減衰(tween ではなく手動更新。PlayerSystem の斬撃VFXと同方式) */
  private updateDissolves(dt: number): void {
    for (const v of this.dissolves) {
      if (v.life <= 0) continue;
      v.life -= dt;
      const t = Math.max(0, v.life / DISSOLVE_LIFETIME);
      v.sprite.setAlpha(t).setScale(v.baseScale * (0.6 + 0.4 * t));
      if (v.life <= 0) v.sprite.setVisible(false);
    }
  }

  /**
   * 迅移の残像トレイルを1個配置(プール化・ラウンドロビンで再利用、鉄則2)。
   * AbilitySystem から移動距離ベースで一定間隔ごとに呼ばれる(docs/03 §8)。
   */
  showJinITrail(x: number, y: number): void {
    const v = this.jinITrails[this.jinITrailCursor];
    this.jinITrailCursor = (this.jinITrailCursor + 1) % this.jinITrails.length;
    v.life = JINI_TRAIL_LIFETIME;
    v.sprite.setPosition(x, y).setAlpha(JINI_TRAIL_ALPHA).setVisible(true);
  }

  /** 残像トレイルの毎フレーム減衰(tween ではなく手動更新。ディゾルブと同方式) */
  private updateJinITrails(dt: number): void {
    for (const v of this.jinITrails) {
      if (v.life <= 0) continue;
      v.life -= dt;
      const t = Math.max(0, v.life / JINI_TRAIL_LIFETIME);
      v.sprite.setAlpha(JINI_TRAIL_ALPHA * t);
      if (v.life <= 0) v.sprite.setVisible(false);
    }
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
    audio.jingle(victory);
    // 最終ビルド一覧(取得した強化と回数)
    const build = UPGRADES.filter((u) => (this.takes[u.id] ?? 0) > 0).map(
      (u) => `${u.nameJa}${(this.takes[u.id] ?? 0) > 1 ? ` ×${this.takes[u.id]}` : ''}`,
    );
    const killBreakdown = killsByTypeToBreakdown(this.killsByType);
    this.scene.start('Result', {
      ...record,
      characterName: this.player.def.name,
      build,
      killBreakdown,
      bestUpdated,
    });
  }

  /** デバッグ: 時間スキップ */
  skipTime(sec: number): void {
    this.runTime += sec;
  }
}
