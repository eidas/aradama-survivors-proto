import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { inAttackFan } from '../core/combat';
import { updatePlayerHealth } from '../core/health';

interface SlashVfx {
  sprite: Phaser.GameObjects.Image;
  life: number;
}

const SLASH_LIFETIME = 0.12;

/** プレイヤーの移動・オート攻撃(最寄りの敵方向へ扇形斬撃)・斬撃エフェクト */
export class PlayerSystem {
  private slashes: SlashVfx[] = [];
  private slashCursor = 0;
  private queryBuf: Enemy[] = [];

  constructor(private game: GameScene) {
    for (let i = 0; i < 8; i++) {
      this.slashes.push({
        sprite: game.add.image(0, 0, 'slash').setVisible(false).setDepth(8),
        life: 0,
      });
    }
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;

    p.x += p.moveX * p.def.moveSpeed * dt;
    p.y += p.moveY * p.def.moveSpeed * dt;
    p.syncSprite();

    updatePlayerHealth(p.health, dt);
    // 被弾直後は点滅で無敵を可視化
    p.sprite.setAlpha(p.health.invincibleTimer > 0 ? 0.5 : 1);

    p.attackTimer -= dt;
    if (p.attackTimer <= 0) {
      p.attackTimer += p.def.attack.interval;
      this.attack();
    }

    for (const s of this.slashes) {
      if (s.life > 0) {
        s.life -= dt;
        s.sprite.setAlpha(Math.max(0, s.life / SLASH_LIFETIME) * 0.9);
        if (s.life <= 0) s.sprite.setVisible(false);
      }
    }
  }

  private attack(): void {
    const g = this.game;
    const p = g.player;

    // 最寄りの敵に照準(いなければ前回の向きを維持)。敵は最大 400 体なので線形走査で足りる
    let nearest: Enemy | null = null;
    let bestD2 = Infinity;
    for (const e of g.enemies.active) {
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = e;
      }
    }
    if (nearest) p.aimAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);

    const { power, radius, arcDeg } = p.def.attack;
    const candidates = g.enemyHash.queryCircle(p.x, p.y, radius + 16, this.queryBuf);
    for (const e of candidates) {
      if (!inAttackFan(p.x, p.y, p.aimAngle, radius, arcDeg, e.x, e.y, e.radius)) continue;
      e.hp -= power;
      e.lastHitAt = g.runTime;
      e.flashTimer = 0.06;
      if (e.hp <= 0) g.killEnemy(e);
    }

    this.showSlash(p.x, p.y, p.aimAngle, radius);
  }

  private showSlash(x: number, y: number, angle: number, radius: number): void {
    const s = this.slashes[this.slashCursor];
    this.slashCursor = (this.slashCursor + 1) % this.slashes.length;
    s.life = SLASH_LIFETIME;
    s.sprite
      .setPosition(x, y)
      .setRotation(angle)
      .setScale(radius / 70)
      .setAlpha(0.9)
      .setVisible(true);
  }
}
