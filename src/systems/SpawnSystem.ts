import type { GameScene } from '../scenes/GameScene';
import { ENEMIES } from '../data/enemies';
import { spawnRatePerSec, pickEnemyId } from '../data/waves';
import { timeScale } from '../core/combat';

/** ウェーブテーブルに従い、カメラ外周の帯(+80〜160px)から敵を湧かせる */
export class SpawnSystem {
  private acc = 0;

  constructor(private game: GameScene) {}

  update(dt: number): void {
    this.acc += spawnRatePerSec(this.game.runTime) * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.spawnOne();
    }
  }

  private spawnOne(): void {
    const g = this.game;
    const def = ENEMIES[pickEnemyId(g.runTime, g.rng.next())];
    const enemy = g.enemies.acquire();
    if (!enemy) return; // プール上限。M1 では単純に湧きをスキップ

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
