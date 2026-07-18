/** 汎用バランス定数。数値仕様は docs/03 に準拠 */

/** 荒魂の自動再生: 最終被弾からの待ち秒 */
export const ARADAMA_REGEN_DELAY = 3.0;
/** 荒魂の自動再生: 毎秒 最大HP に対する割合 */
export const ARADAMA_REGEN_RATE = 0.05;

/** 経過 1 分あたりの敵 HP・接触ダメージ増加率 */
export const TIME_SCALING_PER_MIN = 0.08;

/** 1 ランの長さ(秒) */
export const RUN_DURATION = 900;

/** ノロジェムの価値 */
export const GEM_VALUES = { S: 1, M: 5, L: 25 } as const;
export type GemSize = keyof typeof GEM_VALUES;

/** ジェムのマージ: 近傍半径と統合数(docs/04 §6) */
export const GEM_MERGE_RADIUS = 48;
export const GEM_MERGE_COUNT = 5;
export const GEM_MERGE_INTERVAL = 10;

/** プール上限(docs/04 §5) */
export const ENEMY_POOL_PREALLOC = 350;
export const ENEMY_POOL_LIMIT = 400;
export const GEM_POOL_LIMIT = 1000;

/** 写し Lv1(全キャラ初期値。docs/03 §2.1) */
export const UTSUSHI_LV1 = { capacity: 30, regenDelay: 5.0, regenRate: 5 };
