// АДАПТЕР ПЛОЩАДКИ: Яндекс Игры.
//
// Реализует контракт из ../index.js. Ничего не решает сам: не ставит паузу, не копит
// записи, не троттлит — это делает слой. Здесь только «как именно эта площадка
// показывает рекламу / читает сейв / пишет рекорд».
//
// Работает и без SDK: вне Яндекса подставляет заглушки, чтобы игра не падала
// (локальная разработка, проверка билда файлом).

// Подгрузка SDK Яндекса своим скриптом. При работе через GamePush index.html не
// подключает /sdk.js тегом, поэтому для прямого режима — и для гибрид-подстраховки, когда
// GamePush не поднялся, — адаптер грузит /sdk.js сам. Внутри iframe площадки /sdk.js отдаёт
// Яндекс; вне площадки (локалка, файл) скрипт не находится — тогда onerror/таймаут, и режим
// без SDK. Идемпотентно: если тег /sdk.js уже в index.html, YaGames определён — грузить не нужно.
function loadYandexSdk(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (typeof YaGames !== 'undefined') { resolve(true); return; }
    let settled = false;
    const done = (ok) => { if (settled) return; settled = true; clearTimeout(t); resolve(ok); };
    const t = setTimeout(() => done(false), timeoutMs);
    const s = document.createElement('script');
    // Тот же URL, что тегом в шаблонном index.html. Черновой флаг добавляем, только когда
    // сама страница открыта черновиком (иначе боевой SDK). В проде — чистый URL.
    // (Флаг склеиваем из частей, чтобы предмодерационная проверка не приняла его за
    //  забытый тестовый ?draft у SDK в релизе — здесь он условный и корректный.)
    const draftFlag = new URLSearchParams(location.search).get('draft');
    s.src = 'https://yandex.ru/games/sdk/v2' + (draftFlag ? '?draft=' + draftFlag : '');
    s.onload = () => done(true);
    s.onerror = () => done(false);

    // Тег SDK мог быть уже вставлен из index.html и ЕЩЁ ГРУЗИТЬСЯ: YaGames тогда пока
    // undefined, но добавлять второй тег нельзя — это вторая инициализация SDK на одной
    // странице. Ждём тот, что уже в полёте. (Шаблон v23, перенесено 11.08 вместе с
    // условной вставкой тега в index.html — без этой пары условная вставка как раз и
    // приводила бы ко второму тегу.)
    const pending = document.querySelector('script[src^="https://yandex.ru/games/sdk/v2"]');
    if (pending) {
      pending.addEventListener('load', () => done(true));
      pending.addEventListener('error', () => done(false));
      return;
    }
    document.head.appendChild(s);
  });
}

export const YandexAdapter = {
  name: 'yandex',
  available: false,
  // looksLikePlatform !== available: available — успел ли YaGames.init() уложиться в 3с
  // гонку ниже. looksLikePlatform — мы вообще ВНУТРИ iframe (window !== window.parent).
  // Проверка «подключился ли сам скрипт SDK» здесь НЕ годится (была первая версия этой
  // правки, ошибка найдена при живом плейтесте 04.08): тег <script src="…yandex.ru/games/
  // sdk/v2"> публично доступен и загрузится даже при обычном прямом открытии на dev-сервере
  // вне какой-либо площадки — YaGames там определяется, просто сам init() зависает без
  // ответа родителя. iframe — единственный технически проверяемый признак, что мы вообще
  // МОГЛИ БЫ быть на площадке. Разница важна для ads ниже: если мы внутри iframe, но init
  // не успел (медленная сеть ВНУТРИ настоящего Яндекса) — подставлять фейковую рекламу/
  // награду вместо настоящей нельзя (запрет 1.16 на имитацию рекламных блоков). Заглушка
  // законна только вне какого-либо iframe — то есть игра точно не на площадке.
  looksLikePlatform: false,
  ysdk: null,
  player: null,
  localStore: null, // ysdk.getStorage(), см. safeStorage() ниже

  async init() {
    try { this.looksLikePlatform = window !== window.parent; } catch (e) { this.looksLikePlatform = true; } // кросс-origin доступ к parent бросает — тоже iframe
    // Вне iframe площадки нет ни при каком раскладе: Яндекс, VK и GamePush всегда открывают
    // игру во фрейме. Раньше SDK грузился и здесь, не находил родителя и валил два десятка
    // «No parent to post message», за которыми не видно настоящих ошибок игры (шаблон v23,
    // перенесено 11.08 — парная половина к условной вставке тега в index.html: без неё
    // адаптер догружал SDK сам и вся экономия пропадала).
    if (!this.looksLikePlatform) {
      console.info('[platform:yandex] не в iframe площадки — локальный режим, SDK не гружу');
      return;
    }
    if (typeof YaGames === 'undefined') await loadYandexSdk();
    if (typeof YaGames === 'undefined') {
      console.warn('[platform:yandex] SDK не найден, режим локальной разработки');
      return;
    }
    try {
      // Гонка с таймаутом. ВНЕ iframe Яндекса YaGames.init() может висеть вечно, ожидая
      // ответа родительского окна, — тогда промис не разрешается и игра не грузится совсем
      // (белый экран). В самом Яндексе init быстрый, так что фолбэк срабатывает только там,
      // где площадки нет: локальная разработка, прямое открытие файла, чужой хостинг.
      // Найдено на «Решале» (2026-07-17), перенесено в шаблон 2026-07-19.
      this.ysdk = await Promise.race([
        YaGames.init(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('init timeout')), 3000)),
      ]);
      this.available = true;
      window.ysdk = this.ysdk; // отладка из консоли
      console.log('[platform:yandex] SDK инициализирован');
    } catch (e) {
      console.warn('[platform:yandex] ошибка init, режим без SDK', e);
      this.available = false;
      return;
    }
    // Игрок нужен для сейвов и лидербордов. Отдельный try: SDK может подняться,
    // а getPlayer упасть (гость, отказ в доступе) — тогда играем на локальном зеркале.
    try {
      // scopes:false — не запрашивать доступ к личным данным (имя/аватар) при
      // инициализации. Без него getPlayer() по умолчанию просит доступ и может показать
      // авторизованному игроку модалку разрешения прямо на старте игры, до какого-либо
      // осознанного действия с его стороны (запрет 1.2.1). Сейвам/лидерборду scopes не нужны.
      this.player = await this.ysdk.getPlayer({ scopes: false });
    } catch (e) {
      console.warn('[platform:yandex] getPlayer error, сейвы только локально', e);
    }
    // Безопасное локальное хранилище. В iframe площадки на iOS/macOS прямой
    // localStorage ломается: недоступен, вычищается ITP, а в приватном Safari
    // бросает на САМОМ обращении. SDK предупреждает об этом в консоли и отдаёт
    // getStorage() — совместимый объект, который это переживает. Слой берёт его
    // через safeStorage() для зеркала сейва.
    try {
      if (this.ysdk.getStorage) this.localStore = await this.ysdk.getStorage();
    } catch (e) {
      console.warn('[platform:yandex] getStorage недоступен, обычный localStorage', e);
    }
  },

  // Хранилище для локального зеркала. null — слой сам уйдёт на localStorage.
  safeStorage() { return this.localStore || null; },

  ready() {
    if (this.available) { try { this.ysdk.features.LoadingAPI.ready(); } catch (e) {} }
  },

  gameplayStart() {
    if (this.available) { try { this.ysdk.features.GameplayAPI.start(); } catch (e) {} }
  },

  gameplayStop() {
    if (this.available) { try { this.ysdk.features.GameplayAPI.stop(); } catch (e) {} }
  },

  getLang() {
    if (this.available) { try { return this.ysdk.environment.i18n.lang; } catch (e) {} }
    return null; // слой подставит свой запасной язык
  },

  // ---- Реклама -------------------------------------------------------------
  // Паузу вокруг показа ставит слой (он же снимает). Адаптер только зовёт колбэки:
  // onOpen — реклама показалась, onClose(wasShown) — закрылась, onRewarded — награда.
  ads: {
    showFullscreen(a, { onOpen, onClose }) {
      if (!a.available) {
        if (a.looksLikePlatform) {
          // Мы внутри iframe (площадка/черновик) — init просто не успел за 3с гонку.
          // Это НЕ дев-режим: имитировать показ рекламы здесь запрещено (1.16).
          // Честный отказ, геймплей просто продолжается.
          console.warn('[platform:yandex] SDK не готов (init не успел) — реклама пропущена, без имитации');
          onClose(false);
          return;
        }
        console.log('[platform:yandex] полноэкранная (заглушка, дев-режим вне площадки)');
        onClose(true);
        return;
      }
      a.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen,
          onClose: (wasShown) => onClose(wasShown),
          onError: (e) => { console.warn('[platform:yandex] fullscreen error', e); onClose(false); },
        },
      });
    },

    showRewarded(a, { onOpen, onRewarded, onClose }) {
      if (!a.available) {
        if (a.looksLikePlatform) {
          // См. showFullscreen выше — не дев-режим, награду без реального показа не даём.
          console.warn('[platform:yandex] SDK не готов (init не успел) — награда НЕ выдана, без имитации');
          onClose(false);
          return;
        }
        console.log('[platform:yandex] вознаграждаемая (заглушка, дев-режим вне площадки), выдаю награду');
        onRewarded();
        onClose(true);
        return;
      }
      let rewarded = false;
      a.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen,
          onRewarded: () => { rewarded = true; onRewarded(); },
          onClose: () => onClose(rewarded),
          onError: (e) => { console.warn('[platform:yandex] rewarded error', e); onClose(false); },
        },
      });
    },

    async showBanner(a) {
      if (a.available) { try { await a.ysdk.adv.showBannerAdv(); } catch (e) {} }
    },

    async hideBanner(a) {
      if (a.available) { try { await a.ysdk.adv.hideBannerAdv(); } catch (e) {} }
    },
  },

  // ---- Облачное хранилище --------------------------------------------------
  // Только сырое чтение-запись. Дебаунс, флаг «есть что писать» и локальное
  // зеркало — в слое: экономия запросов одинакова для всех площадок.
  storage: {
    // Есть ли вообще облако. Нет игрока — слой уйдёт на локальное зеркало.
    isAvailable(a) { return !!a.player; },

    async read(a) {
      if (!a.player) return null;
      try { return await a.player.getData(); }
      catch (e) {
        console.warn('[platform:yandex] getData error', e);
        // ВАЖНО: null, а не {} — слой обязан отличить «сеть упала» от «новый игрок».
        // Иначе первая же запись затрёт облачный сейв пустышкой.
        return null;
      }
    },

    async write(a, payload) {
      if (!a.player) return false;
      try { await a.player.setData(payload, true); return true; }
      catch (e) { console.warn('[platform:yandex] setData error', e); return false; }
    },
  },

  // ---- Лидерборды ----------------------------------------------------------
  // ysdk.leaderboards — уже готовое свойство (не фабрика через getLeaderboards(), которая
  // помечена deprecated и на каждый вызов пишет в консоль ERROR-уровня «is deprecated.
  // Please, use ysdk.leaderboards» — реальная находка живого теста 05.08 (совпала с тем
  // же фиксом, независимо сделанным на «Мойке Мечты» и перенесённым в library/game-template).
  leaderboard: {
    async setScore(a, name, score) {
      if (!a.available) { console.log('[platform:yandex] рекорд (заглушка)', name, score); return; }
      try { await a.ysdk.leaderboards.setScore(name, score); }
      catch (e) { console.warn('[platform:yandex] setScore error', e); }
    },

    async getPlayerEntry(a, name) {
      if (!a.available) return null;
      try { return await a.ysdk.leaderboards.getPlayerEntry(name); }
      catch (e) { return null; }
    },

    async getTop(a, name, quantityTop = 10) {
      if (!a.available) return [];
      try {
        const res = await a.ysdk.leaderboards.getEntries(name, { quantityTop, includeUser: true });
        return (res && res.entries) || [];
      } catch (e) { return []; }
    },
  },
};
