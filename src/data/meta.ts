/** メタ進行「鍛錬」の定義(docs/07 §2)。ラン間で持ち帰るノロで恒久強化を買う */

export type TrainingId = 'zangeki' | 'tairyoku' | 'ashisabaki' | 'utsushiRendo' | 'kaishuu';

export const TRAINING_IDS: readonly TrainingId[] = [
  'zangeki',
  'tairyoku',
  'ashisabaki',
  'utsushiRendo',
  'kaishuu',
];

/** 1 系統の最大段階 */
export const TRAINING_MAX_STAGE = 5;

/** 段階購入コスト: cost(n) = 50 × n (n=1..5、1系統総額 750) */
export const TRAINING_COST_STEP = 50;
export function trainingCost(nextStage: number): number {
  return TRAINING_COST_STEP * nextStage;
}

export interface TrainingDef {
  id: TrainingId;
  nameJa: string;
  /** 1段階あたりの効果説明(UI表示用) */
  textJa: string;
}

export const TRAINING_DEFS: Record<TrainingId, TrainingDef> = {
  zangeki: { id: 'zangeki', nameJa: '斬撃の鍛錬', textJa: '基礎攻撃力 +2%' },
  tairyoku: { id: 'tairyoku', nameJa: '体力の鍛錬', textJa: '最大HP +3%' },
  ashisabaki: { id: 'ashisabaki', nameJa: '脚さばき', textJa: '移動速度 +1.5%' },
  utsushiRendo: { id: 'utsushiRendo', nameJa: '写しの練度', textJa: '写し容量 +3%' },
  kaishuu: { id: 'kaishuu', nameJa: '回収の心得', textJa: 'ノロ吸引半径 +4% と 持ち帰りノロ +4%' },
};

/** ラン開始時に合成する効果の集計形(M3 で Player に合成する) */
export interface TrainingEffects {
  attackMul: number;
  hpMul: number;
  speedMul: number;
  utsushiMul: number;
  pickupMul: number;
  noroGainMul: number;
}

/** 1段階あたりの効果率(乗算の加算分)。系統ごとに影響先が異なる(回収の心得は2つに影響) */
export const TRAINING_PER_STAGE_RATES: Record<TrainingId, Partial<TrainingEffects>> = {
  zangeki: { attackMul: 0.02 },
  tairyoku: { hpMul: 0.03 },
  ashisabaki: { speedMul: 0.015 },
  utsushiRendo: { utsushiMul: 0.03 },
  kaishuu: { pickupMul: 0.04, noroGainMul: 0.04 },
};

/** 持ち帰りノロの計算式(docs/07 §2.1) */
export const CARRY_OVER_XP_RATE = 0.1;
export const CARRY_OVER_VICTORY_BONUS = 100;
