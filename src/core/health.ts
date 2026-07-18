/**
 * プレイヤー被弾のダメージパイプライン(Phaser 非依存の純ロジック)。
 * 吸収順: 金剛身(無効) → 写しバリア → HP。docs/03 §1.2 参照。
 */

export interface PlayerHealth {
  hp: number;
  maxHp: number;
  utsushi: number; // 写しバリア残量
  utsushiMax: number;
  utsushiRegenRate: number; // 毎秒回復量
  utsushiRegenDelay: number; // 最終被弾からの回復開始待ち秒
  regenTimer: number; // 残り待ち時間
  invincibleTimer: number; // 被弾後無敵の残り秒
}

export const INVINCIBLE_DURATION = 0.5;

export type DamageResult = 'guarded' | 'invincible' | 'hit' | 'dead';

export function createPlayerHealth(
  maxHp: number,
  utsushiMax: number,
  regenRate: number,
  regenDelay: number,
): PlayerHealth {
  return {
    hp: maxHp,
    maxHp,
    utsushi: utsushiMax,
    utsushiMax,
    utsushiRegenRate: regenRate,
    utsushiRegenDelay: regenDelay,
    regenTimer: 0,
    invincibleTimer: 0,
  };
}

export function applyPlayerDamage(
  h: PlayerHealth,
  dmg: number,
  guarding = false,
): DamageResult {
  if (guarding) return 'guarded';
  if (h.invincibleTimer > 0) return 'invincible';

  const toBarrier = Math.min(h.utsushi, dmg);
  h.utsushi -= toBarrier;
  h.hp -= dmg - toBarrier;
  h.regenTimer = h.utsushiRegenDelay;
  h.invincibleTimer = INVINCIBLE_DURATION;

  if (h.hp <= 0) {
    h.hp = 0;
    return 'dead';
  }
  return 'hit';
}

/** 毎フレーム呼ぶ。無敵タイマー消化と写しの自動回復 */
export function updatePlayerHealth(h: PlayerHealth, dt: number): void {
  if (h.invincibleTimer > 0) h.invincibleTimer = Math.max(0, h.invincibleTimer - dt);
  if (h.regenTimer > 0) {
    h.regenTimer = Math.max(0, h.regenTimer - dt);
  } else if (h.utsushi < h.utsushiMax) {
    h.utsushi = Math.min(h.utsushiMax, h.utsushi + h.utsushiRegenRate * dt);
  }
}
