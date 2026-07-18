import { describe, expect, it } from 'vitest';
import { isBetterRun, loadSave } from '../src/core/save';

const run = (victory: boolean, timeSec: number) => ({ victory, timeSec, kills: 0, level: 1 });

describe('isBetterRun(ベスト記録の更新判定)', () => {
  it('記録がなければ常に更新', () => {
    expect(isBetterRun(run(false, 10), null)).toBe(true);
  });

  it('勝利は敗北の記録より常に優先', () => {
    expect(isBetterRun(run(true, 100), run(false, 900))).toBe(true);
    expect(isBetterRun(run(false, 900), run(true, 100))).toBe(false);
  });

  it('勝敗が同じなら生存時間が長い方', () => {
    expect(isBetterRun(run(false, 300), run(false, 200))).toBe(true);
    expect(isBetterRun(run(false, 200), run(false, 300))).toBe(false);
    expect(isBetterRun(run(true, 1000), run(true, 950))).toBe(true);
  });
});

describe('loadSave', () => {
  it('localStorage がない環境(Node)でも初期値で動く', () => {
    expect(loadSave()).toEqual({ best: null, settings: { muted: false } });
  });
});
