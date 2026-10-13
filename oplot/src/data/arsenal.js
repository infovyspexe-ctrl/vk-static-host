import { UNIT_FORMS } from './units.js';

// The first chapter introduces one new idea at a time. A reward may be used
// before the shop milestone: receiving a weapon is itself a valid introduction.
export const ARSENAL_UNLOCKS = {
  unit: { archer: 1, shooter: 4, cannon: 7, rocket: 9, grenadier: 11 },
  block: { wood: 1, brick: 1, iron: 5, gold: 8, shield: 12 },
};

export function arsenalBaseId(kind, typeId) {
  return kind === 'unit' ? (UNIT_FORMS[typeId]?.baseId ?? typeId) : typeId;
}

export function unlockLevel(kind, typeId) {
  return ARSENAL_UNLOCKS[kind]?.[arsenalBaseId(kind, typeId)] ?? 1;
}

export function isArsenalUnlocked(progress, kind, typeId) {
  if (progress.mode === 'missions') return true;
  const id = arsenalBaseId(kind, typeId);
  if (progress.level >= unlockLevel(kind, id)) return true;
  if ((progress.bonuses?.[kind]?.[id] ?? 0) > 0) return true;
  return [...progress.base.cells.values()].some(cell =>
    cell.kind === kind && arsenalBaseId(kind, cell.typeId) === id);
}

export function unlockedAtLevel(level) {
  const result=[];
  for (const kind of ['unit','block']) for (const [typeId, at] of Object.entries(ARSENAL_UNLOCKS[kind]))
    if (at === level) result.push({kind,typeId});
  return result;
}
