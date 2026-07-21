/** メタ進行「鍛錬」の純ロジック(docs/07 §2〜3)。Phaser 非依存 */

import {
  CARRY_OVER_VICTORY_BONUS,
  CARRY_OVER_XP_RATE,
  TRAINING_IDS,
  TRAINING_MAX_STAGE,
  TRAINING_PER_STAGE_RATES,
  TrainingEffects,
  TrainingId,
  trainingCost,
} from '../data/meta';

export type TrainingState = Record<TrainingId, number>;

interface MetaState {
  noro: number;
  training: TrainingState;
}

function stageOf(training: TrainingState, id: TrainingId): number {
  return training[id] ?? 0;
}

/** 次の段階を購入できるか(上限未満かつ残高が足りる) */
export function canBuy(noro: number, training: TrainingState, id: TrainingId): boolean {
  const stage = stageOf(training, id);
  if (stage >= TRAINING_MAX_STAGE) return false;
  return noro >= trainingCost(stage + 1);
}

/** 1段階購入する。購入不可なら入力を複製したものをそのまま返す(不変データ) */
export function buy(noro: number, training: TrainingState, id: TrainingId): MetaState {
  if (!canBuy(noro, training, id)) {
    return { noro, training: { ...training } };
  }
  const stage = stageOf(training, id);
  const cost = trainingCost(stage + 1);
  return { noro: noro - cost, training: { ...training, [id]: stage + 1 } };
}

/** 全系統を段階0に戻し、支払済み総額を全額返金する */
export function resetTraining(noro: number, training: TrainingState): MetaState {
  let refund = 0;
  const reset = {} as TrainingState;
  for (const id of TRAINING_IDS) {
    const stage = stageOf(training, id);
    for (let n = 1; n <= stage; n++) refund += trainingCost(n);
    reset[id] = 0;
  }
  return { noro: noro + refund, training: reset };
}

/**
 * ラン終了時の持ち帰りノロ(docs/07 §2.1)。
 * 撃破数 0 のラン(放置)は 0。それ以外は floor(取得XP合計 × 0.10) + 勝利ボーナス100
 */
export function carryOverNoro(totalXpEarned: number, victory: boolean, kills: number): number {
  if (kills <= 0) return 0;
  return Math.floor(totalXpEarned * CARRY_OVER_XP_RATE) + (victory ? CARRY_OVER_VICTORY_BONUS : 0);
}

/** 鍛錬の段階から、ラン開始時に合成する乗算修飾を集計する */
export function trainingEffects(training: TrainingState): TrainingEffects {
  const effects: TrainingEffects = {
    attackMul: 1,
    hpMul: 1,
    speedMul: 1,
    utsushiMul: 1,
    pickupMul: 1,
    noroGainMul: 1,
  };
  for (const id of Object.keys(TRAINING_PER_STAGE_RATES) as TrainingId[]) {
    const stage = stageOf(training, id);
    if (stage <= 0) continue;
    const rates = TRAINING_PER_STAGE_RATES[id];
    for (const key of Object.keys(rates) as (keyof TrainingEffects)[]) {
      effects[key] += (rates[key] ?? 0) * stage;
    }
  }
  return effects;
}
