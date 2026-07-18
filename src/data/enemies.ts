/** 敵定義(docs/03 §4)。M2: E1〜E4。E5 百足型・E6 大型集合体は M4 で追加 */
import type { GemSize } from './balance';

export type AiKind = 'chase' | 'orbitDive' | 'charge' | 'tank';

export interface EnemyDef {
  id: string;
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
    hp: 8,
    speed: 90,
    contactDamage: 5,
    radius: 10,
    gemDrop: [{ size: 'S', count: 1 }],
    ai: 'chase',
    aiParams: {},
    textureKey: 'enemy-insect',
  },
  bird: {
    id: 'bird',
    hp: 14,
    speed: 150,
    contactDamage: 8,
    radius: 9,
    gemDrop: [{ size: 'S', count: 2 }],
    ai: 'orbitDive',
    aiParams: {
      orbitRadius: 250,
      diveIntervalMin: 3,
      diveIntervalMax: 5,
      telegraph: 0.4,
      diveSpeedMul: 2.5,
      diveDuration: 0.9,
    },
    textureKey: 'enemy-bird',
  },
  deer: {
    id: 'deer',
    hp: 45,
    speed: 110,
    contactDamage: 15,
    radius: 12,
    gemDrop: [{ size: 'M', count: 1 }],
    ai: 'charge',
    aiParams: {
      detectRange: 280,
      telegraph: 1.0,
      chargeSpeed: 320,
      chargeDuration: 1.6,
      stun: 1.0,
    },
    textureKey: 'enemy-deer',
  },
  bear: {
    id: 'bear',
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
