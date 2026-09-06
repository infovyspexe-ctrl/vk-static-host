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

// Сколько CSS-пикселей снизу отдаём под sticky-баннер VK (сам баннер ~50 px, плюс
// требуемый правилами зазор до функциональных элементов, п.5.1.5.3). Только для VK —
// на Яндексе баннер живёт вне игрового iframe, место резервировать не нужно. Из
// games/osushi-ozero (уже проверено модерацией VK).
const VK_BANNER_RESERVE_PX = 72;

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
  // На VK не подгружаем счётчик другой платформы: карточка и билд должны быть
  // самодостаточными, а сторонний трекер не нужен для работы игры.
  Analytics.init(Platform.name === 'vk' ? 0 : METRICA_ID, GAME_ID);

  // VK: зарезервировать место под sticky-баннер снизу ДО создания Phaser — тогда
  // FIT-масштабирование само впишет всю сцену в оставшуюся высоту, и ни один элемент
  // внизу (кнопка «Апгрейды») не окажется под баннером/ближе разрешённого зазора.
  if (Platform.name === 'vk') {
    document.getElementById('game').style.height = 'calc(100% - ' + VK_BANNER_RESERVE_PX + 'px)';
  }

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
  window.addEventListener('resize', () => game.scale.refresh());
  // Подстраховка к 100dvh в index.html: на мобильном при скрытии/показе адресной
  // строки #game меняет реальный размер БЕЗ события window 'resize' — здесь нужен
  // именно visualViewport.resize. TEMPLATE-VERSION.md v18: низ игры (кнопка
  // «Апгрейды») уезжал за экран на телефоне.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => game.scale.refresh());
  }
}

start();
