// Точка входа. Инициализирует площадку, язык, звук, автопаузу и запускает Phaser.
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
import { HeroesScene } from './scenes/HeroesScene.js';
import { AltarScene } from './scenes/AltarScene.js';
import { MapScene } from './scenes/MapScene.js';
import { CombatScene } from './scenes/CombatScene.js';
import { RewardScene } from './scenes/RewardScene.js';
import { RestScene } from './scenes/RestScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { EventScene } from './scenes/EventScene.js';
import { ResultScene } from './scenes/ResultScene.js';

// Портрет: массовый формат Яндекс Игр. Ширина 720 задаёт размер карты в руке (150 px)
// и число колонок на карте урочища (4) — менять её нельзя, не пересчитав и то, и другое.
const BASE_WIDTH = 720;
const BASE_HEIGHT = 1280;

// Номер счётчика Яндекс Метрики этой игры. Вписывает скрипт:
// python library/tools/metrika.py create games/likho
const METRICA_ID = 111640176;

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#16121c',
  scale: {
    mode: Phaser.Scale.FIT,            // без деформации элементов (требование модерации)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  scene: [
    BootScene, PreloadScene, MenuScene, HeroesScene, AltarScene,
    MapScene, CombatScene, RewardScene, RestScene, ShopScene, EventScene, ResultScene,
  ],
};

async function start() {
  // §1.6.2.7 модерации: правый клик / долгий тап не должен открывать системное меню
  // браузера и выделять текст. В карточной игре это особенно заметно: игрок держит
  // палец на карте, и браузер норовит «выделить» её подпись.
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('selectstart', (e) => e.preventDefault());
  window.addEventListener('dragstart', (e) => e.preventDefault());

  await YA.init();
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || YA.getLang());
  Analytics.init(METRICA_ID, GAME_ID, {
    platform: Platform.isVk ? 'vk' : 'yandex',
    bridge: Platform.isVk ? window.vkBridge : null,
  });

  const game = new Phaser.Game(config);
  // Ручка для смоук-теста (PLAYTEST.md). Импорт динамический и защищён catch: папку
  // `src/dev/` релизная сборка ВЫРЕЗАЕТ, и в билде на модерации этого кода нет вовсе —
  // требование A5 чек-листа («нет dev-панелей и отладочных читов в релизе») выполняется
  // физически, а не «спрятано за параметром».
  if (new URLSearchParams(location.search).has('probe')) {
    import('./dev/probe.js').then((m) => m.mount(game)).catch(() => {});
  }
  document.getElementById('boot')?.remove();
  Audio.attach(game);
  setupLifecycle(game);

  // Пересчёт масштаба при любом изменении размера окна. Два источника намеренно:
  //   - visualViewport: мобильный прячет/показывает адресную строку, размера окна это
  //     не меняет (подстраховка к 100dvh, TEMPLATE-VERSION v18);
  //   - window resize: перетаскивание границы окна на десктопе. Без него холст оставался
  //     в старом масштабе, и портретная колонка вылезала за экран — верх и низ (заголовок
  //     и нижние кнопки) обрезались. Поймано скриншотом на 1920×1080 после смены размера
  //     БЕЗ перезагрузки; после F5 всё было верно, поэтому глазами такое не находится.
  const refresh = () => game.scale.refresh();
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refresh);
}

start();
