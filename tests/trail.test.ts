import { describe, expect, it } from 'vitest';
import { stepTrailSpacing } from '../src/core/trail';

/** 配置点を集めるだけのコールバック(テスト用。本番はクロージャを使い回す前提だがここでは検証のため配列化) */
function collect() {
  const points: { x: number; y: number }[] = [];
  const onPoint = (x: number, y: number) => points.push({ x, y });
  return { points, onPoint };
}

describe('stepTrailSpacing(迅移トレイルの距離補間)', () => {
  it('移動距離が spacing 未満なら配置せず、accum に加算するだけ', () => {
    const { points, onPoint } = collect();
    const accum = stepTrailSpacing(0, 0, 10, 0, 40, 0, onPoint);
    expect(points).toEqual([]);
    expect(accum).toBe(10);
  });

  it('spacing ちょうどで 1 個配置し、accum は 0 に戻る', () => {
    const { points, onPoint } = collect();
    const accum = stepTrailSpacing(0, 0, 40, 0, 40, 0, onPoint);
    expect(points).toEqual([{ x: 40, y: 0 }]);
    expect(accum).toBe(0);
  });

  it('spacing ちょうど倍数(2倍)なら 2 個配置する', () => {
    const { points, onPoint } = collect();
    const accum = stepTrailSpacing(0, 0, 80, 0, 40, 0, onPoint);
    expect(points).toEqual([
      { x: 40, y: 0 },
      { x: 80, y: 0 },
    ]);
    expect(accum).toBe(0);
  });

  it('1 フレームで spacing の非整数倍を移動すると複数個+端数の accum になる', () => {
    const { points, onPoint } = collect();
    // 1フレームで100px移動、spacing=40 → 40,80 の2点配置、残り20がaccum
    const accum = stepTrailSpacing(0, 0, 100, 0, 40, 0, onPoint);
    expect(points).toEqual([
      { x: 40, y: 0 },
      { x: 80, y: 0 },
    ]);
    expect(accum).toBe(20);
  });

  it('前回の accum(繰越距離)を考慮して次の配置位置を計算する', () => {
    const { points, onPoint } = collect();
    // accum=30(前回の繰越) + 今回移動20 = 50 >= spacing40 → 1個配置。配置位置は繰越を考慮した t。
    const accum = stepTrailSpacing(0, 0, 20, 0, 40, 30, onPoint);
    expect(points).toEqual([{ x: 10, y: 0 }]); // 40-30=10 進んだ地点で spacing 到達
    expect(accum).toBe(10); // 消費後の残り距離(移動距離20 - 消費10)
  });

  it('斜め移動でも直線上の座標を補間する', () => {
    const { points, onPoint } = collect();
    const accum = stepTrailSpacing(0, 0, 30, 40, 30, 0, onPoint); // 距離50(3-4-5三角形)
    expect(points).toEqual([{ x: 18, y: 24 }]); // 距離30地点(60%)
    expect(accum).toBe(20);
  });

  it('移動距離 0(セグメント長 0)なら何も配置せず accum も変化しない', () => {
    const { points, onPoint } = collect();
    const accum = stepTrailSpacing(5, 5, 5, 5, 40, 12, onPoint);
    expect(points).toEqual([]);
    expect(accum).toBe(12);
  });
});
