import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { loadSave, storeSave } from '../core/save';
import { buy, canBuy, resetTraining, type TrainingState } from '../core/meta';
import { TRAINING_DEFS, TRAINING_IDS, TRAINING_MAX_STAGE, trainingCost } from '../data/meta';
import { audio } from '../core/audio';

const ROW_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const;

interface Row {
  bg: Phaser.GameObjects.Rectangle;
  stageText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
}

/** 鍛錬画面(docs/07 §4)。持ち帰ったノロで恒久強化を購入する。ラン外なので毎回再構築でよい */
export class TrainingScene extends Phaser.Scene {
  private noro = 0;
  private training!: TrainingState;
  private noroText!: Phaser.GameObjects.Text;
  private rows: Row[] = [];
  private resetArmed = false;
  private resetText!: Phaser.GameObjects.Text;

  constructor() {
    super('Training');
  }

  create(): void {
    const save = loadSave();
    this.noro = save.noro;
    this.training = { ...save.training };
    this.rows = [];
    this.resetArmed = false;

    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 56, '鍛錬', { fontSize: '36px', color: '#f0f4ff' }).setOrigin(0.5);
    this.add
      .text(cx, 92, 'ラン終了時に回収したノロで、刀使の基礎力を恒久強化する', {
        fontSize: '14px',
        color: '#8888aa',
      })
      .setOrigin(0.5);
    this.noroText = this.add
      .text(GAME_WIDTH - 40, 56, '', { fontSize: '22px', color: '#9b5cf0' })
      .setOrigin(1, 0.5);

    const rowW = 760;
    const rowH = 74;
    const top = 150;
    TRAINING_IDS.forEach((id, i) => {
      const def = TRAINING_DEFS[id];
      const y = top + i * (rowH + 12);
      const bg = this.add
        .rectangle(cx, y + rowH / 2, rowW, rowH, 0x14142a)
        .setStrokeStyle(2, 0x4a90d9)
        .setInteractive({ useHandCursor: true });
      this.add.text(cx - rowW / 2 + 18, y + 12, `[${i + 1}] ${def.nameJa}`, {
        fontSize: '19px',
        color: '#ffffff',
      });
      this.add.text(cx - rowW / 2 + 18, y + 42, `1段階ごとに ${def.textJa}`, {
        fontSize: '13px',
        color: '#c0c0d8',
        wordWrap: { width: rowW - 300, useAdvancedWrap: true }, // 日本語は空白で折り返せないため
      });
      const stageText = this.add
        .text(cx + rowW / 2 - 190, y + rowH / 2, '', { fontSize: '18px', color: '#ffd080' })
        .setOrigin(0.5);
      const costText = this.add
        .text(cx + rowW / 2 - 60, y + rowH / 2, '', { fontSize: '16px', color: '#9adcff' })
        .setOrigin(0.5);

      const pick = () => this.tryBuy(id);
      bg.on('pointerover', () => bg.setFillStyle(0x1e1e40));
      bg.on('pointerout', () => bg.setFillStyle(0x14142a));
      bg.on('pointerdown', pick);
      this.input.keyboard!.on(`keydown-${ROW_KEYS[i]}`, pick);

      this.rows.push({ bg, stageText, costText });
    });

    this.resetText = this.add
      .text(cx, GAME_HEIGHT - 64, '', { fontSize: '15px', color: '#ff8080' })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT - 34, '1〜5 / クリック: 購入   R: 全リセット(返金100%)   ESC: タイトルへ', {
        fontSize: '16px',
        color: '#8888aa',
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown', (ev: KeyboardEvent) => this.onKey(ev));
    this.refresh();
  }

  /** リセットの2段階確認: R → もう一度 R で確定、他キーでキャンセル */
  private onKey(ev: KeyboardEvent): void {
    if (ev.key === 'r' || ev.key === 'R') {
      if (this.resetArmed) {
        const result = resetTraining(this.noro, this.training);
        this.noro = result.noro;
        this.training = result.training;
        this.persist();
        this.resetArmed = false;
        this.resetText.setText('');
        audio.shockwave();
        this.refresh();
      } else {
        this.resetArmed = true;
        this.resetText.setText('全系統をリセットしてノロを全額返金します — もう一度 R で確定(他のキーでキャンセル)');
      }
      return;
    }
    if (this.resetArmed) {
      this.resetArmed = false;
      this.resetText.setText('');
    }
    if (ev.key === 'Escape') this.scene.start('Title');
  }

  private tryBuy(id: (typeof TRAINING_IDS)[number]): void {
    if (!canBuy(this.noro, this.training, id)) return;
    const result = buy(this.noro, this.training, id);
    this.noro = result.noro;
    this.training = result.training;
    this.persist();
    audio.pickup();
    this.refresh();
  }

  private persist(): void {
    const data = loadSave();
    data.noro = this.noro;
    data.training = { ...this.training };
    storeSave(data);
  }

  private refresh(): void {
    this.noroText.setText(`ノロ ${this.noro}`);
    TRAINING_IDS.forEach((id, i) => {
      const stage = this.training[id] ?? 0;
      const row = this.rows[i];
      row.stageText.setText('●'.repeat(stage) + '○'.repeat(TRAINING_MAX_STAGE - stage));
      if (stage >= TRAINING_MAX_STAGE) {
        row.costText.setText('極').setColor('#ffd700');
        row.bg.setStrokeStyle(2, 0xffd700);
      } else {
        const cost = trainingCost(stage + 1);
        row.costText.setText(`${cost}`).setColor(this.noro >= cost ? '#9adcff' : '#e04040');
        row.bg.setStrokeStyle(2, 0x4a90d9);
      }
    });
  }
}
