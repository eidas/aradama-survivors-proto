import Phaser from 'phaser';
import type { Poolable } from '../core/ObjectPool';
import type { EnemyDef } from '../data/enemies';

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

  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'enemy-insect').setVisible(false).setDepth(5);
  }

  spawn(def: EnemyDef, x: number, y: number, statScale: number): void {
    this.def = def;
    this.x = x;
    this.y = y;
    this.maxHp = def.hp * statScale;
    this.hp = this.maxHp;
    this.speed = def.speed;
    this.contactDamage = def.contactDamage * statScale;
    this.radius = def.radius;
    this.lastHitAt = -999;
    this.flashTimer = 0;
    this.sprite.setTexture(def.textureKey).setPosition(x, y).setVisible(true).clearTint();
  }

  despawn(): void {
    this.sprite.setVisible(false);
  }

  syncSprite(): void {
    this.sprite.setPosition(this.x, this.y);
    if (this.flashTimer > 0) {
      this.sprite.setTintFill(0xffffff);
    } else {
      this.sprite.clearTint();
    }
  }
}
