// Настройки игры из API площадки.
//
// По дорожной карте (Волна 1) это «субстрат, на котором потом без переделки
// вырастают флаги, промо-акции и эксперименты»: конфиг приходит ИЗ API, а не
// зашит в билд. Значит поменять поведение игры можно, не пересобирая её и не
// проходя модерацию площадок заново.
//
// ПРОВЕРКА ДОМЕНА здесь мягкая и это осознанно. Наши игры живут ещё на Яндекс
// Играх и во ВКонтакте — жёсткий запрет «работать только на gamesmile.ru»
// сломал бы то, что приносит деньги. Поэтому по умолчанию список доменов пуст
// (работать где угодно), а поведение на чужом домене задаётся настройкой:
//   note — показать ссылку на площадку,
//   stop — не запускаться.
// Второе включается осознанно и не раньше, чем список доменов станет полным —
// то есть вместе с программой встраивания.
const TIMEOUT_MS = 4000;

let cached = null;

export async function loadConfig(game) {
  if (cached) return cached;
  // Настройки не обязаны доехать: сеть могла подвести, площадка могла быть
  // чужой. Игра запускается в любом случае — конфиг это тонкая настройка, а не
  // условие работы.
  const fallback = { domains: [], offsite: 'note', ads: false };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch('/api/config?game=' + encodeURIComponent(game),
                            { signal: controller.signal });
    clearTimeout(timer);
    cached = res.ok ? { ...fallback, ...(await res.json()) } : fallback;
  } catch (e) {
    cached = fallback;
  }
  return cached;
}

// Разрешён ли нынешний домен. Пустой список — разрешено везде.
export function allowedHere(config) {
  const list = (config && config.domains) || [];
  if (!list.length) return true;
  let host = '';
  try {
    host = location.hostname;
  } catch (e) {
    return true;   // не смогли узнать — не мешаем играть
  }
  return list.some((d) => host === d || host.endsWith('.' + d));
}

// Что делать на чужом домене. Отдаёт 'ok' | 'note' | 'stop'.
export function offsiteAction(config) {
  if (allowedHere(config)) return 'ok';
  return config && config.offsite === 'stop' ? 'stop' : 'note';
}
