// НАБОР ЗВУКОВ ЭТОЙ ИГРЫ поверх синтезатора из шаблона (`core/sfx.js`).
// Файлов нет вовсе: ноль веса в билде, ноль загрузки, ноль вопросов по правам на звук.
//
// ГРАБЛЯ (стоила ошибки в sweet-empire): свои узлы WebAudio идут МИМО звуковой системы
// Phaser, поэтому `scene.sound.mute` их НЕ глушит. Кнопка звука обязана ходить через
// единый менеджер `core/audio.js` — гейт ниже завязан именно на него.
import { Sfx } from './sfx.js';
import { Audio } from './audio.js';

Sfx.gate = () => !Audio.muted;

export const Sounds = {
  click: () => Sfx.tone(520, 0.05, { type: 'triangle', vol: 0.35 }),
  cardPick: () => Sfx.tone(700, 0.06, { type: 'triangle', vol: 0.4, slide: 180 }),
  cardPlay: () => { Sfx.noise(0.07, { vol: 0.35, hp: 900 }); Sfx.tone(320, 0.08, { type: 'square', vol: 0.25 }); },
  attack: () => { Sfx.noise(0.09, { vol: 0.6, hp: 500 }); Sfx.tone(160, 0.12, { type: 'sawtooth', vol: 0.35, slide: -70 }); },
  block: () => Sfx.tone(240, 0.14, { type: 'sine', vol: 0.4, slide: 90 }),
  hurt: () => { Sfx.tone(180, 0.16, { type: 'sawtooth', vol: 0.5, slide: -90 }); Sfx.noise(0.1, { vol: 0.4, hp: 300 }); },
  poison: () => Sfx.tone(380, 0.18, { type: 'sine', vol: 0.28, slide: -140 }),
  heal: () => { Sfx.tone(520, 0.1, { type: 'sine', vol: 0.35 }); Sfx.tone(780, 0.14, { type: 'sine', vol: 0.3, delay: 0.08 }); },
  kill: () => { Sfx.tone(140, 0.3, { type: 'sawtooth', vol: 0.45, slide: -60 }); Sfx.noise(0.22, { vol: 0.45, hp: 200 }); },
  win: () => [0, 0.1, 0.2].forEach((d, i) => Sfx.tone([523, 659, 784][i], 0.22, { type: 'triangle', vol: 0.4, delay: d })),
  lose: () => [0, 0.14, 0.3].forEach((d, i) => Sfx.tone([330, 262, 196][i], 0.3, { type: 'sine', vol: 0.4, delay: d })),
  coin: () => { Sfx.tone(1100, 0.05, { type: 'square', vol: 0.25 }); Sfx.tone(1500, 0.07, { type: 'square', vol: 0.2, delay: 0.04 }); },
  relic: () => [0, 0.09].forEach((d, i) => Sfx.tone([660, 990][i], 0.2, { type: 'triangle', vol: 0.35, delay: d })),
  upgrade: () => { Sfx.noise(0.12, { vol: 0.3, hp: 1500 }); Sfx.tone(880, 0.16, { type: 'triangle', vol: 0.3, slide: 300 }); },
  step: () => Sfx.noise(0.06, { vol: 0.25, hp: 700 }),
};

// Разблокировка звукового контекста после первого жеста игрока (правило autoplay).
export function unlockAudioOnce(scene) {
  scene.input.once('pointerdown', () => Sfx.unlock());
}
