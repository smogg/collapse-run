// Synthesized audio — no asset files needed

export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain: GainNode | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private gain(): GainNode {
    this.getCtx();
    return this.masterGain!;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 1;
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Key press — short click */
  playType(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 800 + Math.random() * 400;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  /** Mistype — low buzz error tone */
  playMistype(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  /** Enemy killed — satisfying pop */
  playKill(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.2);

    // Noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.3;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.1, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    noise.connect(ng).connect(this.gain());
    noise.start();
  }

  /** Debuff triggered — alarming siren */
  playDebuff(): void {
    const ctx = this.getCtx();
    // Main siren sweep
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(250, ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    // Impact thud
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(80, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
    g2.gain.setValueAtTime(0.25, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.connect(g2).connect(this.gain());
    osc2.start();
    osc2.stop(ctx.currentTime + 0.3);
  }

  /** Powerup collected — triumphant ascending arpeggio */
  playPowerup(): void {
    const ctx = this.getCtx();
    const freqs = [523, 659, 784, 1047, 1319];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g).connect(this.gain());
      osc.start(t);
      osc.stop(t + 0.2);
    });
    // Shimmer layer
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1500, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.4);
    g2.gain.setValueAtTime(0.05, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(g2).connect(this.gain());
    osc2.start();
    osc2.stop(ctx.currentTime + 0.4);
  }

  /** Player hit — thud */
  playHit(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  /** Death — descending sweep */
  playDeath(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.8);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  }

  /** Combo milestone — bright ding */
  playCombo(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  /** Segment hit — quick ascending chunk (partial damage on multi-segment enemy) */
  playSegmentHit(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  /** Boss spawn — deep rumble + warning siren */
  playBossSpawn(): void {
    const ctx = this.getCtx();
    // Deep rumble
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.6);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    // Warning siren
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3);
    osc2.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.6);
    g2.gain.setValueAtTime(0.1, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(g2).connect(this.gain());
    osc2.start();
    osc2.stop(ctx.currentTime + 0.6);
  }

  /** Boss death — dramatic explosion chord */
  playBossDeath(): void {
    const ctx = this.getCtx();
    const freqs = [110, 220, 330, 440];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f * 0.25, ctx.currentTime + 0.5);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(g).connect(this.gain());
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    });
    // Big noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.15, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    noise.connect(ng).connect(this.gain());
    noise.start();
  }

  /** Splitter — crystalline split sound */
  playSplit(): void {
    const ctx = this.getCtx();
    const freqs = [800, 1200, 1600];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.03;
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g).connect(this.gain());
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /** Explosion — deep thud + crackle */
  playExplosion(): void {
    const ctx = this.getCtx();
    // Low thud
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    // Crackle noise
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.4;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.12, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.connect(ng).connect(this.gain());
    noise.start();
  }

  /** Lightning — electric buzz */
  playLightning(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.05);
    osc.frequency.linearRampToValueAtTime(2500, ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /** Missile launch — rising sweep */
  playMissileLaunch(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g).connect(this.gain());
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  /** Critical hit — metallic ring */
  playCritical(): void {
    const ctx = this.getCtx();
    const freqs = [1500, 3000, 4500];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(g).connect(this.gain());
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    });
  }
}
