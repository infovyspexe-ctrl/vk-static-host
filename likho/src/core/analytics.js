// АНАЛИТИКА поведения игроков. По умолчанию через Яндекс Метрику (цели/события).
// Это просто JS на странице игры, поэтому работает и на Яндекс Играх, и в VK, и в OK.
// Модуль провайдеро-независимый: сегодня Метрика, позже можно добавить VK, ничего в игре не меняя.
//
// Смысл: видеть, что игроки реально делают. Пользуются ли механикой три в ряд,
// на какой волне сливаются в шутере, доходят ли до конца. Точки контроля описаны
// в src/data/analytics-events.js и вызываются через Analytics.event(...).
let counterId = 0;
let ready = false;
let provider = 'console';
let vkBridge = null;
let gamePrefix = 'game'; // префикс ключей localStorage (имя папки игры)

function cleanParams(params = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null || !/^[a-zA-Z0-9_]{1,64}$/.test(key)) continue;
    if (typeof value === 'string') clean[key] = value.slice(0, 255);
    else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === 'boolean') clean[key] = value;
  }
  return clean;
}

function launchAttribution() {
  try {
    const query = new URLSearchParams(location.search);
    const result = {};
    for (const key of ['vk_ref', 'vk_platform', 'utm_source', 'utm_campaign', 'utm_content']) {
      const value = query.get(key);
      if (value) result[key] = value;
    }
    return result;
  } catch (e) { return {}; }
}

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
  init(id, prefix, options = {}) {
    counterId = id || 0;
    gamePrefix = prefix || gamePrefix;
    provider = options.platform === 'vk' ? 'vk' : 'metrika';
    vkBridge = options.bridge || window.vkBridge || null;
    if (provider === 'vk') {
      if (!vkBridge || typeof vkBridge.send !== 'function') {
        provider = 'console';
        console.warn('[Analytics] VK Bridge недоступен, события идут только в консоль');
        return;
      }
      ready = true;
      this.event('app_launch', launchAttribution());
      this.first('first_launch', launchAttribution());
      this.daily('return_day');
      return;
    }
    if (!counterId) {
      console.warn('[Analytics] счётчик не задан, события идут только в консоль');
      return;
    }
    if (/^(localhost|127\.|192\.168\.)/.test(location.hostname)) {
      console.warn('[Analytics] localhost — события только в консоль');
      return;
    }
    try {
      loadMetrica(counterId); ready = true;
      this.event('app_launch', launchAttribution());
      this.first('first_launch', launchAttribution());
      this.daily('return_day');
    }
    catch (e) { console.warn('[Analytics] init error', e); }
  },

  // name — короткое латинское имя события, params — необязательный объект деталей.
  // Пример: Analytics.event('wave_reached', { wave: 15 });
  event(name, params) {
    console.log('[Analytics]', name, params || '');
    if (ready && provider === 'vk' && vkBridge) {
      vkBridge.send('VKWebAppTrackEvent', {
        event_name: String(name).slice(0, 255),
        event_params: cleanParams({ game: gamePrefix, ...params }),
      }).catch((e) => console.warn('[Analytics] VK event error', e));
    } else if (ready && window.ym) {
      try { window.ym(counterId, 'reachGoal', name, params || {}); } catch (e) {}
    }
  },

  // Событие «раз за всю жизнь игрока на устройстве» — для точек вида
  // <механика>_first_use: отличает «заглянул и ушёл» от «пользуется».
  // Флаги в localStorage с префиксом игры, сейв игры не трогается.
  first(name, params) {
    try {
      const key = gamePrefix + '_metrika_first';
      const seen = JSON.parse(localStorage.getItem(key) || '{}');
      if (seen[name]) return;
      seen[name] = 1;
      localStorage.setItem(key, JSON.stringify(seen));
    } catch (e) { return; }
    this.event(name, params);
  },

  daily(name, params = {}) {
    const day = Math.floor(Date.now() / 86400000);
    try {
      const key = gamePrefix + '_analytics_daily_' + name;
      if (Number(localStorage.getItem(key)) === day) return;
      localStorage.setItem(key, String(day));
    } catch (e) { return; }
    this.event(name, { ...params, day });
  }
};
