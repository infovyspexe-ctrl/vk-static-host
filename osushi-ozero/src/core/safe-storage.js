// БЕЗОПАСНОЕ ХРАНИЛИЩЕ (YANDEX-SDK.md, эталон — games/rubezh/src/sdk.js).
//
// Зачем. Игра на площадке живёт в iframe, а в iframe на iOS/macOS прямой доступ к
// localStorage ломается: он либо недоступен, либо вычищается ITP, либо сам доступ
// БРОСАЕТ исключение (приватный режим Safari). SDK Яндекса про это прямо предупреждает
// в консоли и предлагает `ysdk.getStorage()` — объект с тем же интерфейсом, который
// это переживает.
//
// Почему это важно именно нам. После разделения сейва (2026-07-19) локальное хранилище
// стало ОСНОВНЫМ: состояние партии живёт только в нём, облако догоняет на ключевых
// точках. Сломанный localStorage на iOS = потерянный прогресс, а мобильная аудитория
// Яндекса примерно вдвое больше десктопной (RETENTION.md).
//
// Использование: storage()?.setItem(...) — метод может вернуть null, если писать
// вообще некуда. Вызывающий обязан это пережить (у нас всё в try/catch).

let safe = null;

// Вызвать один раз после инициализации площадки (PreloadScene), передав
// Platform.safeStorage(). Аргумент — готовый Storage-подобный объект от адаптера
// (у Яндекса это ysdk.getStorage(), у VK его нет — там null). null/нет площадки —
// no-op, дальше работает обычный localStorage.
export function initSafeStorage(store) {
  safe = store || null;
}

// Синхронный доступ. null — писать некуда (приватный режим).
export function storage() {
  if (safe) return safe;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch (e) {
    return null; // приватный режим Safari бросает на САМОМ обращении к localStorage
  }
}
