// ТОЧКИ КОНТРОЛЯ этой игры. Каждое событие шлём через Analytics.event(EVENTS.XXX, {...}).
// Имена латиницей, короткие. В Метрике они становятся целями (metrika.py create/sync).
export const EVENTS = {
  GAME_START: 'game_start',           // игрок начал партию
  SESSION_END: 'session_end',         // вышел в меню { liters, zone }
  ZONE_REACHED: 'zone_reached',       // вода опустилась в новую зону { zone } — главная воронка
  SKILL_BOUGHT: 'skill_bought',       // куплен узел дерева { node }
  BUCKET_BOUGHT: 'bucket_bought',     // куплено ведро { id }
  TELEPORT_FIRST_USE: 'teleport_first_use', // первый телепорт (пользуются ли веткой)
  REWARD_AD_SHOWN: 'reward_ad_shown', // вознаграждаемая реклама досмотрена { place }
  PHONE_FOUND: 'phone_found',         // финал: телефон найден { minutes }
  PRESTIGE: 'prestige',               // «Новое озеро» { n }
  QUEST_DONE: 'quest_done',           // задание выполнено { type }
  DAILY_DONE: 'daily_done',           // дневная цель закрыта { streak }
  FLOAT_CHEST: 'float_chest',         // пойман плавающий сундук { zone } — работает ли затычка поздних зон
  BADGE_EARNED: 'badge_earned',       // достижение { id }
  PUMP_REPORT: 'pump_report'          // офлайн-насос отработал { liters }
};
