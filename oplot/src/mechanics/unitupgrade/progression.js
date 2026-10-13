// Прокачка юнита: три независимые линии (ХП/Урон/Скорострельность), цена растёт
// геометрически: 70 → 98 → 137. Уже купленные уровни/характеристики не меняются.
// Уровень линии начинается с 0 (не прокачано); level=1 — первая покупка.
import { ECONOMY } from '../../data/economy.js';
export const LINE_GROWTH = { hp: 1.30, damage: 1.25, cooldown: 0.92 };
export const LINE_COST_GROWTH = ECONOMY.upgradeCostGrowth;
export const MILESTONE = 5; // сумма трёх линий, при которой юнит может перерождаться

export function lineCost(baseCost, level) {
  const base = Math.round(baseCost * ECONOMY.upgradeBaseMultiplier);
  return Math.round(base * Math.pow(LINE_COST_GROWTH, level - 1));
}

export function unitLevel(state) {
  return state.hp + state.damage + state.cooldown;
}

export function canTransform(state) {
  return unitLevel(state) >= MILESTONE;
}

// ХП/Урон округляются до целого (как все базовые значения в data/units.js),
// перезарядка — до сотых (как 1.30/0.60 в каталоге).
export function statAt(baseValue, growth, level) {
  const raw = baseValue * Math.pow(growth, level);
  return growth < 1 ? Math.round(raw * 100) / 100 : Math.round(raw);
}
