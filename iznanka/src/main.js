// Точка входа. Инициализирует Yandex SDK, язык, звук, автопаузу и запускает Phaser.
import { YA } from './yandex/sdk.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Analytics } from './core/analytics.js';
import { GAME_ID } from './yandex/save.js';
import { setupLifecycle } from './core/lifecycle.js';
import { THEME } from './ui/theme.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { HubScene } from './scenes/HubScene.js';
import { GameScene } from './scenes/GameScene.js';

// Базовое разрешение. Портрет под мобильный.
const BASE_WIDTH = 720;
const BASE_HEIGHT = 1280;

// Номер счётчика Яндекс Метрики этой игры. Создаёт и вписывает скрипт:
// python library/tools/metrika.py create games/iznanka
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = 111210221;

const config = {
  type: Phaser.AUTO,
  backgroundColor: THEME.colors.bg,
  scale: {
    mode: Phaser.Scale.FIT,            // без деформации элементов (требование модерации)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  scene: [BootScene, PreloadScene, MenuScene, HubScene, GameScene]
};

async function start() {
  // §1.6.2.7 модерации Яндекса: правый клик / долгий тап по игре не должен открывать
  // системное меню браузера и выделять текст/картинку. Контекстное меню + выделение.
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('selectstart', (e) => e.preventDefault());
  window.addEventListener('dragstart', (e) => e.preventDefault());

  await YA.init();          // сначала SDK (работает и без него, локально)
  // Язык игрока с площадки. Для локальной проверки перевода: ?lang=en в адресе.
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || YA.getLang());
  Analytics.init(METRICA_ID, GAME_ID); // аналитика поведения игроков

  const game = new Phaser.Game(config);
  // Инстанс наружу — для отладки из консоли и для смоук-тестов площадки: скрипт
  // publisher/vk/play-live.js проверяет РЕАЛЬНУЮ смену сцены внутри vk.ru/app<id>
  // через game.scene.getScenes(true), и без этой строки живой тест не видит игру
  // (11.08). Тот же приём, что window.ysdk в adapters/yandex.js.
  window.game = game;
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем.
  document.getElementById('boot')?.remove();
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе

  // Подстраховка к 100dvh в index.html (шаблон v18): обычный window resize не всегда
  // долетает вовремя именно на смену ВИДИМОЙ области (скрытие/показ адресной строки
  // мобильного браузера), а не размера самого окна — visualViewport.resize ловит её
  // надёжнее и заставляет Phaser пересчитать масштаб.
  window.visualViewport?.addEventListener('resize', () => game.scale.refresh());
}

start();
