// ФИЗИКА. Мир Matter.js: крынка (стены + пол) и плоды-круги.
// Слияния собираются здесь в очередь пар (двухфазный алгоритм из ТЗ, раздел 6):
// фаза 1 — на событиях коллизий пары только помечаются флагом mergedFlag,
// фаза 2 — Game.step() разбирает очередь и заменяет пары новыми плодами.
// Matter подключён глобальным скриптом из vendor/ (window.Matter).
import { CONFIG } from '../data/config.js';
import { FRUIT_SHAPES } from '../data/fruit-shapes.js';

const M = window.Matter;

export const Physics = {
  engine: null,
  world: null,
  pendingMerges: [],
  _nextId: 1,

  init() {
    this.engine = M.Engine.create({
      enableSleeping: false,
      positionIterations: CONFIG.SOLVER.positionIterations,
      velocityIterations: CONFIG.SOLVER.velocityIterations
    });
    this.world = this.engine.world;

    // Физические стены на всю высоту (плод не должен выпрыгнуть за крынку),
    // видимая часть стенок рисуется только от WALL_TOP_Y вниз.
    const wallH = CONFIG.H * 2;
    const left = M.Bodies.rectangle(
      CONFIG.INNER_LEFT - CONFIG.WALL_T / 2, CONFIG.H - wallH / 2,
      CONFIG.WALL_T, wallH, { isStatic: true, label: 'wall' });
    const right = M.Bodies.rectangle(
      CONFIG.INNER_RIGHT + CONFIG.WALL_T / 2, CONFIG.H - wallH / 2,
      CONFIG.WALL_T, wallH, { isStatic: true, label: 'wall' });
    const floor = M.Bodies.rectangle(
      CONFIG.W / 2, CONFIG.FLOOR_Y + CONFIG.WALL_T / 2,
      CONFIG.W, CONFIG.WALL_T, { isStatic: true, label: 'floor' });
    M.Composite.add(this.world, [left, right, floor]);

    // Пары одинаковых плодов собираем и на start, и на active: после спасения
    // или закатки соседние одинаковые плоды уже касаются, start больше не придёт.
    // ВАЖНО: вогнутый контур — составное тело, и Matter в парах отдаёт его
    // ЧАСТИ (без label и plugin) — поднимаемся к родителю.
    const collect = (event) => {
      for (const pair of event.pairs) {
        this._tryQueueMerge(pair.bodyA.parent || pair.bodyA, pair.bodyB.parent || pair.bodyB);
      }
    };
    M.Events.on(this.engine, 'collisionStart', collect);
    M.Events.on(this.engine, 'collisionActive', collect);
  },

  _tryQueueMerge(a, b) {
    if (a.label !== 'fruit' || b.label !== 'fruit') return;
    const fa = a.plugin.fruit, fb = b.plugin.fruit;
    if (fa.branch !== fb.branch || fa.rank !== fb.rank) return;
    if (fa.mergedFlag || fb.mergedFlag) return;
    // Лимит пар за шаг: лишнюю пару не помечаем — она сольётся на следующем шаге.
    if (this.pendingMerges.length >= CONFIG.MERGE_LIMIT_PER_STEP) return;
    fa.mergedFlag = true;
    fb.mergedFlag = true;
    this.pendingMerges.push([a, b]);
  },

  // Забрать накопленные пары (очередь очищается).
  takeMerges() {
    if (!this.pendingMerges.length) return [];
    const list = this.pendingMerges;
    this.pendingMerges = [];
    return list;
  },

  spawnFruit(branch, rank, x, y, opts = {}) {
    const f = CONFIG.FRUITS[branch][rank];
    const options = {
      ...CONFIG.BODY,
      label: 'fruit',
      plugin: {
        fruit: {
          branch,
          rank,
          id: this._nextId++,
          mergedFlag: false,
          bornAt: performance.now(),
          spawnAt: performance.now() // для анимации появления в рендере
        }
      }
    };
    // Форма тела, по убыванию точности:
    // 1) FRUIT_SHAPES — контур конкретного плода, снятый с его спрайта
    //    (data/fruit-shapes.js, правится в tools/shape-editor.html): физика и
    //    слияния идут ровно по видимому «твёрдому» силуэту, листья не в счёт;
    // 2) эллипс по aspect; 3) круг. Вогнутость разбирает poly-decomp (vendor).
    let body;
    const shape = FRUIT_SHAPES[branch + '_' + rank];
    const a = f.aspect;
    if (shape && shape.length >= 6) {
      let verts = shape.map((p) => ({ x: p[0] * f.radius, y: p[1] * f.radius }));
      // Страховка после ручной правки: слипшиеся соседние точки (в т.ч. первая
      // с последней) дают вырожденные рёбра и валят poly-decomp.
      const minGap = f.radius * 0.03;
      verts = verts.filter((v, i) => {
        const prev = verts[(i - 1 + verts.length) % verts.length];
        return i === 0 || Math.hypot(v.x - prev.x, v.y - prev.y) > minGap;
      });
      if (Math.hypot(verts[0].x - verts[verts.length - 1].x,
                     verts[0].y - verts[verts.length - 1].y) <= minGap) verts.pop();
      body = M.Bodies.fromVertices(x, y, [verts], options);
      // fromVertices ставит тело центроидом в (x,y), а арт рисуется от центра
      // спрайта — запоминаем смещение центра спрайта в локальных осях тела.
      const c = M.Vertices.centre(verts);
      body.plugin.fruit.artDx = -c.x;
      body.plugin.fruit.artDy = -c.y;
    } else if (a && Math.abs(a - 1) > 0.04) {
      const semiX = a >= 1 ? f.radius : f.radius * a;
      const semiY = a >= 1 ? f.radius / a : f.radius;
      const verts = [];
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * Math.PI * 2;
        verts.push({ x: semiX * Math.cos(t), y: semiY * Math.sin(t) });
      }
      body = M.Bodies.fromVertices(x, y, [verts], options);
    } else {
      body = M.Bodies.circle(x, y, f.radius, options);
    }
    if (opts.velocity) M.Body.setVelocity(body, opts.velocity);
    M.Composite.add(this.world, body);
    return body;
  },

  // Тело всё ещё в мире? (могло быть снято закаткой или спасением,
  // пока пара ждала разбора в очереди слияний)
  contains(body) {
    return !!M.Composite.get(this.world, body.id, 'body');
  },

  // «Поп» слияния: растолкать соседей от эпицентра. Сам новый плод стоит в
  // эпицентре (d = 0) и толчка не получает — его подбрасывает spawn velocity.
  popNeighbors(x, y, newRadius) {
    const R = newRadius + CONFIG.MERGE_POP.radius;
    for (const b of this.fruits()) {
      const dx = b.position.x - x, dy = b.position.y - y;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d > R) continue;
      const k = CONFIG.MERGE_POP.push * (1 - d / R);
      M.Body.setVelocity(b, {
        x: b.velocity.x + (dx / d) * k,
        y: b.velocity.y + (dy / d) * k - k * 0.3 // лёгкий подброс вверх
      });
    }
  },

  remove(bodies) {
    for (const b of Array.isArray(bodies) ? bodies : [bodies]) {
      M.Composite.remove(this.world, b);
    }
  },

  // Все плоды в мире.
  fruits() {
    return M.Composite.allBodies(this.world).filter((b) => b.label === 'fruit');
  },

  // Плод под точкой (для режима закатки в банку). Берём ближайший из накрытых.
  fruitAt(x, y) {
    let best = null, bestD = Infinity;
    for (const b of this.fruits()) {
      const f = CONFIG.FRUITS[b.plugin.fruit.branch][b.plugin.fruit.rank];
      const d = Math.hypot(b.position.x - x, b.position.y - y);
      // Небольшой допуск: палец не обязан попасть в круг пиксель в пиксель.
      if (d < f.radius + 18 && d < bestD) { best = b; bestD = d; }
    }
    return best;
  },

  clear() {
    this.remove(this.fruits());
    this.pendingMerges = [];
  },

  step(dtMs) {
    M.Engine.update(this.engine, dtMs);
  }
};
