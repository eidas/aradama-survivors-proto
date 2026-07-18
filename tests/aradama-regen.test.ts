import { describe, expect, it } from 'vitest';
import { regenAradamaHp, timeScale, inAttackFan } from '../src/core/combat';

describe('荒魂の自動再生(docs/03 §1.3)', () => {
  it('最終被弾から 3 秒未満は再生しない', () => {
    expect(regenAradamaHp(50, 100, 2.9, 1)).toBe(50);
  });

  it('3 秒経過後は毎秒 最大HP の 5% 回復する', () => {
    expect(regenAradamaHp(50, 100, 3.0, 1)).toBe(55);
    expect(regenAradamaHp(50, 100, 10, 0.5)).toBeCloseTo(52.5);
  });

  it('最大 HP を超えない・撃破済み(hp<=0)は再生しない', () => {
    expect(regenAradamaHp(99, 100, 10, 1)).toBe(100);
    expect(regenAradamaHp(0, 100, 10, 1)).toBe(0);
  });
});

describe('時間スケーリング(docs/03 §4)', () => {
  it('開始時 ×1.0、15 分時点で ×2.2', () => {
    expect(timeScale(0)).toBe(1);
    expect(timeScale(900)).toBeCloseTo(2.2);
  });
});

describe('扇形攻撃の命中判定', () => {
  it('正面・射程内は命中', () => {
    expect(inAttackFan(0, 0, 0, 70, 140, 50, 0, 10)).toBe(true);
  });

  it('射程外は外れる', () => {
    expect(inAttackFan(0, 0, 0, 70, 140, 100, 0, 10)).toBe(false);
  });

  it('扇角の外は外れる(140° 扇で真後ろ)', () => {
    expect(inAttackFan(0, 0, 0, 70, 140, -50, 0, 10)).toBe(false);
  });

  it('角度の折り返し(±π 境界)を跨いでも判定できる', () => {
    // 左向き(π)に振って、左側の敵に当たる
    expect(inAttackFan(0, 0, Math.PI, 70, 140, -50, 5, 10)).toBe(true);
  });
});
