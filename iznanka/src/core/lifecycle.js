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
      // ПРЯМО `s.sys.pause()`, а не `s.scene.pause()` (шаблон v25, перенесено 11.08).
      // Второй кладёт операцию в очередь менеджера сцен, и она выполняется НА СЛЕДУЮЩЕМ
      // шаге — а к тому времени сцена уже может не работать: игрок жмёт «Играть» (start
      // новой сцены тоже в очереди) и в тот же кадр теряется фокус; очередь исполняет
      // сначала старт (старая сцена остановлена), потом нашу паузу — и Phaser пишет в
      // консоль «Cannot pause non-running Scene Menu». Не поломка геймплея, а шум в
      // консоли, но именно шум прячет настоящие ошибки, и именно в консоль смотрит
      // модератор. Менеджер внутри делает ровно это же (SceneManager.pause → sys.pause).
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
    // Возобновляем ТОЛЬКО те сцены, которые и правда стоят на паузе (шаблон v21, перенесено
    // 11.08 — Изнанка была в списке 12 игр с этим кодом). Список снят в момент pause(), а за
    // время рекламы сцена могла СМЕНИТЬСЯ: здесь это живой путь «этаж зачищен → полноэкранная
    // → выход в деревню» (GameScene.maybeInterstitial + toHub). Старая сцена к моменту
    // onClose уже остановлена, её объекты разобраны; голый resume() воскрешал её ПОВЕРХ новой:
    // рисовать ей нечего, а ввод она забирала на себя — экран живой, кнопки не отвечают.
    // Ровно то, что модерация называет зависанием, и что не видно при проверке через F5.
    try {
      pausedScenes.forEach((s) => {
        if (s && s.sys && typeof s.sys.isPaused === 'function' && s.sys.isPaused()) s.sys.resume();
      });
    } catch (e) {}
    pausedScenes = [];
    Audio.resume();
    if (wasGameplayActive) YA.gameplayStart(); // только если геймплей шёл до паузы
  };

  // СНЯТЬ ПАУЗУ МОЖНО, ТОЛЬКО ЕСЛИ ВКЛАДКА ВИДНА И РЕКЛАМА ЗАКРЫТА.
  //
  // Раньше `game:resume` снимал паузу безусловно, и этого хватало, чтобы игра ожила в
  // СКРЫТОЙ вкладке: игрок жмёт «дальше», начинается межстраничная (game:pause), уходит
  // работать в другую вкладку — а реклама закрывается сама (или срабатывает 45-секундный
  // сторож в platform/index.js) и шлёт game:resume. Игрок в другой вкладке, а у него
  // играет музыка и тикает геймплей. Найдено владельцем «Пиццы-Мафии» 2026-08-12,
  // воспроизведено в браузере: hidden=true, bus.emit('game:resume') → музыка заиграла.
  //
  // Признак «вкладка не видна» берём ТОЛЬКО из document.hidden. Гасить возобновление ещё
  // и по потере фокуса нельзя: реклама сама забирает фокус, focus обратно приходит не
  // всегда, и игра осталась бы стоять после каждого ролика — та самая заморозка, от
  // которой заведён весь этот файл.
  const canResume = () => !adActive && !document.hidden;
  const maybeResume = () => { if (canResume()) resume(); };

  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : maybeResume()));
  window.addEventListener('blur', () => pause());
  window.addEventListener('focus', () => maybeResume());

  // Реклама ставит на паузу этими же событиями (без оверлея — экран закрыт рекламой).
  bus.on('game:pause', (opts) => { adActive = true; pause(opts || {}); });
  bus.on('game:resume', () => { adActive = false; maybeResume(); });

  // Сохранить накопленное перед закрытием/сменой вкладки — иначе изменения внутри
  // 2-секундного дебаунса update() (platform/index.js FLUSH_DELAY_MS) просто теряются:
  // ухода со страницы раньше ничем не флашился (найдено при аудите 04.08).
  const flushNow = () => { try { Platform.save.flush(); } catch (e) {} };
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('beforeunload', flushNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushNow(); });
}
