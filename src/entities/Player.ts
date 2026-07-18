import Phaser from 'phaser';
import type { AbilityId, CharacterDef } from '../data/characters';
import { createPlayerHealth, type PlayerHealth } from '../core/health';
import { UTSUSHI_LEVELS } from '../data/abilities';
import { RunMods } from '../core/mods';

export class Player {
  x: number;
  y: number;
  readonly radius = 12;
  readonly def: CharacterDef;
  readonly health: PlayerHealth;
  readonly mods = new RunMods();
  readonly sprite: Phaser.GameObjects.Image;

  /** 隠世の力の現在レベル(全能力 Lv1 スタート、キャラごとのキャップまで強化可) */
  readonly abilityLevels: Record<AbilityId, number> = {
    utsushi: 1,
    jinI: 1,
    kongoushin: 1,
    hachimanriki: 1,
  };

  moveX = 0;
  moveY = 0;
  aimAngle = 0;
  attackTimer = 0;
  /** 最後に斬撃を放った時刻(runTime 基準)。姫和の居合判定に使う */
  lastSlashAt = -999;

  // AbilitySystem が毎フレーム更新する状態フラグ
  dashing = false;
  guarding = false;
  charging = false;
  chargeStage = 0;
  /** 迅移の残心: 残り秒(>0 の間 攻撃力 +50%) */
  zanshinTimer = 0;

  /** デバッグ用無敵 */
  cheatInvincible = false;

  constructor(scene: Phaser.Scene, def: CharacterDef, x: number, y: number) {
    this.def = def;
    this.x = x;
    this.y = y;
    const lv = UTSUSHI_LEVELS[0];
    this.health = createPlayerHealth(
      def.hp,
      lv.capacity * def.utsushiCapacityMul,
      lv.regenRate,
      lv.regenDelay,
    );
    this.sprite = scene.add.image(x, y, 'player').setDepth(10);
  }

  /** 写しレベル(と深呼吸ボーナス)を health に反映。レベルアップ時はバリアも全快する */
  applyUtsushiLevel(): void {
    const lv = UTSUSHI_LEVELS[this.abilityLevels.utsushi - 1];
    this.health.utsushiMax = lv.capacity * this.def.utsushiCapacityMul;
    this.health.utsushiRegenRate = lv.regenRate;
    this.health.utsushiRegenDelay = Math.max(1, lv.regenDelay + this.mods.utsushiDelayBonus);
    this.health.utsushi = this.health.utsushiMax;
  }

  // ── 強化を反映した実効値 ──
  get attackPower(): number {
    const zanshin = this.zanshinTimer > 0 ? 1.5 : 1;
    return this.def.attack.power * this.mods.attackMul * zanshin;
  }
  get attackInterval(): number {
    return this.def.attack.interval * this.mods.intervalMul;
  }
  get attackRadius(): number {
    return this.def.attack.radius * this.mods.rangeMul;
  }
  get attackArcDeg(): number {
    return Math.min(360, this.def.attack.arcDeg * this.mods.rangeMul);
  }
  get moveSpeed(): number {
    return this.def.moveSpeed * this.mods.moveSpeedMul;
  }
  get pickupRadius(): number {
    return this.def.pickupRadius * this.mods.pickupMul;
  }

  syncSprite(): void {
    this.sprite.setPosition(this.x, this.y);
  }
}
