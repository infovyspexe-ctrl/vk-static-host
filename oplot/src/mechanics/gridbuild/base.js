// Сетка базы. Модуль замкнутый: ничего не знает ни о конкретных юнитах,
// ни о бое, ни об отрисовке. Таблицы приходят снаружи через catalog.
//
// Координаты: x от 0 до width-1, y от 1 и выше.
// Ряд y = 0 — платформа основания: она всегда есть, в cells не хранится
// и не разрушается. Юнит на y = 1 стоит на платформе.

export function cellKey(x, y) {
  return `${x},${y}`;
}

export function hasGround(base,x) { return !base.platformHoles?.includes(x); }

export function createBase({ width, catalog }) {
  return { width, catalog, cells: new Map() };
}

export function cellAt(base, x, y) {
  return base.cells.get(cellKey(x, y)) ?? null;
}

function tableFor(base, kind) {
  return kind === 'unit' ? base.catalog.units : base.catalog.blocks;
}

// Проверяет, связан ли блок с платформой непрерывной цепью блоков. Юниты
// намеренно не входят в граф: перекрытие может пройти над человеком, но не
// может держаться на нём.
function isGroundedBlock(base, start) {
  if (!start || start.kind !== 'block') return false;
  const seen = new Set([cellKey(start.x, start.y)]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.pop();
    if (cell.y === 1 && hasGround(base,cell.x)) return true;
    for (const [nx, ny] of [[cell.x-1,cell.y],[cell.x+1,cell.y],[cell.x,cell.y-1],[cell.x,cell.y+1]]) {
      const key = cellKey(nx, ny);
      const neighbour = cellAt(base, nx, ny);
      if (!seen.has(key) && neighbour?.kind === 'block') { seen.add(key); queue.push(neighbour); }
    }
  }
  return false;
}

export function canPlace(base, x, y, kind, typeId) {
  const fail = (reason) => ({ ok: false, reason });

  if (!Number.isInteger(x) || !Number.isInteger(y)) return fail('out-of-bounds');
  if (x < 0 || x >= base.width || y < 1) return fail('out-of-bounds');
  if (!tableFor(base, kind)[typeId]) return fail('unknown-type');
  if (cellAt(base, x, y)) return fail('occupied');

  if (kind === 'block' && (y > 1 || !hasGround(base,x))) {
    const supports = [cellAt(base, x, y-1), cellAt(base, x-1, y), cellAt(base, x+1, y)];
    if (!supports.some(cell => isGroundedBlock(base, cell))) return fail('no-support');
  } else if (kind === 'unit') {
    if (y > 1 || !hasGround(base,x)) {
      const below = cellAt(base, x, y - 1);
      if (!isGroundedBlock(base, below)) return fail('no-support');
    }
  }

  return { ok: true, reason: null };
}

export function place(base, x, y, kind, typeId) {
  const check = canPlace(base, x, y, kind, typeId);
  if (!check.ok) return { ok: false, cost: 0, reason: check.reason };

  const spec = tableFor(base, kind)[typeId];
  base.cells.set(cellKey(x, y), { kind, typeId, hp: spec.hp, x, y });
  return { ok: true, cost: spec.cost, reason: null };
}

export function buildCost(base) {
  let total = 0;
  for (const cell of base.cells.values()) {
    total += tableFor(base, cell.kind)[cell.typeId].cost;
  }
  return total;
}

function costOf(base, cell) {
  return tableFor(base, cell.kind)[cell.typeId].cost;
}

export function erase(base, x, y) {
  const cell = cellAt(base, x, y);
  if (!cell) return { ok: false, refund: 0, orphanedUnits: [] };

  base.cells.delete(cellKey(x, y));
  let refund = costOf(base, cell);

  // Юнит прямо над стёртым блоком повисает в воздухе, чего правила не допускают.
  // Снимаем его и возвращаем деньги: молча оставить нельзя, молча съесть — обидно.
  // Цепочки не бывает: юнит на юните запрещён при размещении.
  const orphanedUnits = [];
  const above = cellAt(base, x, y + 1);
  if (cell.kind === 'block' && above && above.kind === 'unit') {
    base.cells.delete(cellKey(x, y + 1));
    refund += costOf(base, above);
    orphanedUnits.push(cellKey(x, y + 1));
  }

  return { ok: true, refund, orphanedUnits };
}
