/**
 * プロシージャル音声(WebAudio 直叩き)。
 * ファンメイド作品のため外部音源を使わず、SE/BGM とも全てランタイム合成する。
 * AudioContext はブラウザ制約により最初のユーザー操作で init() すること。
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private seGain!: GainNode;
  private bgmGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmNextTime = 0;
  private bgmStep = 0;
  private lastPlay: Record<string, number> = {};
  muted = false;

  /** 最初のユーザー操作(クリック/キー)から呼ぶ。多重呼び出し可 */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.seGain = this.ctx.createGain();
    this.seGain.gain.value = 0.5;
    this.seGain.connect(this.master);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.16;
    this.bgmGain.connect(this.master);

    // ホワイトノイズバッファ(斬撃・ヒット・ハイハット用)
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx) this.master.gain.value = muted ? 0 : 1;
  }

  /** type ごとの連打抑制(密集撃破時の音割れ防止) */
  private throttled(type: string, minInterval: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlay[type] ?? 0) < minInterval * 1000) return true;
    this.lastPlay[type] = now;
    return false;
  }

  /** 単音: 周波数スライド+減衰エンベロープ */
  private tone(
    freq: number,
    dur: number,
    vol: number,
    type: OscillatorType = 'square',
    slideTo?: number,
    dest?: AudioNode,
    when?: number,
  ): void {
    if (!this.ctx) return;
    const t = when ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(dest ?? this.seGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** ノイズバースト: バンドパスで音色を変える */
  private noise(dur: number, vol: number, freq: number, q = 1, when?: number, dest?: AudioNode): void {
    if (!this.ctx) return;
    const t = when ?? this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest ?? this.seGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ── SE ──
  slash(): void {
    if (this.throttled('slash', 0.06)) return;
    this.noise(0.08, 0.25, 2600, 1.2);
    this.tone(900, 0.06, 0.08, 'sawtooth', 300);
  }
  kill(): void {
    if (this.throttled('kill', 0.05)) return;
    this.tone(220, 0.15, 0.2, 'square', 55); // 黒い体が崩れる低い音
    this.noise(0.12, 0.12, 400, 0.8);
  }
  pickup(): void {
    if (this.throttled('pickup', 0.06)) return;
    this.tone(880, 0.07, 0.1, 'sine', 1320);
  }
  levelUp(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 0.14, 'triangle', undefined, undefined, t + i * 0.07));
  }
  playerHit(): void {
    if (this.throttled('phit', 0.15)) return;
    this.tone(140, 0.2, 0.3, 'sawtooth', 60);
    this.noise(0.15, 0.2, 700, 0.7);
  }
  dash(): void {
    this.noise(0.25, 0.25, 1200, 0.6);
    this.tone(300, 0.25, 0.12, 'sine', 1600);
  }
  guardOn(): void {
    this.tone(160, 0.25, 0.2, 'triangle', 320);
  }
  shockwave(): void {
    this.tone(100, 0.4, 0.35, 'square', 40);
    this.noise(0.3, 0.25, 250, 0.7);
  }
  chargeStage(stage: number): void {
    this.tone(300 + stage * 180, 0.12, 0.15, 'square');
  }
  chargeRelease(stage: number): void {
    this.tone(180, 0.3, 0.3, 'sawtooth', 50);
    this.noise(0.25, 0.3, 1200 + stage * 500, 1);
  }
  bossRoar(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(90, 0.9, 0.4, 'sawtooth', 45, undefined, t);
    this.tone(65, 1.1, 0.35, 'square', 32, undefined, t + 0.1);
    this.noise(0.8, 0.25, 180, 0.5, t);
  }
  jingle(victory: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const seq = victory ? [523, 659, 784, 1047, 1319] : [330, 262, 220, 165];
    seq.forEach((f, i) => this.tone(f, 0.3, 0.16, 'triangle', undefined, undefined, t + i * 0.16));
  }

  // ── BGM: A マイナーペンタの生成ループ(90BPM、先読みスケジューリング) ──
  startBgm(): void {
    if (!this.ctx || this.bgmTimer) return;
    this.bgmNextTime = this.ctx.currentTime + 0.1;
    this.bgmStep = 0;
    this.bgmTimer = setInterval(() => this.scheduleBgm(), 40);
  }

  stopBgm(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleBgm(): void {
    if (!this.ctx) return;
    const eighth = 60 / 90 / 2; // 90BPM の 8 分音符
    const bass = [55, 55, 41.2, 49]; // A1 A1 E1 G1(小節ごと)
    const pent = [220, 261.6, 293.7, 329.6, 392, 440]; // A3 C4 D4 E4 G4 A4
    while (this.bgmNextTime < this.ctx.currentTime + 0.15) {
      const step = this.bgmStep % 64; // 8小節ループ(8分×64)
      const bar = Math.floor(step / 8) % 4;
      const t = this.bgmNextTime;
      if (step % 4 === 0) this.tone(bass[bar], eighth * 1.8, 0.5, 'triangle', undefined, this.bgmGain, t);
      if (step % 2 === 1) this.noise(0.03, 0.1, 6000, 1.5, t, this.bgmGain); // ハイハット
      if (step % 8 === 4) this.noise(0.09, 0.3, 900, 0.6, t, this.bgmGain); // スネア風
      // まばらなアルペジオ(後半小節ほど密度が上がる)
      if (step % 2 === 0 && Math.random() < 0.28 + bar * 0.08) {
        const note = pent[Math.floor(Math.random() * pent.length)];
        this.tone(note, eighth * 1.2, 0.12, 'square', undefined, this.bgmGain, t);
      }
      this.bgmNextTime += eighth;
      this.bgmStep++;
    }
  }
}

/** グローバル単一インスタンス。シーンを跨いで使う */
export const audio = new AudioEngine();
