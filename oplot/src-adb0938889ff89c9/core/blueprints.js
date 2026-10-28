// Player blueprints are recipes, never free items or snapshots of upgrades.
import { createBase } from '../mechanics/gridbuild/base.js';
import { applyBlueprint } from '../mechanics/gridbuild/blueprint.js';
import { UNIT_FORMS, currentFormId } from '../data/units.js';
import { bonusCount, grantBonus } from './progress.js';

export function saveBlueprint(progress, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 2 || !progress.base.cells.size) return false;
  progress.blueprints[slot] = [...progress.base.cells.values()].map(c => [c.x, c.y, c.kind,
    c.kind === 'unit' ? (UNIT_FORMS[c.typeId]?.baseId ?? c.typeId) : c.typeId]);
  return true;
}

export function previewBlueprint(progress, slot) {
  const recipe = progress.blueprints?.[slot];
  if (!recipe?.length) return { ok: false, reason: 'empty' };
  const base = createBase({ width: progress.width, catalog: progress.catalog });
  const cells = recipe.map(([x, y, kind, id]) => [x, y, kind,
    kind === 'unit' ? currentFormId(progress.unitLevels, id) : id]);
  const result = applyBlueprint(base, cells);
  if (result.rejected.length) return { ok: false, reason: 'invalid' };

  const draft = { gold: progress.gold, bonuses: {
    unit: { ...progress.bonuses.unit }, block: { ...progress.bonuses.block },
  } };
  for (const c of progress.base.cells.values()) {
    if (c.paidWithBonus) grantBonus(draft, { ...c, count: 1 });
    else draft.gold += progress.catalog[c.kind === 'unit' ? 'units' : 'blocks'][c.typeId].cost;
  }
  for (const c of base.cells.values()) {
    if (bonusCount(draft, c.kind, c.typeId) > 0) {
      const id = c.kind === 'unit' ? (UNIT_FORMS[c.typeId]?.baseId ?? c.typeId) : c.typeId;
      draft.bonuses[c.kind][id]--;
      c.paidWithBonus = true;
    } else draft.gold -= progress.catalog[c.kind === 'unit' ? 'units' : 'blocks'][c.typeId].cost;
  }
  return { ok: draft.gold >= 0, reason: draft.gold < 0 ? 'no-gold' : null,
    missing: Math.max(0, -draft.gold), gold: draft.gold, base, bonuses: draft.bonuses };
}

export function deployBlueprint(progress, slot) {
  const draft = previewBlueprint(progress, slot);
  if (!draft.ok) return draft;
  // Commit only a fully affordable, valid recipe. Failure changes NOTHING.
  progress.gold = draft.gold;
  progress.base = draft.base;
  progress.bonuses = draft.bonuses;
  return { ok: true };
}
