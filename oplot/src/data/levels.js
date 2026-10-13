// Explicit formations, rewards governed by the same campaign resource curve.
import { campaignReward } from './economy.js';
import { rewardChoices } from './rewards.js';
import { TACTICAL_FORTS } from './tacticalForts.js';

const STRUCTURAL_BRIEFINGS={
  12:{briefing:'terracesRising',weakPoints:[[5,1],[10,1]]},
  17:{briefing:'terracesFalling',weakPoints:[[0,1],[5,1]]},
  22:{briefing:'terracesRising',weakPoints:[[6,1],[12,1]]},
  27:{briefing:'terracesFalling',weakPoints:[[0,1],[6,1]]},
};

export const LEVELS = Array.from({length:30},(_,i) => {
  const level=i+1;
  const cells = level === 1 ? [[1,1,'unit','shooter']]
    : level === 2 ? [[1,1,'unit','shooter'],[2,1,'unit','shooter']]
    : TACTICAL_FORTS[level];
  if (!cells) throw new Error(`Missing authored fortress ${level}`);
  return {level,boss:level%10===0,bonus:rewardChoices(level),reward:campaignReward(level),cells,
    ...(STRUCTURAL_BRIEFINGS[level]??{})};
});
