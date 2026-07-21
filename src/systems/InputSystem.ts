import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { DEBUG } from '../config';
import { audio } from '../core/audio';
import { updateSettings } from '../core/save';

/** 自動操縦ボット(updateAutopilot)の閾値。密集判定距離(px)・鍔迫り警戒距離(px)・迅移発動に必要な密集数 */
const AUTOPILOT_CLOSE_RANGE = 80;
const AUTOPILOT_TELEGRAPH_RANGE = 120;
const AUTOPILOT_DASH_CLUSTER_COUNT = 4;

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
    mute: Phaser.Input.Keyboard.Key;
    damageNumbers: Phaser.Input.Keyboard.Key;
    pause: Phaser.Input.Keyboard.Key;
  };
  private debugKeys?: {
    stress: Phaser.Input.Keyboard.Key;
    skip: Phaser.Input.Keyboard.Key;
    invincible: Phaser.Input.Keyboard.Key;
    autopilot: Phaser.Input.Keyboard.Key;
    fastForward: Phaser.Input.Keyboard.Key;
  };
  /** ボットの能力トリガー(入力エミュレーション)。毎フレーム update() 冒頭でリセットし、
   *  自動操縦時のみ updateAutopilot() が立てる。手動操作へ戻ったときに残留させない。 */
  private botWantsDash = false;
  private botWantsGuard = false;

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
      mute: kb.addKey('M'),
      damageNumbers: kb.addKey('N'),
      pause: kb.addKey('ESC'),
    };
    game.input.mouse?.disableContextMenu(); // 右クリック=金剛身のため
    if (DEBUG) {
      this.debugKeys = {
        stress: kb.addKey('O'),
        skip: kb.addKey('K'),
        invincible: kb.addKey('I'),
        autopilot: kb.addKey('P'),
        fastForward: kb.addKey('T'),
      };
    }
  }

  /** 迅移の押下エッジ(フレーム内で 1 回だけ呼ぶこと。JustDown は消費型) */
  dashJustPressed(): boolean {
    const real = Phaser.Input.Keyboard.JustDown(this.keys.dash);
    return real || this.botWantsDash;
  }

  get guardHeld(): boolean {
    return this.botWantsGuard || this.keys.guard.isDown || this.game.input.activePointer.rightButtonDown();
  }

  get chargeHeld(): boolean {
    return this.keys.charge.isDown;
  }

  update(): void {
    const k = this.keys;
    // 自動操縦を切ったときにボット入力が残留しないよう、手動操作パスでは常に false
    this.botWantsDash = false;
    this.botWantsGuard = false;
    if (Phaser.Input.Keyboard.JustDown(k.mute)) {
      const settings = updateSettings({ muted: !audio.muted });
      audio.setMuted(settings.muted);
    }
    if (Phaser.Input.Keyboard.JustDown(k.damageNumbers)) {
      const settings = updateSettings({ damageNumbers: !this.game.damageNumbersEnabled });
      this.game.setDamageNumbersEnabled(settings.damageNumbers);
    }
    // レベルアップ3択の表示中は Game が pause され update 自体が呼ばれないため、
    // isChoosing の追加チェックは到達不能(GameScene.openPause 側の choosing ガードで十分)
    if (Phaser.Input.Keyboard.JustDown(k.pause)) {
      this.game.openPause();
      return;
    }

    if (this.game.autopilot) {
      this.updateAutopilot();
    } else {
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
    }

    if (this.debugKeys) {
      const d = this.debugKeys;
      if (Phaser.Input.Keyboard.JustDown(d.stress)) this.game.spawnSystem.stressSpawn(300);
      if (Phaser.Input.Keyboard.JustDown(d.skip)) this.game.skipTime(60);
      if (Phaser.Input.Keyboard.JustDown(d.invincible)) {
        this.game.player.cheatInvincible = !this.game.player.cheatInvincible;
      }
      if (Phaser.Input.Keyboard.JustDown(d.autopilot)) this.game.autopilot = !this.game.autopilot;
      if (Phaser.Input.Keyboard.JustDown(d.fastForward)) this.game.fastForward = !this.game.fastForward;
    }
  }

  /**
   * デバッグ用自動操縦(バランス計測ボット)。「戦う標準プレイヤー」の近似:
   * 敵が近すぎれば離れ、安全ならジェムを回収し、暇なら攻撃射程の縁まで敵に寄る。
   * 能力使用ボット(docs/05「能力使用ボットでの再計測」): 迅移で密集離脱・金剛身で予備動作を防ぐ。
   * 八幡力は溜め中に移動不可になり離脱ロジックと相性が悪いため未使用のまま(標準未満プレイヤーの近似は維持)。
   */
  private updateAutopilot(): void {
    const g = this.game;
    const p = g.player;
    const abil = g.abilitySystem;

    let nearest: { x: number; y: number } | null = null;
    let nearestD = Infinity;
    let closeCount = 0; // 迅移判定用: 80px 以内の敵数
    let telegraphNearby = false; // 金剛身判定用: 120px 以内に予備動作中の敵
    for (const e of g.enemies.active) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = e;
      }
      if (d <= AUTOPILOT_CLOSE_RANGE) closeCount++;
      if (e.telegraphing && d <= AUTOPILOT_TELEGRAPH_RANGE) telegraphNearby = true;
    }

    let fx = 0;
    let fy = 0;
    if (nearestD < 70 || closeCount >= AUTOPILOT_DASH_CLUSTER_COUNT) {
      // 近すぎ、または密集(迅移離脱条件): 近傍 150px の敵から加重で離脱
      for (const e of g.enemies.active) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d > 150 || d < 1e-6) continue;
        const w = 1 / d;
        fx += (dx / d) * w;
        fy += (dy / d) * w;
      }
    } else {
      // 安全: 最寄りのジェムへ(500px 圏内)。なければ敵の射程縁へ寄る
      let bestGem: { x: number; y: number } | null = null;
      let bestD2 = 500 * 500;
      for (const gem of g.gems.active) {
        const d2 = (gem.x - p.x) ** 2 + (gem.y - p.y) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestGem = gem;
        }
      }
      const target = bestGem ?? (nearestD > 90 ? nearest : null);
      if (target) {
        fx = target.x - p.x;
        fy = target.y - p.y;
      }
    }
    const len = Math.hypot(fx, fy);
    p.moveX = len > 1e-6 ? fx / len : 0;
    p.moveY = len > 1e-6 ? fy / len : 0;

    // 能力トリガー(AbilitySystem.update は本フレームの後段で呼ばれるため、
    // ここで立てた入力エミュレーションは同フレーム内で消費される)
    // 迅移: 近傍80px以内の敵が4体以上 → 上で決めた離脱方向へ発動
    this.botWantsDash = abil.jinIState === 'ready' && closeCount >= AUTOPILOT_DASH_CLUSTER_COUNT;
    // 金剛身: 予備動作中の敵が120px以内 → 発動し、居続ける限り保持
    this.botWantsGuard = telegraphNearby;
  }
}
