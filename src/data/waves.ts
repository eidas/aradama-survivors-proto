/**
 * ウェーブテーブル(docs/03 §5.1)。M2: E1〜E4 の完全版。
 * 7:30 の中ボス E5、15:00 のボス E6 は M4 で追加(現状はその時間帯も通常湧きを続ける)。
 * spawnsPer10s は区間内で線形補間。
 */

export interface WavePhase {
  from: number; // 秒
  to: number;
  spawnsPer10s: [number, number]; // [from 時点, to 時点]
  mix: { enemyId: string; weight: number }[];
}

export interface WaveEvent {
  at: number; // 秒
  type: 'deerRush' | 'encircle';
}

export const WAVES: WavePhase[] = [
  { from: 0, to: 120, spawnsPer10s: [8, 14], mix: [{ enemyId: 'insect', weight: 1 }] },
  {
    from: 120,
    to: 270,
    spawnsPer10s: [16, 16],
    mix: [
      { enemyId: 'insect', weight: 0.7 },
      { enemyId: 'bird', weight: 0.3 },
    ],
  },
  {
    from: 270,
    to: 450,
    spawnsPer10s: [20, 20],
    mix: [
      { enemyId: 'insect', weight: 0.5 },
      { enemyId: 'bird', weight: 0.3 },
      { enemyId: 'deer', weight: 0.2 },
    ],
  },
  {
    from: 450,
    to: 660,
    spawnsPer10s: [22, 22],
    mix: [
      { enemyId: 'bird', weight: 0.35 },
      { enemyId: 'deer', weight: 0.35 },
      { enemyId: 'bear', weight: 0.3 },
    ],
  },
  {
    from: 660,
    to: 870,
    spawnsPer10s: [26, 34],
    mix: [
      { enemyId: 'insect', weight: 0.4 },
      { enemyId: 'bird', weight: 0.25 },
      { enemyId: 'deer', weight: 0.2 },
      { enemyId: 'bear', weight: 0.15 },
    ],
  },
  // 14:30〜: 湧き停止(M4 でボス吸収演出に差し替え)
  { from: 870, to: 900, spawnsPer10s: [0, 0], mix: [{ enemyId: 'insect', weight: 1 }] },
];

export const WAVE_EVENTS: WaveEvent[] = [
  { at: 360, type: 'deerRush' }, // 6:00 鹿型の群れ突進(8 体同時)
  { at: 780, type: 'encircle' }, // 13:00 蟲型の大包囲(外周から円環湧き)
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
