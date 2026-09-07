// ВЗВЕШЕННЫЙ ОТБОР БЕЗ ПОВТОРОВ: k элементов из списка, вероятность каждого следующего
// вытягивания пропорциональна его весу среди ещё не вытянутых.
//
// Один и тот же алгоритм нужен на ДВУХ этапах отбора карт улучшений: какие 5 кандидатов
// предложить (data/upgrades.js: rollUpgrades) и какие 3 из смешанного пула оружия+пассивов
// реально показать игроку (GameScene._rollChoices). Раньше второй этап отбирал equal-вероятно
// через голый Math.random(), и подпись «Редкое» переставала быть правдой на финальном экране —
// баг, найденный игроком: редкие карты выпадали не реже обычных, потому что вес учитывался
// только на первом отборе, а решающий (какие 3 покажутся) — нет.
export function weightedPick(items, count, weightFn, rng = Math.random) {
  const bag = items.slice();
  const out = [];
  while (out.length < count && bag.length > 0) {
    let total = 0;
    for (const it of bag) total += weightFn(it) || 1;
    let r = rng() * total;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      r -= weightFn(bag[i]) || 1;
      if (r <= 0) { idx = i; break; }
    }
    out.push(bag[idx]);
    bag.splice(idx, 1);
  }
  return out;
}
