// ГСЧ С СИДОМ (mulberry32). Детерминизм обязателен: одно и то же подземелье у всех
// игроков в «Испытании дня» и воспроизводимость для тестов. НЕ заменять на Math.random()
// нигде внутри generate.js/combat.js/ai.js — только через объект, возвращённый createRng().
export function createRng(seed) {
  let a = seed >>> 0;
  return {
    // float [0,1)
    next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // Текущее внутреннее состояние (не исходный seed — уже "прокрученное" вызовами
    // next()). Передать обратно в createRng(state()) продолжает ТУ ЖЕ последовательность
    // с той же точки — нужно для сохранения активного забега (run-save).
    state() { return a >>> 0; },
    // целое [min, max] включительно
    int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); },
    // true с вероятностью p [0..1]
    chance(p) { return this.next() < p; },
    pick(arr) { return arr[this.int(0, arr.length - 1)]; },
    // Fisher-Yates на копии массива, исходный не трогает.
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    }
  };
}

// Сид «Испытания дня»: одна и та же дата -> один и тот же сид у всех игроков.
// Простой строковый хэш (FNV-1a), без крипто-требований — нужна только устойчивая
// детерминированность, не безопасность.
export function seedFromDate(dateStr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
