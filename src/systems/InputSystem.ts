import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEBUG } from '../config';

/**
 * キーボード入力を正規化して player.moveX/Y に書く。
 * 能力キー: Shift=迅移 / E か右クリック=金剛身(長押し) / Space=八幡力(長押し溜め)。
 * DEV ビルドではデバッグキーも処理。
 */
export class InputSystem {
  private keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up2: Phaser.Input.Keyboard.Key;
    down2: Phaser.Input.Keyboard.Key;
    left2: Phaser.Input.Keyboard.Key;
    right2: Phaser.Input.Keyboard.Key;
    dash: Phaser.Input.Keyboard.Key;
    guard: Phaser.Input.Keyboard.Key;
    charge: Phaser.Input.Keyboard.Key;
  };
  private debugKeys?: {
    stress: Phaser.Input.Keyboard.Key;
    skip: Phaser.Input.Keyboard.Key;
    invincible: Phaser.Input.Keyboard.Key;
  };

  constructor(private game: GameScene) {
    const kb = game.input.keyboard!;
    this.keys = {
      up: kb.addKey('W'),
      down: kb.addKey('S'),
      left: kb.addKey('A'),
      right: kb.addKey('D'),
      up2: kb.addKey('UP'),
      down2: kb.addKey('DOWN'),
      left2: kb.addKey('LEFT'),
      right2: kb.addKey('RIGHT'),
      dash: kb.addKey('SHIFT'),
      guard: kb.addKey('E'),
      charge: kb.addKey('SPACE'),
    };
    game.input.mouse?.disableContextMenu(); // 右クリック=金剛身のため
    if (DEBUG) {
      this.debugKeys = {
        stress: kb.addKey('O'),
        skip: kb.addKey('K'),
        invincible: kb.addKey('I'),
      };
    }
  }

  /** 迅移の押下エッジ(フレーム内で 1 回だけ呼ぶこと。JustDown は消費型) */
  dashJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.dash);
  }

  get guardHeld(): boolean {
    return this.keys.guard.isDown || this.game.input.activePointer.rightButtonDown();
  }

  get chargeHeld(): boolean {
    return this.keys.charge.isDown;
  }

  update(): void {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.left.isDown || k.left2.isDown) x -= 1;
    if (k.right.isDown || k.right2.isDown) x += 1;
    if (k.up.isDown || k.up2.isDown) y -= 1;
    if (k.down.isDown || k.down2.isDown) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    this.game.player.moveX = x;
    this.game.player.moveY = y;

    if (this.debugKeys) {
      const d = this.debugKeys;
      if (Phaser.Input.Keyboard.JustDown(d.stress)) this.game.spawnSystem.stressSpawn(300);
      if (Phaser.Input.Keyboard.JustDown(d.skip)) this.game.skipTime(60);
      if (Phaser.Input.Keyboard.JustDown(d.invincible)) {
        this.game.player.cheatInvincible = !this.game.player.cheatInvincible;
      }
    }
  }
}
