export interface Poolable {
  active: boolean;
  poolIndex: number;
}

/**
 * 単純なオブジェクトプール。ラン中の new / GC を避ける。
 * active 配列は swap-remove で詰めるため順序は保証しない。
 */
export class ObjectPool<T extends Poolable> {
  private free: T[] = [];
  readonly active: T[] = [];

  constructor(
    private factory: () => T,
    prealloc = 0,
    readonly limit = Infinity,
  ) {
    for (let i = 0; i < prealloc; i++) this.free.push(factory());
  }

  get activeCount(): number {
    return this.active.length;
  }

  /** 上限到達時は null を返す(呼び出し側で間引き等を判断) */
  acquire(): T | null {
    if (this.active.length >= this.limit) return null;
    const item = this.free.pop() ?? this.factory();
    item.active = true;
    item.poolIndex = this.active.length;
    this.active.push(item);
    return item;
  }

  release(item: T): void {
    if (!item.active) return;
    item.active = false;
    const i = item.poolIndex;
    const last = this.active[this.active.length - 1];
    this.active[i] = last;
    last.poolIndex = i;
    this.active.pop();
    this.free.push(item);
  }
}
