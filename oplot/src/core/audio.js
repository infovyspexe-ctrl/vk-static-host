// Единый менеджер звука. Все звуки идут через него, одна кнопка mute гасит всё.
// Привязывается к игре в main.js: Audio.attach(game).
import { Sfx } from './sfx.js';

const MUTE_KEY = 'oplot_audio_muted';

export const Audio = {
  game: null,
  muted: false,
  paused: false,

  attach(game) {
    this.game = game;
    Sfx.gate = () => !this.muted && !this.paused;
    try { this.setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch (e) {}
    if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
  },

  play(key, config) {
    if (!this.game || this.muted) return null;
    try { return this.game.sound.play(key, config); } catch (e) { return null; }
  },

  setMuted(v) {
    this.muted = v;
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) {}
    try { if (this.game) this.game.sound.mute = v; } catch (e) {}
    if (v) Sfx.pause();
    else if (!this.paused) Sfx.resume();
  },

  toggleMute() { this.setMuted(!this.muted); return this.muted; },

  // Пауза и возобновление всего звука (используется при рекламе и потере фокуса).
  pause() { this.paused = true; Sfx.pause(); try { if (this.game) this.game.sound.pauseAll(); } catch (e) {} },
  resume() { this.paused = false; if (!this.muted) Sfx.resume(); try { if (this.game && !this.muted) this.game.sound.resumeAll(); } catch (e) {} }
};
