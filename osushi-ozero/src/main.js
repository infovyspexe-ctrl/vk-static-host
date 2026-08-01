// Точка входа. Инициализирует площадку (SDK), язык, звук, автопаузу и запускает Phaser.
import { Platform, GAME_ID } from './platform/index.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Analytics } from './core/analytics.js';
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
const METRICA_ID = 110802576;

// Сколько CSS-пикселей снизу отдаём под sticky-баннер VK (сам баннер ~50 px, плюс
// требуемый правилами зазор до функциональных элементов). Только для VK — на Яндексе
// баннер живёт вне игрового iframe и место резервировать не нужно.
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
  // системное меню браузера и выделять текст/картинку (иначе отказ). Переносится из
  // шаблона v14 — в v6 этого не было.
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('selectstart', (e) => e.preventDefault());
  window.addEventListener('dragstart', (e) => e.preventDefault());

  await Platform.init();    // сначала площадка (работает и без неё, локально)
  // Язык игрока с площадки. Для локальной проверки перевода: ?lang=en в адресе.
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || Platform.getLang());
  // Аналитика поведения игроков. На VK не поднимаем: счётчик Метрики заведён под
  // аудиторию Яндекс Игр, а лишний внешний хост площадки Яндекса в VK-билде — ровно
  // то, чего требует избегать п.4.2.6 правил VK (никаких других площадок в билде).
  Analytics.init(Platform.isVk ? 0 : METRICA_ID, GAME_ID);

  // МЕСТО ПОД STICKY-БАННЕР VK. Баннер VK не «раздвигает» приложение, а лежит поверх
  // него снизу, поэтому нижние кнопки игры (Прокачка / Вёдра / ×2, «Закрыть» в
  // оверлеях) оказались бы ПОД ним: и нарушение п.5.1.5.3 (функциональные элементы
  // не ближе 20 px к активной зоне баннера), и случайные клики по рекламе, за которые
  // площадка режет выплаты. Ужимаем контейнер игры один раз здесь, а не двигаем
  // элементы по одному: FIT-масштабирование само впишет всю сцену в оставшуюся высоту,
  // и ни один будущий элемент внизу мимо этого не проедет.
  if (Platform.isVk) {
    document.getElementById('game').style.height = 'calc(100% - ' + VK_BANNER_RESERVE_PX + 'px)';
  }

  const game = new Phaser.Game(config);
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем (B11).
  document.getElementById('boot')?.remove();
  window.game = game;       // доступ из консоли для смоук-тестов (PLAYTEST.md)
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе
}

start();
