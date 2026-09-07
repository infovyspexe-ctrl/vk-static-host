// СОСТОЯНИЕ ЗАБЕГА: три урочища, карта, колода, обереги, золото, здоровье.
// Бой живёт отдельно (`combat.js`) — здесь то, что между боями и переживает их.
//
// Модуль чистый: ни Phaser, ни сцен. Всё содержимое (карты, враги, обереги, события)
// приходит каталогом снаружи, поэтому забег можно прогнать ботом в тестах.
import { createRng } from './rng.js';
import { generateMap, findNode, availableNodes, NODE } from './map.js';
import { makeCard, reserveUids, cardView } from './combat.js';

// Шансы редкости в награде за бой. Обычный бой почти не даёт редкого — иначе колода
// собирается на третьем этаже и оставшийся час игрок доигрывает по инерции.
const REWARD_RARITY = {
  combat: [{ r: 'common', w: 62 }, { r: 'uncommon', w: 33 }, { r: 'rare', w: 5 }],
  elite: [{ r: 'common', w: 40 }, { r: 'uncommon', w: 42 }, { r: 'rare', w: 18 }],
  boss: [{ r: 'uncommon', w: 55 }, { r: 'rare', w: 45 }],
};

// Свод пассивных надбавок от оберегов (золото, скидка торговца, сила костра, выбор карт,
// максимум здоровья). Считается на лету: обереги добавляются по ходу забега, а кэш
// пришлось бы инвалидировать в четырёх местах — цена ошибки выше цены пересчёта.
export function relicPassives(catalog, relicIds) {
  const out = { goldMul: 1, shopDiscount: 1, restHeal: 0, cardChoice: 0, maxHp: 0 };
  for (const id of relicIds || []) {
    const p = catalog.relics[id] && catalog.relics[id].passive;
    if (!p) continue;
    if (p.goldMul) out.goldMul *= p.goldMul;
    if (p.shopDiscount) out.shopDiscount *= p.shopDiscount;
    if (p.restHeal) out.restHeal += p.restHeal;
    if (p.cardChoice) out.cardChoice += p.cardChoice;
    if (p.maxHp) out.maxHp += p.maxHp;
  }
  return out;
}

export function createRun({ catalog, acts, hero, seed, meta = {}, balance, rngCalls = 0 }) {
  // Поток ГСЧ перематывается на сохранённое число вызовов — иначе после перезагрузки
  // забег «переигрывает» уже потраченную случайность и награды расходятся с теми, что
  // игрок видел до F5. Ровно эта грабля стоила «Летописи» тихого расхождения колоды.
  const rng = createRng(seed, rngCalls);
  const heroDef = catalog.heroes[hero];
  if (!heroDef) throw new Error('нет героя: ' + hero);

  const state = {
    seed,
    hero,
    act: 1,
    maxHp: heroDef.maxHp + (meta.bonusHp || 0),
    hp: heroDef.maxHp + (meta.bonusHp || 0),
    gold: (heroDef.startGold ?? balance.START_GOLD) + (meta.bonusGold || 0),
    deck: [],
    relics: (meta.startRelics || []).slice(),
    map: null,
    currentId: null,
    node: null,              // текущий узел, в котором игрок находится
    pending: null,           // что показать игроку: { kind, payload }
    combatSnapshot: null,    // бой посреди узла — чтобы пережить перезагрузку
    stats: { combats: 0, elites: 0, bosses: 0, floors: 0, cardsTaken: 0, damageDealt: 0, maxDamage: 0 },
    usedEncounters: [],
    over: false,
    result: null,            // 'win' | 'lose'
    rngCalls: 0,
  };

  // Стартовая колода героя: список id, повторы задаются числом.
  for (const [id, count] of heroDef.startDeck) {
    for (let i = 0; i < count; i++) state.deck.push(makeCard(id, false));
  }
  if (meta.startRelics) state.relics = meta.startRelics.slice();
  if (heroDef.relic && !state.relics.includes(heroDef.relic)) state.relics.unshift(heroDef.relic);

  function newMap() {
    const m = generateMap({ seed: seed + state.act * 7919, act: state.act, floors: balance.FLOORS_PER_ACT });
    state.map = m;
    state.currentId = null;
    state.usedEncounters = [];
  }
  newMap();

  // ---- Выбор столкновения ---------------------------------------------------
  // Пул не повторяется, пока не кончился: три одинаковых боя подряд читаются как
  // «контент кончился», даже когда впереди ещё половина урочища.
  function pickEncounter(kind) {
    const actDef = acts[state.act - 1];
    let pool = actDef[kind];
    if (kind === 'combat') {
      // Первые два боя урочища — из лёгкого пула. Это не поблажка: игрок в них собирает
      // первые карты, и проигрыш на втором этаже отбивает желание начинать заново.
      pool = state.stats.combats < 2 && actDef.easy ? actDef.easy : actDef.combat;
    }
    const fresh = pool.filter((p) => !state.usedEncounters.includes(p.id));
    const chosen = rng.pick(fresh.length ? fresh : pool);
    state.usedEncounters.push(chosen.id);
    return chosen;
  }

  // ---- Награды --------------------------------------------------------------
  function rollCardReward(kind, count) {
    const picks = [];
    const pool = catalog.cardIds.filter((id) => {
      const d = catalog.cards[id];
      return d.rarity !== 'basic' && d.rarity !== 'curse' && (d.hero === 'all' || d.hero === hero);
    });
    let guard = 0;
    while (picks.length < count && guard++ < 200) {
      const rarity = rng.weighted(REWARD_RARITY[kind] || REWARD_RARITY.combat).r;
      const byRarity = pool.filter((id) => catalog.cards[id].rarity === rarity && !picks.includes(id));
      if (!byRarity.length) continue;
      picks.push(rng.pick(byRarity));
    }
    return picks;
  }

  function rollRelic(tier) {
    const owned = new Set(state.relics);
    const pool = catalog.relicIds.filter((id) => {
      const d = catalog.relics[id];
      return !owned.has(id) && !d.unique && (!tier || d.tier === tier);
    });
    if (!pool.length) {
      const any = catalog.relicIds.filter((id) => !owned.has(id));
      return any.length ? rng.pick(any) : null;
    }
    return rng.pick(pool);
  }

  // ---- Переходы -------------------------------------------------------------
  function canEnter(id) {
    return availableNodes(state.map, state.currentId).includes(id);
  }

  // Войти в узел. Возвращает описание того, что должна показать сцена.
  function enterNode(id) {
    if (state.over || !canEnter(id)) return null;
    const node = findNode(state.map, id);
    state.currentId = id;
    state.node = node;
    state.stats.floors++;
    state.combatSnapshot = null;

    switch (node.type) {
      case NODE.COMBAT:
      case NODE.ELITE:
      case NODE.BOSS: {
        const kind = node.type === NODE.COMBAT ? 'combat' : (node.type === NODE.ELITE ? 'elite' : 'boss');
        const enc = pickEncounter(kind);
        state.pending = { kind: 'combat', tier: kind, enemies: enc.enemies, encounterId: enc.id };
        break;
      }
      case NODE.REST:
        state.pending = { kind: 'rest' };
        break;
      case NODE.SHOP:
        state.pending = { kind: 'shop', stock: rollShop() };
        break;
      case NODE.TREASURE:
        state.pending = { kind: 'treasure', relic: rollRelic('common'), gold: rng.range(25, 45) };
        break;
      case NODE.EVENT:
        state.pending = { kind: 'event', event: pickEvent() };
        break;
      default:
        state.pending = null;
    }
    state.rngCalls = rng.calls;
    return state.pending;
  }

  function pickEvent() {
    const pool = catalog.eventIds.filter((id) => {
      const e = catalog.events[id];
      return !state.usedEncounters.includes('ev:' + id) && (!e.act || e.act === state.act);
    });
    const id = pool.length ? rng.pick(pool) : rng.pick(catalog.eventIds);
    state.usedEncounters.push('ev:' + id);
    return id;
  }

  function rollShop() {
    const disc = relicPassives(catalog, state.relics).shopDiscount;
    const cards = rollCardReward('combat', 4).map((id) => ({
      id,
      price: Math.round(catalog.cards[id].price * rng.range(90, 115) / 100 * disc),
    }));
    const relics = [];
    for (let i = 0; i < 2; i++) {
      const rid = rollRelic(null);
      if (rid && !relics.some((r) => r.id === rid)) {
        relics.push({ id: rid, price: Math.round(catalog.relics[rid].price * disc) });
      }
    }
    return {
      cards, relics,
      removePrice: Math.round(balance.SHOP_REMOVE_PRICE * disc),
      removed: false,
    };
  }

  // ---- Итоги боя ------------------------------------------------------------
  function finishCombat(win, playerHp, tier) {
    if (!win) {
      state.hp = 0;
      state.over = true;
      state.result = 'lose';
      return null;
    }
    state.hp = Math.max(1, playerHp);
    state.combatSnapshot = null;
    if (tier === 'combat') state.stats.combats++;
    if (tier === 'elite') { state.stats.elites++; state.stats.combats++; }
    if (tier === 'boss') { state.stats.bosses++; state.stats.combats++; }

    const pass = relicPassives(catalog, state.relics);
    const goldRange = balance.GOLD[tier];
    const gold = Math.round(rng.range(goldRange[0], goldRange[1]) * pass.goldMul);
    state.gold += gold;

    const reward = {
      gold,
      cards: rollCardReward(tier, balance.CARD_CHOICES + (meta.extraCardChoice ? 1 : 0) + pass.cardChoice),
      relic: tier === 'elite' ? rollRelic(null) : (tier === 'boss' ? rollRelic('rare') : null),
      // Лечение после хозяина урочища. 40%, а не символические 25%: следующее урочище
      // начинается сразу и бьёт сильнее, а гарантированного костра между актами нет —
      // на симуляции именно вход во второе урочище на остатках здоровья съедал больше
      // половины походов.
      heal: tier === 'boss' ? Math.floor(state.maxHp * 0.4) : 0,
    };
    if (reward.heal) state.hp = Math.min(state.maxHp, state.hp + reward.heal);
    state.pending = { kind: 'reward', reward };
    state.rngCalls = rng.calls;
    return reward;
  }

  // Узел разрешён (действие сделано) — снять pending, чтобы «Продолжить забег» после
  // перезагрузки шёл на карту, а не переспрашивал то же самое ещё раз.
  //
  // НАЙДЕНО ЖИВЫМ ИГРОКОМ 2026-08-22: у костра «pending» выставляется в enterNode() при
  // входе и НИГДЕ не снимается после «Отдохнуть» — саму механику (лечение, сейв) это не
  // трогает, обнуляется только УКАЗАТЕЛЬ «что показать при возврате». Кнопка «Продолжить
  // забег» в MenuScene читает именно pending.kind и при 'rest' снова открывает костёр —
  // поэтому reload сразу после лечения давал новое бесплатное лечение вместо перехода на
  // карту, и так можно было качать здоровье бесконечно. Та же дыра — у событий (Event):
  // выбор применяется, а pending остаётся 'event', и reload переоткрывает те же кнопки
  // выбора, то есть даёт повторно забрать награду события (или пересдать плохой исход).
  function clearPending() {
    state.pending = null;
  }

  // Босс урочища пройден — либо следующее урочище, либо победа в забеге.
  function advanceAct() {
    if (state.act >= acts.length) {
      state.over = true;
      state.result = 'win';
      return false;
    }
    state.act++;
    newMap();
    state.pending = null;
    return true;
  }

  // ---- Колода ---------------------------------------------------------------
  function addCardToDeck(id, upgraded = false) {
    const c = makeCard(id, upgraded);
    state.deck.push(c);
    state.stats.cardsTaken++;
    return c;
  }
  function removeCardFromDeck(uid) {
    const i = state.deck.findIndex((c) => c.uid === uid);
    if (i >= 0) return state.deck.splice(i, 1)[0];
    return null;
  }
  function upgradeCardInDeck(uid) {
    const c = state.deck.find((x) => x.uid === uid);
    if (!c || c.upgraded) return false;
    const def = catalog.cards[c.id];
    if (!def || !def.up) return false;
    c.upgraded = true;
    return true;
  }
  // Карты колоды, которые ЕСТЬ смысл улучшать — костёр не должен предлагать
  // уже улучшенные и неулучшаемые (проклятия): игрок жмёт и ничего не происходит.
  function upgradableCards() {
    return state.deck.filter((c) => !c.upgraded && catalog.cards[c.id] && catalog.cards[c.id].up);
  }

  function heal(amount) {
    state.hp = Math.min(state.maxHp, state.hp + amount);
  }
  function damage(amount) {
    state.hp = Math.max(0, state.hp - amount);
    if (state.hp <= 0) { state.over = true; state.result = 'lose'; }
  }
  function addMaxHp(amount) {
    state.maxHp += amount;
    state.hp = Math.min(state.maxHp, state.hp + Math.max(0, amount));
  }
  function addRelic(id) {
    if (!id || state.relics.includes(id)) return;
    state.relics.push(id);
    // Оберег на максимум здоровья обязан примениться СРАЗУ при подборе, а не считаться
    // «на лету»: иначе снятие такого оберега (событием) уронило бы текущее hp ниже
    // максимума задним числом, и игрок увидел бы, как у него отняли здоровье.
    const p = catalog.relics[id] && catalog.relics[id].passive;
    if (p && p.maxHp) addMaxHp(p.maxHp);
  }

  // Сколько лечит костёр с учётом оберегов.
  function restHealAmount() {
    const pass = relicPassives(catalog, state.relics);
    return Math.floor(state.maxHp * balance.REST_HEAL_PCT) + pass.restHeal;
  }
  function restHealAmountAd() {
    const pass = relicPassives(catalog, state.relics);
    return Math.floor(state.maxHp * balance.REST_AD_HEAL_PCT) + pass.restHeal;
  }

  // ---- События --------------------------------------------------------------
  // Исход выбора на событии — тот же приём «операции данными», что у карт. Возвращает
  // список произошедшего, чтобы сцена могла показать игроку, что именно случилось:
  // молчаливое «-6 максимума здоровья» игрок не замечает и считает игру сломанной.
  function applyEventOutcome(outcomes) {
    const done = [];
    for (const o of outcomes || []) {
      switch (o.op) {
        case 'gold': state.gold = Math.max(0, state.gold + o.value); done.push(o); break;
        case 'allGold': done.push({ op: 'gold', value: -state.gold }); state.gold = 0; break;
        case 'heal': heal(o.value); done.push(o); break;
        case 'healPct': {
          const v = Math.floor(state.maxHp * o.value);
          heal(v); done.push({ op: 'heal', value: v }); break;
        }
        case 'damage': damage(o.value); done.push(o); break;
        case 'maxHp': addMaxHp(o.value); done.push(o); break;
        case 'curse': addCardToDeck(o.card, false); done.push(o); break;
        case 'card': {
          const pool = catalog.cardIds.filter((id) => {
            const d = catalog.cards[id];
            return d.rarity === o.rarity && (d.hero === 'all' || d.hero === hero);
          });
          if (pool.length) { const id = rng.pick(pool); addCardToDeck(id, false); done.push({ op: 'card', card: id }); }
          break;
        }
        case 'relic': {
          const id = rollRelic(o.tier || null);
          if (id) { addRelic(id); done.push({ op: 'relic', relic: id }); }
          break;
        }
        case 'upgrade': {
          for (let i = 0; i < (o.value || 1); i++) {
            const pool = upgradableCards();
            if (!pool.length) break;
            const c = rng.pick(pool);
            upgradeCardInDeck(c.uid);
            done.push({ op: 'upgrade', card: c.id });
          }
          break;
        }
        case 'removeRandom': {
          for (let i = 0; i < (o.value || 1); i++) {
            // Убираем в первую очередь порчу и базовые карты — иначе «очищение колоды»
            // с равным шансом сносит только что купленную редкую, и выбор читается
            // как наказание за покупку.
            const junk = state.deck.filter((c) => catalog.cards[c.id].rarity === 'curse');
            const basics = state.deck.filter((c) => catalog.cards[c.id].rarity === 'basic');
            const pool = junk.length ? junk : (basics.length ? basics : state.deck);
            if (!pool.length) break;
            const c = rng.pick(pool);
            removeCardFromDeck(c.uid);
            done.push({ op: 'removeRandom', card: c.id });
          }
          break;
        }
        case 'duplicate': {
          const pool = state.deck.filter((c) => catalog.cards[c.id].rarity !== 'curse');
          if (pool.length) {
            const c = rng.pick(pool);
            addCardToDeck(c.id, c.upgraded);
            done.push({ op: 'duplicate', card: c.id });
          }
          break;
        }
        default: break;
      }
    }
    state.rngCalls = rng.calls;
    return done;
  }

  // Доступен ли выбор события (хватает ли золота).
  function canChoose(choice) {
    if (!choice.req) return true;
    if (choice.req.gold && state.gold < choice.req.gold) return false;
    return true;
  }

  // Итоговый счёт забега — им же меряется место в таблице рекордов.
  function score() {
    const s = state.stats;
    return s.floors * 5 + s.combats * 10 + s.elites * 25 + s.bosses * 100
      + (state.result === 'win' ? 500 : 0) + state.deck.length * 2;
  }

  function snapshot() {
    return JSON.parse(JSON.stringify({ ...state, rngCalls: rng.calls }));
  }

  return {
    state,
    enterNode, canEnter,
    availableNodes: () => availableNodes(state.map, state.currentId),
    finishCombat, advanceAct, clearPending,
    addCardToDeck, removeCardFromDeck, upgradeCardInDeck, upgradableCards,
    heal, damage, addMaxHp, addRelic,
    restHealAmount, restHealAmountAd,
    applyEventOutcome, canChoose,
    rollCardReward, rollRelic,
    score, snapshot,
    get rngCalls() { return rng.calls; },
  };
}

// Восстановление забега из сейва: состояние кладётся целиком, поток ГСЧ перематывается.
export function restoreRun({ catalog, acts, balance, snap }) {
  const run = createRun({
    catalog, acts, hero: snap.hero, seed: snap.seed, meta: {}, balance,
    rngCalls: snap.rngCalls || 0,
  });
  Object.assign(run.state, snap);
  reserveUids(run.state.deck);
  return run;
}

export { NODE, cardView };
