import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const OPTIONS: { label: string; color: number }[] = [
  { label: '再開', color: 0x4a90d9 },
  { label: 'リスタート', color: 0xd9a441 },
  { label: 'タイトルへ', color: 0xb060f0 },
];

/** ポーズメニュー(ESC)。LevelUpScene と同方式: GameScene を pause した上に launch される */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setOrigin(0)
      .setInteractive(); // 背面クリックの誤爆防止

    this.add
      .text(GAME_WIDTH / 2, 130, '一時停止', { fontSize: '32px', color: '#f0f4ff' })
      .setOrigin(0.5);

    const cardW = 260;
    const cardH = 160;
    const gap = 40;
    const totalW = OPTIONS.length * cardW + (OPTIONS.length - 1) * gap;
    const left = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cy = GAME_HEIGHT / 2 + 20;

    const actions = [
      () => this.resume(),
      () => this.restart(),
      () => this.toTitle(),
    ];

    OPTIONS.forEach((opt, i) => {
      const cx = left + i * (cardW + gap);
      const card = this.add
        .rectangle(cx, cy, cardW, cardH, 0x14142a)
        .setStrokeStyle(2, opt.color)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx - cardW / 2 + 16, cy - cardH / 2 + 14, `[${i + 1}]`, {
        fontSize: '14px',
        color: `#${opt.color.toString(16).padStart(6, '0')}`,
      });
      this.add.text(cx, cy, opt.label, { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

      const pick = actions[i];
      card.on('pointerover', () => card.setFillStyle(0x1e1e40));
      card.on('pointerout', () => card.setFillStyle(0x14142a));
      card.on('pointerdown', pick);
      this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE'][i]}`, pick);
    });

    // もう一度 ESC で再開(LevelUp 表示中はこのシーン自体が存在しないため衝突しない)
    this.input.keyboard!.once('keydown-ESC', () => this.resume());
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume('Game');
  }

  private restart(): void {
    this.scene.stop();
    this.scene.start('Game');
  }

  private toTitle(): void {
    this.scene.stop();
    this.scene.stop('Game');
    this.scene.start('Title');
  }
}
