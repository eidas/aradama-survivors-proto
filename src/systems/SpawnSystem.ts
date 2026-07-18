import type { GameScene } from '../scenes/GameScene';
import { ENEMIES } from '../data/enemies';
import { spawnRatePerSec, pickEnemyId, WAVE_EVENTS } from '../data/waves';
import { timeScale } from '../core/combat';

/** ウェーブテーブルに従う敵湧きと、時刻指定イベント(群れ突進・大包囲)の発火 */
export class SpawnSystem {
  private acc = 0;
  private nextEventIdx = 0;

  constructor(private game: GameScene) {}

  update(dt: number): void {
    const g = this.game;

    this.acc += spawnRatePerSec(g.runTime) * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.spawnOne();
    }

    while (this.nextEventIdx < WAVE_EVENTS.length && g.runTime >= WAVE_EVENTS[this.nextEventIdx].at) {
      this.fireEvent(WAVE_EVENTS[this.nextEventIdx].type);
      this.nextEventIdx++;
    }
  }

  private fireEvent(type: 'deerRush' | 'encircle'): void {
    const g = this.game;
    if (type === 'deerRush') {
      // 6:00 鹿型 8 体が同時に取り囲んで突進してくる
      this.spawnRing('deer', 8, 500, 600);
    } else {
      // 13:00 蟲型の大包囲: 外周から円環湧き
      this.spawnRing('insect', 40, 550, 700);
    }
    g.cameras.main.shake(300, 0.003); // イベント発生の合図
  }

  private spawnRing(enemyId: string, count: number, minDist: number, maxDist: number): void {
    const g = this.game;
    const def = ENEMIES[enemyId];
    const baseAngle = g.rng.next() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const enemy = g.enemies.acquire();
      if (!enemy) return;
      const angle = baseAngle + (i / count) * Math.PI * 2;
      const dist = g.rng.range(minDist, maxDist);
      enemy.spawn(
        def,
        g.player.x + Math.cos(angle) * dist,
        g.player.y + Math.sin(angle) * dist,
        timeScale(g.runTime),
      );
    }
  }

  private spawnOne(): void {
    const g = this.game;
    const def = ENEMIES[pickEnemyId(g.runTime, g.rng.next())];
    const enemy = g.enemies.acquire();
    if (!enemy) return; // プール上限。単純に湧きをスキップ

    const cam = g.cameras.main;
    const margin = g.rng.range(80, 160);
    const w = cam.worldView.width + margin * 2;
    const h = cam.worldView.height + margin * 2;
    // 外周の帯から一様に選ぶ(周長比で辺を抽選)
    const edge = g.rng.next() * (w * 2 + h * 2);
    let x: number;
    let y: number;
    if (edge < w) {
      x = cam.worldView.x - margin + edge;
      y = cam.worldView.y - margin;
    } else if (edge < w * 2) {
      x = cam.worldView.x - margin + (edge - w);
      y = cam.worldView.bottom + margin;
    } else if (edge < w * 2 + h) {
      x = cam.worldView.x - margin;
      y = cam.worldView.y - margin + (edge - w * 2);
    } else {
      x = cam.worldView.right + margin;
      y = cam.worldView.y - margin + (edge - w * 2 - h);
    }
    enemy.spawn(def, x, y, timeScale(g.runTime));
  }

  /** デバッグ: 周囲リングに n 体即湧き(性能ストレステスト用) */
  stressSpawn(n: number): void {
    const g = this.game;
    const def = ENEMIES.insect;
    for (let i = 0; i < n; i++) {
      const enemy = g.enemies.acquire();
      if (!enemy) return;
      const angle = (i / n) * Math.PI * 2;
      const dist = g.rng.range(400, 900);
      enemy.spawn(
        def,
        g.player.x + Math.cos(angle) * dist,
        g.player.y + Math.sin(angle) * dist,
        timeScale(g.runTime),
      );
    }
  }
}
