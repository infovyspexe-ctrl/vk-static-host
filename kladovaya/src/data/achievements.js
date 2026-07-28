// ДОСТИЖЕНИЯ. Тёплые названия под аудиторию (i18n: ach_<id> / ach_<id>_d).
// Проверка — в Game._checkAchievements по метрикам и разовым событиям;
// открытые лежат в сейве (поле ach). Список расширяемый: добавил строку +
// пару строк в i18n — и цель в Метрике через metrika.py sync не нужна
// (шлётся одно событие achievement с параметром id).
export const ACHIEVEMENTS = [
  { id: 'first_jar', type: 'jars', n: 1 },
  { id: 'hozyaushka', type: 'jars', n: 10 },
  { id: 'zapaslivaya', type: 'jars', n: 50 },
  { id: 'zakroma', type: 'jars', n: 200 },
  { id: 'first_recipe', type: 'collections', n: 1 },
  { id: 'sobiratelnitsa', type: 'collections', n: 6 },
  { id: 'carskiy', type: 'collection_id', cid: 'royal_pantry' },
  { id: 'yarmarka', type: 'seasons', n: 1 },
  { id: 'urozhay', type: 'event', ev: 'merge_max' },
  { id: 'tysyacha', type: 'score', n: 1000 },
  { id: 'privychka', type: 'streak', n: 7 },
  { id: 'vtoroy_shans', type: 'event', ev: 'rescue' }
];
