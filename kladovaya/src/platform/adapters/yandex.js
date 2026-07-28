// АДАПТЕР ПЛОЩАДКИ: Яндекс Игры.
//
// Реализует контракт из ../index.js. Ничего не решает сам: не ставит паузу, не копит
// записи, не троттлит — это делает слой. Здесь только «как именно эта площадка
// показывает рекламу / читает сейв / пишет рекорд».
//
// Работает и без SDK: вне Яндекса подставляет заглушки, чтобы игра не падала
// (локальная разработка, проверка билда файлом).

export const YandexAdapter = {
  name: 'yandex',
  available: false,
  ysdk: null,
  player: null,
  localStore: null, // ysdk.getStorage(), см. safeStorage() ниже

  async init() {
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
      this.player = await this.ysdk.getPlayer();
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
        console.log('[platform:yandex] полноэкранная (заглушка)');
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
        console.log('[platform:yandex] вознаграждаемая (заглушка), выдаю награду');
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
  leaderboard: {
    async setScore(a, name, score) {
      if (!a.available) { console.log('[platform:yandex] рекорд (заглушка)', name, score); return; }
      try { await a.ysdk.getLeaderboards().then((lb) => lb.setLeaderboardScore(name, score)); }
      catch (e) { console.warn('[platform:yandex] setScore error', e); }
    },

    async getPlayerEntry(a, name) {
      if (!a.available) return null;
      try { return await a.ysdk.getLeaderboards().then((lb) => lb.getLeaderboardPlayerEntry(name)); }
      catch (e) { return null; }
    },

    async getTop(a, name, quantityTop = 10) {
      if (!a.available) return [];
      try {
        const res = await a.ysdk.getLeaderboards()
          .then((lb) => lb.getLeaderboardEntries(name, { quantityTop, includeUser: true }));
        return (res && res.entries) || [];
      } catch (e) { return []; }
    },
  },
};
