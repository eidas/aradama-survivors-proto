/** キャラクター定義(docs/03 §3)。M1 では可奈美のみ使用、M3 で選択可能にする */

export type AbilityId = 'utsushi' | 'jinI' | 'kongoushin' | 'hachimanriki';
export type CharacterId = 'kanami' | 'hiyori' | 'mai';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  okatana: string;
  hp: number;
  moveSpeed: number; // px/s
  attack: {
    power: number;
    interval: number; // 秒
    radius: number; // px
    arcDeg: number;
  };
  utsushiCapacityMul: number;
  pickupRadius: number;
  abilityCaps: Record<AbilityId, number>;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  kanami: {
    id: 'kanami',
    name: '衛藤 可奈美',
    okatana: '千鳥',
    hp: 100,
    moveSpeed: 160,
    attack: { power: 10, interval: 0.55, radius: 70, arcDeg: 140 },
    utsushiCapacityMul: 1.0,
    pickupRadius: 40,
    abilityCaps: { utsushi: 2, jinI: 2, kongoushin: 1, hachimanriki: 3 },
  },
  hiyori: {
    id: 'hiyori',
    name: '十条 姫和',
    okatana: '小烏丸',
    hp: 80,
    moveSpeed: 170,
    attack: { power: 16, interval: 1.1, radius: 95, arcDeg: 70 },
    utsushiCapacityMul: 0.8,
    pickupRadius: 40,
    abilityCaps: { utsushi: 1, jinI: 3, kongoushin: 1, hachimanriki: 2 },
  },
  mai: {
    id: 'mai',
    name: '柳瀬 舞衣',
    okatana: '孫六兼元',
    hp: 120,
    moveSpeed: 145,
    attack: { power: 11, interval: 0.75, radius: 65, arcDeg: 180 },
    utsushiCapacityMul: 1.3,
    pickupRadius: 55,
    abilityCaps: { utsushi: 3, jinI: 1, kongoushin: 3, hachimanriki: 2 },
  },
};
