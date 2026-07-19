import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { inAttackFan } from '../core/combat';
import { updatePlayerHealth } from '../core/health';
import {
  DOUBLE_SLASH_DELAY,
  DOUBLE_SLASH_POWER_MUL,
  SLASH_WAVE_POWER_MUL,
  SLASH_WAVE_RANGE,
  SLASH_WAVE_SPEED,
} from '../core/mods';
import {
  HACHIMANRIKI_MOVE_MUL,
  HACHIMANRIKI_STAGES,
  HACHIMANRIKI_WAVE_RANGE,
} from '../data/abilities';
import {
  IAI_CRIT_MUL,
  IAI_WAIT_MUL,
  MITORI_BONUS_MAX,
  MITORI_BONUS_STEP,
  MITORI_PER_KILLS,
} from '../data/characters';
import { audio } from '../core/audio';

interface SlashVfx {
  sprite: Phaser.GameObjects.Image;
  life: number;
}

const SLASH_LIFETIME = 0.12;
/** 八幡力の溜め段階ごとの刀身発光(赤 → 橙 → 白) */
const CHARGE_TINT = [0xffffff, 0xff6060, 0xffa040, 0xffffe0];

/** プレイヤーの移動・オート攻撃・強化とパッシブの反映・斬撃波弾の更新 */
export class PlayerSystem {
  private slashes: SlashVfx[] = [];
  private slashCursor = 0;
  private queryBuf: Enemy[] = [];
  /** 二連斬の待ち時間(<=0 で不発) */
  private secondSlashTimer = 0;

  constructor(private game: GameScene) {
    for (let i = 0; i < 8; i++) {
      this.slashes.push({
        sprite: game.add.image(0, 0, 'slash').setVisible(false).setDepth(8),
        life: 0,
      });
    }
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;

    // 移動: 迅移中は AbilitySystem 管轄、金剛身中は移動不可、溜め中は減速
    if (!p.dashing && !p.guarding) {
      const speedMul = p.charging ? HACHIMANRIKI_MOVE_MUL : 1;
      p.x += p.moveX * p.moveSpeed * speedMul * dt;
      p.y += p.moveY * p.moveSpeed * speedMul * dt;
    }
    p.syncSprite();

    updatePlayerHealth(p.health, dt);
    this.updatePlayerVisual();

    // オート攻撃: 金剛身・溜め中は停止(タイマーも進めない)
    if (!p.guarding && !p.charging) {
      p.attackTimer -= dt;
      if (p.attackTimer <= 0) {
        p.attackTimer += p.attackInterval;
        this.attack();
      }
    }

    // 二連斬: 本命の 0.15 秒後に逆方向へ
    if (this.secondSlashTimer > 0) {
      this.secondSlashTimer -= dt;
      if (this.secondSlashTimer <= 0) {
        const angle = p.aimAngle + Math.PI;
        this.slashHit(angle, DOUBLE_SLASH_POWER_MUL, 1);
        this.showSlash(p.x, p.y, angle, p.attackRadius);
      }
    }

    this.updateProjectiles(dt);

    for (const s of this.slashes) {
      if (s.life > 0) {
        s.life -= dt;
        s.sprite.setAlpha(Math.max(0, s.life / SLASH_LIFETIME) * 0.9);
        if (s.life <= 0) s.sprite.setVisible(false);
      }
    }
  }

  /** 無敵点滅・金剛身の金色・八幡力の溜め発光 */
  private updatePlayerVisual(): void {
    const p = this.game.player;
    p.sprite.setAlpha(p.health.invincibleTimer > 0 ? 0.5 : 1);
    if (p.guarding) {
      p.sprite.setTint(0xffd700);
    } else if (p.charging && p.chargeStage > 0) {
      p.sprite.setTint(CHARGE_TINT[p.chargeStage]);
    } else {
      p.sprite.clearTint();
    }
  }

  private aimAtNearest(): void {
    const g = this.game;
    const p = g.player;
    let nearest: Enemy | null = null;
    let bestD2 = Infinity;
    for (const e of g.enemies.active) {
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = e;
      }
    }
    if (nearest) p.aimAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
  }

  private attack(): void {
    const g = this.game;
    const p = g.player;
    this.aimAtNearest();

    // 居合(姫和): 攻撃間隔の 1.5 倍以上の間合いを置いた斬撃はクリティカル
    const iaiCrit =
      p.def.passive === 'iai' && g.runTime - p.lastSlashAt >= p.attackInterval * IAI_WAIT_MUL;
    const powerMul = iaiCrit ? IAI_CRIT_MUL : 1;

    this.slashHit(p.aimAngle, powerMul, 1);
    this.showSlash(p.x, p.y, p.aimAngle, p.attackRadius);
    p.lastSlashAt = g.runTime;

    if (p.mods.doubleSlash) this.secondSlashTimer = DOUBLE_SLASH_DELAY;

    if (p.mods.slashWaveLevel > 0) {
      const proj = g.projectiles.acquire();
      if (proj) {
        proj.spawn(
          p.x,
          p.y,
          p.aimAngle,
          SLASH_WAVE_SPEED,
          p.attackPower * SLASH_WAVE_POWER_MUL,
          SLASH_WAVE_RANGE[p.mods.slashWaveLevel],
        );
      }
    }
  }

  /** 八幡力の解放(AbilitySystem から呼ばれる)。段階に応じた強化斬撃+段階3は前方衝撃波 */
  releaseCharge(stage: number): void {
    const g = this.game;
    const p = g.player;
    const s = HACHIMANRIKI_STAGES[stage - 1];
    this.aimAtNearest();

    this.slashHit(p.aimAngle, s.dmgMul, s.rangeMul);
    this.showSlash(p.x, p.y, p.aimAngle, p.attackRadius * s.rangeMul);
    p.lastSlashAt = g.runTime;
    p.attackTimer = p.attackInterval; // 解放直後の連撃は防ぐ

    if (stage >= 3) {
      const proj = g.projectiles.acquire();
      if (proj) {
        proj.spawn(p.x, p.y, p.aimAngle, SLASH_WAVE_SPEED, p.attackPower, HACHIMANRIKI_WAVE_RANGE);
      }
    }
    g.cameras.main.shake(80, 0.002 * stage);
    audio.chargeRelease(stage);
  }

  /** 扇形範囲の敵に御刀ダメージを与える */
  private slashHit(aimAngle: number, powerMul: number, rangeMul: number): void {
    const g = this.game;
    const p = g.player;
    const radius = p.attackRadius * rangeMul;
    const arcDeg = Math.min(360, p.attackArcDeg * rangeMul);
    const power = p.attackPower * powerMul;

    const candidates = g.enemyHash.queryCircle(p.x, p.y, radius + 20, this.queryBuf);
    for (const e of candidates) {
      if (!inAttackFan(p.x, p.y, aimAngle, radius, arcDeg, e.x, e.y, e.radius)) continue;
      this.damageEnemy(e, power);
    }
  }

  /** 御刀ダメージの適用(見取り稽古・鍔迫り込み)。斬撃波・駆け抜け斬りもここを通る */
  damageEnemy(e: Enemy, power: number): void {
    const g = this.game;
    const p = g.player;
    if (p.mods.tsubazeriai && e.telegraphing) g.enemySystem.cancelTelegraph(e);

    // 見取り稽古(可奈美): 同一タイプ 50 体撃破ごとに与ダメ +10%(最大 +30%)
    if (p.def.passive === 'mitori') {
      const kills = g.killsByType[e.def.id] ?? 0;
      const bonus = Math.min(MITORI_BONUS_MAX, Math.floor(kills / MITORI_PER_KILLS) * MITORI_BONUS_STEP);
      power *= 1 + bonus;
    }

    e.hp -= power;
    e.lastHitAt = g.runTime;
    e.flashTimer = 0.06;
    g.showDamageNumber(e.x, e.y, power);
    if (e.hp <= 0) g.killEnemy(e);
  }

  private updateProjectiles(dt: number): void {
    const g = this.game;
    for (let i = g.projectiles.active.length - 1; i >= 0; i--) {
      const proj = g.projectiles.active[i];
      const step = Math.hypot(proj.vx, proj.vy) * dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.remaining -= step;
      proj.syncSprite();

      const candidates = g.enemyHash.queryCircle(proj.x, proj.y, proj.radius + 20, this.queryBuf);
      for (const e of candidates) {
        if (proj.hitEnemies.has(e)) continue;
        const dx = e.x - proj.x;
        const dy = e.y - proj.y;
        if (dx * dx + dy * dy <= (proj.radius + e.radius) ** 2) {
          proj.hitEnemies.add(e);
          this.damageEnemy(e, proj.power);
        }
      }

      if (proj.remaining <= 0) {
        proj.despawn();
        g.projectiles.release(proj);
      }
    }
  }

  private showSlash(x: number, y: number, angle: number, radius: number): void {
    audio.slash();
    const s = this.slashes[this.slashCursor];
    this.slashCursor = (this.slashCursor + 1) % this.slashes.length;
    s.life = SLASH_LIFETIME;
    s.sprite
      .setPosition(x, y)
      .setRotation(angle)
      .setScale(radius / 70)
      .setAlpha(0.9)
      .setVisible(true);
  }
}
