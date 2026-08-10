// ДЕРЕВО ПРОКАЧКИ (замкнутый модуль). Поддерживает ДВА типа веток:
//
//  1. Бесконечные (формульные): цена costBase*costMult^level, эффект аддитивный
//     1 + effectPer*level. Растут без потолка — у игрока всегда есть что покупать.
//     Такими сделаны fill/capacity/income/pour/sprint (провал «нечего тратить»
//     в поздней игре был именно из-за потолка в 5 уровней — замер sim_infinite.py).
//
//  2. Конечные (списочные): фиксированный массив cost, потолок = длина массива.
//     Такими остались teleport (снижает кулдаун из TELEPORT_COOLDOWNS) и pump
//     (офлайн-насос) — у них смысл в нескольких ступенях, а не в бесконечном росте.
//
// Уровни хранятся как объект { fill: 12, capacity: 8, ... } — компактно и не пухнет
// с ростом (старый формат — список id 'fill1','fill2' — раздувал бы сейв бесконечно;
// конструктор понимает и его для миграции).
//
// costScale — внешний множитель цены (в «Осуши озеро» это ECONOMY.prestigeCostMult^N:
// каждый престиж делает прокачку дороже, поэтому болото «тяжелее качать» и слои
// престижа не обесценивают друг друга). Модуль про престиж не знает — получает число.
//
// Конфиг ветки:
//   бесконечная: { costBase: 10, costMult: 2.1, effectPer: 0.55 }
//   конечная:    { cost: [100, 500, 2000, 8000, 25000] }

export class SkillTreeModel {
  constructor(branches, saved = {}, costScale = 1) {
    this.branches = branches;
    this.costScale = costScale;
    this.levels = {};
    for (const b of Object.keys(branches)) this.levels[b] = 0;
    this._load(saved);
  }

  // Принимает и новый формат (объект уровней), и старый (массив id 'fill1',...).
  _load(saved) {
    if (Array.isArray(saved)) {
      // Старый сейв: считаем максимальный номер узла каждой ветки.
      for (const id of saved) {
        const m = /^([a-z]+)(\d+)$/.exec(id);
        if (m && m[1] in this.levels) {
          this.levels[m[1]] = Math.max(this.levels[m[1]], +m[2]);
        }
      }
    } else if (saved && typeof saved === 'object') {
      for (const b of Object.keys(this.levels)) {
        if (typeof saved[b] === 'number' && saved[b] >= 0) this.levels[b] = Math.floor(saved[b]);
      }
    }
  }

  _infinite(branch) { return this.branches[branch].costMult !== undefined; }

  level(branch) { return this.levels[branch] || 0; }

  maxLevel(branch) {
    return this._infinite(branch) ? Infinity : this.branches[branch].cost.length;
  }

  // Стоимость следующего уровня; null — ветка выкуплена (только для конечных).
  nextCost(branch) {
    const lvl = this.level(branch);
    const b = this.branches[branch];
    if (this._infinite(branch)) {
      return Math.round(b.costBase * Math.pow(b.costMult, lvl) * this.costScale);
    }
    return lvl >= b.cost.length ? null : b.cost[lvl];
  }

  canBuy(branch, tokens) {
    const cost = this.nextCost(branch);
    return cost !== null && tokens >= cost;
  }

  // Купить следующий уровень. Возвращает { level, cost } или null.
  buy(branch, tokens) {
    if (!this.canBuy(branch, tokens)) return null;
    const cost = this.nextCost(branch);
    this.levels[branch] = this.level(branch) + 1;
    return { level: this.levels[branch], cost };
  }

  // Множитель ветки к стату: аддитивный 1 + effectPer*level.
  // Для конечных веток (teleport/pump) не вызывается — там работает level().
  multiplier(branch) {
    const b = this.branches[branch];
    if (b.effectPer === undefined) return 1;
    return 1 + b.effectPer * this.level(branch);
  }

  // Снимок для сейва: компактный объект уровней.
  toSave() { return { ...this.levels }; }

  reset() {
    for (const b of Object.keys(this.levels)) this.levels[b] = 0;
  }
}
