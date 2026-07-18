/**
 * ラン中の強化による修飾値(docs/03 §6)。
 * 基礎値はキャラ定義に置き、システムは「基礎 × 倍率」で実効値を計算する。
 */
export class RunMods {
  attackMul = 1;
  intervalMul = 1;
  rangeMul = 1;
  moveSpeedMul = 1;
  pickupMul = 1;
  /** 二連斬: 攻撃の 0.15 秒後に逆方向へもう 1 閃(威力 ×0.6) */
  doubleSlash = false;
  /** 斬撃波: 0=なし、1..3 で射程 180/240/300px */
  slashWaveLevel = 0;
  /** 鍔迫り: 予備動作中の敵(突進・薙ぎ払い)を攻撃で打ち消す */
  tsubazeriai = false;
  /** 深呼吸: 写しの regenDelay への加算(負値で短縮) */
  utsushiDelayBonus = 0;
  /** 迅移の残心: 迅移終了後 1 秒間 攻撃力 +50% */
  jinIZanshin = false;
  /** 金剛の余韻: 金剛身ゲージ回復速度 +50% */
  kongouYoin = false;
  /** 溜めの心得: 八幡力の溜め時間 −25%(threshold に乗算) */
  chargeTimeMul = 1;
}

export const SLASH_WAVE_RANGE = [0, 180, 240, 300] as const;
export const SLASH_WAVE_POWER_MUL = 0.5;
export const SLASH_WAVE_SPEED = 420;
export const DOUBLE_SLASH_DELAY = 0.15;
export const DOUBLE_SLASH_POWER_MUL = 0.6;
