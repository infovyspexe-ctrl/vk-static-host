// ЯДРО БОЯ. Чистая логика пошагового карточного боя: колода, рука, энергия, наговоры,
// намерения врагов. Про Phaser, картинки и конкретную игру не знает — сцена только рисует
// то, что здесь посчитано, и зовёт `playCard` / `endTurn`.
//
// Всё, что меняется от игры к игре (карты, враги, обереги), приходит СНАРУЖИ каталогом.
// Поэтому модуль замкнутый и переносится копированием папки (правило конвенций §3).
import { createRng } from './rng.js';
import { applyEffects } from './effects.js';
import { addStatus, getStatus, clearBlock, tickEndOfTurn, outgoingDamage } from './statuses.js';

let uidCounter = 1;
export function makeCard(id, upgraded = false) {
  return { uid: uidCounter++, id, upgraded: !!upgraded };
}
// Сейв возвращает карты с уже присвоенными uid — счётчик надо поднять, иначе новые
// карты получат номера, которые уже заняты, и «выжечь карту с uid X» выжжет не ту.
export function reserveUids(cards) {
  for (const c of cards) if (c.uid >= uidCounter) uidCounter = c.uid + 1;
}

// Разрешить значения карты с учётом улучшения: у улучшенной карты поля из `up` перекрывают
// базовые. Так одна запись в data/ описывает обе версии и они не расходятся.
export function cardView(def, upgraded) {
  if (!upgraded || !def.up) return def;
  return { ...def, ...def.up, up: undefined };
}

export function createCombat(config) {
  const {
    catalog,                 // { cards: {id:def}, enemies: {id:def}, relics: {id:def} }
    player,                  // { hp, maxHp, maxEnergy, handSize, relics: [id] }
    enemies: enemyIds,       // [id] — кого выставить
    deck,                    // [{uid,id,upgraded}] — колода забега
    seed,
    rngCalls = 0,
    hooks = {},              // { onLog(events) } — сцена подписывается на события боя
  } = config;

  const rng = createRng(seed, rngCalls);

  const state = {
    player: {
      name: 'player',
      hp: player.hp,
      maxHp: player.maxHp,
      block: 0,
      energy: 0,
      maxEnergy: player.maxEnergy ?? 3,
      handSize: player.handSize ?? 5,
      statuses: {},
      relics: (player.relics || []).slice(),
    },
    enemies: [],
    draw: [],
    hand: [],
    discard: [],
    exhaust: [],
    turn: 0,
    over: false,
    result: null,          // 'win' | 'lose'
    events: [],            // журнал последнего действия — сцена рисует по нему
    relicUses: {},         // сколько раз сработал оберег с ограничением
  };

  // ---- Враги ---------------------------------------------------------------
  enemyIds.forEach((id, i) => {
    const def = catalog.enemies[id];
    if (!def) throw new Error('нет описания врага: ' + id);
    const hp = rng.range(def.hpMin, def.hpMax);
    state.enemies.push({
      name: def.id,
      defId: id,
      slot: i,
      hp,
      maxHp: hp,
      block: 0,
      statuses: {},
      moveIdx: -1,
      moveRepeat: 0,
      intent: null,
    });
  });

  function log(ev) { state.events.push(ev); }

  // ---- Колода --------------------------------------------------------------
  function reshuffle() {
    if (!state.discard.length) return;
    state.draw = rng.shuffle(state.draw.concat(state.discard));
    state.discard = [];
    log({ type: 'reshuffle' });
  }

  function drawCards(n) {
    for (let i = 0; i < n; i++) {
      if (!state.draw.length) reshuffle();
      if (!state.draw.length) break;                 // карт нет вообще
      if (state.hand.length >= 10) break;            // потолок руки
      state.hand.push(state.draw.pop());
      log({ type: 'draw' });
    }
  }

  function addCard(cardId, to, count) {
    for (let i = 0; i < count; i++) {
      const c = makeCard(cardId, false);
      if (to === 'hand' && state.hand.length < 10) state.hand.push(c);
      else if (to === 'draw') {
        state.draw.splice(rng.int(state.draw.length + 1), 0, c);
      } else state.discard.push(c);
      log({ type: 'addCard', card: cardId, to });
    }
  }

  function discardRandom(n) {
    for (let i = 0; i < n && state.hand.length; i++) {
      const idx = rng.int(state.hand.length);
      state.discard.push(state.hand.splice(idx, 1)[0]);
      log({ type: 'discard' });
    }
  }

  function exhaustHand() {
    while (state.hand.length) state.exhaust.push(state.hand.pop());
    log({ type: 'exhaustHand' });
  }

  function ctxFor(source, target) {
    return { state, source, target, rng, log, drawCards, addCard, discardRandom, exhaustHand };
  }

  // ---- Обереги -------------------------------------------------------------
  // Оберег — те же данные-эффекты, но привязанные к событию боя, а не к карте.
  // `limit` ограничивает срабатывания за бой (иначе «+1 энергия при игре атаки»
  // превращает бой в бесконечный ход).
  function fireRelics(event, extra = {}) {
    for (const rid of state.player.relics) {
      const def = catalog.relics[rid];
      if (!def || def.on !== event) continue;
      if (def.cardType && extra.cardType !== def.cardType) continue;
      if (def.everyTurn && state.turn % def.everyTurn !== 0) continue;
      if (def.limit) {
        const used = state.relicUses[rid] || 0;
        if (used >= def.limit) continue;
        state.relicUses[rid] = used + 1;
      }
      applyEffects(ctxFor(state.player, extra.target || null), def.effects);
      log({ type: 'relic', relic: rid });
    }
  }

  // ---- Намерения врагов ----------------------------------------------------
  // Намерение выбирается ЗАРАНЕЕ и показывается игроку — вся тактика жанра держится на
  // том, что игрок видит, что будет, и решает: блокировать или добивать.
  function pickMove(enemy) {
    const def = catalog.enemies[enemy.defId];
    let idx;
    if (def.pattern && def.pattern.length) {
      enemy.patternPos = ((enemy.patternPos ?? -1) + 1) % def.pattern.length;
      idx = def.pattern[enemy.patternPos];
    } else {
      // Взвешенный выбор с запретом третьего повтора подряд: иначе враг «залипает»
      // на одном ходе и бой перестаёт читаться как поведение существа.
      const options = def.moves
        .map((m, i) => ({ i, w: m.weight ?? 1 }))
        .filter((o) => !(o.i === enemy.moveIdx && enemy.moveRepeat >= (def.maxRepeat ?? 2)));
      const chosen = rng.weighted(options.length ? options : def.moves.map((m, i) => ({ i, w: 1 })));
      idx = chosen.i;
    }
    enemy.moveRepeat = idx === enemy.moveIdx ? enemy.moveRepeat + 1 : 1;
    enemy.moveIdx = idx;
    enemy.intent = describeIntent(def.moves[idx], enemy);
  }

  // Что показать над врагом. Урон считается С УЧЁТОМ статусов на момент показа —
  // игрок должен видеть настоящее число, а не «в среднем по больнице»: наложил
  // слабость и сразу видишь, что удар ослаб. Ради этого намерение пересчитывается
  // после каждой сыгранной карты.
  function describeIntent(move, enemy) {
    let damage = 0;
    let times = 1;
    let kinds = [];
    for (const e of move.effects || []) {
      if (e.op === 'damage') { damage = outgoingDamage(e.value, enemy, state.player); times = e.times || 1; kinds.push('attack'); }
      else if (e.op === 'block') kinds.push('defend');
      else if (e.op === 'status') kinds.push(e.value > 0 && (e.to === 'self') ? 'buff' : 'debuff');
      else kinds.push('special');
    }
    const kind = kinds.includes('attack')
      ? (kinds.length > 1 ? 'attackDebuff' : 'attack')
      : (kinds[0] || 'special');
    return { kind, damage, times, move: move.name };
  }

  function refreshIntents() {
    for (const e of state.enemies) {
      if (e.hp <= 0 || !e.intent) continue;
      const def = catalog.enemies[e.defId];
      e.intent = describeIntent(def.moves[e.moveIdx], e);
    }
  }

  // ---- Ход игрока ----------------------------------------------------------
  // ПОСТОЯННЫЕ НАГОВОРЫ («силы») реализованы статусами, а не отдельным классом карт:
  //   guard     — в начале хода столько брони;
  //   energyUp  — столько энергии сверх обычной;
  //   extraDraw — столько карт добора сверх обычного;
  //   venom     — в конце хода столько яда всем врагам.
  // Так карта-«сила» остаётся чистыми данными в data/cards.js и не требует ни одной
  // функции снаружи движка — это то же решение, что «условие достижения = имя счётчика
  // + порог» в pizza-mafia: таблица остаётся таблицей.
  function startPlayerTurn() {
    state.turn++;
    // Сколько брони было к началу хода = остаток, который сейчас сгорит (если не Оберег).
    // Событие нужно сцене, чтобы ОДИН раз объяснить новичку правило «броня — щит на один
    // ход» ровно в момент, когда оно сработало (см. seenBlockTip в CombatScene).
    const carried = state.player.block || 0;
    clearBlock(state.player);
    if (carried > 0 && (state.player.block || 0) === 0) {
      log({ type: 'blockBurn', target: state.player, value: carried });
    }
    const guard = getStatus(state.player, 'guard');
    if (guard > 0) state.player.block = (state.player.block || 0) + guard;
    state.player.energy = state.player.maxEnergy + getStatus(state.player, 'energyUp');
    fireRelics('turnStart');
    drawCards(state.player.handSize + getStatus(state.player, 'extraDraw'));
    refreshIntents();
  }

  // Проверка «можно ли сыграть» отделена от самого розыгрыша: сцена красит карту
  // серым по тому же правилу, по которому движок отказывает, — расхождению неоткуда взяться.
  function canPlay(handIndex) {
    if (state.over) return false;
    const card = state.hand[handIndex];
    if (!card) return false;
    const def = cardView(catalog.cards[card.id], card.upgraded);
    if (!def) return false;
    if (def.unplayable) return false;
    return state.player.energy >= def.cost;
  }

  function playCard(handIndex, targetIndex) {
    if (!canPlay(handIndex)) return false;
    state.events = [];
    const card = state.hand[handIndex];
    const def = cardView(catalog.cards[card.id], card.upgraded);
    const target = state.enemies[targetIndex] && state.enemies[targetIndex].hp > 0
      ? state.enemies[targetIndex]
      : state.enemies.find((e) => e.hp > 0) || null;

    state.player.energy -= def.cost;
    state.hand.splice(handIndex, 1);

    applyEffects(ctxFor(state.player, target), def.effects);
    fireRelics('cardPlayed', { cardType: def.type, target });
    log({ type: 'played', card: card.id, upgraded: card.upgraded });

    if (def.exhaust) state.exhaust.push(card);
    else state.discard.push(card);

    cleanupDead();
    refreshIntents();
    checkOver();
    hooks.onLog && hooks.onLog(state.events);
    return true;
  }

  function cleanupDead() {
    for (const e of state.enemies) {
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        e.intent = null;
        fireRelics('kill', { target: e });
      }
    }
  }

  function checkOver() {
    if (state.over) return;
    if (state.player.hp <= 0) { state.over = true; state.result = 'lose'; }
    else if (state.enemies.every((e) => e.hp <= 0)) { state.over = true; state.result = 'win'; fireRelics('combatEnd'); }
  }

  // ---- Ход врагов ----------------------------------------------------------
  function endTurn() {
    if (state.over) return;
    state.events = [];

    // Сброс руки. Карты с `retain` остаются — без них колоды «накопить и ударить»
    // не существует как класса.
    const kept = [];
    while (state.hand.length) {
      const c = state.hand.pop();
      const def = cardView(catalog.cards[c.id], c.upgraded);
      if (def.retain) kept.push(c); else state.discard.push(c);
    }
    state.hand = kept;

    fireRelics('turnEnd');
    const venom = getStatus(state.player, 'venom');
    if (venom > 0) {
      for (const e of state.enemies) {
        if (e.hp > 0) { addStatus(e, 'poison', venom); log({ type: 'status', target: e, status: 'poison', value: venom }); }
      }
    }
    for (const ev of tickEndOfTurn(state.player)) log({ ...ev, target: state.player });
    checkOver();
    if (state.over) { hooks.onLog && hooks.onLog(state.events); return; }

    // Враги ходят по очереди. Оглушённый (stun) пропускает ход целиком.
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      clearBlock(e);
      if (getStatus(e, 'stun') > 0) {
        log({ type: 'stunned', target: e });
      } else {
        const def = catalog.enemies[e.defId];
        const move = def.moves[e.moveIdx];
        applyEffects(ctxFor(e, state.player), move.effects);
        log({ type: 'enemyMove', target: e, move: move.name });
      }
      for (const ev of tickEndOfTurn(e)) log({ ...ev, target: e });
      checkOver();
      if (state.over && state.result === 'lose') break;
    }

    cleanupDead();
    checkOver();
    if (state.over) { hooks.onLog && hooks.onLog(state.events); return; }

    for (const e of state.enemies) if (e.hp > 0) pickMove(e);
    startPlayerTurn();
    hooks.onLog && hooks.onLog(state.events);
  }

  // ---- Старт боя -----------------------------------------------------------
  function start() {
    state.draw = rng.shuffle(deck.map((c) => ({ ...c })));
    reserveUids(state.draw);
    fireRelics('combatStart');
    for (const e of state.enemies) pickMove(e);
    startPlayerTurn();
    hooks.onLog && hooks.onLog(state.events);
  }

  // Снимок для сохранения посреди боя. Забег живёт час — бой обязан переживать F5.
  function snapshot() {
    return {
      player: JSON.parse(JSON.stringify(state.player)),
      enemies: JSON.parse(JSON.stringify(state.enemies)),
      draw: state.draw.slice(), hand: state.hand.slice(),
      discard: state.discard.slice(), exhaust: state.exhaust.slice(),
      turn: state.turn, over: state.over, result: state.result,
      relicUses: { ...state.relicUses },
      rngCalls: rng.calls, seed: rng.seed,
    };
  }

  function restore(snap) {
    Object.assign(state.player, snap.player);
    state.enemies = snap.enemies;
    state.draw = snap.draw; state.hand = snap.hand;
    state.discard = snap.discard; state.exhaust = snap.exhaust;
    state.turn = snap.turn; state.over = snap.over; state.result = snap.result;
    state.relicUses = snap.relicUses || {};
    reserveUids(state.draw.concat(state.hand, state.discard, state.exhaust));
  }

  return {
    state, start, playCard, canPlay, endTurn, snapshot, restore, startPlayerTurn,
    cardDef: (card) => cardView(catalog.cards[card.id], card.upgraded),
    get rngCalls() { return rng.calls; },
  };
}
