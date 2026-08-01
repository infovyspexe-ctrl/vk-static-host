// ОБЁРТКА СОВМЕСТИМОСТИ + КЭШ. Лидерборды переехали в ../platform/ (слой + адаптеры),
// но кэш чтения оставляем здесь: на прослойке с поштучной тарификацией (GamePush) каждое
// открытие «Рекордов» — это запрос, а игрок открывает экран по нескольку раз за сессию.
// Таблица за минуту заметно не меняется, поэтому отдаём сохранённый ответ. После своей
// отправки счёта кэш сбрасываем — иначе игрок не увидит собственный новый результат.
import { Platform } from '../platform/index.js';

const TOP_TTL_MS = 60000;
const topCache = new Map();   // name -> { at, data }

export const Leaderboard = {
  setScore(name, score) {
    topCache.delete(name);    // свой результат изменился — старую таблицу показывать нельзя
    return Platform.leaderboard.setScore(name, score);
  },

  getPlayerEntry(name) {
    return Platform.leaderboard.getPlayerEntry(name);
  },

  async getTop(name, quantityTop = 10) {
    const hit = topCache.get(name);
    if (hit && Date.now() - hit.at < TOP_TTL_MS) return hit.data;
    const res = await Platform.leaderboard.getTop(name, quantityTop);
    if (res != null) topCache.set(name, { at: Date.now(), data: res });
    return res;
  },
};
