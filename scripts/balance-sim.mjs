#!/usr/bin/env node
/**
 * バランス計測: 自動操縦ボット+4倍速でフルランを実行し、状態を定期サンプリングする。
 * 手順・結果の読み方は docs/05_balance_notes.md 参照。
 * usage: node scripts/balance-sim.mjs <charIndex 1-3>  (要: dev サーバ http://localhost:5199)
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const charKey = process.argv[2] ?? '1';
const chromiumPath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
if (!existsSync(chromiumPath)) {
  console.error(`Chromium が見つからない: ${chromiumPath}(CHROMIUM_PATH で指定可)`);
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: chromiumPath });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('Space');
await page.waitForTimeout(500);
await page.keyboard.press(charKey);
await page.waitForTimeout(500);
await page.keyboard.press('p'); // 自動操縦
await page.keyboard.press('t'); // 4倍速

const samples = [];
let lastState = null;
let nullStreak = 0;
const start = Date.now();
// 実時間 320 秒上限(ゲーム内 ~21 分ぶん)
while (Date.now() - start < 320000) {
  await page.keyboard.press('1'); // レベルアップ 3 択が開いていれば選択(ポーズ解除)
  const state = await page.evaluate(() => {
    const g = window.__game;
    if (!g || !g.scene.isActive()) return null;
    return {
      t: Math.round(g.runTime),
      lv: g.level,
      kills: g.kills,
      hp: Math.round(g.player.health.hp),
      utsushi: Math.round(g.player.health.utsushi),
      enemies: g.enemies.activeCount,
      gems: g.gems.activeCount,
    };
  });
  if (state) {
    nullStreak = 0;
    lastState = state;
    if (samples.length === 0 || state.t - samples[samples.length - 1].t >= 60) samples.push(state);
  } else if (lastState) {
    // レベルアップでの一時停止と Result 遷移を区別(連続 null のみ終了扱い)
    nullStreak++;
    if (nullStreak >= 4) break;
  }
  await page.waitForTimeout(700);
}

const outcome = lastState && nullStreak >= 4 ? 'ENDED' : 'TIMEOUT';
console.log(JSON.stringify({ char: charKey, samples, last: lastState, outcome, errors }, null, 1));
await browser.close();
