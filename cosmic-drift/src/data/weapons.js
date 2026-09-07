// ОРУЖИЯ — только числа. Что оружие ДЕЛАЕТ, описано в mechanics/weapons/behaviors.js,
// правила набора (слоты, уровни, эволюции) — в mechanics/weapons/loadout.js.
//
// ПОЧЕМУ УРОН ЗДЕСЬ ПЛОСКИЙ, А НЕ ОТ state.damage:
// в первой версии игры весь урон шёл от одного числа игрока, и 15 из 21 апгрейда были
// процентами к нему — забег отличался от забега только цифрами. Теперь у каждого оружия
// свой урон, а апгрейд «Урон» превращается в МНОЖИТЕЛЬ (ctx.stats.damageMul) ко всем
// оружиям сразу. Так стат-апгрейды остаются полезными, но перестают быть единственным
// содержанием прокачки.
//
// levels — массив от 1-го уровня к последнему; длина = maxLevel.
// cd — секунды между срабатываниями (до множителя скорострельности игрока).
//
// needsTarget: true — оружие целится во врага (behaviors.js: aimAngle()/nearestEnemy()) и без
// цели стрелять НЕКУДА; тикер (mechanics/weapons/weapons.js) держит кулдаун готовым и не даёт
// выстрелу уйти в пустоту. Раньше флаг существовал в тикере, но не был проставлен НИ ОДНОМУ
// оружию — прицельные (бластер, лазер, рикошет, чёрная дыра) стреляли вслепую по направлению
// движения корабля, даже когда на карте вообще нет врагов (жалоба игрока 2026-08-22: «а мы уже
// стреляем куда-то вдаль»/«с чего вдруг»). Площадные/позиционные (нова, мины, орбитальные
// сферы) НЕ целятся в конкретного врага по смыслу — им needsTarget не нужен, они и должны
// срабатывать всегда.
export const WEAPONS = [
  // ── Одиночная цель. Стартовое оружие: ведёт себя как прежняя авто-стрельба ──
  {
    id: 'blaster', icon: 'upg_damage', name: 'wp_blaster_name', desc: 'wp_blaster_desc',
    maxLevel: 5, evolvesWith: 'multishot', evolvesTo: 'evo_storm', needsTarget: true,
    levels: [
      { dmg: 12, cd: 0.55, count: 1 },
      { dmg: 16, cd: 0.50, count: 1 },
      { dmg: 20, cd: 0.45, count: 2 },
      { dmg: 26, cd: 0.40, count: 2 },
      { dmg: 32, cd: 0.35, count: 3 }
    ]
  },
  // ── Кольцо-импульс вокруг игрока. Ответ на окружение ──
  {
    id: 'nova', icon: 'upg_explode', name: 'wp_nova_name', desc: 'wp_nova_desc',
    maxLevel: 5, evolvesWith: 'slowAura', evolvesTo: 'evo_frost',
    levels: [
      { dmg: 10, cd: 2.4, radius: 130 },
      { dmg: 14, cd: 2.2, radius: 150 },
      { dmg: 18, cd: 2.0, radius: 170 },
      { dmg: 24, cd: 1.8, radius: 190 },
      { dmg: 30, cd: 1.6, radius: 220 }
    ]
  },
  // ── Орбитальные сферы: таранный урон вплотную. Заменяют прежний пассив «дроны» ──
  {
    id: 'orbiters', icon: 'upg_drone', name: 'wp_orbiters_name', desc: 'wp_orbiters_desc',
    maxLevel: 5, evolvesWith: 'armor', evolvesTo: 'evo_aegis',
    levels: [
      { dmg: 8,  cd: 0.6, count: 1, orbit: 80 },
      { dmg: 10, cd: 0.6, count: 2, orbit: 84 },
      { dmg: 13, cd: 0.6, count: 2, orbit: 88 },
      { dmg: 16, cd: 0.6, count: 3, orbit: 92 },
      { dmg: 20, cd: 0.6, count: 4, orbit: 96 }
    ]
  },
  // ── Луч: бьёт по линии, пробивает строй ──
  {
    id: 'laser', icon: 'upg_range', name: 'wp_laser_name', desc: 'wp_laser_desc',
    maxLevel: 5, evolvesWith: 'crit', evolvesTo: 'evo_prism', needsTarget: true,
    levels: [
      { dmg: 6,  cd: 0.25, length: 300, width: 18 },
      { dmg: 8,  cd: 0.25, length: 340, width: 20 },
      { dmg: 10, cd: 0.25, length: 380, width: 22 },
      { dmg: 13, cd: 0.25, length: 420, width: 26 },
      { dmg: 16, cd: 0.25, length: 480, width: 30 }
    ]
  },
  // ── Мины за спиной: награда за кайтинг ──
  {
    id: 'mines', icon: 'upg_thorns', name: 'wp_mines_name', desc: 'wp_mines_desc',
    maxLevel: 5, evolvesWith: 'explodeOnKill', evolvesTo: 'evo_cluster',
    levels: [
      { dmg: 22, cd: 2.6, radius: 90, fuse: 8 },
      { dmg: 28, cd: 2.4, radius: 90, fuse: 8 },
      { dmg: 36, cd: 2.2, radius: 100, fuse: 8 },
      { dmg: 46, cd: 2.0, radius: 100, fuse: 8 },
      { dmg: 58, cd: 1.8, radius: 110, fuse: 8 }
    ]
  },
  // ── Рикошет: шар скачет по толпе ──
  {
    id: 'ricochet', icon: 'upg_chain', name: 'wp_ricochet_name', desc: 'wp_ricochet_desc',
    maxLevel: 5, needsTarget: true,
    levels: [
      { dmg: 10, cd: 1.6, bounces: 2, jump: 260 },
      { dmg: 13, cd: 1.5, bounces: 3, jump: 260 },
      { dmg: 16, cd: 1.4, bounces: 4, jump: 280 },
      { dmg: 20, cd: 1.3, bounces: 5, jump: 280 },
      { dmg: 25, cd: 1.2, bounces: 6, jump: 300 }
    ]
  },
  // ── Чёрная дыра: контроль толпы ──
  {
    id: 'blackhole', icon: 'upg_slow', name: 'wp_blackhole_name', desc: 'wp_blackhole_desc',
    maxLevel: 5, needsTarget: true,
    levels: [
      { dps: 8,  cd: 6.0, radius: 160, duration: 2.5, pull: 220 },
      { dps: 10, cd: 5.6, radius: 160, duration: 2.5, pull: 220 },
      { dps: 13, cd: 5.2, radius: 175, duration: 2.8, pull: 240 },
      { dps: 16, cd: 4.8, radius: 175, duration: 2.8, pull: 240 },
      { dps: 20, cd: 4.4, radius: 190, duration: 3.0, pull: 260 }
    ]
  }
];

// ЭВОЛЮЦИИ. Появляются в выборе гарантированно, когда базовое оружие на максимуме,
// а парный пассив прокачан не ниже EVOLUTION_PASSIVE_LEVEL. Заменяют базовое оружие
// в том же слоте — это и есть «цель забега», ради которой билд собирают осмысленно.
export const EVOLUTIONS = [
  {
    id: 'evo_storm', from: 'blaster', icon: 'upg_multishot',
    name: 'wp_storm_name', desc: 'wp_storm_desc', maxLevel: 1, needsTarget: true,
    levels: [{ dmg: 30, cd: 0.32, count: 8, spread: 1.1, pierce: 3 }]
  },
  {
    id: 'evo_frost', from: 'nova', icon: 'upg_slow',
    name: 'wp_frost_name', desc: 'wp_frost_desc', maxLevel: 1,
    levels: [{ dmg: 34, cd: 1.5, radius: 240, freeze: 1.5 }]
  },
  {
    id: 'evo_aegis', from: 'orbiters', icon: 'upg_armor',
    name: 'wp_aegis_name', desc: 'wp_aegis_desc', maxLevel: 1,
    levels: [{ dmg: 24, cd: 0.5, count: 5, orbit: 100, blocks: true }]
  },
  {
    id: 'evo_prism', from: 'laser', icon: 'upg_crit',
    name: 'wp_prism_name', desc: 'wp_prism_desc', maxLevel: 1, needsTarget: true,
    levels: [{ dmg: 18, cd: 0.22, length: 520, width: 32, split: 0.52 }]
  },
  {
    id: 'evo_cluster', from: 'mines', icon: 'upg_explode',
    name: 'wp_cluster_name', desc: 'wp_cluster_desc', maxLevel: 1,
    levels: [{ dmg: 62, cd: 1.7, radius: 120, fuse: 8, sublings: 4, subDmg: 26, subRadius: 70 }]
  }
];

// Сколько уровней парного пассива нужно, чтобы эволюция стала доступна.
export const EVOLUTION_PASSIVE_LEVEL = 3;

// Слоты. Три оружия — читаемо на портретном экране и заставляет ВЫБИРАТЬ, а не собирать всё.
export const WEAPON_SLOTS = 3;
// Было 4 — пул из 21 пассива пересыхал уже к 12 уровню (замечено игроком): как только
// заняты 4 слота, остальные 17 закрыты НАВСЕГДА до конца забега, а игра бесконечная и
// не должна упираться в потолок выбора раньше, чем упрётся в сложность волн. 6 — всё ещё
// реальный выбор (6 из 21, ýже отбор, чем у оружия 3 из 7), но с заметно большим запасом.
export const PASSIVE_SLOTS = 6;

// Стартовое оружие забега (у кораблей Вехи 3 будет своё).
export const STARTING_WEAPON = 'blaster';
