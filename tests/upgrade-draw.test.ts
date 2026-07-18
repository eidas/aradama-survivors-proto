import { describe, expect, it } from 'vitest';
import { drawUpgrades } from '../src/core/upgradeDraw';
import { UPGRADES } from '../src/data/upgrades';

const pool = [
  { id: 'a', maxTakes: 5 },
  { id: 'b', maxTakes: 3 },
  { id: 'c', maxTakes: 1 },
  { id: 'd', maxTakes: 1 },
  { id: 'e', maxTakes: 2 },
];

// 決定的な乱数列
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('drawUpgrades(レベルアップ 3 択抽選)', () => {
  it('3 件返り、同一 3 択に重複がない', () => {
    for (let trial = 0; trial < 50; trial++) {
      const rand = seq((trial % 10) / 10, 0.5, 0.9, 0.3);
      const picked = drawUpgrades(pool, {}, rand);
      expect(picked).toHaveLength(3);
      expect(new Set(picked.map((u) => u.id)).size).toBe(3);
    }
  });

  it('取得上限に達した強化は候補から除外される', () => {
    const takes = { c: 1, d: 1 }; // ★1 を取り切り
    for (let trial = 0; trial < 30; trial++) {
      const picked = drawUpgrades(pool, takes, seq((trial % 20) / 20, 0.7, 0.2));
      for (const u of picked) {
        expect(['a', 'b', 'e']).toContain(u.id);
      }
    }
  });

  it('候補が 3 未満ならある分だけ返す(0 件もあり得る)', () => {
    const takes = { a: 5, b: 3, c: 1, e: 2 };
    expect(drawUpgrades(pool, takes, seq(0.5))).toHaveLength(1); // d のみ
    expect(drawUpgrades(pool, { ...takes, d: 1 }, seq(0.5))).toHaveLength(0);
  });

  it('isAvailable が false の強化は候補から除外される', () => {
    const picked = drawUpgrades(pool, {}, seq(0.1, 0.5, 0.9), 3, (u) => u.id !== 'a');
    expect(picked.map((u) => u.id)).not.toContain('a');
  });

  it('実データ: 全 18 種を取り切ると抽選が空になる', () => {
    const takes: Record<string, number> = {};
    for (const u of UPGRADES) takes[u.id] = u.maxTakes;
    expect(drawUpgrades(UPGRADES, takes, seq(0.5))).toHaveLength(0);
  });

  it('実データ: 合計取得可能回数が docs/03 の想定と一致する', () => {
    // 御刀: 5+5+3+1+3+1=18、隠世: 2×4=8、身体: 3+3+1+3+2+1+1+1=15 → 41
    const total = UPGRADES.reduce((s, u) => s + u.maxTakes, 0);
    expect(total).toBe(41);
  });
});
