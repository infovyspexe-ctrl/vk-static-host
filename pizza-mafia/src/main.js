// Точка входа. Инициализирует Yandex SDK, язык, звук, автопаузу и запускает Phaser.
import { YA } from './yandex/sdk.js';
import { Platform } from './platform/index.js';
import { attachQASnapshot } from './core/qaSnapshot.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Analytics } from './core/analytics.js';
import { ANALYTICS_COUNTERS } from './data/analytics-config.js';
import { GAME_ID } from './yandex/save.js';
import { setupLifecycle } from './core/lifecycle.js';
import { setupVisibleViewport } from './core/visibleViewport.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { DayEndScene } from './scenes/DayEndScene.js';
import { MapScene } from './scenes/MapScene.js';
import { AchievementsScene } from './scenes/AchievementsScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { TutorialOverlay } from './scenes/TutorialOverlay.js';

// Базовое разрешение. Портрет под мобильный (тайм-менеджмент, одна рука). Меняй под свою игру.
const BASE_WIDTH = 720;
const BASE_HEIGHT = 1280;

// Номер счётчика Яндекс Метрики этой игры. Создаёт и вписывает скрипт:
// python library/tools/metrika.py create games/<игра>
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = 111438452;

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#3a2418',           // фон пиццерии (тёплый), как в THEME.colors.bg
  scale: {
    mode: Phaser.Scale.FIT,            // без деформации элементов (требование модерации)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  scene: [BootScene, PreloadScene, MenuScene, MapScene, AchievementsScene, LeaderboardScene, GameScene, DayEndScene, TutorialOverlay]
};

async function start() {
  // §1.6.2.7 модерации Яндекса: правый клик / долгий тап по игре не должен открывать
  // системное меню браузера и выделять текст/картинку. Контекстное меню + выделение.
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('selectstart', (e) => e.preventDefault());
  window.addEventListener('dragstart', (e) => e.preventDefault());

  await YA.init();          // сначала SDK (работает и без него, локально)
  // Язык игрока: ?lang= (им пользуется модерация) → SDK площадки → язык браузера.
  // Без navigator-фолбэка недоступный SDK молча ронял язык на русский у любого
  // модератора — отказ по п.2.14 («Осуши озеро» 2026-08-20, «Рубеж» 2026-07-29).
  // Незнакомый язык i18n сам уводит на en (п.8.2.3). Критичный фикс шаблона v35,
  // перенесено 24.08 — в этой игре был обрыв цепочки ровно на этом месте.
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || YA.getLang() || navigator.language);
  Analytics.init(ANALYTICS_COUNTERS[Platform.name] || METRICA_ID, GAME_ID, { platform: Platform.name });

  const game = new Phaser.Game(config);
  attachQASnapshot(game, Platform);
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем.
  document.getElementById('boot')?.remove();
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе
  setupVisibleViewport(game, Platform.name);

  // Режим съёмки промо-роликов: `?shoot=1` открывает панель, `?shoot=1&save=<пресет>`
  // сразу подставляет состояние игры. Нужен человеку, который записывает видео, —
  // чтобы не доигрывать до поздних смен ради трёх секунд кадра (RECORDING.md). Импорт
  // динамический и защищён catch: папку src/dev/ релизная сборка ВЫРЕЗАЕТ (build.py
  // SKIP_DIRS), и в билде на модерации этого кода нет вовсе — не «спрятан», а отсутствует
  // физически (premod_check.py проверяет и это).
  if (new URLSearchParams(location.search).has('shoot')) {
    import('./dev/shootMode.js').then((m) => m.ShootMode.mount()).catch(() => {});
  }

  // ЗВУК ПОСЛЕ ПЕРВОГО ЖЕСТА. Браузеры держат AudioContext приглушённым, пока игрок не
  // тронет страницу, — это правило autoplay, а не наша прихоть. Вешаем на первый
  // pointerdown: до него музыку всё равно не пустят, а после она стартует сама.
  window.addEventListener('pointerdown', () => Audio.unlock(), { once: true });

  // Музыка загружается ФОНОМ и не участвует в полосе загрузки: игрок должен увидеть меню
  // и нажать «Играть» через пару секунд, а не ждать двух мегабайт (RETENTION.md, §10).
  // Файлов может не быть — тогда игра просто идёт без музыки.
  Audio.music(['assets/music/bg1.mp3', 'assets/music/bg2.mp3']);

  // Подстраховка к 100dvh в index.html. ДВА источника, оба обязательны (TEMPLATE-VERSION.md
  // v18 и v32; критичный фикс v32 не был перенесён в эту игру — найдено красной командой
  // 24.08 живым замером canvas.getBoundingClientRect на pizza-mafia):
  //   - visualViewport: мобильный прячет/показывает адресную строку, размер ОКНА при этом
  //     не меняется, и обычный resize не приходит;
  //   - window resize / orientationchange: перетаскивание границы окна на десктопе и
  //     поворот устройства. Без него канвас остаётся в СТАРОМ масштабе — измерено: после
  //     ресайза 1280×800 → 390×844 без перезагрузки канвас держит прежние 450×800 со
  //     сдвигом x=-30, HUD обрезан по 30px с каждого края. После F5 всё выглядит верно,
  //     поэтому глазами баг не находится.
  const refreshScale = () => game.scale.refresh();
  window.addEventListener('resize', refreshScale);
  window.addEventListener('orientationchange', refreshScale);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refreshScale);

  // ОТЛАДОЧНАЯ РУЧКА ДЛЯ СМОУК-ТЕСТА — ТОЛЬКО НА ЛОКАЛЬНОМ СЕРВЕРЕ.
  // PLAYTEST.md требует прогонять живую игру в браузере, но добраться до сцены снаружи
  // нечем: Phaser 3 не ведёт глобального списка игр. Без этой ручки «прохождение района»
  // невозможно автоматизировать, а оба последних дефекта нашлись именно живой игрой.
  // Условие по hostname: на площадке игра открывается с домена Яндекса, поэтому в
  // продакшене поле не появляется вовсе.
  if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__game = game;
}

start();
