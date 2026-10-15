// ТИПЫ ГОСТЕЙ — модификаторы поверх обычного клиента. Только числа.
//
// Раньше все гости были одинаковыми: отличались лишь рецептом и любимым заказом. Тип
// гостя добавляет решение в момент выбора («капо платит вдвое, но ждать не будет»), не
// трогая ядро — mechanics/orders принимает патрона снаружи и остаётся замкнутым.
//
// ПРОХОДИМОСТЬ — главное ограничение игры (CLAUDE.md, «что нельзя сломать»): норматив
// сборки должен оставаться МЕНЬШЕ терпения ПОСЛЕ применения множителя. Расчёты:
//   капо, худший случай (supreme, 4 топпинга, смена 5): реальное время 15.1 с
//     против терпения 52.4 * 0.6 = 31.4 с — запас 16.3 с;
//   капо, смена 1 (pepperoni): 11.5 с против 36.2 * 0.6 = 21.7 с — запас 10.2 с;
//   обжора (две пиццы): ~30.2 с против 52.4 * 2.0 = 104.8 с — запас 74.6 с.
// Меняешь patienceMult, топпинги или par-секунды — пересчитываешь таблицу в NOTES.md.
//
// Поля:
//   patienceMult — множитель терпения
//   payMult      — множитель итоговой оплаты
//   double       — гость берёт две пиццы вместо одной
//   exactOnly    — платит только за 100% точность (шпион конкурентов)
//   weight       — вес в случайном выборе среди доступных
//   fromDistrict — с какого района (0-based) тип начинает появляться
export const PATRONS = {
  regular: { id: 'regular', patienceMult: 1.0, payMult: 1.0, double: false, exactOnly: false, weight: 50, fromDistrict: 0 },
  tourist: { id: 'tourist', patienceMult: 1.5, payMult: 0.7, double: false, exactOnly: false, weight: 20, fromDistrict: 0 },
  capo:    { id: 'capo',    patienceMult: 0.6, payMult: 2.0, double: false, exactOnly: false, weight: 12, fromDistrict: 0 },
  glutton: { id: 'glutton', patienceMult: 2.0, payMult: 2.2, double: true,  exactOnly: false, weight: 10, fromDistrict: 1 },
  spy:     { id: 'spy',     patienceMult: 1.0, payMult: 1.0, double: false, exactOnly: true,  weight: 8,  fromDistrict: 2 }
};

export const PATRON_IDS = Object.keys(PATRONS);

// Доступные типы для района. rng инжектируется, чтобы выбор был детерминированно тестируем.
export function pickPatron(districtIndex, rng = Math.random) {
  const pool = PATRON_IDS.map((id) => PATRONS[id]).filter((p) => p.fromDistrict <= districtIndex);
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let roll = rng() * total;
  for (const p of pool) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return pool[pool.length - 1] || PATRONS.regular;
}
