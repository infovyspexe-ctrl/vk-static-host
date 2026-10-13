// Цикл боя. Полностью детерминирован: одинаковый расклад даёт одинаковый исход.
// Это требование, а не приятный бонус — на нём держатся повторы, ежедневное
// испытание с общим сидом и бот-симулятор баланса.

import { unitsOf, pickTarget, pickTargets, worldX } from './targeting.js';
import { resolveShot, applyShotPlan } from './damage.js';
import { collapse } from '../gridbuild/support.js';
import { cellKey } from '../gridbuild/base.js';

const DEFAULT_TIME_LIMIT = 90;
const DEFAULT_DT = 0.1;

function forecastBase(base) {
  return { ...base, cells: new Map([...base.cells].map(([key, cell]) => [key, { ...cell }])) };
}

export function createBattle({ playerBase, enemyBase, layout, playerUnitTable, enemyUnitTable, blockTable, protectedKeys = [], destroyKeys = [], reinforcements = [], waveDelay = 0, timeLimit = DEFAULT_TIME_LIMIT, maxLosses = Infinity }) {
  if(maxLosses!==Infinity&&(!Number.isInteger(maxLosses)||maxLosses<0))throw new RangeError('Invalid casualty limit');
  if(destroyKeys.some(key=>!['unit','block'].includes(enemyBase.cells.get(key)?.kind)))throw new Error('Strike target must be an existing enemy cell');
  if(destroyKeys.length&&reinforcements.length)throw new Error('Strike and wave goals cannot be combined');
  return {
    playerBase, enemyBase, layout, playerUnitTable, enemyUnitTable, blockTable, timeLimit,
    forecastPlayerBase:forecastBase(playerBase),forecastEnemyBase:forecastBase(enemyBase),
    elapsed: 0, protectedKeys, destroyKeys, maxLosses,
    initialPlayerKeys:unitsOf(playerBase).filter(c=>!playerUnitTable[c.typeId]?.passive).map(c=>cellKey(c.x,c.y)),
    reinforcements:[...reinforcements],waveDelay,waveRemaining:null,waveIndex:0,waveCount:1+reinforcements.length,
    // Перезарядка на каждого стрелка. Ключ: "сторона:x,y".
    cooldowns: new Map(),
    pendingShots: [],
    nextShotId: 1,
    events: [],
  };
}

function sideBases(battle, side) {
  return side === 'player'
    ? { own: battle.playerBase, foe: battle.enemyBase }
    : { own: battle.enemyBase, foe: battle.playerBase };
}

function sideForecastBases(battle, side) {
  return side === 'player'
    ? { own: battle.forecastPlayerBase, foe: battle.forecastEnemyBase }
    : { own: battle.forecastEnemyBase, foe: battle.forecastPlayerBase };
}

function fireSide(battle, side, dt) {
  // Forecasts reserve the damage of launched projectiles immediately. This keeps a volley
  // from aiming every arrow at one doomed plank, while the real fortress changes on arrival.
  const { own, foe } = sideForecastBases(battle, side);
  const table = side === 'player' ? battle.playerUnitTable : battle.enemyUnitTable;

  for (const shooter of unitsOf(own)) {
    const key = `${side}:${cellKey(shooter.x, shooter.y)}`;
    const spec = table[shooter.typeId];
    if (spec.passive) continue;

    // Кулдаун проверяется раньше цели (было наоборот до Вехи 4). Расходится только
    // если у стрелка кулдаун истёк, а цели уже нет — сейчас недостижимо (дальности
    // нет, цель есть всегда, пока жив хоть один враг), но может ожить, если когда-то
    // добавят дальность юнитам.
    const ready = (battle.cooldowns.get(key) ?? 0) - dt;
    if (ready > 0) { battle.cooldowns.set(key, ready); continue; }

    const burst = spec.burst ?? 1;
    const targetsCount = spec.targets ?? 1;
    let firedAtLeastOnce = false;

    for (let shot = 0; shot < burst; shot++) {
      // Стрелок мог погибнуть от отражённого урона на предыдущем шаге этой же очереди.
      if (!own.cells.has(cellKey(shooter.x, shooter.y))) break;

      const markedBlocks = side === 'player' ? battle.destroyKeys.map(k=>foe.cells.get(k)).filter(c=>c?.kind==='block') : [];
      markedBlocks.sort((a,b)=>Math.abs(worldX('enemy',a.x,battle.layout)-worldX(side,shooter.x,battle.layout))-
        Math.abs(worldX('enemy',b.x,battle.layout)-worldX(side,shooter.x,battle.layout)) || a.x-b.x || a.y-b.y);
      const targets = markedBlocks.length ? [markedBlocks[0]] : targetsCount > 1
        ? pickTargets({ shooter, shooterSide: side, enemyBase: foe, layout: battle.layout, count: targetsCount })
        : [pickTarget({ shooter, shooterSide: side, enemyBase: foe, layout: battle.layout })].filter(Boolean);

      if (targets.length === 0) break; // очередь останавливается, когда цели не осталось

      const perTargetSpec = targetsCount > 1 && !markedBlocks.length ? { ...spec, damage: spec.damage / targetsCount } : spec;

      for (const target of targets) {
        const result = resolveShot({
          enemyBase: foe, shooter, shooterSide: side, target, spec: perTargetSpec,
          blockTable: battle.blockTable, layout: battle.layout,
        });
        firedAtLeastOnce = true;
        const shotId = battle.nextShotId++;
        const plan={...result,damageType:spec.damageType};
        battle.events.push({
          type: 'shot', id: shotId, side, from: cellKey(shooter.x, shooter.y),
          shooterTypeId: shooter.typeId, damageType: spec.damageType, impactKey: plan.impactKey,
          trajectory:plan.trajectory,
        });
        battle.pendingShots.push({ id: shotId, side, from: cellKey(shooter.x, shooter.y),
          shooterTypeId: shooter.typeId, plan,
          arrivesAt: battle.elapsed + plan.trajectory.duration * plan.trajectory.endT / 1000 });

        if (result.reflected > 0) {
          shooter.hp -= result.reflected;
          if (shooter.hp <= 0) own.cells.delete(cellKey(shooter.x, shooter.y));
        }
      }
    }

    if (firedAtLeastOnce) battle.cooldowns.set(key, spec.cooldown);
    else battle.cooldowns.set(key, 0);
  }

}

function resolveArrivals(battle, throughTime) {
  const ready = battle.pendingShots
    .filter(shot => shot.arrivesAt <= throughTime + 1e-9)
    .sort((a, b) => (a.arrivesAt - b.arrivesAt) || (a.id - b.id));
  if (!ready.length) return;
  const ids = new Set(ready.map(shot => shot.id));
  battle.pendingShots = battle.pendingShots.filter(shot => !ids.has(shot.id));
  for (const shot of ready) {
    const { own, foe } = sideBases(battle, shot.side);
    const result = applyShotPlan({ enemyBase: foe, plan: shot.plan, blockTable: battle.blockTable });
    const targetSide = shot.side === 'player' ? 'enemy' : 'player';
    battle.events.push({ type: 'impact', id: shot.id, side: shot.side, targetSide,
      hits: result.hits, impactKey: result.impactKey, trajectory: result.trajectory });
    for (const destroyedKey of result.destroyed) {
      const hit = result.hits.find(h => h.key === destroyedKey);
      battle.events.push({ type: 'destroyed', side: targetSide, key: destroyedKey, typeId: hit?.typeId });
    }
    if (result.reflected > 0) {
      const shooter = own.cells.get(shot.from);
      if (!shooter || shooter.kind !== 'unit' || shooter.typeId !== shot.shooterTypeId) continue;
      shooter.hp -= result.reflected;
      battle.events.push({ type: 'reflected', side: shot.side, key: shot.from, damage: result.reflected });
      if (shooter.hp <= 0) {
        own.cells.delete(shot.from);
        battle.events.push({ type: 'destroyed', side: shot.side, key: shot.from, typeId: shooter.typeId });
      }
    }
  }
}

export function step(battle, dt) {
  const before = battle.events.length;
  if(battle.waveRemaining!==null){
    battle.waveRemaining=Math.max(0,battle.waveRemaining-dt);
    battle.elapsed+=dt;
    for(const [key,value] of battle.cooldowns)battle.cooldowns.set(key,Math.max(0,value-dt));
    if(battle.waveRemaining<=1e-9){
      const wave=battle.reinforcements.shift();
      battle.enemyBase=wave.enemyBase;battle.enemyUnitTable=wave.enemyUnitTable;
      battle.forecastEnemyBase=forecastBase(wave.enemyBase);
      battle.waveIndex++;battle.waveRemaining=null;
      for(const key of battle.cooldowns.keys())if(key.startsWith('enemy:'))battle.cooldowns.delete(key);
      battle.events.push({type:'wave-start',index:battle.waveIndex,total:battle.waveCount});
    }
    return {events:battle.events.slice(before)};
  }

  // Arrivals precede fresh fire at this fixed step. Thus an arrow launched at t=0 damages
  // at its actual flight time, while a projectile already in flight survives its shooter's death.
  resolveArrivals(battle, battle.elapsed + dt);

  // Порядок фиксирован: игрок, затем враг, затем обрушение на обеих базах.
  fireSide(battle, 'player', dt);
  fireSide(battle, 'enemy', dt);

  for (const [side, base] of [['player', battle.playerBase], ['enemy', battle.enemyBase]]) {
    const { fallen } = collapse(base);
    if (fallen.length > 0) battle.events.push({ type: 'collapsed', side, keys: fallen });
  }
  // The aiming state must lose unsupported cells at the same logical instant as the old
  // immediate-damage battle did; the visible state performs its collapse on actual impact.
  collapse(battle.forecastPlayerBase);
  collapse(battle.forecastEnemyBase);

  battle.elapsed += dt;
  if(unitsOf(battle.enemyBase).length===0&&battle.reinforcements.length&&outcomeOf(battle)!=='loss'){
    // Shots fired by the player at the cleared wave must not leak into the next one.
    battle.pendingShots=battle.pendingShots.filter(shot=>shot.side==='enemy');
    if(battle.pendingShots.length)return { events: battle.events.slice(before) };
    battle.waveRemaining=battle.waveDelay;
    battle.events.push({type:'wave-clear',index:battle.waveIndex,total:battle.waveCount});
  }
  return { events: battle.events.slice(before) };
}

export function casualtiesOf(battle){
  return battle.initialPlayerKeys.filter(key=>!battle.playerBase.cells.has(key)).length;
}

export function outcomeOf(battle) {
  if(battle.protectedKeys.some(key=>!battle.playerBase.cells.has(key)))return 'loss';
  if(casualtiesOf(battle)>battle.maxLosses)return 'loss';
  const mine = unitsOf(battle.playerBase).filter(c=>!battle.playerUnitTable[c.typeId]?.passive).length;
  const theirs = unitsOf(battle.enemyBase).length;
  // Only incoming return fire may postpone a terminal army result. Friendly projectiles
  // aimed at an already empty side cannot change it and are discarded on wave transition.
  if ((mine === 0 && battle.pendingShots.some(shot=>shot.side==='player')) ||
      (theirs === 0 && battle.pendingShots.some(shot=>shot.side==='enemy'))) return null;
  if (mine === 0) return 'loss';
  if(battle.destroyKeys.length)return battle.destroyKeys.every(key=>!battle.enemyBase.cells.has(key))?'win':null;
  if (theirs === 0 && !battle.reinforcements.length && battle.waveRemaining===null) return 'win';
  return null;
}

export function run(battle, { dt = DEFAULT_DT } = {}) {
  let outcome = outcomeOf(battle);

  while (outcome === null && battle.elapsed < battle.timeLimit-1e-9) {
    step(battle, Math.min(dt,battle.timeLimit-battle.elapsed));
    outcome = outcomeOf(battle);
  }

  // Ничья засчитывается как поражение (решение по спеке) и означает ровно одно:
  // урона в раскладе слишком мало, чтобы кого-то добить за отведённое время.
  // Второй вид ничьей — «никто никого не достаёт» — стал невозможен после
  // отказа от дальности: цель есть всегда, пока у врага остались юниты.
  return {
    outcome: outcome ?? 'timeout',
    reason: outcome ? null : 'time',
    elapsed: Number(battle.elapsed.toFixed(4)),
    events: battle.events,
  };
}
