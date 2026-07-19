import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../entities/Enemy';
import { timeScale } from '../core/combat';
import { applyPlayerDamage } from '../core/health';
import { ENEMIES } from '../data/enemies';
import { moveToward } from './enemyAiUtils';

/**
 * E6 大型集合体(docs/03 §5.2)専用の AI。EnemySystem から `ai === 'boss'` の
 * 個体についてのみ委譲される。フェーズ制:
 * 0=Seek → (抽選) 1=SweepTelegraph → 2=ChargeTelegraph → 3=Charging → 4=Absorb → 5=Recover
 * 吐き出し(蟲 6 体)は Seek 中の抽選で即時実行。
 */
export class BossBehavior {
  constructor(private game: GameScene) {}

  /** 鍔迫り: ボスの予備動作を打ち消してリカバリ状態へ落とす */
  cancelTelegraph(e: Enemy): void {
    e.telegraphing = false;
    e.aiState = 5; // Recover
    e.aiTimer = 1.0;
  }

  update(e: Enemy, dt: number): void {
    const g = this.game;
    const p = g.player;
    const prm = e.def.aiParams;

    if (e.aiState === 0) {
      // Seek: 低速追尾しつつ次の行動を抽選
      moveToward(e, p.x, p.y, e.speed, dt);
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
}
