// ДЕТЕРМИНИРОВАННЫЙ ГСЧ забега. mulberry32 — тот же, что в `iznanka` и `roofrun`:
// один сид полностью задаёт карту забега, добор и награды.
//
// Зачем детерминизм именно здесь: забег живёт 40–60 минут и ОБЯЗАН переживать
// перезагрузку вкладки. Сохранять весь поток случайностей невозможно, поэтому в сейв
// уходит сид + счётчик вызовов (`calls`), а при загрузке поток перематывается. Тот же
// приём и та же грабля, что в reigns-движке «Летописи» (CODE-INDEX): без перемотки
// снимок говорит, ГДЕ генератор стоит, но не ЧТО он выдаст дальше — расхождение тихое.
export function createRng(seed, calls = 0) {
  let a = (seed >>> 0) || 1;
  let count = 0;

  function next() {
    count++;
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Перемотка: N холостых вызовов приводят поток ровно туда, где он был.
  for (let i = 0; i < calls; i++) next();
  count = calls;

  return {
    seed,
    next,
    get calls() { return count; },
    // Целое из [0, n).
    int(n) { return Math.floor(next() * n); },
    // Целое из [min, max] включительно.
    range(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    // Тасование Фишера — Йетса. Возвращает НОВЫЙ массив, исходный не трогает.
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    },
    // Взвешенный выбор: items = [{ w, ...}]. Нулевой суммарный вес → null.
    weighted(items) {
      const total = items.reduce((s, it) => s + (it.w || 0), 0);
      if (total <= 0) return null;
      let r = next() * total;
      for (const it of items) {
        r -= (it.w || 0);
        if (r < 0) return it;
      }
      return items[items.length - 1];
    },
  };
}

// Сид из строки-даты — для «испытания дня» (одна и та же карта у всех игроков в сутки).
export function seedFromString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
