// Поставщик описания уровня. Уровни 1-30 берутся из LEVELS как есть, дальше —
// процедурная генерация. Обе ветки возвращают одинаковую форму
// {level, reward, boss, bonus, cells} — сцены не обязаны знать, откуда взялся уровень.

import { LEVELS } from './levels.js';
import { rewardChoices } from './rewards.js';
import { widthForLevel } from './field.js';
import { generateFortress, templateFor } from '../mechanics/gridbuild/fortress.js';
import { ENDLESS, trainingForLevel, tacticsForLevel, enduranceForLevel, ENDURANCE_TRAINING } from './endless.js';
import { enemyTables, fortressPower } from '../core/enemyForLevel.js';
import { firstHundredFort } from './firstHundred.js';

// Шаг награды после авторских уровней = реальный прирост между двумя последними авторскими
// уровнями (не хардкод): так константа не может устареть, если LEVELS изменится в будущем.
// До Вехи 3 (когда LEVELS.length был 10) здесь стояло фиксированное число 105, откалиброванное
// по шагу 9→10 — оно перестало быть верным, когда главы 2-3 подняли последний авторский шаг
// до 3030 (16930→19960 на уровнях 29→30), и давало необоснованный обрыв на переходе 30→31.
const REWARD_STEP = LEVELS[LEVELS.length - 1].reward - LEVELS[LEVELS.length - 2].reward;

function generatedReward(level) {
  const last = LEVELS[LEVELS.length - 1];
  return last.reward + (level - last.level) * REWARD_STEP;
}

// Продолжение стоимости многоярусных авторских батарей, а не старого
// одноэтажного бюджета. Не зависит от кошелька или улучшений игрока.
function generatedBudget(level) {
  return ENDLESS.firstBudget + (level - 31) * ENDLESS.budgetStep;
}

export function levelSpecFor(level, catalog) {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError('Invalid level');
  if (level <= LEVELS.length) return LEVELS[level - 1];

  const width = widthForLevel(level);
  const boss = level % 10 === 0;
  const budget = generatedBudget(level);
  const variation=firstHundredFort(level);
  const cells = generateFortress({ level, width, budget, catalog, boss, variation });
  const spent = cells.reduce((sum,c)=>sum+catalog[c[2]==='unit'?'units':'blocks'][c[3]].cost,0);
  const training = trainingForLevel(level);
  const tactics=variation?.tactics??tacticsForLevel(level,templateFor(level));
  const endurance=enduranceForLevel(level);
  const trained=enemyTables({training,tactics,endurance});
  const targetPower=fortressPower(LEVELS[LEVELS.length-1].cells)*Math.sqrt(budget/ENDLESS.firstBudget)*training*Math.pow(endurance,ENDURANCE_TRAINING.powerGrowth);
  const strength=targetPower/fortressPower(cells,trained.units,trained.blocks);

  return {
    level,
    boss,
    reward: generatedReward(level),
    bonus: rewardChoices(level),
    cells,
    budget, spent, strength, training, tactics, endurance, targetPower,
    style: variation?.shape??templateFor(level), generation: ENDLESS.version,
    // A few encounters change the battle itself: an already scouted second
    // army arrives after the first falls. No extra reward or hidden stat boost.
    ...(level <= 100 && [44,64,84].includes(level) ? {waves:[level-13]} : {}),
  };
}
