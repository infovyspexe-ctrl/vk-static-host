// ДОСТИЖЕНИЯ: чистая проверка условий и выдача.
//
// Ни Phaser, ни i18n: названия и описания живут в локализации по ключам ach_<id> и
// ach_<id>_desc, а условия — данными в data/achievements.js. Здесь только сравнение
// счётчиков с порогами.
//
// Достижения — самый дешёвый инструмент удержания из существующих: считаются на клиенте,
// лежат в сейве, не требуют ни сервера, ни новых экранов геймплея, и дают цель тому, кто
// уже прошёл кампанию.
import { ACHIEVEMENTS } from '../data/achievements.js';

// Что можно выдать прямо сейчас: ещё не выдано и порог взят.
// stats[a.stat] может отсутствовать у старого сейва — тогда считаем нулём, а не undefined,
// иначе сравнение молча даст false (mergeProgress это лечит, но модуль не должен зависеть
// от того, что его всегда зовут с полным объектом).
export function pendingUnlocks(achieved, stats) {
  return ACHIEVEMENTS.filter((a) => !achieved[a.id] && (stats[a.stat] || 0) >= a.gte);
}

// Выдать всё заслуженное: отметить, начислить кристаллы и ОТКРЫТЬ корабли. МУТИРУЕТ meta.
// Возвращает выданное, чтобы сцена показала это игроку — молча выданное достижение
// не работает как награда.
//
// Валюта здесь `crystals` (в игре-доноре были `coins`), а достижение может открывать
// корабль: поле `ship` в таблице. Открытие идёт вместе с выдачей, чтобы не заводить
// второе место, где решается, доступен ли корабль.
export function claimUnlocks(meta) {
  if (!meta.achievements) meta.achievements = {};
  if (!meta.stats) meta.stats = {};
  if (!meta.ships) meta.ships = {};
  const got = pendingUnlocks(meta.achievements, meta.stats);
  got.forEach((a) => {
    meta.achievements[a.id] = 1;
    meta.crystals = (meta.crystals || 0) + a.reward;
    if (a.ship) meta.ships[a.ship] = 1;
  });
  return got;
}

// Сколько получено из скольких — для экрана достижений и для ощущения прогресса.
export function achievementProgress(achieved) {
  const done = ACHIEVEMENTS.filter((a) => achieved[a.id]).length;
  return { done, total: ACHIEVEMENTS.length };
}
