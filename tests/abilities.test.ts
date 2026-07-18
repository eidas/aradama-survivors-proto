import { describe, expect, it } from 'vitest';
import {
  JINI_LEVELS,
  KONGOUSHIN_LEVELS,
  UTSUSHI_LEVELS,
  HACHIMANRIKI_STAGES,
  computeChargeStage,
} from '../src/data/abilities';
import { CHARACTERS } from '../src/data/characters';
import { UPGRADES } from '../src/data/upgrades';

describe('能力テーブル(docs/03 §2)', () => {
  it('迅移の速度倍率は 2.5^Lv(原作設定準拠)', () => {
    for (let lv = 1; lv <= 3; lv++) {
      expect(JINI_LEVELS[lv - 1].speedMul).toBeCloseTo(2.5 ** lv);
    }
  });

  it('写し・金剛身はレベルで単調強化される', () => {
    for (let i = 1; i < 3; i++) {
      expect(UTSUSHI_LEVELS[i].capacity).toBeGreaterThan(UTSUSHI_LEVELS[i - 1].capacity);
      expect(UTSUSHI_LEVELS[i].regenDelay).toBeLessThan(UTSUSHI_LEVELS[i - 1].regenDelay);
      expect(KONGOUSHIN_LEVELS[i].gauge).toBeGreaterThan(KONGOUSHIN_LEVELS[i - 1].gauge);
    }
  });
});

describe('computeChargeStage(八幡力の溜め段階)', () => {
  it('溜め時間に応じた段階を返す(0.6/1.4/2.4 秒)', () => {
    expect(computeChargeStage(0.5, 3)).toBe(0);
    expect(computeChargeStage(0.6, 3)).toBe(1);
    expect(computeChargeStage(1.4, 3)).toBe(2);
    expect(computeChargeStage(2.4, 3)).toBe(3);
    expect(computeChargeStage(99, 3)).toBe(3);
  });

  it('能力レベルが上限段階になる', () => {
    expect(computeChargeStage(99, 1)).toBe(1);
    expect(computeChargeStage(99, 2)).toBe(2);
  });

  it('溜めの心得(timeMul 0.75)で閾値が短縮される', () => {
    expect(computeChargeStage(0.45, 3, 0.75)).toBe(1); // 0.6×0.75 = 0.45
    expect(computeChargeStage(1.8, 3, 0.75)).toBe(3); // 2.4×0.75 = 1.8
  });

  it('段階テーブルは単調増加', () => {
    for (let i = 1; i < HACHIMANRIKI_STAGES.length; i++) {
      expect(HACHIMANRIKI_STAGES[i].time).toBeGreaterThan(HACHIMANRIKI_STAGES[i - 1].time);
      expect(HACHIMANRIKI_STAGES[i].dmgMul).toBeGreaterThan(HACHIMANRIKI_STAGES[i - 1].dmgMul);
    }
  });
});

describe('キャラの能力キャップ(docs/03 §3.2)', () => {
  it('3 キャラのキャップが設計値と一致する', () => {
    expect(CHARACTERS.kanami.abilityCaps).toEqual({ utsushi: 2, jinI: 2, kongoushin: 1, hachimanriki: 3 });
    expect(CHARACTERS.hiyori.abilityCaps).toEqual({ utsushi: 1, jinI: 3, kongoushin: 1, hachimanriki: 2 });
    expect(CHARACTERS.mai.abilityCaps).toEqual({ utsushi: 3, jinI: 1, kongoushin: 3, hachimanriki: 2 });
  });

  it('隠世の力の強化は、キャップ済み能力では出現しない', () => {
    const kakuriyo = UPGRADES.filter((u) => u.category === 'kakuriyo');
    expect(kakuriyo).toHaveLength(4);
    // 姫和(写しLv1キャップ・金剛身Lv1キャップ)を模したコンテキスト
    const fakePlayer = {
      abilityLevels: { utsushi: 1, jinI: 1, kongoushin: 1, hachimanriki: 1 },
      def: CHARACTERS.hiyori,
    };
    const ctx = { player: fakePlayer as never };
    const available = kakuriyo.filter((u) => u.isAvailable?.(ctx) ?? true);
    expect(available.map((u) => u.id).sort()).toEqual(['hachimanriki-up', 'jini-up']);
  });

  it('全 18 種の強化が定義されている(docs/03 §6)', () => {
    expect(UPGRADES).toHaveLength(18);
  });
});
