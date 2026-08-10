// БАЛАНС отдельно от логики (CONVENTIONS.md §4). Все числа игры — здесь.
export const BALANCE = {
  dungeon: {
    cols: 9,
    rows: 13,
    roomsMin: 5,
    roomsMax: 8,
    roomSideMin: 2,
    roomSideMax: 3,
    // врагов на этаж = base + floor(depth/step), не больше max
    enemiesBase: 3,
    enemiesPerFloors: 3, // +1 враг каждые N этажей
    enemiesMax: 8,
    chestExtraChance: 0.1 // шанс второго сундука на этаже
  },

  spirit: {
    chestMin: 8,
    chestMax: 15,
    // за убийство монстра — из monsters.js spiritDrop [min,max] для конкретного вида
    rerollCost: 5,   // цена переброса реликвии духом на алтаре
    healCost: 8,     // цена подлечиться духом на алтаре (можно нажимать несколько раз подряд)
    healPct: 0.25    // сколько % максимального HP восстанавливает одно использование
  },

  combat: {
    dmgVariance: 0.15, // ±15% случайности урона
    minDmg: 1,
    // Доля maxHp после ЛЮБОГО воскрешения (Печать Морены и «Второе дыхание» за рекламу).
    // Было 1 HP: воскрешённого добивал следующий враг в ТУ ЖЕ фазу — заряд/реклама
    // сгорали «в никуда», игрок видел обычный экран смерти (живая жалоба 05.08).
    reviveHpPct: 0.5
  },

  // Масштабирование статов монстров за пределами заданных ярусов (глубже 15 этажа
  // тир не меняется, только числа растут — бесконечный спуск без нового контента).
  scaling: {
    hpPerExtraLoop: 0.15,  // +15% hp за каждые 5 этажей сверх последнего заданного яруса
    atkPerExtraLoop: 0.08, // +8% atk за то же
    loopFloors: 5
  },

  // Итоговая награда искр за забег (округляется вниз):
  // floor*floorMult + spiritCollected/spiritDiv + bossKills*bossBonus
  runReward: {
    floorMult: 4,
    spiritDiv: 3,
    bossBonus: 15
  },

  // Ad-гейты (YANDEX-MODERATION.md: реклама — логическая пауза, не голый таймер).
  ads: {
    interstitialMinGapSec: 150, // не чаще этого интервала между межстраничными
    reviveOncePerDay: true      // «Второе дыхание» — максимум раз в сутки
  },

  // Ежедневный стрик (RETENTION.md §4): награда искр растёт со стриком, капается.
  dailyStreak: {
    baseReward: 10,
    perDayBonus: 4,
    cap: 60
  }
};
