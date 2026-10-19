// Точка входа. Инициализирует Yandex SDK, язык, звук, автопаузу и запускает Phaser.
import { Platform, GAME_ID } from './platform/index.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Analytics } from './core/analytics.js';
import { setupLifecycle } from './core/lifecycle.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

// ОРИЕНТАЦИЯ ИГРЫ. Выбирается ОДИН РАЗ при создании игры и ПОД ЖАНР, а не по умолчанию:
// правило выбора — CONVENTIONS.md, раздел 16. Это же значение ставится в поле «Ориентация»
// черновика консоли (п.1.6.1.3 требований Яндекса: игра с одной ориентацией обязана его
// объявить, иначе площадка не покажет заглушку «поверните устройство»).
// Раскладку под обе ориентации даёт src/ui/layout.js — координаты в сценах не считать.
const ORIENTATION = 'portrait';   // 'portrait' | 'landscape'

// Базовое разрешение. Длинная сторона 1280, короткая 720 — одна пара на обе ориентации,
// чтобы плотность пикселей и размеры шрифтов не разъезжались при смене.
const BASE_WIDTH = ORIENTATION === 'landscape' ? 1280 : 720;
const BASE_HEIGHT = ORIENTATION === 'landscape' ? 720 : 1280;

// Номер счётчика Яндекс Метрики этой игры. Создаёт и вписывает скрипт:
// python library/tools/metrika.py create games/<игра>
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = 113679554;

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

  await Platform.init();    // сначала SDK выбранной площадки (работает и без него, локально)
  // Язык игрока: ?lang= (им пользуется модерация) → SDK площадки → язык браузера.
  // Без navigator-фолбэка недоступный SDK молча ронял язык на русский у любого
  // модератора — отказ по п.2.14 («Осуши озеро» 2026-08-20, «Рубеж» 2026-07-29).
  // Незнакомый язык i18n сам уводит на en (п.8.2.3).
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || Platform.getLang() || navigator.language);
  Analytics.init(METRICA_ID, GAME_ID, {
    platform: Platform.isVk ? 'vk' : 'yandex',
    bridge: Platform.isVk ? window.vkBridge : null,
  });

  const game = new Phaser.Game(config);
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

  // Подстраховка к 100dvh в index.html: на мобильном при скрытии/показе адресной
  // строки #game меняет реальный размер, Phaser должен пересчитать масштаб. Обычный
  // window resize не всегда долетает вовремя на этот конкретный случай (только смена
  // видимой области, не размера окна) — visualViewport.resize ловит его надёжнее.
  // TEMPLATE-VERSION.md v18: низ игры (нижние кнопки/HUD) уезжал за экран на телефоне.
  // ДВА источника, оба обязательны:
  //   - visualViewport: мобильный прячет/показывает адресную строку, размер окна при этом
  //     НЕ меняется, и обычный resize не приходит;
  //   - window resize / orientationchange: перетаскивание границы окна на десктопе и
  //     поворот устройства. Без него холст остаётся в старом масштабе — на игре в портрете
  //     колонка вылезала за экран, верх и низ (заголовок и нижние кнопки) обрезались.
  //     После F5 всё выглядело верно, поэтому глазами такое не находится; поймано
  //     измерением canvas.style в браузере на «Лихе» (v32).
  const refreshScale = () => game.scale.refresh();
  window.addEventListener('resize', refreshScale);
  window.addEventListener('orientationchange', refreshScale);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refreshScale);
}

start();
