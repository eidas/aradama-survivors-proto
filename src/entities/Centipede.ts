import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from './Enemy';
import { ENEMIES } from '../data/enemies';
import { timeScale } from '../core/combat';

interface Part {
  e: Enemy;
  gen: number;
}

const PART_COUNT = 12; // 頭 + 節 11(docs/03: 節×12)

/**
 * E5 百足型中ボスの制御(docs/04 §8)。
 * 頭が蛇行追尾し、節は 1 つ前のセグメントを一定間隔で追従する。
 * 節は個別破壊可、頭の破壊で即全滅。生存節が半数以下で速度 ×1.3。
 */
export class CentipedeController {
  private parts: Part[] = [];
  private weaveT = 0;
  alive = false;
  /** 撃破済みフラグ(強化ボーナス付与の一回性を保証) */
  private defeated = false;

  spawn(game: GameScene): void {
    const p = game.player;
    const angle = game.rng.next() * Math.PI * 2;
    const dist = 600;
    const scale = timeScale(game.runTime);
    const gap = ENEMIES.centipedeHead.aiParams.segmentGap;

    for (let i = 0; i < PART_COUNT; i++) {
      const enemy = game.enemies.acquire();
      if (!enemy) break;
      const def = i === 0 ? ENEMIES.centipedeHead : ENEMIES.centipedeSeg;
      enemy.spawn(
        def,
        p.x + Math.cos(angle) * (dist + i * gap),
        p.y + Math.sin(angle) * (dist + i * gap),
        scale,
      );
      this.parts.push({ e: enemy, gen: enemy.generation });
    }
    this.alive = this.parts.length > 0;
  }

  /** part がまだこの百足のセグメントとして生きているか(プール再利用対策で世代照合) */
  private isLive(p: Part): boolean {
    return p.e.active && p.e.generation === p.gen;
  }

  /** 頭が撃破された: 残りの節も即撃破(隠世との繋がりが断たれる)。GameScene.killEnemy から呼ばれる */
  onHeadKilled(game: GameScene): void {
    for (const p of this.parts) {
      if (this.isLive(p) && p.e.def.id === 'centipedeSeg') game.killEnemy(p.e);
    }
  }

  update(dt: number, game: GameScene): void {
    if (!this.alive) return;
    this.parts = this.parts.filter((p) => this.isLive(p));

    if (this.parts.length === 0 || this.parts[0].e.def.id !== 'centipedeHead') {
      // 全滅(頭撃破 or 節の削り切り)。強化ピック 1 回ボーナス(docs/03 §5.1)
      this.alive = false;
      if (!this.defeated) {
        this.defeated = true;
        game.grantBonusChoice();
      }
      return;
    }

    const head = this.parts[0].e;
    const prm = ENEMIES.centipedeHead.aiParams;
    const speedMul = this.parts.length <= PART_COUNT / 2 ? 1.3 : 1;

    // 頭: プレイヤー方向 + 蛇行オフセット
    this.weaveT += dt;
    const player = game.player;
    const base = Math.atan2(player.y - head.y, player.x - head.x);
    const angle = base + Math.sin(this.weaveT * prm.weaveFreq) * prm.weaveAmp;
    head.x += Math.cos(angle) * head.speed * speedMul * dt;
    head.y += Math.sin(angle) * head.speed * speedMul * dt;

    // 節: 前のセグメントへ一定間隔で追従
    for (let i = 1; i < this.parts.length; i++) {
      const prev = this.parts[i - 1].e;
      const seg = this.parts[i].e;
      const dx = prev.x - seg.x;
      const dy = prev.y - seg.y;
      const d = Math.hypot(dx, dy);
      if (d > prm.segmentGap) {
        const move = d - prm.segmentGap;
        seg.x += (dx / d) * move;
        seg.y += (dy / d) * move;
      }
    }
  }
}
