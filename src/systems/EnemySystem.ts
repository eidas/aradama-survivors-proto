import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { regenAradamaHp } from '../core/combat';
import { applyPlayerDamage } from '../core/health';

/** 敵の AI(M1: 追尾のみ)・移動・自動再生・プレイヤーへの接触ダメージ */
export class EnemySystem {
  private queryBuf: Enemy[] = [];

  constructor(private game: GameScene) {}

  /** 移動と再生。移動後に空間ハッシュへ登録する */
  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    g.enemyHash.clear();

    for (const e of g.enemies.active) {
      // chase: プレイヤーへ直進
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }

      e.hp = regenAradamaHp(e.hp, e.maxHp, g.runTime - e.lastHitAt, dt);
      if (e.flashTimer > 0) e.flashTimer -= dt;

      g.enemyHash.insert(e, e.x, e.y, e.radius);
      e.syncSprite();
    }
  }

  /** プレイヤーとの接触判定。攻撃解決の後に呼ぶ */
  contact(): void {
    const g = this.game;
    const p = g.player;
    if (p.cheatInvincible) return;

    const candidates = g.enemyHash.queryCircle(p.x, p.y, p.radius + 16, this.queryBuf);
    for (const e of candidates) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy <= (e.radius + p.radius) ** 2) {
        const result = applyPlayerDamage(p.health, e.contactDamage);
        if (result === 'dead') {
          g.endRun(false);
          return;
        }
        if (result === 'hit') g.events.emit('player-hit');
      }
    }
  }
}
