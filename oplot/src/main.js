// Точка входа. Инициализирует Yandex SDK, язык, звук, автопаузу и запускает Phaser.
import { YA } from './yandex/sdk.js';
import { i18n } from './i18n/strings.js';
import { Audio } from './core/audio.js';
import { Analytics } from './core/analytics.js';
import { GAME_ID } from './yandex/save.js';
import { setupLifecycle } from './core/lifecycle.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { MissionsScene } from './scenes/MissionsScene.js';
import { BuildScene } from './scenes/BuildScene.js';
import { BlueprintScene } from './scenes/BlueprintScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { Platform } from './platform/index.js';
import { ANALYTICS_COUNTERS } from './data/analytics-config.js';

// ОРИЕНТАЦИЯ ИГРЫ (CONVENTIONS.md, раздел 16). Альбом — жанр требует: две базы
// бок о бок и растущее по главам поле — ось горизонтальная, портрет резал бы
// ширину поля (720 px потолок), в который упирается вся геометрия. Портрет
// стоял здесь как инерция шаблона v29, а не решение — исправлено 21.08.
// Это же значение идёт в поле «Ориентация» черновика консоли (п.1.6.1.3).
const ORIENTATION = 'landscape';   // 'portrait' | 'landscape'

// Базовое разрешение. Длинная сторона 1280, короткая 720 — одна пара на обе
// ориентации, чтобы плотность пикселей и размеры шрифтов не разъезжались.
const BASE_WIDTH = ORIENTATION === 'landscape' ? 1280 : 720;
const BASE_HEIGHT = ORIENTATION === 'landscape' ? 720 : 1280;

// Номер счётчика Яндекс Метрики этой игры. Создаёт и вписывает скрипт:
// python library/tools/metrika.py create games/<игра>
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = ANALYTICS_COUNTERS[Platform.name] || 0;

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#1d2b3a',
  render: {
    // Rounding the camera changes static pixels when projectile Graphics are
    // rendered inside moving Containers. Keep the same sampling for all draws.
    antialias: true, pixelArt: false, roundPixels: false,
    // 256px notebook textures are displayed at roughly 40px per cell.
    // Filter pre-reduced texture levels to suppress aliasing of fine hatching.
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
  },
  scale: {
    mode: Phaser.Scale.FIT,            // без деформации элементов (требование модерации)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  scene: [BootScene, PreloadScene, MenuScene, MissionsScene, BuildScene, BlueprintScene, UpgradeScene, BattleScene, ResultScene]
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
  if (Platform.name === 'vk') {
    if (Platform.available) await Platform.save.load();
    if (!Platform.available || Platform._loadFailed) {
      const boot = document.getElementById('boot');
      boot.replaceChildren();
      boot.style.cssText += ';flex-direction:column;gap:24px;padding:32px;color:#f1e8cf;text-align:center;font:24px sans-serif';
      const message = document.createElement('p');
      message.textContent = i18n.t('connection.failed');
      const retry = document.createElement('button');
      retry.textContent = i18n.t('connection.retry');
      retry.style.cssText = 'font:inherit;padding:12px 24px;cursor:pointer';
      retry.onclick = () => location.reload();
      boot.append(message, retry);
      return;
    }
  }
  Analytics.init(METRICA_ID, GAME_ID + '_' + Platform.name, { platform: Platform.name }); // аналитика поведения игроков
  window.addEventListener('pagehide', e => e.persisted ? Analytics.hide() : Analytics.end('pagehide'));
  window.addEventListener('pageshow', e => { if (e.persisted) Analytics.resume(); });
  document.addEventListener('visibilitychange', () => document.hidden ? Analytics.hide() : Analytics.resume());

  const game = new Phaser.Game(config);
  // Phaser стартовал — своя полоса загрузки Preload вот-вот появится, статичный лоадер убираем.
  document.getElementById('boot')?.remove();
  Audio.attach(game);       // единый менеджер звука
  setupLifecycle(game);     // автопауза при потере фокуса и рекламе

  // Пересчёт масштаба нужен на ДВА разных случая, и одного слушателя мало
  // (шаблон v32, найдено измерением canvas.style на «Лихе»: viewport 700, холст
  // 1080 — после F5 всё выглядело верно, баг живёт только между сменой размера
  // и перезагрузкой):
  //   - visualViewport.resize — мобильная адресная строка прячется/появляется,
  //     размер окна при этом НЕ меняется, обычный resize не приходит;
  //   - window resize / orientationchange — перетаскивание границы окна на
  //     десктопе и поворот устройства. Без него холст остаётся в старом
  //     масштабе, UI обрезается по краям — прямой пункт отказа модерации.
  const refreshScale = () => game.scale.refresh();
  window.addEventListener('resize', refreshScale);
  window.addEventListener('orientationchange', refreshScale);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refreshScale);
}

start();
