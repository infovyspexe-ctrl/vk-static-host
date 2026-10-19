// Мост к площадке для игры, запущенной В ПЕСОЧНИЦЕ.
//
// Когда игра чужая, GameSmile запускает её в iframe без общего происхождения:
// своих кук у неё нет, наш API для неё чужой сайт, localStorage недоступен.
// Это сделано нарочно — иначе чужой код на домене площадки мог бы действовать
// от лица игрока.
//
// Взамен площадка принимает просьбы: игра просит, страница делает. Умеет она
// ровно четыре вещи — прочитать и записать СВОЙ сейв, отправить рекорд,
// посмотреть таблицу и узнать имя игрока. Больше ничего и не нужно.
//
// Признак режима — метка `gs=bridge` в адресе: своего происхождения у игры в
// песочнице нет, и определить это изнутри ей больше нечем.
const WAIT_MS = 8000;

export function inBridge() {
  try {
    return new URLSearchParams(location.search).get('gs') === 'bridge';
  } catch {
    return false;
  }
}

let seq = 0;
const waiting = new Map();

if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    // Отвечает только родительское окно: чужая вкладка своим окном
    // притвориться не может.
    if (e.source !== window.parent) return;
    const msg = e.data;
    if (!msg || msg.gs !== true || msg.id === undefined) return;
    const pending = waiting.get(msg.id);
    if (!pending) return;
    waiting.delete(msg.id);
    clearTimeout(pending.timer);
    pending.resolve(msg.ok ? msg.data : null);
  });
}

function ask(want, extra = {}) {
  if (!inBridge()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const id = ++seq;
    // Ответа может не быть вовсе: страница старая, мост не подключён, окно
    // закрылось. Ждать вечно нельзя — игра повиснет на загрузке.
    const timer = setTimeout(() => {
      waiting.delete(id);
      resolve(null);
    }, WAIT_MS);
    waiting.set(id, { resolve, timer });
    try {
      window.parent.postMessage({ gs: true, id, want, ...extra }, '*');
    } catch (e) {
      clearTimeout(timer);
      waiting.delete(id);
      resolve(null);
    }
  });
}

export const Bridge = {
  getSave: () => ask('save:get'),
  putSave: (payload) => ask('save:put', { payload }),
  setScore: (score) => ask('score:put', { score }),
  getLeaders: () => ask('score:get'),
  me: () => ask('me'),
};
