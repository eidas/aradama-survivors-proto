/** キャラクター定義(docs/03 §3) */

export type AbilityId = 'utsushi' | 'jinI' | 'kongoushin' | 'hachimanriki';
export type CharacterId = 'kanami' | 'hiyori' | 'mai';
export type PassiveId = 'mitori' | 'iai' | 'mamori';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  okatana: string;
  roleJa: string;
  passive: PassiveId;
  passiveNameJa: string;
  passiveTextJa: string;
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

/** 見取り稽古: 同一敵タイプ 50 体撃破ごとの与ダメージボーナス */
export const MITORI_PER_KILLS = 50;
export const MITORI_BONUS_STEP = 0.1;
export const MITORI_BONUS_MAX = 0.3;
/** 居合: 攻撃間隔の 1.5 倍以上待った斬撃はクリティカル ×2.0 */
export const IAI_WAIT_MUL = 1.5;
export const IAI_CRIT_MUL = 2.0;
/** 守りの型: 金剛身でダメージを防ぐたび写しが回復する量 */
export const MAMORI_UTSUSHI_HEAL = 5;

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  kanami: {
    id: 'kanami',
    name: '衛藤 可奈美',
    okatana: '千鳥',
    roleJa: 'バランス・連撃型',
    passive: 'mitori',
    passiveNameJa: '見取り稽古',
    passiveTextJa: '同じタイプの荒魂を50体倒すごとに、そのタイプへの与ダメージ+10%(最大+30%)',
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
    roleJa: '速攻・一撃型',
    passive: 'iai',
    passiveNameJa: '居合',
    passiveTextJa: '攻撃間隔の1.5倍以上、間を置いて放つ斬撃はクリティカル(×2.0)',
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
    roleJa: '堅守・持久型',
    passive: 'mamori',
    passiveNameJa: '守りの型',
    passiveTextJa: '金剛身でダメージを防ぐたび、写しが5回復する',
    hp: 120,
    moveSpeed: 145,
    attack: { power: 11, interval: 0.75, radius: 65, arcDeg: 180 },
    utsushiCapacityMul: 1.3,
    pickupRadius: 55,
    abilityCaps: { utsushi: 3, jinI: 1, kongoushin: 3, hachimanriki: 2 },
  },
};
