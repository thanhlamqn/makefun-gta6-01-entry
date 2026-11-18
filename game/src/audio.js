// Solmar Bay — sound, all synthesised in WebAudio.
// Engine hum, two-tone sirens, gunshots, a bass-and-hats groove under the
// city. No audio files, no network: every sound is an oscillator or a
// buffer of noise made at run time.

export function createAudio(G) {
  const A = {
    ctx: null,
    master: null,
    muted: false,
    engineOn: false,
    engineOsc: null,
    engineOsc2: null,
    engineGain: null,
    sirenOn: false,
    sirenOsc: null,
    sirenGain: null,
    sirenPhase: 0,
    sirenTimer: 0,
    musicTimer: null,
    musicStep: 0,
    noiseBuf: null,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return true;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.2;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return true;
      } catch (err) {
        return false;
      }
    },

    setMuted(m) {
      this.muted = !!m;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
    },

    // The engine follows the car's speed: a low sawtooth pair.
    engine(on) {
      if (!this.ensure()) return;
      if (on && !this.engineOn) {
        this.engineOn = true;
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'square';
        this.engineOsc2.frequency.value = 82;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 420;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;
        this.engineOsc.connect(filt);
        this.engineOsc2.connect(filt);
        filt.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
        this.engineOsc2.start();
      } else if (!on && this.engineOn) {
        this.engineOn = false;
        const t = this.ctx.currentTime;
        this.engineGain.gain.setTargetAtTime(0, t, 0.1);
        const osc = this.engineOsc;
        const osc2 = this.engineOsc2;
        setTimeout(() => { try { osc.stop(); osc2.stop(); } catch (e) {} }, 400);
        this.engineOsc = null;
        this.engineOsc2 = null;
      }
    },

    setEngineSpeed(speed01) {
      if (!this.engineOn || !this.engineOsc) return;
      const f = 55 + speed01 * 130;
      this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08);
      this.engineOsc2.frequency.setTargetAtTime(f * 1.5, this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.09, this.ctx.currentTime, 0.1);
    },

    siren(on) {
      if (!this.ensure()) return;
      if (on && !this.sirenOn) {
        this.sirenOn = true;
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'square';
        this.sirenOsc.frequency.value = 720;
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0.045;
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.master);
        this.sirenOsc.start();
        this.sirenTimer = 0;
      } else if (!on && this.sirenOn) {
        this.sirenOn = false;
        try { this.sirenOsc.stop(); } catch (e) {}
        this.sirenOsc = null;
      }
    },

    update(dt) {
      if (this.sirenOn && this.sirenOsc) {
        this.sirenTimer += dt;
        if (this.sirenTimer > 0.42) {
          this.sirenTimer = 0;
          this.sirenPhase = 1 - this.sirenPhase;
          this.sirenOsc.frequency.value = this.sirenPhase ? 960 : 720;
        }
      }
    },

    blip(freq, dur, type, vol) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    shot(far) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = far ? 'lowpass' : 'bandpass';
      filt.frequency.value = far ? 900 : 2400;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(far ? 0.12 : 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.master);
      src.start(t);
      src.stop(t + 0.16);
    },

    reload() { this.blip(520, 0.09, 'square', 0.1); setTimeout(() => this.blip(760, 0.09, 'square', 0.1), 120); },
    emptyClick() { this.blip(180, 0.05, 'square', 0.12); },
    steal() { this.blip(300, 0.12, 'sawtooth', 0.14); setTimeout(() => this.blip(420, 0.14, 'sawtooth', 0.14), 130); },
    horn() { this.blip(370, 0.22, 'square', 0.1); setTimeout(() => this.blip(466, 0.22, 'square', 0.1), 70); },
    missionStart() { this.blip(523, 0.12, 'sine', 0.16); setTimeout(() => this.blip(784, 0.18, 'sine', 0.16), 130); },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'sine', 0.16), i * 110));
    },
    busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.18), i * 160)); },
    wasted() { [330, 262, 196, 131].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.18), i * 200)); },

    // A bass-and-hats groove at 100 BPM: A minor, four bars looping.
    startMusic() {
      if (!this.ensure() || this.musicTimer) return;
      const bassNotes = [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 61.7, 0, 73.4, 0];
      this.musicTimer = setInterval(() => {
        if (this.muted || !this.ctx) return;
        const step = this.musicStep % 16;
        this.musicStep++;
        const note = bassNotes[step];
        if (note) {
          const t = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = note;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.16, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(g);
          g.connect(this.master);
          osc.start(t);
          osc.stop(t + 0.3);
        }
        if (step % 2 === 1) {
          const t = this.ctx.currentTime;
          const src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuf;
          const filt = this.ctx.createBiquadFilter();
          filt.type = 'highpass';
          filt.frequency.value = 6000;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.05, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          src.connect(filt);
          filt.connect(g);
          g.connect(this.master);
          src.start(t);
          src.stop(t + 0.06);
        }
      }, 150);
    },

    stopMusic() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    },
  };
  G.audio = A;
  return A;
}
