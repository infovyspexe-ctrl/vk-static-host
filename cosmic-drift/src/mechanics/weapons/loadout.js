// НАБОР ОРУЖИЯ — чистые правила: слоты, уровни, эволюции, что предлагать в выборе.
//
// Замкнутый модуль: не знает ни про Phaser, ни про Cosmic Drift. Определения оружий и
// эволюций приходят снаружи конфигом, случайность — функцией rng, времени здесь нет вовсе.
// Поэтому логику можно проверить юнит-тестами, не поднимая игру.
//
// Ключевое правило, ради которого модуль вообще существует: слотов конечное число.
// Игрок ОБЯЗАН выбирать, а не собирать всё подряд — иначе к 10-й волне все забеги
// сходятся в один и тот же набор, и смысл билдов пропадает.
import { EVOLUTION_PASSIVE_LEVEL } from '../../data/weapons.js';

export function createLoadout({ weapons = [], evolutions = [], weaponSlots = 3 } = {}) {
  const byId = new Map();
  for (const w of weapons) byId.set(w.id, w);
  for (const e of evolutions) byId.set(e.id, e);

  // id → текущий уровень (1..maxLevel). Порядок вставки = порядок слотов на HUD.
  const levels = new Map();

  const isEvolution = (id) => evolutions.some((e) => e.id === id);
  const defOf = (id) => byId.get(id) || null;

  function occupiedSlots() {
    return levels.size;
  }

  function canTake(id) {
    const def = defOf(id);
    if (!def) return false;
    const lvl = levels.get(id) || 0;
    if (lvl >= def.maxLevel) return false;          // уже на максимуме
    if (lvl > 0) return true;                        // повышение взятого — всегда можно
    // Эволюция въезжает НА МЕСТО базового оружия, поэтому слот не требуется.
    if (isEvolution(id)) return (levels.get(def.from) || 0) > 0;
    return occupiedSlots() < weaponSlots;
  }

  function take(id) {
    if (!canTake(id)) return false;
    const def = defOf(id);
    if (isEvolution(id)) {
      // Базовое оружие уходит, эволюция занимает его слот.
      levels.delete(def.from);
      levels.set(id, 1);
      return true;
    }
    levels.set(id, (levels.get(id) || 0) + 1);
    return true;
  }

  function levelOf(id) { return levels.get(id) || 0; }

  function list() {
    return [...levels.entries()].map(([id, level]) => ({ id, level, def: defOf(id) }));
  }

  // Активные оружия с числами ТЕКУЩЕГО уровня — то, что нужно тикеру для стрельбы.
  function active() {
    return list().map(({ id, level, def }) => ({
      id, level, def, stats: def.levels[level - 1]
    }));
  }

  // Какие эволюции созрели: оружие на максимуме И парный пассив прокачан достаточно.
  function evolutionsReady(passives = {}) {
    return evolutions.filter((e) => {
      if (levels.has(e.id)) return false;                       // уже взята
      const base = defOf(e.from);
      if (!base) return false;
      if ((levels.get(e.from) || 0) < base.maxLevel) return false;
      const need = base.evolvesWith;
      if (!need) return false;
      return (passives[need] || 0) >= EVOLUTION_PASSIVE_LEVEL;
    });
  }

  // Карты для окна выбора. Созревшая эволюция идёт ПЕРВОЙ и гарантированно —
  // это обещание игроку: собрал условия, получил награду, а не «повезёт с роллом».
  function offers({ passives = {}, count = 3, rng = Math.random } = {}) {
    const out = [];
    const ready = evolutionsReady(passives);
    if (ready.length > 0) {
      const e = ready[0];
      out.push({ kind: 'evolution', id: e.id, def: e, nextLevel: 1 });
    }

    const pool = [];
    for (const w of weapons) {
      if (!canTake(w.id)) continue;
      const lvl = levels.get(w.id) || 0;
      pool.push({ kind: lvl > 0 ? 'levelup' : 'new', id: w.id, def: w, nextLevel: lvl + 1 });
    }

    while (out.length < count && pool.length > 0) {
      const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
      out.push(pool[i]);
      pool.splice(i, 1);
    }
    return out;
  }

  function reset() { levels.clear(); }

  return { take, canTake, levelOf, list, active, evolutionsReady, offers, reset,
           get slotsUsed() { return occupiedSlots(); }, weaponSlots,
           // Отдельный алиас: сцене привычнее спрашивать «какие оружия сейчас».
           weapons: list };
}
