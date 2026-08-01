// SHELL-GAME («напёрстки») — замкнутый движок мини-игры (кандидат в library).
// Не знает ни про «тюрьму», ни про Phaser. Предмет под одной из кружек; кружки тасуются
// последовательностью обменов; игрок выбирает кружку. Угадал — раунд засчитан, мимо — минус жизнь.
//
// Движок отдаёт сцене, ЧТО анимировать (стартовый слот + список обменов), и проверяет выбор
// по итоговому слоту. Победа: набрал rounds угадываний. Провал: кончились жизни.

const DEFAULTS = { cups: 3, rounds: 3, lives: 3, swapsBase: 4, swapsGrow: 2 };

export function createShellGame(config = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const { cups } = cfg;
  const rng = config.rng || Math.random;

  const state = {
    ballIndex: 0,          // итоговый слот предмета (для проверки выбора)
    round: 0, roundsTotal: cfg.rounds,
    lives: cfg.lives, livesTotal: cfg.lives,
    over: null,            // { win } | { lose }
    reveal: { start: 0, swaps: [] }, // что показать/анимировать в этом раунде
  };

  const swapsFor = (round) => cfg.swapsBase + round * cfg.swapsGrow;

  function pair() {
    const i = Math.floor(rng() * cups) % cups;
    let j = Math.floor(rng() * (cups - 1)) % (cups - 1);
    if (j >= i) j += 1;
    return [i, j];
  }

  function newRound() {
    const start = Math.floor(rng() * cups) % cups;
    let ball = start;
    const swaps = [];
    const n = swapsFor(state.round);
    for (let k = 0; k < n; k++) {
      const [i, j] = pair();
      swaps.push([i, j]);
      if (ball === i) ball = j;
      else if (ball === j) ball = i;
    }
    state.ballIndex = ball;
    state.reveal = { start, swaps };
  }

  function snapshot() {
    return {
      ballIndex: state.ballIndex,
      round: state.round, roundsTotal: state.roundsTotal,
      lives: state.lives, livesTotal: state.livesTotal,
      over: state.over ? { ...state.over } : null,
      reveal: { start: state.reveal.start, swaps: state.reveal.swaps.map((s) => s.slice()) },
      cups,
    };
  }

  function start() {
    state.round = 0; state.lives = cfg.lives; state.over = null;
    newRound();
    return snapshot();
  }

  // Игрок выбрал слот. Угадал — раунд засчитан; иначе минус жизнь.
  function pick(slot) {
    if (state.over) return { correct: false, over: state.over, state: snapshot() };
    const correct = slot === state.ballIndex;
    if (correct) {
      state.round += 1;
      if (state.round >= state.roundsTotal) state.over = { win: true };
      else newRound();
    } else {
      state.lives -= 1;
      if (state.lives <= 0) state.over = { lose: true };
    }
    return { correct, over: state.over, state: snapshot() };
  }

  return {
    start, pick,
    get state() { return snapshot(); },
    get cups() { return cups; },
  };
}
