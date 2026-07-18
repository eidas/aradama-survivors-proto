/**
 * 戦闘まわりの純ロジック(Phaser 非依存)。
 */
import { ARADAMA_REGEN_DELAY, ARADAMA_REGEN_RATE, TIME_SCALING_PER_MIN } from '../data/balance';

/**
 * 荒魂の自動再生(docs/03 §1.3)。
 * 最終被弾から delay 秒経過後、毎秒 maxHp × rate を回復。撃破済み(hp<=0)は再生しない。
 * @returns 新しい hp
 */
export function regenAradamaHp(
  hp: number,
  maxHp: number,
  secondsSinceLastHit: number,
  dt: number,
): number {
  if (hp <= 0 || hp >= maxHp) return hp;
  if (secondsSinceLastHit < ARADAMA_REGEN_DELAY) return hp;
  return Math.min(maxHp, hp + maxHp * ARADAMA_REGEN_RATE * dt);
}

/** 経過時間による敵の HP・接触ダメージのスケーリング倍率(docs/03 §4) */
export function timeScale(runTimeSec: number): number {
  return 1 + TIME_SCALING_PER_MIN * (runTimeSec / 60);
}

/** 扇形攻撃の命中判定: 対象が半径内かつ扇角内か */
export function inAttackFan(
  originX: number,
  originY: number,
  aimAngle: number, // ラジアン
  radius: number,
  arcDeg: number,
  targetX: number,
  targetY: number,
  targetRadius: number,
): boolean {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const dist = Math.hypot(dx, dy);
  if (dist > radius + targetRadius) return false;
  if (dist < 1e-6) return true;
  const angleToTarget = Math.atan2(dy, dx);
  let diff = angleToTarget - aimAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= (arcDeg / 2) * (Math.PI / 180);
}
