/** 隠世の力のレベル別テーブル(docs/03 §2)。Phaser 非依存 */

export interface UtsushiLevel {
  capacity: number;
  regenDelay: number;
  regenRate: number;
}
export interface JinILevel {
  speedMul: number; // 2.5^Lv(原作設定: 1 段階ごとに約 2.5 倍)
  duration: number;
  cooldown: number;
}
export interface KongoushinLevel {
  gauge: number; // 最大保持秒
  regen: number; // 毎秒回復
  knockbackRadius: number; // 解除時ノックバック半径(0 = なし)
  shockwaveMul: number; // 解除時衝撃波の攻撃力倍率(0 = なし)
}
export interface HachimanrikiStage {
  time: number; // 溜め時間(累計秒)
  dmgMul: number;
  rangeMul: number;
}

/** index = Lv-1 */
export const UTSUSHI_LEVELS: UtsushiLevel[] = [
  { capacity: 30, regenDelay: 5.0, regenRate: 5 },
  { capacity: 50, regenDelay: 4.0, regenRate: 8 },
  { capacity: 80, regenDelay: 3.0, regenRate: 12 },
];

export const JINI_LEVELS: JinILevel[] = [
  { speedMul: 2.5, duration: 2.0, cooldown: 8 },
  { speedMul: 6.25, duration: 2.0, cooldown: 8 },
  { speedMul: 15.625, duration: 1.5, cooldown: 10 },
];

export const KONGOUSHIN_LEVELS: KongoushinLevel[] = [
  { gauge: 1.5, regen: 0.3, knockbackRadius: 0, shockwaveMul: 0 },
  { gauge: 2.5, regen: 0.5, knockbackRadius: 60, shockwaveMul: 0 },
  { gauge: 4.0, regen: 0.7, knockbackRadius: 90, shockwaveMul: 1.0 },
];

/** index = 段階-1。能力 Lv = 溜められる上限段階 */
export const HACHIMANRIKI_STAGES: HachimanrikiStage[] = [
  { time: 0.6, dmgMul: 2.0, rangeMul: 1.2 },
  { time: 1.4, dmgMul: 3.5, rangeMul: 1.5 },
  { time: 2.4, dmgMul: 6.0, rangeMul: 2.0 },
];

/** 迅移の駆け抜け斬りの威力倍率(ゲームアレンジ) */
export const JINI_SLASH_POWER_MUL = 0.8;
/** 金剛身: ゲージ枯渇時の再発動禁止秒 */
export const KONGOUSHIN_LOCKOUT = 2.0;
/** 八幡力: 溜め中の移動速度倍率 */
export const HACHIMANRIKI_MOVE_MUL = 0.6;
/** 八幡力: 段階 3 の前方衝撃波の射程 */
export const HACHIMANRIKI_WAVE_RANGE = 200;

/**
 * 溜め時間から到達段階(0=不発, 1..maxStage)を返す。
 * timeMul は「溜めの心得」による短縮倍率(既定 1.0)。
 */
export function computeChargeStage(chargeTime: number, maxStage: number, timeMul = 1): number {
  let stage = 0;
  for (let i = 0; i < Math.min(maxStage, HACHIMANRIKI_STAGES.length); i++) {
    if (chargeTime >= HACHIMANRIKI_STAGES[i].time * timeMul) stage = i + 1;
  }
  return stage;
}
