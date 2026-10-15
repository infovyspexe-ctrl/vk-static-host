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

// Выдать всё заслуженное: отметить и начислить монеты. МУТИРУЕТ progress.
// Возвращает выданное, чтобы сцена показала это игроку — молча выданное достижение
// не работает как награда.
export function claimUnlocks(progress) {
  const got = pendingUnlocks(progress.achievements, progress.stats);
  got.forEach((a) => {
    progress.achievements[a.id] = 1;
    progress.coins += a.reward;
  });
  return got;
}

// Сколько получено из скольких — для экрана достижений и для ощущения прогресса.
export function achievementProgress(achieved) {
  const done = ACHIEVEMENTS.filter((a) => achieved[a.id]).length;
  return { done, total: ACHIEVEMENTS.length };
}
