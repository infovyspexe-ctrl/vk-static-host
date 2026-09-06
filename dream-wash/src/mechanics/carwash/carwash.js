// МОЙКА: замкнутый модуль (CONVENTIONS.md, раздел 3). Не знает про Phaser, i18n, тему
// и про то, что игра называется «Мойка Мечты» — только числа и чистые функции. Конфиг
// (тиры, веса, базовые характеристики, ветки прокачки) приходит снаружи из data/balance.js.
// Сцена дергает tap()/tick()/spawnCar() и рисует то, что они вернули.
//
// rng — функция () => [0,1), инжектируется вызывающим кодом (по умолчанию Math.random),
// чтобы модуль оставался тестируемым детерминированно (см. reigns.js/lanerunner.js —
// тот же приём в проекте).

export function createCarWash(config) {
  const { tiers, tierWeights, playerBase, upgrades, vip = {} } = config;

  // ---- Эффекты прокачки -----------------------------------------------------
  function effect(id, level) {
    const u = upgrades[id];
    return u.effectPer * level; // аддитивный эффект, база уровня 0 отдельно в dirtPerTap/etc.
  }

  function dirtPerTap(spongeLevel) {
    return playerBase.dirtPerTap + effect('sponge', spongeLevel);
  }

  function autoDirtPerSec(crewLevel) {
    // Уровень ветки crew = число нанятых мойщиков (effectPer=1 в data/balance.js: один
    // уровень — один мойщик). crew=0 -> бригады нет, машину чистит только игрок тапами.
    return effect('crew', crewLevel) * playerBase.autoDirtPerCrew;
  }

  function turboMult(turboLevel) {
    return 1 + effect('turbo', turboLevel);
  }

  function nextCarDelay(speedLevel) {
    const d = playerBase.nextCarDelay - effect('speed', speedLevel);
    return Math.max(playerBase.minNextCarDelay, d);
  }

  // Цена следующего уровня ветки (level = сколько уже куплено, т.е. цена уровня level+1).
  function upgradeCost(id, level) {
    const u = upgrades[id];
    return Math.round(u.costBase * Math.pow(u.costMult, level));
  }

  // ---- Тиры машин -------------------------------------------------------------
  // Сколько тиров открыто по общему числу вымытых машин (не сбрасывается престижем).
  function unlockedTierCount(washedTotal) {
    let n = 0;
    for (const t of tiers) { if (washedTotal >= t.unlockAt) n++; else break; }
    return Math.max(1, n);
  }

  // Взвешенный выбор индекса тира среди открытых. Веса нормализуются на лету —
  // добавление/удаление тира в data/balance.js не ломает пропорции.
  function pickTierIndex(washedTotal, rng) {
    const n = unlockedTierCount(washedTotal);
    const weights = tierWeights.slice(0, n);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  function spawnCar(washedTotal, rng) {
    const tierIndex = pickTierIndex(washedTotal, rng);
    const tier = tiers[tierIndex];
    // Косметический вариант окраски внутри тира — не влияет на баланс, только на то, какая
    // картинка загружена (см. TIERS.variants в data/balance.js). Тиры без вариантов ('')
    // всегда дают один и тот же спрайт. variantIndex отдаём отдельно от суффикса — сцена
    // использует индекс для отметки в коллекции (state.collection[tierId][variantIndex]).
    const variants = tier.variants || [''];
    const variantIndex = Math.floor(rng() * variants.length);
    return { tierIndex, variantIndex, variant: variants[variantIndex], dirt: tier.dirt, dirtMax: tier.dirt };
  }

  // ---- Особые заказы (VIP) -------------------------------------------------
  // Независимый от тира бросок: становится ли СПАВНЯЩАЯСЯ машина VIP-заказом (усиление
  // 2026-07-31, спека dream-wash-vip-orders-design.md). Чистые функции — сцена решает,
  // когда звать и что делать с результатом (см. GameScene.spawnCar/finishCar).
  function shouldSpawnVip(streakSinceLastVip, rng) {
    if (streakSinceLastVip >= vip.pityStreak) return true; // защита от засухи
    return rng() < vip.chance;
  }

  // Лимит времени на полную домывку — от ТЕКУЩЕЙ силы ТАПОВ игрока (dirtPerTap), не
  // фиксированное число: масштабируется с прокачкой sponge. Бригада (crewLevel) больше
  // НЕ участвует в расчёте — applyAuto() теперь вообще пропускает VIP-машины, добавлять
  // её вклад сюда было бы формулой для гипотетической помощи, которой нет.
  function vipTimeLimit(dirtMax, spongeLevel) {
    const rate = dirtPerTap(spongeLevel) * vip.assumedTapsPerSec;
    return Math.max(vip.minSeconds, (dirtMax / rate) * vip.timeFactor);
  }

  // ---- Мойка --------------------------------------------------------------
  // Возвращают { removed, finished }. Мутируют car.dirt (car — простой объект, не класс:
  // сцена владеет им и решает, когда пересоздавать).
  function applyTap(car, spongeLevel) {
    if (!car || car.dirt <= 0) return { removed: 0, finished: false };
    const removed = Math.min(car.dirt, dirtPerTap(spongeLevel));
    car.dirt -= removed;
    return { removed, finished: car.dirt <= 0 };
  }

  // car.isVip: бригада НЕ моет особый заказ ни при каком уровне crew (усиление баланса
  // 2026-08-01 — раньше сильная бригада домывала VIP сама быстрее, чем игрок успевал
  // заметить машину, и весь смысл «особого заказа, который надо тапать самому» исчезал
  // на поздней игре). Гарантия участия игрока СТРУКТУРНАЯ — бинарный пропуск, а не гонка
  // коэффициентов между силой бригады и дедлайном (та гонка снова разъехалась бы на
  // следующем витке прокачки).
  function applyAuto(car, crewLevel, dt) {
    if (!car || car.dirt <= 0 || crewLevel <= 0 || car.isVip) return { removed: 0, finished: false };
    const removed = Math.min(car.dirt, autoDirtPerSec(crewLevel) * dt);
    car.dirt -= removed;
    return { removed, finished: car.dirt <= 0 };
  }

  // Награда за домытую машину: базовая цена тира * пенная пушка * репутация * буст рекламы.
  // Math.round ОБЯЗАТЕЛЕН: множители (турбо, репутация) дробные, без округления монеты
  // копятся в float и в UI вылезает мусор вида «52.799999999999997» (поймано на живой игре).
  function carValue(tierIndex, turboLevel, reputation, boostActive) {
    const tier = tiers[tierIndex];
    const repMult = 1 + reputation * config.reputationIncomePerStar;
    const boost = boostActive ? config.boostMult : 1;
    return Math.round(tier.value * turboMult(turboLevel) * repMult * boost);
  }

  // Средняя цена монет за единицу грязи по ОТКРЫТЫМ тирам, взвешенная теми же весами,
  // что и появление машин в очереди. Нужна для оффлайн-дохода: бригада моет без сцены,
  // конкретных машин в очереди офлайн нет, поэтому доход считается через среднюю ставку,
  // а не через симуляцию каждой машины.
  function estimateCoinsPerDirt(washedTotal, turboLevel, reputation) {
    const n = unlockedTierCount(washedTotal);
    const weights = tierWeights.slice(0, n);
    const total = weights.reduce((a, b) => a + b, 0);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += (weights[i] / total) * (tiers[i].value / tiers[i].dirt);
    const repMult = 1 + reputation * config.reputationIncomePerStar;
    return sum * turboMult(turboLevel) * repMult;
  }

  return {
    dirtPerTap, autoDirtPerSec, turboMult, nextCarDelay, upgradeCost,
    unlockedTierCount, pickTierIndex, spawnCar, applyTap, applyAuto, carValue,
    estimateCoinsPerDirt, shouldSpawnVip, vipTimeLimit
  };
}
