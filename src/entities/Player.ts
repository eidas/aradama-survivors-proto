import Phaser from 'phaser';
import type { CharacterDef } from '../data/characters';
import { createPlayerHealth, type PlayerHealth } from '../core/health';
import { UTSUSHI_LV1 } from '../data/balance';

export class Player {
  x: number;
  y: number;
  readonly radius = 12;
  readonly def: CharacterDef;
  readonly health: PlayerHealth;
  readonly sprite: Phaser.GameObjects.Image;

  moveX = 0;
  moveY = 0;
  aimAngle = 0;
  attackTimer = 0;
  /** デバッグ用無敵 */
  cheatInvincible = false;

  constructor(scene: Phaser.Scene, def: CharacterDef, x: number, y: number) {
    this.def = def;
    this.x = x;
    this.y = y;
    this.health = createPlayerHealth(
      def.hp,
      UTSUSHI_LV1.capacity * def.utsushiCapacityMul,
      UTSUSHI_LV1.regenRate,
      UTSUSHI_LV1.regenDelay,
    );
    this.sprite = scene.add.image(x, y, 'player').setDepth(10);
  }

  syncSprite(): void {
    this.sprite.setPosition(this.x, this.y);
  }
}
