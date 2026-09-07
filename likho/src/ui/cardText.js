// ОПИСАНИЕ КАРТЫ СОБИРАЕТСЯ ИЗ ЕЁ ЖЕ ЭФФЕКТОВ, а не пишется руками вторым текстом.
//
// Ради чего: в делибилдере описание карты — это и есть её механика. Стоит написать
// текст отдельно, и он расходится с числами при первой же правке баланса, причём молча:
// игрок читает «Урон 9», получает 6 и считает игру сломанной. Здесь текст ВЫВОДИТСЯ,
// поэтому расходиться нечему — правка числа в data/cards.js меняет и подпись.
//
// Переводится это по-прежнему через i18n: каждая операция даёт ключ + подстановки.
import { i18n } from '../i18n/strings.js';

const STATUS_KEY = {
  vuln: 'st_vuln', weak: 'st_weak', frail: 'st_frail', poison: 'st_poison',
  str: 'st_str', dex: 'st_dex', thorns: 'st_thorns', regen: 'st_regen',
  barrier: 'st_barrier', guard: 'st_guard', venom: 'st_venom',
  energyUp: 'st_energyUp', extraDraw: 'st_extraDraw', stun: 'st_stun',
};

export function statusName(key) {
  return i18n.t(STATUS_KEY[key] || key);
}

// Одна операция — одна фраза.
//
// plain=true — БЕЗ вклеенной расшифровки статуса «(броня не сгорает)»: это версия для
// ЛИЦА карты, где текст должен быть коротким и крупным. Расшифровка ушла под значок «?»
// (см. cardKeywords/keywordDesc и ui/CardDetail.js). plain=false — прежний полный текст
// с расшифровкой в скобках, он показывается ВВЕРХУ всплывашки «?».
function phrase(e, plain) {
  switch (e.op) {
    case 'damage': {
      if (e.to === 'allEnemies') {
        return e.times > 1
          ? i18n.t('fx_damage_all_times', { v: e.value, t: e.times })
          : i18n.t('fx_damage_all', { v: e.value });
      }
      return e.times > 1
        ? i18n.t('fx_damage_times', { v: e.value, t: e.times })
        : i18n.t('fx_damage', { v: e.value });
    }
    case 'damageScaling': {
      const per = i18n.t('fx_per_' + e.per, { m: e.mul });
      return i18n.t('fx_damage_scaling', { v: e.value, per });
    }
    case 'block': return i18n.t('fx_block', { v: e.value });
    case 'status': {
      const name = statusName(e.status);
      const who = e.to === 'self' ? 'self' : (e.to === 'allEnemies' ? 'all' : 'target');
      if (e.value < 0) return i18n.t('fx_status_remove_' + who, { n: name, v: -e.value });
      if (plain) return i18n.t('fx_status_' + who + '_plain', { n: name, v: e.value });
      const gloss = i18n.t('st_' + e.status + '_gloss');
      return i18n.t('fx_status_' + who, { n: name, v: e.value, g: gloss });
    }
    case 'draw': return i18n.t('fx_draw', { v: e.value });
    case 'energy': return i18n.t('fx_energy', { v: e.value });
    case 'heal': return i18n.t('fx_heal', { v: e.value });
    case 'loseHp': return i18n.t('fx_loseHp', { v: e.value });
    case 'addCard': return i18n.t('fx_addCard', { n: i18n.t('card_' + e.card), v: e.count || 1 });
    case 'discardRandom': return i18n.t('fx_discard', { v: e.value });
    case 'exhaustHand': return i18n.t('fx_exhaustHand');
    default: return '';
  }
}

function assemble(def, plain) {
  if (def.unplayable) return i18n.t('fx_unplayable');
  const parts = (def.effects || []).map((e) => phrase(e, plain)).filter(Boolean);
  if (def.exhaust) parts.push(i18n.t('fx_exhaust'));
  if (def.retain) parts.push(i18n.t('fx_retain'));
  return parts.join(' ');
}

// ПОЛНОЕ описание карты (с расшифровкой статусов в скобках). Показывается ВВЕРХУ
// всплывашки «?». В остальном не изменилось — оно же уходит в старые места, где нужен
// самодостаточный текст.
export function cardDescription(def) {
  return assemble(def, false);
}

// СУТЬ карты для ЛИЦА: те же эффекты, но без вклеенной расшифровки — коротко и крупно.
// У простой карты («Урон 6») суть и полное описание совпадают: расшифровывать нечего,
// значок «?» на такой карте не появится (см. cardKeywords).
export function cardEssence(def) {
  return assemble(def, true);
}

// Термины, встречающиеся на карте, в порядке появления, без повторов. По этому списку
// решается: рисовать ли «?» (пусто — не рисовать) и что перечислить во всплывашке.
// Статус — это ключ вроде 'barrier'/'guard'/'vuln'; свойства карты — 'exhaust'/'retain'/
// 'unplayable'/'scaling'.
export function cardKeywords(def) {
  const seen = new Set();
  const out = [];
  const add = (k) => { if (k && !seen.has(k)) { seen.add(k); out.push(k); } };
  if (def.unplayable) add('unplayable');
  (def.effects || []).forEach((e) => {
    if (e.op === 'status' && e.value > 0) add(e.status);
    if (e.op === 'damageScaling') add('scaling');
  });
  if (def.exhaust) add('exhaust');
  if (def.retain) add('retain');
  return out;
}

// Имя термина для всплывашки. Статус берёт своё имя (Оберег/Дозор/…), свойство карты —
// свой ключ kw_<...>_name.
export function keywordName(kw) {
  return STATUS_KEY[kw] ? i18n.t(STATUS_KEY[kw]) : i18n.t('kw_' + kw + '_name');
}

// Определение термина для всплывашки (вариант A — одна чёткая фраза). Статус берёт готовый
// st_<...>_desc, свойство карты — kw_<...>_desc.
export function keywordDesc(kw) {
  return STATUS_KEY[kw] ? i18n.t('st_' + kw + '_desc') : i18n.t('kw_' + kw + '_desc');
}

// Описание оберега. Боевой собирается так же из эффектов, пассивный берёт свой текст:
// «золото ×1.2» из данных не выводится фразой, которая читалась бы по-человечески.
export function relicDescription(id, def) {
  if (def.passive) return i18n.t('relic_' + id + '_t');
  const trigger = i18n.t('trig_' + def.on + (def.everyTurn ? '_every' : ''), { n: def.everyTurn });
  const body = (def.effects || []).map(phrase).filter(Boolean).join(' ');
  return trigger + ' ' + body;
}
