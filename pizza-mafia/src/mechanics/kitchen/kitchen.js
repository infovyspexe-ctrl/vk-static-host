// КУХНЯ: замкнутый модуль (CONVENTIONS.md, раздел 3). Логика этапов сборки пиццы как
// конечный автомат: чистые функции переходов, без Phaser. Сцена дёргает их и рисует
// то, что вернули. Про игру, тему и i18n модуль не знает.
//
// Жизненный цикл одной пиццы (для одного клиента):
//   startBuild(recipe) -> pizza{ stage:'dough', ... }
//     rollDough(pizza)        // N тапов раскатки (EACH_STAGE.dough.rolls)
//     addSauce(pizza, id)     // один соус
//     addCheese(pizza, id)    // один сыр
//     addTopping(pizza, id)   // по одному топпингу (можно несколько, без дублей засчитываются)
//     putInOven(pizza)        // начать готовку
//     tickOven(pizza, dtSec, cookSeconds)  // продвинуть готовность
//     takeOut(pizza)          // достать: done / raw / burnt — по cookProgress
//   pizzaAsServed(pizza)      // { sauce, cheese, toppings:Set } для orders.checkPizza
//
// Состояние хранится в объекте pizza, который модуль возвращает/мутирует. Сцена может
// держать несколько pizza (печь oven2), модуль не хранит их перечень.
//
// СТАДИИ ПЕЧИ по cookProgress:
//   < 1.0                     -> готовится (stage 'oven'), доставать рано = RAW
//   [1.0, 1.0 + window/cook]  -> готово (stage 'oven'), доставать = DONE
//   > 1.0 + window/cook       -> пережарено (stage 'oven'), доставать = BURNT
// cookProgress растёт в tickOven: progress += dtSec / cookSeconds.

import { STAGES, EACH_STAGE, OVEN } from '../../data/balance.js';

// Исход печи при доставании.
export const OvenResult = { RAW: 'raw', DONE: 'done', BURNT: 'burnt' };

// Начать сборку пиццы под рецепт.
export function startBuild(recipe) {
  return {
    stage: STAGES.DOUGH,
    recipe,
    doughRolls: 0,
    doughRollsNeeded: EACH_STAGE.dough.rolls,
    sauce: null,
    cheese: null,
    toppings: [],          // id нанесённых топпингов (дубли НЕ накапливаются)
    inOven: false,
    cookProgress: 0,       // 0..1+ (1 = готова, дальше окно до пережога)
    ovenResult: null,      // ставится в takeOut: 'raw'|'done'|'burnt'
    finished: false        // true после takeOut (в т.ч. raw/burnt — пицца «готова к выдаче», но брак)
  };
}

// Раскатка теста: один тап/свайп. Возвращает { done } — этап пройден, когда набрано rolls.
export function rollDough(pizza) {
  if (pizza.stage !== STAGES.DOUGH) return { done: false };
  pizza.doughRolls += 1;
  if (pizza.doughRolls >= pizza.doughRollsNeeded) {
    pizza.stage = STAGES.SAUCE;
    return { done: true };
  }
  return { done: false };
}

// Нанести соус. Любой id принимается (проверка на рецепт — в orders.checkPizza при выдаче).
export function addSauce(pizza, ingredientId) {
  if (pizza.stage !== STAGES.SAUCE) return false;
  pizza.sauce = ingredientId;
  pizza.stage = STAGES.CHEESE;
  return true;
}

// Нанести сыр. Рецепт без топпингов (margherita и т.п.) сразу проходит этап TOPPINGS
// целиком — иначе игрок видит пустой этап, на котором нечего тапать, и упирается в кнопку
// «В печь», которая всего лишь пропускает этот пустой этап и открывает СЛЕДУЮЩУЮ кнопку с
// тем же текстом «В печь» (та уже реально ставит пиццу готовиться). Две одинаково подписанные
// кнопки подряд читаются как баг — жалоба игрока 13.08 («почему-то нужно два раза жать
// одно и то же»). Раз этапу TOPPINGS всё равно нечего показать, его просто не открываем.
export function addCheese(pizza, ingredientId) {
  if (pizza.stage !== STAGES.CHEESE) return false;
  pizza.cheese = ingredientId;
  pizza.stage = pizza.recipe.toppings.length ? STAGES.TOPPINGS : STAGES.OVEN;
  return true;
}

// Нанести топпинг. Дубли не накапливаются (одно нанесение = один ингредиент).
export function addTopping(pizza, ingredientId) {
  if (pizza.stage !== STAGES.TOPPINGS) return false;
  if (!pizza.toppings.includes(ingredientId)) pizza.toppings.push(ingredientId);
  // Этап пройден, когда нанесены все топпинги рецепта. Рецепт без топпингов -> сразу дальше.
  const need = pizza.recipe.toppings;
  const got = need.every((t) => pizza.toppings.includes(t));
  if (got) pizza.stage = STAGES.OVEN;
  return true;
}

// Принудительно завершить этап топпингов (кнопка «Готово»/«В печь»), даже если игрок положил
// лишнее или недоложил. Проверка состава — на выдаче (orders.checkPizza).
export function finishToppings(pizza) {
  if (pizza.stage !== STAGES.TOPPINGS) return false;
  pizza.stage = STAGES.OVEN;
  return true;
}

// Положить в печь (начать отсчёт готовности). cookSeconds передаёт сцена (с учётом апгрейда
// ovenSpeed): так модуль не знает про апгрейды.
export function putInOven(pizza) {
  if (pizza.stage !== STAGES.OVEN || pizza.inOven) return false;
  pizza.inOven = true;
  return true;
}

// Продвинуть готовность. cookSeconds — реальное время готовки с учётом апгрейда.
export function tickOven(pizza, dtSec, cookSeconds) {
  if (!pizza.inOven || pizza.finished) return;
  pizza.cookProgress += dtSec / Math.max(0.1, cookSeconds);
}

// Где сейчас «точка готовности»: 1.0 = готово, дальше окно. Для UI полосы печи.
// windowSeconds — сколько пицца ЖДЁТ готовой, не сгорая. Приходит снаружи, потому что
// его продлевает апгрейд печи (см. GameScene.ovenWindowSeconds).
export function ovenState(pizza, cookSeconds, windowSeconds = OVEN.windowSeconds) {
  if (!pizza.inOven) return { phase: 'idle', progress: 0 };
  const p = pizza.cookProgress;
  const windowProgress = windowSeconds / Math.max(0.1, cookSeconds);
  if (p < 1.0) return { phase: 'cooking', progress: p };
  if (p <= 1.0 + windowProgress) return { phase: 'ready', progress: p };
  return { phase: 'burning', progress: p };
}

// Достать из печи. Возвращает OvenResult и ставит finished=true, ovenResult. Пицца остаётся
// «собранной» (годится для выдачи) даже при raw/burnt — но checkPizza/orders оценит брак
// ниже (см. сцену: burnt = принудительно неточно).
export function takeOut(pizza, cookSeconds, windowSeconds = OVEN.windowSeconds) {
  if (!pizza.inOven || pizza.finished) return null;
  const st = ovenState(pizza, cookSeconds, windowSeconds);
  let result;
  if (st.phase === 'ready') result = OvenResult.DONE;
  else if (st.phase === 'burning') result = OvenResult.BURNT;
  else result = OvenResult.RAW;
  pizza.ovenResult = result;
  pizza.finished = true;
  pizza.stage = STAGES.DONE;
  return result;
}

// Мгновенная готовка (реклама): сразу DONE, пропуская окно. Сцена зовёт по кнопке за рекламу.
export function instantCook(pizza) {
  if (!pizza.inOven || pizza.finished) return false;
  pizza.cookProgress = 1.0;
  pizza.ovenResult = OvenResult.DONE;
  pizza.finished = true;
  pizza.stage = STAGES.DONE;
  return true;
}

// Представление собранной пиццы для orders.checkPizza.
export function pizzaAsServed(pizza) {
  return { sauce: pizza.sauce, cheese: pizza.cheese, toppings: new Set(pizza.toppings) };
}

// Снимок «что уже на пицце» — для отрисовки рабочей зоны (сцена читает на каждом тике).
export function pizzaSnapshot(pizza) {
  return {
    stage: pizza.stage,
    doughRolls: pizza.doughRolls,
    doughRollsNeeded: pizza.doughRollsNeeded,
    sauce: pizza.sauce,
    cheese: pizza.cheese,
    toppings: [...pizza.toppings],
    inOven: pizza.inOven,
    cookProgress: pizza.cookProgress,
    ovenResult: pizza.ovenResult,
    finished: pizza.finished
  };
}
