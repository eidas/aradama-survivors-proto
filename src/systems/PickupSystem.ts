import type { GameScene } from '../scenes/GameScene';
import type { Gem } from '../entities/Gem';
import {
  GEM_MERGE_COUNT,
  GEM_MERGE_INTERVAL,
  GEM_MERGE_RADIUS,
  GEM_POOL_LIMIT,
  type GemSize,
} from '../data/balance';

const MAGNET_ACCEL = 900;
const COLLECT_DIST = 16;

/** ノロジェムの吸引・回収・XP 加算・マージ */
export class PickupSystem {
  private mergeTimer = GEM_MERGE_INTERVAL;
  private queryBuf: Gem[] = [];
  private clusterBuf: Gem[] = [];

  constructor(private game: GameScene) {}

  update(dt: number): void {
    const g = this.game;
    const p = g.player;

    g.gemHash.clear();
    for (const gem of g.gems.active) {
      g.gemHash.insert(gem, gem.x, gem.y, 4);
    }

    // 吸引開始判定(気配察知の倍率込み)
    const pickupRadius = p.pickupRadius;
    const near = g.gemHash.queryCircle(p.x, p.y, pickupRadius, this.queryBuf);
    for (const gem of near) {
      const d2 = (gem.x - p.x) ** 2 + (gem.y - p.y) ** 2;
      if (d2 <= pickupRadius ** 2) gem.magnetized = true;
    }

    // 吸引移動と回収(release があるためスナップショットを逆順走査)
    for (let i = g.gems.active.length - 1; i >= 0; i--) {
      const gem = g.gems.active[i];
      if (!gem.magnetized) continue;
      const dx = p.x - gem.x;
      const dy = p.y - gem.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= COLLECT_DIST) {
        this.collect(gem);
        continue;
      }
      gem.speed += MAGNET_ACCEL * dt;
      gem.x += (dx / dist) * gem.speed * dt;
      gem.y += (dy / dist) * gem.speed * dt;
      gem.syncSprite();
    }

    this.mergeTimer -= dt;
    if (this.mergeTimer <= 0 || g.gems.activeCount > GEM_POOL_LIMIT * 0.9) {
      this.mergeTimer = GEM_MERGE_INTERVAL;
      this.mergeGems('S', 'M');
      this.mergeGems('M', 'L');
    }
  }

  private collect(gem: Gem): void {
    const g = this.game;
    gem.despawn();
    g.gems.release(gem);
    g.addXp(gem.value);
  }

  /** 近傍 48px 内に fromSize が 5 個集まっていたら 1 個の toSize に統合(価値保存) */
  private mergeGems(fromSize: GemSize, toSize: GemSize): void {
    const g = this.game;
    const consumed = new Set<Gem>();
    const clusters: { x: number; y: number }[] = [];

    for (const gem of g.gems.active) {
      if (gem.size !== fromSize || gem.magnetized || consumed.has(gem)) continue;
      const near = g.gemHash.queryCircle(gem.x, gem.y, GEM_MERGE_RADIUS, this.queryBuf);
      this.clusterBuf.length = 0;
      for (const other of near) {
        if (other.size !== fromSize || other.magnetized || consumed.has(other)) continue;
        const d2 = (other.x - gem.x) ** 2 + (other.y - gem.y) ** 2;
        if (d2 <= GEM_MERGE_RADIUS ** 2) this.clusterBuf.push(other);
        if (this.clusterBuf.length >= GEM_MERGE_COUNT) break;
      }
      if (this.clusterBuf.length >= GEM_MERGE_COUNT) {
        let cx = 0;
        let cy = 0;
        for (const m of this.clusterBuf) {
          consumed.add(m);
          cx += m.x;
          cy += m.y;
        }
        clusters.push({ x: cx / GEM_MERGE_COUNT, y: cy / GEM_MERGE_COUNT });
      }
    }

    for (const gem of consumed) {
      gem.despawn();
      g.gems.release(gem);
    }
    for (const c of clusters) {
      const merged = g.gems.acquire();
      if (merged) merged.spawn(toSize, c.x, c.y);
    }
  }
}
