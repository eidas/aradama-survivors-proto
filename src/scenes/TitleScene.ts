import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, GAME_HEIGHT * 0.32, '荒魂サバイバーズ', { fontSize: '56px', color: '#f0f4ff' })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT * 0.44, '― 刀使ノ巫女 ファンメイド プロトタイプ ―', {
        fontSize: '20px',
        color: '#9adcff',
      })
      .setOrigin(0.5);
    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.66, 'SPACE / クリック で出撃', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.add
      .text(cx, GAME_HEIGHT * 0.88, '移動: WASD/矢印   攻撃: オート   迅移: Shift   金剛身: E/右クリック長押し   八幡力: Space長押し', {
        fontSize: '16px',
        color: '#8888aa',
      })
      .setOrigin(0.5);

    const start = () => this.scene.start('CharacterSelect');
    this.input.keyboard!.once('keydown-SPACE', start);
    this.input.once('pointerdown', start);
  }
}
