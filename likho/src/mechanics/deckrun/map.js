// КАРТА УРОЧИЩА — ветвящийся граф узлов, по которому игрок сам выбирает маршрут.
//
// Это, а не бой, делает забег «своим»: игрок решает, идти ли через элиту ради оберега или
// тихо дойти до костра. Правила генерации взяты из разбора жанрового канона (Slay the Spire
// Map Generation, wiki.gg / Steam guide) — оттуда же взяты и грабли:
//   1. Стартовых узлов обязано быть минимум ДВА, иначе выбор начинается только со второго
//      этажа и первое решение отбирают у игрока.
//   2. Пути НЕ ПЕРЕСЕКАЮТСЯ. Без этого правила линии на экране путаются: игрок ведёт
//      пальцем по своей ветке и попадает в чужую.
//   3. Фиксированные этажи (сокровище, костёр перед боссом) — не украшение, а ритм: без
//      гарантированного отдыха перед боссом забег превращается в лотерею.
// Портретный экран 720 px: колонок 4, а не 7 — иначе узлы сливаются на телефоне.
import { createRng } from './rng.js';

export const NODE = {
  COMBAT: 'combat',
  ELITE: 'elite',
  REST: 'rest',
  SHOP: 'shop',
  EVENT: 'event',
  TREASURE: 'treasure',
  BOSS: 'boss',
};

const COLS = 4;

// Веса обычных узлов. Сумма не обязана быть 100 — выбор взвешенный.
const WEIGHTS = [
  { type: NODE.COMBAT, w: 45 },
  { type: NODE.EVENT, w: 22 },
  { type: NODE.ELITE, w: 16 },
  { type: NODE.REST, w: 16 },
  { type: NODE.SHOP, w: 8 },
];

export function generateMap({ seed, rngCalls = 0, floors = 12, paths = 4, act = 1 }) {
  const rng = createRng(seed, rngCalls);

  // ---- 1. Прокладка путей ---------------------------------------------------
  const used = new Set();                 // 'f:c' — узел существует
  const edges = new Map();                // 'f:c' -> Set('f+1:c2')
  const edgeKeys = new Set();             // 'f:c>f+1:c2' — для проверки пересечений
  const starts = [];

  const key = (f, c) => f + ':' + c;
  const addEdge = (f, c, c2) => {
    const from = key(f, c);
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from).add(key(f + 1, c2));
    edgeKeys.add(from + '>' + key(f + 1, c2));
  };

  for (let p = 0; p < paths; p++) {
    let c = rng.int(COLS);
    // Требование «минимум два разных старта»: второй путь обязан начаться в другой колонке.
    if (p === 1) {
      let guard = 0;
      while (c === starts[0] && guard++ < 20) c = rng.int(COLS);
    }
    starts.push(c);
    used.add(key(0, c));

    for (let f = 0; f < floors - 2; f++) {
      const options = [];
      for (const d of [-1, 0, 1]) {
        const c2 = c + d;
        if (c2 < 0 || c2 >= COLS) continue;
        // Запрет пересечения: наш путь идёт c → c2 «наискось», а встречный уже
        // проложен c2 → c на этом же этаже. Две линии пересеклись бы крестом.
        if (d !== 0 && edgeKeys.has(key(f, c2) + '>' + key(f + 1, c))) continue;
        options.push(c2);
      }
      const c2 = options.length ? options[rng.int(options.length)] : c;
      addEdge(f, c, c2);
      c = c2;
      used.add(key(f + 1, c));
    }
  }

  // ---- 2. Предпоследний этаж и босс ----------------------------------------
  // Предпоследний этаж — костёр, и все ветки сходятся на боссе.
  const restFloor = floors - 2;
  const bossFloor = floors - 1;
  for (let c = 0; c < COLS; c++) {
    if (used.has(key(restFloor, c))) addEdge(restFloor, c, 0);
  }
  used.add(key(bossFloor, 0));

  // ---- 3. Раздача типов -----------------------------------------------------
  const types = new Map();
  const treasureFloor = Math.floor(floors / 2) - 1;   // сокровище ровно посередине

  for (let f = 0; f < floors; f++) {
    // Разнообразие ВНУТРИ этажа: каждая колонка раньше каталась по весам независимо
    // от соседей, и на удачливом ГСЧ весь этаж мог выпасть стеной из четырёх костров
    // подряд — выбор развилки тогда ничего не решает, все ветки ведут к тому же самому
    // (жалоба живого игрока 22.08, со скриншотом). Начиная со второго узла на этаже
    // избегаем типов, уже занятых соседями по ЭТОМУ ЖЕ этажу, пока в пуле есть из чего
    // выбрать — попытка не гарантия: если после всех запретов пул пуст, откатываемся
    // на полный список, а не ломаем генерацию ошибкой.
    const floorTypes = new Set();
    for (let c = 0; c < COLS; c++) {
      const k = key(f, c);
      if (!used.has(k)) continue;
      if (f === bossFloor) { types.set(k, NODE.BOSS); continue; }
      if (f === restFloor) { types.set(k, NODE.REST); continue; }
      if (f === treasureFloor) { types.set(k, NODE.TREASURE); continue; }
      if (f === 0) { types.set(k, NODE.COMBAT); continue; }  // первый бой всегда лёгкий
      if (f === 1) { types.set(k, NODE.COMBAT); continue; }

      // Ограничения, каждое из которых защищает от конкретной поломки ритма:
      const banned = new Set();
      if (f < 4 && act === 1) banned.add(NODE.ELITE);   // элита в первых боях — обрыв забега
      if (f === treasureFloor + 1) banned.add(NODE.REST); // отдых сразу после сундука бессмыслен
      // Два костра (или два торговца) подряд по одному пути — потеря этажа: второй уже нечем
      // занять. Смотрим на предков этого узла.
      for (const [from, tos] of edges) {
        if (!tos.has(k)) continue;
        const t = types.get(from);
        if (t === NODE.REST || t === NODE.SHOP || t === NODE.ELITE) banned.add(t);
      }

      const pool = WEIGHTS.filter((x) => !banned.has(x.type));
      const diversified = pool.filter((x) => !floorTypes.has(x.type));
      const chosen = (rng.weighted(diversified.length ? diversified : pool) || WEIGHTS[0]).type;
      types.set(k, chosen);
      floorTypes.add(chosen);
    }
  }

  // ---- 4. Сборка результата -------------------------------------------------
  const nodes = [];
  for (let f = 0; f < floors; f++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const k = key(f, c);
      if (!used.has(k)) continue;
      row.push({
        id: k, floor: f, col: c, type: types.get(k),
        next: Array.from(edges.get(k) || []),
      });
    }
    nodes.push(row);
  }

  return { act, floors, cols: COLS, nodes, rngCalls: rng.calls };
}

// Узел по id — сцена и логика обращаются к карте только через это.
export function findNode(map, id) {
  for (const row of map.nodes) for (const n of row) if (n.id === id) return n;
  return null;
}

// Куда можно шагнуть из текущего положения. `null` = забег только начался,
// доступен весь первый этаж.
export function availableNodes(map, currentId) {
  if (!currentId) return map.nodes[0].map((n) => n.id);
  const n = findNode(map, currentId);
  return n ? n.next.slice() : [];
}
