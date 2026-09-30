// Точка входа. Инициализирует Yandex SDK, язык, звук, автопаузу и запускает Phaser.
import { YA } from './yandex/sdk.js';
import { Platform } from './platform/index.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Analytics } from './core/analytics.js';
import { GAME_ID } from './yandex/save.js';
import { setupLifecycle } from './core/lifecycle.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

// Базовое разрешение. Портрет под мобильный. Меняй под свою игру.
const BASE_WIDTH = 720;
const BASE_HEIGHT = 1280;

// Номер счётчика Яндекс Метрики этой игры. Создаёт и вписывает скрипт:
// python library/tools/metrika.py create games/<игра>
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = 111178229;
// Отдельный контур для общего билда VK Mini Apps (ВКонтакте + Одноклассники).
// Не смешиваем его с трафиком версии на Яндекс Играх.
const VK_METRICA_ID = 113226949;

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#1d2b3a',
  scale: {
    mode: Phaser.Scale.FIT,            // без деформации элементов (требование модерации)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene]
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
  // Незнакомый язык i18n сам уводит на en (п.8.2.3). Из library/game-template v35 —
  // перенесено в dream-wash только сейчас (2026-08-23, A9 release-checklist).
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || YA.getLang() || navigator.language);
  Analytics.init(Platform.name === 'vk' ? VK_METRICA_ID : METRICA_ID, GAME_ID);

  // Не фиксируем игровую область в 9:16, когда контейнер площадки выше или ниже:
  // Phaser FIT иначе центрирует canvas и оставляет заметные пустые полосы. Сохраняем
  // единую логическую ширину 720, а высоту расширяем под фактическое соотношение
  // контейнера. Верхний HUD и нижняя кнопка уже привязаны к краям, фон растягивается
  // на всю логическую высоту — поэтому контент остаётся целым без деформации.
  const logicalHeight = () => {
    // #game во время resize на один кадр может наследовать промежуточный размер
    // старого canvas. Игра занимает весь viewport, поэтому источником истины служит
    // layout viewport, а не текущий bounding box дочернего рендера.
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    return viewportWidth > 0 && viewportHeight > 0
      ? Math.round(BASE_WIDTH * viewportHeight / viewportWidth)
      : BASE_HEIGHT;
  };
  config.scale.height = logicalHeight();

  const game = new Phaser.Game(config);
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем.
  document.getElementById('boot')?.remove();
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе

  // Обычное изменение размера ОКНА (не только мобильная адресная строка) не долетает
  // до Phaser само по себе: ScaleManager в этой сборке не пересчитывает масштаб на
  // голый window 'resize' — canvas остаётся старого размера, autoCenter просто
  // сдвигает его по вертикали, и верх/низ игры обрезаются рамкой iframe (модерация
  // Яндекса, п.1.10.1, поймано скриншотом на короткое окно: полоса квеста обрезана
  // сверху, кнопка «Апгрейды» уехала за низ). Живой Playwright-репро: ресайз окна
  // после старта сцены БЕЗ этого листенера — canvas.getBoundingClientRect() не
  // менялся вообще, ни синтетический, ни явный dispatchEvent('resize') его не будил.
  // VK/ОК могут изменить размер iframe уже ПОСЛЕ инициализации bridge. Одного
  // refresh() недостаточно: он вписывает старое логическое поле и возвращает полосы.
  // Меняем саму логическую высоту и перестраиваем активную сцену. Перед рестартом
  // игровая сцена сохраняет прогресс, поэтому resize ничего не теряет.
  let resizeTimer = null;
  const resizeGame = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nextHeight = logicalHeight();
      if (Math.abs(nextHeight - game.scale.height) < 2) {
        game.scale.refresh();
        return;
      }
      const activeScenes = game.scene.getScenes(true);
      for (const scene of activeScenes) {
        if (scene.ready && typeof scene.persist === 'function') scene.persist();
      }
      game.scale.resize(BASE_WIDTH, nextHeight);
      for (const scene of activeScenes) scene.scene.restart();
    }, 180);
  };
  window.addEventListener('resize', resizeGame);
  // Подстраховка к 100dvh в index.html: на мобильном при скрытии/показе адресной
  // строки #game меняет реальный размер БЕЗ события window 'resize' — здесь нужен
  // именно visualViewport.resize. TEMPLATE-VERSION.md v18: низ игры (кнопка
  // «Апгрейды») уезжал за экран на телефоне.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeGame);
  }
}

start();
