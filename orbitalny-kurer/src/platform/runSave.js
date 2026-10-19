// ЧЕКПОИНТ ТЕКУЩЕГО ЗАБЕГА (resume run) — НЕ мета-прогресс.
//
// Замкнутый модуль (тот же принцип, что у library/mechanics/): не знает НИЧЕГО о
// конкретной игре и НИЧЕГО о площадке — storage приходит снаружи параметром, а
// не импортом Platform. Это не только чистота: Platform.local() тянет за собой
// выбор адаптера (isVkLaunch() читает location.search) и падает при импорте вне
// браузера — модуль с хардкодным импортом Platform было бы невозможно
// юнит-тестировать в Node. Вызывающий (games/<игра>/src/yandex/runSave.js)
// передаёт storage = Platform.local — единственное место, где эти два слоя
// встречаются.
//
// Почему ОТДЕЛЬНО от Platform.save (мета): та шлёт данные в облако с дебаунсом —
// оправдано, потому что зовётся часто (правило экономии в platform/index.js: в
// облако уходит только мета и только на ключевых точках). Чекпоинт забега зовётся
// редко (у типичной игры — раз на волну/уровень/чекпоинт-точку), и ему НЕ нужно
// облако вообще: потерять чекпоинт при смене устройства — не трагедия (максимум
// один забег), тащить его через дебаунс/миграции меты — лишняя связанность.

// createRunSave({ key, version, storage }) → { save(snapshot), load(), clear() }
//
// key     — ключ хранилища; игра обязана включить туда GAME_ID (общий origin
//           на dev-сервере, см. CONVENTIONS.md раздел 7).
// version — число; несовпадение версии = чекпоинт невалиден и отбрасывается.
//           Миграций нет сознательно: потеря чекпоинта при смене формата —
//           не потеря прогресса, а максимум одна недоигранная попытка.
// storage — { getItem(key), setItem(key,value), removeItem(key) }, безопасный
//           (не бросает исключений) — в игре это Platform.local, в тестах —
//           любой объект с тем же интерфейсом (например, Map-обёртка).
export function createRunSave({ key, version, storage }) {
  function save(snapshot) {
    storage.setItem(key, JSON.stringify({ v: version, savedAt: Date.now(), ...snapshot }));
  }

  function load() {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || d.v !== version) return null;
      return d;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    storage.removeItem(key);
  }

  return { save, load, clear };
}
