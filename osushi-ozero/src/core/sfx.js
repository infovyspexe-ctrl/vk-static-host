// Синтезированные звуки (WebAudio) — без аудиофайлов, вес нулевой.
// Все вызовы уважают mute единого менеджера (core/audio.js): SFX молчит,
// когда Audio.muted. Файловая музыка, если появится, пойдёт через Audio.
import { Audio } from './audio.js';

let ctx = null;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  return ctx;
}

// Один тон: частота, длительность, форма, громкость, глиссандо к freqEnd.
function tone(freq, dur, type = 'sine', vol = 0.15, freqEnd = null, when = 0) {
  const a = ac();
  if (!a || Audio.muted) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

// Шум (всплеск воды).
function splashNoise(dur = 0.25, vol = 0.12, when = 0) {
  const a = ac();
  if (!a || Audio.muted) return;
  const t0 = a.currentTime + when;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(a.destination);
  src.start(t0);
}

export const SFX = {
  scoop()   { splashNoise(0.22, 0.10); tone(220, 0.15, 'sine', 0.06, 320); },
  pour()    { splashNoise(0.35, 0.08); tone(500, 0.3, 'sine', 0.04, 180); },
  coin()    { tone(880, 0.08, 'square', 0.06); tone(1320, 0.12, 'square', 0.05, null, 0.06); },
  gem()     { tone(1050, 0.1, 'triangle', 0.09); tone(1560, 0.16, 'triangle', 0.08, null, 0.08); },
  buy()     { tone(520, 0.1, 'triangle', 0.1); tone(660, 0.1, 'triangle', 0.1, null, 0.09); tone(880, 0.16, 'triangle', 0.1, null, 0.18); },
  deny()    { tone(180, 0.18, 'sawtooth', 0.07, 120); },
  zone()    { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, null, i * 0.11)); },
  shark()   { tone(140, 0.4, 'sawtooth', 0.12, 60); },
  teleport(){ tone(300, 0.25, 'sine', 0.1, 1200); },
  victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, null, i * 0.15)); }
};
