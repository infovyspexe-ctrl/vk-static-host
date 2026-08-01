// TIMING-BAR — замкнутый движок мини-игры «попади в зону» (кандидат в library).
// Не знает ни про «тюрьму», ни про Phaser. Бегунок ходит по полоске [0..1], игрок фиксирует;
// попал в целевую зону — раунд засчитан, промах — минус жизнь. Зона сужается, бегунок ускоряется.
//
// Победа: набрал rounds успешных фиксаций. Провал: кончились жизни.

const DEFAULTS = {
  rounds: 3,          // сколько удачных фиксаций нужно для победы
  lives: 3,           // сколько промахов допустимо
  baseZone: 0.24,     // ширина зоны на 1-м раунде (доля полоски)
  minZone: 0.10,      // минимальная ширина зоны
  zoneShrink: 0.04,   // на сколько сужается зона за раунд
  speed: 0.85,        // скорость бегунка (доля полоски в секунду)
  speedGrow: 0.12,    // прирост скорости за раунд
};

export function createTimingBar(config = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const rng = config.rng || Math.random;

  const state = {
    pos: 0, dir: 1,
    round: 0, roundsTotal: cfg.rounds,
    lives: cfg.lives, livesTotal: cfg.lives,
    zoneMin: 0, zoneMax: cfg.baseZone,
    over: null, // { win } | { lose }
  };

  const speedFor = (round) => cfg.speed + round * cfg.speedGrow;
  const widthFor = (round) => Math.max(cfg.minZone, cfg.baseZone - round * cfg.zoneShrink);

  function newZone() {
    const w = widthFor(state.round);
    const min = rng() * (1 - w);
    state.zoneMin = min;
    state.zoneMax = min + w;
  }

  function snapshot() {
    return {
      pos: state.pos, dir: state.dir,
      round: state.round, roundsTotal: state.roundsTotal,
      lives: state.lives, livesTotal: state.livesTotal,
      zoneMin: state.zoneMin, zoneMax: state.zoneMax,
      over: state.over ? { ...state.over } : null,
    };
  }

  function start() {
    state.pos = 0; state.dir = 1; state.round = 0; state.lives = cfg.lives; state.over = null;
    newZone();
    return snapshot();
  }

  // Продвинуть бегунок на dt секунд с отскоком от краёв [0..1].
  function advance(dt) {
    if (state.over) return snapshot();
    state.pos += state.dir * speedFor(state.round) * dt;
    while (state.pos < 0 || state.pos > 1) {
      if (state.pos > 1) { state.pos = 2 - state.pos; state.dir = -1; }
      if (state.pos < 0) { state.pos = -state.pos; state.dir = 1; }
    }
    return snapshot();
  }

  // Зафиксировать. Попал в зону — раунд засчитан; иначе минус жизнь.
  function lock() {
    if (state.over) return { hit: false, over: state.over, state: snapshot() };
    const hit = state.pos >= state.zoneMin && state.pos <= state.zoneMax;
    if (hit) {
      state.round += 1;
      if (state.round >= state.roundsTotal) state.over = { win: true };
      else newZone();
    } else {
      state.lives -= 1;
      if (state.lives <= 0) state.over = { lose: true };
    }
    return { hit, over: state.over, state: snapshot() };
  }

  return {
    start, advance, lock,
    get state() { return snapshot(); },
  };
}
