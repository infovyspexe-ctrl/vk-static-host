// LANE-RUNNER — замкнутый движок мини-игры (кандидат в library).
// Не знает ни про «тюрьму», ни про Phaser. Работает с сеткой, героем, сердцами и целью.
//
// Ряды карт наезжают вниз к герою в нижней «дорожке». Герой СТОИТ на месте, пока игрок его не
// двинет: move('left'/'right') делает шаг на одну колонку и останавливается (тап/клавиша). Когда
// ряд доезжает до героя (нижний ряд поля), срабатывает клетка в его колонке.
//
// Управление раньше было «автодрейф + тап меняет направление» — игрок не чувствовал контроля
// («герой бегает сам, я ничего не делаю», жалоба с живого прохождения). Прямой шаг это чинит:
// без ввода герой стоит в центре и почти всегда проигрывает — выигрыш требует действий игрока.
//
// Ячейка: 'empty' | 'dark' | 'light' | 'sign'.
//   dark  — урон (или гасит щит), light — удар по цели, sign — включает эффект (щит), empty — ничего.
// Победа: hits >= goalHits. Провал: hp <= 0.

// weights — доля клеток каждого типа в ряду, остаток до 1 — пусто. Раньше было плотно
// (dark .30 / light .25 / sign .05 → ~60% клеток заняты), и поле читалось как забитая
// головоломка, а не как «сверху летят окорочка»: игрок не понимал, что ловить и куда идти.
// Разреженный ряд (в среднем ~1.5 предмета на 5 колонок, преобладает light) сразу читается
// как дорожки с падающими предметами. Тема может переопределить weights через tuning.
const DEFAULTS = {
  cols: 5, rows: 6, playerHP: 5, goalHits: 8, signEffect: 'shield',
  weights: { dark: 0.11, light: 0.19, sign: 0.04 },
};

export function createLaneRunner(config = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const { cols, rows, playerHP, goalHits } = cfg;
  const rng = config.rng || Math.random;
  const w = cfg.weights;

  // Генератор ряда: разреженный, преобладают окорочка; гарантирует ≥1 не-тёмную клетку
  // (ряд всегда проходим) и не даёт целиком пустых рядов (иначе тик-пустышка без смысла).
  const rowGen = config.rowGen || function defaultRowGen(_rowIndex, r) {
    const row = [];
    for (let i = 0; i < cols; i++) {
      const x = r();
      if (x < w.dark) row.push('dark');
      else if (x < w.dark + w.light) row.push('light');
      else if (x < w.dark + w.light + w.sign) row.push('sign');
      else row.push('empty');
    }
    if (row.every((c) => c === 'dark')) row[Math.floor(r() * cols)] = 'light';
    if (row.every((c) => c === 'empty')) row[Math.floor(r() * cols)] = 'light';
    return row;
  };

  const state = {
    player: { col: Math.floor(cols / 2) },
    board: [],            // сверху вниз: board[0] — верхний ряд, board[rows-1] — нижний (у героя)
    hp: playerHP,
    hits: 0,
    shield: false,
    tick: 0,
    over: null,           // { win: true } | { lose: true }
    cols, rows, goalHits, playerHP,
  };

  function snapshot() {
    return {
      player: { ...state.player },
      board: state.board.map((r) => r.slice()),
      hp: state.hp, hits: state.hits, shield: state.shield, tick: state.tick,
      over: state.over ? { ...state.over } : null,
      cols, rows, goalHits, playerHP,
    };
  }

  function start() {
    state.board = [];
    for (let i = 0; i < rows; i++) state.board.push(rowGen(i, rng));
    state.player = { col: Math.floor(cols / 2) };
    state.hp = playerHP; state.hits = 0; state.shield = false; state.tick = 0; state.over = null;
    return snapshot();
  }

  // Прямой шаг игрока: одна колонка в сторону, стоп у стены (без отскока).
  function move(dir) {
    const d = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
    state.player.col = Math.max(0, Math.min(cols - 1, state.player.col + d));
    return snapshot();
  }

  // Подобрать окорочок в колонке ПРЯМО СЕЙЧАС, не дожидаясь тика. Нужно, чтобы засчёт
  // работал, пока предмет проходит над героем, а не только в миг резолва тика: иначе
  // «метнулся за окорочком и вернулся» не срабатывает (жалоба с живого теста). Клетка
  // гасится в 'empty', так что step() её повторно не зачтёт. Тёмные/щит здесь не трогаем —
  // они по-прежнему срабатывают на тике (урон настигает на бите, уклонение — уводом).
  function grab(col) {
    if (state.over) return { caught: false, over: state.over };
    if (state.board[rows - 1][col] === 'light') {
      state.board[rows - 1][col] = 'empty';
      state.hits += 1;
      if (state.hits >= goalHits) state.over = { win: true };
      return { caught: true, over: state.over };
    }
    return { caught: false, over: null };
  }

  // Один тик: резолв нижнего ряда под героем, сдвиг поля вниз, проверка конца.
  // Герой на тике НЕ двигается — его двигает только игрок через move().
  function step() {
    if (state.over) return { resolved: null, state: snapshot(), over: state.over };
    state.tick += 1;

    // 1) резолв клетки нижнего ряда под героем
    const bottom = state.board[rows - 1];
    const cell = bottom[state.player.col];
    if (cell === 'dark') {
      if (state.shield) state.shield = false; // щит гасит один тёмный
      else state.hp -= 1;
    } else if (cell === 'light') {
      state.hits += 1;
    } else if (cell === 'sign') {
      if (cfg.signEffect === 'shield') state.shield = true;
    }

    // 2) сдвиг поля вниз: убрать нижний, добавить новый сверху
    state.board.pop();
    state.board.unshift(rowGen(state.tick, rng));

    // 3) конец
    if (state.hits >= goalHits) state.over = { win: true };
    else if (state.hp <= 0) state.over = { lose: true };

    return { resolved: cell, state: snapshot(), over: state.over };
  }

  return {
    start,
    step,
    move,
    grab,
    get state() { return snapshot(); },
    get cols() { return cols; },
    get rows() { return rows; },
  };
}
