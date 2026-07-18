import { describe, expect, it } from 'vitest';
import { ObjectPool, type Poolable } from '../src/core/ObjectPool';

class Thing implements Poolable {
  active = false;
  poolIndex = -1;
  constructor(readonly serial: number) {}
}

describe('ObjectPool', () => {
  it('acquire でアクティブになり、release でプールへ戻る', () => {
    let serial = 0;
    const pool = new ObjectPool(() => new Thing(serial++), 2);
    const a = pool.acquire()!;
    const b = pool.acquire()!;
    expect(pool.activeCount).toBe(2);
    pool.release(a);
    expect(pool.activeCount).toBe(1);
    expect(a.active).toBe(false);
    // 再取得で同じインスタンスが再利用される(new が発生しない)
    const c = pool.acquire()!;
    expect(c).toBe(a);
    expect(b.active).toBe(true);
  });

  it('swap-remove 後も poolIndex が一貫している', () => {
    const pool = new ObjectPool(() => new Thing(0), 0);
    const items = [pool.acquire()!, pool.acquire()!, pool.acquire()!];
    pool.release(items[0]); // 末尾が先頭に移動する
    for (let i = 0; i < pool.active.length; i++) {
      expect(pool.active[i].poolIndex).toBe(i);
    }
  });

  it('上限に達すると null を返す', () => {
    const pool = new ObjectPool(() => new Thing(0), 0, 2);
    pool.acquire();
    pool.acquire();
    expect(pool.acquire()).toBeNull();
  });

  it('二重 release しても壊れない', () => {
    const pool = new ObjectPool(() => new Thing(0), 0);
    const a = pool.acquire()!;
    pool.acquire();
    pool.release(a);
    pool.release(a);
    expect(pool.activeCount).toBe(1);
  });
});
