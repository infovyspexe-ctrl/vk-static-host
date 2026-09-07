// СТАТУСЫ (наговоры) — общие правила для игрока и врагов.
//
// Держим отдельным модулем, потому что три вещи обязаны быть в ОДНОМ месте, иначе
// разъезжаются: (1) как статус влияет на урон, (2) когда он тикает, (3) когда убывает.
// В классических делибилдерах именно порядок применения множителей — источник тихих
// расхождений: сила складывается ДО множителей, слабость режет исходящий урон, уязвимость
// увеличивает входящий, и каждый шаг округляется вниз ОТДЕЛЬНО.
//
// Модуль ничего не знает про Phaser, карты и конкретную игру: на вход — простые объекты
// сущностей вида { hp, maxHp, block, statuses: {} }.

// Статусы, которые убывают на 1 в конце хода носителя. Остальные (сила, ловкость,
// шипы, оберег) держатся весь бой.
//
// `frail` числился «убывающим» в комментарии и в GLOSSARY.md, но реально не входил
// в этот список — нашлось при обзоре карточных описаний 2026-08-21: получившая труху
// от врага сущность держала -25% к броне до конца боя вместо одного хода. Добавлен.
export const DECAYING = ['vuln', 'weak', 'regen', 'poison', 'stun', 'frail'];

// Уязвимость и Слабость получают ОДИН прощённый тик сразу после применения: игрок
// применил дебафф картой за 1-2 Пыла — он обязан пережить не только остаток этого
// хода, но и весь следующий, иначе множитель ×1.5/×0.75 почти невозможно заметить за
// один ход (запрос живого игрока 22.08: «плюс один ход, тогда коэффициент очевиден»).
// Яд/Заживление/Оглушение/Труха этой поблажки НЕ получают: она реально увеличила бы их
// суммарный урон/лечение/простой цели, а не только окно применения — баланс (`sim.mjs`)
// тестировался без нею для этих четырёх, добавлять её без пересчёта нечестно.
const GRACE_ON_APPLY = ['vuln', 'weak'];

// Статусы, которые нельзя опускать ниже нуля при снятии.
export function getStatus(entity, key) {
  return (entity.statuses && entity.statuses[key]) || 0;
}

export function addStatus(entity, key, value) {
  if (!entity.statuses) entity.statuses = {};
  const cur = entity.statuses[key] || 0;
  const next = cur + value;
  if (next === 0) delete entity.statuses[key];
  else entity.statuses[key] = next;
  if (value > 0 && GRACE_ON_APPLY.includes(key)) {
    if (!entity.freshStatus) entity.freshStatus = {};
    entity.freshStatus[key] = true;
  }
  return entity.statuses[key] || 0;
}

// ИСХОДЯЩИЙ урон одного удара. Порядок шагов повторяет жанровый канон:
//   base + сила  →  ×0.75 при слабости  →  ×1.5 при уязвимости цели,
// с округлением вниз на каждом шаге. Порядок не переставлять: при перестановке
// «слабость × уязвимость» на числах вроде 9 расхождение достигает 2 единиц урона,
// а игрок считает урон в уме и замечает такое сразу.
export function outgoingDamage(base, attacker, target) {
  let v = base + getStatus(attacker, 'str');
  if (v < 0) v = 0;
  if (getStatus(attacker, 'weak') > 0) v = Math.floor(v * 0.75);
  if (getStatus(target, 'vuln') > 0) v = Math.floor(v * 1.5);
  return v;
}

// Сколько брони даёт карта с учётом ловкости и «трухи» (frail — режет броню).
export function outgoingBlock(base, entity) {
  let v = base + getStatus(entity, 'dex');
  if (v < 0) v = 0;
  if (getStatus(entity, 'frail') > 0) v = Math.floor(v * 0.75);
  return v;
}

// Нанести урон сущности через броню. Возвращает { hpLoss, blocked }.
// Броня съедается первой; остаток уходит в здоровье.
export function dealDamage(target, amount) {
  if (amount <= 0) return { hpLoss: 0, blocked: 0 };
  const blocked = Math.min(target.block || 0, amount);
  target.block = (target.block || 0) - blocked;
  const hpLoss = amount - blocked;
  if (hpLoss > 0) target.hp = Math.max(0, target.hp - hpLoss);
  return { hpLoss, blocked };
}

// Конец хода носителя: яд и регенерация срабатывают, убывающие статусы теряют единицу.
// Возвращает список произошедшего — сцена рисует по нему всплывающие числа.
export function tickEndOfTurn(entity) {
  const events = [];
  const poison = getStatus(entity, 'poison');
  if (poison > 0) {
    // Яд бьёт МИМО брони — иначе колода на яде не работает против врагов, которые
    // блокируют каждый ход, и целая ветка прокачки становится мёртвой.
    entity.hp = Math.max(0, entity.hp - poison);
    events.push({ type: 'poison', value: poison });
  }
  const regen = getStatus(entity, 'regen');
  if (regen > 0 && entity.hp > 0) {
    const healed = Math.min(regen, entity.maxHp - entity.hp);
    entity.hp += healed;
    if (healed > 0) events.push({ type: 'regen', value: healed });
  }
  for (const key of DECAYING) {
    if (getStatus(entity, key) <= 0) continue;
    if (entity.freshStatus && entity.freshStatus[key]) {
      // Прощённый тик потрачен — со следующего конца хода тает как обычно.
      entity.freshStatus[key] = false;
      continue;
    }
    addStatus(entity, key, -1);
  }
  return events;
}

// Начало хода: броня сгорает, если нет «оберега» (barrier).
export function clearBlock(entity) {
  if (getStatus(entity, 'barrier') > 0) return;
  entity.block = 0;
}
