/** moveToward が要求する最小インターフェース(Phaser 非依存。tests/ から import 可能にするため Enemy 型を要求しない) */
export interface Movable {
  x: number;
  y: number;
}

/** ターゲット座標へ直線移動させる共有ヘルパー(EnemySystem / BossBehavior 共用) */
export function moveToward(e: Movable, tx: number, ty: number, speed: number, dt: number): void {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1) {
    const step = Math.min(speed * dt, dist);
    e.x += (dx / dist) * step;
    e.y += (dy / dist) * step;
  }
}
