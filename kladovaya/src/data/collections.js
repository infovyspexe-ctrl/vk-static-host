// КОЛЛЕКЦИИ (заказы). Каталог именных наборов из трёх банок. Активный заказ
// всегда один; собрал три нужные банки в кладовой — они закатываются в одну
// коллекционную банку: банки-компоненты списываются, начисляется бонус очков,
// коллекционная банка встаёт на полку коллекции.
//
// Название берётся из i18n по ключу col_<id>. Бонус ≈ сумма CAPTURE_SCORE
// компонентов × 2, круглыми числами — прогрессия от дешёвых наборов к дорогим.
// Порядок выдачи заказов: несобранные от дешёвых к дорогим (кривая сложности),
// когда собраны все — случайный повтор ради очков.
export const COLLECTIONS = [
  { id: 'summer_compote', components: [['fruit', 0], ['fruit', 1], ['fruit', 2]], bonus: 80 },
  { id: 'borsch', components: [['veg', 0], ['veg', 1], ['veg', 3]], bonus: 120 },
  { id: 'dacha_breakfast', components: [['veg', 0], ['veg', 2], ['veg', 3]], bonus: 130 },
  { id: 'field_lunch', components: [['veg', 0], ['veg', 1], ['veg', 4]], bonus: 170 },
  { id: 'grandma_secret', components: [['fruit', 0], ['fruit', 3], ['fruit', 4]], bonus: 230 },
  { id: 'fruit_salad', components: [['fruit', 2], ['fruit', 3], ['fruit', 4]], bonus: 260 },
  { id: 'winter_stock', components: [['veg', 2], ['veg', 3], ['veg', 5]], bonus: 340 },
  { id: 'harvest_feast', components: [['fruit', 3], ['veg', 4], ['veg', 6]], bonus: 540 },
  { id: 'tropic_mix', components: [['fruit', 1], ['fruit', 5], ['fruit', 6]], bonus: 560 },
  { id: 'autumn_cellar', components: [['veg', 4], ['veg', 5], ['veg', 6]], bonus: 680 },
  { id: 'sweet_shelf', components: [['fruit', 4], ['fruit', 5], ['fruit', 6]], bonus: 680 },
  { id: 'royal_pantry', components: [['fruit', 5], ['fruit', 6], ['veg', 6]], bonus: 860 }
];

export function collectionById(id) {
  return COLLECTIONS.find((c) => c.id === id) || null;
}

// Ярмарка — бесконечная петля: собраны ВСЕ коллекции → набор (по одной банке
// каждой) обменивается на крупный бонус, сезон закрывается, сбор начинается
// заново. Сумма бонусов всех 12 рецептов ≈ 4650, ярмарка даёт больше — это
// событие-праздник раз в несколько часов игры.
export const SEASON_BONUS = 5000;
