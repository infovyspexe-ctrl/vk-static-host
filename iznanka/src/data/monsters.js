// МОНСТРЫ по ярусам глубины. tierFloors — [минЭтаж, максЭтаж) для обычного спавна.
// behavior — ключ, который читает src/mechanics/dungeon/ai.js.
export const MONSTERS = {
  kikimora: {
    id: 'kikimora', icon: 'mon_kikimora', tier: 1,
    hp: 6, atk: 2, def: 0, behavior: 'erratic', spiritDrop: [1, 2]
  },
  bolotnik: {
    id: 'bolotnik', icon: 'mon_bolotnik', tier: 1,
    hp: 12, atk: 3, def: 2, behavior: 'slow', spiritDrop: [1, 3]
  },
  upyr: {
    id: 'upyr', icon: 'mon_upyr', tier: 2,
    hp: 10, atk: 4, def: 1, behavior: 'fast', spiritDrop: [2, 4]
  },
  polunochnitsa: {
    id: 'polunochnitsa', icon: 'mon_polunochnitsa', tier: 2,
    hp: 8, atk: 3, def: 0, behavior: 'ranged', range: 3, stunChance: 0.3, spiritDrop: [2, 4]
  },
  leshy: {
    id: 'leshy', icon: 'mon_leshy', tier: 3,
    hp: 16, atk: 5, def: 2, behavior: 'summonRoots', spiritDrop: [3, 5],
    rootRange: 4, rootCooldown: 4 // корни: раз в 4 хода по прямой видимости (см. ai.js)
  },
  rusalka: {
    id: 'rusalka', icon: 'mon_rusalka', tier: 3,
    hp: 10, atk: 4, def: 1, behavior: 'pull', range: 3, spiritDrop: [3, 5]
  }
};

export const MONSTER_TIERS = {
  1: ['kikimora', 'bolotnik'],
  2: ['upyr', 'polunochnitsa'],
  3: ['leshy', 'rusalka']
};

// Ярус монстров по глубине этажа (не путать с ярусом босса — свой цикл каждые 5).
export function tierForFloor(floor) {
  if (floor <= 5) return 1;
  if (floor <= 10) return 2;
  return 3; // с 11 этажа и глубже, дальше только масштабирование статов
}

export const BOSSES = {
  bannik: {
    id: 'bannik', icon: 'boss_bannik', floor: 5,
    hp: 40, atk: 6, def: 2, behavior: 'bossSteam', spiritDrop: [15, 20]
  },
  babayaga: {
    id: 'babayaga', icon: 'boss_babayaga', floor: 10,
    hp: 60, atk: 8, def: 3, behavior: 'bossSummon', spiritDrop: [20, 28]
  },
  koschei: {
    id: 'koschei', icon: 'boss_koschei', floor: 15,
    hp: 90, atk: 10, def: 4, behavior: 'bossRegen', spiritDrop: [30, 40]
  }
};

export const BOSS_ORDER = ['bannik', 'babayaga', 'koschei'];

// Каждые 5 этажей после 15-го бой повторяет Кощея с масштабированием (см. balance.js).
export function bossForFloor(floor) {
  if (floor === 5) return BOSSES.bannik;
  if (floor === 10) return BOSSES.babayaga;
  return BOSSES.koschei; // 15, 20, 25... — масштабируется отдельно
}

export function isBossFloor(floor) {
  return floor > 0 && floor % 5 === 0;
}
