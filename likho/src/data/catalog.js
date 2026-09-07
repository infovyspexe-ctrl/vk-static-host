// СБОРКА КАТАЛОГА. Движок забега (`mechanics/deckrun/`) не импортирует данные сам —
// он получает готовый каталог снаружи и потому остаётся замкнутым модулем, годным
// для другой игры. Здесь же проставляются цены карт по редкости: держать цену в каждой
// карточке — 80 мест, где можно ошибиться, вместо одной таблицы.
import { CARDS } from './cards.js';
import { ENEMIES } from './enemies.js';
import { RELICS } from './relics.js';
import { EVENTS } from './events.js';
import { HEROES } from './heroes.js';

const PRICE_BY_RARITY = { basic: 40, common: 52, uncommon: 78, rare: 150, curse: 0 };

const cards = {};
for (const [id, def] of Object.entries(CARDS)) {
  cards[id] = { id, price: PRICE_BY_RARITY[def.rarity] ?? 60, ...def };
}

export const CATALOG = {
  cards,
  cardIds: Object.keys(cards),
  enemies: ENEMIES,
  enemyIds: Object.keys(ENEMIES),
  relics: RELICS,
  relicIds: Object.keys(RELICS),
  events: EVENTS,
  eventIds: Object.keys(EVENTS),
  heroes: HEROES,
  heroIds: Object.keys(HEROES).sort((a, b) => HEROES[a].order - HEROES[b].order),
};
