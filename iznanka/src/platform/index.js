// СЛОЙ ПЛОЩАДКИ. Игра говорит «покажи рекламу» и «сохрани прогресс», а КАКАЯ площадка
// под этим лежит — Яндекс напрямую или прослойка GamePush на два десятка площадок —
// решается здесь, одной строкой ADAPTER ниже.
//
// Зачем слой, если прослойка и так «универсальная»: чтобы смена прослойки стоила день,
// а не переписывания игр. GamePush и Playgama требуют своего SDK и тянут за собой
// формат сейвов; сегодня выбран один, завтра может быть другой.
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
import { GamePushAdapter } from './adapters/gamepush.js';
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
// Иначе GamePush подхватывается автоматически, как только в его адаптере заполнены
// PROJECT_ID и PUBLIC_TOKEN, — иначе работаем напрямую с Яндексом.
// `let`, а не `const`: при сбое прослойки init() переключает адаптер на подстраховку
// (см. ниже). Все операции читают ADAPTER в момент вызова, поэтому подмена прозрачна.
let ADAPTER = isVkLaunch() ? VkAdapter : (GamePushAdapter.configured() ? GamePushAdapter : YandexAdapter);
// ─────────────────────────────────────────────────────────────────────────────

// Имя игры = имя папки в games/. ОБЯЗАТЕЛЬНО заменить при копировании шаблона:
// на общем dev-сервере (один порт на все игры) localStorage общий, и без префикса
// игры затирают сейвы друг друга (CONVENTIONS.md, раздел 7).
export const GAME_ID = 'iznanka';
if (GAME_ID === 'game') {
  console.warn('[platform] GAME_ID не заполнен — локальный сейв конфликтует с другими играми');
}

const MIRROR_KEY = GAME_ID + '_save_local'; // локальное зеркало облака
const FLUSH_DELAY_MS = 2000;                // склейка частых update() в одну запись

// Поднимай на 1 при каждом изменении структуры сохранений.
const SAVE_VERSION = 1;

// Миграция из версии N в N+1. Пример: 1: (d) => { d.gems = 0; return d; },
const MIGRATIONS = {};

// СТОРОЖ ЗАВИСШЕЙ РЕКЛАМЫ (шаблон v22, перенесено сюда 2026-08-11 при подготовке к VK).
// Показ ставит игру на паузу в onOpen и снимает в onClose. Если площадка не позвала НИ
// onClose, НИ onError — пауза не снимется НИКОГДА: картинка живая, таймеры стоят, кнопки
// не отвечают, выхода нет. Это не теория: SDK Яндекса роняет свой внутренний промис
// («No parent to post message») уже ПОСЛЕ onOpen и наши колбэки не зовёт вовсе (поймано
// живым прогоном «Сладкой Империи» 09.08). У VK тот же класс риска: `bridge.send` —
// промис, который вне настоящего клиента может не разрешиться совсем.
// 45 с заведомо больше любого честного ролика, поверх реального показа сторож не сработает.
// Заодно единая точка защищает от ДВОЙНОГО onClose (часть площадок зовёт его и на
// закрытие, и на ошибку — второй вызов слал лишний game:resume и лишний gameplayStart).
const AD_WATCHDOG_MS = 45000;

function adFlow(onClose) {
  const wasPlaying = Platform.gameplayActive;
  let done = false;
  let watchdog = null;
  const finish = (result) => {
    if (done) return;
    done = true;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    bus.emit('game:resume');
    if (wasPlaying) Platform.gameplayStart();
    if (onClose) onClose(result);
  };
  return {
    open: () => {
      Platform.gameplayStop();
      bus.emit('game:pause', { showOverlay: false });
      watchdog = setTimeout(() => {
        console.warn('[platform] реклама не ответила за ' + (AD_WATCHDOG_MS / 1000) + 'с — снимаем паузу принудительно');
        finish(false);
      }, AD_WATCHDOG_MS);
    },
    finish,
  };
}

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
  available: false,
  gameplayActive: false, // идёт ли активный геймплей — нужно паузе и рекламе
  readOnly: false,       // в облаке сейв новее нашего клиента: играем, но не пишем

  cache: null,
  _timer: null,
  _dirty: false,
  _loadFailed: false,    // чтение облака не удалось — писать НЕЛЬЗЯ, затрём чужой прогресс

  async init() {
    await ADAPTER.init();
    // ГИБРИД-ПОДСТРАХОВКА (правило системы, CONVENTIONS.md разд. 14): основная прослойка
    // (GamePush) может не подняться — её внешний домен режет антивирус (Касперский
    // перехватывает HTTPS и давится на gamepush.com) или сеть игрока. Без подстраховки
    // такой игрок остаётся в локальном режиме: без облака, лидерборда и рекламы = без
    // монетизации. Падаем на ПРЯМОЙ Yandex SDK — он грузится с доменов площадки, которые
    // не блокируются (игра и так внутри yandex.ru), и даёт сейвы/рекорды/рекламу Яндекса.
    // Локальное зеркало держит прогресс на устройстве при смене бэкенда.
    if (!ADAPTER.available && ADAPTER === GamePushAdapter) {
      console.warn('[platform] GamePush не поднялся — подстраховка: прямой Yandex SDK');
      ADAPTER = YandexAdapter;
      await ADAPTER.init();
    }
    this.name = ADAPTER.name;
    this.available = ADAPTER.available;
    return this.available;
  },

  ready() { ADAPTER.ready(); },

  // Идемпотентность обязательна: SDK ругается ERROR'ом на повторный start («TimeCounter is
  // already started» — живой лог 05.08), а вызывающих сторон стало много (сцены, оверлеи
  // смерти/алтаря, реклама, автопауза) и гонка blur/onOpen давала двойной start после
  // рекламы (красная команда 05.08). Флаг gameplayActive и так ведётся — теперь он же
  // страхует парность: повторный start/stop просто игнорируется.
  gameplayStart() {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    ADAPTER.gameplayStart();
  },

  gameplayStop() {
    if (!this.gameplayActive) return;
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
      const flow = adFlow(onClose);
      ADAPTER.ads.showFullscreen(ADAPTER, { onOpen: flow.open, onClose: flow.finish });
    },

    // Награду выдавать ТОЛЬКО в onRewarded.
    showRewarded({ onRewarded, onClose } = {}) {
      const flow = adFlow(onClose);
      ADAPTER.ads.showRewarded(ADAPTER, {
        onOpen: flow.open,
        onRewarded: () => { if (onRewarded) onRewarded(); },
        onClose: flow.finish,
      });
    },

    // Предзагружен ли ролик с наградой ПРЯМО СЕЙЧАС. Нужно интерфейсу: правила VK Mini
    // Apps требуют показывать кнопку «за рекламу» только когда реклама реально есть
    // (VKWebAppCheckNativeAds), иначе игрок жмёт кнопку и ничего не происходит — это
    // повод для отказа модерации (H2 в RELEASE-CHECKLIST.md). У площадок без такого
    // API (Яндекс, GamePush) проверки нет — там кнопка показывается всегда, как и была.
    async rewardedAvailable() {
      if (!ADAPTER.ads.check) return true;
      try { return await ADAPTER.ads.check(ADAPTER, 'reward'); } catch (e) { return true; }
    },

    // То же для полноэкранной. Нужно ДО обратного отсчёта: без этой проверки игрок видел
    // «Реклама через 3…2…1», затемнение — и пустоту, если ролик не налился (в тестовом
    // приложении VK это обычное дело). Элемент интерфейса без результата — риск по
    // качеству (находка красной команды 11.08).
    async interstitialAvailable() {
      if (!ADAPTER.ads.check) return true;
      try { return await ADAPTER.ads.check(ADAPTER, 'interstitial'); } catch (e) { return true; }
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
    //
    // savedAt здесь ОБЯЗАТЕЛЕН, не только в _write(): без него зеркало несёт метку
    // последней ЗАГРУЗКИ (ту же, что и в облаке на этот момент), и при быстром переходе
    // между сценами load() → newest(cloud, mirror) видит РАВНЫЕ savedAt и по правилу
    // «при равенстве побеждает первый» отдаёт предпочтение облаку — свежее изменение
    // из зеркала тихо откатывается (реальный баг, найден при аудите 04.08: купил
    // улучшение → сразу «Спуститься» → улучшение пропало). Проставляем savedAt сразу,
    // чтобы зеркало было СТРОГО новее известного состояния облака с этого момента.
    update(partial) {
      Platform.cache = { ...(Platform.cache || {}), ...partial, savedAt: Date.now() };
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

  // Безопасное локальное хранилище (тот же safe-storage, что у зеркала: ysdk.getStorage()
  // с фолбэком на localStorage, обёрнутый в try — приватный Safari/ITP не роняет игру).
  // Для состояния ТЕКУЩЕГО забега — оно не идёт в облако (правило экономии записей, см.
  // комментарий у save.update выше), но должно переживать F5 так же надёжно, как мета.
  rawStorage() { return store(); },

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
// помеченному, но выигрывает у отсутствующего. При РАВНЫХ savedAt побеждает зеркало
// (b) — оно пишется синхронно при каждом update() и может нести локальное изменение,
// которое ещё не долетело до облака; откатывать его в пользу заведомо не более
// свежего облака нет причин (см. комментарий у update() про баг с гонкой).
function newest(a, b) {
  const ok = (d) => d && typeof d === 'object';
  if (!ok(a)) return ok(b) ? b : null;
  if (!ok(b)) return a;
  return (b.savedAt || 0) >= (a.savedAt || 0) ? b : a;
}
