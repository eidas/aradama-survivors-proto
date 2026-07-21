/** 汎用バランス定数。数値仕様は docs/03 に準拠 */

/** 荒魂の自動再生: 最終被弾からの待ち秒 */
export const ARADAMA_REGEN_DELAY = 3.0;
/** 荒魂の自動再生: 毎秒 最大HP に対する割合 */
export const ARADAMA_REGEN_RATE = 0.05;

/** 経過 1 分あたりの敵 HP・接触ダメージ増加率 */
export const TIME_SCALING_PER_MIN = 0.08;

/** ボス出現時刻(秒)= 15:00 */
export const RUN_DURATION = 900;
/** ボス討伐の制限時刻(秒)= 18:00。超過は敗北 */
export const BOSS_TIMEOUT = 1080;

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

/** 荒魂特異体(エリート敵): 3:00 以降、45 秒ごとに 1 体出現 */
export const ELITE_START_TIME = 180;
export const ELITE_SPAWN_INTERVAL = 45;

/** 特異体のステータス倍率(時間スケーリングとは別軸で乗算) */
export const ELITE_STAT_MULTS = {
  hp: 5,
  contactDamage: 1.5,
  radius: 1.4,
  speed: 0.9,
} as const;

/** 特異体の発光 tint(紫系)。tint 優先順位: 被弾フラッシュ(白) > 予備動作(橙) > 特異体(紫) > 通常 */
export const ELITE_TINT = 0x9b30ff;

/** 特異体の撃破ドロップ: 通常ドロップの代わりに大ジェム ×2 */
export const ELITE_GEM_DROP: { size: GemSize; count: number }[] = [{ size: 'L', count: 2 }];
