import { describe, expect, it } from 'vitest';
import { SpatialHash } from '../src/core/SpatialHash';

interface Item {
  id: number;
}

describe('SpatialHash', () => {
  it('近傍のアイテムだけが候補に挙がる', () => {
    const hash = new SpatialHash<Item>(64);
    const near = { id: 1 };
    const far = { id: 2 };
    hash.insert(near, 10, 10, 10);
    hash.insert(far, 1000, 1000, 10);
    const out: Item[] = [];
    hash.queryCircle(0, 0, 50, out);
    expect(out).toContain(near);
    expect(out).not.toContain(far);
  });

  it('セル境界を跨ぐ大きい円は複数セルに登録され、重複なく返る', () => {
    const hash = new SpatialHash<Item>(64);
    const big = { id: 1 };
    hash.insert(big, 64, 64, 100); // 多数のセルにまたがる
    const out: Item[] = [];
    hash.queryCircle(64, 64, 150, out);
    expect(out.filter((i) => i === big)).toHaveLength(1);
  });

  it('負の座標でも動作する', () => {
    const hash = new SpatialHash<Item>(64);
    const item = { id: 1 };
    hash.insert(item, -500, -500, 10);
    const out: Item[] = [];
    hash.queryCircle(-490, -510, 40, out);
    expect(out).toContain(item);
  });

  it('clear() で空になるが、以降も再利用できる', () => {
    const hash = new SpatialHash<Item>(64);
    const item = { id: 1 };
    hash.insert(item, 0, 0, 10);
    hash.clear();
    const out: Item[] = [];
    expect(hash.queryCircle(0, 0, 100, out)).toHaveLength(0);
    hash.insert(item, 0, 0, 10);
    expect(hash.queryCircle(0, 0, 100, out)).toContain(item);
  });
});
