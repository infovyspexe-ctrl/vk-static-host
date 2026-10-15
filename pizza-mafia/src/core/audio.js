// ЗВУК. Единый менеджер (CONVENTIONS.md, раздел 8): весь звук идёт отсюда, одна кнопка
// mute гасит всё, реклама и потеря фокуса глушат через pause/resume.
//
// ЭФФЕКТЫ СИНТЕЗИРУЮТСЯ WEB AUDIO НА ЛЕТУ — ноль ассетов, ноль загрузки, ноль веса в
// билде. Для игры про тапы это ещё и точнее по времени, чем проигрывание файла: звук
// рождается ровно в момент действия. Приём взят из «Кладовой» (второе использование,
// см. CODE-INDEX.md).
//
// МУЗЫКА идёт ЧИСТЫМ Web Audio (decodeAudioData + BufferSource), НЕ через HTML5-тег звука
// и НЕ через загрузчик Phaser. Причина не в красоте: модерация Яндекса отклонила билд
// «Кладовой» с HTML5-тегом — браузер сам подключает такой элемент к системному Media
// Session, и всплывает нативный мини-плеер на десктопе и уведомление с прогресс-баром на
// Android, даже без единого нашего вызова MediaSession API.
//
// AudioContext создаётся заранее, но браузер держит его suspended до первого жеста
// пользователя — unlock() навешен на первый pointerdown в main.js.
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
  if (!ensureCtx() || Audio.muted || Audio.paused) return;
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

// Короткий шумовой удар: тесто, сыр, всё «сыпучее». Тоном такое не изобразишь.
function noise(dur, { vol = 1, delay = 0, hp = 400 } = {}) {
  if (!ensureCtx() || Audio.muted || Audio.paused) return;
  const t0 = ctx.currentTime + delay;
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3 * vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(gain).connect(master);
  src.start(t0);
}

export const Audio = {
  game: null,
  muted: false,   // кнопка звука; состояние хранится в сейве (progress.muted)
  paused: false,  // реклама / потеря фокуса; кнопку не трогает

  // Шаблонный API: сцены и lifecycle зовут это, ломать нельзя.
  attach(game) { this.game = game; },
  setMuted(v) { this.muted = !!v; this._syncMusic(); },
  toggleMute() { this.setMuted(!this.muted); return this.muted; },
  pause() { this.paused = true; this._syncMusic(); },
  resume() { this.paused = false; this._syncMusic(); },

  // Разбудить контекст после первого жеста (autoplay policy браузера).
  // Заодно стартует музыку: до жеста браузер её всё равно не пустит.
  unlock() {
    if (ensureCtx() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    this._syncMusic();
  },

  // ── МУЗЫКА ─────────────────────────────────────────────────────────────
  _playlist: [],
  _trackIdx: 0,
  _musicBuf: null,
  _musicCache: {},
  _musicGain: null,
  _musicSource: null,
  _musicOffset: 0,
  _musicStartAt: 0,

  // Плейлист по кругу. Старт со случайного трека, чтобы сессии не начинались одинаково.
  // Файлы ОПЦИОНАЛЬНЫ: не загрузились — игра просто идёт без музыки, а не падает.
  music(urls) {
    this._playlist = urls || [];
    if (!this._playlist.length) return;
    this._trackIdx = Math.floor(Math.random() * this._playlist.length);
    this._musicOffset = 0;
    this._musicBuf = null;
    this._loadBuffer(this._playlist[this._trackIdx]).then((buf) => {
      this._musicBuf = buf;
      this._syncMusic();
    });
  },

  _loadBuffer(url) {
    if (this._musicCache[url]) return Promise.resolve(this._musicCache[url]);
    if (!ensureCtx()) return Promise.resolve(null);
    return fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('нет файла'))))
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => { this._musicCache[url] = buf; return buf; })
      .catch(() => null);
  },

  _playFrom(startOffset) {
    if (!ensureCtx() || !this._musicBuf) return;
    if (!this._musicGain) {
      this._musicGain = ctx.createGain();
      this._musicGain.gain.value = 0.32;   // фон, а не главный герой
      this._musicGain.connect(master);
    }
    const src = ctx.createBufferSource();
    src.buffer = this._musicBuf;
    src.connect(this._musicGain);
    src.onended = () => {
      if (this._musicSource !== src) return;   // остановлен намеренно (пауза/смена трека)
      this._musicSource = null;
      this._trackIdx = (this._trackIdx + 1) % this._playlist.length;
      this._musicOffset = 0;
      this._musicBuf = null;
      this._loadBuffer(this._playlist[this._trackIdx]).then((buf) => {
        this._musicBuf = buf;
        this._syncMusic();
      });
    };
    src.start(0, startOffset);
    this._musicSource = src;
    this._musicStartAt = ctx.currentTime - startOffset;
  },

  // BufferSourceNode одноразовый: паузы как таковой нет — запоминаем позицию и на
  // возобновлении пересоздаём source с того же места.
  _stopSourceRaw() {
    if (this._musicSource) {
      try { this._musicSource.onended = null; this._musicSource.stop(); } catch (e) {}
      this._musicSource = null;
    }
  },

  _pauseMusic() {
    if (this._musicSource && ctx) this._musicOffset = ctx.currentTime - this._musicStartAt;
    this._stopSourceRaw();
  },

  _syncMusic() {
    if (!this._playlist.length) return;
    if (!this.muted && !this.paused) {
      if (!this._musicSource && this._musicBuf) this._playFrom(this._musicOffset);
    } else {
      this._pauseMusic();
    }
  },

  // ── ЗВУКИ ПИЦЦЕРИИ ─────────────────────────────────────────────────────
  // Каждому действию — свой узнаваемый тембр. Задача не «озвучить», а дать УХОМ понять,
  // что произошло, не отрывая глаз от очереди: пицца готова, гость ушёл, брак.

  click() { tone(600, 0.04, { type: 'triangle', vol: 0.4 }); },

  // Раскатка теста: глухой шлепок, с каждым тапом чуть выше — слышно, что дело идёт.
  dough(step = 0) { noise(0.07, { vol: 0.55, hp: 250 }); tone(120 + step * 25, 0.06, { type: 'triangle', vol: 0.4, slide: -30 }); },

  sauce()  { tone(220, 0.12, { type: 'sine', vol: 0.55, slide: 120 }); },
  cheese() { noise(0.09, { vol: 0.45, hp: 900 }); },
  topping(){ tone(520, 0.05, { type: 'triangle', vol: 0.5 }); },

  // В печь: низкий «уход вглубь».
  toOven() { tone(300, 0.16, { type: 'sine', vol: 0.6, slide: -150 }); noise(0.12, { vol: 0.3, hp: 200, delay: 0.02 }); },

  // Печь доготовила — «динь». Звучит, даже когда игрок смотрит в другую сторону: в этом
  // весь смысл печи-парковки.
  ovenReady() { tone(880, 0.1, { vol: 0.7 }); tone(1320, 0.18, { vol: 0.55, delay: 0.08 }); },

  // Пицца горит — тревожный низкий пульс.
  ovenBurning() { tone(180, 0.14, { type: 'sawtooth', vol: 0.35 }); tone(150, 0.16, { type: 'sawtooth', vol: 0.35, delay: 0.14 }); },

  // Выдача: восходящее трезвучие. Брак — то же самое, но вниз и глуше.
  serveGood() {
    tone(523, 0.09, { vol: 0.7 });
    tone(659, 0.09, { vol: 0.7, delay: 0.08 });
    tone(784, 0.18, { vol: 0.8, delay: 0.16 });
  },
  serveBad() {
    tone(330, 0.14, { type: 'triangle', vol: 0.6 });
    tone(247, 0.22, { type: 'triangle', vol: 0.6, delay: 0.12 });
  },

  coin() { tone(1046, 0.06, { vol: 0.5 }); tone(1568, 0.09, { vol: 0.35, delay: 0.05 }); },

  // Новый гость у стойки — короткий колокольчик двери.
  guest() { tone(1200, 0.05, { type: 'sine', vol: 0.3 }); tone(900, 0.09, { type: 'sine', vol: 0.25, delay: 0.05 }); },

  // Гость ушёл — хлопок двери вниз.
  guestLost() { tone(400, 0.12, { type: 'sawtooth', vol: 0.5, slide: -220 }); },

  // Конец смены: три ноты вверх на успех, вниз на провал.
  shiftWin() {
    tone(523, 0.12, { vol: 0.7 });
    tone(698, 0.12, { vol: 0.7, delay: 0.11 });
    tone(1046, 0.3, { vol: 0.8, delay: 0.22 });
  },
  shiftFail() {
    tone(392, 0.16, { vol: 0.6 });
    tone(311, 0.16, { vol: 0.6, delay: 0.14 });
    tone(233, 0.32, { vol: 0.7, delay: 0.28 });
  }
};
