// ТОЧКИ КОНТРОЛЯ этой игры. Определяем их на старте разработки, а не потом.
// Каждое событие шлём через Analytics.event(EVENTS.XXX, { параметры }).
// Имена латиницей, короткие. В Метрике они станут целями, по ним строятся воронки.
export const EVENTS = {
  FIRST_LAUNCH: 'first_launch',
  RETURN_DAY: 'return_day',
  TUTORIAL_STEP: 'tutorial_step',
  PROGRESS_REACHED: 'progress_reached',
  REWARD_AD_SHOWN: 'reward_ad_shown',
  INTERSTITIAL_AD_SHOWN: 'interstitial_ad_shown',
  APP_LAUNCH: 'app_launch',
  AD_OFFER: 'ad_offer',
  AD_REQUEST: 'ad_request',
  AD_RESULT: 'ad_result',
  AD_REWARD: 'ad_reward',
  GAME_START: 'game_start',       // игрок начал партию (из меню)
  SESSION_END: 'session_end',     // игрок вышел (параметр: достигнутый уровень)

  LEVEL_START: 'level_start',     // вход в редактор уровня (параметр: level)
  LEVEL_WIN: 'level_win',         // уровень пройден (параметр: level)
  LEVEL_LOSS: 'level_loss',       // проигран бой (параметр: level)
  BATTLE_TIMEOUT: 'battle_timeout', // ничья по времени — ошибка баланса (параметр: level)
  FIRST_PLACE: 'first_place',     // первое размещение вообще (Analytics.first)
  FIRST_BATTLE: 'first_battle',   // первая кнопка «В бой» (Analytics.first)
  ERASE_USED: 'erase_used',       // пользовался стиранием
  REWARD_PICKED: 'reward_picked', // выбрана карта награды (параметры: level, kind, type)
};
