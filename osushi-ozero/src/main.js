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

// ВЫСОТА СЦЕНЫ ПОД ПРОПОРЦИИ ОКНА. FIT вписывает сцену целиком, поэтому при несовпадении
// пропорций по краям остаются пустые поля — за них VK отклонил игру 02.08 («большие
// отступы, которые не несут функциональной нагрузки»).
//
// Ширина игры ВСЕГДА 720: на ней держится вся геометрия озера (стены, сливы, зоны), её
// трогать нельзя. Подгоняем высоту — окно выше пропорции 9:16 просто показывает больше
// мира по вертикали, камера и так скроллит.
//
// Высоту только УВЕЛИЧИВАЕМ (минимум BASE_HEIGHT): более высокая сцена безопасна, а более
// низкая ломает длинные списки в оверлеях (10 шапок = 840 px строк + кнопка «Закрыть»).
// Если окно шире 9:16 и площадка не дала подогнать фрейм — остаётся минимум, и поля
// по бокам сохраняются: это честный запасной вариант, а не поломанная вёрстка.
function logicalHeight(viewW, viewH) {
  if (!viewW || !viewH) return BASE_HEIGHT;
  return Math.round(Math.max(BASE_HEIGHT, BASE_WIDTH * viewH / viewW));
}

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

  // ФРЕЙМ ПОД ИГРУ — СТРАХОВКА, а не основной механизм.
  // Основное место, где живёт размер окна, — настройка «Отображение → Размер iframe» в
  // панели VK (документация dev.vk.ru/ru/games/settings/general/display: минимум 630×600,
  // максимум 1000×4050, в широкоформатном режиме ширина игнорируется). Панель по умолчанию
  // ставит 911×700, и для портретной игры это фрейм в полтора раза шире поля — готовый
  // отказ модерации про «большие отступы» (получен 05.08). У нашей игры в панели задано
  // 630×1120 под пропорции 720×1280.
  //
  // Здесь только защита от того, что настройку однажды собьют: если фактический фрейм
  // заметно шире пропорций игры, просим свой размер через VK Bridge. Когда панель
  // настроена верно, этот код не делает ничего.
  const frame = document.getElementById('game').getBoundingClientRect();
  const GAME_ASPECT = BASE_WIDTH / BASE_HEIGHT;
  if (frame.height && frame.width / frame.height > GAME_ASPECT * 1.1) {
    console.warn('[main] фрейм шире пропорций игры — прошу свой размер (проверь «Отображение» в панели VK)');
    await Platform.fitFrame(GAME_ASPECT);
  }

  // МЕСТО ПОД STICKY-БАННЕР. Баннер VK не «раздвигает» приложение, а лежит поверх него
  // снизу, поэтому нижние кнопки игры (Прокачка / Вёдра / ×2, «Закрыть» в оверлеях)
  // оказались бы ПОД ним: и нарушение п.5.1.5.3 (функциональные элементы не ближе 20 px
  // к активной зоне баннера), и случайные клики по рекламе, за которые площадка режет
  // выплаты. Ужимаем контейнер игры один раз здесь, а не двигаем элементы по одному.
  // Резервируем ТОЛЬКО там, где баннер реально бывает (мобильные клиенты VK): на
  // десктопе баннера нет, и полоса внизу была бы пустой — тот же отказ про отступы.
  const reserve = Platform.hasStickyBanner() ? VK_BANNER_RESERVE_PX : 0;
  const gameBox = document.getElementById('game');
  if (reserve) gameBox.style.height = 'calc(100% - ' + reserve + 'px)';

  // Пропорции считаем ПОСЛЕ подгонки фрейма и резерва — по реальному размеру контейнера.
  const box = gameBox.getBoundingClientRect();
  config.scale.height = logicalHeight(box.width, box.height);

  const game = new Phaser.Game(config);
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем (B11).
  document.getElementById('boot')?.remove();
  window.game = game;       // доступ из консоли для смоук-тестов (PLAYTEST.md)
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе
}

start();
