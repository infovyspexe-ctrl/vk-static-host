// Разбор попадания. Свои блоки снаряд игнорирует — это решение по спеке,
// поэтому путь считается только по вражеской базе.

import { cellKey } from '../gridbuild/base.js';
import { shotTrajectory, trajectoryBlockers } from './trajectory.js';

const PIERCE_LOSS = 0.30; // доля ИСХОДНОГО урона, теряемая за каждый пройденный блок

// Смещения клеток относительно цели. square3 — прежнее поведение (3x3, включая цель).
// cross — цель + 4 ортогональных соседа (Веха 4, «Кучный»/«Мортира»). wide5 — 5x5
// («Широкий»). Дивизоры считаются per-cell из общего spec.damage, не хранятся отдельно
// по клетке — все клетки паттерна получают одинаковый урон.
const SPLASH_OFFSETS = {
  square3: [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
  cross: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],
  wide5: (() => {
    const offsets = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) offsets.push([dx, dy]);
    return offsets;
  })(),
};

// Blockers along the same world-space path emitted to the renderer.
export function blockersBetween(args) {
  return trajectoryBlockers({...args,path:shotTrajectory(args)}).map(hit=>hit.cell);
}

function applyDamage(enemyBase, cell, amount, blockTable, hits, destroyed, damageType) {
  if(cell.objectId){
    // A blast overlaps many tiles, but damages one rigid object only once.
    if(hits.some(h=>h.objectId===cell.objectId))return 0;
    const parts=[...enemyBase.cells.values()].filter(c=>c.objectId===cell.objectId);
    const hp=cell.hp-amount;
    hits.push({key:cellKey(cell.x,cell.y),kind:cell.kind,typeId:cell.typeId,damage:amount,objectId:cell.objectId});
    for(const part of parts){
      part.hp=hp;
      if(hp<=0){const key=cellKey(part.x,part.y);enemyBase.cells.delete(key);destroyed.push(key);}
    }
    return 0;
  }
  cell.hp -= amount;
  hits.push({ key: cellKey(cell.x, cell.y), kind: cell.kind, typeId: cell.typeId, damage: amount });

  // Щит возвращает долю поглощённого урона в стрелявшего.
  // Против пробития бесполезен: снаряд проходит его насквозь, отражать нечего.
  let reflected = 0;
  if (cell.kind === 'block' && damageType !== 'pierce') {
    reflected = amount * (cell.reflect ?? blockTable[cell.typeId]?.reflect ?? 0);
  }

  if (cell.hp <= 0) {
    enemyBase.cells.delete(cellKey(cell.x, cell.y));
    destroyed.push(cellKey(cell.x, cell.y));
  }

  return reflected;
}

export function resolveShot({ enemyBase, shooter, shooterSide, target, spec, blockTable, layout }) {
  const hits = [];
  const destroyed = [];
  let reflected = 0;

  const path=shotTrajectory({shooter,shooterSide,target,layout,spec});
  const intersections=trajectoryBlockers({path,enemyBase,shooterSide,layout});
  const blockers=intersections.map(hit=>hit.cell);
  const finish=(impact,endT=1)=>({hits,reflected,destroyed,impactKey:cellKey(impact.x,impact.y),
    trajectory:{...path,endT}});

  if (spec.damageType === 'splash') {
    // Бомба не проходит сквозь стену: она взрывается на первой преграде,
    // а площадь поражения считается уже вокруг реальной точки столкновения.
    const impact = blockers[0] ?? target;
    const divisor = spec.splashDivisor ?? 2;
    const amount = spec.damage / divisor;
    const offsets = SPLASH_OFFSETS[spec.splashPattern ?? 'square3'];
    const around = [];
    for (const [dx, dy] of offsets) {
      const cell = enemyBase.cells.get(cellKey(impact.x + dx, impact.y + dy));
      if (cell) around.push(cell);
    }
    around.sort((a, b) => (a.x - b.x) || (a.y - b.y));
    for (const cell of around) {
      reflected += applyDamage(enemyBase, cell, amount, blockTable, hits, destroyed, spec.damageType);
    }
    return finish(impact,intersections[0]?.t??1);
  }

  if (spec.damageType === 'pierce') {
    const loss = spec.pierceLoss ?? PIERCE_LOSS;
    // Проходит до spec.pierce блоков, теряя PIERCE_LOSS от ИСХОДНОГО урона за каждый.
    const passed = blockers.slice(0, spec.pierce);
    for (let i = 0; i < passed.length; i++) {
      const amount = spec.damage - spec.damage * loss * i;
      if (amount <= 0) return finish(passed[Math.max(0,i-1)],intersections[Math.max(0,i-1)].t);
      reflected += applyDamage(enemyBase, passed[i], amount, blockTable, hits, destroyed, spec.damageType);
    }
    // Если блоков больше, чем пробития, снаряд вяжет и до цели не доходит.
    if (blockers.length > spec.pierce) return finish(passed.at(-1)??blockers[0],intersections[Math.max(0,passed.length-1)].t);

    // A marked block can itself be the aim point. Piercing it is only one hit.
    if (target.kind === 'block' && passed.some(cell => cellKey(cell.x,cell.y) === cellKey(target.x,target.y))) return finish(target);

    const rest = spec.damage - spec.damage * loss * passed.length;
    if(rest<=0&&passed.length)return finish(passed.at(-1),intersections[passed.length-1].t);
    if (rest > 0) reflected += applyDamage(enemyBase, target, rest, blockTable, hits, destroyed, spec.damageType);
    return finish(target);
  }

  // Обычный урон целиком тратится на первую преграду.
  if (blockers.length > 0) {
    reflected += applyDamage(enemyBase, blockers[0], spec.damage, blockTable, hits, destroyed, spec.damageType);
    return finish(blockers[0],intersections[0].t);
  }

  reflected += applyDamage(enemyBase, target, spec.damage, blockTable, hits, destroyed, spec.damageType);
  return finish(target);
}

// Apply launch-time damage intents to the current fortress. A target destroyed by an earlier
// projectile is simply missed; damage is never applied to a stale object reference.
export function applyShotPlan({ enemyBase, plan, blockTable }) {
  const hits = [];
  const destroyed = [];
  let reflected = 0;
  for (const intent of plan.hits) {
    const cell = enemyBase.cells.get(intent.key);
    if (!cell) continue;
    reflected += applyDamage(enemyBase, cell, intent.damage, blockTable, hits, destroyed, plan.damageType);
  }
  return { hits, destroyed, reflected, impactKey: plan.impactKey, trajectory: plan.trajectory };
}
