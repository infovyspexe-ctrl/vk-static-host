// Classic mode keeps the entire army. Rewards fund additions and upgrades,
// not repurchasing casualties; exponential rewards trivialized chapter two.
export const ECONOMY = { firstReward: 120, rewardStep: 8, upgradeBaseMultiplier: 3.9, upgradeCostGrowth: 1.4 };
export const REWARD_EXCHANGE = { firstLevel:61 };
export function campaignReward(level) {
  return ECONOMY.firstReward + (level - 1) * ECONOMY.rewardStep;
}
