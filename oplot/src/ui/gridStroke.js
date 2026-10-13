// Inclusive grid path: a fast mouse or touch move must not leave holes.
export function gridStroke(from, to) {
  const cells = [];
  let x = from.x, y = from.y;
  const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
  let error = dx - dy;
  while (true) {
    cells.push({x,y});
    if (x === to.x && y === to.y) return cells;
    const twice = 2 * error;
    if (twice > -dy) { error -= dy; x += sx; }
    if (twice < dx) { error += dx; y += sy; }
  }
}
