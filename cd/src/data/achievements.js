// ДОСТИЖЕНИЯ — только данные.
//
// Условие выражено ДАННЫМИ (имя счётчика + порог), а не функцией: таблица остаётся чистыми
// данными по конвенциям, добавление достижения — одна строка, а тест сверяет, что каждый
// счётчик РЕАЛЬНО существует в meta.stats. Опечатка в имени иначе молча делает достижение
// невыдаваемым: сравнение с undefined всегда даёт false, и никто этого не заметит.
// Приём перенесён из games/pizza-mafia вместе с модулем.
//
// Поля:
//   id     — ключ локализации: ach_<id> (название) и ach_<id>_desc (условие)
//   reward — сколько КРИСТАЛЛОВ даём при выдаче
//   stat   — имя счётчика в meta.stats
//   gte    — порог выдачи
//   ship   — какой корабль открывает (необязательно)
//
// Зачем это игре: до сих пор единственной целью было число рекорда. Достижения дают
// список понятных задач тому, кто уже освоился, и служат ключами к кораблям — то есть
// открывают КОНТЕНТ, а не просто хвалят.
export const ACHIEVEMENTS = [
  // ── Первые шаги: закрываются почти сами, показывают, что система работает ──
  { id: 'first_run',    reward: 5,   stat: 'runs',        gte: 1 },
  { id: 'kills_100',    reward: 10,  stat: 'kills',       gte: 100 },
  { id: 'kills_1000',   reward: 40,  stat: 'kills',       gte: 1000 },
  { id: 'kills_5000',   reward: 120, stat: 'kills',       gte: 5000 },

  // ── Глубина забега ──
  { id: 'wave_5',       reward: 10,  stat: 'maxWave',     gte: 5 },
  { id: 'wave_10',      reward: 25,  stat: 'maxWave',     gte: 10 },
  { id: 'wave_20',      reward: 80,  stat: 'maxWave',     gte: 20, ship: 'sniper' },
  { id: 'wave_30',      reward: 200, stat: 'maxWave',     gte: 30 },

  // ── Боссы и элиты ──
  { id: 'boss_1',       reward: 15,  stat: 'bossKills',   gte: 1 },
  { id: 'boss_25',      reward: 90,  stat: 'bossKills',   gte: 25, ship: 'assault' },
  { id: 'elite_10',     reward: 30,  stat: 'elitesKilled', gte: 10 },

  // ── Билды: ради этого и делалась Веха 2 ──
  { id: 'evo_1',        reward: 30,  stat: 'evolutions',  gte: 1 },
  { id: 'evo_3',        reward: 100, stat: 'evolutions',  gte: 3, ship: 'engineer' },
  { id: 'maxed_2',      reward: 60,  stat: 'weaponsMaxed', gte: 2 },

  // ── Возвращаемость ──
  { id: 'days_3',       reward: 40,  stat: 'daysPlayed',  gte: 3 },
  { id: 'days_7',       reward: 120, stat: 'daysPlayed',  gte: 7 },

  // ── Пара необычных: методика площадок просит их, и они дают повод рассказать об игре ──
  // «Ни царапины» — волна без единого полученного урона. «Минёр» — босс, убитый минами.
  { id: 'flawless',     reward: 70,  stat: 'flawlessWaves', gte: 1 },
  { id: 'sapper',       reward: 70,  stat: 'bossByMines',  gte: 1 }
];

// Счётчики прогресса с нуля. Тест сверяет этот список с полем stat каждого достижения.
export function defaultStats() {
  return {
    runs: 0, kills: 0, maxWave: 0, maxLevel: 0, bossKills: 0, elitesKilled: 0,
    crystalsTotal: 0, evolutions: 0, weaponsMaxed: 0, revives: 0,
    daysPlayed: 0, flawlessWaves: 0, bossByMines: 0
  };
}
