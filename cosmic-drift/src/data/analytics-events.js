// ТОЧКИ КОНТРОЛЯ Cosmic Drift. События шлём через Analytics.event(EVENTS.XXX, {параметры}).
// Имена латиницей. После добавления события — прогнать `metrika.py sync` (Метрика молча
// игнорирует reachGoal без созданной цели).
export const EVENTS = {
  APP_LAUNCH: 'app_launch',
  FIRST_LAUNCH: 'first_launch',
  RETURN_DAY: 'return_day',
  TUTORIAL_STEP: 'tutorial_step',
  INTERSTITIAL_AD_SHOWN: 'interstitial_ad_shown',
  GAME_START: 'game_start',         // партия началась
  SESSION_END: 'session_end',       // конец партии (параметры: score, wave, level)
  WAVE_REACHED: 'wave_reached',     // достигнута волна N — видно, где игроки сливаются
  LEVEL_UP: 'level_up',             // взят уровень (параметр: level)
  UPGRADE_CHOSEN: 'upgrade_chosen', // выбран апгрейд (параметр: id) — какие берут чаще
  UPGRADE_SKIPPED: 'upgrade_skipped',// пропустил выбор (если есть кнопка пропуска)
  BOSS_KILLED: 'boss_killed',       // убит босс (параметр: wave)
  PLAYER_DIED: 'player_died',       // игрок погиб (параметры: wave, level)
  REVIVE_USED: 'revive_used',       // воскрешён за рекламу
  LAB_OPENED: 'lab_opened',         // открыли лабораторию (мета-апгрейды)
  META_BOUGHT: 'meta_bought',       // куплен мета-апгрейд (параметр: id)
  REWARD_AD_SHOWN: 'reward_ad_shown', // показана вознаграждаемая реклама
  // ── Реклама: воронка показов (Веха 1) ──
  AD_INTERSTITIAL_SHOWN: 'ad_interstitial_shown', // показан полноэкранный ролик
  AD_REWARD_SHOWN: 'ad_reward_shown',       // игрок запустил ролик за награду (параметр point)
  AD_REWARD_DECLINED: 'ad_reward_declined', // ролика не было или закрыт без награды (point)
  CRYSTALS_EARNED: 'crystals_earned'        // начислены кристаллы (параметры n, source)
};
