// Выбор цели. Модуль замкнутый: таблица юнитов приходит параметром.
// Враг всегда стоит справа от игрока, между базами промежуток gap клеток.

export function worldX(side, x, layout) {
  return side === 'player' ? x : layout.playerWidth + layout.gap + x;
}

// Детерминированный порядок: слева направо, снизу вверх.
export function unitsOf(base) {
  const units = [];
  for (const cell of base.cells.values()) {
    if (cell.kind === 'unit') units.push(cell);
  }
  units.sort((a, b) => (a.x - b.x) || (a.y - b.y));
  return units;
}

// Дальности у юнитов нет: все достают до всей вражеской базы, как в референсе.
// Она была в первой редакции спеки и оказалась вредной — юниты, поставленные
// в глубине платформы, молча не стреляли вообще, а бой заходил в тупик, когда
// враг выбивал передние ряды (решение владельца 15.08, замер в NOTES.md).
//
// Позиция при этом продолжает значить: цель выбирается ближайшая, поэтому
// передние юниты принимают огонь первыми и работают живым щитом для задних.
export function pickTarget({ shooter, shooterSide, enemyBase, layout }) {
  const fromX = worldX(shooterSide, shooter.x, layout);
  const enemySide = shooterSide === 'player' ? 'enemy' : 'player';

  let best = null;
  let bestDistance = Infinity;

  for (const candidate of unitsOf(enemyBase)) {
    const distance = Math.abs(worldX(enemySide, candidate.x, layout) - fromX);
    // При равном расстоянии берём нижнего: по нему проще попасть,
    // и выбор становится однозначным. unitsOf уже отсортирован по y,
    // поэтому строгое сравнение сохраняет первого встреченного.
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

// То же правило цели, что и pickTarget (ближайший, при равенстве — нижний), но
// возвращает до count целей вместо одной. Использует unitsOf напрямую вместо
// повторных вызовов pickTarget — иначе O(count × N) обходов вместо одного O(N log N).
export function pickTargets({ shooter, shooterSide, enemyBase, layout, count }) {
  const fromX = worldX(shooterSide, shooter.x, layout);
  const enemySide = shooterSide === 'player' ? 'enemy' : 'player';

  const withDistance = unitsOf(enemyBase).map(candidate => ({
    candidate,
    distance: Math.abs(worldX(enemySide, candidate.x, layout) - fromX),
  }));
  withDistance.sort((a, b) => a.distance - b.distance);

  return withDistance.slice(0, count).map(e => e.candidate);
}
