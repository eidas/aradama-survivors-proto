import type { Enemy } from '../entities/Enemy';

/** ターゲット座標へ直線移動させる共有ヘルパー(EnemySystem / BossBehavior 共用) */
export function moveToward(e: Enemy, tx: number, ty: number, speed: number, dt: number): void {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1) {
    const step = Math.min(speed * dt, dist);
    e.x += (dx / dist) * step;
    e.y += (dy / dist) * step;
  }
}
