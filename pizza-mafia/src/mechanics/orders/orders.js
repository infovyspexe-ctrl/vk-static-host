// ЗАКАЗЫ: замкнутый модуль (CONVENTIONS.md, раздел 3). Не знает про Phaser, i18n, тему
// и про название игры — только числа и чистые функции. Конфиг (рецепты, ингредиенты,
// баланс терпения, апгрейды) приходит снаружи из data/balance.js.
//
// Ответственность модуля:
//   - спавн клиента: выбор рецепта из числа открытых по дню, выбор персонажа, расчёт
//     терпения (с учётом дня и апгрейда patience);
//   - тик терпения: уменьшает patienceLeft на dt, возвращает факт ухода клиента (patience 0);
//   - проверка собранной пиццы: точность по ингредиентам (сравнение множеств);
//   - награда: цена + чаевые (зависят от скорости и точности) + бонус любимого заказа.
//
// rng — функция () => [0,1), инжектируется вызывающим (по умолчанию Math.random), чтобы
// модуль оставался детерминированно тестируемым (приём как в carwash.js / reigns.js).
//
// Модуль НЕ хранит очередь — состоянием очереди владеет сцена. Модуль даёт чистые функции
// создания/тика/оценки одного клиента. Так его проще тестировать и переносить.

import { PATIENCE, ECONOMY } from '../../data/balance.js';

// Норматив сборки рецепта (сек) — сумма пар-нормативов этапов. Нужен для расчёта чаевых
// (serveSpeed = realSeconds / parSeconds) и для аналитики. Берётся из EACH_STAGE.
// dough + sauce + cheese + toppings(per) + oven(реакция). Время готовки в печь СЮДА НЕ
// входит — оно не зависит от сноровки игрока (таймер печи), а чаевые — за сноровку.
function parBuildSeconds(recipe, eachStage) {
  return (
    eachStage.dough.parSeconds +
    eachStage.sauce.parSeconds +
    eachStage.cheese.parSeconds +
    recipe.toppings.length * eachStage.toppings.perToppingSeconds +
    eachStage.oven.parSeconds
  );
}

// Создать клиента. picks:
//   recipe      — объект рецепта из data/balance.js (уже открытый кампанией)
//   customer    — объект персонажа из CUSTOMERS (или null = случайный гость)
//   day         — сквозной номер смены (1-based), влияет на терпение
//   patienceAdd — суммарный бонус от апгрейда patience (сек), 0 если не куплен
//   patron      — ТИП гостя из data/patrons.js (или null = обычный). Модуль про конкретные
//                 типы не знает: получает объект с множителями снаружи и остаётся замкнутым.
//                 ВАЖНО: patienceMult не должен опускать терпение ниже норматива сборки,
//                 иначе смена становится непроходимой (CLAUDE.md, «что нельзя сломать»).
export function createCustomer({ recipe, customer, day, patienceAdd = 0, eachStage, patron = null }) {
  const base = PATIENCE.base + PATIENCE.perDay * Math.max(0, (day - 1));
  const recipeExtra = PATIENCE.recipeExtra * recipe.toppings.length;
  const patienceMult = patron && typeof patron.patienceMult === 'number' ? patron.patienceMult : 1;
  const patience = (base + recipeExtra + patienceAdd) * patienceMult;
  const par = parBuildSeconds(recipe, eachStage);
  return {
    id: Symbol('customer'),
    recipe,
    customer: customer || null,
    patron: patron || null,
    inWork: false,        // заказ взят в работу (сборка или печь) — терпение заморожено
    patienceTotal: patience,
    patienceLeft: patience,
    spawnAt: null,        // мс epoch; ставит сцена при показе (для serveSpeed)
    parBuildSeconds: par, // норматив сборки этого рецепта
    served: false,
    lost: false
  };
}

// Тик терпения. dtSec — секунд прошло. Возвращает { left, lost }.
// lost=true когда терпение ушло в нуль на этом тике (клиент уходит).
//
// ФЛАГ inWork замораживает терпение: заказ уже взят в работу (собирается или печётся).
// Без этого получался неразрываемый порочный круг, найденный живой игрой 2026-08-11:
// гость уходил, пока его пицца пеклась, пицца оставалась ничьей, время тратилось впустую —
// и чем сильнее отстаёшь, тем больше работы в никуда. Выбраться было нельзя в принципе.
// В фикции это и логично: никто не уходит, когда его пицца уже в печи. Давление остаётся
// на ОЖИДАЮЩЕЙ очереди, то есть на решении «сколько заказов брать одновременно».
export function tickPatience(customer, dtSec) {
  if (customer.served || customer.lost || customer.inWork) {
    return { left: customer.patienceLeft, lost: false };
  }
  customer.patienceLeft = Math.max(0, customer.patienceLeft - dtSec);
  if (customer.patienceLeft <= 0) {
    customer.lost = true;
    return { left: 0, lost: true };
  }
  return { left: customer.patienceLeft, lost: false };
}

// Добавить терпения (кнопка «спасение» за рекламу). НеaboveTotal — может расти сверх базы.
export function addPatience(customer, sec) {
  customer.patienceLeft += sec;
  customer.patienceTotal = Math.max(customer.patienceTotal, customer.patienceLeft);
  if (customer.lost) customer.lost = false; // спасли ушедшего, но ещё не убранного
  return customer.patienceLeft;
}

// Доля терпения [0..1] — для полоски. warn=true ниже PATIENCE.warnFraction.
export function patienceFraction(customer) {
  const f = customer.patienceTotal > 0 ? customer.patienceLeft / customer.patienceTotal : 0;
  return { frac: Math.max(0, Math.min(1, f)), warn: f <= PATIENCE.warnFraction };
}

// ── Проверка собранной пиццы ──────────────────────────────────────────────
// pizza — что собрал игрок: { sauce, cheese, toppings:Set|Array }. recipe — эталон.
// Сравнение по множествам ингредиентов: ключ — что нанесено, а не сколько/где.
// Возвращает { accuracy:0..1, exact:bool, missing:[], extra:[] }.
export function checkPizza(pizza, recipe) {
  const wantSauce = recipe.sauce;
  const wantCheese = recipe.cheese;
  const wantToppings = new Set(recipe.toppings);

  const gotSauce = pizza.sauce || null;
  const gotCheese = pizza.cheese || null;
  const gotToppings = new Set(Array.isArray(pizza.toppings) ? pizza.toppings : (pizza.toppings && [...pizza.toppings]) || []);

  // Точки совпадения: соус, сыр, и топпинги поштучно.
  let points = 0;
  let total = 0;
  const missing = [];
  const extra = [];

  total += 1;
  if (gotSauce === wantSauce) points += 1; else { if (wantSauce) missing.push(wantSauce); if (gotSauce) extra.push(gotSauce); }

  total += 1;
  if (gotCheese === wantCheese) points += 1; else { if (wantCheese) missing.push(wantCheese); if (gotCheese) extra.push(gotCheese); }

  for (const t of wantToppings) {
    total += 1;
    if (gotToppings.has(t)) points += 1; else missing.push(t);
  }
  for (const t of gotToppings) {
    if (!wantToppings.has(t)) { total += 1; extra.push(t); } // лишний топпинг — недочет
  }

  const accuracy = total > 0 ? points / total : 1;
  const exact = missing.length === 0 && extra.length === 0;
  return { accuracy, exact, missing, extra };
}

// ── Награда за выдачу ──────────────────────────────────────────────────────
// serveMs — сколько мс прошло от спавна клиента до выдачи (сцена считает по spawnAt).
// tipUpgradeBonus — суммарный +множитель от апгрейда tipBonus (0 если не куплен).
// Возвращает { coins, base, tip, accuracy, exact, favoriteBonus, breakdown }.
export function serveReward(customer, { serveMs, tipUpgradeBonus = 0, check }) {
  const recipe = customer.recipe;
  const base = recipe.price;

  // Точность: цена масштабируется по accuracy (неточная пицца стоит меньше).
  const acc = check.accuracy;
  const priced = base * (0.4 + 0.6 * acc); // 0.4..1.0 от цены

  // Бонус за 100% точность (ECONOMY.accuracyFullBonus к цене).
  const accBonus = check.exact ? base * ECONOMY.accuracyFullBonus : 0;

  // Чаевые за скорость. serveSpeed = realSeconds / parBuildSeconds.
  const par = customer.parBuildSeconds || 1;
  const realSec = serveMs / 1000;
  const speed = realSec / par;

  let tipMult;
  const fast = ECONOMY.tip.fast;
  const slow = ECONOMY.tip.slow;
  const slowAt = ECONOMY.tip.slowAt;
  if (speed <= 1.0) tipMult = fast;
  else if (speed <= slowAt) tipMult = fast + (slow - fast) * ((speed - 1.0) / (slowAt - 1.0));
  else tipMult = slow;
  tipMult += tipUpgradeBonus;

  const tip = priced * tipMult;

  // Любимый заказ постоянного клиента — добавка к цене (плоская).
  const favoriteBonus = customer.customer && customer.customer.favorite === recipe.id
    ? customer.customer.bonus
    : 0;

  let coins = Math.round(priced + accBonus + tip + favoriteBonus);

  // Модификаторы типа гостя. exactOnly (шпион конкурентов) важнее множителя: неточная
  // пицца не оплачивается вовсе. Точность в отчёте при этом сохраняем — она нужна аналитике
  // и всплывающей оценке, иначе игрок не поймёт, ЗА ЧТО не заплатили.
  const patron = customer.patron;
  if (patron) {
    if (patron.exactOnly && !check.exact) coins = 0;
    else if (typeof patron.payMult === 'number') coins = Math.round(coins * patron.payMult);
  }

  customer.served = true;
  return {
    coins, base: Math.round(priced), tip: Math.round(tip),
    accuracy: acc, exact: check.exact, favoriteBonus, speed,
    patron: patron ? patron.id : null
  };
}
