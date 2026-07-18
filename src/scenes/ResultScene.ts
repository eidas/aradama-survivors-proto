import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export interface RunResult {
  victory: boolean;
  timeSec: number;
  kills: number;
  level: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: RunResult): void {
    const cx = GAME_WIDTH / 2;
    const mm = String(Math.floor(data.timeSec / 60)).padStart(2, '0');
    const ss = String(Math.floor(data.timeSec % 60)).padStart(2, '0');

    this.add
      .text(cx, GAME_HEIGHT * 0.28, data.victory ? '討伐完了' : '戦闘不能', {
        fontSize: '52px',
        color: data.victory ? '#9adcff' : '#e04040',
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        GAME_HEIGHT * 0.48,
        [`生存時間  ${mm}:${ss}`, `撃破数    ${data.kills}`, `レベル    ${data.level}`].join('\n'),
        { fontSize: '26px', color: '#f0f4ff', align: 'left', lineSpacing: 12 },
      )
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.74, 'R: もう一度   T: タイトルへ', { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-R', () => this.scene.start('Game'));
    this.input.keyboard!.once('keydown-T', () => this.scene.start('Title'));
  }
}
