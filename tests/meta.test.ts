import { describe, expect, it } from 'vitest';
import { buy, canBuy, carryOverNoro, resetTraining, trainingEffects } from '../src/core/meta';
import { TRAINING_MAX_STAGE, trainingCost, type TrainingId } from '../src/data/meta';

const emptyTraining = (): Record<TrainingId, number> => ({
  zangeki: 0,
  tairyoku: 0,
  ashisabaki: 0,
  utsushiRendo: 0,
  kaishuu: 0,
});

describe('trainingCost(段階コスト)', () => {
  it('cost(n) = 50 × n', () => {
    expect(trainingCost(1)).toBe(50);
    expect(trainingCost(5)).toBe(250);
  });
});

describe('canBuy / buy', () => {
  it('残高が足りなければ購入不可', () => {
    expect(canBuy(49, emptyTraining(), 'zangeki')).toBe(false);
    expect(canBuy(50, emptyTraining(), 'zangeki')).toBe(true);
  });

  it('購入すると段階が上がり残高が減る', () => {
    const result = buy(50, emptyTraining(), 'zangeki');
    expect(result.training.zangeki).toBe(1);
    expect(result.noro).toBe(0);
  });

  it('残高不足の購入は状態を変えない', () => {
    const training = emptyTraining();
    const result = buy(10, training, 'zangeki');
    expect(result.training.zangeki).toBe(0);
    expect(result.noro).toBe(10);
  });

  it('最大段階に達したら購入不可', () => {
    const training = { ...emptyTraining(), zangeki: TRAINING_MAX_STAGE };
    expect(canBuy(10_000, training, 'zangeki')).toBe(false);
    const result = buy(10_000, training, 'zangeki');
    expect(result.training.zangeki).toBe(TRAINING_MAX_STAGE);
    expect(result.noro).toBe(10_000);
  });

  it('段階が進むごとにコストが逓増する(cost(n)=50n)', () => {
    let training = emptyTraining();
    let noro = 1000;
    const paid: number[] = [];
    for (let i = 0; i < TRAINING_MAX_STAGE; i++) {
      const before = noro;
      ({ noro, training } = buy(noro, training, 'tairyoku'));
      paid.push(before - noro);
    }
    expect(paid).toEqual([50, 100, 150, 200, 250]);
    expect(training.tairyoku).toBe(TRAINING_MAX_STAGE);
  });
});

describe('resetTraining(全リセット・返金100%)', () => {
  it('全系統を段階0に戻し支払済み総額を全額返金する', () => {
    let training = emptyTraining();
    let noro = 10_000;
    ({ noro, training } = buy(noro, training, 'zangeki')); // -50
    ({ noro, training } = buy(noro, training, 'zangeki')); // -100
    ({ noro, training } = buy(noro, training, 'tairyoku')); // -50
    const spent = 10_000 - noro;
    expect(spent).toBe(200);

    const result = resetTraining(noro, training);
    expect(result.noro).toBe(noro + 200);
    expect(result.training.zangeki).toBe(0);
    expect(result.training.tairyoku).toBe(0);
  });

  it('未購入(全て段階0)なら返金なし', () => {
    const result = resetTraining(500, emptyTraining());
    expect(result.noro).toBe(500);
  });
});

describe('carryOverNoro(持ち帰りノロ)', () => {
  it('撃破数0のランは持ち帰り0(放置稼ぎ防止)', () => {
    expect(carryOverNoro(9999, true, 0)).toBe(0);
    expect(carryOverNoro(9999, false, 0)).toBe(0);
  });

  it('取得XP合計の10%をfloorで持ち帰る(敗北)', () => {
    expect(carryOverNoro(299, false, 5)).toBe(29);
  });

  it('勝利ボーナス100が加算される', () => {
    expect(carryOverNoro(1000, true, 20)).toBe(200);
  });
});

describe('trainingEffects(効果合成)', () => {
  it('未取得は全倍率1', () => {
    expect(trainingEffects(emptyTraining())).toEqual({
      attackMul: 1,
      hpMul: 1,
      speedMul: 1,
      utsushiMul: 1,
      pickupMul: 1,
      noroGainMul: 1,
    });
  });

  it('段階に比例して倍率が加算される', () => {
    const training = { ...emptyTraining(), zangeki: 3, tairyoku: 5 };
    const effects = trainingEffects(training);
    expect(effects.attackMul).toBeCloseTo(1 + 0.02 * 3);
    expect(effects.hpMul).toBeCloseTo(1 + 0.03 * 5);
  });

  it('回収の心得は吸引半径と持ち帰りノロの両方に効く', () => {
    const training = { ...emptyTraining(), kaishuu: 5 };
    const effects = trainingEffects(training);
    expect(effects.pickupMul).toBeCloseTo(1 + 0.04 * 5);
    expect(effects.noroGainMul).toBeCloseTo(1 + 0.04 * 5);
  });
});
