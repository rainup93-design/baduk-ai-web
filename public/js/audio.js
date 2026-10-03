// Web Audio API Sound Synthesizer for Baduk
class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Realistic wood and stone click sound
  playStone() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;

      // 1. Sharp click impulse (High frequency click)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 + Math.random() * 120, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.09);

      // 2. Resonant wood thud (Body resonance)
      const thud = this.audioCtx.createOscillator();
      const thudGain = this.audioCtx.createGain();

      thud.type = 'sine';
      thud.frequency.setValueAtTime(240, t);
      thud.frequency.exponentialRampToValueAtTime(60, t + 0.15);

      thudGain.gain.setValueAtTime(0.5, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      thud.connect(thudGain);
      thudGain.connect(this.audioCtx.destination);

      thud.start(t);
      thud.stop(t + 0.16);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // Capture sound (clinking stones)
  playCapture() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      [0, 0.04, 0.09].forEach((delay, idx) => {
        const t = now + delay;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + idx * 300, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.06);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.07);
      });
    } catch (e) {
      console.warn('Capture sound error:', e);
    }
  }

  playPass() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(554.37, t + 0.1);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    } catch (e) {}
  }

  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, idx) => {
        const startTime = t + idx * 0.12;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch (e) {}
  }

  playLose() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const notes = [440, 392, 349.23, 293.66]; // A G F D
      notes.forEach((freq, idx) => {
        const startTime = t + idx * 0.15;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.31);
      });
    } catch (e) {}
  }
}

window.soundManager = new SoundManager();
