// АВТОПАУЗА (CONVENTIONS.md, раздел 8). Игра, звук и GameplayAPI встают на паузу
// при сворачивании вкладки, потере фокуса и показе рекламы (слой площадки шлёт
// 'game:pause' / 'game:resume' через шину). При паузе по фокусу показывается
// оверлей «Пауза»: молчаливая заморозка выглядит как зависание — причина отказа.
// Версия без Phaser: вместо остановки сцен поднимается флаг, главный цикл в
// main.js его читает и не шагает физику.
import { Audio } from './audio.js';
import { Platform } from '../platform/index.js';
import { bus } from './events.js';
import { i18n } from '../i18n/strings.js';
import { THEME } from '../ui/theme.js';

export const Lifecycle = { paused: false };

export function setupLifecycle() {
  let wasGameplayActive = false;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100;display:none;' +
    'align-items:center;justify-content:center;' +
    'background:' + THEME.colors.overlay + ';color:' + THEME.colors.text + ';' +
    'font:' + THEME.fontSize.big + ' ' + THEME.fontFamily + ';';
  document.body.appendChild(overlay);

  const pause = ({ showOverlay = true } = {}) => {
    if (Lifecycle.paused) return;
    Lifecycle.paused = true;
    wasGameplayActive = Platform.gameplayActive;
    Audio.pause();
    if (wasGameplayActive) Platform.gameplayStop();
    if (showOverlay) { overlay.textContent = i18n.t('paused'); overlay.style.display = 'flex'; }
  };

  const resume = () => {
    if (!Lifecycle.paused) return;
    Lifecycle.paused = false;
    overlay.style.display = 'none';
    Audio.resume();
    if (wasGameplayActive) Platform.gameplayStart(); // только если геймплей шёл до паузы
  };

  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
  window.addEventListener('blur', () => pause());
  window.addEventListener('focus', resume);

  // Реклама ставит на паузу этими же событиями (без оверлея — экран закрыт рекламой).
  bus.on('game:pause', (opts) => pause(opts || {}));
  bus.on('game:resume', resume);
}
