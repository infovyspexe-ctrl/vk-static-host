// СЛОЙ ПЛОЩАДКИ. Игра говорит «покажи рекламу» и «сохрани прогресс», а КАКАЯ площадка
// под этим лежит — прямой SDK Яндекса, VK или собственный API GameSmile — решается
// здесь, одной строкой ADAPTER ниже. Сторонние SDK-прослойки в шаблон не входят.
//
// ЧТО ЖИВЁТ ЗДЕСЬ, А НЕ В АДАПТЕРАХ:
//   - экономия запросов: дебаунс, флаг «есть что писать», локальное зеркало;
//   - пауза игры вокруг рекламы (требование модерации);
//   - версионирование сейва и миграции;
//   - защита от затирания облака при сбое чтения.
// Всё это одинаково для любой площадки, поэтому адаптеры остаются тонкими: только
// «как именно ЭТА площадка показывает рекламу и читает сейв».
import { bus } from '../core/events.js';
import { YandexAdapter, signalYandexReady } from './adapters/yandex.js';
import { VkAdapter } from './adapters/vk.js';
import { GameSmileAdapter, isGameSmile } from './adapters/gamesmile.js';

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
// Наша площадка проверяется ПЕРВОЙ: там нет ни SDK Яндекса, ни моста VK, а прогресс
// обязан ездить за игроком между браузерами через его профиль на gamesmile.ru. Наш
// собственный адаптер прослойкой не является: внешнего SDK у него нет вовсе.
const ADAPTER = isGameSmile()
  ? GameSmileAdapter
  : (isVkLaunch() ? VkAdapter : YandexAdapter);
// ─────────────────────────────────────────────────────────────────────────────

// Имя игры = имя папки в games/. ОБЯЗАТЕЛЬНО заменить при копировании шаблона:
// на общем dev-сервере (один порт на все игры) localStorage общий, и без префикса
// игры затирают сейвы друг друга (CONVENTIONS.md, раздел 7).
export const GAME_ID = 'orbitalny-kurer';
if (GAME_ID === 'game') {
  console.warn('[platform] GAME_ID не заполнен — локальный сейв конфликтует с другими играми');
}

const MIRROR_KEY = GAME_ID + '_save_local'; // локальное зеркало облака
const FLUSH_DELAY_MS = 2000;                // склейка частых update() в одну запись

// Адаптер может переопределить задержку (ADAPTER.flushDelayMs) — нужно площадкам, где
// локальное зеркало не переживает обновление страницы (VK: сандбокс-iframe стирает
// localStorage при рефреше, см. грабля №3 в adapters/vk.js), поэтому там окно между
// действием игрока и записью в облако должно быть коротким, а не растягиваться на
// экономию запросов, как у Яндекса.
function flushDelay() {
  return typeof ADAPTER.flushDelayMs === 'number' ? ADAPTER.flushDelayMs : FLUSH_DELAY_MS;
}

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

// СТОРОЖ ЗАВИСШЕЙ РЕКЛАМЫ. onOpen ставит игру на паузу, onClose снимает. Если площадка не
// позвала НИ onClose, НИ onError — пауза не снимается никогда, и игра выглядит намертво
// зависшей при живой картинке: таймеры стоят, кнопки не отвечают, выхода нет.
// Это не теория: SDK Яндекса роняет внутренний промис («No parent to post message») уже
// ПОСЛЕ onOpen и не зовёт наши колбэки вовсе — поймано живым прогоном sweet-empire
// 2026-08-09, игра вставала на первой же полноэкранной по таймеру.
// 45 секунд заведомо больше любого честного ролика (полноэкранные у Яндекса короче,
// вознаграждаемые до ~30с), поэтому сторож не может сработать поверх реального показа.
// Заодно защищает от ДВОЙНОГО onClose: некоторые площадки зовут его и на закрытие, и на
// ошибку — второй вызов раньше слал лишний game:resume и лишний gameplayStart.
const AD_WATCHDOG_MS = 45000;

function adFlow(onClose) {
  const wasPlaying = Platform.gameplayActive;
  let done = false;
  let opened = false;
  let watchdog = null;
  const finish = (result, wasOpened) => {
    if (done) return;
    done = true;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    bus.emit('game:resume');
    // gameplayStart только если геймплей и правда шёл ДО показа: иначе на каждом неудачном
    // показе (роликов нет — самый частый случай) уходил лишний start без парного stop и
    // портил замер игрового времени, по которому площадка ранжирует игру.
    if (wasPlaying) Platform.gameplayStart();
    if (onClose) onClose(result, wasOpened === undefined ? opened : wasOpened);
  };
  return {
    // Показ РЕАЛЬНО начался (площадка открыла оверлей). Отличать это от «ролика не было»
    // обязательно: игра не имеет права сама повторять показ, который игрок уже видел и закрыл.
    opened: () => opened,
    // Награда пришла ПОСЛЕ того, как поток уже закрылся (площадка позвала колбэки в
    // неожиданном порядке или сторож успел раньше). Такую награду принимать НЕЛЬЗЯ: за один
    // просмотр игрок получал вторую награду — красная команда 12.08 намерила +20 гемов за
    // одно нажатие при цене 10.
    late: () => done,
    open: () => {
      opened = true;
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

export const Platform = {
  name: ADAPTER.name,
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
    this.name = ADAPTER.name;
    this.available = ADAPTER.available;
    return this.available;
  },

  ready() {
    ADAPTER.ready();
    // Прямой сигнал запуска Яндексу. Вне Яндекса — тихо ничего не делает.
    signalYandexReady();
  },

  gameplayStart() {
    this.gameplayActive = true;
    ADAPTER.gameplayStart();
  },

  gameplayStop() {
    this.gameplayActive = false;
    ADAPTER.gameplayStop();
  },

  // Язык игрока с площадки. Вне площадки — 'ru'.
  // null — площадка языка не дала (нет SDK, таймаут): вызывающий подставляет
  // следующий источник (navigator.language в main.js). Жёсткий 'ru' здесь съедал
  // фолбэк на язык браузера — отказ Осушения по п.2.14 (2026-08-20).
  getLang() { return ADAPTER.getLang() || null; },

  // ---- Полный экран ---------------------------------------------------------
  // Три состояния, и кнопку в меню рисуем ТОЛЬКО в первых двух:
  //   1) площадка умеет разворачивать сама (SDK) — зовём её;
  //   2) обычная страница вне iframe — обычный Fullscreen API;
  //   3) ни то, ни другое (iframe без разрешения) — supported() false, кнопки нет.
  // Третий случай раньше выглядел как сломанная кнопка: нажатие ничего не делало и ничего не
  // говорило (жалоба владельца 15.08). Молчаливая кнопка хуже отсутствующей.
  screen: {
    _viaAdapter() { return !!(ADAPTER.screen && ADAPTER.screen.supported(ADAPTER)); },

    supported() {
      if (this._viaAdapter()) return true;
      try {
        return !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
      } catch (e) { return false; }
    },

    isOn() {
      if (this._viaAdapter()) return ADAPTER.screen.isOn(ADAPTER);
      return !!document.fullscreenElement;
    },

    // Промис резолвится ПОСЛЕ попытки — вызывающий обновляет подпись по факту состояния.
    toggle() {
      if (this._viaAdapter()) return ADAPTER.screen.toggle(ADAPTER);
      try {
        if (document.fullscreenElement) return Promise.resolve(document.exitFullscreen());
        return Promise.resolve(document.documentElement.requestFullscreen()).catch(() => {});
      } catch (e) { return Promise.resolve(); }
    }
  },

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
        // Награда принимается, только пока поток жив. Опоздавший onRewarded (после onClose или
        // после сторожа) игнорируем — иначе одно нажатие приносит две награды.
        onRewarded: () => { if (flow.late()) { console.warn('[platform] onRewarded после закрытия показа — награда не выдаётся'); return; } if (onRewarded) onRewarded(); },
        // Третьим аргументом отдаём наверх признак «показ реально открывался» — по нему
        // игра решает, можно ли молча повторить попытку.
        onClose: (result) => flow.finish(result, flow.opened()),
      });
    },

    // Есть ли предзагруженная вознаграждаемая реклама. Кнопку награды рисовать только по true:
    // на VK это условие модерации (VKWebAppCheckNativeAds, п.5.1.5.3), у Яндекса API проверки
    // нет — адаптер честно отвечает true, и кнопка показывается всегда.
    hasRewarded() {
      const fn = ADAPTER.ads.hasRewarded;
      return fn ? Promise.resolve(fn.call(ADAPTER.ads, ADAPTER)) : Promise.resolve(true);
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
    // из зеркала тихо откатывается (реальный баг, найден на «Изнанке» 04.08: купил
    // улучшение → сразу следующая сцена → улучшение пропало). Проставляем savedAt сразу,
    // чтобы зеркало было СТРОГО новее известного состояния облака с этого момента.
    update(partial) {
      Platform.cache = { ...(Platform.cache || {}), ...partial, savedAt: Date.now() };
      Platform._dirty = true;
      writeMirror(Platform.cache);
      // Таймер НЕ ПЕРЕЗАПУСКАЕТСЯ: он ставится один раз и обязательно срабатывает.
      // Раньше здесь стоял clearTimeout + новый setTimeout, то есть окно склейки начиналось
      // заново на КАЖДЫЙ вызов. У игры, которая зовёт update() каждый кадр, окно не
      // истекало никогда — в облако не уходило вообще ничего, пока игрок не замирал на две
      // секунды. Замер красной команды 12.08: 226 вызовов за 3 секунды, записей в облако 0.
      // Склейку частых вызовов это по-прежнему даёт (одна запись на окно), но теперь
      // гарантирует, что запись случится.
      if (!Platform._timer) {
        Platform._timer = setTimeout(() => { Platform._timer = null; Platform.save._write(); }, flushDelay());
      }
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
      const payload = { ...Platform.cache, _v: SAVE_VERSION, savedAt: Date.now() };
      writeMirror(payload);
      try {
        if (ADAPTER.storage.isAvailable(ADAPTER)) await ADAPTER.storage.write(ADAPTER, payload);
        // Флаг снимаем ТОЛЬКО после удачной записи. Раньше он снимался до await, и упавшая
        // запись (сеть, отказ площадки) больше никогда не повторялась: flush() при закрытии
        // вкладки видел «чисто» и молчал.
        Platform._dirty = false;
      } catch (e) {
        console.warn('[platform] запись в облако не удалась, повторим позже', e);
      }
    },
  },

  leaderboard: {
    setScore(name, score) { return ADAPTER.leaderboard.setScore(ADAPTER, name, score); },
    getPlayerEntry(name) { return ADAPTER.leaderboard.getPlayerEntry(ADAPTER, name); },
    getTop(name, n = 10) { return ADAPTER.leaderboard.getTop(ADAPTER, name, n); },
  },

  // ---- Сырое локальное хранилище --------------------------------------------
  // Та же безопасная площадка-осведомлённая обёртка, что и у зеркала меты ниже
  // (store()) — учитывает VK: сырой localStorage не переживает reload в их
  // sandbox-iframe (см. store()). Раньше store() была приватной; отдаём наружу
  // маленький срез для НЕ-мета данных с собственным жизненным циклом — например,
  // чекпоинт текущего забега (platform/runSave.js): ему не нужны ни облако, ни
  // дебаунс, ни версии/миграции Platform.save, но нужна та же VK-безопасность.
  local: {
    getItem(key) { try { return store()?.getItem(key) ?? null; } catch (e) { return null; } },
    setItem(key, value) { try { store()?.setItem(key, value); } catch (e) {} },
    removeItem(key) { try { store()?.removeItem(key); } catch (e) {} },
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
