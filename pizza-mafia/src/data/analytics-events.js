// ТОЧКИ КОНТРОЛЯ этой игры. Определяем их на старте разработки, а не потом.
// Каждое событие шлём через Analytics.event(EVENTS.XXX, { параметры }).
// Имена латиницей, короткие. В Метрике они станут целями, по ним строятся воронки.
//
// Добавил событие — прогони `python library/tools/metrika.py sync games/pizza-mafia`,
// иначе цель не создастся и событие уйдёт в нишу (CONVENTIONS.md, раздел 11).
export const EVENTS = {
  APP_LAUNCH: 'app_launch',
  FIRST_LAUNCH: 'first_launch',
  RETURN_DAY: 'return_day',
  PROGRESS_REACHED: 'progress_reached',
  REWARD_AD_SHOWN: 'reward_ad_shown',
  INTERSTITIAL_AD_SHOWN: 'interstitial_ad_shown',
  GAME_START: 'game_start',           // игрок начал рабочий день (параметр day)
  SESSION_END: 'session_end',         // вышел (параметр day, coins)
  DAY_COMPLETE: 'day_complete',       // закончил день (параметр day, stars, served, lost)
  DAY_FAILED: 'day_failed',           // провалил день (много ушедших)
  SHOP_OPENED: 'shop_opened',         // открыл магазин
  UPGRADE_BOUGHT: 'upgrade_bought',   // купил апгрейд (параметр id, level)
  PIZZA_SERVED: 'pizza_served',       // выдал пиццу (параметр accuracy, exact, speed)
  PIZZA_SPOILED: 'pizza_spoiled',     // испортил пиццу (raw/burnt)
  CUSTOMER_LOST: 'customer_lost',     // клиент ушёл по терпению
  QUEUE_FULL: 'queue_full',           // очередь полна, гость не пришёл — мера жадности игрока
  INSTANT_COOK: 'instant_cook',       // использовал мгновенную готовку (реклама)
  REWARD_DOUBLE_TIPS: 'reward_double_tips',   // реклама: удвоить чаевые
  REWARD_SAVE_CUSTOMERS: 'reward_save_customers', // реклама: +терпения всем
  RECIPE_UNLOCKED: 'recipe_unlocked', // открылся новый рецепт (параметр id)

  // NEW_DAY использовался в DayEndScene, но в словаре его НЕ БЫЛО: EVENTS.NEW_DAY был
  // undefined, и событие уходило в Метрику с именем undefined. Найдено 2026-08-09.
  NEW_DAY: 'new_day',                 // началась следующая смена (параметр n, district)

  // Кампания и механики смены
  COMBO_REACHED: 'combo_reached',     // серия точных заказов (параметр streak)
  RIVALS_STOLE: 'rivals_stole',       // конкуренты увели гостя из очереди
  DON_ORDER_RESULT: 'don_order_result', // заказ Дона: выполнен или провален (параметр ok)
  DISTRICT_CLEARED: 'district_cleared', // район пройден (параметр id)
  CAMPAIGN_DONE: 'campaign_done',     // кампания пройдена, открыт бесконечный режим

  // Обучение. TUTORIAL_SKIPPED с номером шага — самое ценное здесь: показывает, на каком
  // именно шаге обучение надоедает. Точка отвала почти никогда не там, где её ищут.
  TUTORIAL_START: 'tutorial_start',
  TUTORIAL_STEP: 'tutorial_step',       // параметр n — номер шага
  TUTORIAL_DONE: 'tutorial_done',
  TUTORIAL_SKIPPED: 'tutorial_skipped', // параметр n — на каком шаге бросили

  // Удержание и монетизация
  DAILY_BONUS: 'daily_bonus',                   // параметры streak, doubled
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked', // параметр id
  LEADERBOARD_OPENED: 'leaderboard_opened',
  SHIFT_REVENUE: 'shift_revenue',               // параметр coins — для калибровки дани
  REWARD_DOUBLE_REVENUE: 'reward_double_revenue'
};
