// АВТОПАУЗА. Игра, звук и GameplayAPI встают на паузу при сворачивании вкладки,
// потере фокуса и показе рекламы (ads.js шлёт 'game:pause' / 'game:resume' через шину).
// При паузе по фокусу показывается оверлей «Пауза»: молчаливая заморозка экрана
// выглядит как зависание, а зависание — частая причина отказа модерации.
// GameplayAPI восстанавливается честно: start после паузы только если геймплей шёл.
// Настраивается один раз в main.js: setupLifecycle(game).
import { Audio } from './audio.js';
import { YA } from '../yandex/sdk.js';
import { bus } from './events.js';
import { i18n } from '../i18n/strings.js';
import { THEME } from '../ui/theme.js';
import { Save } from '../yandex/save.js';
import { Leaderboard } from '../yandex/leaderboard.js';

export function setupLifecycle(game) {
  let paused = false;
  let pausedScenes = [];
  let wasGameplayActive = false;
  // Пауза от рекламы и пауза от фокуса/видимости — РАЗНЫЕ источники, а paused был
  // одним булевым флагом на двоих. Реальный сценарий (найден на «Изнанке» 04.08):
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
      // ПРЯМО `s.sys.pause()`, а не `s.scene.pause()`. Второй кладёт операцию в очередь
      // менеджера сцен, и она выполняется НА СЛЕДУЮЩЕМ шаге — а к тому времени сцена уже
      // может не работать: игрок жмёт «Играть» (start новой сцены тоже в очереди) и в тот же
      // кадр теряется фокус, очередь исполняет сначала старт (старая сцена остановлена),
      // потом нашу паузу — и Phaser пишет в консоль «Cannot pause non-running Scene Menu».
      // Из library/game-template v25.
      pausedScenes.forEach(s => { if (s && s.sys && s.sys.isActive()) s.sys.pause(); });
    } catch (e) {}
    Audio.pause();
    if (wasGameplayActive) YA.gameplayStop();
    if (showOverlay) { overlay.textContent = i18n.t('paused'); overlay.style.display = 'flex'; }
  };

  const resume = () => {
    if (!paused) return;
    paused = false;
    overlay.style.display = 'none';
    // Возобновляем ТОЛЬКО те сцены, которые и правда стоят на паузе. Список снят в момент
    // pause(), а за время рекламы сцена могла СМЕНИТЬСЯ: exitToMenu() показывает рекламу
    // (это pause()) и в onClose делает scene.start('Menu') — старая GameScene уже остановлена.
    // Голый resume() воскрешал бы её ПОВЕРХ меню: рисовать ей нечего, а ввод она забирала
    // на себя — меню переставало реагировать на кнопки СОВСЕМ при живой картинке. Ровно то,
    // что модерация называет зависанием. Из library/game-template v21 (найдено на
    // sweet-empire 2026-08-04) — перенесено в dream-wash только сейчас (2026-08-23,
    // A9 release-checklist, было пропущено при точечном переносе шаблона).
    try {
      pausedScenes.forEach((s) => {
        if (s && s.sys && typeof s.sys.isPaused === 'function' && s.sys.isPaused()) s.sys.resume();
      });
    } catch (e) {}
    pausedScenes = [];
    Audio.resume();
    if (wasGameplayActive) YA.gameplayStart(); // только если геймплей шёл до паузы
  };

  const flushNow = () => { try { Save.flush(); } catch (e) {} };

  // СНЯТЬ ПАУЗУ ОТ РЕКЛАМЫ МОЖНО, ТОЛЬКО ЕСЛИ ВКЛАДКА ВИДНА. Раньше game:resume снимал
  // паузу безусловно: реклама закрывается сама (или срабатывает 45-секундный сторож в
  // platform/index.js), пока игрок уже ушёл в другую вкладку — музыка и геймплей оживают
  // в фоне. Признак берётся ТОЛЬКО из document.hidden (не из потери фокуса — тот отбирает
  // реклама сама и на focus не всегда возвращается). Из library/game-template v29 (найдено
  // на pizza-mafia 2026-08-12) — перенесено в dream-wash только сейчас (2026-08-23).
  const canResume = () => !adActive && !document.hidden;
  const maybeResume = () => { if (canResume()) resume(); };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Защитный пуш недельного лидерборда (финальный ревью плана «недельный трек»):
      // GameScene.exitToMenu() шлёт washWeekly только на явный выход в меню, но игрок
      // на Яндекс Играх чаще просто закрывает вкладку/уходит — тогда счёт этой сессии
      // не улетал вовсе. Читаем из Save.cache (локальное зеркало, обновляется каждым
      // persist() в GameScene), а не из scene.state — lifecycle.js общий для всех сцен,
      // конкретной сцены/её состояния он не знает. Тот же fire-and-forget стиль, что и
      // остальные вызовы Leaderboard.setScore — промис не ждём, чтобы не блокировать уход.
      const cached = Save.cache;
      if (cached && typeof cached.weeklyWashed === 'number') {
        Leaderboard.setScore('washWeekly', cached.weeklyWashed); // имя без "_", см. GameScene.exitToMenu
      }
      // Сохранить накопленное перед уходом со страницы — иначе изменения внутри
      // дебаунса update() (platform/index.js FLUSH_DELAY_MS) просто теряются: уход
      // раньше ничем не флашился (найдено на «Изнанке» 04.08).
      flushNow();
      pause();
    } else {
      maybeResume();
    }
  });
  window.addEventListener('blur', () => pause());
  window.addEventListener('focus', () => maybeResume());

  // Реклама ставит на паузу этими же событиями (без оверлея — экран закрыт рекламой).
  bus.on('game:pause', (opts) => { adActive = true; pause(opts || {}); });
  bus.on('game:resume', () => { adActive = false; maybeResume(); });

  window.addEventListener('pagehide', flushNow);
  window.addEventListener('beforeunload', flushNow);
}
