import { createProgress } from './progress.js';
import { FIELD, widthForLevel } from '../data/field.js';
import { UNITS, UNIT_FORMS } from '../data/units.js';
import { BLOCKS } from '../data/blocks.js';

export function newCampaign() {
  const units = { ...UNITS };
  for (const form of Object.values(UNIT_FORMS)) units[form.id] = { ...UNITS[form.baseId], id: form.id };
  return createProgress({ startGold: FIELD.startGold, width: widthForLevel(1), catalog: { units, blocks: BLOCKS } });
}
