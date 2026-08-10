// МЕТА-ПРОГРЕСС ДЕРЕВНИ. В отличие от src/mechanics/dungeon/ (замкнутое ядро без
// Phaser и без площадки), этот модуль — клей игры: держит SkillTreeModel, искры,
// открытых героев, стрик и достижения, читает/пишет через Platform.save. Не кандидат
// в library как есть (завязан на конкретные данные игры), но использует переносимый
// SkillTreeModel внутри.
import { Platform } from '../platform/index.js';
import { SkillTreeModel } from '../mechanics/skilltree/skilltree.js';
import { META_BRANCHES, META_BRANCH_ORDER, START_KIT } from '../data/metaTree.js';
import { HEROES, HERO_ORDER } from '../data/heroes.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { BALANCE } from '../data/balance.js';

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

export async function loadProgress() {
  const data = (await Platform.save.load()) || {};
  const tree = new SkillTreeModel(META_BRANCHES, data.tree || {});
  const progress = {
    sparks: data.sparks || 0,
    tree,
    heroesUnlocked: data.heroesUnlocked && data.heroesUnlocked.length ? data.heroesUnlocked : ['bogatyr'],
    bestDepth: data.bestDepth || 0,
    streak: data.streak || 0,
    lastPlayDate: data.lastPlayDate || '',
    lastDailyDate: data.lastDailyDate || '',
    lastDailyDepth: data.lastDailyDepth || 0,
    achievements: data.achievements || [],
    lastReviveDate: data.lastReviveDate || '',
    lifetimeRelics: data.lifetimeRelics || 0,
    lifetimeSpirit: data.lifetimeSpirit || 0,
    lifetimeBosses: data.lifetimeBosses || 0,
    lifetimeKills: data.lifetimeKills || 0,
    lastHero: data.lastHero || 'bogatyr',
    startKitLevel: data.startKitLevel || 0,
    dailyClaimedDate: data.dailyClaimedDate || ''
  };
  return progress;
}

function persist(progress) {
  return Platform.save.update({
    sparks: progress.sparks,
    tree: progress.tree.toSave(),
    heroesUnlocked: progress.heroesUnlocked,
    bestDepth: progress.bestDepth,
    streak: progress.streak,
    lastPlayDate: progress.lastPlayDate,
    lastDailyDate: progress.lastDailyDate,
    lastDailyDepth: progress.lastDailyDepth,
    achievements: progress.achievements,
    lastReviveDate: progress.lastReviveDate,
    lifetimeRelics: progress.lifetimeRelics,
    lifetimeSpirit: progress.lifetimeSpirit,
    lifetimeBosses: progress.lifetimeBosses,
    lifetimeKills: progress.lifetimeKills,
    lastHero: progress.lastHero,
    startKitLevel: progress.startKitLevel,
    dailyClaimedDate: progress.dailyClaimedDate
  });
}

export function computeMetaMods(progress) {
  return {
    hpMult: progress.tree.multiplier('vitality'),
    atkMult: progress.tree.multiplier('strength'),
    skillMult: progress.tree.multiplier('wisdom'),
    fortuneMult: progress.tree.multiplier('fortune')
  };
}

export function buyBranch(progress, branch) {
  const bought = progress.tree.buy(branch, progress.sparks);
  if (!bought) return null;
  progress.sparks -= bought.cost;
  persist(progress);
  return bought;
}

export function unlockHero(progress, heroId) {
  const def = HEROES[heroId];
  if (!def || progress.heroesUnlocked.includes(heroId)) return false;
  if (progress.sparks < def.unlockCost) return false;
  progress.sparks -= def.unlockCost;
  progress.heroesUnlocked.push(heroId);
  persist(progress);
  return true;
}

export function buyStartKitLevel(progress) {
  const next = START_KIT.levels[progress.startKitLevel];
  if (!next) return null;
  if (progress.sparks < next.cost) return null;
  progress.sparks -= next.cost;
  progress.startKitLevel++;
  persist(progress);
  return next;
}

// Заходит в деревню: обновляет стрик (день подряд/сброс) один раз за КАЛЕНДАРНЫЙ день.
// Награда забирается отдельной кнопкой claimDailyLoginBonus — вход только считает стрик.
export function touchDailyStreak(progress) {
  const today = todayStr();
  if (progress.lastPlayDate === today) return progress; // уже засчитан сегодня
  if (progress.lastPlayDate) {
    const gap = daysBetween(progress.lastPlayDate, today);
    progress.streak = gap === 1 ? progress.streak + 1 : 1;
  } else {
    progress.streak = 1;
  }
  progress.lastPlayDate = today;
  persist(progress);
  return progress;
}

export function dailyStreakReward(progress) {
  const cfg = BALANCE.dailyStreak;
  return Math.min(cfg.cap, cfg.baseReward + (progress.streak - 1) * cfg.perDayBonus);
}

export function canClaimDailyBonus(progress) {
  return progress.dailyClaimedDate !== todayStr();
}

export function claimDailyBonus(progress) {
  if (!canClaimDailyBonus(progress)) return 0;
  const reward = dailyStreakReward(progress);
  progress.sparks += reward;
  progress.dailyClaimedDate = todayStr();
  persist(progress);
  return reward;
}

export function canPlayDailyTrial(progress) {
  return progress.lastDailyDate !== todayStr();
}

export function todaySeed() {
  return todayStr();
}

export function recordDailyResult(progress, floorReached) {
  progress.lastDailyDate = todayStr();
  progress.lastDailyDepth = floorReached;
  persist(progress);
}

export function canUseRevive(progress) {
  return progress.lastReviveDate !== todayStr();
}

export function markReviveUsed(progress) {
  progress.lastReviveDate = todayStr();
  persist(progress);
}

// Итог забега: начисляет искры (ВСЕГДА, не зависит от рекламы — YANDEX-MODERATION.md),
// обновляет рекорд глубины, счётчики жизни, проверяет новые достижения.
export function recordRunEnd(progress, { floor, sparksEarned, relicsPicked, spiritCollected, bossesKilled, enemiesKilled, heroId }) {
  progress.sparks += sparksEarned;
  progress.bestDepth = Math.max(progress.bestDepth, floor);
  progress.lifetimeRelics += relicsPicked;
  progress.lifetimeSpirit += spiritCollected;
  progress.lifetimeBosses += bossesKilled;
  progress.lifetimeKills += enemiesKilled;
  progress.lastHero = heroId;
  const unlocked = checkAchievements(progress, { floor, bossesKilled });
  persist(progress);
  // Персистентный лидерборд `bestDepth` (заявлен в CLAUDE.md игры, но не был подключён нигде
  // в коде — находка при разборе готовности к релизу). ВАЖНО: шлём progress.bestDepth (уже
  // прошедший Math.max выше), НЕ floor текущего забега — setScore Яндекса перезаписывает
  // значение БЕЗУСЛОВНО, в том числе худшим (красная команда 05.08 сверила с официальным
  // блогом Яндекса; прежний комментарий «SDK сам хранит лучший» был неправдой — рекорд 12
  // затирался следующей смертью на этаже 2). Площадка должна ЗАРАНЕЕ завести лидерборд
  // `bestDepth` в консоли по имени — динамически его не создать (см. `CLAUDE.md` игры).
  // Имя без подчёркивания: тех.имя в консоли разрешает только [a-zA-Z0-9].
  Platform.leaderboard.setScore('bestDepth', progress.bestDepth);
  return unlocked;
}

export function checkAchievements(progress, stats) {
  const have = new Set(progress.achievements);
  const newly = [];
  const grant = (id) => { if (!have.has(id)) { have.add(id); newly.push(id); } };

  if (stats.floor >= 2) grant('first_floor');
  if (stats.floor >= 5) grant('floor_5');
  if (stats.floor >= 10) grant('floor_10');
  if (stats.floor >= 15) grant('floor_15');
  if (stats.floor >= 20) grant('floor_20');
  if (progress.lifetimeKills > 0) grant('first_blood');
  if (HERO_ORDER.every((h) => progress.heroesUnlocked.includes(h))) grant('all_heroes');
  if (progress.lifetimeRelics >= 20) grant('relic_collector');
  if (progress.lifetimeSpirit >= 500) grant('spirit_hoarder');
  if (progress.lifetimeBosses >= 3) grant('boss_slayer');
  if (progress.streak >= 3) grant('daily_streak_3');
  if (progress.streak >= 7) grant('daily_streak_7');
  if (stats.noHitFloor) grant('no_hit_floor');

  progress.achievements = Array.from(have);
  return newly;
}

// Немедленное вручение достижения (например, «этаж без урона» — проверяется в момент
// зачистки этажа, не стоит ждать конца забега). Возвращает true, если реально новое.
export function grantAchievement(progress, id) {
  if (progress.achievements.includes(id)) return false;
  progress.achievements = [...progress.achievements, id];
  persist(progress);
  return true;
}

export { ACHIEVEMENTS, META_BRANCH_ORDER, HERO_ORDER };
