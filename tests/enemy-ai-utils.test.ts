import { describe, expect, it } from 'vitest';
import { moveToward, type Movable } from '../src/systems/enemyAiUtils';

function point(x: number, y: number): Movable {
  return { x, y };
}

describe('moveToward(敵AI共通の直線移動ヘルパー)', () => {
  it('target に向かって speed*dt 分だけ進む', () => {
    const e = point(0, 0);
    moveToward(e, 100, 0, 50, 1); // 1秒で50px
    expect(e.x).toBeCloseTo(50);
    expect(e.y).toBeCloseTo(0);
  });

  it('斜め方向にも正しい単位ベクトルで進む', () => {
    const e = point(0, 0);
    moveToward(e, 30, 40, 50, 1); // 距離50の方向へ50px = target に到達
    expect(e.x).toBeCloseTo(30);
    expect(e.y).toBeCloseTo(40);
  });

  it('target までの距離が step 未満なら target で止まる(オーバーシュートしない)', () => {
    const e = point(0, 0);
    moveToward(e, 10, 0, 1000, 1); // 1000px/s でも距離10までしか進まない
    expect(e.x).toBeCloseTo(10);
    expect(e.y).toBeCloseTo(0);
  });

  it('距離が 1px 以下(ほぼ到達)なら移動しない(0除算ガード)', () => {
    const e = point(5, 5);
    moveToward(e, 5.5, 5, 100, 1);
    expect(e.x).toBe(5);
    expect(e.y).toBe(5);
  });

  it('dt=0 なら移動しない', () => {
    const e = point(0, 0);
    moveToward(e, 100, 100, 50, 0);
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
  });

  it('Enemy 型を要求しない最小インターフェース({x,y})だけで呼び出せる', () => {
    // Phaser 依存の Enemy を経由せず、プレーンオブジェクトでそのまま使えることの確認
    const e = { x: 0, y: 0, extra: 'ignored' };
    moveToward(e, 100, 0, 10, 1);
    expect(e.x).toBeCloseTo(10);
  });
});
