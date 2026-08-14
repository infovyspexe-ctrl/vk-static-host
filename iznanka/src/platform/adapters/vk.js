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
// - Sticky-баннер у VK есть, но отдельными событиями (VKWebAppShowBannerAd /
//   VKWebAppHideBannerAd), а не форматом рекламы — см. ads.showBanner ниже.
//   (Прежняя строка «постоянного баннера нет — заглушка» была неверной и удалена 11.08.)
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


// БЕЗОПАСНАЯ ЗОНА КЛИЕНТА VK (п.3.2.2). На мобильных клиент рисует свои кнопки (✕ и «···»)
// ПОВЕРХ окна приложения, снизу живёт sticky-баннер. Приложение обязано держать интерфейс
// вне этих полос — иначе верх срезается (отказ модерации 12.08 по ВКонтакте Android/Mob.Web
// и по Одноклассникам «после отрисовки баннерной рекламы»).
//
// Откуда берём числа, по убыванию надёжности:
//   1) VKWebAppGetConfig и событие VKWebAppUpdateConfig — у нативных клиентов там insets;
//   2) фолбэк по vk_platform: на mobile_* полоса клиента есть всегда, а insets мобильный
//      ВЕБ (m.vk.ru) не присылает — именно на нём снят скриншот отказа.
// Ноль вне VK: за пределами площадки функция не зовётся вовсе.
const FALLBACK_TOP_PX = 56;   // высота полосы с ✕/«···» в клиенте VK, замер по скриншоту модератора

function isMobilePlatform() {
  const p = launchParams().get('vk_platform') || '';
  return /^mobile/.test(p);
}

const STORAGE_KEY = 'save'; // весь сейв одной строкой JSON — как player.setData у Яндекса

export const VkAdapter = {
  name: 'vk',
  available: false,
  // «Мы ТОЧНО внутри VK» — отдельно от available. available гаснет по таймауту 3 с
  // (медленный клиент, тормознутая сеть), но launch-параметр vk_app_id ставит сама
  // площадка, и если он есть — игрок в VK, а не на дев-сервере. Разница критична для
  // рекламы: подставлять заглушку с ВЫДАЧЕЙ НАГРАДЫ внутри настоящей площадки — это
  // имитация рекламного блока (запрет п.1.16 Яндекса, п.5.1 VK). Тот же приём, что
  // looksLikePlatform в adapters/yandex.js; в VK-адаптере его не было (блокер красной
  // команды 11.08).
  looksLikePlatform: false,
  // Отступы безопасной зоны в CSS-пикселях; слой отдаёт их игре, игра ужимает канвас.
  safeArea: { top: 0, bottom: 0 },
  _safeCb: null,
  storageAvailable: false, // Init может пройти вне клиента VK, а StorageGet — нет: щупаем отдельно
  bridge: null,

  async init() {
    this.looksLikePlatform = launchParams().has('vk_app_id');
    // Фолбэк безопасной зоны — ДО всего остального: он зависит только от launch-параметра
    // в URL, а не от моста. Если VKWebAppInit не уложится в таймаут (медленный клиент),
    // init() делает return — и без этой строки полоса клиента снова резала бы верх игры.
    if (isMobilePlatform()) this._pushSafeArea({ top: FALLBACK_TOP_PX, bottom: 0 });
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

    // Уточняем фолбэк настоящими insets клиента, если он их отдаёт.
    try {
      const cfg = await this.bridge.send('VKWebAppGetConfig');
      if (cfg && cfg.insets) this._pushSafeArea({ top: cfg.insets.top, bottom: cfg.insets.bottom });
    } catch (e) { /* у веб-клиента метода может не быть — остаётся фолбэк */ }
    try {
      this.bridge.subscribe((e) => {
        const d = (e && e.detail) || {};
        // Конфиг/insets приходят при старте, повороте экрана и смене оформления.
        if (/UpdateConfig|UpdateInsets/.test(d.type || '') && d.data && d.data.insets) {
          this._pushSafeArea({ top: d.data.insets.top, bottom: d.data.insets.bottom });
        }
        // Баннер меняет доступную высоту окна — пересчитать раскладку надо в любом случае,
        // даже если сами insets не поменялись (ровно жалоба модерации ОК).
        if (/BannerAd/.test(d.type || '') && this._safeCb) this._safeCb(this.safeArea);
      });
    } catch (e) {}

    // СТРАХОВКА к настройке «Отображение» в панели VK (publisher/vk/RECIPE.md): размер
    // окна задаётся ТАМ, но панель по умолчанию ставит 911×700, и для портретной игры
    // 720×1280 это отказ модерации «у игрового поля большие отступы» (получен на «Осуши
    // озеро» 05.08). Если настройку собьют или потеряют, вызов подгонит фрейм под
    // пропорцию 9:16 сам. Работает только в веб-версиях ВК и ОК, на мобильных клиентах
    // отклоняется — поэтому молча, без предупреждения в консоли.
    try { await this.bridge.send('VKWebAppResizeWindow', { width: 630, height: 1120 }); } catch (e) {}
  },

  // Игра подписывается на безопасную зону: колбэк зовётся сразу с текущими значениями
  // и потом при каждом изменении (поворот экрана, появление/скрытие баннера).
  onSafeArea(cb) {
    this._safeCb = cb;
    cb(this.safeArea);
  },

  _pushSafeArea(next) {
    const top = Math.max(0, Math.round(next.top || 0));
    const bottom = Math.max(0, Math.round(next.bottom || 0));
    if (top === this.safeArea.top && bottom === this.safeArea.bottom) return;
    this.safeArea = { top, bottom };
    if (this._safeCb) this._safeCb(this.safeArea);
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
    // VK требует проверять предзагрузку рекламы (VKWebAppCheckNativeAds) до показа;
    // для rewarded это условие модерации: кнопку награды показывать только при true.
    check(a, format) {
      // Внутри VK без поднявшегося моста реклама НЕ доступна — иначе кнопка «за рекламу»
      // горит, а ролика нет (нарушение H2). Вне VK (дев-сервер) отвечаем true, чтобы
      // интерфейс можно было проверять локально.
      if (!a.available) return Promise.resolve(!a.looksLikePlatform);
      return a.bridge.send('VKWebAppCheckNativeAds', { ad_format: format })
        .then((res) => !!(res && res.result))
        .catch(() => false);
    },

    showFullscreen(a, { onOpen, onClose }) {
      if (!a.available) {
        // Внутри настоящего VK заглушку не рисуем и не притворяемся, что показ был.
        if (a.looksLikePlatform) { console.warn('[platform:vk] мост не поднялся — показа не будет'); onClose(false); return; }
        console.log('[platform:vk] полноэкранная (заглушка)');
        onClose(true);
        return;
      }
      this.check(a, 'interstitial').then((ok) => {
        if (!ok) { console.warn('[platform:vk] interstitial не предзагружен, показ пропущен'); onClose(false); return; }
        onOpen();
        a.bridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
          .then((res) => onClose(!!(res && res.result)))
          .catch((e) => { console.warn('[platform:vk] interstitial error', e); onClose(false); });
      });
    },

    // У VK нет отдельного колбэка «награда выдана»: result: true у reward-формата и есть
    // сигнал, что ролик досмотрен целиком (в отличие от Яндекса, где onRewarded и onClose
    // разделены).
    showRewarded(a, { onOpen, onRewarded, onClose }) {
      if (!a.available) {
        // САМОЕ ВАЖНОЕ МЕСТО. Внутри настоящего VK награду без реального ролика выдавать
        // НЕЛЬЗЯ: это имитация рекламного блока (п.1.16 Яндекса, п.5.1 VK) и прямой отказ.
        // Заглушка с наградой законна только вне площадки — на дев-сервере, где vk_app_id
        // в URL нет. (Блокер красной команды 11.08; на Яндексе этот же случай уже был
        // закрыт фиксом шаблона v19 через looksLikePlatform.)
        if (a.looksLikePlatform) { console.warn('[platform:vk] мост не поднялся — награда не выдаётся'); onClose(false); return; }
        console.log('[platform:vk] вознаграждаемая (заглушка), выдаю награду');
        onRewarded();
        onClose(true);
        return;
      }
      this.check(a, 'reward').then((ok) => {
        if (!ok) { console.warn('[platform:vk] rewarded не предзагружен, показ отменён'); onClose(false); return; }
        onOpen();
        a.bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' })
          .then((res) => {
            const rewarded = !!(res && res.result);
            if (rewarded) onRewarded();
            onClose(rewarded);
          })
          .catch((e) => { console.warn('[platform:vk] rewarded error', e); onClose(false); });
      });
    },

    // Sticky-баннер VK: VKWebAppShowBannerAd/VKWebAppHideBannerAd, крепится снизу.
    // Правила VK (п.5.1.5.3): активная зона баннера не ближе 20 px к функциональным
    // элементам (100 px при частых нажатиях), не на онбординге.
    async showBanner(a) {
      if (!a || !a.available) return;
      try { await a.bridge.send('VKWebAppShowBannerAd', { banner_location: 'bottom' }); }
      catch (e) { console.warn('[platform:vk] banner error', e); }
    },
    async hideBanner(a) {
      if (!a || !a.available) return;
      try { await a.bridge.send('VKWebAppHideBannerAd'); } catch (e) {}
    },
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
