// ПРОГРЕСС: форма сохраняемого состояния игры и чистые операции над ним.
// Сцена хранит Progress в памяти во время смены, а в ключевых точках (конец смены, покупка)
// пишет через Save.update(). Структура фиксирована — миграции в platform/index.js.
//
// Поля:
//   campaign       — состояние кампании: { district, shift, tribute, done, endlessDay }.
//                    Вся логика переходов — в meta/campaign.js, здесь только хранение.
//   coins          — валюта (выручка + чаевые).
//   upgrades       — { id: level } по веткам апгрейдов.
//   bestScore      — лучший суммарный счёт за смену (для лидерборда).
//   bestDay        — самый дальний достигнутый номер смены.
//   recipesSeen    — { recipeId: 1 } какие рецепты уже открывались (для аналитики).
//   muted          — звук выкл (дублирует Audio.muted, восстанавливается при загрузке).
//   tutorialDone   — обучение пройдено или пропущено; повторно не показывается.
//   hintsOn        — показывать ли подсказки «куда тыкать» (подсветка нужной плитки и
//                    строка с названием ингредиента). ВЫБОР ИГРОКА, не настройка сложности
//                    ради галочки: без подсказок оплата выше на ECONOMY.noHintsBonus.
//                    Облачко с заказом над гостем и полоса этапов НЕ гаснут никогда —
//                    это сам заказ, без него игра становится угадайкой.
//   hintsAsked     — предложение сыграть без подсказок уже показывали (после первого
//                    района). Спрашивать второй раз — навязчивость.
//   achievements   — { id: 1 } выданные достижения (data/achievements.js).
//   daily          — ежедневный конверт: { streak, lastBonusDate, maxSeenDate }, см. meta/daily.js.
//   stats          — плоские счётчики за всё время, по ним выдаются достижения.
//                    Плоские намеренно: достижение описывается парой «имя счётчика + порог»
//                    и остаётся чистыми данными, без функций в data/.
//
// ПОЛЕ day БОЛЬШЕ НЕ ХРАНИТСЯ. У игроков первой версии оно в сейве есть — mergeProgress
// разложит его по районам, ничего не потеряв (см. migrateDayToCampaign ниже).
import { ECONOMY } from '../data/balance.js';
import { DISTRICTS, TOTAL_SHIFTS } from '../data/districts.js';
import { defaultCampaign } from './campaign.js';

export function defaultProgress() {
  return {
    campaign: defaultCampaign(),
    coins: ECONOMY.startCoins,
    upgrades: {},
    bestScore: 0,
    bestDay: 1,
    recipesSeen: {},
    muted: false,
    tutorialDone: false,
    hintsOn: true,        // подсветка нужной плитки и строка «Тапни по пицце: …»
    hintsAsked: false,    // предложение играть без подсказок уже показывали
    achievements: {},
    daily: { streak: 0, lastBonusDate: null, maxSeenDate: null },
    stats: {
      servedTotal: 0,       // всего выдано пицц
      burntTotal: 0,        // всего сожжено
      bestCombo: 0,         // самая длинная серия точных заказов
      cleanShifts: 0,       // смен без единого ушедшего гостя
      cleanNoAdShifts: 0,   // смен на три звезды без единого rewarded
      fastCapo: 0,          // капо, обслуженных быстрее 15 с
      districtsDone: 0,     // пройдено районов
      oven2Bought: 0,       // куплена вторая духовка
      donOrdersOk: 0,       // заказов Дона выполнено точно
      pineappleTroll: 0,    // ананас положен тому, кто его не просил
      nightShifts: 0        // ночных смен после финала кампании
    }
  };
}

// Старый сейв: сквозной номер дня → район и смена внутри него.
// day считался с 1. Прошёл дальше конца кампании — значит, весь контент уже видел:
// отправляем в бесконечный режим, а не в начало (иначе отняли бы прогресс).
function migrateDayToCampaign(day) {
  const c = defaultCampaign();
  const idx = Math.max(0, Math.floor(day) - 1);
  if (idx >= TOTAL_SHIFTS) {
    c.done = true;
    c.endlessDay = idx - TOTAL_SHIFTS + 1;
    return c;
  }
  let acc = 0;
  for (let i = 0; i < DISTRICTS.length; i++) {
    if (idx < acc + DISTRICTS[i].shifts) {
      c.district = i;
      c.shift = idx - acc;
      return c;
    }
    acc += DISTRICTS[i].shifts;
  }
  return c;
}

// Сливаем сохранение с дефолтом: новые поля появляются у старых сейвов без поломки.
export function mergeProgress(saved) {
  const def = defaultProgress();
  if (!saved || typeof saved !== 'object') return def;

  let campaign;
  if (saved.campaign && typeof saved.campaign === 'object') {
    campaign = { ...def.campaign, ...saved.campaign };
  } else if (typeof saved.day === 'number' && Number.isFinite(saved.day)) {
    campaign = migrateDayToCampaign(saved.day);
  } else {
    campaign = def.campaign;
  }

  const out = {
    ...def,
    ...saved,
    campaign,
    upgrades: { ...def.upgrades, ...(saved.upgrades || {}) },
    recipesSeen: { ...(saved.recipesSeen || {}) },
    achievements: { ...(saved.achievements || {}) },
    daily: { ...def.daily, ...(saved.daily || {}) },
    // Счётчики сливаем с дефолтом ПОЛЕ ЗА ПОЛЕМ: у сейва старой версии части счётчиков нет,
    // и без слияния они пришли бы undefined — сравнение с порогом молча стало бы false.
    stats: { ...def.stats, ...(saved.stats || {}) }
  };
  delete out.day;   // поля больше нет в структуре, чтобы старое значение не жило второй жизнью
  return out;
}

// Уровень апгрейда (0 если не куплен).
export function upgradeLevel(progress, id) {
  return progress.upgrades[id] || 0;
}

// Можно ли купить следующий уровень ветки (есть монеты, не достигнут потолок).
export function canBuyUpgrade(progress, upgradeDef, costFn) {
  const lvl = upgradeLevel(progress, upgradeDef.id);
  if (lvl >= upgradeDef.maxLevel) return { ok: false, reason: 'maxed' };
  const cost = costFn(upgradeDef.id, lvl);
  if (progress.coins < cost) return { ok: false, reason: 'poor', cost };
  return { ok: true, cost, nextLevel: lvl + 1 };
}

// Купить апгрейд (мутирует progress, возвращает { cost, level } или null).
export function buyUpgrade(progress, upgradeDef, costFn) {
  const check = canBuyUpgrade(progress, upgradeDef, costFn);
  if (!check.ok) return null;
  progress.coins -= check.cost;
  progress.upgrades[upgradeDef.id] = check.nextLevel;
  return { cost: check.cost, level: check.nextLevel };
}
