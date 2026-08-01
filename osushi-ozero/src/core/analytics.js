import { storage } from './safe-storage.js';
// АНАЛИТИКА поведения игроков. По умолчанию через Яндекс Метрику (цели/события).
// Это просто JS на странице игры, поэтому работает и на Яндекс Играх, и в VK, и в OK.
// Модуль провайдеро-независимый: сегодня Метрика, позже можно добавить VK, ничего в игре не меняя.
//
// Смысл: видеть, что игроки реально делают. Пользуются ли механикой три в ряд,
// на какой волне сливаются в шутере, доходят ли до конца. Точки контроля описаны
// в src/data/analytics-events.js и вызываются через Analytics.event(...).
let counterId = 0;
let ready = false;
let gamePrefix = 'game'; // префикс ключей localStorage (имя папки игры)

function loadMetrica(id) {
  (function (m, e, t, r, i) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    for (let j = 0; j < e.scripts.length; j++) { if (e.scripts[j].src === r) return; }
    const k = e.createElement(t); const a = e.getElementsByTagName(t)[0];
    k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
}

export const Analytics = {
  // Вызывается один раз в main.js: номер счётчика Метрики этой игры и GAME_ID
  // (префикс ключей localStorage для first(), см. CONVENTIONS.md, раздел 7).
  // На localhost счётчик не грузится, события идут только в консоль.
  init(id, prefix) {
    counterId = id || 0;
    gamePrefix = prefix || gamePrefix;
    if (!counterId) {
      console.warn('[Analytics] счётчик не задан, события идут только в консоль');
      return;
    }
    if (/^(localhost|127\.|192\.168\.)/.test(location.hostname)) {
      console.warn('[Analytics] localhost — события только в консоль');
      return;
    }
    try { loadMetrica(counterId); ready = true; }
    catch (e) { console.warn('[Analytics] init error', e); }
  },

  // name — короткое латинское имя события, params — необязательный объект деталей.
  // Пример: Analytics.event('wave_reached', { wave: 15 });
  event(name, params) {
    console.log('[Analytics]', name, params || '');
    if (ready && window.ym) {
      try { window.ym(counterId, 'reachGoal', name, params || {}); } catch (e) {}
    }
  },

  // Событие «раз за всю жизнь игрока на устройстве» — для точек вида
  // <механика>_first_use: отличает «заглянул и ушёл» от «пользуется».
  // Флаги в localStorage с префиксом игры, сейв игры не трогается.
  first(name, params) {
    try {
      const key = gamePrefix + '_metrika_first';
      const seen = JSON.parse(storage()?.getItem(key) || '{}');
      if (seen[name]) return;
      seen[name] = 1;
      storage()?.setItem(key, JSON.stringify(seen));
    } catch (e) { return; }
    this.event(name, params);
  }
};
