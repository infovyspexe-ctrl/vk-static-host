// ОБЁРТКА СОВМЕСТИМОСТИ. Реклама переехала в ../platform/ (слой + сменные адаптеры).
// Пауза игры вокруг показа, восстановление GameplayAPI и заглушки вне площадки —
// теперь в слое, одинаково для всех площадок. В новом коде: Platform.ads.
import { Platform } from '../platform/index.js';

export const Ads = {
  // Полноэкранная. Вызывать между уровнями или при выходе в меню, НЕ во время игры.
  showFullscreen(opts) { return Platform.ads.showFullscreen(opts); },
  // Вознаграждаемая. Награду выдавать ТОЛЬКО в onRewarded.
  showRewarded(opts) { return Platform.ads.showRewarded(opts); },
  showBanner() { return Platform.ads.showBanner(); },
  hideBanner() { return Platform.ads.hideBanner(); },
};
