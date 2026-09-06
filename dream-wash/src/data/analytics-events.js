// ТОЧКИ КОНТРОЛЯ. Каждое событие шлём через Analytics.event(EVENTS.XXX, { параметры }).
// Добавил событие — прогони `python library/tools/metrika.py sync games/dream-wash`,
// иначе Метрика молча игнорирует событие без цели (CONVENTIONS.md, раздел 11).
export const EVENTS = {
  GAME_START: 'game_start',       // партия началась (заход в GameScene)
  SESSION_END: 'session_end',     // вышел в меню (параметр: earnedTotal — сколько всего заработано)

  CAR_WASHED: 'car_washed',       // машина домыта (параметр: tier) — видно, доходят ли до старших тиров
  VIP_ORDER_DONE: 'vip_order_done', // особый заказ завершён (параметр: success — уложился ли в срок)
  BAY_BOUGHT: 'bay_bought',       // куплен доп. пост мойки (параметр: count — сколько постов теперь)
  TIER_UNLOCKED: 'tier_unlocked', // открыт новый класс машин (параметр: tier)
  UPGRADE_BOUGHT: 'upgrade_bought', // куплен уровень ветки (параметры: id, level)
  SHOP_OPENED: 'shop_opened',     // открыта панель апгрейдов — видно, заглядывают ли вообще
  PRESTIGE_DONE: 'prestige_done', // «Новая точка» (параметр: count — какой по счёту)
  QUEST_DONE: 'quest_done',       // задание выполнено (параметр: id)
  BADGE_EARNED: 'badge_earned',   // достижение получено (параметр: id)
  WEEKLY_MILESTONE: 'weekly_milestone', // этап недельного трека пройден (параметр: pct)
  REWARD_AD_SHOWN: 'reward_ad_shown', // вознаграждаемая реклама показана (параметр: place)

  FIRST_TAP: 'first_tap_use',           // первый тап по машине — отличает «зашёл и ушёл» от «играет»
  FIRST_UPGRADE: 'first_upgrade_use',   // первая покупка апгрейда
  FIRST_PRESTIGE: 'first_prestige_use'  // первый престиж
};
