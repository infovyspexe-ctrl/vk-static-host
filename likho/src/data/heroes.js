// ГЕРОИ. Стартовая колода задана парами [id карты, сколько штук] — так видно состав
// одним взглядом и не надо считать повторы в длинном списке.
//
// Разное здоровье — не «баланс ради баланса», а способ читать роль до первой карты:
// Ратник переживает ошибку, Ведунья за ту же ошибку платит. Числа подрезаны под забег
// в 12 этажей: в жанровом каноне (80 HP на 17 этажей) запаса хватало на более длинный путь.
export const HEROES = {
  ratnik: {
    id: 'ratnik', art: 'hero_ratnik', order: 1,
    maxHp: 82, startGold: 99, relic: 'burnaya_krov',
    startDeck: [['udar', 5], ['zaslon', 4], ['natisk', 1]],
    unlock: null,                       // доступен сразу
  },
  vedunya: {
    id: 'vedunya', art: 'hero_vedunya', order: 2,
    maxHp: 68, startGold: 99, relic: 'nauznaya_nit',
    startDeck: [['udar', 4], ['zaslon', 4], ['morok', 2]],
    unlock: 'boss1',                    // открыть: победить Лешего
  },
  oboroten: {
    id: 'oboroten', art: 'hero_oboroten', order: 3,
    maxHp: 74, startGold: 99, relic: 'lunnyy_amulet',
    startDeck: [['kogti', 5], ['zaslon', 4], ['oskal', 1]],
    unlock: 'boss2',                    // открыть: победить Водяного Царя
  },
};
