/** 次のレベルに必要な経験値(docs/03 §1.4): next(level) = 10 + 8(level-1) + level² */
export function xpForNext(level: number): number {
  return 10 + 8 * (level - 1) + level * level;
}
