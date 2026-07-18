import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { regenAradamaHp, timeScale } from '../core/combat';
import { applyPlayerDamage } from '../core/health';
import { ENEMIES } from '../data/enemies';

/**
 * 敵の AI(docs/04 §8)・移動・自動再生・プレイヤーへの接触ダメージ。
 * ステートは Enemy.aiState(数値)+ aiTimer で管理する。
 */
export class EnemySystem {
  private queryBuf: Enemy[] = [];

  constructor(private game: GameScene) {}

  update(dt: number): void {
    const g = this.game;
    g.enemyHash.clear();

    for (const e of g.enemies.active) {
      switch (e.def.ai) {
        case 'chase':
          this.updateChase(e, dt);
          break;
        case 'orbitDive':
          this.updateOrbitDive(e, dt);
          break;
        case 'charge':
          this.updateCharge(e, dt);
          break;
        case 'tank':
          this.updateTank(e, dt);
          break;
        case 'centipede':
          break; // 移動は CentipedeController が管轄
        case 'boss':
          this.updateBoss(e, dt);
          break;
      }

      e.hp = regenAradamaHp(e.hp, e.maxHp, g.runTime - e.lastHitAt, dt);
      if (e.flashTimer > 0) e.flashTimer -= dt;

      g.enemyHash.insert(e, e.x, e.y, e.radius);
      e.syncSprite();
    }
  }

  /** 鍔迫り: 予備動作を打ち消してリカバリ状態へ落とす(突進・薙ぎ払いのみ対象) */
  cancelTelegraph(e: Enemy): void {
    if (!e.telegraphing) return;
    if (e.def.ai === 'charge') {
      e.telegraphing = false;
      e.aiState = 3; // Stun
      e.aiTimer = e.def.aiParams.stun;
    } else if (e.def.ai === 'tank') {
      e.telegraphing = false;
      e.aiState = 2; // Recover
      e.aiTimer = e.def.aiParams.recover;
    } else if (e.def.ai === 'boss') {
      e.telegraphing = false;
      e.aiState = 5; // Recover
      e.aiTimer = 1.0;
    }
  }

  private moveToward(e: Enemy, tx: number, ty: number, speed: number, dt: number): void {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const step = Math.min(speed * dt, dist);
      e.x += (dx / dist) * step;
      e.y += (dy / dist) * step;
    }
  }

  /** E1 蟲型: 直線追尾のみ */
  private updateChase(e: Enemy, dt: number): void {
    const p = this.game.player;
    this.moveToward(e, p.x, p.y, e.speed, dt);
  }

  /** E2 鳥型: Orbit(周回) → Telegraph → Dive(直線急降下) → Orbit */
  private updateOrbitDive(e: Enemy, dt: number): void {
    const g = this.game;
    const p = g.player;
    const prm = e.def.aiParams;

    if (e.aiState === 0) {
      // Orbit: プレイヤー周囲を回りつつ、次の急降下タイマーを消化
      if (e.aiTimer <= 0) {
        e.aiTimer = g.rng.range(prm.diveIntervalMin, prm.diveIntervalMax);
        e.orbitAngle = Math.atan2(e.y - p.y, e.x - p.x);
      }
      e.aiTimer -= dt;
      e.orbitAngle += (e.speed / prm.orbitRadius) * dt;
      const tx = p.x + Math.cos(e.orbitAngle) * prm.orbitRadius;
      const ty = p.y + Math.sin(e.orbitAngle) * prm.orbitRadius;
      this.moveToward(e, tx, ty, e.speed * 1.5, dt);
      if (e.aiTimer <= 0) {
        e.aiState = 1;
        e.aiTimer = prm.telegraph;
      }
    } else if (e.aiState === 1) {
      // Telegraph: 静止して狙いを定める(鳥は鍔迫りの対象外なので telegraphing は立てない)
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        e.dirX = (p.x - e.x) / d;
        e.dirY = (p.y - e.y) / d;
        e.aiState = 2;
        e.aiTimer = prm.diveDuration;
      }
    } else {
      // Dive
      e.aiTimer -= dt;
      e.x += e.dirX * e.speed * prm.diveSpeedMul * dt;
      e.y += e.dirY * e.speed * prm.diveSpeedMul * dt;
      if (e.aiTimer <= 0) {
        e.aiState = 0;
        e.aiTimer = 0; // Orbit 側で再抽選
      }
    }
  }

  /** E3 鹿型: Approach → Telegraph(1.0s 明滅) → Charge(直線突進) → Stun */
  private updateCharge(e: Enemy, dt: number): void {
    const p = this.game.player;
    const prm = e.def.aiParams;

    if (e.aiState === 0) {
      this.moveToward(e, p.x, p.y, e.speed, dt);
      if (Math.hypot(p.x - e.x, p.y - e.y) < prm.detectRange) {
        e.aiState = 1;
        e.aiTimer = prm.telegraph;
        e.telegraphing = true;
      }
    } else if (e.aiState === 1) {
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        e.dirX = (p.x - e.x) / d;
        e.dirY = (p.y - e.y) / d;
        e.telegraphing = false;
        e.aiState = 2;
        e.aiTimer = prm.chargeDuration;
      }
    } else if (e.aiState === 2) {
      e.aiTimer -= dt;
      e.x += e.dirX * prm.chargeSpeed * dt;
      e.y += e.dirY * prm.chargeSpeed * dt;
      if (e.aiTimer <= 0) {
        e.aiState = 3;
        e.aiTimer = prm.stun;
      }
    } else {
      // Stun: 硬直
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) e.aiState = 0;
    }
  }

  /** E4 熊型: Seek → Windup(0.8s) → Sweep(範囲攻撃) → Recover */
  private updateTank(e: Enemy, dt: number): void {
    const g = this.game;
    const p = g.player;
    const prm = e.def.aiParams;

    if (e.aiState === 0) {
      this.moveToward(e, p.x, p.y, e.speed, dt);
      if (Math.hypot(p.x - e.x, p.y - e.y) < prm.attackRange) {
        e.aiState = 1;
        e.aiTimer = prm.windup;
        e.telegraphing = true;
      }
    } else if (e.aiState === 1) {
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        e.telegraphing = false;
        // Sweep: 範囲内なら被弾処理(通常の接触無敵と同じパイプラインを通す)
        if (
          !p.cheatInvincible &&
          !p.dashing &&
          Math.hypot(p.x - e.x, p.y - e.y) <= prm.sweepRange + p.radius
        ) {
          const result = applyPlayerDamage(p.health, e.contactDamage, p.guarding);
          if (result === 'dead') {
            g.endRun(false);
            return;
          }
          if (result === 'hit') g.events.emit('player-hit');
          if (result === 'guarded') g.onGuarded();
        }
        e.aiState = 2;
        e.aiTimer = prm.recover;
      }
    } else {
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) e.aiState = 0;
    }
  }

  /**
   * E6 大型集合体(docs/03 §5.2)。フェーズ制:
   * 0=Seek → (抽選) 1=SweepTelegraph → 2=ChargeTelegraph → 3=Charging → 4=Absorb → 5=Recover
   * 吐き出し(蟲 6 体)は Seek 中の抽選で即時実行。
   */
  private updateBoss(e: Enemy, dt: number): void {
    const g = this.game;
    const p = g.player;
    const prm = e.def.aiParams;

    if (e.aiState === 0) {
      // Seek: 低速追尾しつつ次の行動を抽選
      this.moveToward(e, p.x, p.y, e.speed, dt);
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        const dist = Math.hypot(p.x - e.x, p.y - e.y);
        if (dist < e.radius + prm.sweepRange * 0.8) {
          e.aiState = 1;
          e.aiTimer = prm.sweepTelegraph;
          e.telegraphing = true;
        } else {
          const r = g.rng.next();
          if (r < 0.4) {
            e.aiState = 2;
            e.aiTimer = prm.chargeTelegraph;
            e.telegraphing = true;
          } else if (r < 0.75) {
            e.aiState = 4;
            e.aiTimer = prm.absorbDuration;
          } else {
            this.bossSpit(e);
            e.aiTimer = prm.actionInterval;
          }
        }
      }
    } else if (e.aiState === 1) {
      // Sweep telegraph → 範囲攻撃
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        e.telegraphing = false;
        if (
          !p.cheatInvincible &&
          !p.dashing &&
          Math.hypot(p.x - e.x, p.y - e.y) <= e.radius + prm.sweepRange + p.radius
        ) {
          const result = applyPlayerDamage(p.health, e.contactDamage, p.guarding);
          if (result === 'dead') {
            g.endRun(false);
            return;
          }
          if (result === 'hit') g.events.emit('player-hit');
          if (result === 'guarded') g.onGuarded();
        }
        g.showRing(e.x, e.y, e.radius + prm.sweepRange);
        e.aiState = 5;
        e.aiTimer = prm.recover;
      }
    } else if (e.aiState === 2) {
      // Charge telegraph(コア発光)
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        e.dirX = (p.x - e.x) / d;
        e.dirY = (p.y - e.y) / d;
        e.telegraphing = false;
        e.aiState = 3;
        e.aiTimer = prm.chargeDuration;
      }
    } else if (e.aiState === 3) {
      e.aiTimer -= dt;
      e.x += e.dirX * prm.chargeSpeed * dt;
      e.y += e.dirY * prm.chargeSpeed * dt;
      if (e.aiTimer <= 0) {
        e.aiState = 5;
        e.aiTimer = prm.recover;
      }
    } else if (e.aiState === 4) {
      // Absorb: 周囲のノロジェム・蟲型を引き寄せて吸収し、回復+巨大化
      e.aiTimer -= dt;
      this.bossAbsorb(e, dt);
      if (e.aiTimer <= 0) {
        e.aiState = 5;
        e.aiTimer = 0.5;
      }
    } else {
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        e.aiState = 0;
        e.aiTimer = prm.actionInterval;
      }
    }
  }

  /** 吐き出し: 蟲型 6 体を周囲に生成 */
  private bossSpit(e: Enemy): void {
    const g = this.game;
    for (let i = 0; i < 6; i++) {
      const minion = g.enemies.acquire();
      if (!minion) return;
      const angle = (i / 6) * Math.PI * 2;
      minion.spawn(
        ENEMIES.insect,
        e.x + Math.cos(angle) * (e.radius + 24),
        e.y + Math.sin(angle) * (e.radius + 24),
        timeScale(g.runTime),
      );
    }
  }

  /** 吸収: ジェムと蟲型を引き寄せ、届いたら HP 回復+半径拡大(プレイヤーとの回収競争になる) */
  private bossAbsorb(e: Enemy, dt: number): void {
    const g = this.game;
    const prm = e.def.aiParams;
    const pull = 220 * dt;

    for (let i = g.gems.active.length - 1; i >= 0; i--) {
      const gem = g.gems.active[i];
      if (gem.magnetized) continue; // プレイヤーへの吸引が始まったジェムは奪えない
      const dx = e.x - gem.x;
      const dy = e.y - gem.y;
      const d = Math.hypot(dx, dy);
      if (d > prm.absorbRange) continue;
      if (d <= e.radius) {
        e.hp = Math.min(e.maxHp, e.hp + gem.value * 2);
        e.radius = Math.min(prm.maxRadius, e.radius + 0.5);
        gem.despawn();
        g.gems.release(gem);
      } else {
        gem.x += (dx / d) * pull;
        gem.y += (dy / d) * pull;
        gem.syncSprite();
      }
    }

    for (let i = g.enemies.active.length - 1; i >= 0; i--) {
      const other = g.enemies.active[i];
      if (other.def.id !== 'insect') continue;
      const dx = e.x - other.x;
      const dy = e.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d > prm.absorbRange) continue;
      if (d <= e.radius + other.radius) {
        e.hp = Math.min(e.maxHp, e.hp + 30);
        e.radius = Math.min(prm.maxRadius, e.radius + 1);
        other.despawn();
        g.enemies.release(other); // 吸収は撃破扱いにしない(ノロも落ちない)
      } else {
        other.x += (dx / d) * pull;
        other.y += (dy / d) * pull;
      }
    }
  }

  /** プレイヤーとの接触判定。攻撃解決の後に呼ぶ。迅移中はすり抜け */
  contact(): void {
    const g = this.game;
    const p = g.player;
    if (p.cheatInvincible || p.dashing) return;

    const candidates = g.enemyHash.queryCircle(p.x, p.y, p.radius + 20, this.queryBuf);
    for (const e of candidates) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy <= (e.radius + p.radius) ** 2) {
        const result = applyPlayerDamage(p.health, e.contactDamage, p.guarding);
        if (result === 'dead') {
          g.endRun(false);
          return;
        }
        if (result === 'hit') g.events.emit('player-hit');
        if (result === 'guarded') g.onGuarded();
      }
    }
  }
}
