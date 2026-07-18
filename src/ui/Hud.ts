import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { xpForNext } from '../core/xp';
import { DEBUG } from '../config';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const BAR_H = 14;

/** HUD(docs/03 §7)。カメラ固定(scrollFactor 0) */
export class Hud {
  private xpFill: Phaser.GameObjects.Rectangle;
  private levelText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;
  private utsushiFill: Phaser.GameObjects.Rectangle;
  private hpFill: Phaser.GameObjects.Rectangle;
  private jinIFill: Phaser.GameObjects.Rectangle;
  private kongouFill: Phaser.GameObjects.Rectangle;
  private chargeText: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;

  constructor(private game: GameScene) {
    const add = game.add;
    const fix = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(
      obj: T,
    ): T => {
      obj.setScrollFactor(0);
      obj.setDepth(100);
      return obj;
    };

    // 上部: 経験値バー + レベル + タイマー
    fix(add.rectangle(GAME_WIDTH / 2, 10, GAME_WIDTH - 20, BAR_H, 0x1a1a2e).setOrigin(0.5, 0));
    this.xpFill = fix(add.rectangle(10, 10, 0, BAR_H, 0x9b5cf0).setOrigin(0, 0));
    this.levelText = fix(
      add.text(GAME_WIDTH - 14, 30, 'Lv1', { fontSize: '18px', color: '#e8e8ff' }).setOrigin(1, 0),
    );
    this.timerText = fix(
      add.text(GAME_WIDTH / 2, 30, '00:00', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5, 0),
    );

    // 下部: 写しバー / HP バー / 撃破数
    const by = GAME_HEIGHT - 46;
    fix(add.text(14, by - 2, '写し', { fontSize: '13px', color: '#9adcff' }).setOrigin(0, 0));
    fix(add.rectangle(60, by, 220, 12, 0x1a1a2e).setOrigin(0, 0));
    this.utsushiFill = fix(add.rectangle(60, by, 220, 12, 0x9adcff).setOrigin(0, 0));
    fix(add.text(14, by + 18, 'HP', { fontSize: '13px', color: '#ff8080' }).setOrigin(0, 0));
    fix(add.rectangle(60, by + 20, 220, 12, 0x1a1a2e).setOrigin(0, 0));
    this.hpFill = fix(add.rectangle(60, by + 20, 220, 12, 0xe04040).setOrigin(0, 0));
    this.killsText = fix(
      add.text(GAME_WIDTH - 14, GAME_HEIGHT - 30, '撃破: 0', { fontSize: '16px', color: '#e8e8ff' }).setOrigin(1, 0),
    );

    // 能力インジケータ(HPバーの右)
    const ax = 320;
    fix(add.text(ax, by - 2, '迅移', { fontSize: '13px', color: '#80ffc0' }).setOrigin(0, 0));
    fix(add.rectangle(ax + 42, by, 90, 12, 0x1a1a2e).setOrigin(0, 0));
    this.jinIFill = fix(add.rectangle(ax + 42, by, 90, 12, 0x80ffc0).setOrigin(0, 0));
    fix(add.text(ax, by + 18, '金剛', { fontSize: '13px', color: '#ffd700' }).setOrigin(0, 0));
    fix(add.rectangle(ax + 42, by + 20, 90, 12, 0x1a1a2e).setOrigin(0, 0));
    this.kongouFill = fix(add.rectangle(ax + 42, by + 20, 90, 12, 0xffd700).setOrigin(0, 0));
    this.chargeText = fix(
      add.text(ax + 150, by - 2, '', { fontSize: '15px', color: '#ffa040' }).setOrigin(0, 0),
    );

    if (DEBUG) {
      this.debugText = fix(add.text(14, 30, '', { fontSize: '13px', color: '#7fff7f' }));
    }
  }

  update(): void {
    const g = this.game;
    const h = g.player.health;

    this.xpFill.width = (GAME_WIDTH - 20) * Math.min(1, g.xp / xpForNext(g.level));
    this.levelText.setText(`Lv${g.level}`);

    const t = Math.floor(g.runTime);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    this.timerText.setText(`${mm}:${ss}`);

    this.utsushiFill.width = 220 * (h.utsushi / h.utsushiMax);
    this.hpFill.width = 220 * (h.hp / h.maxHp);
    this.killsText.setText(`撃破: ${g.kills}`);

    const ab = g.abilitySystem;
    this.jinIFill.width = 90 * ab.jinIReadyRatio;
    this.kongouFill.width = 90 * Math.max(0, ab.kongoushinGauge / ab.kongoushinLevel.gauge);
    const p = g.player;
    const capStage = p.abilityLevels.hachimanriki;
    const marks =
      '▲'.repeat(p.chargeStage) + '△'.repeat(Math.max(0, capStage - p.chargeStage));
    this.chargeText.setText(p.charging ? `八幡力 ${marks}` : '');

    if (this.debugText) {
      const fps = Math.round(g.game.loop.actualFps);
      this.debugText.setText(
        `fps:${fps} 敵:${g.enemies.activeCount} 玉:${g.gems.activeCount}` +
          `${g.player.cheatInvincible ? ' [無敵]' : ''} (O:300体湧き K:+60s I:無敵)`,
      );
    }
  }
}
