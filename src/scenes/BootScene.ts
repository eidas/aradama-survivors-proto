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

    // 荒魂・鳥型: 黒い三角 + 橙コア
    g.fillStyle(0x0a0a0a);
    g.beginPath();
    g.moveTo(11, 2);
    g.lineTo(21, 18);
    g.lineTo(1, 18);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xff8a2a);
    g.fillCircle(11, 12, 2.5);
    g.generateTexture('enemy-bird', 22, 22);
    g.clear();

    // 荒魂・鹿型: 縦長の黒菱形 + 橙コア
    g.fillStyle(0x0a0a0a);
    g.beginPath();
    g.moveTo(13, 1);
    g.lineTo(25, 14);
    g.lineTo(13, 27);
    g.lineTo(1, 14);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xff5a1a);
    g.fillCircle(13, 10, 3);
    g.generateTexture('enemy-deer', 26, 28);
    g.clear();

    // 荒魂・熊型: 大きな黒円 + 赤コア 2 つ
    g.fillStyle(0x0a0a0a);
    g.fillCircle(17, 17, 16);
    g.lineStyle(1, 0x2a1010);
    g.strokeCircle(17, 17, 16);
    g.fillStyle(0xff2020);
    g.fillCircle(12, 13, 3);
    g.fillCircle(22, 13, 3);
    g.fillStyle(0xff5a1a, 0.8);
    g.fillCircle(17, 23, 2.5);
    g.generateTexture('enemy-bear', 34, 34);
    g.clear();

    // 斬撃波(飛ぶ斬撃): 白い弧
    g.lineStyle(4, 0xd8ecff, 0.95);
    g.beginPath();
    g.arc(4, 14, 12, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60));
    g.strokePath();
    g.generateTexture('slash-wave', 22, 28);
    g.clear();

    // ノロジェム S/M/L(黒紫の結晶)
    this.makeGemTexture(g, 'gem-s', 5, 0x9b5cf0);
    this.makeGemTexture(g, 'gem-m', 7, 0xb04ce0);
    this.makeGemTexture(g, 'gem-l', 9, 0xd040c0);

    // 衝撃波リング(金剛身の解除反撃など)
    g.lineStyle(4, 0xffd700, 0.9);
    g.strokeCircle(42, 42, 40);
    g.generateTexture('ring', 84, 84);
    g.clear();

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
