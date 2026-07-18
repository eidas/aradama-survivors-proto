/** 敵定義(docs/03 §4)。M1 は E1 蟲型のみ。E2 以降は M2 で追加 */
import type { GemSize } from './balance';

export type AiKind = 'chase'; // M2 で 'orbitDive' | 'charge' | 'tank' | 'centipede' | 'boss' を追加

export interface EnemyDef {
  id: string;
  hp: number;
  speed: number; // px/s
  contactDamage: number;
  radius: number; // 衝突半径 px
  gemDrop: { size: GemSize; count: number }[];
  ai: AiKind;
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
    textureKey: 'enemy-insect',
  },
};
