// ГЕНЕРАЦИЯ ЭТАЖА. Замкнутый модуль: не знает про Phaser, только сетка + сид.
// Приём «комнаты в порядке создания соединяются цепочкой room[i]<->room[i-1]»
// гарантирует ОДИН связный граф без отдельного поиска компонент связности —
// ловушка несвязности из разведки (см. NOTES.md). Коридоры L-образные между
// ЦЕНТРАМИ комнат (комнаты не бывают тоньше 2), чтобы не врезаться в углы.
// roomSideMin/Max=2-3 и buffer=0 в roomsOverlap — намеренно: при cols=9 предыдущие
// 3-4 с buffer=1 математически НЕ ДАВАЛИ разместить больше 2 комнат ни при каком сиде
// (x-диапазон размещения при w=3-4 слишком узкий, чтобы развести две комнаты по X с
// зазором) — генератор всегда стягивал этаж в столбик из 2 комнат вместо заявленных
// 5-8 (см. NOTES.md, разбор 04.08). Подтверждено симуляцией 2000 сидов: текущие
// параметры дают 100% сидов в диапазоне 5-8 комнат.
import { tierForFloor, MONSTER_TIERS, MONSTERS, isBossFloor, bossForFloor } from '../../data/monsters.js';

const KITING_BEHAVIORS = ['ranged', 'pull']; // держат дистанцию/тянут — не подходят сами
import { BALANCE } from '../../data/balance.js';

const WALL = 0;
const FLOOR = 1;

function roomsOverlap(a, b, buffer = 0) {
  return !(
    a.x + a.w + buffer <= b.x ||
    b.x + b.w + buffer <= a.x ||
    a.y + a.h + buffer <= b.y ||
    b.y + b.h + buffer <= a.y
  );
}

function carveRoom(grid, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) grid[y][x] = FLOOR;
  }
}

function carveCorridor(grid, x1, y1, x2, y2, rng) {
  const horizontalFirst = rng.chance(0.5);
  if (horizontalFirst) {
    carveH(grid, x1, x2, y1);
    carveV(grid, y1, y2, x2);
  } else {
    carveV(grid, y1, y2, x1);
    carveH(grid, x1, x2, y2);
  }
}

function carveH(grid, x1, x2, y) {
  const [from, to] = x1 <= x2 ? [x1, x2] : [x2, x1];
  for (let x = from; x <= to; x++) grid[y][x] = FLOOR;
}

function carveV(grid, y1, y2, x) {
  const [from, to] = y1 <= y2 ? [y1, y2] : [y2, y1];
  for (let y = from; y <= to; y++) grid[y][x] = FLOOR;
}

function roomCenter(room) {
  return { x: room.x + (room.w >> 1), y: room.y + (room.h >> 1) };
}

function placeRooms(cols, rows, rng) {
  const cfg = BALANCE.dungeon;
  const count = rng.int(cfg.roomsMin, cfg.roomsMax);
  const rooms = [];
  let attempts = 0;
  while (rooms.length < count && attempts < count * 150) {
    attempts++;
    const w = rng.int(cfg.roomSideMin, cfg.roomSideMax);
    const h = rng.int(cfg.roomSideMin, cfg.roomSideMax);
    const x = rng.int(1, cols - w - 2);
    const y = rng.int(1, rows - h - 2);
    const room = { x, y, w, h };
    if (rooms.some((r) => roomsOverlap(room, r))) continue;
    rooms.push(room);
  }
  return rooms;
}

function emptyGrid(cols, rows) {
  const grid = [];
  for (let y = 0; y < rows; y++) grid.push(new Array(cols).fill(WALL));
  return grid;
}

function floorTilesExcluding(grid, exclude) {
  const excludeSet = new Set(exclude.map((p) => p.x + ',' + p.y));
  const tiles = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === FLOOR && !excludeSet.has(x + ',' + y)) tiles.push({ x, y });
    }
  }
  return tiles;
}

// generateFloor(depth, rng, opts) -> состояние этажа, готовое для run.js
// opts.extraChest — гарантировать второй сундук (реликвия «Клубок», см. run.js#loadFloor).
export function generateFloor(depth, rng, opts = {}) {
  const cfg = BALANCE.dungeon;
  const cols = cfg.cols;
  const rows = cfg.rows;
  const grid = emptyGrid(cols, rows);

  let rooms = placeRooms(cols, rows, rng);
  if (rooms.length < 2) {
    // Крайне маловероятный крах генерации (тесная сетка) — фолбэк на два фиксированных
    // зала, чтобы этаж никогда не оказался непроходимым.
    rooms = [
      { x: 1, y: 1, w: 3, h: 3 },
      { x: cols - 4, y: rows - 4, w: 3, h: 3 }
    ];
  }
  for (const r of rooms) carveRoom(grid, r);
  for (let i = 1; i < rooms.length; i++) {
    const a = roomCenter(rooms[i - 1]);
    const b = roomCenter(rooms[i]);
    carveCorridor(grid, a.x, a.y, b.x, b.y, rng);
  }

  const startRoom = rooms[0];
  const stairsRoom = rooms[rooms.length - 1];
  const playerStart = roomCenter(startRoom);
  const stairs = roomCenter(stairsRoom);

  const reserved = [playerStart, stairs];
  const boss = isBossFloor(depth) ? bossForFloor(depth) : null;

  // Враги
  const enemies = [];
  const tier = tierForFloor(depth);
  const pool = MONSTER_TIERS[tier];
  const targetCount = boss
    ? Math.max(1, Math.floor((cfg.enemiesBase + Math.floor(depth / cfg.enemiesPerFloors)) / 2))
    : Math.min(cfg.enemiesMax, cfg.enemiesBase + Math.floor(depth / cfg.enemiesPerFloors));

  // Кандидаты — клетки пола вне стартовой комнаты (чтобы первые шаги были безопасны).
  const startRoomTiles = new Set();
  for (let y = startRoom.y; y < startRoom.y + startRoom.h; y++) {
    for (let x = startRoom.x; x < startRoom.x + startRoom.w; x++) startRoomTiles.add(x + ',' + y);
  }
  let candidates = floorTilesExcluding(grid, reserved).filter((t) => !startRoomTiles.has(t.x + ',' + t.y));
  candidates = rng.shuffle(candidates);

  // Дальнобойные/тянущие враги (ranged/pull) держат дистанцию сами и не подходят, пока видят
  // игрока по прямой — несколько таких на одном этаже превращают бой в неизбежный обстрел со
  // всех сторон без внятного способа сблизиться (жалоба живого плейтеста: «непонятно, как их
  // победить»). Ограничиваем долю таких врагов на этаже, а не убираем совсем — держащий
  // дистанцию противник разнообразит бой, просто не должен доминировать в пачке.
  const meleePool = pool.filter((id) => !KITING_BEHAVIORS.includes(MONSTERS[id].behavior));
  const maxKiting = Math.max(1, Math.ceil(targetCount / 3));
  let kitingSpawned = 0;
  for (let i = 0; i < targetCount && i < candidates.length; i++) {
    const canKite = kitingSpawned < maxKiting || meleePool.length === 0;
    const monsterId = rng.pick(canKite ? pool : meleePool);
    if (KITING_BEHAVIORS.includes(MONSTERS[monsterId].behavior)) kitingSpawned++;
    enemies.push({ monsterId, x: candidates[i].x, y: candidates[i].y });
  }
  if (boss) {
    const bossPos = candidates[targetCount] || stairs;
    enemies.push({ monsterId: boss.id, x: bossPos.x, y: bossPos.y, isBoss: true });
  }

  // Сундуки
  const usedCells = new Set(enemies.map((e) => e.x + ',' + e.y));
  const chestCandidates = candidates.filter((t) => !usedCells.has(t.x + ',' + t.y));
  const chests = [];
  if (chestCandidates.length) {
    const first = chestCandidates[chestCandidates.length - 1];
    chests.push(first);
    usedCells.add(first.x + ',' + first.y);
    // rng.chance ВСЕГДА вызывается (даже когда opts.extraChest уже гарантирует второй сундук),
    // чтобы число обращений к ГСЧ не зависело от того, набрана реликвия или нет — иначе один и
    // тот же сид на одном и том же этаже давал бы разные последующие броски в зависимости от
    // состояния забега, что усложняет отладку детерминизма без всякой пользы.
    const rolledSecond = rng.chance(cfg.chestExtraChance);
    if ((opts.extraChest || rolledSecond) && chestCandidates.length > 1) {
      const second = chestCandidates[chestCandidates.length - 2];
      if (!usedCells.has(second.x + ',' + second.y)) chests.push(second);
    }
  }

  return { cols, rows, grid, rooms, playerStart, stairs, enemies, chests, depth, isBossFloor: !!boss };
}

export function isWalkable(grid, x, y) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false;
  return grid[y][x] === FLOOR;
}

export const TILE = { WALL, FLOOR };
