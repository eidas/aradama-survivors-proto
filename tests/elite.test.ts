import { describe, expect, it } from 'vitest';
import { applyEliteScaling } from '../src/core/combat';
import { ELITE_STAT_MULTS } from '../src/data/balance';
import { pickEliteEnemyId } from '../src/data/waves';

describe('applyEliteScaling(荒魂特異体のステータス倍率, E1)', () => {
  it('HP ×5 / 接触ダメージ ×1.5 / 半径 ×1.4 / 速度 ×0.9 を base に乗算する', () => {
    const base = { hp: 100, contactDamage: 10, radius: 12, speed: 90 };
    const result = applyEliteScaling(base, ELITE_STAT_MULTS);
    expect(result.hp).toBe(500);
    expect(result.contactDamage).toBe(15);
    expect(result.radius).toBeCloseTo(16.8);
    expect(result.speed).toBe(81);
  });

  it('時間スケーリング適用後の base にも同じ倍率で乗算される(別軸で乗算)', () => {
    // 時間スケーリング ×2 済みの base に対しても、さらにエリート倍率を乗算するだけ
    const scaledBase = { hp: 200, contactDamage: 20, radius: 12, speed: 90 };
    const result = applyEliteScaling(scaledBase, ELITE_STAT_MULTS);
    expect(result.hp).toBe(1000);
    expect(result.contactDamage).toBe(30);
  });
});

describe('pickEliteEnemyId(特異体の敵種抽選, E1)', () => {
  it('現行 mix の全時間帯・全乱数で百足・ボス系を返さない(防御的フィルタ)', () => {
    const excluded = new Set(['centipedeHead', 'centipedeSeg', 'amalgam']);
    for (let t = 0; t <= 900; t += 15) {
      for (let i = 0; i < 10; i++) {
        const id = pickEliteEnemyId(t, i / 10);
        expect(excluded.has(id)).toBe(false);
      }
    }
  });

  it('通常時は pickEnemyId と同じ抽選結果を返す(mix に含まれる敵種はそのまま)', () => {
    const id = pickEliteEnemyId(0, 0.5);
    expect(id).toBe('insect');
  });
});
