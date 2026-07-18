import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { UpgradeDef } from '../data/upgrades';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const CATEGORY_LABEL: Record<UpgradeDef['category'], string> = {
  okatana: '御刀強化',
  kakuriyo: '隠世の力',
  body: '身体強化',
};
const CATEGORY_COLOR: Record<UpgradeDef['category'], number> = {
  okatana: 0xd9a441,
  kakuriyo: 0xb060f0,
  body: 0x4a90d9,
};

/** レベルアップ 3 択オーバーレイ。GameScene を pause した上に launch される */
export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUp');
  }

  create(data: { options: UpgradeDef[]; level: number }): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setOrigin(0)
      .setInteractive(); // 背面クリックの誤爆防止

    this.add
      .text(GAME_WIDTH / 2, 130, `Lv${data.level} — 強化を選べ`, {
        fontSize: '32px',
        color: '#f0f4ff',
      })
      .setOrigin(0.5);

    const game = this.scene.get('Game') as GameScene;
    const cardW = 320;
    const cardH = 220;
    const gap = 40;
    const totalW = data.options.length * cardW + (data.options.length - 1) * gap;
    const left = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cy = GAME_HEIGHT / 2 + 20;

    data.options.forEach((upg, i) => {
      const cx = left + i * (cardW + gap);
      const color = CATEGORY_COLOR[upg.category];
      const card = this.add
        .rectangle(cx, cy, cardW, cardH, 0x14142a)
        .setStrokeStyle(2, color)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx - cardW / 2 + 16, cy - cardH / 2 + 14, `[${i + 1}] ${CATEGORY_LABEL[upg.category]}`, {
        fontSize: '14px',
        color: `#${color.toString(16).padStart(6, '0')}`,
      });
      this.add
        .text(cx, cy - 40, upg.nameJa, { fontSize: '26px', color: '#ffffff' })
        .setOrigin(0.5);
      this.add
        .text(cx, cy + 15, upg.textJa, {
          fontSize: '15px',
          color: '#c0c0d8',
          wordWrap: { width: cardW - 40, useAdvancedWrap: true }, // 日本語は空白で折り返せないため
          align: 'center',
        })
        .setOrigin(0.5);
      const taken = game.takes[upg.id] ?? 0;
      this.add
        .text(cx, cy + cardH / 2 - 22, `取得 ${taken}/${upg.maxTakes}`, {
          fontSize: '13px',
          color: '#8888aa',
        })
        .setOrigin(0.5);

      const pick = () => this.choose(game, upg);
      card.on('pointerover', () => card.setFillStyle(0x1e1e40));
      card.on('pointerout', () => card.setFillStyle(0x14142a));
      card.on('pointerdown', pick);
      this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE'][i]}`, pick);
    });
  }

  private choose(game: GameScene, upg: UpgradeDef): void {
    game.applyUpgrade(upg);
    this.scene.stop();
    this.scene.resume('Game');
  }
}
