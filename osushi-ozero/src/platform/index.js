// СЛОЙ ПЛОЩАДКИ. Игра говорит «покажи рекламу» и «сохрани прогресс», а КАКАЯ площадка
// под этим лежит — Яндекс Игры или VK Mini Apps (он же ОК и Mail.ru) — решается здесь,
// одной строкой ADAPTER ниже.
//
// Зачем слой: правила площадок расходятся именно там, где деньги (на VK interstitial
// разрешён только на переходах), а игра не должна знать про это в двадцати местах.
// Выход на новую площадку = один новый адаптер, а не правки по всем сценам.
//
// ЧТО ЖИВЁТ ЗДЕСЬ, А НЕ В АДАПТЕРАХ:
//   - экономия запросов: дебаунс, флаг «есть что писать», локальное зеркало;
//   - пауза игры вокруг рекламы (требование модерации);
//   - версионирование сейва и миграции;
//   - защита от затирания облака при сбое чтения.
// Всё это одинаково для любой площадки, поэтому адаптеры остаются тонкими: только
// «как именно ЭТА площадка показывает рекламу и читает сейв».
import { bus } from '../core/events.js';
import { YandexAdapter } from './adapters/yandex.js';
import { VkAdapter } from './adapters/vk.js';

// VK Mini Apps ВСЕГДА добавляет launch-параметры в URL при открытии (vk_app_id,
// vk_user_id, vk_language, sign...) — надёжный признак площадки. isIframe()/isWebView()
// у vk-bridge для этого не годятся: тот же признак даёт обычный iframe Яндекса.
function isVkLaunch() {
  try { return new URLSearchParams(location.search).has('vk_app_id'); }
  catch (e) { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// ВЫБОР ПЛОЩАДКИ. VK Mini Apps определяется по launch-параметрам в URL — площадка сама
// их проставляет, подделать снаружи (кроме тестового открытия по этому же URL) нельзя.
// Иначе работаем напрямую с Яндексом.
//
// Адаптера прослойки (GamePush) в этой игре НЕТ намеренно: обе площадки игры —
// нативные SDK (CONVENTIONS.md §15), а лишний адаптер тащил бы в VK-билд упоминание
// стороннего домена и мёртвый код. Если игра пойдёт на площадку, куда нативно дорого,
// адаптер берётся из library/game-template/src/platform/adapters/gamepush.js.
const ADAPTER = isVkLaunch() ? VkAdapter : YandexAdapter;
// ─────────────────────────────────────────────────────────────────────────────

// Имя игры = имя папки в games/. ОБЯЗАТЕЛЬНО заменить при копировании шаблона:
// на общем dev-сервере (один порт на все игры) localStorage общий, и без префикса
// игры затирают сейвы друг друга (CONVENTIONS.md, раздел 7).
export const GAME_ID = 'osushi-ozero';
if (GAME_ID === 'game') {
  console.warn('[platform] GAME_ID не заполнен — локальный сейв конфликтует с другими играми');
}

const MIRROR_KEY = GAME_ID + '_save_local'; // локальное зеркало облака
const FLUSH_DELAY_MS = 2000;                // склейка частых update() в одну запись

// Поднимай на 1 при каждом изменении структуры сохранений.
const SAVE_VERSION = 1;

// Миграция из версии N в N+1. Пример: 1: (d) => { d.gems = 0; return d; },
const MIGRATIONS = {};

function migrate(data) {
  let v = data._v || 1;
  // Сейв ИЗ БУДУЩЕГО: игрок уже поиграл на устройстве с более новой версией игры.
  // Понижать версию нельзя — затрём новый формат старым. Отдаём как есть и не пишем.
  if (v > SAVE_VERSION) return { data, fromFuture: true };
  while (v < SAVE_VERSION && MIGRATIONS[v]) { data = MIGRATIONS[v](data); v++; }
  data._v = SAVE_VERSION;
  return { data, fromFuture: false };
}

export const Platform = {
  name: ADAPTER.name,
  // Площадка — VK Mini Apps. Игре это нужно знать не «для красоты»: правила VK жёстче
  // Яндекса там, где начинаются деньги (реклама п.5.1.5.1 — interstitial только на
  // переходах между экранами, не по таймеру поверх геймплея; RELEASE-CHECKLIST блок H).
  isVk: ADAPTER === VkAdapter,
  available: false,
  gameplayActive: false, // идёт ли активный геймплей — нужно паузе и рекламе
  readOnly: false,       // в облаке сейв новее нашего клиента: играем, но не пишем

  cache: null,
  _timer: null,
  _dirty: false,
  _loadFailed: false,    // чтение облака не удалось — писать НЕЛЬЗЯ, затрём чужой прогресс

  async init() {
    await ADAPTER.init();
    // Подстраховки «упала прослойка — падаем на прямой SDK» здесь нет, потому что нет и
    // прослойки: оба адаптера ходят на домены самой площадки, внутри которой уже открыта
    // игра. Не поднялся SDK — слой работает на локальном зеркале, игра не падает.
    this.name = ADAPTER.name;
    this.available = ADAPTER.available;
    return this.available;
  },

  ready() { ADAPTER.ready(); },

  // Безопасное хранилище площадки (ysdk.getStorage() у Яндекса) — для модулей игры,
  // которые пишут в localStorage мимо сейва: чекпойнт партии, флаги аналитики.
  // null — вызывающий работает с обычным localStorage (см. core/safe-storage.js).
  safeStorage() { return ADAPTER.safeStorage ? ADAPTER.safeStorage() : null; },

  // Попросить у площадки фрейм под пропорции игры. Умеет только VK-десктоп; остальные
  // отвечают null, и игра просто подстраивает свою высоту под то, что дали.
  // Зачем: портретная игра в альбомном фрейме — это пустые поля по бокам, за которые
  // VK отклоняет («адаптируйте размеры игрового фрейма к игровому полю», отказ 02.08).
  fitFrame(aspect) { return ADAPTER.fitFrame ? ADAPTER.fitFrame(aspect) : Promise.resolve(null); },

  // Есть ли у площадки постоянный нижний баннер. Только когда есть — игра резервирует
  // под него место; иначе полоса внизу пустая, и это тот же отказ про отступы.
  hasStickyBanner() { return ADAPTER.hasStickyBanner ? ADAPTER.hasStickyBanner() : false; },

  gameplayStart() {
    this.gameplayActive = true;
    ADAPTER.gameplayStart();
  },

  gameplayStop() {
    this.gameplayActive = false;
    ADAPTER.gameplayStop();
  },

  // Язык игрока с площадки. Вне площадки — 'ru'.
  getLang() { return ADAPTER.getLang() || 'ru'; },

  // ---- Реклама -------------------------------------------------------------
  // Пауза целиком (сцены, звук, GameplayAPI) идёт через шину — требование модерации.
  // Нельзя полагаться на blur: рекламный оверлей на мобильных не отбирает фокус.
  // GameplayAPI восстанавливается честно: если геймплей не шёл до рекламы (например,
  // реклама при выходе в меню), start после закрытия не вызывается.
  ads: {
    showFullscreen({ onClose } = {}) {
      const wasPlaying = Platform.gameplayActive;
      ADAPTER.ads.showFullscreen(ADAPTER, {
        onOpen: () => { Platform.gameplayStop(); bus.emit('game:pause', { showOverlay: false }); },
        onClose: (wasShown) => {
          bus.emit('game:resume');
          if (wasPlaying) Platform.gameplayStart();
          if (onClose) onClose(wasShown);
        },
      });
    },

    // Награду выдавать ТОЛЬКО в onRewarded.
    showRewarded({ onRewarded, onClose } = {}) {
      const wasPlaying = Platform.gameplayActive;
      ADAPTER.ads.showRewarded(ADAPTER, {
        onOpen: () => { Platform.gameplayStop(); bus.emit('game:pause', { showOverlay: false }); },
        onRewarded: () => { if (onRewarded) onRewarded(); },
        onClose: (rewarded) => {
          bus.emit('game:resume');
          if (wasPlaying) Platform.gameplayStart();
          if (onClose) onClose(rewarded);
        },
      });
    },

    showBanner() { return ADAPTER.ads.showBanner(ADAPTER); },
    hideBanner() { return ADAPTER.ads.hideBanner(ADAPTER); },
  },

  // ---- Сохранения ----------------------------------------------------------
  // Правило экономии (важно на прослойках с поштучной тарификацией): в облако уходит
  // только МЕТА и только на ключевых точках. Состояние текущей партии держи локально
  // сам — эталон разделения в games/rubezh (src/save.js + src/runSave.js).
  save: {
    // Читает облако и локальное зеркало, берёт свежайшее по savedAt.
    async load() {
      const cloud = ADAPTER.storage.isAvailable(ADAPTER) ? await ADAPTER.storage.read(ADAPTER) : null;
      const mirror = readMirror();

      // null от адаптера = «прочитать не смогли» (сеть, отказ). Это НЕ новый игрок.
      // Без этой ветки первая же запись затирала бы облачный сейв пустышкой —
      // самый дорогой класс бага, который бывает в сохранениях.
      Platform._loadFailed = ADAPTER.storage.isAvailable(ADAPTER) && cloud === null;
      if (Platform._loadFailed) {
        console.warn('[platform] облако не прочиталось — играем на зеркале, в облако не пишем');
      }

      const best = newest(cloud, mirror) || {};
      const { data, fromFuture } = migrate(best);
      Platform.readOnly = fromFuture;
      if (fromFuture) {
        console.warn('[platform] сейв новее версии игры — режим только для чтения');
      }
      Platform.cache = data;
      return Platform.cache;
    },

    // Частичное обновление: поля вливаются в общий объект, остальное не трогается.
    // Пишет в зеркало сразу (дёшево и синхронно), в облако — отложенно и склеенно.
    update(partial) {
      Platform.cache = { ...(Platform.cache || {}), ...partial };
      Platform._dirty = true;
      writeMirror(Platform.cache);
      clearTimeout(Platform._timer);
      Platform._timer = setTimeout(() => Platform.save._write(), FLUSH_DELAY_MS);
    },

    // Полная замена объекта. ОСТОРОЖНО: сносит поля, записанные другими системами
    // (настройки, выбор сложности). По ходу игры используй update().
    async save(data) {
      Platform.cache = { ...data };
      Platform._dirty = true;
      writeMirror(Platform.cache);
      clearTimeout(Platform._timer);
      Platform._timer = null;
      await Platform.save._write();
    },

    // Ключевая точка: дописать накопленное в облако. Писать нечего — запроса не будет.
    async flush() {
      clearTimeout(Platform._timer);
      Platform._timer = null;
      if (!Platform._dirty) return;
      await Platform.save._write();
    },

    async _write() {
      if (Platform.cache === null) return;
      if (Platform.readOnly || Platform._loadFailed) return; // чужой прогресс не затираем
      Platform._dirty = false;
      const payload = { ...Platform.cache, _v: SAVE_VERSION, savedAt: Date.now() };
      writeMirror(payload);
      if (ADAPTER.storage.isAvailable(ADAPTER)) await ADAPTER.storage.write(ADAPTER, payload);
    },
  },

  leaderboard: {
    setScore(name, score) { return ADAPTER.leaderboard.setScore(ADAPTER, name, score); },
    getPlayerEntry(name) { return ADAPTER.leaderboard.getPlayerEntry(ADAPTER, name); },
    getTop(name, n = 10) { return ADAPTER.leaderboard.getTop(ADAPTER, name, n); },
  },
};

// ---- Локальное зеркало ------------------------------------------------------
// Есть всегда, даже когда облако доступно: облако может не ответить, а прогресс
// текущей сессии терять нельзя. Приватный режим и переполнение — молча, игра важнее.
//
// Пишем НЕ в localStorage напрямую, а через хранилище адаптера. В iframe площадки
// на iOS/macOS прямой localStorage ломается: недоступен, вычищается ITP, а в
// приватном Safari бросает на самом обращении — SDK Яндекса про это прямо
// предупреждает в консоли. Адаптер отдаёт безопасный аналог (ysdk.getStorage()),
// а если его нет — работаем с обычным localStorage, обёрнутым в try.
//
// Для нас это не мелочь: зеркало — единственное, что держит прогресс между
// редкими облачными записями (в облако пишем только на ключевых точках).
function store() {
  if (ADAPTER.safeStorage) {
    const s = ADAPTER.safeStorage();
    if (s) return s;
  }
  try { return typeof localStorage !== 'undefined' ? localStorage : null; }
  catch (e) { return null; } // приватный Safari бросает на самом доступе
}

function readMirror() {
  try { return JSON.parse(store()?.getItem(MIRROR_KEY) || 'null'); }
  catch (e) { return null; }
}

function writeMirror(data) {
  try { store()?.setItem(MIRROR_KEY, JSON.stringify(data)); }
  catch (e) {}
}

// Свежайший из двух по savedAt. Сейв без метки (старый формат) проигрывает любому
// помеченному, но выигрывает у отсутствующего.
function newest(a, b) {
  const ok = (d) => d && typeof d === 'object';
  if (!ok(a)) return ok(b) ? b : null;
  if (!ok(b)) return a;
  return (b.savedAt || 0) > (a.savedAt || 0) ? b : a;
}
