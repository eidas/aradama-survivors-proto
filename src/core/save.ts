/** localStorage セーブ(docs/04 §11)。スキーマ変更時はキーの v を上げて読み捨てる */

const KEY = 'aradama-survivors/v1';

export interface BestRecord {
  victory: boolean;
  timeSec: number;
  kills: number;
  level: number;
}

export interface SaveData {
  best: BestRecord | null;
  settings: {
    muted: boolean;
    /** 敵ヒット時のダメージ数字ポップ表示(docs/03 §8: 情報量が多いため既定 OFF) */
    damageNumbers: boolean;
  };
}

const DEFAULTS: SaveData = { best: null, settings: { muted: false, damageNumbers: false } };

/** 新しいランがベスト記録を上回るか。勝利 > 生存時間 の優先順で比較する */
export function isBetterRun(candidate: BestRecord, best: BestRecord | null): boolean {
  if (!best) return true;
  if (candidate.victory !== best.victory) return candidate.victory;
  return candidate.timeSec > best.timeSec;
}

export function loadSave(): SaveData {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      // 旧スキーマとのマージ(欠けたフィールドはデフォルトで補完)
      return {
        best: parsed.best ?? null,
        settings: { ...DEFAULTS.settings, ...parsed.settings },
      };
    }
  } catch {
    // 破損・パース不能は初期化扱い
  }
  return structuredClone(DEFAULTS);
}

/** 設定のみ更新して保存 */
export function updateSettings(patch: Partial<SaveData['settings']>): SaveData['settings'] {
  const data = loadSave();
  data.settings = { ...data.settings, ...patch };
  storeSave(data);
  return data.settings;
}

export function storeSave(data: SaveData): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
  } catch {
    // プライベートモード等で保存不可でもゲームは継続
  }
}

/** ラン終了時に呼ぶ。ベスト更新なら保存して true を返す */
export function recordRun(run: BestRecord): boolean {
  const data = loadSave();
  if (!isBetterRun(run, data.best)) return false;
  data.best = run;
  storeSave(data);
  return true;
}
