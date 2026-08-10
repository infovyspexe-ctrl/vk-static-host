// СОХРАНЕНИЕ АКТИВНОГО ЗАБЕГА. Отдельно от progress.js (мета): забег НЕ идёт в облако
// (правило экономии записей, см. комментарий у Platform.save в platform/index.js — эталон
// разделения из games/rubezh: save.js держит мету, runSave.js держит текущий забег), но
// должен переживать F5/закрытие вкладки так же надёжно, как мета.
//
// Реальный баг (найден при аудите 04.08, подтверждён живым тестом): раньше забег вообще
// нигде не сохранялся — state жил только в памяти GameScene. Перезагрузка страницы
// посреди подземелья стирала весь прогресс текущего спуска без начисления искр.
import { Platform } from '../platform/index.js';
import { createRng } from '../mechanics/dungeon/rng.js';

const KEY = 'iznanka_run';
const VERSION = 1;

// Поля state (run.js), которые сериализуются как есть — все числа/строки/массивы/
// вложенные простые объекты, без функций и без циклических ссылок.
const RUN_FIELDS = [
  'seed', 'heroId', 'player', 'floor', 'turnCount', 'status', 'relics', 'hasExtraChest',
  'spirit', 'lifetimeCounters', 'noHitThisFloor', 'shrineOptions', 'floorState', '_enemyIdCounter',
  'log',
];

function snapshot(state) {
  const out = { v: VERSION, savedAt: Date.now(), combatRngState: state.combatRng.state() };
  for (const f of RUN_FIELDS) out[f] = state[f];
  return out;
}

// Сохранить текущий забег. Не пишет статус 'dead' — искры за забег начисляются только
// в finishRun() (после «В деревню»/revive), не на сам факт смерти (revive может её
// отменить). Компромисс: если игрок умер и закрыл вкладку РОВНО на экране смерти, не
// нажав ничего, resumeRun() найдёт последний ЖИВОЙ снапшот (за ход до смерти) и по сути
// отменит эту конкретную смерть — редкий edge-case, но безопаснее, чем начислять награду
// дважды или терять её совсем. Основной баг (потеря АКТИВНОГО забега при любом F5) это
// закрывает полностью, finishRun() сам вызывает clearRun() при обычном выходе.
export function saveRun(state) {
  if (!state || state.status === 'dead') return;
  try {
    Platform.rawStorage()?.setItem(KEY, JSON.stringify(snapshot(state)));
  } catch (e) { /* приватный режим и т.п. — молча, как у зеркала меты */ }
}

// Убрать сейв забега (смерть записана, выход в деревню, начат новый забег).
export function clearRun() {
  try { Platform.rawStorage()?.removeItem(KEY); } catch (e) {}
}

function readRaw() {
  try {
    const s = Platform.rawStorage()?.getItem(KEY);
    if (!s) return null;
    const d = JSON.parse(s);
    if (!d || d.v !== VERSION || d.status === 'dead') return null;
    if (!d.floorState || !d.player) return null; // повреждённый/неполный снапшот
    return d;
  } catch (e) { return null; }
}

// Есть ли сохранённый незавершённый забег (для UI/логики продолжения).
export function peekRun() {
  const d = readRaw();
  return d ? { floor: d.floor, heroId: d.heroId } : null;
}

// Восстановить полный run.js-совместимый state из сейва. null, если сохранённого
// забега нет/он повреждён — вызывающий код тогда должен начать новый через createRun().
export function resumeRun() {
  const d = readRaw();
  if (!d) return null;
  const state = {};
  for (const f of RUN_FIELDS) state[f] = d[f];
  // combatRng восстанавливается ИЗ ТОЧКИ, где был сохранён (не с исходного seed) —
  // иначе следующие боевые броски после «Продолжить» повторили бы уже случившиеся.
  state.combatRng = createRng(d.combatRngState);
  // Защита от старых снапшотов без поля 'log' (реальный баг, найден живым тестом
  // 04.08: 'log' отсутствовал в RUN_FIELDS, resumeRun() отдавал state.log === undefined,
  // первый же pushLog() в бою падал — F5 посреди подземелья превращался в белый экран
  // ошибок). RUN_FIELDS теперь включает 'log', но снапшоты, сохранённые ДО этого фикса
  // (уже лежащие в localStorage у тестировавших), его не содержат — без явного дефолта
  // тот же краш вернулся бы при первом же resumeRun() над старым сейвом.
  if (!Array.isArray(state.log)) state.log = [];
  return state;
}
