import { describe, expect, it } from 'vitest';
import { ENEMIES, killsByTypeToBreakdown } from '../src/data/enemies';

describe('killsByTypeToBreakdown', () => {
  it('同じ nameJa (百足型: centipedeHead/centipedeSeg) を合算する', () => {
    const result = killsByTypeToBreakdown({ centipedeHead: 1, centipedeSeg: 4 });
    expect(result).toEqual([{ nameJa: '百足型', count: 5 }]);
  });

  it('撃破数 0 のタイプ・未登場のタイプは除外する', () => {
    const result = killsByTypeToBreakdown({ insect: 10, bird: 0 });
    expect(result).toEqual([{ nameJa: '蟲型', count: 10 }]);
  });

  it('killsByType が空なら空配列を返す', () => {
    expect(killsByTypeToBreakdown({})).toEqual([]);
  });

  it('ENEMIES の定義順(初出順)で並ぶ', () => {
    const killsByType: Record<string, number> = {};
    for (const def of Object.values(ENEMIES)) killsByType[def.id] = 1;
    const result = killsByTypeToBreakdown(killsByType);
    const expectedOrder = ['蟲型', '鳥型', '鹿型', '百足型', '大型集合体', '熊型'];
    expect(result.map((r) => r.nameJa)).toEqual(expectedOrder);
  });
});
