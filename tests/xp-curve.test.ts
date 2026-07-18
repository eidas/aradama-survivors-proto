import { describe, expect, it } from 'vitest';
import { xpForNext } from '../src/core/xp';

describe('xpForNext', () => {
  it('docs/03 §1.4 の代表値と一致する', () => {
    expect(xpForNext(1)).toBe(11); // Lv2 に 11
    expect(xpForNext(10)).toBe(182); // Lv10→11 に 182
  });

  it('単調増加する', () => {
    for (let lv = 1; lv < 100; lv++) {
      expect(xpForNext(lv + 1)).toBeGreaterThan(xpForNext(lv));
    }
  });
});
