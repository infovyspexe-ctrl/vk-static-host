// ОБЁРТКА СОВМЕСТИМОСТИ. Лидерборды переехали в ../platform/ (слой + адаптеры).
// Лидерборд с указанным именем должен быть заранее создан в консоли площадки.
// В новом коде: Platform.leaderboard.
import { Platform } from '../platform/index.js';

export const Leaderboard = {
  setScore(name, score) { return Platform.leaderboard.setScore(name, score); },
  getPlayerEntry(name) { return Platform.leaderboard.getPlayerEntry(name); },
  getTop(name, quantityTop = 10) { return Platform.leaderboard.getTop(name, quantityTop); },
};
