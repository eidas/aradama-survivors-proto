import Phaser from 'phaser';
import type { Poolable } from '../core/ObjectPool';
import type { EnemyDef } from '../data/enemies';
import { applyEliteScaling } from '../core/combat';
import { ELITE_STAT_MULTS, ELITE_TINT } from '../data/balance';

export class Enemy implements Poolable {
  active = false;
  poolIndex = -1;

  x = 0;
  y = 0;
  hp = 0;
  maxHp = 0;
  speed = 0;
  contactDamage = 0;
  radius = 10;
  /** 最終被弾時刻(runTime 基準)。荒魂の自動再生判定に使う */
  lastHitAt = -999;
  flashTimer = 0;
  def!: EnemyDef;

  // AI 状態(意味は EnemySystem の各ビヘイビア参照)
  aiState = 0;
  aiTimer = 0;
  dirX = 0;
  dirY = 0;
  orbitAngle = 0;
  /** 予備動作中(鍔迫りの打ち消し対象判定にも使う) */
  telegraphing = false;
  /** spawn ごとに増える世代番号。プール再利用後の古い参照を無効判定するために使う */
  generation = 0;
  /** 荒魂特異体(エリート敵)か。spawn 時に必ず再設定する(プール再利用対策) */
  isElite = false;

  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'enemy-insect').setVisible(false).setDepth(5);
  }

  spawn(def: EnemyDef, x: number, y: number, statScale: number, isElite = false): void {
    this.def = def;
    this.x = x;
    this.y = y;
    this.isElite = isElite;
    const base = {
      hp: def.hp * statScale,
      contactDamage: def.contactDamage * statScale,
      radius: def.radius,
      speed: def.speed,
    };
    const scaled = isElite ? applyEliteScaling(base, ELITE_STAT_MULTS) : base;
    this.maxHp = scaled.hp;
    this.hp = this.maxHp;
    this.speed = scaled.speed;
    this.contactDamage = scaled.contactDamage;
    this.radius = scaled.radius;
    this.lastHitAt = -999;
    this.flashTimer = 0;
    this.aiState = 0;
    this.aiTimer = 0;
    this.dirX = 0;
    this.dirY = 0;
    this.orbitAngle = 0;
    this.telegraphing = false;
    this.generation++;
    this.sprite.setTexture(def.textureKey).setPosition(x, y).setVisible(true).clearTint().setScale(1);
  }

  despawn(): void {
    this.sprite.setVisible(false);
  }

  syncSprite(): void {
    this.sprite.setPosition(this.x, this.y);
    // ボスの吸収成長など、半径が定義値から変わったらスプライトも拡大
    if (this.radius !== this.def.radius) this.sprite.setScale(this.radius / this.def.radius);
    // tint 優先順位: 被弾フラッシュ(白) > 予備動作(橙) > 特異体(紫) > 通常
    if (this.flashTimer > 0) {
      this.sprite.setTintFill(0xffffff);
    } else if (this.telegraphing) {
      this.sprite.setTint(0xffaa00); // 予備動作: コアの発光が強まる表現
    } else if (this.isElite) {
      // 特異体: 通常の setTint(乗算)だと素体がほぼ黒のテクスチャで視認しづらいため、
      // 被弾フラッシュと同じ setTintFill(塗りつぶし)で紫の発光として明確に区別する
      this.sprite.setTintFill(ELITE_TINT);
    } else {
      this.sprite.clearTint();
    }
  }
}
