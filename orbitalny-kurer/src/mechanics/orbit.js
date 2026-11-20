import { TYPES, STATIONS, UPGRADES, price, GOAL } from '../data/orbit.js';

// Первые смены учат действием: на поле только то, что нужно для следующего шага.
// Текстовый «как играть» модерация VK (п. 4.1.6.4) не засчитывает.
export const LESSON_DONE = 8;
const LESSONS = [
  { stations: 1, needs: [{ metal: 1 }], types: ['metal'], rings: 1, gap: 2.4, speed: 0.13, max: 1, opening: 1, queue: ['metal'] },
  { stations: 1, needs: [{ metal: 2 }], types: ['metal'], rings: 1, gap: 1.5, speed: 0.15, max: 1, opening: 1, queue: ['metal', 'metal'] },
  { stations: 1, needs: [{ metal: 2 }], types: ['metal'], mine: true, rings: 1, gap: 1.6, speed: 0.15, max: 2, opening: 2, queue: ['metal', 'mine', 'metal'] },
  { stations: 1, needs: [{ metal: 2, fuel: 1 }], types: ['metal', 'fuel'], rings: 1, gap: 1.25, speed: 0.17, max: 2, opening: 2, queue: ['metal', 'fuel', 'metal'] },
  { stations: 1, needs: [{ metal: 4 }], types: ['metal'], rings: 1, gap: 0.7, speed: 0.17, max: 2, cap: 3, opening: 1, queue: ['metal', 'metal', 'metal', 'metal'] },
  { stations: 2, needs: [{ fuel: 2 }, { metal: 2 }], types: ['metal', 'fuel'], rings: 2, gap: 1.05, speed: 0.19, max: 3, opening: 2, queue: ['fuel', 'metal', 'fuel', 'metal'] },
  { stations: 3, needs: [{ metal: 2 }, { fuel: 1 }, { tech: 2 }], types: ['metal', 'fuel', 'tech'], mine: true, rings: 2, gap: 1, speed: 0.2, max: 3, opening: 3, queue: ['metal', 'fuel', 'tech', 'mine', 'tech'] },
  { stations: 1, needs: [{ metal: 1 }], types: ['metal'], rings: 1, gap: 1.5, speed: 0.17, max: 1, opening: 1, queue: ['metal'] },
];

const fullRecipe = (n) => {
  const t = n % 3;
  const tier = Math.min(5, Math.floor(n / 3));
  if (t === 0) return { metal: 3 + tier, fuel: 2, tech: 0 };
  if (t === 1) return { metal: 1, fuel: 3 + tier, tech: 1 };
  return { metal: 2, fuel: 1, tech: 2 + Math.ceil(tier / 2) };
};

// После обучения заказы растут: один груз, потом пара, потом полные рецепты.
const recipe = (n, delivered) => {
  const t = n % 3;
  const count = 2 + (n % 2);
  if (delivered < 16) {
    if (t === 1) return { metal: 0, fuel: count, tech: 0 };
    return { metal: count, fuel: 0, tech: 0 };
  }
  if (delivered < 24) {
    if (t === 2) return { metal: 1, fuel: 0, tech: 2 };
    if (t === 1) return { metal: 1, fuel: 2, tech: 0 };
    return { metal: 2, fuel: 1, tech: 0 };
  }
  return fullRecipe(n);
};

export const fresh = () => ({
  started: false, credits: 0, delivered: 0, elapsed: 0,
  cargo: { metal: 0, fuel: 0, tech: 0 },
  levels: { hold: 0, scanner: 0, drone: 0, tug: 0 },
  contracts: [0, 1, 2], progress: [{}, {}, {}], debris: [],
  nextId: 1, spawn: 0, hits: 0, misses: 0, won: false, campaignComplete: false,
  lesson: 0, lessonCleared: 0, lessonQueue: 0, seenFull: false,
});

export function orderAmounts(progress, need) {
  const delivered = Math.max(0, progress || 0);
  const left = Math.max(0, (need || 0) - delivered);
  return { delivered, left };
}

// После цели кампания остаётся закрытой, а сверх лимита считается только свободная смена.
export function missionReadout(state, goal = GOAL) {
  const delivered = Math.max(0, state?.delivered || 0);
  const done = !!(state?.campaignComplete || delivered >= goal);
  return {
    done,
    delivered,
    goal,
    freeCount: Math.max(0, delivered - goal),
    bar: done ? 100 : Math.min(100, goal ? (delivered / goal) * 100 : 0),
  };
}

export class OrbitGame {
  constructor(saved = {}) {
    const x = saved.orbit || saved;
    this.s = {
      ...fresh(), ...x,
      cargo: { ...fresh().cargo, ...(x.cargo || {}) },
      levels: { ...fresh().levels, ...(x.levels || {}) },
      progress: [{}, {}, {}].map((p, i) => ({ ...p, ...(x.progress?.[i] || {}) })),
      debris: [],
    };
    // Старые сейвы не знают обучения. Пока кампания не закрыта, первая сессия
    // этой версии всё равно начинается со смен: иначе модератор со старым
    // прогрессом снова попадает в полный экран без знакомства с целью.
    // Пройденную кампанию не переигрываем. Кредиты, оснащение и число поставок остаются.
    if (x.lesson == null) {
      const finished = (x.delivered || 0) >= GOAL || x.campaignComplete === true;
      if (finished) this.s.lesson = LESSON_DONE;
      else {
        this.s.lesson = 0;
        this.s.cargo = { metal: 0, fuel: 0, tech: 0 };
        this.s.progress = [{}, {}, {}];
        if (!(x.delivered > 0)) this.s.contracts = [0, 1, 2];
        this.s.lessonCleared = 0;
        this.s.lessonQueue = 0;
      }
    }
    // Сейв старше флага кампании мог уже пройти 44 поставки. Финал заново не запускаем и число поставок не уменьшаем.
    if ((this.s.delivered || 0) >= GOAL && this.s.campaignComplete !== true) this.s.campaignComplete = true;
    this.events = [];
    this.seed = 17;
  }

  rand() { this.seed = (this.seed * 48271) % 2147483647; return this.seed / 2147483647; }
  lessonActive() { return this.s.lesson < LESSON_DONE; }
  lesson() { return this.lessonActive() ? LESSONS[this.s.lesson] : null; }

  capacity() {
    const cap = this.lesson()?.cap;
    if (cap) return cap;
    return 8 + this.s.levels.hold * 4;
  }

  load() { return Object.values(this.s.cargo).reduce((a, b) => a + b, 0); }

  rings() {
    if (this.lessonActive()) return this.lesson().rings;
    if (this.s.delivered < 14) return 1;
    if (this.s.delivered < 22) return 2;
    return 3;
  }

  visibleTypes() {
    if (this.lessonActive()) return this.lesson().types;
    const types = ['metal', 'fuel'];
    const needsTech = [0, 1, 2].some((i) => (this.contract(i).need.tech || 0) > 0) || this.s.cargo.tech > 0 || this.s.delivered >= 24;
    if (needsTech) types.push('tech');
    return types;
  }

  unlockedUpgrades() {
    if (this.s.lesson < 7) return [];
    if (this.lessonActive()) return ['hold'];
    const ids = ['hold'];
    const d = this.s.delivered;
    if (d >= 14 || this.s.levels.scanner) ids.push('scanner');
    if (d >= 20 || this.s.levels.drone) ids.push('drone');
    if (d >= 26 || this.s.levels.tug) ids.push('tug');
    return ids;
  }

  contract(i) {
    const spec = this.lesson();
    if (spec) {
      if (i >= spec.stations) return null;
      return { station: STATIONS[i], number: this.s.contracts[i], need: spec.needs[i], reward: 55 };
    }
    const n = this.s.contracts[i];
    return { station: STATIONS[i], number: n, need: recipe(n, this.s.delivered), reward: 55 + n * 24 };
  }

  payout(contract) { return Math.round(contract.reward * (1 + this.s.levels.tug * 0.12)); }

  lessonCovered() {
    const spec = this.lesson();
    if (!spec) return false;
    const need = { metal: 0, fuel: 0, tech: 0 };
    for (let i = 0; i < spec.stations; i++) {
      const order = spec.needs[i];
      const p = this.s.progress[i];
      const done = Object.entries(order).every(([k, n]) => (p[k] || 0) >= n);
      if (done) continue;
      for (const [k, n] of Object.entries(order)) need[k] = (need[k] || 0) + Math.max(0, n - (p[k] || 0));
    }
    return Object.entries(need).every(([k, n]) => this.s.cargo[k] >= n);
  }

  // Куда смотреть без подписи: ловить, сдавать, освобождать трюм или купить отсек.
  focus() {
    const guide = this.lessonActive() || this.s.delivered < 16;
    if (!guide) return 'free';
    const spec = this.lesson();
    // Тесный трюм: пока место есть и заказ в него не влезает, смотреть на орбиту.
    if (spec?.cap && this.load() < spec.cap && !this.lessonCovered()) return 'catch';
    const stations = spec ? spec.stations : 3;
    for (let i = 0; i < stations; i++) if (this.canDeliver(i)) return 'deliver';
    if (this.load() >= this.capacity()) return 'full';
    if (this.s.lesson === 7 && this.s.levels.hold === 0 && this.s.credits >= price('hold', 0)) return 'upgrade';
    return 'catch';
  }

  spawnLesson(spec) {
    const queue = spec.queue;
    const index = this.s.lessonQueue || 0;
    let kind;
    if (index < queue.length) kind = queue[index];
    else if (spec.mine && !this.s.debris.some((d) => d.danger) && this.rand() < 0.65) kind = 'mine';
    else kind = spec.types[index % spec.types.length];
    this.s.lessonQueue = index + 1;
    const danger = kind === 'mine';
    const slots = spec.opening || spec.max || 1;
    const angle = (this.s.debris.length / slots) * Math.PI * 2 - Math.PI / 2;
    this.s.debris.push({
      id: this.s.nextId++,
      type: danger ? 'metal' : kind,
      ring: 1 + (this.s.debris.length % spec.rings),
      angle, danger, age: 0,
    });
  }

  tickLesson(dt) {
    const spec = this.lesson();
    const blocked = this.lessonCovered() || this.load() >= this.capacity();
    if (!blocked) {
      if (this.s.debris.length === 0 && !(this.s.lessonQueue > 0)) {
        const n = Math.min(spec.opening || 1, spec.max);
        for (let i = 0; i < n; i++) this.spawnLesson(spec);
      }
      this.s.spawn += dt;
      let guard = 0;
      while (this.s.debris.length < spec.max && this.s.spawn >= spec.gap && guard++ < 4) {
        this.s.spawn -= spec.gap;
        this.spawnLesson(spec);
      }
    }
    for (const d of this.s.debris) {
      d.age += dt;
      d.angle += spec.speed * (0.65 + d.ring * 0.35) * dt;
    }
  }

  spawn() {
    const wanted = [];
    for (let i = 0; i < 3; i++) {
      const order = this.contract(i);
      const p = this.s.progress[i];
      for (const [k, n] of Object.entries(order.need)) if (n > (p[k] || 0)) wanted.push(k);
    }
    const pool = wanted.length ? wanted : ['metal', 'fuel', 'tech'];
    const noise = this.s.delivered >= 22 && this.rand() < 0.28;
    const types = noise ? ['metal', 'fuel', 'tech'] : pool;
    const type = types[Math.floor(this.rand() * types.length)];
    const ring = 1 + Math.floor(this.rand() * this.rings());
    const d = this.s.delivered;
    const mineP = d < 16 ? 0.045 : d < 28 ? 0.08 : 0.12 + Math.min(0.1, this.s.elapsed / 900);
    this.s.debris.push({
      id: this.s.nextId++, type, ring, angle: this.rand() * Math.PI * 2,
      danger: this.rand() < mineP, age: 0,
    });
    if (this.s.debris.length > 18) this.s.debris.shift();
  }

  tick(dt) {
    if (!this.s.started || this.s.won) return;
    this.s.elapsed += dt;
    if (this.lessonActive()) { this.tickLesson(dt); return; }
    const scanner = this.s.levels.scanner;
    this.s.spawn += dt * (1 + scanner * 0.08);
    const base = this.s.delivered < 14 ? 1.7 : 1.35;
    const gap = Math.max(0.55, base - scanner * 0.15);
    while (this.s.spawn > gap) { this.s.spawn -= gap; this.spawn(); }
    for (const d of this.s.debris) { d.age += dt; d.angle += (0.22 + d.ring * 0.08) * dt; }
    this.s.debris = this.s.debris.filter((d) => d.age < 18);
    this._drone = (this._drone || 0) + dt * this.s.levels.drone * 0.12;
    if (this._drone >= 1) {
      this._drone--;
      const d = this.s.debris.find((x) => !x.danger);
      if (d && this.load() < this.capacity()) this.collect(d.id, true);
    }
  }

  collect(id, auto = false) {
    const d = this.s.debris.find((x) => x.id === id);
    if (!d) return false;
    if (d.danger) {
      const before = this.s.credits;
      this.s.credits = Math.max(0, this.s.credits - 12);
      this.s.misses++;
      this.events.push({ type: 'hazard', loss: before - this.s.credits });
      this.s.debris = this.s.debris.filter((x) => x.id !== id);
      return false;
    }
    if (this.load() >= this.capacity()) {
      this.s.seenFull = true;
      this.events.push({ type: 'full' });
      return false;
    }
    this.s.cargo[d.type]++;
    this.s.hits++;
    this.s.debris = this.s.debris.filter((x) => x.id !== id);
    this.events.push({ type: 'collect', cargo: d.type, auto });
    return true;
  }

  canDeliver(i) {
    const c = this.contract(i);
    if (!c) return false;
    const p = this.s.progress[i];
    return Object.entries(c.need).some(([k, n]) => n > 0 && this.s.cargo[k] > 0 && (p[k] || 0) < n);
  }

  advanceLesson() {
    this.s.lesson += 1;
    this.s.lessonCleared = 0;
    this.s.lessonQueue = 0;
    this.s.cargo = { metal: 0, fuel: 0, tech: 0 };
    this.s.seenFull = false;
    this.s.progress = [{}, {}, {}];
    this.s.debris = [];
    this.s.spawn = 0;
    this.events.push({ type: 'lesson', step: this.s.lesson });
    if (this.lessonActive() && this.s.started) this.tickLesson(0);
  }

  deliver(i) {
    if (!this.canDeliver(i)) return false;
    const c = this.contract(i);
    const p = this.s.progress[i];
    let moved = 0;
    for (const [k, n] of Object.entries(c.need)) {
      const take = Math.min(this.s.cargo[k], n - (p[k] || 0));
      if (take > 0) { this.s.cargo[k] -= take; p[k] = (p[k] || 0) + take; moved += take; }
    }
    const complete = Object.entries(c.need).every(([k, n]) => (p[k] || 0) >= n);
    if (complete) {
      const bonus = this.payout(c);
      this.s.credits += bonus;
      this.s.delivered++;
      this.events.push({ type: 'deliver', index: i, station: c.station.id, reward: bonus, moved });
      if (this.lessonActive()) {
        this.s.lessonCleared++;
        const spec = this.lesson();
        const last = this.s.lesson === 7;
        if (last) this.s.progress[i] = {};
        if (last ? this.s.lessonCleared >= 2 : this.s.lessonCleared >= spec.stations) this.advanceLesson();
      } else {
        this.s.contracts[i] += 3;
        this.s.progress[i] = {};
      }
    } else {
      const remaining = Object.entries(c.need).reduce((sum, [k, n]) => sum + Math.max(0, n - (p[k] || 0)), 0);
      this.events.push({ type: 'deposit', index: i, station: c.station.id, moved, remaining });
    }
    if (this.s.delivered >= GOAL && !this.s.campaignComplete) {
      this.s.won = true;
      this.s.campaignComplete = true;
      this.events.push({ type: 'win' });
    }
    return true;
  }

  continueAfterWin() {
    if (!this.s.won) return false;
    this.s.won = false;
    this.s.campaignComplete = true;
    this.events.push({ type: 'freeShift' });
    return true;
  }

  discard(type) {
    if (!TYPES[type] || this.s.cargo[type] <= 0) return false;
    this.s.cargo[type]--;
    this.events.push({ type: 'discard', cargo: type });
    return true;
  }

  buy(id) {
    const u = UPGRADES[id];
    const lv = this.s.levels[id];
    if (!u || lv >= u.max) return false;
    const cost = price(id, lv);
    if (this.s.credits < cost) return false;
    this.s.credits -= cost;
    this.s.levels[id]++;
    this.events.push({ type: 'upgrade', id });
    if (this.s.lesson === 7 && id === 'hold') this.advanceLesson();
    return true;
  }

  drain() { return this.events.splice(0); }
  snapshot() { const x = structuredClone(this.s); x.debris = []; return x; }
}
