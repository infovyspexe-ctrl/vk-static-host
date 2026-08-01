// Точка входа. Инициализирует Yandex SDK, язык, звук, автопаузу и запускает Phaser.
import { YA } from './yandex/sdk.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Analytics } from './core/analytics.js';
import { EVENTS } from './data/analytics-events.js';
import { GAME_ID, Save } from './yandex/save.js';
import { setupLifecycle } from './core/lifecycle.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { CollectionScene } from './scenes/CollectionScene.js';
import { MiniGameScene } from './scenes/MiniGameScene.js';
import { TimingBarScene } from './scenes/TimingBarScene.js';
import { ShellGameScene } from './scenes/ShellGameScene.js';

// Базовое разрешение. Портрет под мобильный. Меняй под свою игру.
const BASE_WIDTH = 720;
const BASE_HEIGHT = 1280;

// Номер счётчика Яндекс Метрики этой игры. Создать счётчик и вписать сюда.
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = 110759101;

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
  scene: [BootScene, PreloadScene, MenuScene, GameScene, CollectionScene, MiniGameScene, TimingBarScene, ShellGameScene]
};

async function start() {
  // §1.6 модерации Яндекса: контекстное меню браузера отключено в игровой области
  // (правый клик / долгий тап) — иначе поверх игры вылезает системное меню браузера.
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  await YA.init();          // сначала SDK (работает и без него, локально)
  // Язык игрока с площадки. Для локальной проверки перевода: ?lang=en в адресе.
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || YA.getLang());
  Analytics.init(METRICA_ID, GAME_ID); // аналитика поведения игроков
  Analytics.event(EVENTS.GAME_START);  // сессия началась
  setupSessionEnd();

  const game = new Phaser.Game(config);
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем.
  document.getElementById('boot')?.remove();
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе
  if (new URLSearchParams(location.search).get('draft')) window.__reshala = game; // dev-хендл для смоук-теста
}

// session_end: конец сессии с прогрессом. Ловим и pagehide (закрытие/уход со страницы),
// и сворачивание вкладки (visibilitychange -> hidden) — на мобильных pagehide может не прийти.
// Дедупликация: не слать дважды подряд; вернулся во вкладку — счётчик взводится заново.
function setupSessionEnd() {
  let sent = false;
  const send = () => {
    if (sent) return;
    sent = true;
    const p = Save.cache || {}; // текущий кэш сейва (bestDays/runs), без асинхронщины
    Analytics.event(EVENTS.SESSION_END, { best_days: p.bestDays || 0, runs: p.runs || 0 });
    // Уход со страницы — ключевая точка синхронизации: по ходу забега update() пишет только
    // локально, и накопленное (встречи персонажей) надо досоставить в облако. Ждать нельзя,
    // страница уже уходит — шлём как есть; локальное зеркало на этот момент уже актуально,
    // так что даже если запрос не успеет, следующий старт поднимет прогресс из него.
    Save.flush();
  };
  window.addEventListener('pagehide', send);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
    else sent = false; // игрок вернулся — следующий уход снова считается концом сессии
  });
}

start();
