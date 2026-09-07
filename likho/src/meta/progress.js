// ПРОГРЕСС МЕЖДУ ПОХОДАМИ. Единственная точка, где игра читает и пишет сейв.
//
// Разделение, ради которого модуль и заведён: МЕТА (память, алтарь, открытые герои,
// зарубки, рекорд) — редкая и ценная, её можно писать в облако. СОСТОЯНИЕ ПОХОДА
// (карта, колода, бой) — большое и меняется каждый ход; его пишем через тот же
// Save.update (слой склеивает частые вызовы), но flush зовём только на ключевых точках.
// Правило взято из `CONVENTIONS.md` §7 и разбора games/rubezh.
import { Save } from '../yandex/save.js';
import { BALANCE } from '../data/balance.js';
import { DEFAULT_STATS } from '../data/stats.js';

const DEFAULTS = {
  memory: 0,
  altar: { hp: 0, gold: 0, choice: 0, relic: 0 },
  heroes: ['ratnik'],
  bestScore: 0, bestAct: 1, bestFloor: 0,
  runs: 0, wins: 0,
  stats: { ...DEFAULT_STATS },
  achievements: [],
  daily: { last: null, streak: 0, maxSeen: null },
  ads: { day: null, counts: {}, runsPlayed: 0 },
  run: null,
  combat: null,
  seenHowto: false,
  seenVulnTip: false,
};

// Глубокое слияние с умолчаниями: сейв старой версии не должен ронять игру отсутствием
// поля, добавленного позже. Дешевле любой миграции и не требует поднимать SAVE_VERSION
// на каждое новое поле статистики.
function withDefaults(data) {
  const out = { ...DEFAULTS, ...(data || {}) };
  out.altar = { ...DEFAULTS.altar, ...(data && data.altar) };
  out.stats = { ...DEFAULTS.stats, ...(data && data.stats) };
  out.daily = { ...DEFAULTS.daily, ...(data && data.daily) };
  out.ads = { ...DEFAULTS.ads, ...(data && data.ads) };
  out.heroes = (data && data.heroes) ? data.heroes.slice() : DEFAULTS.heroes.slice();
  out.achievements = (data && data.achievements) ? data.achievements.slice() : [];
  return out;
}

export const Progress = {
  data: withDefaults(null),

  async load() {
    const raw = await Save.load();
    this.data = withDefaults(raw);
    return this.data;
  },

  // Частичная запись. Частые вызовы склеиваются слоем — звать можно свободно.
  put(partial) {
    Object.assign(this.data, partial);
    Save.update(partial);
  },

  flush() { return Save.flush(); },

  // ---- Алтарь ---------------------------------------------------------------
  altarLevel(key) { return this.data.altar[key] || 0; },
  altarCost(key) {
    const cfg = BALANCE.ALTAR[key];
    const lvl = this.altarLevel(key);
    return lvl >= cfg.max ? null : cfg.costs[lvl];
  },
  canBuyAltar(key) {
    const cost = this.altarCost(key);
    return cost !== null && this.data.memory >= cost;
  },
  buyAltar(key) {
    const cost = this.altarCost(key);
    if (cost === null || this.data.memory < cost) return false;
    const altar = { ...this.data.altar, [key]: this.altarLevel(key) + 1 };
    this.put({ memory: this.data.memory - cost, altar });
    return true;
  },

  // Надбавки, с которыми стартует новый поход.
  runMeta() {
    const a = this.data.altar;
    return {
      bonusHp: (a.hp || 0) * BALANCE.ALTAR.hp.value,
      bonusGold: (a.gold || 0) * BALANCE.ALTAR.gold.value,
      extraCardChoice: (a.choice || 0) > 0,
      startRelics: [],           // заполняется в MenuScene: конкретный оберег выбирается ГСЧ забега
      altarRelic: (a.relic || 0) > 0,
    };
  },

  // ---- Герои ----------------------------------------------------------------
  heroUnlocked(id) { return this.data.heroes.includes(id); },
  unlockHero(id) {
    if (this.heroUnlocked(id)) return false;
    const heroes = this.data.heroes.concat([id]);
    this.put({ heroes, stats: { ...this.data.stats, heroesUnlocked: heroes.length } });
    return true;
  },

  // ---- Итог похода ----------------------------------------------------------
  // Память начисляется по пройденному, а не по победе: иначе первые десять проигранных
  // походов не дают ничего, и игрок уходит до того, как мета начнёт работать.
  memoryFor(runState, score) {
    const s = runState.stats;
    return s.floors * BALANCE.MEMORY_PER_FLOOR
      + s.elites * BALANCE.MEMORY_PER_ELITE
      + s.bosses * BALANCE.MEMORY_PER_BOSS
      + (runState.result === 'win' ? BALANCE.MEMORY_WIN_BONUS : 0);
  },

  addMemory(n) { this.put({ memory: this.data.memory + n }); },

  recordRun(runState, score) {
    const patch = {
      runs: this.data.runs + 1,
      bestScore: Math.max(this.data.bestScore, score),
      run: null, combat: null,
    };
    if (runState.result === 'win') patch.wins = this.data.wins + 1;
    const deeper = runState.act > this.data.bestAct
      || (runState.act === this.data.bestAct && runState.stats.floors > this.data.bestFloor);
    if (deeper) { patch.bestAct = runState.act; patch.bestFloor = runState.stats.floors; }
    this.put(patch);
  },

  bump(key, value = 1, mode = 'add') {
    const stats = { ...this.data.stats };
    stats[key] = mode === 'max' ? Math.max(stats[key] || 0, value) : (stats[key] || 0) + value;
    this.put({ stats });
    return stats[key];
  },
};
