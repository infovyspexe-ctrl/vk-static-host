// ТОЧКИ КОНТРОЛЯ «Решала» (CONVENTIONS.md, раздел 11).
// Вызываются через Analytics.event(EVENTS.XXX, { параметры }) или Analytics.first(EVENTS.XXX)
// (first — «раз за всю жизнь игрока», для *_first_use и вех). В Метрике станут целями.
// Формат строк парсит library/tools/metrika.py — по событию на строку, имя в одинарных кавычках.
export const EVENTS = {
  // сессия
  GAME_START: 'game_start',                 // игра загрузилась, сессия началась (main.js)
  SESSION_END: 'session_end',               // конец сессии ({ best_days, runs }) — pagehide/сворачивание

  // режимы (два режима: «Срок» endless и «Побег» campaign)
  ENDLESS_STARTED: 'endless_started',       // старт забега «Срок» (каждый забег)
  ENDLESS_FIRST_USE: 'endless_first_use',   // первый в жизни забег «Срок» (first)
  CAMPAIGN_STARTED: 'campaign_started',     // старт кампании «Побег» (каждый забег)
  CAMPAIGN_FIRST_USE: 'campaign_first_use', // первая в жизни кампания «Побег» (first)

  // исходы забега
  RUN_ENDED: 'run_ended',                   // забег окончен поражением ({ mode, days, reason })
  ESCAPE_WIN: 'escape_win',                 // побег удался ({ days, block })

  // вехи прогресса
  DAY_10_REACHED: 'day_10_reached',         // дожил до 10-го дня в «Сроке» (first)
  DAY_25_REACHED: 'day_25_reached',         // дожил до 25-го дня в «Сроке» (first)
  DAY_50_REACHED: 'day_50_reached',         // дожил до 50-го дня в «Сроке» (first)
  COLLECTION_FULL: 'collection_full',       // встречены все 13 персонажей коллекции (first)

  // экраны
  COLLECTION_OPENED: 'collection_opened',   // открыл экран коллекции
  HOWTO_OPENED: 'howto_opened',             // открыл «Как играть»

  // мини-игра (вторая механика — §11 требует свои точки контроля)
  MINIGAME_STARTED: 'minigame_started',     // запустил мини-игру ({ theme }, каждый раз)
  MINIGAME_FIRST_USE: 'minigame_first_use', // первая в жизни мини-игра (first)
  MINIGAME_WON: 'minigame_won',             // победа в мини-игре ({ theme })
  MINIGAME_LOST: 'minigame_lost',           // провал в мини-игре ({ theme })
};
