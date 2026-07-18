import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { inAttackFan } from '../core/combat';
import { updatePlayerHealth } from '../core/health';
import {
  DOUBLE_SLASH_DELAY,
  DOUBLE_SLASH_POWER_MUL,
  SLASH_WAVE_POWER_MUL,
  SLASH_WAVE_RANGE,
  SLASH_WAVE_SPEED,
} from '../core/mods';

interface SlashVfx {
  sprite: Phaser.GameObjects.Image;
  life: number;
}

const SLASH_LIFETIME = 0.12;

/** プレイヤーの移動・オート攻撃・強化の反映(二連斬・斬撃波・鍔迫り)・斬撃波弾の更新 */
export class PlayerSystem {
  private slashes: SlashVfx[] = [];
  private slashCursor = 0;
  private queryBuf: Enemy[] = [];
  /** 二連斬の待ち時間(<=0 で不発) */
  private secondSlashTimer = 0;

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

    p.x += p.moveX * p.moveSpeed * dt;
    p.y += p.moveY * p.moveSpeed * dt;
    p.syncSprite();

    updatePlayerHealth(p.health, dt);
    p.sprite.setAlpha(p.health.invincibleTimer > 0 ? 0.5 : 1);

    p.attackTimer -= dt;
    if (p.attackTimer <= 0) {
      p.attackTimer += p.attackInterval;
      this.attack();
    }

    // 二連斬: 本命の 0.15 秒後に逆方向へ
    if (this.secondSlashTimer > 0) {
      this.secondSlashTimer -= dt;
      if (this.secondSlashTimer <= 0) {
        const angle = p.aimAngle + Math.PI;
        this.slashHit(angle, DOUBLE_SLASH_POWER_MUL);
        this.showSlash(p.x, p.y, angle, p.attackRadius);
      }
    }

    this.updateProjectiles(dt);

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

    this.slashHit(p.aimAngle, 1);
    this.showSlash(p.x, p.y, p.aimAngle, p.attackRadius);

    if (p.mods.doubleSlash) this.secondSlashTimer = DOUBLE_SLASH_DELAY;

    if (p.mods.slashWaveLevel > 0) {
      const proj = g.projectiles.acquire();
      if (proj) {
        proj.spawn(
          p.x,
          p.y,
          p.aimAngle,
          SLASH_WAVE_SPEED,
          p.attackPower * SLASH_WAVE_POWER_MUL,
          SLASH_WAVE_RANGE[p.mods.slashWaveLevel],
        );
      }
    }
  }

  /** 扇形範囲の敵に御刀ダメージを与える */
  private slashHit(aimAngle: number, powerMul: number): void {
    const g = this.game;
    const p = g.player;
    const radius = p.attackRadius;
    const arcDeg = p.attackArcDeg;
    const power = p.attackPower * powerMul;

    const candidates = g.enemyHash.queryCircle(p.x, p.y, radius + 20, this.queryBuf);
    for (const e of candidates) {
      if (!inAttackFan(p.x, p.y, aimAngle, radius, arcDeg, e.x, e.y, e.radius)) continue;
      this.damageEnemy(e, power);
    }
  }

  private damageEnemy(e: Enemy, power: number): void {
    const g = this.game;
    if (g.player.mods.tsubazeriai && e.telegraphing) g.enemySystem.cancelTelegraph(e);
    e.hp -= power;
    e.lastHitAt = g.runTime;
    e.flashTimer = 0.06;
    if (e.hp <= 0) g.killEnemy(e);
  }

  private updateProjectiles(dt: number): void {
    const g = this.game;
    for (let i = g.projectiles.active.length - 1; i >= 0; i--) {
      const proj = g.projectiles.active[i];
      const step = Math.hypot(proj.vx, proj.vy) * dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.remaining -= step;
      proj.syncSprite();

      const candidates = g.enemyHash.queryCircle(proj.x, proj.y, proj.radius + 20, this.queryBuf);
      for (const e of candidates) {
        if (proj.hitEnemies.has(e)) continue;
        const dx = e.x - proj.x;
        const dy = e.y - proj.y;
        if (dx * dx + dy * dy <= (proj.radius + e.radius) ** 2) {
          proj.hitEnemies.add(e);
          this.damageEnemy(e, proj.power);
        }
      }

      if (proj.remaining <= 0) {
        proj.despawn();
        g.projectiles.release(proj);
      }
    }
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
