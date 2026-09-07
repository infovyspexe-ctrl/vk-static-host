// ЗВУКИ ИГРЫ. Все эффекты синтезируются на лету (core/sfx.js), без файлов.
// Один источник правды: меняем тоны здесь, не трогая сцены.
// Гейт mute/пауза уже подключён в main.js (Sfx.gate = !Audio.muted && !Audio.paused).
import { Sfx } from './sfx.js';

export const Sounds = {
  shoot()    { Sfx.tone(720, 0.06, { type: 'square', vol: 0.18, slide: -180 }); },
  hit()      { Sfx.tone(240, 0.05, { type: 'sawtooth', vol: 0.2 }); },
  kill()     { Sfx.tone(440, 0.1, { type: 'triangle', vol: 0.25, slide: 320 }); },
  levelUp()  { Sfx.tone(523, 0.12, { type: 'triangle', vol: 0.3 }); Sfx.tone(784, 0.16, { type: 'triangle', vol: 0.3, delay: 0.1 }); },
  pickup()   { Sfx.tone(880, 0.05, { type: 'sine', vol: 0.18, slide: 300 }); },
  hurt()     { Sfx.noise(0.16, { vol: 0.5, hp: 300 }); Sfx.tone(140, 0.12, { type: 'sawtooth', vol: 0.3, slide: -60 }); },
  upgrade()  { Sfx.tone(660, 0.1, { type: 'triangle', vol: 0.28, slide: 220 }); },
  boss()     { Sfx.tone(90, 0.5, { type: 'sawtooth', vol: 0.4, slide: -30 }); },
  gameOver() { Sfx.tone(330, 0.3, { type: 'sawtooth', vol: 0.35, slide: -180 }); },
  click()    { Sfx.tone(500, 0.04, { type: 'triangle', vol: 0.25 }); },
  buy()      { Sfx.tone(660, 0.08, { type: 'triangle', vol: 0.3 }); Sfx.tone(990, 0.1, { type: 'triangle', vol: 0.3, delay: 0.06 }); }
};
