/** レベルアップ 3 択の抽選(docs/03 §1.4)。Phaser 非依存の純ロジック */

export interface DrawableUpgrade {
  id: string;
  maxTakes: number;
}

/**
 * 取得回数が上限未満かつ isAvailable な強化から、重複なしで count 件を抽選する。
 * 候補が count 未満ならある分だけ返す(0 件もあり得る)。
 */
export function drawUpgrades<T extends DrawableUpgrade>(
  pool: readonly T[],
  takes: Record<string, number>,
  rand: () => number,
  count = 3,
  isAvailable: (u: T) => boolean = () => true,
): T[] {
  const arr = pool.filter((u) => (takes[u.id] ?? 0) < u.maxTakes && isAvailable(u));
  const n = Math.min(count, arr.length);
  // 部分 Fisher-Yates で先頭 n 件をランダム化
  for (let i = 0; i < n; i++) {
    // rand は [0,1) 前提だが、境界値でも配列外に出ないようクランプ
    const j = i + Math.min(arr.length - i - 1, Math.floor(rand() * (arr.length - i)));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}
