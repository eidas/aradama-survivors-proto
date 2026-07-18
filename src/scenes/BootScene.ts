import Phaser from 'phaser';

/**
 * アセットロード。プロト段階は外部アセットを持たず、全テクスチャを手続き的に生成する
 * (荒魂 = 黒ベース + 赤〜橙の発光コア、という見た目の方向性だけ先行検証する)。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const g = this.add.graphics();

    // 背景タイル(64px グリッド)
    g.fillStyle(0x0d0d16);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0x1a1a28);
    g.strokeRect(0, 0, 64, 64);
    g.generateTexture('bg-tile', 64, 64);
    g.clear();

    // プレイヤー(刀使): 白い円 + 青いリング
    g.fillStyle(0xf0f4ff);
    g.fillCircle(16, 16, 12);
    g.lineStyle(3, 0x4a90d9);
    g.strokeCircle(16, 16, 12);
    g.generateTexture('player', 32, 32);
    g.clear();

    // 荒魂・蟲型: 黒い体 + 橙の発光コア
    g.fillStyle(0x0a0a0a);
    g.fillCircle(12, 12, 10);
    g.lineStyle(1, 0x2a1010);
    g.strokeCircle(12, 12, 10);
    g.fillStyle(0xff5a1a);
    g.fillCircle(15, 10, 3);
    g.fillStyle(0xff2020, 0.7);
    g.fillCircle(8, 14, 2);
    g.generateTexture('enemy-insect', 24, 24);
    g.clear();

    // ノロジェム S/M/L(黒紫の結晶)
    this.makeGemTexture(g, 'gem-s', 5, 0x9b5cf0);
    this.makeGemTexture(g, 'gem-m', 7, 0xb04ce0);
    this.makeGemTexture(g, 'gem-l', 9, 0xd040c0);

    // 斬撃(扇形 140° を基準に生成し、キャラ差はスケールと回転で表現)
    const r = 70;
    g.fillStyle(0xffffff, 0.28);
    g.slice(r + 2, r + 2, r, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70));
    g.fillPath();
    g.lineStyle(4, 0xffffff, 0.9);
    g.beginPath();
    g.arc(r + 2, r + 2, r, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70));
    g.strokePath();
    g.generateTexture('slash', (r + 2) * 2, (r + 2) * 2);

    g.destroy();
    this.scene.start('Title');
  }

  private makeGemTexture(g: Phaser.GameObjects.Graphics, key: string, size: number, color: number): void {
    const c = size + 1;
    g.fillStyle(color);
    g.beginPath();
    g.moveTo(c, c - size);
    g.lineTo(c + size * 0.7, c);
    g.lineTo(c, c + size);
    g.lineTo(c - size * 0.7, c);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, c * 2, c * 2);
    g.clear();
  }
}
