// ДЕРЕВО ПРОКАЧКИ ДЕРЕВНИ. Конфиг для SkillTreeModel (src/mechanics/skilltree/skilltree.js).
// Все четыре ветки бесконечные (формула costBase*costMult^level), эффект аддитивный
// 1 + effectPer*level — по опыту «Осуши озеро»: конечная прокачка кончается и остаток
// игры валюту девать некуда (CONVENTIONS.md следует правилу «сначала свой склад»).
export const META_BRANCHES = {
  vitality: { costBase: 15, costMult: 1.35, effectPer: 0.06 },  // +6% макс. HP за уровень
  strength: { costBase: 15, costMult: 1.35, effectPer: 0.05 },  // +5% атаки за уровень
  wisdom: { costBase: 15, costMult: 1.35, effectPer: 0.05 },    // +5% урон/лечение скиллов
  fortune: { costBase: 20, costMult: 1.40, effectPer: 0.08 }    // +8% выпадения духа за уровень
};

export const META_BRANCH_ORDER = ['vitality', 'strength', 'wisdom', 'fortune'];

// Стартовый набор — конечная ветка (список цен по уровням), не через SkillTreeModel:
// 1) бесплатный переброс реликвии в начале КАЖДОГО этажа; 2) стартовое зелье лечения.
export const START_KIT = {
  id: 'startKit',
  levels: [
    { cost: 100, id: 'freeReroll' },
    { cost: 300, id: 'startPotion' }
  ]
};
