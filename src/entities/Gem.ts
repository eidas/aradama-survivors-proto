import Phaser from 'phaser';
import type { Poolable } from '../core/ObjectPool';
import { GEM_VALUES, type GemSize } from '../data/balance';

const TEXTURE: Record<GemSize, string> = { S: 'gem-s', M: 'gem-m', L: 'gem-l' };

export class Gem implements Poolable {
  active = false;
  poolIndex = -1;

  x = 0;
  y = 0;
  size: GemSize = 'S';
  value = 1;
  /** 吸引開始済みか。開始したら回収まで戻らない */
  magnetized = false;
  speed = 0;

  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'gem-s').setVisible(false).setDepth(3);
  }

  spawn(size: GemSize, x: number, y: number): void {
    this.size = size;
    this.value = GEM_VALUES[size];
    this.x = x;
    this.y = y;
    this.magnetized = false;
    this.speed = 0;
    this.sprite.setTexture(TEXTURE[size]).setPosition(x, y).setVisible(true);
  }

  despawn(): void {
    this.sprite.setVisible(false);
  }

  syncSprite(): void {
    this.sprite.setPosition(this.x, this.y);
  }
}
