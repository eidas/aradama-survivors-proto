import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { loadSave } from '../core/save';
import type { KillBreakdownEntry } from '../data/enemies';

export interface RunResult {
  victory: boolean;
  timeSec: number;
  kills: number;
  level: number;
  characterName: string;
  build: string[];
  killBreakdown: KillBreakdownEntry[];
  bestUpdated: boolean;
  /** 持ち帰りノロ(docs/07 §2.1) */
  noroEarned: number;
  /** 加算後の所持ノロ累計 */
  noroTotal: number;
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

    // 敵タイプ別の撃破内訳(0件は除外済み)。右側のベスト表示と対称に左側へ配置し、
    // 中央の統計ブロック・下部の最終ビルドと重ならないよう右揃えで伸ばす。
    if (data.killBreakdown.length > 0) {
      this.add
        .text(
          cx - 280,
          GAME_HEIGHT * 0.30,
          ['撃破内訳', ...data.killBreakdown.map((k) => `${k.nameJa}  ${k.count}`)].join('\n'),
          { fontSize: '16px', color: '#8888aa', align: 'right', lineSpacing: 6 },
        )
        .setOrigin(1, 0);
    }

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

    // 持ち帰りノロ(docs/07 §2.1, §2.3)。最終ビルドの下・操作案内の上に配置し重なりを避ける
    this.add
      .text(cx, GAME_HEIGHT * 0.78, `持ち帰りノロ +${data.noroEarned}(累計 ${data.noroTotal})`, {
        fontSize: '18px',
        color: '#7ee8c8',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.88, 'R: もう一度   T: タイトルへ', { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-R', () => this.scene.start('Game'));
    this.input.keyboard!.once('keydown-T', () => this.scene.start('Title'));
  }
}
