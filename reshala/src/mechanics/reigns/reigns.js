// REIGNS-ДВИЖОК — замкнутый модуль свайп-решений (кандидат в library).
// Не знает ничего про «тюрьму», Phaser или конкретную игру. Работает со ШКАЛАМИ и КАРТАМИ.
//
// На вход — конфиг: описание шкал, колода карт, правила выборки, режим/маршрут, ГСЧ и скейлер.
// Наружу — чистые методы: start(), choose(side). Побочных эффектов нет, только возвращает состояние.
// Сцена (Phaser) сама рисует состояние и ловит свайп; движок только считает.
//
// Карта: { id, who, text, left:{effects,next?}, right:{effects,next?}, minDay?, require?, modes?, route? }
// Эффект: объект дельт по ключам шкал, напр. { suspicion: +12, respect: -10 }.
//
// require — условие по шкалам: { escape: { min: 80 } }. Карта не выпадет, пока условие не выполнено.
//   Зачем: колода маршрута — это линейная история (копаю → уперся → слышу улицу → рывок),
//   а тянется она случайно. Без гейта финальная карта «последний рывок» выпадает на 8-й день
//   при шкале побега 20, и история рассыпается. Гейт привязывает стадию к прогрессу.
//
// config.push — расписание событий: { every: 6, match: (card) => bool }.
//   Раз в every дней движок принудительно тянет карту, подходящую под match (если такая доступна).
//   Зачем: редкие карты (напр. с мини-игрой) сами почти не встречаются — их мало, и выбор
//   ещё и на одной стороне. Расписание даёт гарантию, а не надежду на удачу.
//
// Шкала: { start, min=0, max=100, killOnMin=false, killOnMax=false, scale=false }
//   killOnMin/Max — достигнув края, шкала завершает забег.
//   scale=true — к дельтам этой шкалы применяется scaleEffects(day) (рост сложности). escape НЕ скейлим.
//
// config.blocks — БЛОЧНЫЙ РЕЖИМ (спека 2026-07-18). Когда задан, колода делится на блоки:
//   { count, final, length:{min,max}, escape:bool, cycleUnseen:bool }
//   - count/final — сколько блоков всего и номер финального (там карты побега только победные);
//   - length — сколько survival-карт в блоке до его границы (движок бросает в этих пределах);
//   - escape:true («Побег») — на границе блока форсится КАРТА ПОБЕГА из config.escapeDeck;
//     escape:false («Срок») — на границе просто следующий блок, карт побега нет;
//   - cycleUnseen:true («Срок») — после последнего блока идём по кругу, предпочитая невиданные карты.
//   Survival-карты в config.deck несут поле block:N (активен пул только текущего блока).
//   Карта побега: { block:N, escape:true, ... } в config.escapeDeck. Движок не знает про «тюрьму» —
//   блоки, локации и режим приходят конфигом (модуль остаётся замкнутым).

const DEFAULT_METER = { min: 0, max: 100, killOnMin: false, killOnMax: false, scale: false };

export function createReigns(config) {
  const meters = {};
  for (const key in config.meters) meters[key] = { ...DEFAULT_METER, ...config.meters[key] };

  const rng = config.rng || Math.random;
  const scaleEffects = config.scaleEffects || (() => 1);
  const winMeter = config.winMeter || null;            // ключ шкалы-цели (escape) или null
  const routePick = config.routePick != null ? config.routePick : 0.5; // доля карт маршрута в кампании
  const push = config.push || null;                    // расписание событий { every, match }
  const blocks = config.blocks || null;                // блочный режим (см. шапку) или null
  const escapeDeck = config.escapeDeck || [];          // пул карт побега (блочный «Побег»)
  // Сцена: несколько карт подряд про одно и то же — одного собеседника или одно место.
  // Без этого игрок скачет камера → столовая → двор без причины и не понимает, что происходит.
  // { by: ['who','place'], chance: 0.6, max: 3 } — по какому полю держаться, с какой
  // вероятностью продолжать сцену и сколько карт подряд максимум.
  const stick = config.stick || null;
  let stickField = null, stickValue = null, stickRun = 0;

  // Значения шкал
  const values = {};
  for (const key in meters) values[key] = clampMeter(key, meters[key].start ?? 0);

  function clampMeter(key, v) {
    const m = meters[key];
    return Math.max(m.min, Math.min(m.max, Math.round(v)));
  }

  const deck = config.deck || [];                 // основная колода (survival)
  const routeCards = config.routeCards || [];     // карты маршрута (escape), только кампания
  let day = 0;
  let current = null;
  let forcedNext = null;                          // id принудительной следующей карты (цепочка next)
  // Память о показанных картах. Держим ДЛИННУЮ историю и при выборе отбрасываем самые старые
  // записи ровно настолько, насколько нужно, чтобы кандидаты нашлись (см. eligible). Так карта
  // не вернётся, пока в активном пуле есть хоть одна менее свежая.
  //
  // Раньше помнилось 6 последних, и лимит считался от размера ВСЕЙ колоды (320 карт), тогда как
  // выбор всегда идёт из пула ОДНОЙ главы (~29 карт, в первой 17). Карта возвращалась уже через
  // 7 показов: за 15–20 дней «Срока» внутри главы игрок видел одно и то же (жалоба с прохождения).
  const recent = [];
  const RECENT = Math.min(60, Math.max(0, deck.length - 1));

  // Карты-ПРОДОЛЖЕНИЯ сцепок (те, на кого указывает next) приходят ТОЛЬКО как последствие
  // выбора, в свободную выборку не попадают. Иначе продолжение выпадает само по себе, через
  // ход выпадает его начало, игрок жмёт сторону со сцепкой — и та же карта показывается второй
  // раз за три хода. Именно так выглядел «день 10 и день 11 — одна и та же карточка».
  const continuations = new Set();
  for (const c of deck) {
    for (const side of ['left', 'right']) if (c[side] && c[side].next) continuations.add(c[side].next);
  }

  // ── Блочное состояние ──────────────────────────────────────────────────────
  let block = blocks ? 1 : 0;                     // текущий блок (1-based); 0 = блочного режима нет
  let blockDay = 0;                               // сколько survival-карт уже сыграно в блоке
  let blockLen = blocks ? rollLen() : 0;          // длина текущего блока (бросок при старте блока)
  let chainFired = false;                         // запускалась ли сцепка (next) в этом блоке
  let cycled = false;                             // «Срок» прошёл круг (после финального блока)
  const seen = new Set();                         // все id, что вообще показывались (для cycleUnseen)

  function rollLen() {
    const { min, max } = blocks.length;
    return min + Math.floor(rng() * (max - min + 1));
  }

  // Смена блока: следующий по порядку; в «Сроке» после финального — по кругу.
  function advanceBlock() {
    block += 1;
    if (block > blocks.count) {
      block = blocks.cycleUnseen ? 1 : blocks.count;
      cycled = true;
    }
    blockDay = 0;
    blockLen = rollLen();
    chainFired = false;
  }

  // Survival-пул текущего блока (в блочном режиме) или вся колода.
  function survivalPool() {
    if (!blocks) return eligible(deck);
    let pool = eligible(deck.filter((c) => c.block === block));
    // После круга «Срока» предпочитаем ещё не виденные карты блока.
    if (cycled) {
      const unseen = pool.filter((c) => !seen.has(c.id));
      if (unseen.length) pool = unseen;
    }
    return pool;
  }

  // Карта побега текущего блока (форсится на границе блока в «Побеге»).
  function pickEscapeCard() {
    const pool = escapeDeck.filter((c) => c.block === block
      && !recent.includes(c.id) && meetsRequire(c));
    return weightedPick(pool.length ? pool : escapeDeck.filter((c) => c.block === block));
  }

  // Условие карты по текущим значениям шкал (см. require в шапке файла).
  function meetsRequire(card) {
    if (!card.require) return true;
    for (const key in card.require) {
      if (!(key in values)) continue;
      const r = card.require[key] || {};
      if (r.min != null && values[key] < r.min) return false;
      if (r.max != null && values[key] > r.max) return false;
    }
    return true;
  }

  // Кандидаты на показ. Сначала пробуем исключить ВСЕ недавние; если так никого не остаётся —
  // «забываем» самые старые записи по одной, пока кандидаты не найдутся. Возвращается всегда
  // максимально давно не виденное, и пул никогда не оказывается пустым из-за памяти.
  function eligible(pool) {
    const base = pool.filter((c) => (c.minDay == null || day >= c.minDay)
      && !continuations.has(c.id) && meetsRequire(c));
    if (!base.length) return [];
    for (let skip = 0; skip <= recent.length; skip++) {
      const banned = new Set(recent.slice(skip));   // skip самых старых уже не считаются недавними
      const fresh = base.filter((c) => !banned.has(c.id));
      if (fresh.length) return fresh;
    }
    return base;
  }

  function weightedPick(pool) {
    if (!pool.length) return null;
    let total = 0;
    for (const c of pool) total += c.weight || 1;
    let r = rng() * total;
    for (const c of pool) { r -= (c.weight || 1); if (r <= 0) return c; }
    return pool[pool.length - 1];
  }

  function pickCard() {
    if (forcedNext) {
      const byId = [...deck, ...routeCards, ...escapeDeck].find((c) => c.id === forcedNext);
      forcedNext = null;
      if (byId) { chainFired = true; return byId; } // сцепка пошла — гарантия блока закрыта
    }
    // Расписание событий: раз в push.every дней тянем подходящую карту принудительно
    if (push && push.every > 0 && push.match && day % push.every === 0) {
      let tagged = [...eligible(deck), ...eligible(routeCards)].filter(push.match);
      if (blocks) tagged = tagged.filter((c) => c.block === block); // только текущий блок
      if (tagged.length) return weightedPick(tagged);
    }
    // Блочный режим: пул только текущего блока + гарантия сцепки на последней карте блока.
    if (blocks) {
      let pool = survivalPool();
      if (!pool.length) pool = deck.filter((c) => c.block === block);
      if (!pool.length) pool = deck.slice();
      // Последняя survival-карта блока, а сцепка ещё не запускалась — начать сцепку
      // (иначе за проход блока связок можно ни разу не увидеть, и мир кажется рассыпанным).
      if (blockDay === blockLen - 1 && !chainFired) {
        const starters = pool.filter((c) => (c.left && c.left.next) || (c.right && c.right.next));
        if (starters.length) return pickSticky(starters) || weightedPick(starters);
      }
      return pickSticky(pool) || weightedPick(pool);
    }
    // В кампании иногда тянем карту маршрута, чтобы escape мог расти
    let pool = eligible(deck);
    if (winMeter && routeCards.length && rng() < routePick) {
      const rp = eligible(routeCards);
      if (rp.length) pool = rp;
    }
    if (!pool.length) pool = eligible(deck).length ? eligible(deck) : deck.slice();
    // Сцену держим только на обычной колоде: в кампании карты маршрута тянутся выше по
    // routePick, и перебивать их сценой нельзя — иначе шкала побега перестанет расти.
    return pickSticky(pool) || weightedPick(pool);
  }

  // Продолжение начатой сцены: карта про то же лицо/место, что и предыдущая.
  function pickSticky(pool) {
    if (!stick || stickValue == null || stickRun >= stick.max) return null;
    if (rng() >= stick.chance) return null;
    const same = pool.filter((c) => c[stickField] === stickValue);
    return same.length ? weightedPick(same) : null;
  }

  // Запомнить, вокруг чего идёт сцена. Продолжили — счётчик растёт, сменили тему — новая сцена.
  function noteStick(card) {
    if (!stick || !card) return;
    if (stickValue != null && card[stickField] === stickValue) { stickRun += 1; return; }
    const fields = stick.by.filter((f) => card[f] != null);
    if (!fields.length) { stickField = null; stickValue = null; stickRun = 0; return; }
    stickField = fields[Math.min(fields.length - 1, Math.floor(rng() * fields.length))];
    stickValue = card[stickField];
    stickRun = 1;
  }

  function remember(id) {
    recent.push(id);
    while (recent.length > RECENT) recent.shift();
    seen.add(id);
  }

  function checkEnd() {
    if (winMeter && values[winMeter] >= meters[winMeter].max) return { won: true };
    for (const key in meters) {
      const m = meters[key];
      if (m.killOnMin && values[key] <= m.min) return { dead: true, reason: { meter: key, edge: 'min' } };
      if (m.killOnMax && values[key] >= m.max) return { dead: true, reason: { meter: key, edge: 'max' } };
    }
    return {};
  }

  function start() {
    day = 1;
    current = pickCard();
    if (current) { remember(current.id); noteStick(current); }
    return { card: current, values: { ...values }, day, block };
  }

  // Вторая попытка побега (награда за рекламу). После сорвавшейся попытки choose() уже увёл
  // в следующую главу — здесь возвращаемся в главу побега и форсим НОВУЮ карту побега (недавнюю
  // движок исключит сам). Дальше она резолвится штатным choose() — победа или снова «сорвалось».
  function retryEscape() {
    if (!blocks || !blocks.escape) return { card: current, values: { ...values }, day, block };
    block = Math.max(1, block - 1);
    blockDay = blockLen;              // на границе главы
    forcedNext = null;
    day += 1;
    current = pickEscapeCard();
    if (current) { remember(current.id); noteStick(current); }
    return { card: current, values: { ...values }, day, block };
  }

  // side: 'left' | 'right'
  function choose(side) {
    if (!current) return { card: null, values: { ...values }, day, block };
    const wasEscape = !!current.escape;
    const choice = current[side] || {};
    const effects = choice.effects || {};
    const applied = {};
    const factor = scaleEffects(day);
    for (const key in effects) {
      if (!(key in meters)) continue;
      let delta = effects[key];
      if (meters[key].scale) delta = Math.round(delta * factor);
      let target = values[key] + delta;
      // Карта побега НЕ убивает шкалой: провал побега подводит подозрение/авторитет/здоровье
      // вплотную к смертельному краю, но не за него, — «сорвалось» всегда даёт вторую попытку,
      // а не превращается молча в game over. Смерть — только на обычных картах главы.
      if (wasEscape) {
        const m = meters[key];
        if (m.killOnMax) target = Math.min(target, m.max - 1);
        if (m.killOnMin) target = Math.max(target, m.min + 1);
      }
      applied[key] = delta;
      values[key] = clampMeter(key, target);
    }

    const end = checkEnd();
    let nextCard = null;
    let escapeFailed = false;
    let won = !!end.won;
    const dead = !!end.dead;

    if (blocks && wasEscape && !dead) {
      // Карта побега: либо победа, либо «сорвалось → следующий блок».
      // Победа, если набрал порог, ЛИБО это финальный блок (там побег только удачный).
      if (won || values[winMeter] >= meters[winMeter].max || block >= blocks.final) {
        won = true;
        current = null;
      } else {
        escapeFailed = true;
        advanceBlock();
        forcedNext = choice.next || null;
        day += 1;
        nextCard = pickCard();
        if (nextCard) { remember(nextCard.id); noteStick(nextCard); }
        current = nextCard;
      }
    } else if (!dead && !won) {
      forcedNext = choice.next || null;
      day += 1;
      if (blocks) {
        blockDay += 1;
        if (blockDay >= blockLen) {
          if (blocks.escape) {
            forcedNext = null;              // граница блока перебивает недоигранную сцепку
            nextCard = pickEscapeCard();    // форсим карту побега, блок сменится после её выбора
          } else {
            advanceBlock();                 // «Срок»: карт побега нет — сразу следующий блок
            nextCard = pickCard();
          }
        } else {
          nextCard = pickCard();
        }
      } else {
        nextCard = pickCard();
      }
      if (nextCard) { remember(nextCard.id); noteStick(nextCard); }
      current = nextCard;
    } else {
      current = null;
    }

    return {
      applied,                       // что реально применилось (после скейла и клампа)
      reply: choice.reply || null,   // короткая реакция выбранной стороны
      values: { ...values },
      day,
      block,                         // текущий блок (0 вне блочного режима)
      dead,
      reason: end.reason || null,    // { meter, edge } — для флейвора концовки
      won,
      escapeFailed,                  // побег сорвался (карта побега без победы) — для флейвора
      card: nextCard,                // следующая карта (или null, если конец)
    };
  }

  // Применить эффекты ВНЕ выбора карты (награда мини-игры и т.п.): без скейла по дню,
  // с клампом и проверкой конца. Возвращает тот же вид, что и часть choose().
  //
  // opts.safe — НАГРАДА НЕ УБИВАЕТ: шкала подводится вплотную к смертельному краю, но не за
  // него. Игрок выиграл мини-игру, а награда добила шкалу до предела и завершила забег —
  // выигрыш не должен наказывать. Штрафы (за проигранную мини-игру) идут БЕЗ safe: это
  // честный риск, на который игрок пошёл сам.
  function apply(effects, opts = {}) {
    const applied = {};
    for (const key in effects || {}) {
      if (!(key in meters)) continue;
      const before = values[key];
      let target = before + effects[key];
      if (opts.safe) {
        const m = meters[key];
        if (m.killOnMax) target = Math.min(target, m.max - 1);
        if (m.killOnMin) target = Math.max(target, m.min + 1);
      }
      values[key] = clampMeter(key, target);
      applied[key] = values[key] - before;   // сколько РЕАЛЬНО начислено (всплывашка не врёт)
    }
    const end = checkEnd();
    if (end.dead || end.won) current = null;
    return {
      applied,
      values: { ...values },
      dead: !!end.dead,
      reason: end.reason || null,
      won: !!end.won,
    };
  }

  return {
    start,
    choose,
    apply,
    retryEscape,
    get day() { return day; },
    get block() { return block; },
    get values() { return { ...values }; },
    get current() { return current; },
    meters,
  };
}
