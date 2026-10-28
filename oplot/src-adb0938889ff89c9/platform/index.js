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

const ADAPTER = isVkLaunch() ? VkAdapter : (isGameSmile() ? GameSmileAdapter : YandexAdapter);
// ─────────────────────────────────────────────────────────────────────────────

// Имя игры = имя папки в games/. ОБЯЗАТЕЛЬНО заменить при копировании шаблона:
// на общем dev-сервере (один порт на все игры) localStorage общий, и без префикса
// игры затирают сейвы друг друга (CONVENTIONS.md, раздел 7).
export const GAME_ID = 'oplot';
if (GAME_ID === 'game') {
  console.warn('[platform] GAME_ID не заполнен — локальный сейв конфликтует с другими играми');
}

// The same hosted URL can be opened by different VK accounts. Never merge one
// account's local mirror into another account's cloud progress.
const vkParams = isVkLaunch() ? new URLSearchParams(location.search) : null;
const MIRROR_KEY = vkParams
  ? `${GAME_ID}_vk_${vkParams.get('vk_app_id')}_${vkParams.get('vk_user_id') || 'anonymous'}_save_local`
  : GAME_ID + '_save_local';
const MIRROR_STATE_KEY = MIRROR_KEY + '_sync';
let cloudBaseline = null;
const FLUSH_DELAY_MS = 2000;                // склейка частых update() в одну запись
const nextSavedAt = (previous) => Math.max(Date.now(), (Number(previous) || 0) + 1);

// Адаптер может переопределить задержку (ADAPTER.flushDelayMs) — нужно площадкам, где
// локальное зеркало не переживает обновление страницы (VK: сандбокс-iframe стирает
// localStorage при рефреше, см. грабля №3 в adapters/vk.js), поэтому там окно между
// действием игрока и записью в облако должно быть коротким.
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
// 120 секунд — аварийный предел ожидания ответа SDK, а не подтверждение просмотра.
// После него поздняя награда игнорируется; нормальное завершение приходит от SDK.
// Заодно защищает от ДВОЙНОГО onClose: некоторые площадки зовут его и на закрытие, и на
// ошибку — второй вызов раньше слал лишний game:resume и лишний gameplayStart.
const AD_WATCHDOG_MS = 120000;
let adBusy = false;

function adFlow(onClose) {
  const wasPlaying = Platform.gameplayActive;
  let done = false;
  let opened = false;
  let watchdog = setTimeout(() => finish(false), 8000);
  const finish = (result, wasOpened) => {
    if (done) return;
    done = true;
    adBusy = false;
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
      if (done || opened) return;
      opened = true;
      clearTimeout(watchdog);
      Platform.gameplayStop();
      bus.emit('game:pause', { showOverlay: false });
      watchdog = setTimeout(() => {
        console.warn('[platform] реклама не ответила за ' + (AD_WATCHDOG_MS / 1000) + 'с — снимаем паузу принудительно');
        // VK has no confirmed onOpen callback: opening our pause is not an impression.
        finish(false, Platform.name === 'vk' ? false : opened);
      }, AD_WATCHDOG_MS);
    },
    finish,
  };
}

export const Platform = {
  name: ADAPTER.name,
  available: false,
  gameplayActive: false, // идёт ли активный геймплей — нужно паузе и рекламе
  readOnly: false,       // в облаке сейв новее нашего клиента: играем, но не пишем

  cache: null,
  _timer: null,
  _dirty: false,
  _revision: 0,
  _writing: null,
  _loadFailed: false,    // чтение облака не удалось — писать НЕЛЬЗЯ, затрём чужой прогресс

  async init() {
    await ADAPTER.init();
    this.name = ADAPTER.name;
    this.available = ADAPTER.available;
    return this.available;
  },

  ready() {
    ADAPTER.ready();
    // gameStart→LoadingAPI.ready не подтверждён; без ready консоль не пускает на
    // модерацию и режет ранжирование). Вне Яндекса — тихо ничего не делает.
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

  // Язык площадки, затем браузера; неподдерживаемый код нормализует i18n.
  getLang() { return ADAPTER.getLang() || globalThis.navigator?.language || 'en'; },

  // ---- Реклама -------------------------------------------------------------
  // Пауза целиком (сцены, звук, GameplayAPI) идёт через шину — требование модерации.
  // Нельзя полагаться на blur: рекламный оверлей на мобильных не отбирает фокус.
  // GameplayAPI восстанавливается честно: если геймплей не шёл до рекламы (например,
  // реклама при выходе в меню), start после закрытия не вызывается.
  ads: {
    async check(format) {
      if (!ADAPTER.available || typeof ADAPTER.ads.check !== 'function') return false;
      try { return await ADAPTER.ads.check(ADAPTER, format); } catch { return false; }
    },
    showFullscreen({ onClose } = {}) {
      if (adBusy) { onClose?.(false, false); return; }
      adBusy = true;
      const flow = adFlow(onClose);
      try { ADAPTER.ads.showFullscreen(ADAPTER, { onOpen: flow.open, onClose: flow.finish }); }
      catch { flow.finish(false); }
    },

    // Награду выдавать ТОЛЬКО в onRewarded.
    showRewarded({ onRewarded, onClose } = {}) {
      if (adBusy) { onClose?.(false, false); return; }
      adBusy = true;
      const flow = adFlow(onClose);
      let granted = false;
      try { ADAPTER.ads.showRewarded(ADAPTER, {
        onOpen: flow.open,
        // Награда принимается, только пока поток жив. Опоздавший onRewarded (после onClose или
        // после сторожа) игнорируем — иначе одно нажатие приносит две награды.
        onRewarded: () => { if (flow.late() || granted) return; granted = true; if (onRewarded) onRewarded(); },
        // Третьим аргументом отдаём наверх признак «показ реально открывался» — по нему
        // игра решает, можно ли молча повторить попытку.
        onClose: (result, confirmed = flow.opened()) => flow.finish(result, confirmed),
      }); } catch { flow.finish(false); }
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
      if (Platform._dirty) await Platform.save.flush();
      const cloud = ADAPTER.storage.isAvailable(ADAPTER) ? await ADAPTER.storage.read(ADAPTER) : null;
      // A native WebView may deny localStorage. Keep unsent edits in memory too.
      const memoryPending = Platform._dirty && Platform.cache !== null;
      const mirror = memoryPending ? Platform.cache : readMirror();

      // null от адаптера = «прочитать не смогли» (сеть, отказ). Это НЕ новый игрок.
      // Без этой ветки первая же запись затирала бы облачный сейв пустышкой —
      // самый дорогой класс бага, который бывает в сохранениях.
      Platform._loadFailed = ADAPTER.storage.isAvailable(ADAPTER) && cloud === null;
      if (Platform._loadFailed) {
        console.warn('[platform] облако не прочиталось — играем на зеркале, в облако не пишем');
      }

      // Device clocks are not cloud revisions. Only replay a pending mirror if
      // its recorded base is still exactly the cloud version it was edited from.
      let pending;
      try { pending = JSON.parse(store()?.getItem(MIRROR_STATE_KEY) || 'null'); } catch {}
      if (memoryPending) pending = {pending:true, base:cloudBaseline};
      const ownAcknowledged = memoryPending && ADAPTER.storage.acknowledged?.(ADAPTER);
      const recoverPending = Platform.name === 'vk' && cloud !== null && mirror &&
        pending?.pending === true && (pending.base === JSON.stringify(cloud) ||
          (ownAcknowledged && JSON.stringify(ownAcknowledged) === JSON.stringify(cloud)));
      const best = Platform.name === 'vk'
        ? (recoverPending ? mirror : cloud || mirror || {})
        : newest(cloud, mirror) || {};
      if (Platform.name === 'vk' && cloud !== null) {
        if (mirror && pending?.pending && !recoverPending) {
          try { store()?.setItem(MIRROR_KEY + '_conflict_backup', JSON.stringify(mirror)); } catch {}
        }
        cloudBaseline = JSON.stringify(cloud);
        Platform._dirty = !!recoverPending;
        Platform.saveConflict = false;
      }
      const { data, fromFuture } = migrate(best);
      Platform.readOnly = fromFuture;
      if (fromFuture) {
        console.warn('[platform] сейв новее версии игры — режим только для чтения');
      }
      Platform.cache = data;
      if (Platform.name === 'vk' && cloud !== null) writeMirror(data);
      if (recoverPending && !Platform._timer) {
        Platform._timer = setTimeout(() => { Platform._timer = null; Platform.save._write(); }, 3000);
      }
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
      Platform.cache = { ...(Platform.cache || {}), ...partial, savedAt: nextSavedAt(Platform.cache?.savedAt) };
      Platform._dirty = true;
      Platform._revision++;
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
      Platform.cache = { ...data, savedAt: nextSavedAt(Platform.cache?.savedAt) };
      Platform._dirty = true;
      Platform._revision++;
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
      if (Platform.readOnly || Platform._loadFailed || Platform.saveConflict) return;
      if (Platform._writing) {
        await Platform._writing;
        if (Platform._dirty) return Platform.save._write();
        return;
      }
      const revision = Platform._revision;
      const payload = JSON.parse(JSON.stringify({ ...Platform.cache, _v: SAVE_VERSION, savedAt: Math.max(Date.now(), Platform.cache.savedAt || 0) }));
      writeMirror(payload);
      // Start on the next microtask so _writing is assigned before a local-only
      // write can complete synchronously. Otherwise a resolved promise remains
      // in _writing and the next flush recursively awaits it forever.
      Platform._writing = Promise.resolve().then(async () => {
        try {
          if (ADAPTER.storage.isAvailable(ADAPTER)) {
            const written = await ADAPTER.storage.write(ADAPTER, payload);
            if (written === false) throw new Error('Cloud save rejected');
          }
          // Флаг снимаем только после удачной записи именно этой ревизии.
          if (Platform.name === 'vk') cloudBaseline = JSON.stringify(payload);
          if (Platform._revision === revision) { Platform._dirty = false; Platform.cache = payload; }
          writeMirror(Platform.cache);
        } catch (e) {
          if (ADAPTER.saveConflict) {
            Platform.saveConflict = true;
            bus.emit('save:conflict');
          } else if (!Platform._timer) {
            Platform._timer = setTimeout(() => { Platform._timer = null; Platform.save._write(); }, 3000);
          }
          console.warn('[platform] запись в облако не удалась, повторим позже', e);
        } finally {
          Platform._writing = null;
        }
      });
      await Platform._writing;
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
  try {
    store()?.setItem(MIRROR_KEY, JSON.stringify(data));
    if (vkParams) store()?.setItem(MIRROR_STATE_KEY, JSON.stringify({base: cloudBaseline, pending: Platform._dirty}));
  }
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
