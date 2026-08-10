// ГЕРОИ. Числа отдельно от логики (CONVENTIONS.md §4). Урон/лечение скиллов
// считаются как множитель от atk конкретного героя — см. src/mechanics/dungeon/combat.js.
// cd — кулдаун в ходах ИГРОКА (не мировых тиках).
export const HEROES = {
  bogatyr: {
    id: 'bogatyr',
    icon: 'hero_bogatyr',
    baseHp: 30,
    baseAtk: 6,
    baseDef: 2,
    unlockCost: 0, // открыт всегда
    skills: [
      { id: 'heavyHit', dmgMult: 2.2, cd: 3, kind: 'melee' },
      { id: 'shieldBlock', cd: 4, kind: 'block' } // блокирует весь урон следующей атаки
    ]
  },
  vedunia: {
    id: 'vedunia',
    icon: 'hero_vedunia',
    baseHp: 20,
    baseAtk: 4,
    baseDef: 0,
    unlockCost: 150,
    skills: [
      { id: 'fireball', dmgMult: 2.5, cd: 2, kind: 'ranged', range: 3 },
      { id: 'amulet', healFlat: 8, cd: 5, kind: 'heal' }
    ]
  },
  skomorokh: {
    id: 'skomorokh',
    icon: 'hero_skomorokh',
    baseHp: 26, // было 22 — по данным баланса (200 симуляций/герой) в среднем доходил только
    // до 2.46 этажа против 5.14 у Богатыря и 4.30 у Ведуньи: ни урона, ни лечения в наборе
    // навыков нет вообще (rolling+stun), целиком зависел от рядового обычного удара
    baseAtk: 4,
    baseDef: 1,
    unlockCost: 350,
    skills: [
      // Задевает врагов на пути малым уроном (было — просто перепрыгивает, игнорируя врагов
      // полностью) — даёт герою источник урона помимо обычного удара, не ломая роль «рывок».
      { id: 'roll', cd: 2, kind: 'dash', range: 2, dmgMult: 0.5 },
      { id: 'laughter', cd: 4, kind: 'stunAdjacent', turns: 1 }
    ]
  }
};

export const HERO_ORDER = ['bogatyr', 'vedunia', 'skomorokh'];
