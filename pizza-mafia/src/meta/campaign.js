// КАМПАНИЯ: чистая логика прохождения по районам. Ни Phaser, ни i18n, ни отрисовки —
// только состояние и переходы. Всё, что решает «где игрок и что ему открыто», живёт здесь,
// чтобы сцена не хранила это второй раз и не расходилась с сейвом.
//
// Состояние (оно же кусок сейва, см. meta/progress.js):
//   district   — индекс текущего района в DISTRICTS (0-based)
//   shift      — индекс смены ВНУТРИ района (0-based)
//   tribute    — сколько монет уже отложено на дань текущего района
//   done       — кампания пройдена, включён бесконечный режим
//   endlessDay — номер ночной смены после финала (0, пока кампания идёт)
//
// Правило дани (решение владельца 2026-08-09): провал НЕ сжигает накопленное. Последняя
// смена района просто переигрывается — «Дон даёт отсрочку». Это осознанно мягкий вариант:
// жёсткий фейл даёт больше давления, но выбивает казуального игрока, а он основная
// аудитория площадки. Ужесточение — это одно число, менять здесь.
import { DISTRICTS, TOTAL_SHIFTS } from '../data/districts.js';

export function defaultCampaign() {
  return { district: 0, shift: 0, tribute: 0, done: false, endlessDay: 0 };
}

// Текущий район или null, если кампания уже пройдена.
export function currentDistrict(c) {
  if (c.done) return null;
  return DISTRICTS[c.district] || null;
}

// Последняя смена района — заказ Дона: условие «ни одного ушедшего гостя».
export function isBossShift(c) {
  const d = currentDistrict(c);
  if (!d) return false;
  return c.shift === d.shifts - 1;
}

// Прогресс дани: сколько собрано, сколько нужно, доля и достигнута ли цель.
export function tributeState(c) {
  const d = currentDistrict(c);
  const need = d ? d.tribute : 0;
  const have = c.tribute;
  return {
    have,
    need,
    frac: need > 0 ? Math.min(1, have / need) : 1,
    met: need > 0 ? have >= need : true
  };
}

// Что открыто: накопительно по всем районам до текущего включительно.
// После финала — всё, иначе в бесконечном режиме контент внезапно сузился бы.
function unlockedUpTo(c, field) {
  const last = c.done ? DISTRICTS.length - 1 : c.district;
  const out = [];
  for (let i = 0; i <= last && i < DISTRICTS.length; i++) out.push(...DISTRICTS[i][field]);
  return out;
}

export function unlockedRecipeIds(c) { return unlockedUpTo(c, 'recipes'); }
export function unlockedCustomerIds(c) { return unlockedUpTo(c, 'customers'); }

// Сквозной номер смены (1-based) — для формул терпения и для подписи в интерфейсе.
// В бесконечном режиме продолжает расти, чтобы сложность не откатывалась после финала.
export function shiftNumber(c) {
  if (c.done) return TOTAL_SHIFTS + Math.max(0, c.endlessDay);
  let n = 0;
  for (let i = 0; i < c.district && i < DISTRICTS.length; i++) n += DISTRICTS[i].shifts;
  return n + c.shift + 1;
}

// Данные для подписи «смена 3 из 6, всего 12 из 23».
export function shiftLabel(c) {
  const d = currentDistrict(c);
  return {
    district: c.district,
    shift: c.shift + 1,
    of: d ? d.shifts : 0,
    number: shiftNumber(c),
    total: TOTAL_SHIFTS,
    endless: !!c.done,
    endlessDay: c.endlessDay
  };
}

// Завершить смену. МУТИРУЕТ c и возвращает исход.
//   coinsEarned — выручка смены, целиком идёт в дань текущего района
//   lost        — сколько гостей ушло (важно только на босс-смене)
// Исходы: nextShift | nextDistrict | retryShift | campaignDone
export function completeShift(c, { coinsEarned = 0, lost = 0 } = {}) {
  // Бесконечный режим: провалов нет, смены просто идут дальше.
  if (c.done) {
    c.endlessDay += 1;
    return { outcome: 'nextShift', district: c.district, shift: c.shift };
  }

  c.tribute += Math.max(0, coinsEarned);

  if (!isBossShift(c)) {
    c.shift += 1;
    return { outcome: 'nextShift', district: c.district, shift: c.shift };
  }

  return resolveBossShift(c, lost);
}

// Решение босс-смены ОТДЕЛЬНО от начисления выручки.
//
// Зачем отдельно: выручку можно удвоить рекламой уже НА ЭКРАНЕ ИТОГА, то есть после того,
// как completeShift отработал. Без отдельной функции пришлось бы звать completeShift второй
// раз — и он прибавил бы выручку ещё раз. А не пересчитывать нельзя: игрок смотрит ролик,
// дань становится достаточной, но его всё равно отправляют переигрывать смену. Это читается
// как обман за просмотр рекламы.
//
// МУТИРУЕТ c. Возвращает тот же набор исходов, что и completeShift.
export function resolveBossShift(c, lost = 0) {
  const { met } = tributeState(c);
  if (!met || lost > 0) {
    return { outcome: 'retryShift', district: c.district, shift: c.shift, tributeMet: met, lost };
  }
  c.tribute = 0;
  if (c.district >= DISTRICTS.length - 1) {
    c.done = true;
    c.endlessDay = 0;
    return { outcome: 'campaignDone', district: c.district, shift: c.shift };
  }
  c.district += 1;
  c.shift = 0;
  return { outcome: 'nextDistrict', district: c.district, shift: 0 };
}

export function isCampaignDone(c) { return !!c.done; }

// ЦЕЛЬ ВЫРУЧКИ ЗА СМЕНУ: сколько надо зарабатывать в среднем, чтобы расплатиться с Доном
// к концу района. По ней считаются звёзды (meta/stars.js) и рисуется полоса цели в HUD.
//
// Отдельного числа для цели НЕТ намеренно: у игрока и так одна цель — дань, и вторая
// шкала «непонятно за что» только размывала бы её. Меняешь дань — цель смены меняется
// сама, рассинхронизироваться им нечем.
//
// После финала кампании цели нет: ночные смены оцениваются по аккуратности.
export function shiftRevenueTarget(c) {
  const d = currentDistrict(c);
  if (!d || !d.shifts) return 0;
  return Math.round(d.tribute / d.shifts);
}
