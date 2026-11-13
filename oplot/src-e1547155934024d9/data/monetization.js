// Initial VK policy. Timing is measured between actual ad openings, not battles.
export const MONETIZATION = {
  interstitialMs: 150000,
  retryMs: 30000,
  rewardedMs: 60000,
  reinforcement: [
    { kind: 'block', typeId: 'wood', count: 4 },
    { kind: 'unit', typeId: 'archer', count: 1 },
  ],
};
