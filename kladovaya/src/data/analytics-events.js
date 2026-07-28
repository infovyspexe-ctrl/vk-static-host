// ТОЧКИ КОНТРОЛЯ (CONVENTIONS.md, раздел 11). Каталог событий аналитики.
// metrika.py читает этот словарь и создаёт цели в счётчике. Добавил событие —
// прогони: python library/tools/metrika.py sync games/kladovaya
export const ANALYTICS_EVENTS = {
  game_start: 'Начало партии',
  game_end: 'Конец партии (score — очки, jars — банок за партию)',
  merge_max: 'Слияние двух плодов максимального ранга',
  jar_ready: 'Шкала заполнена, банка готова',
  jar_captured: 'Плод закатан в банку (branch, rank)',
  jar_first_use: 'Первая закатка банки за всю жизнь игрока',
  recipe_new: 'Открыт новый рецепт (key — ветка_ранг)',
  pantry_opened: 'Открыт экран кладовой',
  pantry_first_use: 'Первое открытие кладовой за всю жизнь игрока',
  rescue_used: 'Спасение за рекламу использовано',
  daily_bonus: 'Ежедневный бонус выдан (streak — дней подряд)',
  tutorial_done: 'Первый бросок сделан (туториал пройден)',
  order_completed: 'Заказ собран в коллекционную банку (id, bonus)',
  collection_new: 'Коллекционная банка собрана впервые (id)',
  season_completed: 'Ярмарка: все коллекции обменяны на бонус (season — номер сезона)',
  achievement: 'Достижение открыто (id — какое)',
  recipe_read: 'Открыта карточка рецепта (id — коллекция)'
};
