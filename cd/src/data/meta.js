// META-АПГРЕЙДЫ — постоянная прокачка между партиями за кристаллы.
// Это даёт удержание D1/D7: прогресс сохраняется, игрок возвращается сильнее.
// Покупаются в меню (Lab), применяются к стартовому состоянию игрока в GameScene.
//
// Каждая запись: id, icon, name/desc (i18n-ключи), cost (базовая цена), costGrowth
// (множитель цены за уровень), maxLevel, apply(start) — мутирует стартовый объект.
// Уровень хранится в Save.meta.upgrades[id] (0..maxLevel).
export const META_UPGRADES = [
  { id: 'startDamage', icon: 'upg_damage', name: 'meta_startDamage_name', desc: 'meta_startDamage_desc',
    baseCost: 8, costGrowth: 1.5, maxLevel: 8,
    apply: (s, lvl) => { s.damage += lvl * 2; } },
  { id: 'startMaxHp', icon: 'upg_maxhp', name: 'meta_startMaxHp_name', desc: 'meta_startMaxHp_desc',
    baseCost: 10, costGrowth: 1.45, maxLevel: 8,
    apply: (s, lvl) => { s.maxHp += lvl * 15; s.hp = s.maxHp; } },
  { id: 'startSpeed', icon: 'upg_speed', name: 'meta_startSpeed_name', desc: 'meta_startSpeed_desc',
    baseCost: 10, costGrowth: 1.5, maxLevel: 5,
    apply: (s, lvl) => { s.speed += lvl * 12; } },
  { id: 'startFireRate', icon: 'upg_firerate', name: 'meta_startFireRate_name', desc: 'meta_startFireRate_desc',
    baseCost: 12, costGrowth: 1.5, maxLevel: 6,
    apply: (s, lvl) => { s.fireRate += lvl * 0.12; } },
  { id: 'startArmor', icon: 'upg_armor', name: 'meta_startArmor_name', desc: 'meta_startArmor_desc',
    baseCost: 18, costGrowth: 1.6, maxLevel: 5,
    apply: (s, lvl) => { s.armor = Math.min(0.5, lvl * 0.05); } },
  { id: 'startRegen', icon: 'upg_regen', name: 'meta_startRegen_name', desc: 'meta_startRegen_desc',
    baseCost: 20, costGrowth: 1.6, maxLevel: 4,
    apply: (s, lvl) => { s.regen += lvl * 0.4; } }
];

// Цена апгрейда на конкретный следующий уровень.
export function metaCost(def, currentLevel) {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

// Применить все купленные мета-апгрейды к стартовому состоянию игрока.
export function applyMetaToStart(start, upgrades) {
  for (const def of META_UPGRADES) {
    const lvl = upgrades[def.id] || 0;
    if (lvl > 0) def.apply(start, lvl);
  }
  return start;
}

// Доля прокачки Лаборатории: 0 (пусто) .. 1 (все апгрейды на максимуме). Усреднение
// по УРОВНЮ/МАКСИМУМУ, а не по фактической силе каждого стата (урон +2/ур. и броня
// +5%/ур. по-разному влияют на живучесть) — не завязываемся на внутренности apply(),
// а считаем «какая доля всего дерева куплена», как и просил игрок. Используется для
// масштабирования сложности волн под мета-прогресс (GameScene._difficultyMul) — без
// этого забег не чувствует, что игрок стал сильнее между партиями (жалоба игрока
// 2026-08-22: «боссы как муравьишки» после прокачки Лаборатории).
export function metaProgress(upgrades) {
  if (!META_UPGRADES.length) return 0;
  let sum = 0;
  for (const def of META_UPGRADES) {
    const lvl = Math.min(def.maxLevel, upgrades[def.id] || 0);
    sum += lvl / def.maxLevel;
  }
  return sum / META_UPGRADES.length;
}
