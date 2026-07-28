// ЗВУК. Единый менеджер (CONVENTIONS.md, раздел 8): весь звук идёт отсюда,
// одна кнопка mute гасит всё, реклама и потеря фокуса глушат через pause/resume.
// Звуки синтезируются WebAudio на лету — ноль ассетов, ноль загрузки.
// AudioContext создаётся заранее, но браузер держит его suspended до первого
// жеста пользователя — resume() навешен на pointerdown в main.js.
let ctx = null;
let master = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

// Один тон с огибающей. freq в Гц, dur в секундах.
function tone(freq, dur, { type = 'sine', vol = 1, delay = 0, slide = 0 } = {}) {
  if (!ensureCtx() || !Audio.enabled || Audio.paused) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.35 * vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const Audio = {
  enabled: true, // кнопка звука в HUD, состояние хранится в сейве
  paused: false, // реклама / потеря фокуса; кнопку не трогает
  _music: null,  // фоновый трек (HTMLAudio, луп)

  // Разбудить контекст после первого жеста (autoplay policy).
  // Заодно стартует музыку: до жеста браузер её всё равно не пустит.
  unlock() {
    if (ensureCtx() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    this._syncMusic();
  },

  // Фоновая музыка: плейлист по кругу (трек кончился — включается следующий).
  // Старт со случайного трека, чтобы сессии не начинались одинаково.
  // Файлы опциональны: нет — тихо играем без музыки.
  music(urls) {
    this._playlist = urls;
    this._trackIdx = Math.floor(Math.random() * urls.length);
    const a = document.createElement('audio');
    a.volume = 0.35;
    a.onended = () => {
      this._trackIdx = (this._trackIdx + 1) % this._playlist.length;
      a.src = this._playlist[this._trackIdx];
      this._syncMusic();
    };
    a.onerror = () => { this._music = null; };
    a.src = urls[this._trackIdx];
    this._music = a;
  },

  _syncMusic() {
    if (!this._music) return;
    if (this.enabled && !this.paused) this._music.play().catch(() => {});
    else this._music.pause();
  },

  setEnabled(on) { this.enabled = !!on; this._syncMusic(); },
  pause() { this.paused = true; this._syncMusic(); },
  resume() { this.paused = false; this._syncMusic(); },

  // ---- Конкретные звуки игры ----
  drop() { tone(160, 0.06, { type: 'triangle', vol: 0.5, slide: -60 }); },

  // Слияние: тон растёт с рангом — слышно, что растишь крупный плод.
  merge(rank) { tone(280 + rank * 70, 0.12, { type: 'sine', vol: 0.8, slide: 90 }); },

  mergeMax() {
    tone(520, 0.18, { vol: 0.9 });
    tone(660, 0.18, { vol: 0.7, delay: 0.06 });
    tone(880, 0.25, { vol: 0.7, delay: 0.12 });
  },

  jar() { tone(880, 0.1, { vol: 0.8 }); tone(1320, 0.16, { vol: 0.6, delay: 0.07 }); },

  recipe() {
    tone(523, 0.1, { vol: 0.7 });
    tone(659, 0.1, { vol: 0.7, delay: 0.09 });
    tone(784, 0.2, { vol: 0.8, delay: 0.18 });
  },

  over() {
    tone(330, 0.18, { vol: 0.7 });
    tone(262, 0.18, { vol: 0.7, delay: 0.15 });
    tone(196, 0.35, { vol: 0.8, delay: 0.3 });
  },

  click() { tone(600, 0.04, { type: 'triangle', vol: 0.4 }); }
};
