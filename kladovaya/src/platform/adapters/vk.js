// АДАПТЕР ПЛОЩАДКИ: VK Mini Apps (VK Bridge).
//
// Одна сборка = VK + Одноклассники + Mail.ru (все — VK Group, включаются галкой в панели
// VK, см. `publisher/vk/RECIPE.md`). Выбор нативного SDK, а не прослойки, — решение
// CONVENTIONS.md §15.
//
// Реализует контракт из ../index.js. Ничего не решает сам: не ставит паузу, не копит
// записи — это делает слой. Здесь только «как именно VK показывает рекламу / хранит сейв».
//
// Bridge грузится ЛОКАЛЬНЫМ вендор-файлом (vendor/vk-bridge.min.js), а не с CDN — та же
// причина отказа от GamePush из §15: сторонний домен режут антивирусы игроков. Библиотека
// маленькая (~8 КБ, официальный UMD-билд @vkontakte/vk-bridge), версия зафиксирована,
// обновляется руками.
//
// Разведка граблей (2026-07-28, один поиск по правилу корневого CLAUDE.md):
// - VKWebAppInit вне реального VK-клиента не всегда быстро отклоняется — вешаем гонку
//   с таймаутом (тот же приём, что и в yandex.js, найден на «Решале» 2026-07-17).
// - У VK нет клиентского аналога лидерборда Яндекса: рекорд читается/пишется только
//   серверными вызовами VK API с access_token приложения — отдельная инфраструктура,
//   не строчка в адаптере. Пока заглушка (см. leaderboard ниже).
// - Постоянного баннера в VK Bridge нет (только полноэкранные форматы) — заглушка.
// - VKWebAppStorageSet ограничивает значение ~4096 символами — если сейв Кладовой
//   разрастётся, здесь первое место, где это вылезет.

function loadVkBridge(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (typeof window.vkBridge !== 'undefined') { resolve(true); return; }
    let settled = false;
    const done = (ok) => { if (settled) return; settled = true; clearTimeout(t); resolve(ok); };
    const t = setTimeout(() => done(false), timeoutMs);
    const s = document.createElement('script');
    s.src = 'vendor/vk-bridge.min.js';
    s.onload = () => done(typeof window.vkBridge !== 'undefined');
    s.onerror = () => done(false);
    document.head.appendChild(s);
  });
}

// VK Mini Apps всегда добавляет launch-параметры в URL при открытии (vk_app_id,
// vk_user_id, vk_language, sign...). Слой (index.js) использует это же поле для
// определения площадки — здесь читаем только язык.
function launchParams() {
  try { return new URLSearchParams(location.search); }
  catch (e) { return new URLSearchParams(); }
}

const STORAGE_KEY = 'save'; // весь сейв одной строкой JSON — как player.setData у Яндекса

export const VkAdapter = {
  name: 'vk',
  available: false,
  storageAvailable: false, // Init может пройти вне клиента VK, а StorageGet — нет: щупаем отдельно
  bridge: null,

  async init() {
    await loadVkBridge();
    if (typeof window.vkBridge === 'undefined') {
      console.warn('[platform:vk] bridge не найден, режим локальной разработки');
      return;
    }
    this.bridge = window.vkBridge;
    try {
      // Гонка с таймаутом — вне настоящего VK-клиента send() может не разрешиться совсем
      // (ждёт ответа родителя), и игра не грузится (белый экран). Тот же приём, что в
      // adapters/yandex.js (см. комментарий там).
      await Promise.race([
        this.bridge.send('VKWebAppInit', {}),
        new Promise((_, reject) => setTimeout(() => reject(new Error('init timeout')), 3000)),
      ]);
      this.available = true;
      window.vkBridgeInstance = this.bridge; // отладка из консоли
      console.log('[platform:vk] VK Bridge инициализирован');
    } catch (e) {
      console.warn('[platform:vk] ошибка VKWebAppInit, режим без SDK', e);
      this.available = false;
      return;
    }
    try {
      await Promise.race([
        this.bridge.send('VKWebAppStorageGet', { keys: ['__probe'] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('storage timeout')), 2000)),
      ]);
      this.storageAvailable = true;
    } catch (e) {
      console.warn('[platform:vk] облачное хранилище недоступно, играем на зеркале', e);
    }
  },

  // Хранилище VK асинхронное (только через bridge.send) — синхронный Storage-подобный
  // объект отдать не можем. null — слой сам уйдёт на обычный localStorage для зеркала.
  safeStorage() { return null; },

  ready() {}, // аналога LoadingAPI.ready у VK Bridge нет

  // У VK Bridge нет отдельного API вроде GameplayAPI.start/stop — паузу вокруг рекламы
  // всё равно ставит слой через шину событий, здесь ничего звать не нужно.
  gameplayStart() {},
  gameplayStop() {},

  getLang() {
    // ISO 639-1 без региона (ru, en, uk...) — совпадает с форматом i18n игры.
    return launchParams().get('vk_language') || null;
  },

  ads: {
    showFullscreen(a, { onOpen, onClose }) {
      if (!a.available) {
        console.log('[platform:vk] полноэкранная (заглушка)');
        onClose(true);
        return;
      }
      onOpen();
      a.bridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
        .then((res) => onClose(!!(res && res.result)))
        .catch((e) => { console.warn('[platform:vk] interstitial error', e); onClose(false); });
    },

    // У VK нет отдельного колбэка «награда выдана»: result: true у reward-формата и есть
    // сигнал, что ролик досмотрен целиком (в отличие от Яндекса, где onRewarded и onClose
    // разделены).
    showRewarded(a, { onOpen, onRewarded, onClose }) {
      if (!a.available) {
        console.log('[platform:vk] вознаграждаемая (заглушка), выдаю награду');
        onRewarded();
        onClose(true);
        return;
      }
      onOpen();
      a.bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
        .then((res) => {
          const rewarded = !!(res && res.result);
          if (rewarded) onRewarded();
          onClose(rewarded);
        })
        .catch((e) => { console.warn('[platform:vk] rewarded error', e); onClose(false); });
    },

    // Постоянного баннера в VK Bridge нет (только полноэкранные форматы) — заглушки,
    // чтобы игра не падала на вызове.
    async showBanner() {},
    async hideBanner() {},
  },

  storage: {
    isAvailable(a) { return a.available && a.storageAvailable; },

    async read(a) {
      try {
        const res = await a.bridge.send('VKWebAppStorageGet', { keys: [STORAGE_KEY] });
        const entry = res && res.keys && res.keys[0];
        if (!entry || !entry.value) return {}; // пустое значение = новый игрок, не ошибка сети
        return JSON.parse(entry.value);
      } catch (e) {
        console.warn('[platform:vk] StorageGet error', e);
        return null; // null — «не смогли прочитать», слой не затрёт облако
      }
    },

    async write(a, payload) {
      try {
        await a.bridge.send('VKWebAppStorageSet', { key: STORAGE_KEY, value: JSON.stringify(payload) });
        return true;
      } catch (e) {
        console.warn('[platform:vk] StorageSet error', e);
        return false;
      }
    },
  },

  // VK Bridge не даёt клиентского аналога getLeaderboards() Яндекса — рекорды через VK API
  // нужны серверные вызовы с access_token приложения. Заглушка: игра не падает, рекорд
  // просто не уходит на VK.
  leaderboard: {
    async setScore(a, name, score) { console.log('[platform:vk] рекорд (не поддержан адаптером)', name, score); },
    async getPlayerEntry() { return null; },
    async getTop() { return []; },
  },
};
