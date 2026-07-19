import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import {
  JINI_LEVELS,
  JINI_SLASH_POWER_MUL,
  KONGOUSHIN_LEVELS,
  KONGOUSHIN_LOCKOUT,
  computeChargeStage,
} from '../data/abilities';
import { audio } from '../core/audio';

type JinIState = 'ready' | 'active' | 'cooldown';
type KongoushinState = 'ready' | 'guarding' | 'lockout';

/** 迅移の残像トレイルの配置間隔(px)。時間ベースだと Lv3(15.625倍速)で間隔がスカスカになるため距離ベース(docs/03 §8) */
const JINI_TRAIL_SPACING = 40;

/**
 * 隠世の力の状態遷移(docs/04 §7.1)。
 *   迅移:   Ready → Active(duration) → Cooldown → Ready
 *   金剛身: Ready ⇄ Guarding(ゲージ消費) → (枯渇時) Lockout(2s) → Ready
 *   八幡力: Idle → Charging(段階0..cap) → Release → Idle
 * 排他: 金剛身中は移動・攻撃・迅移禁止。迅移中は金剛身不可(八幡力の溜めは維持)。
 */
export class AbilitySystem {
  // 迅移
  jinIState: JinIState = 'ready';
  jinITimer = 0;
  private dashDirX = 1;
  private dashDirY = 0;
  private dashHit = new Set<Enemy>();
  /** 直前に残像を置いてから移動した距離の累積(px) */
  private trailAccum = 0;

  // 金剛身
  kongoushinState: KongoushinState = 'ready';
  kongoushinGauge: number;
  kongoushinTimer = 0;

  // 八幡力
  chargeTime = 0;

  private queryBuf: Enemy[] = [];

  constructor(private game: GameScene) {
    this.kongoushinGauge = this.kongoushinLevel.gauge;
  }

  get jinILevel() {
    return JINI_LEVELS[this.game.player.abilityLevels.jinI - 1];
  }
  get kongoushinLevel() {
    return KONGOUSHIN_LEVELS[this.game.player.abilityLevels.kongoushin - 1];
  }
  /** 迅移クールダウンの進捗(1 = 使用可能)。HUD 用 */
  get jinIReadyRatio(): number {
    if (this.jinIState === 'ready') return 1;
    if (this.jinIState === 'active') return 0;
    return 1 - this.jinITimer / this.jinILevel.cooldown;
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    const input = g.inputSystem;

    if (p.zanshinTimer > 0) p.zanshinTimer -= dt;

    this.updateKongoushin(dt, input.guardHeld);
    this.updateJinI(dt, input.dashJustPressed());
    this.updateHachimanriki(dt, input.chargeHeld);
  }

  // ── 金剛身 ──
  private updateKongoushin(dt: number, held: boolean): void {
    const p = this.game.player;
    const lv = this.kongoushinLevel;
    const regen = lv.regen * (p.mods.kongouYoin ? 1.5 : 1);

    if (this.kongoushinState === 'guarding') {
      this.kongoushinGauge -= dt;
      if (!held || this.kongoushinGauge <= 0) {
        // 解除(枯渇なら強制解除+ロックアウト)
        this.releaseKongoushin();
        if (this.kongoushinGauge <= 0) {
          this.kongoushinGauge = 0;
          this.kongoushinState = 'lockout';
          this.kongoushinTimer = KONGOUSHIN_LOCKOUT;
        } else {
          this.kongoushinState = 'ready';
        }
      }
    } else {
      this.kongoushinGauge = Math.min(lv.gauge, this.kongoushinGauge + regen * dt);
      if (this.kongoushinState === 'lockout') {
        this.kongoushinTimer -= dt;
        if (this.kongoushinTimer <= 0) this.kongoushinState = 'ready';
      } else if (held && !p.dashing && this.kongoushinGauge > 0.2) {
        this.kongoushinState = 'guarding';
        this.chargeTime = 0; // 金剛身中は攻撃停止 → 溜めもリセット
        audio.guardOn();
      }
    }
    p.guarding = this.kongoushinState === 'guarding';
  }

  /** 金剛身の解除時反撃(Lv2: ノックバック、Lv3: +衝撃波ダメージ) */
  private releaseKongoushin(): void {
    const g = this.game;
    const p = g.player;
    const lv = this.kongoushinLevel;
    if (lv.knockbackRadius <= 0) return;
    audio.shockwave();

    const candidates = g.enemyHash.queryCircle(p.x, p.y, lv.knockbackRadius + 20, this.queryBuf);
    for (const e of candidates) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > lv.knockbackRadius + e.radius || dist < 1e-6) continue;
      e.x += (dx / dist) * 60;
      e.y += (dy / dist) * 60;
      if (lv.shockwaveMul > 0) {
        g.playerSystem.damageEnemy(e, p.attackPower * lv.shockwaveMul);
      }
    }
    g.showRing(p.x, p.y, lv.knockbackRadius);
  }

  // ── 迅移 ──
  private updateJinI(dt: number, justPressed: boolean): void {
    const g = this.game;
    const p = g.player;
    const lv = this.jinILevel;

    if (this.jinIState === 'ready') {
      if (justPressed && !p.guarding) {
        this.jinIState = 'active';
        this.jinITimer = lv.duration;
        this.dashHit.clear();
        this.trailAccum = 0;
        audio.dash();
        // 発動方向: 入力方向、なければ向いている方向
        if (p.moveX !== 0 || p.moveY !== 0) {
          this.dashDirX = p.moveX;
          this.dashDirY = p.moveY;
        } else {
          this.dashDirX = Math.cos(p.aimAngle);
          this.dashDirY = Math.sin(p.aimAngle);
        }
      }
    } else if (this.jinIState === 'active') {
      this.jinITimer -= dt;
      const speed = p.moveSpeed * lv.speedMul;
      const prevX = p.x;
      const prevY = p.y;
      p.x += this.dashDirX * speed * dt;
      p.y += this.dashDirY * speed * dt;
      this.sweepSlash(prevX, prevY, p.x, p.y);
      this.emitTrail(prevX, prevY, p.x, p.y);
      if (this.jinITimer <= 0) {
        this.jinIState = 'cooldown';
        this.jinITimer = lv.cooldown;
        if (p.mods.jinIZanshin) p.zanshinTimer = 1.0;
      }
    } else {
      this.jinITimer -= dt;
      if (this.jinITimer <= 0) this.jinIState = 'ready';
    }
    p.dashing = this.jinIState === 'active';
  }

  /**
   * 駆け抜け斬り: 移動線分の近傍にいる敵を 1 回ずつ斬る(ゲームアレンジ)。
   * 迅移 Lv3 は 1 フレームで数十 px 進むため、線分をサンプリングして掃引判定する(docs/04 §4.2)。
   */
  private sweepSlash(x0: number, y0: number, x1: number, y1: number): void {
    const g = this.game;
    const power = g.player.attackPower * JINI_SLASH_POWER_MUL;
    const hitRadius = 40;
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 32));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const sx = x0 + (x1 - x0) * t;
      const sy = y0 + (y1 - y0) * t;
      const candidates = g.enemyHash.queryCircle(sx, sy, hitRadius + 20, this.queryBuf);
      for (const e of candidates) {
        if (!e.active || this.dashHit.has(e)) continue;
        const dx = e.x - sx;
        const dy = e.y - sy;
        if (dx * dx + dy * dy <= (hitRadius + e.radius) ** 2) {
          this.dashHit.add(e);
          g.playerSystem.damageEnemy(e, power);
        }
      }
    }
  }

  /**
   * 迅移中の残像トレイル(docs/03 §8)。時間ベースだと Lv3(15.625倍速)で間隔がスカスカになるため、
   * 移動線分上を距離ベースで一定間隔ごとにサンプリングして配置する(1フレームで複数個置くことがある)。
   */
  private emitTrail(x0: number, y0: number, x1: number, y1: number): void {
    const segDist = Math.hypot(x1 - x0, y1 - y0);
    if (segDist <= 0) return;
    let remainStart = this.trailAccum;
    let consumed = 0;
    while (remainStart + (segDist - consumed) >= JINI_TRAIL_SPACING) {
      consumed += JINI_TRAIL_SPACING - remainStart;
      const t = consumed / segDist;
      this.game.showJinITrail(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      remainStart = 0;
    }
    this.trailAccum = remainStart + (segDist - consumed);
  }

  // ── 八幡力 ──
  private updateHachimanriki(dt: number, held: boolean): void {
    const g = this.game;
    const p = g.player;
    const maxStage = p.abilityLevels.hachimanriki;

    if (p.guarding) {
      p.charging = false;
      p.chargeStage = 0;
      this.chargeTime = 0;
      return;
    }

    if (held) {
      this.chargeTime += dt;
      p.charging = true;
      const newStage = computeChargeStage(this.chargeTime, maxStage, p.mods.chargeTimeMul);
      if (newStage > p.chargeStage) audio.chargeStage(newStage); // 段階到達音
      p.chargeStage = newStage;
    } else {
      if (p.charging && p.chargeStage > 0) {
        g.playerSystem.releaseCharge(p.chargeStage);
      }
      p.charging = false;
      p.chargeStage = 0;
      this.chargeTime = 0;
    }
  }
}
