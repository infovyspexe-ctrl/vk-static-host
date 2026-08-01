// ЛОКАЛЬНЫЙ ЧЕКПОЙНТ партии (по образцу games/rubezh/src/runSave.js).
// Пишется часто и ТОЛЬКО в localStorage — облако (Save/setData) не трогает.
// Смысл: частые изменения (каждое ведро) не должны порождать облачные записи,
// но закрытая посреди партии вкладка обязана восстановиться без потерь.
// В облако (Save) мета уходит редко, на ключевых точках — см. GameScene.saveMeta.
//
// Снапшот — тот же объект, что buildSave() кладёт в облако, плюс savedAt.
// При загрузке берём свежайшее из (облако, чекпойнт) — pickNewest ниже.
// Пишем через storage() — на iOS в iframe площадки прямой localStorage ломается
// (SDK Яндекса предупреждает об этом в консоли). Здесь это критично: чекпойнт —
// ЕДИНСТВЕННОЕ место, где живёт состояние партии между облачными записями.
import { GAME_ID } from '../platform/index.js';
import { storage } from './safe-storage.js';

const KEY = GAME_ID + '_run';

export const Checkpoint = {
  // Сохранить снапшот локально. Синхронно и дёшево — можно звать часто
  // (каждое ведро, pagehide).
  write(snapshot) {
    try {
      storage()?.setItem(KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
    } catch (e) { /* приватный режим и т.п. */ }
  },

  read() {
    try {
      const raw = storage()?.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && typeof d.savedAt === 'number' ? d : null;
    } catch (e) { return null; }
  },

  clear() {
    try { storage()?.removeItem(KEY); } catch (e) {}
  }
};

// Чистая логика выбора источника загрузки: свежайший по savedAt.
// У облачного сейва savedAt может отсутствовать (старые записи) — тогда он
// считается старше любого чекпойнта, но новее «ничего».
export function pickNewest(cloud, local) {
  const stamp = (d) => (d && typeof d.savedAt === 'number' ? d.savedAt : (d ? 0 : -1));
  return stamp(local) > stamp(cloud) ? local : cloud;
}
