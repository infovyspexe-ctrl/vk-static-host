// МОДИФИКАТОРЫ НОЧНЫХ СМЕН. Только данные: сцена применяет их множителями к уже
// существующим числам, новых подсистем не появляется.
//
// Зачем. Кампания кончается на 23-й смене, дальше идёт бесконечный режим — и до этой
// таблицы каждая ночная смена была точной копией предыдущей: те же гости, та же печь,
// тот же темп. Игрок, дошедший до конца, получал в награду однообразие.
//
// Кампания модификаторы НЕ использует: пока идёт сюжет, сложность задают район и рецепты,
// а случайный «печь остыла» посреди района дани читался бы как поломка, а не как правило.
//
// Поля — множители к существующим числам:
//   patienceMult — к терпению гостя (как у типов гостей в patrons.js)
//   payMult      — к монетам за выдачу
//   cookMult     — к времени готовки печи
//   spawnMult    — к интервалу спавна (меньше единицы = гости идут чаще)
//   exactOnly    — платят только за точно собранную пиццу (как шпион)
export const NIGHT_MODIFIERS = [
  { id: 'capo_night', patienceMult: 0.6, payMult: 2.0, cookMult: 1,   spawnMult: 1,   exactOnly: false },
  { id: 'cold_oven',  patienceMult: 1,   payMult: 1,   cookMult: 2.0, spawnMult: 1,   exactOnly: false },
  { id: 'rush',       patienceMult: 1,   payMult: 1,   cookMult: 1,   spawnMult: 0.7, exactOnly: false },
  { id: 'picky',      patienceMult: 1,   payMult: 1.3, cookMult: 1,   spawnMult: 1,   exactOnly: true },
  { id: 'generous',   patienceMult: 1,   payMult: 1.5, cookMult: 1,   spawnMult: 1,   exactOnly: false }
];

// Один-два модификатора на ночь.
//
// Основное условие выбирается НЕ случайно, а шагом по таблице. Причина: смысл ночей в том,
// что они отличаются друг от друга, а чистая случайность этого не гарантирует — на живой
// проверке три ночи подряд выпало «Придирчивые», и режим читался как «ничего не поменяли».
// Шаг 2 взаимно прост с длиной таблицы (5), поэтому цикл проходит все пять условий и
// соседние ночи никогда не совпадают. Меняешь число модификаторов — проверь взаимную
// простоту шага и длины, иначе часть условий перестанет выпадать вовсе.
//
// Каждая третья ночь — двойная: без ритма «обычная, обычная, тяжёлая» ночи сливаются в
// ровный шум. Вторая добавка берётся случайно из оставшихся — rng инжектируется, чтобы
// тест был детерминированным.
export function rollModifiers(endlessDay, rng = Math.random) {
  const n = NIGHT_MODIFIERS.length;
  const d = Math.max(0, Math.floor(endlessDay) || 0);
  const first = NIGHT_MODIFIERS[(d * 2) % n];
  const out = [first];
  if (d > 0 && d % 3 === 0) {
    const rest = NIGHT_MODIFIERS.filter((m) => m !== first);
    out.push(rest[Math.floor(rng() * rest.length)]);
  }
  return out;
}

// Свести набор модификаторов в один множитель по каждому полю. Сцена спрашивает готовое
// число и не знает, сколько модификаторов действует.
export function combineModifiers(mods = []) {
  return mods.reduce((acc, m) => ({
    patienceMult: acc.patienceMult * m.patienceMult,
    payMult: acc.payMult * m.payMult,
    cookMult: acc.cookMult * m.cookMult,
    spawnMult: acc.spawnMult * m.spawnMult,
    exactOnly: acc.exactOnly || m.exactOnly
  }), { patienceMult: 1, payMult: 1, cookMult: 1, spawnMult: 1, exactOnly: false });
}
