// РЕЛИКВИИ. Пассивные эффекты, которые выбираются драфтом (1 из 3) после каждого
// этажа в src/mechanics/dungeon/run.js. effect — ключ, который читает combat.js/run.js,
// value — параметр эффекта. Реликвии складываются (можно взять одну повторно, кроме
// уникальных — see unique:true).
export const RELICS = [
  { id: 'upyrClaw', icon: 'relic_claw', effect: 'meleeDmgPct', value: 0.2 },
  { id: 'ladanka', icon: 'relic_ladanka', effect: 'maxHpFlat', value: 4 },
  { id: 'fastFeet', icon: 'relic_boots', effect: 'moveRange', value: 1, unique: true },
  { id: 'dedovPosokh', icon: 'relic_posokh', effect: 'cdReduction', value: 1 },
  { id: 'soltGrain', icon: 'relic_sol', effect: 'enemyMissChance', value: 0.2 },
  { id: 'wolfFang', icon: 'relic_fang', effect: 'lifestealOnKill', value: 2 },
  { id: 'clubok', icon: 'relic_clubok', effect: 'extraChest', value: 1, unique: true },
  { id: 'plakuchayaIva', icon: 'relic_iva', effect: 'rootOnHitChance', value: 0.15 },
  { id: 'hlebnayaKrayukha', icon: 'relic_hleb', effect: 'freeReroll', value: 1 },
  { id: 'kotBayun', icon: 'relic_kot', effect: 'enemySkipTurnChance', value: 0.12 },
  { id: 'pechatMoreny', icon: 'relic_pechat', effect: 'reviveOnce', value: 1, unique: true, rare: true },
  { id: 'solntseOberog', icon: 'relic_solntse', effect: 'healOnFloorClearPct', value: 0.3 },
  { id: 'oberegSchit', icon: 'relic_oberegSchit', effect: 'defFlat', value: 2 },
  { id: 'oberegVolkhva', icon: 'relic_oberegVolkhva', effect: 'skillDmgPct', value: 0.2 },
  { id: 'oberegUdachi', icon: 'relic_oberegUdachi', effect: 'fortunePct', value: 0.15 },
  { id: 'oberegStrazha', icon: 'relic_oberegStrazha', effect: 'enemyAtkPct', value: 0.08 }
];

export const RELICS_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));
