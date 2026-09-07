// РЕЕСТР ЭФФЕКТОВ. Карта, ход врага, оберег и событие описываются в `data/` ЧИСТЫМИ
// ДАННЫМИ — списком операций вида { op: 'damage', value: 6 }. Здесь лежат сами операции.
//
// Зачем так, а не функции прямо в data/: правило конвенций «данные отдельно от логики».
// Практический выигрыш — не философский: таблицу карт можно проверить тестом на опечатки
// (каждый `op` обязан существовать здесь), пересчитать баланс скриптом и показать в
// интерфейсе не выдумывая второе описание карты рядом с кодом.
import { addStatus, getStatus, outgoingDamage, outgoingBlock, dealDamage } from './statuses.js';

// Кому адресован эффект. По умолчанию — цели, выбранной игроком.
function resolveTargets(ctx, to) {
  const s = ctx.state;
  switch (to) {
    case 'self': return [ctx.source];
    case 'allEnemies': return s.enemies.filter((e) => e.hp > 0);
    case 'player': return [s.player];
    case 'random': {
      const alive = s.enemies.filter((e) => e.hp > 0);
      return alive.length ? [alive[ctx.rng.int(alive.length)]] : [];
    }
    default: return ctx.target ? [ctx.target] : [];
  }
}

// Один удар по одной цели с полным учётом статусов, шипов и убийства.
function strike(ctx, entity, base) {
  const dmg = outgoingDamage(base, ctx.source, entity);
  const res = dealDamage(entity, dmg);
  // vulnHit/weakHit — читаются ДО удара специально: игрок видит на карте «Урон 6», а
  // получает то 9, то 4, без единого намёка почему. Сцена рисует по этим флагам значок
  // прямо на всплывающем числе (тот же ▽/↓, что и над персонажем), чтобы момент, когда
  // множитель сработал, было видно, а не приходилось верить на слово тексту карты.
  ctx.log({
    type: 'damage', target: entity, value: dmg, hpLoss: res.hpLoss, blocked: res.blocked,
    vulnHit: getStatus(entity, 'vuln') > 0, weakHit: getStatus(ctx.source, 'weak') > 0,
  });
  // Шипы отвечают, только если урон был контактным (атака), и бьют мимо брони атакующего.
  const thorns = getStatus(entity, 'thorns');
  if (thorns > 0 && ctx.source !== entity) {
    ctx.source.hp = Math.max(0, ctx.source.hp - thorns);
    ctx.log({ type: 'thorns', target: ctx.source, value: thorns });
  }
  if (entity.hp <= 0) ctx.log({ type: 'kill', target: entity });
  return res;
}

export const EFFECT_OPS = {
  // Урон цели. times — число ударов (каждый считается отдельно: сила и уязвимость
  // применяются к КАЖДОМУ удару, поэтому 3×4 сильнее одного удара на 12 при силе).
  damage(ctx, p) {
    const times = p.times || 1;
    for (const t of resolveTargets(ctx, p.to)) {
      for (let i = 0; i < times && t.hp > 0; i++) strike(ctx, t, p.value);
    }
  },

  // Урон, который считается от состояния носителя: брони, силы, размера руки.
  // Нужен «финишерам» — иначе поздняя колода упирается в потолок плоских чисел.
  damageScaling(ctx, p) {
    const s = ctx.state;
    let base = p.value || 0;
    if (p.per === 'block') base += Math.floor((ctx.source.block || 0) * (p.mul || 1));
    if (p.per === 'hand') base += (s.hand.length) * (p.mul || 1);
    if (p.per === 'strength') base += getStatus(ctx.source, 'str') * (p.mul || 1);
    if (p.per === 'poison') {
      const t = resolveTargets(ctx, p.to)[0];
      base += t ? getStatus(t, 'poison') * (p.mul || 1) : 0;
    }
    for (const t of resolveTargets(ctx, p.to)) strike(ctx, t, base);
  },

  // Броня себе.
  block(ctx, p) {
    const v = outgoingBlock(p.value, ctx.source);
    ctx.source.block = (ctx.source.block || 0) + v;
    ctx.log({ type: 'block', target: ctx.source, value: v });
  },

  // Наложить наговор. Отрицательное значение снимает.
  status(ctx, p) {
    for (const t of resolveTargets(ctx, p.to)) {
      addStatus(t, p.status, p.value);
      ctx.log({ type: 'status', target: t, status: p.status, value: p.value });
    }
  },

  // Добор карт.
  draw(ctx, p) { ctx.drawCards(p.value); },

  // Энергия сверх обычной.
  energy(ctx, p) {
    ctx.state.player.energy += p.value;
    ctx.log({ type: 'energy', value: p.value });
  },

  heal(ctx, p) {
    for (const t of resolveTargets(ctx, p.to || 'self')) {
      const healed = Math.min(p.value, t.maxHp - t.hp);
      t.hp += healed;
      if (healed > 0) ctx.log({ type: 'heal', target: t, value: healed });
    }
  },

  // Плата здоровьем — цена сильных карт. Идёт МИМО брони: это не удар, а надрыв.
  loseHp(ctx, p) {
    const t = resolveTargets(ctx, p.to || 'self')[0];
    if (!t) return;
    t.hp = Math.max(0, t.hp - p.value);
    ctx.log({ type: 'loseHp', target: t, value: p.value });
  },

  // Положить карту (обычно порчу) в сброс/колоду/руку.
  addCard(ctx, p) { ctx.addCard(p.card, p.to || 'discard', p.count || 1); },

  // Сбросить N случайных карт руки — цена «жадных» карт.
  discardRandom(ctx, p) { ctx.discardRandom(p.value || 1); },

  // Выжечь всю руку (карты уходят из боя насовсем).
  exhaustHand(ctx) { ctx.exhaustHand(); },
};

// Проиграть список операций. Пустой список молча ничего не делает.
export function applyEffects(ctx, effects) {
  if (!effects) return;
  for (const e of effects) {
    const op = EFFECT_OPS[e.op];
    if (!op) {
      console.warn('[deckrun] неизвестная операция эффекта:', e.op);
      continue;
    }
    op(ctx, e);
  }
}
