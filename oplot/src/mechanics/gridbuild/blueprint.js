// Сборка базы из описания. Нужна и для вражеских крепостей, и позже для чертежей
// игрока, поэтому лежит в gridbuild и ничего не знает про уровни.

import { place } from './base.js';

// Правило опоры требует, чтобы блок под юнитом уже стоял, поэтому порядок в
// описании уровня не должен иметь значения: сортируем сами. Блоки первыми,
// внутри каждой группы — снизу вверх.
export function applyBlueprint(base, cells) {
  let sorted = [...cells].filter(c => Array.isArray(c) && c.length >= 4).sort((a, b) => {
    if (a[2] !== b[2]) return a[2] === 'block' ? -1 : 1;
    return a[1] - b[1];
  });

  let placed = 0;
  let rejected = [];
  // A bridge may grow from its RIGHT support. Retry unsupported cells until
  // no progress is possible; a single bottom-up pass loses valid saved cells.
  while (sorted.length) {
    const pending = [];
    rejected = [];
    let changed = false;
    for (const entry of sorted) {
      const [x, y, kind, typeId, paidWithBonus] = entry;
      const r = place(base, x, y, kind, typeId);
      if (r.ok) {
        placed++; changed = true;
        if (paidWithBonus === true) base.cells.get(`${x},${y}`).paidWithBonus = true;
      } else {
        pending.push(entry);
        rejected.push({ x, y, kind, typeId, reason: r.reason });
      }
    }
    if (!changed) break;
    sorted = pending;
  }
  return { placed, rejected };
}
