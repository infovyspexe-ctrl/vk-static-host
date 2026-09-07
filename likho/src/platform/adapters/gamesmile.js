// АДАПТЕР ПЛОЩАДКИ: собственный сайт GameSmile.
//
// Здесь мы владеем обеими сторонами, поэтому внешнего SDK нет вовсе — ни своего,
// ни чужого. Прослойки вроде GamePush отвергнуты в CONVENTIONS.md §15 (сторонний
// домен режут антивирусы игроков); для своего сайта довод тем более действует.
//
// Реализует контракт из ../index.js. Слой передаёт адаптер первым аргументом
// в методы рекламы, хранилища и лидерборда — так же, как в vk.js и yandex.js.
//
// Что заглушено и почему:
// - реклама: на нашем домене SDK Яндекса не работает, а РСЯ подключается только
//   после подтверждения домена. Заглушка отвечает немедленно, чтобы слой снял
//   паузу и игра пошла дальше. За вознаграждаемую награду выдаём — как в vk.js:
//   игрок не должен страдать из-за того, что рекламы у нас пока нет;
// - лидерборды: серверные, появятся вместе с мини-API.
//
// Сейв: вошёл игрок — правда лежит в его профиле на нашем сервере (/api/save/<игра>),
// а localStorage остаётся зеркалом на случай, когда сети нет. Не вошёл — только
// localStorage, ни одного запроса к API. Играть без входа остаётся нормой.
//
// Игра открывается в iframe на нашем же домене (/play/<игра>/index.html), поэтому
// fetch к /api/ уходит вместе с кукой сессии без всяких настроек. Если игру однажды
// вынесут на чужой домен (embed-программа), понадобится токен вместо куки.
//
// Слой держит в localStorage своё зеркало (MIRROR_KEY в ../index.js), поэтому ключи
// обязаны отличаться — иначе зеркало затрёт основную запись при следующей перезаписи.
//
// Семантика storage.read сверена с adapters/yandex.js (см. комментарий там же и в
// самом методе ниже): реальный Yandex SDK на «нет сохранения» отвечает пустым
// объектом из try-ветки (getData() резолвится в {} для нового игрока — это
// поведение самого SDK, не наше), а null отдаёт adapters/yandex.js только из
// catch — то есть при настоящей ошибке чтения. У нас то же самое разделение
// сделано явно: raw === null (ключа в localStorage нет) — это новый игрок,
// {} и не сбой; JSON.parse бросил или localStorage бросил (приватный режим,
// испорченные данные) — это уже catch, и вот тут возвращаем null.

// Ключ сейва ОБЯЗАН быть свой у каждой игры. На Яндексе и в VK об этом можно не думать:
// там у каждой игры свой origin, и одинаковый ключ никому не мешает. У нас все игры
// раздаются с одного домена (gamesmile.ru/play/<slug>/), то есть делят один localStorage —
// с общей константой вторая же игра, дошедшая до сохранения, затёрла бы сейв первой.
// Слой про это знает и своё зеркало именует по GAME_ID (MIRROR_KEY в ../index.js);
// адаптеру GAME_ID не передают, поэтому берём slug из адреса — раскладку /play/<slug>/
// делаем мы сами (games_build.copy_builds в репозитории сайта), она предсказуема.
function gameKey() {
  try {
    const m = location.pathname.match(/\/play\/([^/]+)\//);
    if (m) return m[1];
  } catch (e) { /* нет location — падать из-за ключа нельзя */ }
  // Билд, открытый не из раздачи сайта (локальная проверка через http.server в корне
  // билда). Игры при этом разводятся по портам, а порт входит в origin, так что
  // общий запасной ключ их не смешивает.
  return 'local';
}

const KEY = 'gs_cloud_save:' + gameKey();
const API_SAVE = '/api/save/' + gameKey();

// Вошёл ли игрок. Спрашивается один раз в init: пока не вошёл — работаем
// с браузером, как раньше, и ни одного запроса к API не делаем.
let signedIn = false;

// Три разных состояния локальной копии, и путать их нельзя:
//   строка    — копия есть;
//   null      — записи нет (новый игрок);
//   undefined — прочитать не смогли (приватный режим, испорченное хранилище).
function localRaw() {
  try { return localStorage.getItem(KEY); }
  catch (e) { return undefined; }
}

function localWrite(text) {
  try { localStorage.setItem(KEY, text); return true; }
  catch (e) { return false; }
}

// Отправить содержимое наверх, ничего не дожидаясь. Ответ не важен: не дошло —
// дойдёт со следующим автосохранением, которое случится через пару секунд.
function pushUp(text) {
  try {
    fetch(API_SAVE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: text }),
    }).catch(function () {});
  } catch (e) { /* сети нет — не беда */ }
}

export const GameSmileAdapter = {
  name: 'gamesmile',
  available: false,

  // Как у Яндекса: localStorage переживает обновление страницы, спешить некуда.
  flushDelayMs: 2000,

  async init() {
    // Своя площадка не может «не подняться»: проверять нечего.
    this.available = true;
    try {
      const answer = await fetch('/api/me');
      const data = await answer.json();
      signedIn = !!(data && data.player);
    } catch (e) {
      // API не поднят или сети нет — работаем с браузером, как раньше.
      signedIn = false;
    }
    console.log('[platform:gamesmile] свой сайт, сейвы: %s',
                signedIn ? 'профиль игрока' : 'браузер (не вошёл)');
  },

  ready() {},
  gameplayStart() {},
  gameplayStop() {},

  getLang() {
    const lang = (document.documentElement.lang || navigator.language || 'ru').slice(0, 2);
    return lang === 'en' ? 'en' : 'ru';
  },

  ads: {
    showFullscreen(a, { onOpen, onClose } = {}) {
      console.log('[platform:gamesmile] полноэкранная (заглушка)');
      if (onClose) onClose(false);   // false = показа не было
    },

    showRewarded(a, { onOpen, onRewarded, onClose } = {}) {
      console.log('[platform:gamesmile] вознаграждаемая (заглушка), выдаю награду');
      if (onRewarded) onRewarded();
      if (onClose) onClose(false);
    },

    async showBanner() {},
    async hideBanner() {},
  },

  storage: {
    isAvailable(a) { return a.available; },

    async read(a) {
      // ВНИМАНИЕ на семантику: слой (Platform.save.load в ../index.js) считает null
      // ответом «прочитать не смогли» и после него блокирует запись (_loadFailed),
      // чтобы не затереть сейв пустышкой. Для нового игрока, у которого сохранения
      // ещё нет, возвращать null НЕЛЬЗЯ — ровно как adapters/yandex.js не возвращает
      // null, пока getData() у настоящего SDK не бросит исключение.
      if (signedIn) {
        try {
          const answer = await fetch(API_SAVE);
          if (!answer.ok) throw new Error('облако ответило ' + answer.status);
          const data = await answer.json();
          if (data.payload === null) {
            // В профиле пусто. Это НЕ обязательно новый игрок: человек мог играть
            // здесь же до входа, и тогда прогресс лежит в браузере. Отдать сюда {}
            // значит начать с нуля и первой же записью затереть его —
            // 13.08 так потерялся прогресс в «Осуши озеро».
            //
            // Полагаться на перенос при входе (auth.js на странице сайта) нельзя:
            // он идёт параллельно с игрой и может не успеть. Решаем здесь, где
            // видно обе стороны сразу.
            const mine = localRaw();
            if (typeof mine === 'string') {
              console.log('[platform:gamesmile] профиль пуст, беру прогресс из браузера');
              try {
                const local = JSON.parse(mine);
                // Отправляем наверх сразу, не дожидаясь ближайшего автосохранения:
                // иначе второе устройство увидит пустоту и решит, что игрок новый.
                pushUp(mine);
                return local;
              } catch (e2) {
                console.warn('[platform:gamesmile] копия испорчена', e2);
              }
            }
            return {};                            // и вот теперь это новый игрок
          }
          const parsed = JSON.parse(data.payload);
          localWrite(data.payload);               // зеркало на случай, когда сети нет
          return parsed;
        } catch (e) {
          // Сети нет. Играем по локальной копии — казуальная игра не должна
          // отказывать человеку в метро.
          console.warn('[platform:gamesmile] облако недоступно, беру копию', e);
        }
      }
      const raw = localRaw();
      if (raw === null) {
        // Копии нет. Для ВОШЕДШЕГО это не «новый игрок»: облако не ответило, и в нём
        // вполне может лежать прогресс. Соврать сюда {} — значит начать с нуля
        // и следующей же записью затереть облако.
        return signedIn ? null : {};
      }
      if (raw === undefined) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[platform:gamesmile] копия испорчена', e);
        return null;
      }
    },

    async write(a, payload) {
      const text = JSON.stringify(payload);
      const localOk = localWrite(text);
      if (!signedIn) return localOk;

      let cloudOk = false;
      try {
        const answer = await fetch(API_SAVE, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: text }),
        });
        cloudOk = answer.ok;
        if (!cloudOk) {
          console.warn('[platform:gamesmile] облако не приняло сейв', answer.status);
        }
      } catch (e) {
        // Очереди отложенных записей нет намеренно: игра пишет каждые пару секунд,
        // и первая же удачная запись отправит наверх актуальное состояние.
        console.warn('[platform:gamesmile] сейв не ушёл в облако, починится следующей записью', e);
      }
      return localOk || cloudOk;
    },
  },

  // Локальное зеркало слоя (MIRROR_KEY) хочет тот же safeStorage(), что и у Яндекса —
  // безопасную обёртку над хранилищем. У нас «облако» и есть localStorage браузера,
  // так что достаточно вернуть null: слой сам возьмёт обычный localStorage под try
  // (см. store() в ../index.js). Терять тут нечего — тот же браузер с обеих сторон.
  safeStorage() { return null; },

  leaderboard: {
    async setScore(a, name, score) {
      console.log('[platform:gamesmile] рекорд (пока не поддержан)', name, score);
    },
    async getPlayerEntry() { return null; },
    async getTop() { return []; },
  },
};

// Наш сайт узнаём по имени хоста. Адрес по IP оставлен намеренно: до покупки домена
// сайт открывается по нему, и без этого проверить запуск было бы негде.
export function isGameSmile() {
  try {
    const h = location.hostname;
    return h === 'gamesmile.ru' || h === 'www.gamesmile.ru' || h === '217.114.12.107' || h === 'localhost';
  } catch (e) {
    return false;
  }
}
