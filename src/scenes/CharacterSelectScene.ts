import Phaser from 'phaser';
import { CHARACTERS, type CharacterDef } from '../data/characters';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const CARD_COLOR: Record<string, number> = {
  kanami: 0xe06080,
  hiyori: 0x8060d0,
  mai: 0x50a0d0,
};

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, 70, '刀使を選べ', { fontSize: '36px', color: '#f0f4ff' })
      .setOrigin(0.5);

    const chars = Object.values(CHARACTERS);
    const cardW = 360;
    const cardH = 470;
    const gap = 40;
    const totalW = chars.length * cardW + (chars.length - 1) * gap;
    const left = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cy = GAME_HEIGHT / 2 + 40;

    chars.forEach((def, i) => {
      const cx = left + i * (cardW + gap);
      this.makeCard(def, i, cx, cy, cardW, cardH);
    });
  }

  private makeCard(def: CharacterDef, index: number, cx: number, cy: number, w: number, h: number): void {
    const color = CARD_COLOR[def.id];
    const card = this.add
      .rectangle(cx, cy, w, h, 0x14142a)
      .setStrokeStyle(2, color)
      .setInteractive({ useHandCursor: true });

    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
    let y = cy - h / 2 + 30;
    this.add.text(cx, y, `[${index + 1}]`, { fontSize: '15px', color: colorHex }).setOrigin(0.5);
    y += 34;
    this.add.text(cx, y, def.name, { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    y += 32;
    this.add
      .text(cx, y, `御刀「${def.okatana}」 — ${def.roleJa}`, { fontSize: '15px', color: colorHex })
      .setOrigin(0.5);
    y += 40;

    const stats = [
      `HP ${def.hp}   移動 ${def.moveSpeed}`,
      `攻撃 ${def.attack.power} / ${def.attack.interval}s`,
      `範囲 ${def.attack.radius}px・扇${def.attack.arcDeg}°`,
    ].join('\n');
    this.add
      .text(cx, y, stats, { fontSize: '15px', color: '#c0c0d8', align: 'center', lineSpacing: 8 })
      .setOrigin(0.5, 0);
    y += 90;

    const caps = def.abilityCaps;
    this.add
      .text(
        cx,
        y,
        `写しLv${caps.utsushi}  迅移Lv${caps.jinI}\n金剛身Lv${caps.kongoushin}  八幡力Lv${caps.hachimanriki}`,
        { fontSize: '15px', color: '#9adcff', align: 'center', lineSpacing: 8 },
      )
      .setOrigin(0.5, 0);
    y += 70;

    this.add
      .text(cx, y, `◆ ${def.passiveNameJa}`, { fontSize: '17px', color: '#ffd080' })
      .setOrigin(0.5, 0);
    y += 28;
    this.add
      .text(cx, y, def.passiveTextJa, {
        fontSize: '13px',
        color: '#c0c0d8',
        wordWrap: { width: w - 50, useAdvancedWrap: true }, // 日本語は空白で折り返せないため
        align: 'center',
      })
      .setOrigin(0.5, 0);

    const pick = () => {
      this.registry.set('characterId', def.id);
      this.scene.start('Game');
    };
    card.on('pointerover', () => card.setFillStyle(0x1e1e40));
    card.on('pointerout', () => card.setFillStyle(0x14142a));
    card.on('pointerdown', pick);
    this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE'][index]}`, pick);
  }
}
