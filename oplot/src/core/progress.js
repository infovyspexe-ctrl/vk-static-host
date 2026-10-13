// Состояние партии: кошелёк, номер уровня, база игрока.
// Отдельно от gridbuild нарочно: механика сетки не знает про деньги и не должна,
// она поедет во вторую игру, где экономика другая.

import { createBase, place, erase, cellAt } from '../mechanics/gridbuild/base.js';
import { applyBlueprint } from '../mechanics/gridbuild/blueprint.js';
import { placementLimit } from './missionLimits.js';
import { widthForLevel } from '../data/field.js';
import { lineCost, canTransform } from '../mechanics/unitupgrade/progression.js';
import { perekovkaCost } from '../mechanics/unitupgrade/forge.js';
import { UNIT_FORMS, formFor } from '../data/units.js';
import { advanceTutorial, tutorialStep } from './tutorial.js';
import { REWARD_EXCHANGE } from '../data/economy.js';
import { blockUpgradeCost } from '../mechanics/blockupgrade/fortify.js';
import { MONETIZATION } from '../data/monetization.js';

const DEFAULT_WIDTH = 12;

function createUnitLevels(catalog) {
  const levels = {};
  for (const id of Object.keys(catalog.units)) levels[id] = { hp: 0, damage: 0, cooldown: 0, branch: null };
  return levels;
}

function createBlockLevels(catalog) {
  return Object.fromEntries(Object.keys(catalog.blocks).map(id => [id, 0]));
}

export function createProgress({ startGold, width = DEFAULT_WIDTH, catalog }) {
  return {
    gold: startGold, level: 1, width, catalog,
    base: createBase({ width, catalog }),
    unitLevels: createUnitLevels(catalog),
    blockLevels: createBlockLevels(catalog),
    bonuses: { unit: {}, block: {} },
    blueprints: [null, null, null],
    pendingReward: null,
    reinforcementLevel: 0,
    tutorial: 'unit',
  };
}

function bonusId(kind, typeId) {
  return kind === 'unit' ? (UNIT_FORMS[typeId]?.baseId ?? typeId) : typeId;
}

export function bonusCount(progress, kind, typeId) {
  return progress.bonuses?.[kind]?.[bonusId(kind, typeId)] ?? 0;
}

export function grantBonus(progress, { kind, typeId, count }) {
  if (!['unit', 'block'].includes(kind) || !Number.isInteger(count) || count <= 0) return false;
  const id = bonusId(kind, typeId);
  progress.bonuses[kind][id] = bonusCount(progress, kind, id) + count;
  return true;
}

export function buyUpgradeLine(progress, baseId, line) {
  if (progress.mode === 'missions') return {ok:false,reason:'mission-rule'};
  const state = progress.unitLevels[baseId];
  const nextLevel = state[line] + 1;
  const cost = lineCost(progress.catalog.units[baseId].cost, nextLevel);
  if (cost > progress.gold) return { ok: false, reason: 'no-gold' };

  progress.gold -= cost;
  state[line] += 1;
  advanceTutorial(progress, 'upgrade');
  return { ok: true, cost };
}

export function buyBlockUpgrade(progress, blockId) {
  if (progress.mode === 'missions') return { ok: false, reason: 'mission-rule' };
  const block = progress.catalog.blocks[blockId];
  if (!block || !Number.isInteger(progress.blockLevels?.[blockId])) return { ok: false, reason: 'unknown-block' };
  const nextLevel = progress.blockLevels[blockId] + 1;
  const cost = blockUpgradeCost(block, nextLevel);
  if (cost > progress.gold) return { ok: false, reason: 'no-gold' };
  progress.gold -= cost;
  progress.blockLevels[blockId] = nextLevel;
  return { ok: true, cost };
}

export function chooseBranch(progress, baseId, branch) {
  if(progress.mode==='missions')return {ok:false,reason:'mission-rule'};
  const state = progress.unitLevels[baseId];
  if (!state || state.branch || !canTransform(state)) return { ok: false };

  const form = formFor(baseId, branch);
  state.branch = branch;
  for (const cell of progress.base.cells.values()) {
    if (cell.kind === 'unit' && cell.typeId === baseId) cell.typeId = form.id;
  }
  return { ok: true };
}

// Веток всегда ровно две — «сменить» означает переключиться на ту, которой сейчас нет.
function otherBranch(branch) {
  return branch === 'A' ? 'B' : 'A';
}

export function payPerekovka(progress, baseId) {
  if(progress.mode==='missions')return {ok:false,reason:'mission-rule'};
  const state = progress.unitLevels[baseId];
  if (!state || !state.branch) return { ok: false, reason: 'not-transformed' };

  const cost = perekovkaCost(progress.catalog.units[baseId].cost, state);
  if (cost > progress.gold) return { ok: false, reason: 'no-gold' };

  const oldFormId = formFor(baseId, state.branch).id;
  const newBranch = otherBranch(state.branch);
  const newFormId = formFor(baseId, newBranch).id;

  progress.gold -= cost;
  state.branch = newBranch;
  for (const cell of progress.base.cells.values()) {
    if (cell.kind === 'unit' && cell.typeId === oldFormId) cell.typeId = newFormId;
  }
  return { ok: true, cost };
}

function priceOf(progress, kind, typeId) {
  const table = kind === 'unit' ? progress.catalog.units : progress.catalog.blocks;
  return table[typeId]?.cost ?? null;
}

export function tryPlace(progress, x, y, kind, typeId) {
  const limit=placementLimit(progress,kind);if(limit)return {ok:false,reason:limit};
  if(progress.mode==='missions'&&y>(progress.mission.maxHeight??Infinity))return {ok:false,reason:'mission-height'};
  if (progress.mode === 'missions' && kind === 'unit' &&
    (progress.catalog.units[typeId]?.passive || (progress.mission.allowed && !progress.mission.allowed.includes(typeId))))
    return {ok:false,reason:'mission-rule'};
  const price = priceOf(progress, kind, typeId);
  const free = bonusCount(progress, kind, typeId) > 0;
  // Денег проверяем ДО размещения, чтобы не пришлось откатывать сетку.
  if (!free && price !== null && price > progress.gold) return { ok: false, reason: 'no-gold' };

  const r = place(progress.base, x, y, kind, typeId);
  if (!r.ok) return { ok: false, reason: r.reason };

  if (free) {
    const id = bonusId(kind, typeId);
    progress.bonuses[kind][id] -= 1;
    cellAt(progress.base, x, y).paidWithBonus = true;
  } else progress.gold -= r.cost;
  return { ok: true, reason: null, usedBonus: free };
}

export function tryErase(progress, x, y) {
    if (cellAt(progress.base,x,y)?.locked || cellAt(progress.base,x,y)?.fixed) return {ok:false,refund:0,reason:'mission-fixed'};
  const protectedAbove=cellAt(progress.base,x,y+1)?.locked?{...cellAt(progress.base,x,y+1)}:null;
  const removed = [];
  const cell = cellAt(progress.base, x, y);
  if (cell) {
    removed.push(cell);
    const above = cell.kind === 'block' ? cellAt(progress.base, x, y + 1) : null;
    if (above?.kind === 'unit') removed.push(above);
  }
  const r = erase(progress.base, x, y);
  if (protectedAbove) progress.base.cells.set(`${x},${y+1}`,protectedAbove);
  if (!r.ok) return { ok: false, refund: 0 };
  let refund = r.refund;
  for (const removedCell of removed) {
    if (!removedCell.paidWithBonus) continue;
    grantBonus(progress, { kind: removedCell.kind, typeId: removedCell.typeId, count: 1 });
    refund -= priceOf(progress, removedCell.kind, removedCell.typeId) ?? 0;
  }
  progress.gold += refund;
  return { ok: true, refund };
}

function growToLevel(progress, level) {
  const target = widthForLevel(level);
  if (target > progress.width) {
    progress.width = target;
    progress.base.width = target;
  }
}

export function awardWin(progress, amount) {
  progress.gold += amount;
  progress.level += 1;
  growToLevel(progress, progress.level);
}

function sanitizeReward(value, catalog, level) {
  if (!value || !Number.isInteger(value.level) || value.level < 1 || value.level !== level - 1 || !Number.isFinite(value.reward) || value.reward < 0 || !Array.isArray(value.bonus)) return null;
  const bonus = value.bonus.slice(0, 3).filter(item => item &&
    ['unit', 'block'].includes(item.kind) && Number.isInteger(item.count) && item.count > 0 &&
    (item.kind === 'unit' ? catalog.units : catalog.blocks)[item.typeId])
    .map(({ kind, typeId, count }) => ({ kind, typeId, count }));
  return { level: value.level, reward: value.reward, bonus, ...(value.doubled === true ? { doubled: true } : {}) };
}

export function canDoubleReward(progress) {
  return progress.mode !== 'missions' && tutorialStep(progress) === 'done' &&
    !!progress.pendingReward && !progress.pendingReward.doubled && progress.pendingReward.reward > 0;
}

export function doubleReward(progress, level) {
  if (!canDoubleReward(progress) || progress.pendingReward.level !== level) return false;
  const total = progress.gold + progress.pendingReward.reward;
  if (!Number.isSafeInteger(total)) return false;
  progress.gold = total;
  progress.pendingReward.doubled = true;
  return true;
}

export function canReinforce(progress) {
  return progress.mode !== 'missions' && tutorialStep(progress) === 'done' &&
    !progress.pendingReward && progress.reinforcementLevel !== progress.level;
}

export function grantReinforcement(progress, level) {
  if (!canReinforce(progress) || progress.level !== level) return false;
  for (const item of MONETIZATION.reinforcement) grantBonus(progress, item);
  progress.reinforcementLevel = level;
  return true;
}

// One transaction: gold, next level and the unclaimed choice are saved together.
// Re-entering Result or a duplicate finish callback cannot pay a second time.
export function completeVictory(progress, { level, reward, bonus }) {
  if (progress.pendingReward || level !== progress.level) return false;
  const pending = sanitizeReward({ level, reward, bonus }, progress.catalog, level + 1);
  if (!pending) return false;
  awardWin(progress, reward);
  progress.pendingReward = pending;
  advanceTutorial(progress, 'victory');
  return true;
}

export function rewardGoldValue(progress,index){
  const pending=progress.pendingReward;
  if(progress.mode==='missions'||!pending||pending.level<REWARD_EXCHANGE.firstLevel||!Number.isInteger(index))return 0;
  const item=pending.bonus[index];
  if(!item)return 0;
  const value=progress.catalog[item.kind==='unit'?'units':'blocks'][item.typeId]?.cost*item.count;
  return Number.isSafeInteger(value)&&value>0?value:0;
}

export function claimReward(progress, index, asGold=false) {
  const pending = progress.pendingReward;
  if (!pending) return { ok: false };
  if (!pending.bonus.length && index === -1) {
    progress.pendingReward = null;
    advanceTutorial(progress, 'claim');
    return { ok: true, item: null };
  }
  if (!Number.isInteger(index) || index < 0 || index >= pending.bonus.length) return { ok: false };
  const item = pending.bonus[index];
  if(asGold){
    const amount=rewardGoldValue(progress,index);
    if(!amount)return {ok:false};
    progress.gold+=amount;
  }else if (!grantBonus(progress, item)) return { ok: false };
  progress.pendingReward = null;
  advanceTutorial(progress, 'claim');
  return { ok: true, item };
}

export function toSave(progress) {
  const cells = [];
  for (const cell of progress.base.cells.values()) {
    cells.push([cell.x, cell.y, cell.kind, cell.typeId, Boolean(cell.paidWithBonus)]);
  }
  const data={ gold: progress.gold, level: progress.level, width: progress.width, cells, unitLevels: progress.unitLevels, blockLevels: progress.blockLevels, bonuses: progress.bonuses, blueprints: progress.blueprints, pendingReward: progress.pendingReward, reinforcementLevel: progress.reinforcementLevel, tutorial: tutorialStep(progress) };
  if(progress.mode==='missions'){
    const active={...data,missionCompleted:progress.missionCompleted},drafts={...progress.missionDrafts};
    if(progress.missionCompleted)delete drafts[progress.level];
    else drafts[progress.level]=active;
    return {missions:{...progress.missionState,drafts,active}};
  }
  return data;
}

// unitLevels в сейве может быть чем угодно: старой версии (поля ещё нет), руками
// поправленным, с чужой веткой. Каждую линию и ветку проверяем отдельно, битое —
// молча заменяем нулём/null, а не роняем загрузку целиком.
function sanitizeUnitLevels(data, catalog) {
  const result = createUnitLevels(catalog);
  const src = data && typeof data === 'object' ? data : {};
  for (const id of Object.keys(result)) {
    const s = src[id];
    if (!s || typeof s !== 'object') continue;
    for (const line of ['hp', 'damage', 'cooldown']) {
      if (Number.isInteger(s[line]) && s[line] >= 0) result[id][line] = s[line];
    }
    if (s.branch === 'A' || s.branch === 'B') result[id].branch = s.branch;
  }
  return result;
}

function sanitizeBlockLevels(data, catalog) {
  const result = createBlockLevels(catalog);
  const src = data && typeof data === 'object' ? data : {};
  for (const id of Object.keys(result)) {
    if (Number.isInteger(src[id]) && src[id] >= 0) result[id] = src[id];
  }
  return result;
}

// Сейв приходит из облака площадки и может быть каким угодно: старой версии,
// оборванным, руками поправленным. Всё непонятное молча заменяем на разумное —
// уронить игру на загрузке хуже, чем потерять постройку.
export function fromSave(data, catalog, platformHoles = [], initialCells = []) {
  const gold = Number.isSafeInteger(data?.gold) && data.gold >= 0 ? data.gold : 0;
  const level = Number.isInteger(data?.level) && data.level > 0 ? data.level : 1;
  const width = Number.isInteger(data?.width) && data.width > 0 ? data.width : DEFAULT_WIDTH;

  const progress = createProgress({ startGold: gold, width, catalog });
    progress.base.platformHoles=[...platformHoles];
    for(const cell of initialCells)progress.base.cells.set(`${cell.x},${cell.y}`,{...cell});
  progress.level = level;
  progress.tutorial = tutorialStep(data ?? {});
  progress.pendingReward = sanitizeReward(data?.pendingReward, catalog, level);
  progress.reinforcementLevel = data?.reinforcementLevel === level ? level : 0;
  progress.unitLevels = sanitizeUnitLevels(data?.unitLevels, catalog);
  progress.blockLevels = sanitizeBlockLevels(data?.blockLevels, catalog);
  progress.blueprints = [0, 1, 2].map(i => {
    const slot = data?.blueprints?.[i];
    if (!Array.isArray(slot) || !slot.length) return null;
    return slot.filter(c => Array.isArray(c) && c.length >= 4 &&
      Number.isInteger(c[0]) && c[0] >= 0 && Number.isInteger(c[1]) && c[1] >= 1 &&
      ['unit', 'block'].includes(c[2]) &&
      (c[2] === 'unit' ? catalog.units : catalog.blocks)[c[3]])
      .map(c => c.slice(0, 4));
  });
  for (const kind of ['unit', 'block']) {
    const source = data?.bonuses?.[kind];
    if (!source || typeof source !== 'object') continue;
    for (const [id, count] of Object.entries(source)) {
      if (Number.isInteger(count) && count > 0) progress.bonuses[kind][id] = count;
    }
  }

  if (Array.isArray(data?.cells)) {
    // Порядок важен: юнит требует опору, поэтому блоки кладём первыми,
    // а внутри — снизу вверх. Иначе сейв с ярусами не восстановится.
    applyBlueprint(progress.base, data.cells);
  }

  growToLevel(progress, progress.level); // подтягивает ширину старых сейвов под их уровень
  return progress;
}
