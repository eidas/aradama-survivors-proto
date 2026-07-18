/** シード可能な乱数 (mulberry32)。リプレイ・テストの再現性用 */
export class Rng {
  private state: number;

  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  /** [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min, max] の整数 */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}
