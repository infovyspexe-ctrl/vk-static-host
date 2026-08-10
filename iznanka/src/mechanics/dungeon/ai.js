// ИИ ВРАГОВ. Простой и предсказуемый (казуальная аудитория, RETENTION.md: «ноль лишней
// сложности» на входе) — не A*, только жадное приближение по осям + спец-поведения
// по monsters.js#behavior. grid — 2D массив (0 стена/1 пол), occupied — Set "x,y" занятых
// клеток (другие враги + игрок), чтобы враги не наступали друг на друга.
import { isWalkable } from './generate.js';
import { resolveAttack } from './combat.js';

function key(x, y) { return x + ',' + y; }
function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function isAdjacent(a, b) { return dist(a, b) === 1; }

// Один шаг жадного приближения к target по клетке grid, не наступая на occupied.
// Пробует сначала ось с большей разницей, затем другую — стабильно обходит стены
// с одной стороны препятствия чаще, чем чистый Manhattan без альтернативы.
//
// Боковой обход (фикс застревания, найден симуляцией 05.08): когда враг стоит на одной
// оси с целью (dx или dy равен нулю), кандидатов было РОВНО ОДИН — прямая клетка; если
// она занята стеной или союзником, враг сдавался навсегда (29% врагов не доходили до
// неподвижного игрока за 40 ходов, конга-лайны в коридорах шириной 1). Теперь при
// осевом выравнивании добавляются оба перпендикулярных шага. avoidKey — клетка, откуда
// враг пришёл прошлым шагом: без неё боковой обход осциллирует между двумя клетками
// (шаг вбок → «прямая всё ещё ближе» → шаг назад). Возврат разрешён, только если
// больше некуда.
function stepToward(from, target, grid, occupied, avoidKey) {
  const dx = Math.sign(target.x - from.x);
  const dy = Math.sign(target.y - from.y);
  const candidates = [];
  if (Math.abs(target.x - from.x) >= Math.abs(target.y - from.y)) {
    if (dx) candidates.push({ x: from.x + dx, y: from.y });
    if (dy) candidates.push({ x: from.x, y: from.y + dy });
  } else {
    if (dy) candidates.push({ x: from.x, y: from.y + dy });
    if (dx) candidates.push({ x: from.x + dx, y: from.y });
  }
  if (!dx) candidates.push({ x: from.x + 1, y: from.y }, { x: from.x - 1, y: from.y });
  if (!dy) candidates.push({ x: from.x, y: from.y + 1 }, { x: from.x, y: from.y - 1 });
  const ok = (c) => isWalkable(grid, c.x, c.y) && !occupied.has(key(c.x, c.y));
  for (const c of candidates) if (ok(c) && key(c.x, c.y) !== avoidKey) return c;
  for (const c of candidates) if (ok(c)) return c;
  return null;
}

// Прямая линия видимости по горизонтали/вертикали (для ranged/pull) — без диагоналей,
// клетки грида должны быть проходимы (стены блокируют выстрел).
export function hasStraightLine(grid, a, b, maxRange) {
  if (a.x !== b.x && a.y !== b.y) return false;
  if (dist(a, b) > maxRange) return false;
  if (a.x === b.x) {
    const [from, to] = a.y < b.y ? [a.y, b.y] : [b.y, a.y];
    for (let y = from + 1; y < to; y++) if (!isWalkable(grid, a.x, y)) return false;
  } else {
    const [from, to] = a.x < b.x ? [a.x, b.x] : [b.x, a.x];
    for (let x = from + 1; x < to; x++) if (!isWalkable(grid, x, a.y)) return false;
  }
  return true;
}

// takeEnemyTurn(enemy, monsterDef, ctx) -> список событий { type, ... } для UI/лога.
// ctx = { grid, player, occupied (Set без самого enemy), rng, balance, turnCount, obstacles }
export function takeEnemyTurn(enemy, monsterDef, ctx) {
  const events = [];
  const { grid, player, rng, balance } = ctx;
  const occupied = ctx.occupied; // не включает самого enemy

  // slow: действует раз в два хода
  if (monsterDef.behavior === 'slow') {
    enemy._skip = !enemy._skip;
    if (enemy._skip) { events.push({ type: 'idle', id: enemy.id }); return events; }
  }

  // Корни лешего (summonRoots): раз в rootCooldown ходов, по прямой видимости, не в упор
  // (в упор он и так бьёт). До 05.08 это поведение было ЗАЯВЛЕНО в monsters.js, но в ai.js
  // не существовало вовсе — леший молча ходил как рядовой (находка полного аудита логики
  // врагов по запросу игрока). Ход тратится на каст: леший стоит на месте. Потолок тот же,
  // что у стана полуночницы — максимум 1 пропущенный ход, укоренённого повторно не корним.
  if (monsterDef.behavior === 'summonRoots') {
    enemy._rootCd = (enemy._rootCd || 0) - 1;
    if (enemy._rootCd <= 0 && !isAdjacent(enemy, player) && !(player.stunnedTurns > 0) &&
        hasStraightLine(grid, enemy, player, monsterDef.rootRange || 4)) {
      enemy._rootCd = monsterDef.rootCooldown || 4;
      player.stunnedTurns = Math.min(1, (player.stunnedTurns || 0) + 1);
      events.push({ type: 'root', id: enemy.id, targetId: 'player' });
      return events;
    }
  }

  const moves = monsterDef.behavior === 'fast' ? 2 : 1;
  for (let m = 0; m < moves; m++) {
    if (isAdjacent(enemy, player)) break;

    if (monsterDef.behavior === 'ranged' || monsterDef.behavior === 'pull') {
      if (hasStraightLine(grid, enemy, player, monsterDef.range || 3)) break; // остаётся на месте и стреляет
    }

    let target = { x: enemy.x, y: enemy.y };
    if (monsterDef.behavior === 'erratic' && rng.chance(0.5)) {
      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      const d = rng.pick(dirs);
      const c = { x: enemy.x + d.x, y: enemy.y + d.y };
      if (isWalkable(grid, c.x, c.y) && !occupied.has(key(c.x, c.y))) target = c;
    } else {
      const step = stepToward(enemy, player, grid, occupied, enemy._prevKey);
      if (step) target = step;
    }

    if (target.x !== enemy.x || target.y !== enemy.y) {
      enemy._prevKey = key(enemy.x, enemy.y);
      occupied.delete(key(enemy.x, enemy.y));
      enemy.x = target.x; enemy.y = target.y;
      occupied.add(key(enemy.x, enemy.y));
      events.push({ type: 'move', id: enemy.id, x: enemy.x, y: enemy.y });
    } else break;
  }

  // Действие после движения
  if (isAdjacent(enemy, player)) {
    const res = resolveAttack(enemy, player, rng, balance);
    events.push({ type: 'attack', id: enemy.id, ...res });
  } else if ((monsterDef.behavior === 'ranged' || monsterDef.behavior === 'pull') &&
             hasStraightLine(grid, enemy, player, monsterDef.range || 3)) {
    if (monsterDef.behavior === 'pull') {
      // Тянет игрока на 1 клетку к себе по прямой, если клетка свободна и проходима.
      const dx = Math.sign(enemy.x - player.x);
      const dy = Math.sign(enemy.y - player.y);
      const c = { x: player.x + dx, y: player.y + dy };
      if (isWalkable(grid, c.x, c.y) && !occupied.has(key(c.x, c.y))) {
        occupied.delete(key(player.x, player.y));
        player.x = c.x; player.y = c.y;
        occupied.add(key(player.x, player.y));
        events.push({ type: 'pull', id: enemy.id, x: player.x, y: player.y });
      }
      const res = resolveAttack(enemy, player, rng, balance, { dmgMult: 0.6 });
      events.push({ type: 'attack', id: enemy.id, ...res });
    } else {
      const res = resolveAttack(enemy, player, rng, balance);
      events.push({ type: 'attack', id: enemy.id, ...res });
      // Потолок 1: если несколько дальнобойных врагов проком стана попадают в ОДНУ фазу
      // (несколько таких в пачке), игрок не должен терять несколько ходов подряд без единого
      // своего действия — только следующий ход пропускается, не N ходов сразу.
      if (!res.missed && monsterDef.stunChance && rng.chance(monsterDef.stunChance)) {
        player.stunnedTurns = Math.min(1, (player.stunnedTurns || 0) + 1);
        events.push({ type: 'stun', targetId: 'player' });
      }
    }
  } else {
    events.push({ type: 'idle', id: enemy.id });
  }

  return events;
}

// Спец-поведения боссов, вызываются run.js ОТДЕЛЬНО от takeEnemyTurn (после обычного хода).
export function bossSpecial(enemy, monsterDef, ctx) {
  const events = [];
  const { rng, balance, turnCount } = ctx;

  if (monsterDef.behavior === 'bossSteam' && turnCount % 3 === 0) {
    if (dist(enemy, ctx.player) <= 1) {
      const res = resolveAttack(enemy, ctx.player, rng, balance, { dmgMult: 0.7 });
      events.push({ type: 'bossAbility', id: enemy.id, ability: 'steam', ...res });
    }
  }

  if (monsterDef.behavior === 'bossSummon' && turnCount % 5 === 0 && ctx.spawnAdjacent) {
    const spawned = ctx.spawnAdjacent(enemy, 'upyr');
    if (spawned) events.push({ type: 'bossAbility', id: enemy.id, ability: 'summon', spawnedId: spawned.id });
  }

  if (monsterDef.behavior === 'bossRegen') {
    if (!enemy._hitThisTurn) {
      const before = enemy.hp;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.round(enemy.maxHp * 0.1));
      if (enemy.hp > before) events.push({ type: 'bossAbility', id: enemy.id, ability: 'regen', amount: enemy.hp - before });
    }
    enemy._hitThisTurn = false;
  }

  return events;
}
