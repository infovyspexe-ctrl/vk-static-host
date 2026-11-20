import { Platform, GAME_ID } from '../platform/index.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { OrbitGame, missionReadout, orderAmounts } from '../mechanics/orbit.js';
import { TYPES, UPGRADES, price } from '../data/orbit.js';
import { resolvePlayLanguage } from './locale.js';

// Отдельный счётчик этой VK-сборки. Номер назначает tools/metrika.py.
const METRICA_ID = 113679554;

function englishCopy() {
  return {
    title: 'Orbital Salvage', credits: 'credits', hold: 'cargo hold', orders: 'STATION REQUESTS', up: 'EQUIPMENT',
    start: 'START SALVAGE', resume: 'CONTINUE', menu: 'MENU',
    metal: 'Metal', fuel: 'Fuel', tech: 'Modules', full: 'HOLD FULL',
    win: 'MOON ROUTE RESTORED', continue: 'Free shift', holdUp: 'Cargo hold', scanner: 'Scanner',
    drone: 'Collector drone', tug: 'Orbital tug', ordersDone: 'ORDERS', of: 'of', none: 'NO MATCHING CARGO',
    unload: 'UNLOAD ALL', aboard: 'Matching cargo', sent: 'Sent', left: 'left', complete: 'ORDER COMPLETE',
    routeRestored: 'Moon route restored', freeShift: 'free shift', delivered: 'delivered', remaining: 'left',
  };
}
function russianCopy() {
  return {
    title: 'Орбитальный сборщик', credits: 'кредитов', hold: 'трюм', orders: 'ЗАПРОСЫ СТАНЦИЙ', up: 'ОСНАЩЕНИЕ',
    start: 'НАЧАТЬ СБОР', resume: 'ПРОДОЛЖИТЬ', menu: 'МЕНЮ',
    metal: 'Металл', fuel: 'Топливо', tech: 'Модули', full: 'ТРЮМ ЗАПОЛНЕН',
    win: 'ЛУННАЯ ТРАССА ВОССТАНОВЛЕНА', continue: 'Свободная смена', holdUp: 'Грузовой отсек', scanner: 'Сканер',
    drone: 'Дрон-сборщик', tug: 'Орбитальный буксир', ordersDone: 'ЗАКАЗЫ', of: 'из', none: 'НЕТ НУЖНОГО ГРУЗА',
    unload: 'ВЫГРУЗИТЬ ВСЁ', aboard: 'Подходящий груз', sent: 'Передано', left: 'осталось', complete: 'ЗАКАЗ ВЫПОЛНЕН',
    routeRestored: 'Трасса восстановлена', freeShift: 'свободная смена', delivered: 'доставлено', remaining: 'осталось',
  };
}
let en = false;
let L = russianCopy();
let stationNames = ['Жилая станция', 'Лаборатория', 'Лунная база'];
function applyLanguage(code) {
  en = code === 'en';
  L = en ? englishCopy() : russianCopy();
  L.discard = en ? 'Discard 1' : 'Выбросить 1';
  stationNames = en ? ['Habitat', 'Laboratory', 'Moon base'] : ['Жилая станция', 'Лаборатория', 'Лунная база'];
}
const app = document.querySelector('#app');
const debrisNodes = new Map();
const feedback = new Map();
let game, paused = false, overlayOpen = false, last = 0, lastSave = 0, toastTimer, uiSignature = '';

function shell() {
  app.innerHTML = `<main class="salvage"><header><div class="identity"><span class="author-mark">ДК</span><span><small>DK—02 / ${en ? 'SALVAGE CONTROL' : 'ЦЕНТР СБОРА'}</small><b>${L.title}</b></span></div><div class="flight-stats"><span><small>${L.credits}</small><b id="money">0</b></span><span class="goal" id="holdStat"><small>${L.hold}</small><b id="capacity">0/8</b><i><em id="capbar"></em></i></span></div></header><section class="space" id="field"><div class="stars"></div><div class="axis axis-x"></div><div class="axis axis-y"></div><div class="course-label course-in">${en ? 'INBOUND' : 'ВХОДЯЩИЙ КУРС'} ↘</div><div class="course-label course-out">↗ ${en ? 'TRANSFER VECTOR' : 'ВЕКТОР ПЕРЕДАЧИ'}</div><div class="orbit o3"><i class="orbit-arrow a1">›</i></div><div class="orbit o2"><i class="orbit-arrow a2">›</i></div><div class="orbit o1"><i class="orbit-arrow a3">›</i></div><div class="intercept ip1"><i></i><span>01</span></div><div class="intercept ip2"><i></i><span>02</span></div><div class="intercept ip3"><i></i><span>03</span></div><div class="earth"><i></i><strong>СК-2</strong><small>${en ? 'RELAY' : 'РЕТРАНСЛЯТОР'}</small></div><div class="legend" id="legend"></div><div id="debris"></div><div class="mission" id="mission"><span id="missionLabel">${L.ordersDone}</span><div><i id="relaybar"></i></div><b id="relay"></b></div></section><section class="inventory" id="inventory"></section><aside><h2><span>01</span>${L.orders}</h2><div id="contracts"></div><h2 id="upTitle"><span>02</span>${L.up}</h2><div id="upgrades"></div></aside><div class="toast" id="toast"></div><dialog id="modal"></dialog></main>`;
  const menuButton = document.createElement('button');
  menuButton.id = 'menuButton';
  menuButton.className = 'menu-key';
  menuButton.type = 'button';
  menuButton.textContent = L.menu;
  document.querySelector('.flight-stats').append(menuButton);
}
function toast(text) {
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1300);
}
function modal(win = false) {
  paused = true;
  overlayOpen = true;
  save();
  Platform.gameplayStop();
  const d = document.querySelector('#modal');
  const returning = game.s.started && !win;
  const clock = `${Math.floor(game.s.elapsed / 60)}:${String(Math.floor(game.s.elapsed % 60)).padStart(2, '0')}`;
  d.innerHTML = `<div class="planet">${win ? 'OK' : '◎'}</div><h1>${win ? L.win : L.title}</h1><p>${win ? `${clock} · ${game.s.hits}` : statusLine()}</p><button>${win ? L.continue : returning ? L.resume : L.start}</button>`;
  if (!d.open) d.showModal();
  d.querySelector('button').onclick = () => {
    if (win) game.continueAfterWin();
    d.close();
    overlayOpen = false;
    paused = false;
    game.s.started = true;
    save();
    Platform.gameplayStart();
    render(true);
  };
}
function statusLine() {
  const view = missionReadout(game.s);
  if (!view.done) return `${view.delivered} ${L.of} ${view.goal}`;
  return `${L.routeRestored} · ${L.freeShift}: ${view.freeCount}`;
}
function requestRows(contract, index) {
  return Object.entries(contract.need).filter(([, n]) => n).map(([k, n]) => {
    const amounts = orderAmounts(game.s.progress[index][k], n);
    return `<span class="need" style="--c:${TYPES[k].color}"><i class="cargo-dot cargo-${k}"></i><b>${L[k]}</b><span class="qty">${L.delivered} ${amounts.delivered}</span><span class="qty">${L.remaining} ${amounts.left}</span></span>`;
  }).join('');
}
function usefulCargo(index) {
  const c = game.contract(index);
  if (!c) return 0;
  const p = game.s.progress[index];
  return Object.entries(c.need).reduce((sum, [k, n]) => sum + Math.min(game.s.cargo[k], Math.max(0, n - (p[k] || 0))), 0);
}
// Учебный заказ — ряд картинок того же груза, что летает по орбите.
// Пустая ячейка ждёт, яркая уже лежит в трюме, залитая сдана.
function lessonSlots(contract, index) {
  const p = game.s.progress[index];
  return Object.entries(contract.need).filter(([, n]) => n).map(([k, n]) => {
    const got = p[k] || 0;
    const ready = Math.min(game.s.cargo[k] || 0, Math.max(0, n - got));
    return Array.from({ length: n }, (_, slot) => {
      const state = slot < got ? 'filled' : slot < got + ready ? 'ready' : 'empty';
      return `<i class="slot ${state} cargo-${k}" style="--c:${TYPES[k].color}" aria-hidden="true"></i>`;
    }).join('');
  }).join('');
}
function stateSignature() {
  const s = game.s;
  return JSON.stringify([Math.floor(s.credits), s.delivered, s.cargo, s.levels, s.contracts, s.progress, s.lesson, s.lessonCleared, game.load(), game.focus(), [...feedback.entries()]]);
}
function stationDone(i) {
  const c = game.contract(i);
  if (!c || !game.lessonActive()) return false;
  return Object.entries(c.need).every(([k, n]) => (game.s.progress[i][k] || 0) >= n);
}
function render(force = false) {
  const signature = stateSignature();
  if (!force && signature === uiSignature) return;
  uiSignature = signature;
  const s = game.s;
  const focus = game.focus();
  const stations = game.lessonActive() ? game.lesson().stations : 3;
  const types = game.visibleTypes();
  const upgrades = game.unlockedUpgrades();
  const showDiscard = s.seenFull || !game.lessonActive();
  document.querySelector('.salvage').dataset.beat = focus;
  const field = document.querySelector('#field');
  field.dataset.rings = String(game.rings());
  const showCap = !game.lessonActive() || s.lesson >= 4;
  document.querySelector('#money').textContent = Math.floor(s.credits);
  document.querySelector('#capacity').textContent = showCap ? `${game.load()}/${game.capacity()}` : String(game.load());
  document.querySelector('#capbar').style.width = Math.min(100, game.load() / game.capacity() * 100) + '%';
  document.querySelector('#holdStat').classList.toggle('full', focus === 'full');
  document.querySelector('#holdStat').classList.toggle('teaching', !showCap);
  const missionView = missionReadout(s);
  document.querySelector('#mission').classList.toggle('free-shift', missionView.done);
  document.querySelector('#mission').classList.toggle('quiet', game.lessonActive() && !missionView.done && missionView.delivered === 0);
  document.querySelector('#missionLabel').textContent = missionView.done ? '' : L.ordersDone;
  document.querySelector('#relay').textContent = statusLine();
  document.querySelector('#relaybar').style.width = missionView.bar + '%';
  document.querySelector('#legend').innerHTML = `<b>${en ? 'CARGO' : 'ГРУЗ'}</b>${types.map((k) => `<span style="--c:${TYPES[k].color}"><i></i>${L[k]}</span>`).join('')}`;
  document.querySelector('#inventory').className = `inventory types-${types.length}`;
  document.querySelector('#inventory').innerHTML = types.map((k) => `<div style="--c:${TYPES[k].color}"><i class="cargo-dot cargo-${k}"></i><span>${L[k]}</span><b>${s.cargo[k]}</b>${showDiscard ? `<button class="cargo-discard${focus === 'full' && s.cargo[k] ? ' invite' : ''}" data-discard="${k}" aria-label="${L.discard}: ${L[k]}" ${s.cargo[k] ? '' : 'disabled'}>${L.discard}</button>` : ''}</div>`).join('');
  const contracts = document.querySelector('#contracts');
  contracts.className = `stations-${stations}`;
  contracts.innerHTML = Array.from({ length: stations }, (_, i) => {
    const c = game.contract(i);
    const useful = usefulCargo(i);
    const note = feedback.get(i);
    const waitForRoom = !!(game.lesson()?.cap) && focus === 'catch';
    const canUnload = useful > 0 && !waitForRoom;
    const ready = focus === 'deliver' && canUnload;
    const done = stationDone(i);
    const need = game.lessonActive()
      ? `<span class="slots">${lessonSlots(c, i)}</span>`
      : `<small>${requestRows(c, i)}</small><span class="aboard">${L.aboard}: <b>${useful}</b></span>`;
    return `<button data-deliver="${i}" class="${ready ? 'ready' : ''} ${done ? 'done' : ''}" ${canUnload ? '' : 'disabled'} style="--c:${c.station.color}"><span class="station-art station-${c.station.id}" aria-hidden="true"></span><span class="contract-copy"><strong>${stationNames[i]} · №${c.number + 1}</strong>${need}<em>+${game.payout(c)} CR</em>${done || canUnload ? `<u>${done ? L.complete : L.unload}</u>` : ''}</span>${note ? `<span class="contract-flash ${note.kind}"><b>${note.kind === 'complete' ? L.complete : `${L.sent}: ${note.moved}`}</b><small>${note.kind === 'complete' ? `+${note.reward} CR` : `${L.left}: ${note.remaining}`}</small></span>` : ''}</button>`;
  }).join('');
  const aside = document.querySelector('aside');
  aside.classList.toggle('no-upgrades', upgrades.length === 0);
  document.querySelector('#upgrades').innerHTML = upgrades.map((id) => {
    const u = UPGRADES[id];
    const lv = s.levels[id];
    const cost = price(id, lv);
    const max = lv >= u.max;
    const invite = focus === 'upgrade' && id === 'hold' && !max && s.credits >= cost;
    return `<button data-up="${id}" class="${invite ? 'invite-buy' : ''}" ${max || s.credits < cost ? 'disabled' : ''}><span><b>${L[id === 'hold' ? 'holdUp' : id]}</b><small>LV ${lv}/${u.max}</small></span><em>${max ? 'MAX' : cost + ' CR'}</em></button>`;
  }).join('');
}
function makeDebrisNode(d) {
  const node = document.createElement('button');
  node.className = `junk ${d.danger ? 'danger' : `cargo-${d.type}`}`;
  node.dataset.junk = d.id;
  node.setAttribute('aria-label', d.danger ? 'mine' : L[d.type]);
  node.innerHTML = d.danger ? '<i class="mine-core">!</i>' : `<i class="cargo-art cargo-${d.type}" aria-hidden="true"></i><small>${L[d.type]}</small>`;
  document.querySelector('#debris').append(node);
  debrisNodes.set(d.id, node);
  return node;
}
function wantedNow() {
  const types = new Set();
  const stations = game.lessonActive() ? game.lesson().stations : 3;
  for (let i = 0; i < stations; i++) {
    const c = game.contract(i);
    if (!c) continue;
    for (const [k, n] of Object.entries(c.need)) if (n > (game.s.progress[i][k] || 0)) types.add(k);
  }
  return types;
}
function draw() {
  const live = new Set();
  const focus = game.focus();
  const wanted = wantedNow();
  const only = game.s.debris.filter((d) => !d.danger).length === 1;
  for (const d of game.s.debris) {
    live.add(d.id);
    const node = debrisNodes.get(d.id) || makeDebrisNode(d);
    const radius = [0, 77, 126, 176][d.ring];
    const x = 50 + Math.cos(d.angle) * radius / 4.8;
    const y = 48 + Math.sin(d.angle) * radius / 4.3;
    node.style.left = x + '%';
    node.style.top = y + '%';
    node.style.setProperty('--spin', `${d.angle * 57.3 + d.id * 19}deg`);
    const invite = focus === 'catch' && !d.danger && wanted.has(d.type) && (only || game.lessonActive());
    node.className = `junk ${d.danger ? 'danger' : `cargo-${d.type}`}${invite ? ' invite' : ''}`;
  }
  for (const [id, node] of debrisNodes) if (!live.has(id)) { node.remove(); debrisNodes.delete(id); }
}
function showFeedback(index, data) {
  feedback.set(index, data);
  render(true);
  setTimeout(() => { if (feedback.get(index) === data) { feedback.delete(index); render(true); } }, data.kind === 'complete' ? 1800 : 1200);
}
function shock() {
  const field = document.querySelector('#field');
  if (!field) return;
  field.classList.add('shock');
  setTimeout(() => field.classList.remove('shock'), 320);
}
function events() {
  for (const e of game.drain()) {
    if (e.type === 'collect' && !e.auto) toast(L[e.cargo] + ' +1');
    if (e.type === 'hazard') { shock(); if (e.loss) toast('−' + e.loss); }
    if (e.type === 'full') toast(L.full);
    if (e.type === 'deposit') showFeedback(e.index, { kind: 'deposit', moved: e.moved, remaining: e.remaining });
    if (e.type === 'deliver') { showFeedback(e.index, { kind: 'complete', reward: e.reward }); Analytics.event(EVENTS.PROGRESS_REACHED, { mission: game.s.delivered }); }
    if (e.type === 'lesson') Analytics.event(EVENTS.TUTORIAL_STEP, { step: e.step });
    if (e.type === 'win') modal(true);
  }
}
function save() { Platform.save.update({ orbit: game.snapshot() }); }
async function start() {
  await Platform.init();
  const urlLang = new URLSearchParams(location.search).get('lang');
  applyLanguage(resolvePlayLanguage(urlLang, Platform.getLang(), navigator.language));
  game = new OrbitGame(await Platform.save.load());
  document.title = L.title;
  document.documentElement.lang = en ? 'en' : 'ru';
  Analytics.init(METRICA_ID, GAME_ID, { platform: Platform.name, bridge: window.vkBridge });
  shell();
  const teaching = game.lessonActive();
  if (teaching) {
    game.s.started = true;
    game.tick(0);
  }
  render(true);
  document.querySelector('#field').onpointerdown = (e) => {
    const b = e.target.closest('[data-junk]');
    if (!b || paused) return;
    e.preventDefault();
    game.collect(Number(b.dataset.junk));
    events();
    save();
    render();
    draw();
  };
  app.onclick = (e) => {
    if (e.target.closest('#menuButton')) { modal(false); return; }
    const d = e.target.closest('[data-deliver]');
    const u = e.target.closest('[data-up]');
    const discard = e.target.closest('[data-discard]');
    if (d) game.deliver(Number(d.dataset.deliver));
    if (u) game.buy(u.dataset.up);
    if (discard) game.discard(discard.dataset.discard);
    events();
    save();
    render();
  };
  for (const x of ['contextmenu', 'dragstart', 'selectstart']) document.addEventListener(x, (e) => e.preventDefault());
  const suspend = () => { paused = true; save(); Platform.gameplayStop(); };
  const resume = () => { last = performance.now(); if (!overlayOpen && !document.hidden) { paused = false; if (game.s.started && !game.s.won) Platform.gameplayStart(); } };
  window.addEventListener('blur', suspend);
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', () => document.hidden ? suspend() : resume());
  window.addEventListener('pagehide', () => { Analytics.event(EVENTS.SESSION_END, { depth: game.s.delivered }); save(); Platform.save.flush(); });
  if (window.vkBridge?.subscribe) window.vkBridge.subscribe((e) => {
    if (e?.detail?.type === 'VKWebAppViewHide') suspend();
    if (e?.detail?.type === 'VKWebAppViewRestore') resume();
  });
  Platform.ready();
  document.querySelector('#boot')?.remove();
  Analytics.event(EVENTS.GAME_START, { returning: !teaching });
  if (teaching) {
    Analytics.event(EVENTS.TUTORIAL_STEP, { step: game.s.lesson });
    Platform.gameplayStart();
  } else if (game.s.won) modal(true);
  else modal(false);
  window.orbitGame = Object.freeze({
    inspect: () => structuredClone(game.s),
    lesson: () => game.s.lesson,
  });
  requestAnimationFrame(frame);
}
function frame(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  if (!paused) { game.tick(dt); events(); }
  draw();
  render();
  if (now - lastSave > 5000) { save(); lastSave = now; }
  requestAnimationFrame(frame);
}
start().catch((e) => { console.error(e); const boot = document.querySelector('#boot'); if (boot) boot.textContent = 'СБОЙ ЗАГРУЗКИ'; });
