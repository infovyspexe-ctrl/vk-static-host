// КОРАБЛИ — главная «морковка» жанра: игрок возвращается не за цифрой рекорда, а чтобы
// открыть следующий корабль и попробовать другой стиль забега.
//
// Открываются ЗА ДОСТИЖЕНИЯ, а не за валюту (поле `ship` в data/achievements.js).
// Причина: за кристаллы игрок и так покупает Лабораторию, и если корабли тоже продавать,
// вся мета сведётся к одной шкале «накопи побольше». Достижение — это ЗАДАЧА, и она
// заодно объясняет, что в игре вообще можно делать.
//
// Каждый корабль задаёт СТАРТОВОЕ ОРУЖИЕ и правку стартовых характеристик. Модификаторы
// сознательно двусторонние (плюс и минус): иначе последний открытый корабль просто лучше
// всех, и выбор снова исчезает.
export const SHIPS = [
  {
    id: 'scout', icon: 'player', name: 'ship_scout_name', desc: 'ship_scout_desc',
    weapon: 'blaster', free: true,
    apply: (s) => { s.speed = Math.round(s.speed * 1.2); }
  },
  {
    id: 'assault', icon: 'upg_maxhp', name: 'ship_assault_name', desc: 'ship_assault_desc',
    weapon: 'nova',
    apply: (s) => { s.maxHp = Math.round(s.maxHp * 1.2); s.speed = Math.round(s.speed * 0.9); }
  },
  {
    id: 'engineer', icon: 'upg_drone', name: 'ship_engineer_name', desc: 'ship_engineer_desc',
    weapon: 'orbiters',
    // Инженер играет от пассивов: ему разрешён лишний пассивный слот.
    apply: (s) => { s.extraPassiveSlots = 1; s.maxHp = Math.round(s.maxHp * 0.95); }
  },
  {
    id: 'sniper', icon: 'upg_range', name: 'ship_sniper_name', desc: 'ship_sniper_desc',
    weapon: 'laser',
    apply: (s) => { s.range = Math.round(s.range * 1.3); s.maxHp = Math.round(s.maxHp * 0.85); }
  }
];

export function shipById(id) {
  return SHIPS.find((s) => s.id === id) || SHIPS[0];
}

// Открыт ли корабль. Стартовый — всегда; остальные ждут своего достижения.
export function shipUnlocked(def, meta) {
  if (def.free) return true;
  return !!(meta && meta.ships && meta.ships[def.id]);
}
