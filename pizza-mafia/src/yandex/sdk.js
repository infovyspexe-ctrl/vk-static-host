// ОБЁРТКА СОВМЕСТИМОСТИ. Настоящая работа с площадкой переехала в ../platform/:
// там слой, под ним сменные адаптеры (Яндекс напрямую или прослойка GamePush).
//
// Этот файл оставлен, чтобы код игр не пришлось переписывать разом: привычный `YA`
// продолжает работать. В новом коде импортируй `Platform` из '../platform/index.js'.
//
// Почему не удалить сразу: игры трогают SDK из десятков мест, и массовая замена
// импортов в семи играх — отдельный риск, не связанный со сменой площадки.
import { Platform } from '../platform/index.js';

export const YA = {
  get available() { return Platform.available; },
  get gameplayActive() { return Platform.gameplayActive; },
  get ysdk() { return window.ysdk || null; }, // прямой доступ к SDK Яндекса, если он есть

  init() { return Platform.init(); },
  loadingReady() { Platform.ready(); },
  gameplayStart() { Platform.gameplayStart(); },
  gameplayStop() { Platform.gameplayStop(); },
  getLang() { return Platform.getLang(); },
};
