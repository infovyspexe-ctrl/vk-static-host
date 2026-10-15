// ОБЁРТКА СОВМЕСТИМОСТИ. Реклама переехала в ../platform/ (слой + сменные адаптеры).
// Пауза игры вокруг показа, восстановление GameplayAPI и заглушки вне площадки —
// теперь в слое, одинаково для всех площадок. В новом коде: Platform.ads.
import { Platform } from '../platform/index.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';

function tracked(opts = {}, event) {
  return { ...opts, onClose(result, opened) {
    if (opened) Analytics.event(event, { completed: !!result });
    opts.onClose?.(result, opened);
  } };
}

export const Ads = {
  // Полноэкранная. Вызывать между уровнями или при выходе в меню, НЕ во время игры.
  showFullscreen(opts) { return Platform.ads.showFullscreen(tracked(opts, EVENTS.INTERSTITIAL_AD_SHOWN)); },
  // Вознаграждаемая. Награду выдавать ТОЛЬКО в onRewarded.
  showRewarded(opts) { return Platform.ads.showRewarded(tracked(opts, EVENTS.REWARD_AD_SHOWN)); },
  showBanner() { return Platform.ads.showBanner(); },
  hideBanner() { return Platform.ads.hideBanner(); },
};
