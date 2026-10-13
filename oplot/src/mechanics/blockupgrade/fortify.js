// Fortress upgrades are deliberately steadier than unit upgrades: one purchase
// affects every block of a material, so explosive 30% growth would quickly make
// the whole campaign harmless.
export const BLOCK_HP_GROWTH = 1.18;
export const BLOCK_COST_GROWTH = 1.55;
export const BLOCK_UPGRADE_COST_MULTIPLIER = 8;
export const SHIELD_REFLECT_STEP = 0.025;
export const SHIELD_REFLECT_CAP = 0.4;

export function blockUpgradeCost(block, level) {
  return Math.round(block.cost * BLOCK_UPGRADE_COST_MULTIPLIER * Math.pow(BLOCK_COST_GROWTH, level - 1));
}

export function effectiveBlockSpec(block, level = 0) {
  const safeLevel = Number.isInteger(level) && level > 0 ? level : 0;
  return {
    ...block,
    hp: Math.round(block.hp * Math.pow(BLOCK_HP_GROWTH, safeLevel)),
    reflect: block.reflect
      ? Math.min(SHIELD_REFLECT_CAP, block.reflect + SHIELD_REFLECT_STEP * safeLevel)
      : 0,
  };
}

export function buildBlockTable(blocks, levels = {}) {
  return Object.fromEntries(Object.entries(blocks).map(([id, block]) =>
    [id, effectiveBlockSpec(block, levels[id] ?? 0)]));
}
