// СИНТЕЗАТОР ЗВУКА: короткие эффекты рождаются на лету, без единого файла.
//
// ЗАЧЕМ ЭТО В ШАБЛОНЕ. Одно и то же ядро было написано НЕЗАВИСИМО в шести играх
// (reshala, sweet-empire, osushi-ozero, roofrun, kladovaya, pizza-mafia) — CODE-INDEX
// отмечал это как просроченный вынос с 2026-07. Переиспользуемая часть — ровно две
// функции ниже; НАБОР звуков у каждой игры свой и сюда не едет.
//
// Почему синтез, а не файлы: ноль веса в билде, ноль времени загрузки, ноль вопросов по
// правам на звук, и — для игр про тапы важнее всего — звук рождается ровно в момент
// действия, без задержки на выборку сэмпла.
//
// ГРАБЛЯ, УЖЕ СТОИВШАЯ ОШИБКИ (sweet-empire): свои узлы идут МИМО звуковой системы
// Phaser, поэтому `scene.sound.mute` их НЕ глушит. Кнопка звука обязана ходить через
// единый менеджер (core/audio.js), а не переключать `this.sound.mute` напрямую — иначе
// кнопка в игре рассинхронизируется с кнопкой в меню.
//
// Использование в игре:
//   import { Sfx } from '../core/sfx.js';
//   Sfx.gate = () => !Audio.muted && !Audio.paused;   // один раз, при старте
//   export const Sounds = { click: () => Sfx.tone(600, 0.04, { type: 'triangle', vol: 0.4 }) };

let ctx = null;
let master = null;

export const Sfx = {
  // Гейт: играть ли сейчас. Игра подменяет его на своё состояние mute/пауза.
  gate: () => true,

  // Общая громкость всех эффектов.
  volume: 0.5,

  // Контекст создаётся заранее, но браузер держит его suspended до первого жеста
  // пользователя (правило autoplay). unlock() вешается на первый pointerdown.
  ctx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    return ctx;
  },

  unlock() {
    const c = this.ctx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  },

  // Выход, к которому игра может подцепить свою музыку.
  master() { this.ctx(); return master; },

  // Один тон с огибающей. freq в Гц, dur в секундах, slide — сдвиг частоты к концу.
  tone(freq, dur, { type = 'sine', vol = 1, delay = 0, slide = 0 } = {}) {
    if (!this.ctx() || !this.gate()) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    // Огибающая экспонентой, а не линейно: линейная атака щёлкает на старте.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.35 * vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  // Короткий шумовой удар: шаги, сыпучее, шлепки. Тоном такое не изобразишь.
  noise(dur, { vol = 1, delay = 0, hp = 400 } = {}) {
    if (!this.ctx() || !this.gate()) return;
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
};
