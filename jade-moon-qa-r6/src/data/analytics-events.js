// ТОЧКИ КОНТРОЛЯ этой игры. Определяем их на старте разработки, а не потом.
// Каждое событие шлём через Analytics.event(EVENTS.XXX, { параметры }).
// Имена латиницей, короткие. В Метрике они станут целями, по ним строятся воронки.
export const EVENTS = {
  HINT_FIRST: 'hint_first',
  UNDO_FIRST: 'undo_first',
  SHUFFLE_FIRST: 'shuffle_first',
  COLLECTION_FIRST: 'collection_first',
  DAILY_BONUS_FIRST: 'daily_bonus_first',
  PURCHASE_FIRST: 'purchase_first',
  APP_LAUNCH: 'app_launch',             // автоматически: каждый запуск приложения
  FIRST_LAUNCH: 'first_launch',         // автоматически: первый запуск на устройстве
  RETURN_DAY: 'return_day',             // автоматически: один запуск в календарный UTC-день
  GAME_START: 'game_start',     // игрок начал партию
  SESSION_END: 'session_end',   // игрок вышел (параметр: достигнутый прогресс, например score)
  PROGRESS_REACHED: 'progress_reached', // обязательная веха глубины { level|mission|wave|zone }
  TUTORIAL_STEP: 'tutorial_step',       // шаг обучения { step }
  REWARD_AD_SHOWN: 'reward_ad_shown',   // rewarded успешно досмотрена { place }
  INTERSTITIAL_AD_SHOWN: 'interstitial_ad_shown', // interstitial успешно завершена { place }

  // Примеры под конкретные жанры (добавляй свои при разработке):
  // Шутер:   WAVE_REACHED: 'wave_reached'   -> Analytics.event(EVENTS.WAVE_REACHED, { wave: 15 })
  //          видно, на какой волне игроки сливаются.
  // Механика: MATCH3_OPENED: 'match3_opened' -> видно, пользуются ли вообще механикой три в ряд.
  // Ферма:    HARVEST: 'harvest', SHOP_OPENED: 'shop_opened'
  // Реклама:  REWARD_AD_SHOWN: 'reward_ad_shown'
};
