#!/usr/bin/env node
/**
 * 一括検証: 型チェック → テスト → ビルド → 実機スモーク(ヘッドレスブラウザ)。
 * 自律開発ループの Gate 1 判定に使う。すべて成功で exit 0、失敗で exit 1。
 * スモークはブラウザが見つからない環境では SKIP(--require-smoke で必須化)。
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const requireSmoke = process.argv.includes('--require-smoke');
const results = [];

function step(name, cmd, args) {
  const start = Date.now();
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  const ok = r.status === 0;
  results.push({ name, ok, sec: ((Date.now() - start) / 1000).toFixed(1) });
  console.log(`${ok ? '✅' : '❌'} ${name} (${results.at(-1).sec}s)`);
  if (!ok) {
    console.log((r.stdout + r.stderr).split('\n').slice(-30).join('\n'));
  }
  return ok;
}

async function smoke() {
  const chromiumPath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    return { skipped: 'playwright-core 未インストール' };
  }
  if (!existsSync(chromiumPath)) return { skipped: `Chromium が見つからない (${chromiumPath})` };

  const port = 5199;
  const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    stdio: 'ignore',
    detached: false,
  });
  try {
    // サーバ起動待ち(最大 20 秒)
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      await new Promise((r) => setTimeout(r, 500));
      up = await fetch(`http://localhost:${port}/`).then((r) => r.ok).catch(() => false);
    }
    if (!up) return { ok: false, error: 'dev サーバが起動しない' };

    const browser = await chromium.launch({ executablePath: chromiumPath });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));

      await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1200);
      await page.keyboard.press('Space'); // タイトル → キャラ選択
      await page.waitForTimeout(600);
      await page.keyboard.press('1'); // 可奈美で出撃
      await page.waitForTimeout(1000);
      const fpsBase = await page.evaluate(() => window.__game?.game.loop.actualFps ?? 0);
      await page.keyboard.press('o'); // ストレス: 蟲300体
      // 撃破の発生をポーリング待ち(固定待ちだと環境負荷で撃破数が閾値を割るフレークがあるため)。
      // 最大 15 秒。レベルアップ 3 択が開いたら閉じながら待つ
      let state = null;
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        await page.keyboard.press('1'); // 3 択が開いていれば選択(ポーズ解除)、開いていなければ無害
        state = await page.evaluate(() => {
          const g = window.__game;
          if (!g) return null;
          return {
            kills: g.kills,
            enemies: g.enemies.activeCount,
            fps: Math.round(g.game.loop.actualFps),
            running: g.scene.isActive(),
          };
        });
        if (errors.length > 0) return { ok: false, error: `pageerror: ${errors[0]}` };
        if (state && state.kills >= 10) break;
        await page.waitForTimeout(500);
      }

      if (!state) return { ok: false, error: 'GameScene に到達できない(__game 未公開)' };
      if (state.kills < 10) return { ok: false, error: `撃破が発生しない (kills=${state.kills}, 15秒待機後)`, state };
      return { ok: true, fpsBase: Math.round(fpsBase), ...state };
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
}

let allOk = true;
allOk = step('型チェック (tsc)', 'npx', ['tsc', '--noEmit']) && allOk;
allOk = step('テスト (vitest)', 'npx', ['vitest', 'run']) && allOk;
allOk = step('ビルド (vite build)', 'npx', ['vite', 'build']) && allOk;

const start = Date.now();
const s = await smoke().catch((e) => ({ ok: false, error: String(e) }));
const sec = ((Date.now() - start) / 1000).toFixed(1);
if (s.skipped) {
  console.log(`⏭️ スモーク SKIP: ${s.skipped}`);
  if (requireSmoke) allOk = false;
} else if (s.ok) {
  console.log(`✅ スモーク (${sec}s) 撃破=${s.kills} 敵=${s.enemies} fps=${s.fpsBase}→${s.fps}`);
} else {
  console.log(`❌ スモーク (${sec}s): ${s.error}`);
  allOk = false;
}

console.log(allOk ? '\nVERIFY: PASS' : '\nVERIFY: FAIL');
process.exit(allOk ? 0 : 1);
