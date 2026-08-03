// ТОЧКА ВХОДА. Инициализирует площадку (SDK), язык, аналитику, сейв, физику,
// рендер и главный цикл. Управление: указатель (тач и мышь) + клавиатура
// (стрелки, пробел/Enter, Esc) — требование модерации про все устройства.
import { Platform, GAME_ID } from './platform/index.js';
import { i18n } from './i18n/strings.js';
import { Analytics } from './core/analytics.js';
import { Audio } from './core/audio.js';
import { setupLifecycle, Lifecycle } from './core/lifecycle.js';
import { Physics } from './game/physics.js';
import { Game } from './game/game.js';
import { Pantry } from './game/pantry.js';
import { Render } from './game/render.js';
import { Assets } from './game/assets.js';

// Номер счётчика Яндекс Метрики этой игры. Создаёт и вписывает скрипт:
// python library/tools/metrika.py create games/kladovaya
// 0 значит аналитика пишет события только в консоль (для локальной разработки).
const METRICA_ID = 110908840;

// Штамп сборки: печатается в консоль при старте. Если игрок видит старое
// поведение — первым делом сверить штамп (вкладка могла держать старые модули).
const BUILD = '2026-07-22c (контуры игрока, страховка флагов слияний)';

const STEP_MS = 1000 / 60;

function setupInput() {
  const canvas = Render.canvas;

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = Render.toLogical(e.clientX, e.clientY);
    Game.pointerDown(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = Render.toLogical(e.clientX, e.clientY);
    Game.pointerMove(p.x, p.y);
  });
  // pointerup ловим на window: палец/мышь могли уехать за канвас.
  window.addEventListener('pointerup', () => Game.pointerUp());

  const KEYS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ' ': 'confirm',
    Enter: 'confirm',
    Escape: 'back'
  };
  document.addEventListener('keydown', (e) => {
    const action = KEYS[e.key];
    if (!action) return;
    e.preventDefault();
    Game.key(action);
  });

  // Разбудить WebAudio после первого жеста (autoplay policy).
  document.addEventListener('pointerdown', () => Audio.unlock(), { once: true });
}

function loop() {
  let last = performance.now();
  let acc = 0;
  const frame = (t) => {
    let dt = t - last;
    last = t;
    if (Lifecycle.paused) {
      acc = 0;
    } else {
      // Кап на случай возврата из фона: не проматываем физику большим скачком.
      acc += Math.min(dt, 100);
      while (acc >= STEP_MS) {
        Game.step(STEP_MS);
        acc -= STEP_MS;
      }
    }
    Render.draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function start() {
  console.log('[kladovaya] сборка:', BUILD);
  await Platform.init(); // работает и без SDK (локальная разработка)
  // Язык игрока с площадки. Локальная проверка перевода: ?lang=en в адресе.
  const urlLang = new URLSearchParams(location.search).get('lang');
  i18n.init(urlLang || Platform.getLang());
  Analytics.init(METRICA_ID, GAME_ID);

  const save = (await Platform.save.load()) || {};

  // Арт и музыка грузятся фоном: игра играбельна сразу на кодовой графике.
  Assets.init();
  // Оба трека одобрены пользователем 2026-07-21, играют по очереди.
  Audio.music(['assets/music/bg1.mp3', 'assets/music/bg2.mp3']);

  Physics.init();
  Render.init();
  Game.init(save);
  setupLifecycle();
  setupInput();
  loop();

  // Спиннер первого кадра больше не нужен — игра рисует сама.
  const boot = document.getElementById('boot');
  if (boot) boot.remove();

  // Игра загружена и готова к показу (LoadingAPI, обязательный вызов).
  Platform.ready();

  // Отладка из консоли и смоук-тестов (PLAYTEST.md). Только локально или по
  // ?debug: в релизе игрокам читы не оставляем (чек-лист A5).
  if (/^(localhost|127\.|192\.168\.)/.test(location.hostname) ||
      new URLSearchParams(location.search).has('debug')) {
    window.debug = { Game, Physics, Platform, Pantry, Audio };
  }

  // Ключевая точка сейва: уход со страницы. pagehide — вместе с beforeunload/
  // visibilitychange: в сандбокс-iframe VK Mini Apps (веб) и в мобильных WebView эти
  // события ведут себя не так надёжно, как в обычной вкладке браузера (грабля №3,
  // adapters/vk.js) — дублируем, лишний flush() при пустом кеше это no-op.
  window.addEventListener('beforeunload', () => Platform.save.flush());
  window.addEventListener('pagehide', () => Platform.save.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Platform.save.flush();
  });
}

start();
