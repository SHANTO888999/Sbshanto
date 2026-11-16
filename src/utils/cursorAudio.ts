/**
 * Lightweight procedural Web Audio synthesizer for subtle design-canvas feedback:
 * layout box open, typewriter key ticks, corner resize sweep, color shimmer, and drop snap.
 * Safe against browser autoplay locks (silently awaits first user gesture to resume).
 */
class CursorAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastTickAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    if (!nextMuted) {
      this.unlock();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playLayoutOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(640, t + 0.045);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.016, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // ignore Web Audio failure
    }
  }

  public playTypeTick(seed = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    const nowMs = performance.now();
    if (nowMs - this.lastTickAt < 38) return;
    this.lastTickAt = nowMs;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 1350 + (seed % 5) * 95;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.016);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.015, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.022);
    } catch {
      // ignore Web Audio failure
    }
  }

  public playResizeSweep(): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(410, t + 0.11);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.014, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch {
      // ignore Web Audio failure
    }
  }

  public playColorChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;
      [523.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.025);

        gain.gain.setValueAtTime(0.0001, t + idx * 0.025);
        gain.gain.linearRampToValueAtTime(0.011, t + idx * 0.025 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.025 + 0.13);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.025);
        osc.stop(t + idx * 0.025 + 0.14);
      });
    } catch {
      // ignore Web Audio failure
    }
  }

  public playDropSnap(): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t = ctx.currentTime;

      // Low tactile snap thud
      const body = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      body.type = 'sine';
      body.frequency.setValueAtTime(175, t);
      body.frequency.exponentialRampToValueAtTime(76, t + 0.048);

      bodyGain.gain.setValueAtTime(0.0001, t);
      bodyGain.gain.linearRampToValueAtTime(0.026, t + 0.004);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

      body.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      body.start(t);
      body.stop(t + 0.06);

      // Subtle high lock tick
      const tick = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tick.type = 'triangle';
      tick.frequency.setValueAtTime(980, t);
      tickGain.gain.setValueAtTime(0.0001, t);
      tickGain.gain.linearRampToValueAtTime(0.012, t + 0.002);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

      tick.connect(tickGain);
      tickGain.connect(ctx.destination);
      tick.start(t);
      tick.stop(t + 0.025);
    } catch {
      // ignore Web Audio failure
    }
  }
}

export const cursorAudio = new CursorAudioEngine();
