// АВТОПАУЗА. Игра, звук и GameplayAPI встают на паузу при сворачивании вкладки,
// потере фокуса и показе рекламы (ads.js шлёт 'game:pause' / 'game:resume' через шину).
// При паузе по фокусу показывается оверлей «Пауза»: молчаливая заморозка экрана
// выглядит как зависание, а зависание — частая причина отказа модерации.
// GameplayAPI восстанавливается честно: start после паузы только если геймплей шёл.
// Настраивается один раз в main.js: setupLifecycle(game).
import { Audio } from './audio.js';
import { YA } from '../yandex/sdk.js';
import { Platform } from '../platform/index.js';
import { bus } from './events.js';
import { i18n } from '../i18n/strings.js';
import { THEME } from '../ui/theme.js';

export function setupLifecycle(game) {
  let paused = false;
  let pausedScenes = [];
  let wasGameplayActive = false;
  // Пауза от рекламы и пауза от фокуса/видимости — РАЗНЫЕ источники, а paused был
  // одним булевым флагом на двоих. Реальный сценарий (найден при аудите 04.08):
  // реклама открылась (game:pause, adActive=true) → игрок кликнул по ролику → вкладка
  // теряет фокус (blur, no-op — paused уже true) → игрок вернулся на вкладку, пока
  // реклама ЕЩЁ показывается → focus снимал paused целиком, хотя ролик ещё виден —
  // звук и геймплей резюмились ПОД рекламой. adActive не трогается focus/blur —
  // снять паузу раньше времени может только настоящий game:resume от самой рекламы.
  let adActive = false;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100;display:none;' +
    'align-items:center;justify-content:center;' +
    'background:' + THEME.colors.overlay + ';color:' + THEME.colors.text + ';' +
    'font:' + THEME.fontSize.big + ' ' + THEME.fontFamily + ';';
  document.body.appendChild(overlay);

  const pause = ({ showOverlay = true } = {}) => {
    if (paused) return;
    paused = true;
    wasGameplayActive = YA.gameplayActive; // запомнить, шёл ли геймплей
    try {
      pausedScenes = game.scene.getScenes(true); // активные сцены
      pausedScenes.forEach(s => s.scene.pause());
    } catch (e) {}
    Audio.pause();
    if (wasGameplayActive) YA.gameplayStop();
    if (showOverlay) { overlay.textContent = i18n.t('paused'); overlay.style.display = 'flex'; }
  };

  const resume = () => {
    if (!paused) return;
    paused = false;
    overlay.style.display = 'none';
    try { pausedScenes.forEach(s => s.scene.resume()); } catch (e) {}
    pausedScenes = [];
    Audio.resume();
    if (wasGameplayActive) YA.gameplayStart(); // только если геймплей шёл до паузы
  };

  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : (adActive || resume())));
  window.addEventListener('blur', () => pause());
  window.addEventListener('focus', () => { if (!adActive) resume(); });

  // Реклама ставит на паузу этими же событиями (без оверлея — экран закрыт рекламой).
  bus.on('game:pause', (opts) => { adActive = true; pause(opts || {}); });
  bus.on('game:resume', () => { adActive = false; resume(); });

  // Сохранить накопленное перед закрытием/сменой вкладки — иначе изменения внутри
  // 2-секундного дебаунса update() (platform/index.js FLUSH_DELAY_MS) просто теряются:
  // ухода со страницы раньше ничем не флашился (найдено при аудите 04.08).
  const flushNow = () => { try { Platform.save.flush(); } catch (e) {} };
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('beforeunload', flushNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushNow(); });
}
