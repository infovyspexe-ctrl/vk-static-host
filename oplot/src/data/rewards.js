// Gifts share a resource envelope: no pair of free heavy troops every round.
// Early troops are introduced one at a time, heavy reinforcements at milestones.
import { BLOCKS } from './blocks.js';
const EARLY_UNITS = ['archer','archer','shooter','shooter','archer','cannon','shooter','rocket','archer','grenadier'];
const LATE_UNITS = ['archer','shooter','cannon','archer','rocket','shooter','cannon','archer','grenadier','rocket'];
export function rewardChoices(level) {
  const typeId = level<=10 ? EARLY_UNITS[level-1] : LATE_UNITS[(level-11)%10];
  const count = typeId==='archer' ? 2 : typeId==='shooter' && level>10 ? 2 : 1;
  const materials = level<=3 ? ['wood','brick'] : level<=6 ? ['brick','iron'] : ['iron','gold'];
  const budget = level<=3 ? 36 : level<=6 ? 48 : level<=10 ? 90 : 120;
  return [{kind:'unit',typeId,count},...materials.map(typeId=>({kind:'block',typeId,
    count:Math.max(1,Math.floor(budget/BLOCKS[typeId].cost))}))];
}
