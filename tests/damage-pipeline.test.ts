import { describe, expect, it } from 'vitest';
import {
  applyPlayerDamage,
  createPlayerHealth,
  updatePlayerHealth,
  INVINCIBLE_DURATION,
} from '../src/core/health';

const make = () => createPlayerHealth(100, 30, 5, 5);

describe('ダメージパイプライン(金剛身 → 写し → HP)', () => {
  it('写しが先にダメージを吸収し、HP は減らない', () => {
    const h = make();
    expect(applyPlayerDamage(h, 20)).toBe('hit');
    expect(h.utsushi).toBe(10);
    expect(h.hp).toBe(100);
  });

  it('写しを超過した分だけ HP に貫通する', () => {
    const h = make();
    applyPlayerDamage(h, 50);
    expect(h.utsushi).toBe(0);
    expect(h.hp).toBe(80);
  });

  it('金剛身(ガード中)は全て無効', () => {
    const h = make();
    expect(applyPlayerDamage(h, 999, true)).toBe('guarded');
    expect(h.utsushi).toBe(30);
    expect(h.hp).toBe(100);
  });

  it('被弾直後 0.5 秒は無敵', () => {
    const h = make();
    applyPlayerDamage(h, 10);
    expect(applyPlayerDamage(h, 10)).toBe('invincible');
    expect(h.utsushi).toBe(20); // 2 発目は入らない
    updatePlayerHealth(h, INVINCIBLE_DURATION + 0.01);
    expect(applyPlayerDamage(h, 10)).toBe('hit');
  });

  it('HP 0 で dead', () => {
    const h = make();
    expect(applyPlayerDamage(h, 130)).toBe('dead');
    expect(h.hp).toBe(0);
  });

  it('写しは regenDelay 経過後に毎秒 regenRate 回復する', () => {
    const h = make();
    applyPlayerDamage(h, 20); // 写し 30 → 10、regenTimer = 5
    updatePlayerHealth(h, 4.0);
    expect(h.utsushi).toBe(10); // まだ待ち時間内
    updatePlayerHealth(h, 1.0); // 待ち時間消化
    updatePlayerHealth(h, 2.0); // 2 秒 × 5/s = 10 回復
    expect(h.utsushi).toBeCloseTo(20);
    updatePlayerHealth(h, 100);
    expect(h.utsushi).toBe(30); // 上限で止まる
  });
});
