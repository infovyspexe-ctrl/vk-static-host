// ЯДРО ЗАБЕГА. Единственная точка входа для сцены — она только рисует состояние,
// которое возвращают функции отсюда, и вызывает действия игрока. Ничего Phaser-специфичного.
import { createRng } from './rng.js';
import { generateFloor, isWalkable } from './generate.js';
import { resolveAttack, heal, isAlive } from './combat.js';
import { takeEnemyTurn, bossSpecial, hasStraightLine } from './ai.js';
import { HEROES } from '../../data/heroes.js';
import { MONSTERS, BOSSES, isBossFloor, bossForFloor } from '../../data/monsters.js';
import { RELICS, RELICS_BY_ID } from '../../data/relics.js';
import { BALANCE } from '../../data/balance.js';

function monsterDefOf(id) { return MONSTERS[id] || BOSSES[id]; }

function scaledStats(def, depth, isBoss) {
  const s = BALANCE.scaling;
  const pastFloor = isBoss ? 15 : 10;
  const extraLoops = Math.max(0, Math.floor((depth - pastFloor) / s.loopFloors));
  const hp = Math.round(def.hp * (1 + s.hpPerExtraLoop * extraLoops));
  const atk = Math.round(def.atk * (1 + s.atkPerExtraLoop * extraLoops));
  return { hp, maxHp: hp, atk, def: def.def };
}

// enemyAtkMult с дефолтом 1: spawnAdjacentTo (суммон Бабы-Яги) вызывал функцию БЕЗ этого
// аргумента — atk становился Math.round(x * undefined) = NaN, удар суммона делал hp игрока
// NaN и убивал с одного удара при любом запасе здоровья (блокер, найден красной командой
// 05.08 интеграционным прогоном до этажа 10). Дефолт — вторая линия обороны; сам вызов
// тоже починен и передаёт реальный множитель ослабления.
function buildEnemyEntity(spawn, depth, idCounter, enemyAtkMult = 1) {
  const def = monsterDefOf(spawn.monsterId);
  const stats = scaledStats(def, depth, !!spawn.isBoss);
  return {
    id: 'e' + idCounter,
    monsterId: spawn.monsterId,
    isBoss: !!spawn.isBoss,
    x: spawn.x, y: spawn.y,
    ...stats,
    atk: Math.round(stats.atk * enemyAtkMult),
    _skipTurns: 0,
    _hitThisTurn: false
  };
}

function key(x, y) { return x + ',' + y; }

function buildOccupied(state, excludeId) {
  const set = new Set();
  set.add(key(state.player.x, state.player.y));
  for (const e of state.floorState.enemies) {
    if (e.id !== excludeId) set.add(key(e.x, e.y));
  }
  return set;
}

function enemyAt(state, x, y) {
  return state.floorState.enemies.find((e) => e.x === x && e.y === y) || null;
}

// metaMods: { hpMult, atkMult, skillMult, fortuneMult } — множители из деревенского дерева.
export function createRun(heroId, seed, metaMods, ownedRelics = []) {
  const heroDef = HEROES[heroId];
  const player = {
    heroId,
    x: 0, y: 0,
    maxHp: Math.round(heroDef.baseHp * metaMods.hpMult),
    hp: Math.round(heroDef.baseHp * metaMods.hpMult),
    atk: Math.round(heroDef.baseAtk * metaMods.atkMult),
    def: heroDef.baseDef,
    evadeChance: 0,
    lifestealOnKill: 0,
    rootOnHitChance: 0,
    enemyAtkPct: 0,
    moveExtra: 0,
    movesLeft: 1,
    skillCdMax: heroDef.skills.map((s) => s.cd),
    skillCd: heroDef.skills.map(() => 0),
    meleeDmgBonus: 0,
    wisdomMult: metaMods.skillMult,
    fortuneMult: metaMods.fortuneMult,
    freeRerollCharges: 0,
    reviveCharges: 0,
    stunnedTurns: 0,
    blockNext: false
  };

  const state = {
    seed,
    combatRng: createRng(seed ^ 0x9e3779b9),
    heroId,
    player,
    floor: 1,
    turnCount: 0,
    status: 'playing', // 'playing' | 'shrine' | 'dead'
    relics: [...ownedRelics],
    hasExtraChest: false,
    spirit: 0,
    lifetimeCounters: { relicsPicked: 0, spiritCollected: 0, bossesKilled: 0, enemiesKilled: 0 },
    noHitThisFloor: true,
    shrineOptions: [],
    log: [],
    _enemyIdCounter: 0
  };

  loadFloor(state, 1);
  return state;
}

function floorSeed(baseSeed, depth) {
  return (baseSeed ^ Math.imul(depth + 1, 0x9e3779b9)) >>> 0;
}

function loadFloor(state, depth) {
  const rng = createRng(floorSeed(state.seed, depth));
  const fs = generateFloor(depth, rng, { extraChest: !!state.hasExtraChest });
  state.floor = depth;
  state.floorState = fs;
  state.player.x = fs.playerStart.x;
  state.player.y = fs.playerStart.y;
  state.player.movesLeft = 1 + state.player.moveExtra;
  state.noHitThisFloor = true;
  const enemyAtkMult = 1 - (state.player.enemyAtkPct || 0);
  state.floorState.enemies = fs.enemies.map((spawn) => buildEnemyEntity(spawn, depth, state._enemyIdCounter++, enemyAtkMult));
}

function pushLog(state, events) {
  state.log.push(...events);
  if (state.log.length > 60) state.log.splice(0, state.log.length - 60);
  return events;
}

function onPlayerHit(state, dmg) {
  if (dmg > 0) state.noHitThisFloor = false;
}

// Применяет НЕ-уникальный или уникальный эффект реликвии к текущему игроку/забегу.
export function applyRelicEffect(state, relicId) {
  const relic = RELICS_BY_ID[relicId];
  if (!relic) return;
  const p = state.player;
  switch (relic.effect) {
    case 'meleeDmgPct': p.meleeDmgBonus += relic.value; break;
    case 'maxHpFlat': p.maxHp += relic.value; p.hp += relic.value; break;
    case 'moveRange': p.moveExtra += relic.value; break;
    case 'cdReduction':
      p.skillCdMax = p.skillCdMax.map((cd) => Math.max(1, cd - relic.value));
      break;
    case 'enemyMissChance': p.evadeChance = Math.min(0.8, p.evadeChance + relic.value); break;
    case 'lifestealOnKill': p.lifestealOnKill += relic.value; break;
    case 'extraChest': state.hasExtraChest = true; break;
    case 'rootOnHitChance': p.rootOnHitChance = Math.min(0.8, p.rootOnHitChance + relic.value); break;
    case 'freeReroll': p.freeRerollCharges += relic.value; break;
    case 'enemySkipTurnChance': p.enemySkipTurnChance = Math.min(0.8, (p.enemySkipTurnChance || 0) + relic.value); break;
    case 'reviveOnce': p.reviveCharges += relic.value; break;
    case 'healOnFloorClearPct': p.healOnFloorClearPct = Math.min(1, (p.healOnFloorClearPct || 0) + relic.value); break;
    case 'defFlat': p.def += relic.value; break;
    case 'skillDmgPct': p.wisdomMult = (p.wisdomMult || 1) + relic.value; break;
    case 'fortunePct': p.fortuneMult = (p.fortuneMult || 1) + relic.value; break;
    case 'enemyAtkPct': p.enemyAtkPct = Math.min(0.4, (p.enemyAtkPct || 0) + relic.value); break;
  }
  state.relics.push(relicId);
  state.lifetimeCounters.relicsPicked++;
}

function attackMult(state, isMelee) {
  return isMelee ? (1 + state.player.meleeDmgBonus) : 1;
}

function collectSpirit(state, base) {
  const amount = Math.round(base * state.player.fortuneMult);
  state.spirit += amount;
  state.lifetimeCounters.spiritCollected += amount;
  return amount;
}

function handleEnemyDeath(state, enemy, events) {
  state.floorState.enemies = state.floorState.enemies.filter((e) => e.id !== enemy.id);
  const def = monsterDefOf(enemy.monsterId);
  const gained = collectSpirit(state, state.combatRng.int(def.spiritDrop[0], def.spiritDrop[1]));
  events.push({ type: 'enemyDied', id: enemy.id, monsterId: enemy.monsterId, spirit: gained, x: enemy.x, y: enemy.y });
  state.lifetimeCounters.enemiesKilled++;
  if (state.player.lifestealOnKill) heal(state.player, state.player.lifestealOnKill);
  if (enemy.isBoss) {
    state.lifetimeCounters.bossesKilled++;
    events.push({ type: 'bossKilled', monsterId: enemy.monsterId, floor: state.floor });
  }
  // Этаж зачищен, а игрок УЖЕ стоит на лестнице (дошёл рывком или убил последнего врага
  // скиллом, стоя на ней) — выход срабатывает сразу, не заставляя сходить и возвращаться.
  if (!state.floorState.enemies.length && state.status === 'playing' &&
      state.player.x === state.floorState.stairs.x && state.player.y === state.floorState.stairs.y) {
    enterFloorClear(state, events);
  }
}

function checkPlayerDeath(state, events) {
  if (isAlive(state.player)) return false;
  if (state.player.reviveCharges > 0) {
    state.player.reviveCharges--;
    // 50% maxHp, не 1 HP: с одним хитом воскрешение обнулялось следующим же ударом
    // (та же фаза врагов) — заряд редкой реликвии сгорал «в никуда», игрок видел
    // обычный экран смерти и справедливо считал реликвию сломанной (жалоба 05.08).
    // Фазу врагов после воскрешения прерывает runEnemyPhase (см. там).
    state.player.hp = Math.max(1, Math.round(state.player.maxHp * BALANCE.combat.reviveHpPct));
    events.push({ type: 'revived' });
    return false;
  }
  state.status = 'dead';
  events.push({ type: 'died', floor: state.floor });
  return true;
}

function spawnAdjacentTo(state, source, monsterId) {
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  for (const d of dirs) {
    const x = source.x + d.x, y = source.y + d.y;
    if (isWalkable(state.floorState.grid, x, y) && !enemyAt(state, x, y) &&
        !(state.player.x === x && state.player.y === y)) {
      const entity = buildEnemyEntity({ monsterId, x, y }, state.floor, state._enemyIdCounter++,
        1 - (state.player.enemyAtkPct || 0));
      state.floorState.enemies.push(entity);
      return entity;
    }
  }
  return null;
}

function runEnemyPhase(state) {
  // Убийство последнего врага может завершить этаж прямо посреди действия игрока
  // (handleEnemyDeath -> enterFloorClear, когда игрок уже стоит на лестнице) — фаза
  // врагов после этого не идёт: статус уже 'shrine', врагов нет, а декременты
  // кулдаунов/turnCount за несуществующий ход только путали бы детерминизм.
  if (state.status !== 'playing') return [];
  const events = [];
  const snapshot = [...state.floorState.enemies];
  for (const enemy of snapshot) {
    if (!state.floorState.enemies.includes(enemy)) continue; // умер раньше в этой же фазе (спавн боссом не бьёт)
    if (state.player.enemySkipTurnChance && state.combatRng.chance(state.player.enemySkipTurnChance)) {
      events.push({ type: 'sleep', id: enemy.id });
      continue;
    }
    if (enemy._skipTurns > 0) {
      enemy._skipTurns--;
      events.push({ type: 'rooted', id: enemy.id });
      continue;
    }
    const occupied = buildOccupied(state, enemy.id);
    const def = monsterDefOf(enemy.monsterId);
    const before = state.player.hp;
    const evs = takeEnemyTurn(enemy, def, {
      grid: state.floorState.grid, player: state.player, rng: state.combatRng, balance: BALANCE, occupied
    });
    events.push(...evs);
    for (const ev of evs) {
      if (ev.type === 'attack' && ev.rooted) enemy._skipTurns = Math.max(enemy._skipTurns, 1);
      // Русалка затянула игрока на клетку сундука — подбор срабатывал только на обычный
      // шаг (movePlayer), затянутый игрок стоял НА сундуке, не получая его (аудит 05.08).
      if (ev.type === 'pull') {
        const { x, y } = state.player;
        if (state.floorState.chests.some((c) => c.x === x && c.y === y)) {
          state.floorState.chests = state.floorState.chests.filter((c) => !(c.x === x && c.y === y));
          const cfg = BALANCE.spirit;
          const gained = collectSpirit(state, state.combatRng.int(cfg.chestMin, cfg.chestMax));
          events.push({ type: 'chestOpened', spirit: gained });
        }
      }
    }
    onPlayerHit(state, before - state.player.hp);
    if (checkPlayerDeath(state, events)) return pushLog(state, events);
    // Воскрешение (Печать Морены) прерывает фазу: оставшиеся враги в этот ход НЕ ходят,
    // игроку гарантировано хотя бы одно действие после подъёма. Без этого следующий враг
    // той же фазы добивал воскрешённого до того, как игрок вообще видел, что ожил.
    if (events.length && events[events.length - 1].type === 'revived') break;

    if (enemy.isBoss) {
      const beforeBoss = state.player.hp;
      const bossEvs = bossSpecial(enemy, def, {
        rng: state.combatRng, balance: BALANCE, turnCount: state.turnCount, player: state.player,
        spawnAdjacent: (src, mId) => spawnAdjacentTo(state, src, mId)
      });
      events.push(...bossEvs);
      onPlayerHit(state, beforeBoss - state.player.hp);
      if (checkPlayerDeath(state, events)) return pushLog(state, events);
      if (events.length && events[events.length - 1].type === 'revived') break;
    }
  }
  state.player.skillCd = state.player.skillCd.map((cd) => Math.max(0, cd - 1));
  state.player.movesLeft = 1 + state.player.moveExtra;
  state.turnCount++;
  return pushLog(state, events);
}

function consumeStunnedTurn(state) {
  const events = [{ type: 'stunnedSkip' }];
  state.player.stunnedTurns--;
  events.push(...runEnemyPhase(state));
  return events;
}

// Потолки эффектов, дожатых до предела: ещё одна копия такой реликвии не даст вообще
// НИКАКОГО эффекта — предлагать её на алтаре бессмысленно (жалоба игрока: «зачем мне
// показывать реликвию, если толку от неё уже не будет»). cdReduction проверяется отдельно —
// у неё нет единого числового потолка, потолок у каждого скилла свой (Math.max(1, ...)).
const RELIC_CAPS = {
  enemyMissChance: { field: 'evadeChance', cap: 0.8 },
  rootOnHitChance: { field: 'rootOnHitChance', cap: 0.8 },
  enemySkipTurnChance: { field: 'enemySkipTurnChance', cap: 0.8 },
  healOnFloorClearPct: { field: 'healOnFloorClearPct', cap: 1 },
  enemyAtkPct: { field: 'enemyAtkPct', cap: 0.4 }
};

function isRelicMaxed(state, relic) {
  const p = state.player;
  if (relic.effect === 'cdReduction') return p.skillCdMax.every((cd) => cd <= 1);
  const capped = RELIC_CAPS[relic.effect];
  if (!capped) return false;
  return (p[capped.field] || 0) >= capped.cap;
}

// Пул алтаря: без уже набранных уникальных и без "мёртвых" пиков (эффект на потолке).
// Если после этого фильтра осталось меньше 3 вариантов — потолки не учитываем целиком,
// чтобы не оставить игрока с пустым/неполным драфтом на позднем этапе забега.
function relicPool(state) {
  const notOwnedUnique = RELICS.filter((r) => !(r.unique && state.relics.includes(r.id)));
  const notMaxed = notOwnedUnique.filter((r) => !isRelicMaxed(state, r));
  return notMaxed.length >= 3 ? notMaxed : notOwnedUnique;
}

function beginShrine(state) {
  state.status = 'shrine';
  const shuffled = state.combatRng.shuffle(relicPool(state));
  state.shrineOptions = shuffled.slice(0, 3).map((r) => r.id);
}

function enterFloorClear(state, events) {
  if (state.player.healOnFloorClearPct) heal(state.player, Math.round(state.player.maxHp * state.player.healOnFloorClearPct));
  events.push({ type: 'floorCleared', floor: state.floor, noHit: state.noHitThisFloor });
  beginShrine(state);
}

// movePlayer(state, dx, dy) -> events[]. dx/dy — один из {1,0}/{-1,0}/{0,1}/{0,-1}.
export function movePlayer(state, dx, dy) {
  if (state.status !== 'playing') return [];
  if (state.player.stunnedTurns > 0) return consumeStunnedTurn(state);

  const tx = state.player.x + dx, ty = state.player.y + dy;
  const target = enemyAt(state, tx, ty);
  const events = [];

  if (target) {
    const res = resolveAttack(state.player, target, state.combatRng, BALANCE, { dmgMult: attackMult(state, true) });
    target._hitThisTurn = target._hitThisTurn || res.dmg > 0;
    events.push({ type: 'playerAttack', targetId: target.id, x: target.x, y: target.y, ...res });
    if (res.killed) handleEnemyDeath(state, target, events);
    return pushLog(state, [...events, ...runEnemyPhase(state)]);
  }

  if (!isWalkable(state.floorState.grid, tx, ty)) return [];

  state.player.x = tx; state.player.y = ty;
  events.push({ type: 'move', x: tx, y: ty });

  if (state.floorState.chests.some((c) => c.x === tx && c.y === ty)) {
    state.floorState.chests = state.floorState.chests.filter((c) => !(c.x === tx && c.y === ty));
    const cfg = BALANCE.spirit;
    const gained = collectSpirit(state, state.combatRng.int(cfg.chestMin, cfg.chestMax));
    events.push({ type: 'chestOpened', spirit: gained });
  }

  if (tx === state.floorState.stairs.x && ty === state.floorState.stairs.y) {
    // Лестница заперта, пока на этаже есть враги (решение владельца 05.08: этаж нельзя
    // проскочить без боя — раньше шаг на лестницу «зачищал» этаж при любом числе живых
    // врагов, включая боссов: симуляция показала 100% проскок боссов и ~30% этажей вообще
    // без контакта). ВАЖНО: клетка остаётся ПРОХОДИМОЙ — запертая-как-стена лестница
    // делала этаж непроходимым, когда враг (Банник в отладке) вставал сразу за ней и
    // единственный путь к нему шёл через её клетку. Стоя на лестнице в момент смерти
    // последнего врага, игрок выходит сразу — handleEnemyDeath сам зовёт enterFloorClear.
    if (state.floorState.enemies.length > 0) {
      events.push({ type: 'stairsLocked', remaining: state.floorState.enemies.length });
    } else {
      enterFloorClear(state, events);
      return pushLog(state, events);
    }
  }

  state.player.movesLeft--;
  if (state.player.movesLeft > 0) {
    events.push({ type: 'turnContinues' });
    return pushLog(state, events);
  }
  return pushLog(state, [...events, ...runEnemyPhase(state)]);
}

// waitPlayer(state) — осознанно пропустить ход (например, переждать таймер способности
// босса или дать откатиться умению). Тратит полный ход, как атака.
export function waitPlayer(state) {
  if (state.status !== 'playing') return [];
  if (state.player.stunnedTurns > 0) return consumeStunnedTurn(state);
  return pushLog(state, [{ type: 'wait' }, ...runEnemyPhase(state)]);
}

// useSkill(state, skillIndex, opts) — opts.dir нужен только для skill.kind === 'dash'.
export function useSkill(state, skillIndex, opts = {}) {
  if (state.status !== 'playing') return [];
  if (state.player.stunnedTurns > 0) return consumeStunnedTurn(state);

  const heroDef = HEROES[state.player.heroId];
  const skill = heroDef.skills[skillIndex];
  if (!skill || state.player.skillCd[skillIndex] > 0) return [];

  const events = [];
  let used = true;

  if (skill.kind === 'melee') {
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const t = dirs.map((d) => enemyAt(state, state.player.x + d.x, state.player.y + d.y)).find(Boolean);
    // Молчаливый провал (жалоба игрока: «удар вообще не нажимался, хотя был доступен») — цель
    // должна стоять СТРОГО ортогонально (движение и без того только 4-направленное, но враги и
    // игрок сходятся независимо друг от друга и могут оказаться по диагонали). Кулдаун не
    // тратится (как и раньше), но теперь возвращается реальное событие вместо пустого массива,
    // чтобы сцена могла показать «нет цели» вместо тишины.
    if (!t) return [{ type: 'skillNoTarget', skillId: skill.id }];
    // Урон навыка ближнего боя учитывает и силу (meleeDmgBonus через attackMult, как обычный
    // удар), и мудрость (wisdomMult) — иначе у героя без дальних/лечащих скиллов (Богатырь:
    // только рукопашный навык + блок) реликвии на wisdomMult (`oberegVolkhva`) не имели бы
    // вообще никакого эффекта — находка полного аудита реликвий по прямому вопросу игрока.
    const res = resolveAttack(state.player, t, state.combatRng, BALANCE,
      { dmgMult: skill.dmgMult * attackMult(state, true) * state.player.wisdomMult });
    t._hitThisTurn = t._hitThisTurn || res.dmg > 0;
    events.push({ type: 'skillUsed', skillId: skill.id, targetId: t.id, x: t.x, y: t.y, ...res });
    if (res.killed) handleEnemyDeath(state, t, events);
  } else if (skill.kind === 'ranged') {
    const inLine = state.floorState.enemies.filter((e) => hasStraightLine(state.floorState.grid, state.player, e, skill.range));
    if (!inLine.length) return [{ type: 'skillNoTarget', skillId: skill.id }];
    const t = inLine.sort((a, b) => (Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y)) -
                                     (Math.abs(b.x - state.player.x) + Math.abs(b.y - state.player.y)))[0];
    const res = resolveAttack(state.player, t, state.combatRng, BALANCE,
      { dmgMult: skill.dmgMult * state.player.wisdomMult });
    t._hitThisTurn = t._hitThisTurn || res.dmg > 0;
    events.push({ type: 'skillUsed', skillId: skill.id, targetId: t.id, x: t.x, y: t.y, ...res });
    if (res.killed) handleEnemyDeath(state, t, events);
  } else if (skill.kind === 'heal') {
    const healed = heal(state.player, Math.round(skill.healFlat * state.player.wisdomMult));
    events.push({ type: 'skillUsed', skillId: skill.id, healed });
  } else if (skill.kind === 'block') {
    state.player.blockNext = true;
    events.push({ type: 'skillUsed', skillId: skill.id });
  } else if (skill.kind === 'dash') {
    const dir = opts.dir;
    if (!dir || (dir.x === 0 && dir.y === 0)) { used = false; }
    else {
      let steps = 0;
      let x = state.player.x, y = state.player.y;
      const grazed = [];
      for (let i = 0; i < skill.range; i++) {
        const nx = x + dir.x, ny = y + dir.y;
        if (!isWalkable(state.floorState.grid, nx, ny)) break;
        const blocker = enemyAt(state, nx, ny);
        if (blocker) {
          // Враг задевается уроном, но НЕ занимается игроком — иначе игрок и враг делят одну
          // клетку (жалоба игрока: «кувырок может привести на клетку, где сидит враг»), что
          // ломает адjacency-проверки боя (isAdjacent считает манхэттенское расстояние, у общей
          // клетки оно 0, а не 1 — враг перестаёт быть "рядом" для собственной атаки). Рывок
          // останавливается на последней свободной клетке перед врагом, как об стену.
          grazed.push(blocker);
          break;
        }
        x = nx; y = ny; steps++;
      }
      state.player.x = x; state.player.y = y;
      // Рывок задевает врагов на пути малым уроном (skill.dmgMult, у Скомороха 0.5×) — иначе
      // единственный источник урона у героя без атакующих скиллов — рядовой удар (находка
      // полного аудита реликвий/героев по прямому вопросу игрока про баланс Скомороха).
      // Явная проверка skill.dmgMult (не `|| 0` внутри resolveAttack) — combat.js держит
      // минимум 1 урона на удар (minDmg), так что вызов с dmgMult=0 всё равно нанёс бы 1 урон;
      // если у будущего dash-скилла графы урона нет вовсе, resolveAttack просто не вызывается.
      const hits = skill.dmgMult ? grazed.map((enemy) => {
        const res = resolveAttack(state.player, enemy, state.combatRng, BALANCE, { dmgMult: skill.dmgMult });
        // Отметка «в этот ход били» нужна bossRegen (Кощей): без неё задетый рывком босс
        // регенерировал в тот же ход (находка полного аудита логики врагов 05.08).
        enemy._hitThisTurn = enemy._hitThisTurn || res.dmg > 0;
        if (res.killed) handleEnemyDeath(state, enemy, events);
        return { id: enemy.id, ...res };
      }) : [];
      events.push({ type: 'skillUsed', skillId: skill.id, steps, x, y, hits });
    }
  } else if (skill.kind === 'stunAdjacent') {
    // Скомороху (рывок + смех) нечего усиливать уроном/лечением — ни один его навык их не
    // даёт, поэтому реликвии на wisdomMult (`oberegVolkhva`) были для него пустышкой (находка
    // полного аудита реликвий). Даём мудрости другую точку приложения именно для этого героя:
    // длительность оглушения от «Смеха» растёт вместе с wisdomMult (округление вверх/вниз к
    // целым ходам, не ниже базового значения — лишняя копия реликвии никогда не портит эффект).
    const turns = Math.max(skill.turns, Math.round(skill.turns * state.player.wisdomMult));
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    let hit = 0;
    for (const d of dirs) {
      const e = enemyAt(state, state.player.x + d.x, state.player.y + d.y);
      if (e) { e._skipTurns = Math.max(e._skipTurns, turns); hit++; }
    }
    events.push({ type: 'skillUsed', skillId: skill.id, hitCount: hit, turns });
  }

  if (!used) return [];
  state.player.skillCd[skillIndex] = state.player.skillCdMax[skillIndex];

  // Проверяем, не приземлились ли на сундук/лестницу после dash.
  if (skill.kind === 'dash') {
    const { x, y } = state.player;
    if (state.floorState.chests.some((c) => c.x === x && c.y === y)) {
      state.floorState.chests = state.floorState.chests.filter((c) => !(c.x === x && c.y === y));
      const cfg = BALANCE.spirit;
      const gained = collectSpirit(state, state.combatRng.int(cfg.chestMin, cfg.chestMax));
      events.push({ type: 'chestOpened', spirit: gained });
    }
    if (x === state.floorState.stairs.x && y === state.floorState.stairs.y) {
      // Заперто при живых врагах (то же правило, что в movePlayer). Рывок последним ударом
      // мог зачистить этаж прямо на лестнице — тогда handleEnemyDeath уже вызвал
      // enterFloorClear и статус сменился, второй вызов не нужен (двойной floorCleared
      // перебросил бы варианты алтаря).
      if (state.floorState.enemies.length > 0) {
        events.push({ type: 'stairsLocked', remaining: state.floorState.enemies.length });
      } else if (state.status === 'playing') {
        enterFloorClear(state, events);
        return pushLog(state, events);
      } else {
        return pushLog(state, events);
      }
    }
  }

  return pushLog(state, [...events, ...runEnemyPhase(state)]);
}

// chooseRelic(state, relicId) -> следующий этаж стартует сразу после выбора.
export function chooseRelic(state, relicId) {
  if (state.status !== 'shrine') return [];
  applyRelicEffect(state, relicId);
  state.status = 'playing';
  state.shrineOptions = [];
  loadFloor(state, state.floor + 1);
  return pushLog(state, [{ type: 'floorStarted', floor: state.floor }]);
}

// rerollShrine(state, { free }) -> новые 3 варианта на алтаре. free=true — заряд/реклама,
// иначе списывает дух по BALANCE.spirit.rerollCost.
export function rerollShrine(state, { free = false } = {}) {
  if (state.status !== 'shrine') return { ok: false };
  const cost = BALANCE.spirit.rerollCost;
  if (!free) {
    if (state.player.freeRerollCharges > 0) { state.player.freeRerollCharges--; }
    else if (state.spirit >= cost) { state.spirit -= cost; }
    else return { ok: false };
  }
  const shuffled = state.combatRng.shuffle(relicPool(state));
  state.shrineOptions = shuffled.slice(0, 3).map((r) => r.id);
  return { ok: true };
}

// healAtShrine(state) -> { ok, healed } — второе применение духа на алтаре (первое —
// rerollShrine): подлечиться за BALANCE.spirit.healCost, восстанавливает healPct от
// максимума HP. Можно жать подряд, пока хватает духа и здоровье не полное — до этого дух
// тратился только на переброс (редко нужен больше раза), и у игрока копился «мёртвый» остаток
// без применения (вопрос игрока «а мы можем его как-то использовать?»).
export function healAtShrine(state) {
  if (state.status !== 'shrine') return { ok: false };
  const p = state.player;
  if (p.hp >= p.maxHp) return { ok: false };
  const cost = BALANCE.spirit.healCost;
  if (state.spirit < cost) return { ok: false };
  state.spirit -= cost;
  const healed = heal(p, Math.round(p.maxHp * BALANCE.spirit.healPct));
  return { ok: true, healed };
}

// Итоговая награда искр за забег (вызывается сценой при смерти/выходе), не мутирует state.
export function computeRunReward(state) {
  const cfg = BALANCE.runReward;
  return Math.floor(
    state.floor * cfg.floorMult +
    state.lifetimeCounters.spiritCollected / cfg.spiritDiv +
    state.lifetimeCounters.bossesKilled * cfg.bossBonus
  );
}
