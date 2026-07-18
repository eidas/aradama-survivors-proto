import Phaser from 'phaser';
import type { Poolable } from '../core/ObjectPool';
import type { Enemy } from './Enemy';

/** 斬撃波(飛ぶ斬撃)。直進し、触れた敵を貫通しつつ 1 体 1 回だけ斬る */
export class Projectile implements Poolable {
  active = false;
  poolIndex = -1;

  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  power = 0;
  remaining = 0; // 残り射程 px
  readonly radius = 14;
  /** この弾が既に当てた敵(貫通時の多段ヒット防止) */
  readonly hitEnemies = new Set<Enemy>();

  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'slash-wave').setVisible(false).setDepth(7);
  }

  spawn(x: number, y: number, angle: number, speed: number, power: number, range: number): void {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.power = power;
    this.remaining = range;
    this.hitEnemies.clear();
    this.sprite.setPosition(x, y).setRotation(angle).setVisible(true);
  }

  despawn(): void {
    this.hitEnemies.clear();
    this.sprite.setVisible(false);
  }

  syncSprite(): void {
    this.sprite.setPosition(this.x, this.y);
  }
}
