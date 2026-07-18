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
import { CHARACTERS } from '../data/characters';
import { UPGRADES, type UpgradeDef } from '../data/upgrades';
import {
  ENEMY_POOL_LIMIT,
  ENEMY_POOL_PREALLOC,
  GEM_POOL_LIMIT,
  RUN_DURATION,
} from '../data/balance';
import { InputSystem } from '../systems/InputSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { Hud } from '../ui/Hud';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

/** ゲームプレイ本体。システムを固定順で更新する(docs/02 §3.2) */
export class GameScene extends Phaser.Scene {
  rng!: Rng;
  runTime = 0;
  kills = 0;
  xp = 0;
  level = 1;
  /** 強化の取得回数(id → 回数) */
  takes: Record<string, number> = {};
  /** 未消化のレベルアップ 3 択の数 */
  private pendingChoices = 0;
  private choosing = false;

  player!: Player;
  enemies!: ObjectPool<Enemy>;
  gems!: ObjectPool<Gem>;
  projectiles!: ObjectPool<Projectile>;
  enemyHash!: SpatialHash<Enemy>;
  gemHash!: SpatialHash<Gem>;

  inputSystem!: InputSystem;
  spawnSystem!: SpawnSystem;
  enemySystem!: EnemySystem;
  private playerSystem!: PlayerSystem;
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
    this.xp = 0;
    this.level = 1;
    this.takes = {};
    this.pendingChoices = 0;
    this.choosing = false;
    this.ended = false;

    this.bg = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-tile')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(0);

    // M2 は可奈美固定。キャラ選択は M3 で追加
    this.player = new Player(this, CHARACTERS.kanami, 0, 0);
    this.enemies = new ObjectPool(() => new Enemy(this), ENEMY_POOL_PREALLOC, ENEMY_POOL_LIMIT);
    this.gems = new ObjectPool(() => new Gem(this), 200, GEM_POOL_LIMIT);
    this.projectiles = new ObjectPool(() => new Projectile(this), 30, 100);
    this.enemyHash = new SpatialHash<Enemy>(64);
    this.gemHash = new SpatialHash<Gem>(64);

    this.inputSystem = new InputSystem(this);
    this.spawnSystem = new SpawnSystem(this);
    this.enemySystem = new EnemySystem(this);
    this.playerSystem = new PlayerSystem(this);
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
    this.enemySystem.update(dt); // 移動・再生・空間ハッシュ再構築
    this.playerSystem.update(dt); // 移動・オート攻撃(ハッシュ参照)・斬撃波
    this.enemySystem.contact(); // 接触ダメージ
    this.pickupSystem.update(dt);
    this.hud.update();

    this.bg.setTilePosition(this.cameras.main.scrollX, this.cameras.main.scrollY);

    this.maybeOpenLevelUp();

    if (this.runTime >= RUN_DURATION) this.endRun(true); // M4 でボス撃破条件に差し替え
  }

  /** 未消化のレベルアップがあれば 3 択を開く(1 回分ずつ) */
  private maybeOpenLevelUp(): void {
    if (this.choosing || this.pendingChoices <= 0 || this.ended) return;
    const options = drawUpgrades(UPGRADES, this.takes, () => this.rng.next());
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

  /** 敵撃破: ノロジェムをドロップしてプールへ返す */
  killEnemy(enemy: Enemy): void {
    this.kills++;
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
    enemy.despawn();
    this.enemies.release(enemy);
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
    this.scene.start('Result', {
      victory,
      timeSec: this.runTime,
      kills: this.kills,
      level: this.level,
    });
  }

  /** デバッグ: 時間スキップ */
  skipTime(sec: number): void {
    this.runTime += sec;
  }
}
