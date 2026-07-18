/** ウェーブテーブル(docs/03 §5)。M1 は E1 のみの簡易版。spawnsPer10s は区間内で線形補間 */

export interface WavePhase {
  from: number; // 秒
  to: number;
  spawnsPer10s: [number, number]; // [from 時点, to 時点]
  mix: { enemyId: string; weight: number }[];
}

export const WAVES: WavePhase[] = [
  { from: 0, to: 120, spawnsPer10s: [8, 14], mix: [{ enemyId: 'insect', weight: 1 }] },
  { from: 120, to: 900, spawnsPer10s: [14, 34], mix: [{ enemyId: 'insect', weight: 1 }] },
];

/** runTime 秒時点の毎秒湧き数を返す */
export function spawnRatePerSec(runTime: number): number {
  const phase = WAVES.find((p) => runTime >= p.from && runTime < p.to) ?? WAVES[WAVES.length - 1];
  const t = Math.min(1, Math.max(0, (runTime - phase.from) / (phase.to - phase.from)));
  const per10s = phase.spawnsPer10s[0] + (phase.spawnsPer10s[1] - phase.spawnsPer10s[0]) * t;
  return per10s / 10;
}

/** runTime 秒時点の敵種を重み付き抽選(rand は [0,1)) */
export function pickEnemyId(runTime: number, rand: number): string {
  const phase = WAVES.find((p) => runTime >= p.from && runTime < p.to) ?? WAVES[WAVES.length - 1];
  const total = phase.mix.reduce((s, m) => s + m.weight, 0);
  let r = rand * total;
  for (const m of phase.mix) {
    r -= m.weight;
    if (r <= 0) return m.enemyId;
  }
  return phase.mix[phase.mix.length - 1].enemyId;
}
