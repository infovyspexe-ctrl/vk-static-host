// Граф опор и обрушение. Считается детерминированно, без физдвижка:
// исход боя обязан быть воспроизводимым (повторы, ежедневное испытание,
// бот-симулятор баланса). Красивое кувыркание обломков — забота отрисовки,
// на исход она не влияет.

import { cellKey, hasGround } from './base.js';

// Клетка имеет опору, если: стоит на платформе (y === 1),
// либо клетка под ней имеет опору, либо соседняя в том же ряду имеет опору.
// Третье правило позволяет строить перекрытия на стойках.
export function groundedKeys(base) {
  const grounded = new Set();
  const queue = [];

  for (const cell of base.cells.values()) {
    if (cell.y === 1 && hasGround(base,cell.x) && cell.kind === 'block') {
      grounded.add(cellKey(cell.x, cell.y));
      queue.push(cell);
    }
  }

  while (queue.length > 0) {
    const cell = queue.pop();
    const neighbours = [[cell.x,cell.y+1],[cell.x,cell.y-1],[cell.x-1,cell.y],[cell.x+1,cell.y]];
    for (const [nx, ny] of neighbours) {
      const key = cellKey(nx, ny);
      if (grounded.has(key)) continue;
      const neighbour = base.cells.get(key);
      if (!neighbour || neighbour.kind !== 'block') continue;
      grounded.add(key);
      queue.push(neighbour);
    }
  }

  // Юниты не несут конструкцию, но сами устойчивы на платформе или поверх
  // уже заземлённого блока.
  for (const cell of base.cells.values()) {
    if (cell.kind !== 'unit') continue;
    if(cell.objectId)continue;
    if ((cell.y === 1 && hasGround(base,cell.x)) || (base.cells.get(cellKey(cell.x,cell.y-1))?.kind==='block' && grounded.has(cellKey(cell.x, cell.y - 1)))) {
      grounded.add(cellKey(cell.x, cell.y));
    }
  }

  // A rigid objective needs a grounded floor under its entire bottom edge.
  // Its internal cells never act as structural blocks for another object.
  const groups=new Map();
  for(const c of base.cells.values())if(c.objectId){
    if(!groups.has(c.objectId))groups.set(c.objectId,[]);
    groups.get(c.objectId).push(c);
  }
  for(const cells of groups.values()){
    if(cells.length!==cells[0].objectWidth*cells[0].objectHeight)continue;
    const bottom=Math.min(...cells.map(c=>c.y));
    if(cells.filter(c=>c.y===bottom).every(c=>(bottom===1&&hasGround(base,c.x))||(base.cells.get(cellKey(c.x,bottom-1))?.kind==='block'&&grounded.has(cellKey(c.x,bottom-1)))))
      for(const c of cells)grounded.add(cellKey(c.x,c.y));
  }

  return grounded;
}

export function collapse(base) {
  const grounded = groundedKeys(base);
  const fallen = [];

  for (const [key, cell] of base.cells) {
    if (!grounded.has(key)) fallen.push(cell);
  }

  // Порядок детерминирован: снизу вверх, слева направо.
  fallen.sort((a, b) => (a.y - b.y) || (a.x - b.x));

  const keys = fallen.map(cell => cellKey(cell.x, cell.y));
  for (const key of keys) base.cells.delete(key);

  return { fallen: keys };
}
