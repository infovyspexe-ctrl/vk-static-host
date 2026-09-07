// Выдача зарубок. Отдельно от таблицы, потому что таблица — данные, а это логика.
import { ACHIEVEMENTS } from '../data/achievements.js';
import { Progress } from './progress.js';
import { Platform } from '../platform/index.js';

// Что заслужено, но ещё не выдано. Возвращает список описаний.
export function pendingUnlocks() {
  const have = Progress.data.achievements;
  const stats = Progress.data.stats;
  return ACHIEVEMENTS.filter((a) => !have.includes(a.id) && (stats[a.stat] || 0) >= a.need);
}

// Выдать всё заслуженное разом и начислить память. Возвращает выданное — сцена показывает.
export function claimUnlocks() {
  const fresh = pendingUnlocks();
  if (!fresh.length) return [];
  const achievements = Progress.data.achievements.concat(fresh.map((a) => a.id));
  const memory = Progress.data.memory + fresh.reduce((s, a) => s + a.memory, 0);
  Progress.put({ achievements, memory });
  // Собственная награда игры остаётся источником истины. Площадка получает тот
  // же стабильный id после выдачи и сохраняет его в общем профиле; отказ сети
  // не отменяет награду и починится при следующей синхронизации сейва/страницы.
  fresh.forEach((a) => { Platform.achievements.unlock(a.id); });
  return fresh;
}

export function isUnlocked(id) {
  return Progress.data.achievements.includes(id);
}

export function syncAchievements() {
  (Progress.data.achievements || []).forEach((id) => {
    Platform.achievements.unlock(id);
  });
}

export function progressOf(a) {
  return Math.min(1, (Progress.data.stats[a.stat] || 0) / a.need);
}
