// ДОСТИЖЕНИЯ — только данные.
//
// Условие выражено ДАННЫМИ (имя счётчика + порог), а не функцией: так таблица остаётся
// чистыми данными по конвенциям (числа в data/, логика в meta/), её можно пересчитать
// тестом на согласованность со счётчиками прогресса, и добавление достижения — это одна
// строка, а не новая функция.
//
// Поля:
//   id     — ключ локализации: ach_<id> (название) и ach_<id>_desc (условие)
//   reward — сколько монет даём при выдаче
//   stat   — имя счётчика в progress.stats
//   gte    — порог, при котором достижение выдаётся
//
// Тон комический, без насилия — как и вся игра. Три последних намеренно «несерьёзные»:
// методика площадок просит пару необычных достижений, они дают повод рассказать об игре
// и снимают ощущение, что список — только про гринд.
export const ACHIEVEMENTS = [
  { id: 'first_pizza',     reward: 30,  stat: 'servedTotal',     gte: 1 },
  { id: 'exact_5',         reward: 80,  stat: 'bestCombo',       gte: 5 },
  { id: 'exact_10',        reward: 200, stat: 'bestCombo',       gte: 10 },
  { id: 'clean_shift',     reward: 150, stat: 'cleanShifts',     gte: 1 },
  { id: 'fast_capo',       reward: 120, stat: 'fastCapo',        gte: 1 },
  { id: 'district_1',      reward: 100, stat: 'districtsDone',   gte: 1 },
  { id: 'district_all',    reward: 600, stat: 'districtsDone',   gte: 4 },
  { id: 'oven_two',        reward: 100, stat: 'oven2Bought',     gte: 1 },
  { id: 'served_100',      reward: 250, stat: 'servedTotal',     gte: 100 },
  { id: 'served_500',      reward: 700, stat: 'servedTotal',     gte: 500 },
  { id: 'don_perfect',     reward: 300, stat: 'donOrdersOk',     gte: 3 },
  { id: 'no_ads_shift',    reward: 150, stat: 'cleanNoAdShifts', gte: 1 },
  { id: 'pineapple_troll', reward: 50,  stat: 'pineappleTroll',  gte: 1 },
  { id: 'burnt_10',        reward: 50,  stat: 'burntTotal',      gte: 10 },
  { id: 'night_owl',       reward: 300, stat: 'nightShifts',     gte: 5 }
];
