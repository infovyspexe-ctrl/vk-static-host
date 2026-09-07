// Точка входа. Инициализирует Yandex SDK, язык, звук, автопаузу и запускает Phaser.
import { YA } from './yandex/sdk.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Sfx } from './core/sfx.js';
import { Analytics } from './core/analytics.js';
import { GAME_ID } from './yandex/save.js';
import { Platform } from './platform/index.js';
import { setupLifecycle } from './core/lifecycle.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

// Базовое разрешение. Портрет под мобильный (массовый формат Яндекс Игр с телефона).
// Арена-сурвайвер: сверху HUD, центр — арена, снизу — джойстик/кнопки.
const BASE_WIDTH = 720;
const BASE_HEIGHT = 1280;

// Номер счётчика Яндекс Метрики этой игры. Создаёт и вписывает скрипт:
// python library/tools/metrika.py create games/cosmic-drift
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = 111624442;

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#05060f',
  scale: {
    mode: Phaser.Scale.FIT,            // без деформации элементов (требование модерации)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene]
};

async function start() {
  // §1.6.2.7 модерации Яндекса: правый клик / долгий тап по игре не должен открывать
  // системное меню браузера и выделять текст/картинку. Контекстное меню + выделение.
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('selectstart', (e) => e.preventDefault());
  window.addEventListener('dragstart', (e) => e.preventDefault());

  await YA.init();          // сначала SDK (работает и без него, локально)
  // Язык игрока с площадки. Для локальной проверки перевода: ?lang=en в адресе.
  // Полная цепочка фолбэков (шаблон v35, отказ п.2.14): URL → SDK площадки →
  // язык браузера. YA.getLang() отдаёт null, если SDK недоступен, — тогда берём
  // navigator.language, а не молча роняем в жёсткий дефолт (i18n.init сам сведёт
  // неизвестный язык к поддерживаемому).
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || YA.getLang() || navigator.language);
  Analytics.init(METRICA_ID, GAME_ID, {
    platform: Platform.isVk ? 'vk' : 'yandex',
    bridge: Platform.isVk ? window.vkBridge : null,
  }); // аналитика поведения игроков

  const game = new Phaser.Game(config);
  if (location.hostname === 'localhost') window.__game = game; // временный отладочный хук
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем.
  document.getElementById('boot')?.remove();
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе

  // Режим съёмки промо-роликов: `?shoot=1` открывает панель, `?shoot=1&save=<пресет>`
  // сразу подставляет состояние игры. Нужен человеку, который записывает видео, —
  // чтобы не доигрывать до поздних уровней ради трёх секунд кадра (RECORDING.md).
  // Импорт динамический и защищён catch: папку src/dev/ релизная сборка ВЫРЕЗАЕТ, и в
  // билде на модерации этого кода нет вовсе (build.py SKIP_DIRS + проверка premod_check).
  if (new URLSearchParams(location.search).has('shoot')) {
    import('./dev/shootMode.js').then((m) => m.ShootMode.mount()).catch(() => {});
  }
  // Гейт синтезатора звука (core/sfx.js): играть, только если звук не выключен и не на паузе.
  // Без этого свои эффекты шли МИМО Audio.mute — грабля, уже стоившая бага в sweet-empire.
  Sfx.gate = () => !Audio.muted && !Audio.paused;

  // Подстраховка к 100dvh в index.html: на мобильном при скрытии/показе адресной
  // строки #game меняет реальный размер, Phaser должен пересчитать масштаб. Обычный
  // window resize не всегда долетает вовремя на этот конкретный случай (только смена
  // видимой области, не размера окна) — visualViewport.resize ловит его надёжнее.
  // TEMPLATE-VERSION.md v18: низ игры (нижние кнопки/HUD) уезжал за экран на телефоне.
  // ДВА источника, оба обязательны:
  //   - visualViewport: мобильный прячет/показывает адресную строку, размер окна при этом
  //     НЕ меняется, и обычный resize не приходит;
  //   - window resize / orientationchange: перетаскивание границы окна на десктопе и
  //     поворот устройства. Без него холст остаётся в старом масштабе — HUD режется при
  //     изменении окна без перезагрузки (реальный отказ «Мойки Мечты» 2026-08-23, п.1.10.1;
  //     шаблон v32). После F5 всё выглядело верно — глазами такое не находится.
  const refreshScale = () => game.scale.refresh();
  window.addEventListener('resize', refreshScale);
  window.addEventListener('orientationchange', refreshScale);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refreshScale);
}

start();
