// ОБЁРТКА СОВМЕСТИМОСТИ. Сохранения переехали в ../platform/ (слой + адаптеры).
//
// В слой ушло всё, что одинаково для любой площадки: дебаунс и склейка частых
// update(), флаг «есть что писать» (пустой flush не делает запроса), локальное
// зеркало, версионирование с миграциями, защита от затирания облака при сбое
// чтения и режим только-чтения для сейва из будущего.
//
// GAME_ID теперь живёт в ../platform/index.js — там же, где ключ зеркала.
// Заменять при копировании шаблона по-прежнему ОБЯЗАТЕЛЬНО (CONVENTIONS.md, раздел 7).
//
// ПРАВИЛО ЭКОНОМИИ (важно на прослойках с поштучной тарификацией запросов):
// в облако уходит только МЕТА и только на ключевых точках — конец партии, покупка,
// открытие контента, уход со страницы. Состояние текущей партии держи локально сам.
// Эталон разделения: games/rubezh (src/save.js + src/runSave.js).
// Замер на «Осуши озеро»: 90 с игры = 0 облачных записей вместо 6+.
import { Platform } from '../platform/index.js';

export { GAME_ID } from '../platform/index.js';

export const Save = {
  get cache() { return Platform.cache; },
  // Инициализацию площадки делает Platform.init() (её зовёт YA.init() в main.js).
  // Оставлено как no-op: сцены шаблона и игр зовут Save.init() в PreloadScene.
  async init() {},
  load() { return Platform.save.load(); },
  update(partial) { return Platform.save.update(partial); },
  save(data) { return Platform.save.save(data); },
  flush() { return Platform.save.flush(); },
};
