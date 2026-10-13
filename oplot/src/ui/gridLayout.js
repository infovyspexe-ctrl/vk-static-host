// Перевод координат сетки в экранные и обратно. Чистая арифметика без Phaser,
// поэтому проверяется тестами, а не глазами в браузере.
//
// Система координат сетки: x от 0 вправо, y от 1 вверх. Ряд y = 0 — платформа,
// в клетках не хранится. На экране ось y смотрит вниз, поэтому рост y — это
// уменьшение экранной координаты.

export function createLayout({ screenWidth, screenHeight, playerWidth, gap, fieldTop, fieldBottom }) {
  const totalCells = playerWidth * 2 + gap;
  // Клетка должна влезть и по ширине (две базы плюс промежуток), и по высоте
  // (сколько ярусов помещается между fieldTop и fieldBottom). Берём меньшее.
  const byWidth = Math.floor(screenWidth / totalCells);
  const byHeight = Math.floor((fieldBottom - fieldTop) / 10); // не меньше десяти ярусов в кадре
  const cellSize = Math.max(1, Math.min(byWidth, byHeight));

  const used = cellSize * totalCells;
  const playerOriginX = Math.round((screenWidth - used) / 2);
  const enemyOriginX = playerOriginX + (playerWidth + gap) * cellSize;

  return { cellSize, playerOriginX, enemyOriginX, groundY: fieldBottom, playerWidth, gap };
}

function originFor(layout, side) {
  return side === 'player' ? layout.playerOriginX : layout.enemyOriginX;
}

export function cellToScreen(layout, side, x, y) {
  const origin = originFor(layout, side);
  return {
    sx: origin + x * layout.cellSize + layout.cellSize / 2,
    sy: layout.groundY - (y - 1) * layout.cellSize - layout.cellSize / 2,
  };
}

export function screenToCell(layout, side, sx, sy) {
  const origin = originFor(layout, side);
  const x = Math.floor((sx - origin) / layout.cellSize);
  if (x < 0 || x >= layout.playerWidth) return null;

  // groundY — низ ряда y = 1. Всё, что ниже, — не клетка.
  const fromGround = layout.groundY - sy;
  if (fromGround <= 0) return null;
  const y = Math.floor(fromGround / layout.cellSize) + 1;

  return { x, y };
}
