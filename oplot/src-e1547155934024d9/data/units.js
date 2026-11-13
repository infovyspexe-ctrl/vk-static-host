// damageType: normal — тратится на первый вражеский блок; pierce — проходит блоки,
// теряя долю урона за каждый; splash — бьёт по площади 3x3 вдвое меньшим уроном.
// Дальности у юнитов НЕТ: все достают до всей вражеской базы, как в референсе.
// Поле range было в первой редакции и убрано 15.08 — подробности в NOTES.md.
import { PROJECTILES } from './projectiles.js';
export const UNITS = {
  archer:    { id: 'archer',    cost: 18,  hp: 30, damage: 12, cooldown: 1.30, pierce: 0, damageType: 'normal' },
  shooter:   { id: 'shooter',   cost: 22,  hp: 35, damage: 6,  cooldown: 0.60, pierce: 0, damageType: 'normal' },
  cannon:    { id: 'cannon',    cost: 85,  hp: 50, damage: 40, cooldown: 2.60, pierce: 0, damageType: 'normal' },
  rocket:    { id: 'rocket',    cost: 110, hp: 40, damage: 30, cooldown: 3.00, pierce: 2, damageType: 'pierce' },
  grenadier: { id: 'grenadier', cost: 140, hp: 45, damage: 22, cooldown: 3.20, pierce: 0, damageType: 'splash' },
};
for(const [id,kind] of Object.entries({archer:'arrow',shooter:'bullet',cannon:'cannonball',rocket:'rocket',grenadier:'bomb'}))UNITS[id].projectile=PROJECTILES[kind];

// splashDivisor — числа опорные, как и весь остальной баланс в data/ (см.
// комментарий в blocks.js): square3 (обычный осколочный, divisor 2) — это уже идущее в бою
// поведение из damage.js, cross и wide5 сдвигают его в противоположные стороны (кучнее — выше
// урон на клетку, шире — ниже) и поедут после первых замеров симулятором.

// Десять веток превращения (Веха 4, spec 2026-08-22): только «форма» юнита —
// тип урона, пробитие, очередь выстрелов, число целей, паттерн сплэша.
// Базовые характеристики считаются из накопленных уровней. Множители оружия
// применяются ПОСЛЕ прокачки и не меняют/не сбрасывают купленные уровни.
// Баланс веток пересмотрен 10.09: тяжёлая/быстрая стрела, очередь/две цели,
// отдельная потеря урона для кумулятивного снаряда с реальным пробитием 4.
export const UNIT_FORMS = {
  crossbowman: { id: 'crossbowman', baseId: 'archer',    branch: 'A', damageType: 'pierce', pierce: 1, pierceLoss: 0.15, damageMultiplier: 1.35, cooldownMultiplier: 1.2 },
  ranger:      { id: 'ranger',      baseId: 'archer',    branch: 'B', cooldownMultiplier: 0.75 },
  gunner:      { id: 'gunner',      baseId: 'shooter',   branch: 'A', burst: 3, damageMultiplier: 0.5 },
  buckshot:    { id: 'buckshot',    baseId: 'shooter',   branch: 'B', targets: 2, damageMultiplier: 2 },
  howitzer:    { id: 'howitzer',    baseId: 'cannon',    branch: 'A', damageType: 'pierce', pierce: 2 },
  mortar:      { id: 'mortar',      baseId: 'cannon',    branch: 'B', damageType: 'splash', splashPattern: 'cross', splashDivisor: 1.5, projectile:{...PROJECTILES.bomb,muzzle:PROJECTILES.cannonball.muzzle} },
  volley:      { id: 'volley',      baseId: 'rocket',    branch: 'A', damageType: 'pierce', pierce: 1, burst: 2 },
  shaped:      { id: 'shaped',      baseId: 'rocket',    branch: 'B', damageType: 'pierce', pierce: 4, pierceLoss: 0.2 },
  wideBlast:   { id: 'wideBlast',   baseId: 'grenadier', branch: 'A', damageType: 'splash', splashPattern: 'wide5', splashDivisor: 4 },
  denseBlast:  { id: 'denseBlast',  baseId: 'grenadier', branch: 'B', damageType: 'splash', splashPattern: 'cross', splashDivisor: 1.5 },
};

export function formFor(baseId, branch) {
  return Object.values(UNIT_FORMS).find(f => f.baseId === baseId && f.branch === branch) ?? null;
}

export function currentFormId(unitLevels, baseId) {
  const state = unitLevels?.[baseId];
  if (!state?.branch) return baseId;
  return formFor(baseId, state.branch)?.id ?? baseId;
}
