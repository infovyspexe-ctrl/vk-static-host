// Процедурные звуковые эффекты через WebAudio-контекст Phaser.
// Файлов нет — короткие тоны генерируются на лету (ноль веса, ноль рисков модерации).
// Контекст берём у звуковой системы Phaser: он разблокируется тем же жестом игрока,
// что и музыка. Mute уважаем через общий флаг Audio.muted.
import { Audio } from './audio.js';

export const Sfx = {
  ctx() {
    try {
      const g = Audio.game;
      return g && g.sound && g.sound.context ? g.sound.context : null;
    } catch (e) { return null; }
  },

  // Один тон с быстрой атакой и затуханием; slideTo — глиссандо частоты.
  _tone({ freq, dur = 0.12, type = 'triangle', vol = 0.2, slideTo = null, delay = 0 }) {
    const ctx = this.ctx();
    if (!ctx || Audio.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  },

  play(name) {
    if (!this.ctx() || Audio.muted) return;
    switch (name) {
      case 'swipe': // короткий «чирк» на решении
        this._tone({ freq: 520, slideTo: 300, dur: 0.10, type: 'triangle', vol: 0.16 });
        break;
      case 'win': // восходящая двунотка — победа/побег
        this._tone({ freq: 523, dur: 0.12, vol: 0.2 });
        this._tone({ freq: 784, dur: 0.18, vol: 0.2, delay: 0.11 });
        break;
      case 'lose': // нисходящий «провал»
        this._tone({ freq: 300, slideTo: 110, dur: 0.36, type: 'sawtooth', vol: 0.18 });
        break;
      case 'good': // удачный ход в мини-игре
        this._tone({ freq: 660, slideTo: 990, dur: 0.10, type: 'square', vol: 0.13 });
        break;
      case 'bad': // промах в мини-игре
        this._tone({ freq: 220, slideTo: 150, dur: 0.18, type: 'square', vol: 0.13 });
        break;
      default:
        break;
    }
  },
};
