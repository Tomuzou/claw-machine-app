// audio/ — WebAudio で合成する効果音(外部音源ファイル不要)
// ブラウザの自動再生制限のため、AudioContext は最初のユーザー操作で生成する

interface ToneOptions {
  type?: OscillatorType;
  volume?: number;
  delay?: number; // 秒
  slideTo?: number; // 終了周波数(グリッサンド)
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private motorGain: GainNode | null = null;
  private muted = false;

  constructor() {
    const unlock = (): void => {
      this.ensure();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  /** ミュートを切り替え、新しい状態(true=ミュート中)を返す */
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** クレーン移動中のモーター音(ハム音)のON/OFF */
  setMotor(active: boolean): void {
    if (!this.ctx || !this.motorGain) return;
    const target = active ? 0.045 : 0;
    this.motorGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.06);
  }

  /** クレジット投入音 */
  coin(): void {
    this.tone(1320, 0.07, { type: 'square', volume: 0.15 });
    this.tone(1760, 0.2, { type: 'square', volume: 0.15, delay: 0.07 });
  }

  /** アーム降下音 */
  descend(): void {
    this.tone(420, 0.45, { type: 'sawtooth', volume: 0.08, slideTo: 200 });
  }

  /** 爪を閉じる音 */
  grab(): void {
    this.tone(220, 0.1, { type: 'square', volume: 0.2, slideTo: 90 });
  }

  /** 掴めたときの上昇音 */
  liftSuccess(): void {
    this.tone(523, 0.1, { type: 'triangle', volume: 0.25 });
    this.tone(659, 0.15, { type: 'triangle', volume: 0.25, delay: 0.1 });
  }

  /** 空振りしたときの音 */
  miss(): void {
    this.tone(220, 0.18, { type: 'triangle', volume: 0.2 });
    this.tone(174, 0.3, { type: 'triangle', volume: 0.2, delay: 0.16 });
  }

  /** 運搬中に落としてしまった音 */
  dropFail(): void {
    this.tone(600, 0.5, { type: 'triangle', volume: 0.25, slideTo: 140 });
  }

  /** 落とし口へのリリース音 */
  release(): void {
    this.tone(330, 0.1, { type: 'triangle', volume: 0.2 });
  }

  /** 景品獲得ファンファーレ */
  capture(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      this.tone(freq, 0.14, { type: 'square', volume: 0.16, delay: i * 0.09 });
    });
    this.tone(1319, 0.35, { type: 'square', volume: 0.14, delay: notes.length * 0.09 });
  }

  /** ゲームオーバーのジングル */
  gameover(): void {
    this.tone(392, 0.22, { type: 'triangle', volume: 0.22 });
    this.tone(330, 0.22, { type: 'triangle', volume: 0.22, delay: 0.22 });
    this.tone(262, 0.5, { type: 'triangle', volume: 0.22, delay: 0.44 });
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);

      // モーター音: 低いノコギリ波を常時鳴らし、ゲインで出し入れする
      const motorOsc = this.ctx.createOscillator();
      motorOsc.type = 'sawtooth';
      motorOsc.frequency.value = 85;
      this.motorGain = this.ctx.createGain();
      this.motorGain.gain.value = 0;
      motorOsc.connect(this.motorGain);
      this.motorGain.connect(this.master);
      motorOsc.start();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, options: ToneOptions = {}): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { type = 'sine', volume = 0.25, delay = 0, slideTo } = options;
    const start = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}
