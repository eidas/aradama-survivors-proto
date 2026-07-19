/** 敵定義(docs/03 §4)。E1〜E4 通常敵+E5 百足型(中ボス)+E6 大型集合体(ボス) */
import type { GemSize } from './balance';

export type AiKind = 'chase' | 'orbitDive' | 'charge' | 'tank' | 'centipede' | 'boss';

export interface EnemyDef {
  id: string;
  nameJa: string; // リザルト画面の内訳表示等で使用(同名なら合算表示される)
  hp: number;
  speed: number; // px/s
  contactDamage: number;
  radius: number; // 衝突半径 px
  gemDrop: { size: GemSize; count: number }[];
  ai: AiKind;
  aiParams: Record<string, number>;
  textureKey: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  insect: {
    id: 'insect',
    nameJa: '蟲型',
    hp: 8,
    speed: 90,
    contactDamage: 5,
    radius: 10,
    gemDrop: [{ size: 'S', count: 1 }],
    ai: 'chase',
    aiParams: {},
    textureKey: 'enemy-insect',
  },
  // 接触ダメージ・急降下頻度はバランス調整パスで緩和(docs/05: 2:00〜4:30 に死因が集中)
  bird: {
    id: 'bird',
    nameJa: '鳥型',
    hp: 14,
    speed: 150,
    contactDamage: 7,
    radius: 9,
    gemDrop: [{ size: 'S', count: 2 }],
    ai: 'orbitDive',
    aiParams: {
      orbitRadius: 250,
      diveIntervalMin: 3.5,
      diveIntervalMax: 5.5,
      telegraph: 0.4,
      diveSpeedMul: 2.5,
      diveDuration: 0.9,
    },
    textureKey: 'enemy-bird',
  },
  deer: {
    id: 'deer',
    nameJa: '鹿型',
    hp: 45,
    speed: 110,
    contactDamage: 15,
    radius: 12,
    gemDrop: [{ size: 'M', count: 1 }],
    ai: 'charge',
    aiParams: {
      detectRange: 280,
      telegraph: 1.1, // 調整パスで +0.1(突進の回避猶予。docs/05)
      chargeSpeed: 320,
      chargeDuration: 1.6,
      stun: 1.0,
    },
    textureKey: 'enemy-deer',
  },
  // E5 百足型(中ボス): 頭+節の連結体。移動は CentipedeController が管轄
  centipedeHead: {
    id: 'centipedeHead',
    nameJa: '百足型',
    hp: 60,
    speed: 130,
    contactDamage: 18,
    radius: 14,
    gemDrop: [{ size: 'L', count: 5 }],
    ai: 'centipede',
    aiParams: { segmentGap: 24, weaveAmp: 0.6, weaveFreq: 4 },
    textureKey: 'enemy-centi-head',
  },
  centipedeSeg: {
    id: 'centipedeSeg',
    nameJa: '百足型',
    hp: 60,
    speed: 130,
    contactDamage: 18,
    radius: 12,
    gemDrop: [],
    ai: 'centipede',
    aiParams: {},
    textureKey: 'enemy-centi-seg',
  },
  // E6 大型集合体(ボス): 撃破でクリア。時間スケーリングなし(HP 2500 固定)
  amalgam: {
    id: 'amalgam',
    nameJa: '大型集合体',
    hp: 2500,
    speed: 70,
    contactDamage: 30,
    radius: 40,
    gemDrop: [],
    ai: 'boss',
    aiParams: {
      actionInterval: 2.5,
      sweepRange: 120,
      sweepTelegraph: 0.8,
      chargeTelegraph: 1.0,
      chargeSpeed: 300,
      chargeDuration: 1.2,
      absorbDuration: 3.0,
      absorbRange: 400,
      maxRadius: 70,
      recover: 0.8,
    },
    textureKey: 'enemy-amalgam',
  },
  bear: {
    id: 'bear',
    nameJa: '熊型',
    hp: 130,
    speed: 55,
    contactDamage: 25,
    radius: 16,
    gemDrop: [{ size: 'M', count: 3 }],
    ai: 'tank',
    aiParams: {
      attackRange: 90,
      windup: 0.8,
      sweepRange: 80,
      recover: 0.6,
    },
    textureKey: 'enemy-bear',
  },
};

/** リザルト画面用の撃破数内訳(敵ID→撃破数 → 日本語名合算)。 */
export interface KillBreakdownEntry {
  nameJa: string;
  count: number;
}

/**
 * GameScene.killsByType(敵ID→撃破数)を、日本語表示名で合算した内訳に変換する。
 * 同じ nameJa を持つ敵定義(例: centipedeHead/centipedeSeg → 百足型)は合算し、
 * 撃破数 0 のタイプは除外する。並び順は ENEMIES の定義順(初出順)。
 */
export function killsByTypeToBreakdown(killsByType: Record<string, number>): KillBreakdownEntry[] {
  const order: string[] = [];
  const totals: Record<string, number> = {};
  for (const def of Object.values(ENEMIES)) {
    const count = killsByType[def.id] ?? 0;
    if (count <= 0) continue;
    if (totals[def.nameJa] === undefined) {
      totals[def.nameJa] = 0;
      order.push(def.nameJa);
    }
    totals[def.nameJa] += count;
  }
  return order.map((nameJa) => ({ nameJa, count: totals[nameJa] }));
}
