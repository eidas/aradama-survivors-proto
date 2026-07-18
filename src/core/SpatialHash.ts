/**
 * 空間ハッシュ。円エンティティをセルに登録し、近傍だけを照合する。
 * セルサイズ 64px、キーは (cx & 0xffff) << 16 | (cy & 0xffff)。
 * 毎フレーム clear() → insert() し直す使い方を想定(配列は再利用して GC を避ける)。
 */
export class SpatialHash<T> {
  private cells = new Map<number, T[]>();
  private seen = new Set<T>();

  constructor(readonly cellSize = 64) {}

  clear(): void {
    for (const arr of this.cells.values()) arr.length = 0;
  }

  private key(cx: number, cy: number): number {
    return ((cx & 0xffff) << 16) | (cy & 0xffff);
  }

  /** 円 (x, y, r) が重なる全セルに登録する。大型(複数セル跨ぎ)にも対応 */
  insert(item: T, x: number, y: number, r: number): void {
    const s = this.cellSize;
    const minX = Math.floor((x - r) / s);
    const maxX = Math.floor((x + r) / s);
    const minY = Math.floor((y - r) / s);
    const maxY = Math.floor((y + r) / s);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const k = this.key(cx, cy);
        let arr = this.cells.get(k);
        if (!arr) {
          arr = [];
          this.cells.set(k, arr);
        }
        arr.push(item);
      }
    }
  }

  /**
   * 円 (x, y, r) が重なるセル内の候補を out に集める(重複なし)。
   * 返るのは「候補」であり、正確な距離判定は呼び出し側で行う。
   */
  queryCircle(x: number, y: number, r: number, out: T[]): T[] {
    out.length = 0;
    this.seen.clear();
    const s = this.cellSize;
    const minX = Math.floor((x - r) / s);
    const maxX = Math.floor((x + r) / s);
    const minY = Math.floor((y - r) / s);
    const maxY = Math.floor((y + r) / s);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const item of arr) {
          if (!this.seen.has(item)) {
            this.seen.add(item);
            out.push(item);
          }
        }
      }
    }
    return out;
  }
}
