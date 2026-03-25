// audio.js — Sound manager via Howler.js + Web Audio API synthesis
import { SaveManager } from './save.js';

class AudioManagerClass {
  constructor() {
    this.initialized = false;
    this.sounds = {};
    this.bgm = null;
    this.bgmPlaying = false;
    this.audioCtx = null;
    this.musicVolume = 0.7;
    this.sfxVolume = 1.0;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    const settings = SaveManager.getSettings();
    this.musicVolume = settings.musicVolume;
    this.sfxVolume = settings.sfxVolume;

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.generateSounds();
  }

  generateSounds() {
    // Generate all sounds programmatically using Web Audio API
    this.sounds.coinCollect = this.createToneBuffer([800, 1200], 0.1, 'sine');
    this.sounds.jump = this.createSweepBuffer(300, 600, 0.15, 'sine');
    this.sounds.slide = this.createNoiseBuffer(0.15);
    this.sounds.laneSwitch = this.createToneBuffer([440], 0.05, 'square');
    this.sounds.hit = this.createNoiseBuffer(0.2, true);
    this.sounds.powerUp = this.createArpeggioBuffer([523, 659, 784, 1047], 0.4);
    this.sounds.checkpoint = this.createArpeggioBuffer([523, 659, 784, 1047, 1319], 0.6);
    this.sounds.gameOver = this.createSweepBuffer(500, 150, 0.6, 'sawtooth');
    this.sounds.menuSelect = this.createToneBuffer([880], 0.08, 'sine');
    this.sounds.menuConfirm = this.createToneBuffer([880, 1100], 0.12, 'sine');
    this.sounds.comboUp = this.createSweepBuffer(600, 900, 0.12, 'sine');
    this.sounds.abilityActivate = this.createArpeggioBuffer([400, 600, 800, 1000, 1200], 0.5);

    // Per-character voice sounds (pitch-shifted blips)
    this.sounds.voice_patty = this.createToneBuffer([330, 440], 0.1, 'sine');
    this.sounds.voice_crispy = this.createSweepBuffer(500, 800, 0.08, 'sawtooth');
    this.sounds.voice_frosty = this.createToneBuffer([1200, 1400, 1200], 0.15, 'sine');
    this.sounds.voice_blaze = this.createNoiseBuffer(0.1, true);
    this.sounds.voice_saucy = this.createSweepBuffer(200, 400, 0.12, 'sine');
    this.sounds.voice_turbo = this.createToneBuffer([800, 1600], 0.08, 'square');

    // BGM - create a simple looping pattern
    this.createBGM();
  }

  createToneBuffer(frequencies, duration, type) {
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const segLen = Math.floor(length / frequencies.length);

    for (let f = 0; f < frequencies.length; f++) {
      const freq = frequencies[f];
      for (let i = 0; i < segLen; i++) {
        const idx = f * segLen + i;
        if (idx >= length) break;
        const t = i / sampleRate;
        const envelope = 1 - (idx / length);
        let sample = 0;
        if (type === 'sine') {
          sample = Math.sin(2 * Math.PI * freq * t);
        } else if (type === 'square') {
          sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
        } else if (type === 'sawtooth') {
          sample = 2 * (freq * t % 1) - 1;
        }
        data[idx] = sample * envelope * 0.3;
      }
    }
    return buffer;
  }

  createSweepBuffer(freqStart, freqEnd, duration, type) {
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = i / length;
      const freq = freqStart + (freqEnd - freqStart) * progress;
      const envelope = 1 - progress;
      let sample = 0;
      if (type === 'sine') {
        sample = Math.sin(2 * Math.PI * freq * t);
      } else if (type === 'sawtooth') {
        sample = 2 * (freq * t % 1) - 1;
      }
      data[i] = sample * envelope * 0.3;
    }
    return buffer;
  }

  createNoiseBuffer(duration, burst = false) {
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const envelope = burst ? Math.exp(-i / length * 5) : (1 - i / length);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.2;
    }
    return buffer;
  }

  createArpeggioBuffer(notes, duration) {
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const noteLen = Math.floor(length / notes.length);

    for (let n = 0; n < notes.length; n++) {
      const freq = notes[n];
      for (let i = 0; i < noteLen; i++) {
        const idx = n * noteLen + i;
        if (idx >= length) break;
        const t = i / sampleRate;
        const envelope = (1 - i / noteLen) * (1 - idx / length);
        data[idx] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.25;
      }
    }
    return buffer;
  }

  createBGM() {
    // Simple procedural BGM - a funky bass + melody loop
    const sampleRate = 44100;
    const bpm = 140;
    const beatsPerLoop = 16;
    const beatDuration = 60 / bpm;
    const loopDuration = beatsPerLoop * beatDuration;
    const length = Math.floor(sampleRate * loopDuration);
    const buffer = this.audioCtx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Bass line pattern (notes as frequencies)
    const bassPattern = [110, 110, 146.83, 146.83, 130.81, 130.81, 164.81, 164.81,
                         110, 110, 146.83, 146.83, 174.61, 164.81, 146.83, 130.81];
    // Melody pattern
    const melodyPattern = [440, 0, 523, 0, 587, 0, 523, 440,
                           0, 523, 587, 659, 523, 0, 440, 0];

    for (let beat = 0; beat < beatsPerLoop; beat++) {
      const beatStart = Math.floor(beat * beatDuration * sampleRate);
      const beatEnd = Math.floor((beat + 1) * beatDuration * sampleRate);
      const bassFreq = bassPattern[beat];
      const melodyFreq = melodyPattern[beat];

      for (let i = beatStart; i < beatEnd && i < length; i++) {
        const t = (i - beatStart) / sampleRate;
        const beatProgress = (i - beatStart) / (beatEnd - beatStart);
        const envelope = Math.exp(-beatProgress * 3);

        // Bass (left-center)
        let bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.15 * envelope;
        // Add kick drum on beats 0, 4, 8, 12
        if (beat % 4 === 0) {
          const kickFreq = 150 * Math.exp(-t * 30);
          bass += Math.sin(2 * Math.PI * kickFreq * t) * 0.2 * Math.exp(-t * 15);
        }
        // Hi-hat on every beat
        if (t < 0.02) {
          bass += (Math.random() * 2 - 1) * 0.08 * (1 - t / 0.02);
        }

        // Melody (right-center)
        let melody = 0;
        if (melodyFreq > 0) {
          melody = Math.sin(2 * Math.PI * melodyFreq * t) * 0.08 * envelope;
          // Add slight detune for thickness
          melody += Math.sin(2 * Math.PI * (melodyFreq * 1.005) * t) * 0.04 * envelope;
        }

        left[i] = bass * 0.7 + melody * 0.5;
        right[i] = bass * 0.5 + melody * 0.7;
      }
    }

    this.bgmBuffer = buffer;
  }

  play(soundId) {
    if (!this.initialized || !this.sounds[soundId]) return;
    if (this.sfxVolume <= 0) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = this.sounds[soundId];

    const gain = this.audioCtx.createGain();
    gain.gain.value = this.sfxVolume;

    source.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start(0);
  }

  playCharacterSound(charId, action) {
    this.play(`voice_${charId}`);
  }

  playBGM() {
    if (!this.initialized || !this.bgmBuffer) return;
    this.stopBGM();

    this.bgmSource = this.audioCtx.createBufferSource();
    this.bgmSource.buffer = this.bgmBuffer;
    this.bgmSource.loop = true;

    this.bgmGain = this.audioCtx.createGain();
    this.bgmGain.gain.value = this.musicVolume;

    this.bgmSource.connect(this.bgmGain);
    this.bgmGain.connect(this.audioCtx.destination);
    this.bgmSource.start(0);
    this.bgmPlaying = true;
  }

  stopBGM() {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch {}
      this.bgmSource = null;
    }
    this.bgmPlaying = false;
  }

  pauseBGM() {
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
  }

  resumeBGM() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.bgmGain) this.bgmGain.gain.value = v;
    SaveManager.updateSettings({ musicVolume: v });
  }

  setSFXVolume(v) {
    this.sfxVolume = v;
    SaveManager.updateSettings({ sfxVolume: v });
  }

  resumeContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }
}

export const AudioManager = new AudioManagerClass();
