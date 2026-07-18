import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { loadSave } from '../core/save';

export interface RunResult {
  victory: boolean;
  timeSec: number;
  kills: number;
  level: number;
  characterName: string;
  build: string[];
  bestUpdated: boolean;
}

const fmt = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: RunResult): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.14, data.victory ? '討伐完了' : '戦闘不能', {
        fontSize: '52px',
        color: data.victory ? '#9adcff' : '#e04040',
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        GAME_HEIGHT * 0.30,
        [
          `刀使      ${data.characterName}`,
          `生存時間  ${fmt(data.timeSec)}`,
          `撃破数    ${data.kills}`,
          `レベル    ${data.level}`,
        ].join('\n'),
        { fontSize: '24px', color: '#f0f4ff', align: 'left', lineSpacing: 10 },
      )
      .setOrigin(0.5, 0);

    if (data.bestUpdated) {
      this.add
        .text(cx + 280, GAME_HEIGHT * 0.30, 'ベスト更新!', { fontSize: '20px', color: '#ffd700' })
        .setOrigin(0.5, 0);
    } else {
      const best = loadSave().best;
      if (best) {
        this.add
          .text(
            cx + 300,
            GAME_HEIGHT * 0.30,
            `ベスト\n${best.victory ? '討伐' : fmt(best.timeSec)} / ${best.kills}体`,
            { fontSize: '16px', color: '#8888aa', align: 'center', lineSpacing: 6 },
          )
          .setOrigin(0.5, 0);
      }
    }

    // 最終ビルド
    if (data.build.length > 0) {
      this.add
        .text(cx, GAME_HEIGHT * 0.58, '― 最終ビルド ―', { fontSize: '17px', color: '#b060f0' })
        .setOrigin(0.5);
      this.add
        .text(cx, GAME_HEIGHT * 0.63, data.build.join('  /  '), {
          fontSize: '15px',
          color: '#c0c0d8',
          wordWrap: { width: GAME_WIDTH - 300, useAdvancedWrap: true },
          align: 'center',
          lineSpacing: 6,
        })
        .setOrigin(0.5, 0);
    }

    this.add
      .text(cx, GAME_HEIGHT * 0.88, 'R: もう一度   T: タイトルへ', { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-R', () => this.scene.start('Game'));
    this.input.keyboard!.once('keydown-T', () => this.scene.start('Title'));
  }
}
