// Перековка (смена ветки после превращения) и сборка итоговых характеристик юнита
// из накопленных уровней линий + формы ветки. Не хранит состояние — чистые функции
// над `state` из core/progress.js.
import { lineCost, statAt, LINE_GROWTH as statGrowth } from './progression.js';

function investedInLine(baseCost, level) {
  let sum = 0;
  for (let l = 1; l <= level; l++) sum += lineCost(baseCost, l);
  return sum;
}

export function investedTotal(baseCost, state) {
  return investedInLine(baseCost, state.hp)
    + investedInLine(baseCost, state.damage)
    + investedInLine(baseCost, state.cooldown);
}

// Не требует отдельного сохранённого поля «сколько потрачено» — считается по
// текущим уровням линий той же формулой цены, что и сама покупка (спека §5).
export function perekovkaCost(baseCost, state) {
  return Math.round(investedTotal(baseCost, state) * 2);
}

export function effectiveSpec({ base, state, form }) {
  const shape = state.branch && form ? form : base;
  return {
    id: state.branch && form ? form.id : base.id,
    cost: base.cost,
    hp: statAt(base.hp, statGrowth.hp, state.hp),
    damage: statAt(base.damage, statGrowth.damage, state.damage) * (shape.damageMultiplier ?? 1),
    cooldown: Math.max(0.1, Math.round(statAt(base.cooldown, statGrowth.cooldown, state.cooldown) * (shape.cooldownMultiplier ?? 1) * 100) / 100),
    pierce: shape.pierce ?? 0,
    pierceLoss: shape.pierceLoss ?? 0.3,
    damageType: shape.damageType ?? base.damageType,
    burst: shape.burst ?? 1,
    targets: shape.targets ?? 1,
    splashPattern: shape.splashPattern ?? 'square3',
    splashDivisor: shape.splashDivisor ?? 2,
    projectile: shape.projectile ?? base.projectile,
  };
}

// Таблица юнитов ИГРОКА для одного боя: пересчитана из текущих unitLevels перед стартом
// (BattleScene.create). Вражеская сторона в бой всегда идёт с сырым каталогом UNITS —
// эта функция вызывается только для playerUnitTable (спека §10, изоляция от прокачки).
export function buildUnitTable(baseCatalog, unitLevels, formForFn) {
  const table = {};
  for (const [baseId, base] of Object.entries(baseCatalog)) {
    const state = unitLevels[baseId] ?? { hp: 0, damage: 0, cooldown: 0, branch: null };
    const form = state.branch ? formForFn(baseId, state.branch) : null;
    const spec = effectiveSpec({ base, state, form });
    table[spec.id] = spec;
  }
  return table;
}
