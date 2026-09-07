// ТОЧКИ КОНТРОЛЯ. Каталог событий игры для воронок в Яндекс.Метрике.
// Добавил событие сюда — прогони `python library/tools/metrika.py sync games/likho`,
// иначе Метрика молча выбросит событие без цели (CONVENTIONS.md §11).
export const EVENTS = {
  // Обязательный минимум
  GAME_START: 'game_start',           // начат поход
  APP_LAUNCH: 'app_launch',
  FIRST_LAUNCH: 'first_launch',
  RETURN_DAY: 'return_day',
  TUTORIAL_STEP: 'tutorial_step',
  SESSION_END: 'session_end',         // поход завершён (параметр: слава)

  // Воронка похода — по ней видно, где игроки сливаются
  RUN_START: 'run_start',             // { hero }
  PROGRESS_REACHED: 'progress_reached', // { act, floor }
  ACT_CLEARED: 'act_cleared',         // { act }
  RUN_WIN: 'run_win',
  RUN_LOSE: 'run_lose',               // { act, floor }
  BOSS_KILLED: 'boss_killed',         // { boss }

  // Второстепенные механики: отличаем «заглянул» от «пользуется»
  ALTAR_OPENED: 'altar_opened',
  ALTAR_FIRST_USE: 'altar_first_use',
  SHOP_OPENED: 'shop_opened',
  SHOP_FIRST_USE: 'shop_first_use',
  REST_OPENED: 'rest_opened',
  EVENT_OPENED: 'event_opened',
  DECK_OPENED: 'deck_opened',
  HOWTO_OPENED: 'howto_opened',

  // Мета-удержание
  DAILY_CLAIMED: 'daily_claimed',     // { streak }
  HERO_UNLOCKED: 'hero_unlocked',     // { hero }
  ACHIEVEMENT: 'achievement',         // { id }

  // Монетизация
  AD_REWARD_SHOWN: 'reward_ad_shown', // { place }
  AD_FULL_SHOWN: 'interstitial_ad_shown',
};
