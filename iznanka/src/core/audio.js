// Единый менеджер звука. Все звуки идут через него, одна кнопка mute гасит всё.
// Привязывается к игре в main.js: Audio.attach(game).
export const Audio = {
  game: null,
  muted: false,

  attach(game) { this.game = game; },

  play(key, config) {
    if (!this.game || this.muted) return null;
    try { return this.game.sound.play(key, config); } catch (e) { return null; }
  },

  setMuted(v) {
    this.muted = v;
    try { if (this.game) this.game.sound.mute = v; } catch (e) {}
  },

  toggleMute() { this.setMuted(!this.muted); return this.muted; },

  // Пауза и возобновление всего звука (используется при рекламе и потере фокуса).
  pause() { try { if (this.game) this.game.sound.pauseAll(); } catch (e) {} },
  resume() { try { if (this.game && !this.muted) this.game.sound.resumeAll(); } catch (e) {} }
};
