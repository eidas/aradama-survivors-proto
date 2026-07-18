/**
 * レベルアップ強化プール(docs/03 §6)。
 * M2 時点では御刀強化 6 種+身体強化 5 種を実装。
 * 「隠世の力」4 種と能力連動の 3 種(迅移の残心・金剛の余韻・溜めの心得)は M3 で追加する。
 */
import type { Player } from '../entities/Player';

export interface UpgradeContext {
  player: Player;
}

export interface UpgradeDef {
  id: string;
  category: 'okatana' | 'body'; // M3 で 'kakuriyo' を追加
  nameJa: string;
  textJa: string;
  maxTakes: number;
  apply(ctx: UpgradeContext): void;
}

export const UPGRADES: readonly UpgradeDef[] = [
  // ── 御刀強化 ──
  {
    id: 'slash-power',
    category: 'okatana',
    nameJa: '斬撃強化',
    textJa: '攻撃力 +15%',
    maxTakes: 5,
    apply: ({ player }) => {
      player.mods.attackMul *= 1.15;
    },
  },
  {
    id: 'swift-form',
    category: 'okatana',
    nameJa: '疾さの型',
    textJa: '攻撃間隔 −8%',
    maxTakes: 5,
    apply: ({ player }) => {
      player.mods.intervalMul *= 0.92;
    },
  },
  {
    id: 'wide-swing',
    category: 'okatana',
    nameJa: '大振り',
    textJa: '攻撃範囲(半径・扇角)+12%',
    maxTakes: 3,
    apply: ({ player }) => {
      player.mods.rangeMul *= 1.12;
    },
  },
  {
    id: 'double-slash',
    category: 'okatana',
    nameJa: '二連斬',
    textJa: '攻撃の直後、逆方向へもう一閃(威力 60%)',
    maxTakes: 1,
    apply: ({ player }) => {
      player.mods.doubleSlash = true;
    },
  },
  {
    id: 'slash-wave',
    category: 'okatana',
    nameJa: '斬撃波',
    textJa: '前方へ飛ぶ斬撃を放つ(威力 50%、取得ごとに射程 180→240→300)',
    maxTakes: 3,
    apply: ({ player }) => {
      player.mods.slashWaveLevel++;
    },
  },
  {
    id: 'tsubazeriai',
    category: 'okatana',
    nameJa: '鍔迫り',
    textJa: '予備動作中の敵に斬撃を当てると、突進・薙ぎ払いを打ち消す',
    maxTakes: 1,
    apply: ({ player }) => {
      player.mods.tsubazeriai = true;
    },
  },
  // ── 身体強化 ──
  {
    id: 'swift-feet',
    category: 'body',
    nameJa: '健脚',
    textJa: '移動速度 +10%',
    maxTakes: 3,
    apply: ({ player }) => {
      player.mods.moveSpeedMul *= 1.1;
    },
  },
  {
    id: 'keen-sense',
    category: 'body',
    nameJa: '気配察知',
    textJa: 'ノロ吸引半径 +25%',
    maxTakes: 3,
    apply: ({ player }) => {
      player.mods.pickupMul *= 1.25;
    },
  },
  {
    id: 'deep-breath',
    category: 'body',
    nameJa: '深呼吸',
    textJa: '写しの回復開始が 1.0 秒早くなる',
    maxTakes: 1,
    apply: ({ player }) => {
      player.health.utsushiRegenDelay = Math.max(1, player.health.utsushiRegenDelay - 1);
    },
  },
  {
    id: 'first-aid',
    category: 'body',
    nameJa: '手当て',
    textJa: 'HP を 30 回復(即時)',
    maxTakes: 3,
    apply: ({ player }) => {
      player.health.hp = Math.min(player.health.maxHp, player.health.hp + 30);
    },
  },
  {
    id: 'guts',
    category: 'body',
    nameJa: '胆力',
    textJa: '最大 HP +25(回復はしない)',
    maxTakes: 2,
    apply: ({ player }) => {
      player.health.maxHp += 25;
    },
  },
];
