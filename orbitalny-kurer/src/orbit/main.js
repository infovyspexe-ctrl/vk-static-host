import {Platform,GAME_ID} from '../platform/index.js';
import {Analytics} from '../core/analytics.js';
import {EVENTS} from '../data/analytics-events.js';
import {OrbitGame} from '../mechanics/orbit.js';
import {TYPES,UPGRADES,GOAL,price} from '../data/orbit.js';

// Отдельный счётчик этой VK-сборки. Номер назначает tools/metrika.py.
const METRICA_ID = 113679554;

const en=(new URLSearchParams(location.search).get('lang')||navigator.language||'ru').toLowerCase().startsWith('en');
const L=en?{
 title:'Orbital Salvage',credits:'credits',hold:'cargo hold',orders:'STATION REQUESTS',up:'EQUIPMENT',start:'START SALVAGE',resume:'CONTINUE',menu:'MENU',intro:'Clear the orbit. Supply the stations.',how:'Catch useful debris on the moving orbits. Avoid red mines, manage the hold and unload matching cargo to the stations.',metal:'Metal',fuel:'Fuel',tech:'Modules',full:'HOLD FULL',hazard:'MINE! Credits lost',win:'MOON ROUTE RESTORED',continue:'Free shift',holdUp:'Cargo hold',scanner:'Scanner',drone:'Collector drone',tug:'Orbital tug',ordersDone:'ORDERS',of:'of',none:'NO MATCHING CARGO',unload:'UNLOAD ALL',aboard:'Matching cargo aboard',sent:'Sent',left:'left',complete:'ORDER COMPLETE'
}:{
 title:'Орбитальный сборщик',credits:'кредитов',hold:'трюм',orders:'ЗАПРОСЫ СТАНЦИЙ',up:'ОСНАЩЕНИЕ',start:'НАЧАТЬ СБОР',resume:'ПРОДОЛЖИТЬ',menu:'МЕНЮ',intro:'Очистите орбиту. Снабдите станции.',how:'Ловите полезный груз прямо на движущихся орбитах. Избегайте красных мин, следите за трюмом и выгружайте подходящий груз на станции.',metal:'Металл',fuel:'Топливо',tech:'Модули',full:'ТРЮМ ЗАПОЛНЕН',hazard:'МИНА! Потеряны кредиты',win:'ЛУННАЯ ТРАССА ВОССТАНОВЛЕНА',continue:'Свободная смена',holdUp:'Грузовой отсек',scanner:'Сканер',drone:'Дрон-сборщик',tug:'Орбитальный буксир',ordersDone:'ЗАКАЗЫ',of:'из',none:'НЕТ НУЖНОГО ГРУЗА',unload:'ВЫГРУЗИТЬ ВСЁ',aboard:'Для заказа в трюме',sent:'Передано',left:'осталось',complete:'ЗАКАЗ ВЫПОЛНЕН'
};
const stationNames=en?['Habitat','Laboratory','Moon base']:['Жилая станция','Лаборатория','Лунная база'];
const app=document.querySelector('#app');
const debrisNodes=new Map();
const feedback=new Map();
let game,paused=false,overlayOpen=false,last=0,lastSave=0,toastTimer,uiSignature='';

function shell(){
 app.innerHTML=`<main class="salvage"><header><div class="identity"><span class="author-mark">ДК</span><span><small>DK—02 / ${en?'SALVAGE CONTROL':'ЦЕНТР СБОРА'}</small><b>${L.title}</b></span></div><div class="flight-stats"><span><small>${L.credits}</small><b id="money">0</b></span><span class="goal"><small>${L.hold}</small><b id="capacity">0/8</b><i><em id="capbar"></em></i></span></div></header><section class="space" id="field"><div class="stars"></div><div class="axis axis-x"></div><div class="axis axis-y"></div><div class="course-label course-in">${en?'INBOUND':'ВХОДЯЩИЙ КУРС'} ↘</div><div class="course-label course-out">↗ ${en?'TRANSFER VECTOR':'ВЕКТОР ПЕРЕДАЧИ'}</div><div class="orbit o3"><i class="orbit-arrow a1">›</i></div><div class="orbit o2"><i class="orbit-arrow a2">›</i></div><div class="orbit o1"><i class="orbit-arrow a3">›</i></div><div class="intercept ip1"><i></i><span>01</span></div><div class="intercept ip2"><i></i><span>02</span></div><div class="intercept ip3"><i></i><span>03</span></div><div class="earth"><i></i><strong>СК-2</strong><small>${en?'RELAY':'РЕТРАНСЛЯТОР'}</small></div><div class="legend"><b>${en?'CARGO KEYS':'КОДЫ ГРУЗА'}</b>${Object.entries(TYPES).map(([k,v])=>`<span style="--c:${v.color}"><i></i>${L[k]}</span>`).join('')}</div><div id="debris"></div><div class="mission"><span>${L.ordersDone}</span><div><i id="relaybar"></i></div><b id="relay">0 ${L.of} ${GOAL}</b></div></section><section class="inventory" id="inventory"></section><aside><h2><span>01</span>${L.orders}</h2><div id="contracts"></div><h2><span>02</span>${L.up}</h2><div id="upgrades"></div></aside><div class="toast" id="toast"></div><dialog id="modal"></dialog></main>`;
 const menuButton=document.createElement('button');menuButton.id='menuButton';menuButton.className='menu-key';menuButton.type='button';menuButton.textContent=L.menu;document.querySelector('.flight-stats').append(menuButton);
}
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),1300)}
function modal(win=false){paused=true;overlayOpen=true;save();Platform.gameplayStop();const d=document.querySelector('#modal');const returning=game.s.started&&!win;d.innerHTML=`<div class="planet">${win?'OK':'◎'}</div><h1>${win?L.win:L.intro}</h1><p>${win?`${Math.floor(game.s.elapsed/60)}:${String(Math.floor(game.s.elapsed%60)).padStart(2,'0')} · ${game.s.hits}`:L.how}</p><button>${win?L.continue:returning?L.resume:L.start}</button>`;if(!d.open)d.showModal();d.querySelector('button').onclick=()=>{d.close();overlayOpen=false;paused=false;game.s.started=true;save();Platform.gameplayStart();render(true)}}
function requestRows(contract,index){return Object.entries(contract.need).filter(([,n])=>n).map(([k,n])=>`<span style="--c:${TYPES[k].color}"><i class="cargo-dot cargo-${k}"></i>${L[k]} <b>${game.s.progress[index][k]||0}/${n}</b></span>`).join('')}
function usefulCargo(index){const c=game.contract(index),p=game.s.progress[index];return Object.entries(c.need).reduce((sum,[k,n])=>sum+Math.min(game.s.cargo[k],Math.max(0,n-(p[k]||0))),0)}
function remaining(index){const c=game.contract(index),p=game.s.progress[index];return Object.entries(c.need).reduce((sum,[k,n])=>sum+Math.max(0,n-(p[k]||0)),0)}
function stateSignature(){const s=game.s;return JSON.stringify([Math.floor(s.credits),s.delivered,s.cargo,s.levels,s.contracts,s.progress,[...feedback.entries()]])}
function render(force=false){
 const signature=stateSignature();if(!force&&signature===uiSignature)return;uiSignature=signature;
 const s=game.s;
 document.querySelector('#money').textContent=Math.floor(s.credits);
 document.querySelector('#capacity').textContent=`${game.load()}/${game.capacity()}`;
 document.querySelector('#capbar').style.width=Math.min(100,game.load()/game.capacity()*100)+'%';
 document.querySelector('#relay').textContent=`${s.delivered} ${L.of} ${GOAL}`;
 document.querySelector('#relaybar').style.width=Math.min(100,s.delivered/GOAL*100)+'%';
 document.querySelector('#inventory').innerHTML=Object.entries(TYPES).map(([k,v])=>`<div style="--c:${v.color}"><i class="cargo-dot cargo-${k}"></i><span>${L[k]}</span><b>${s.cargo[k]}</b></div>`).join('');
 document.querySelector('#contracts').innerHTML=[0,1,2].map(i=>{const c=game.contract(i),useful=usefulCargo(i),note=feedback.get(i);return `<button data-deliver="${i}" ${useful?'':'disabled'} style="--c:${c.station.color}"><span class="station-art station-${c.station.id}" aria-hidden="true"></span><span class="contract-copy"><strong>${stationNames[i]} · №${c.number+1}</strong><small>${requestRows(c,i)}</small><em>+${c.reward} CR</em><span class="aboard">${L.aboard}: <b>${useful}</b></span><u>${useful?L.unload:L.none}</u></span>${note?`<span class="contract-flash ${note.kind}"><b>${note.kind==='complete'?L.complete:`${L.sent}: ${note.moved}`}</b><small>${note.kind==='complete'?`+${note.reward} CR`:`${L.left}: ${note.remaining}`}</small></span>`:''}</button>`}).join('');
 document.querySelector('#upgrades').innerHTML=Object.entries(UPGRADES).map(([id,u])=>{const lv=s.levels[id],cost=price(id,lv),max=lv>=u.max;return `<button data-up="${id}" ${max||s.credits<cost?'disabled':''}><span><b>${L[id==='hold'?'holdUp':id]}</b><small>LV ${lv}/${u.max}</small></span><em>${max?'MAX':cost+' CR'}</em></button>`}).join('');
}
function makeDebrisNode(d){const node=document.createElement('button');node.className=`junk ${d.danger?'danger':`cargo-${d.type}`}`;node.dataset.junk=d.id;node.setAttribute('aria-label',d.danger?'mine':L[d.type]);node.innerHTML=d.danger?'<i class="mine-core">!</i>':`<i class="cargo-art cargo-${d.type}" aria-hidden="true"></i><small>${L[d.type]}</small>`;document.querySelector('#debris').append(node);debrisNodes.set(d.id,node);return node}
function draw(){
 const live=new Set();
 for(const d of game.s.debris){live.add(d.id);const node=debrisNodes.get(d.id)||makeDebrisNode(d);const radius=[0,77,126,176][d.ring],x=50+Math.cos(d.angle)*radius/4.8,y=48+Math.sin(d.angle)*radius/4.3;node.style.left=x+'%';node.style.top=y+'%';node.style.setProperty('--spin',`${d.angle*57.3+d.id*19}deg`)}
 for(const [id,node] of debrisNodes)if(!live.has(id)){node.remove();debrisNodes.delete(id)}
}
function showFeedback(index,data){feedback.set(index,data);render(true);setTimeout(()=>{if(feedback.get(index)===data){feedback.delete(index);render(true)}},data.kind==='complete'?1800:1200)}
function events(){
 for(const e of game.drain()){
  if(e.type==='collect'&&!e.auto)toast(L[e.cargo]+' +1');
  if(e.type==='hazard')toast(L.hazard);
  if(e.type==='full')toast(L.full);
  if(e.type==='deposit')showFeedback(e.index,{kind:'deposit',moved:e.moved,remaining:e.remaining});
  if(e.type==='deliver'){showFeedback(e.index,{kind:'complete',reward:e.reward});Analytics.event(EVENTS.PROGRESS_REACHED,{mission:game.s.delivered})}
  if(e.type==='win')modal(true);
 }
}
function save(){Platform.save.update({orbit:game.snapshot()})}
async function start(){
 await Platform.init();game=new OrbitGame(await Platform.save.load());document.title=L.title;document.documentElement.lang=en?'en':'ru';Analytics.init(METRICA_ID,GAME_ID,{platform:Platform.name,bridge:window.vkBridge});shell();render(true);
 document.querySelector('#field').onpointerdown=e=>{const b=e.target.closest('[data-junk]');if(!b||paused)return;e.preventDefault();game.collect(Number(b.dataset.junk));events();save();render();draw()};
 app.onclick=e=>{if(e.target.closest('#menuButton')){modal(false);return}const d=e.target.closest('[data-deliver]'),u=e.target.closest('[data-up]');if(d)game.deliver(Number(d.dataset.deliver));if(u)game.buy(u.dataset.up);events();save();render()};
 for(const x of ['contextmenu','dragstart','selectstart'])document.addEventListener(x,e=>e.preventDefault());
 const suspend=()=>{paused=true;save();Platform.gameplayStop()};const resume=()=>{last=performance.now();if(!overlayOpen&&!document.hidden){paused=false;if(game.s.started&&!game.s.won)Platform.gameplayStart()}};
 window.addEventListener('blur',suspend);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',()=>document.hidden?suspend():resume());window.addEventListener('pagehide',()=>{Analytics.event(EVENTS.SESSION_END,{depth:game.s.delivered});save();Platform.save.flush()});
 if(window.vkBridge?.subscribe)window.vkBridge.subscribe(e=>{if(e?.detail?.type==='VKWebAppViewHide')suspend();if(e?.detail?.type==='VKWebAppViewRestore')resume()});
 Platform.ready();document.querySelector('#boot')?.remove();Analytics.event(EVENTS.GAME_START,{returning:game.s.started});modal(false);window.orbitGame=Object.freeze({inspect:()=>structuredClone(game.s)});requestAnimationFrame(frame);
}
function frame(now){const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(!paused){game.tick(dt);events()}draw();render();if(now-lastSave>5000){save();lastSave=now}requestAnimationFrame(frame)}
start().catch(e=>{console.error(e);const boot=document.querySelector('#boot');if(boot)boot.textContent='СБОЙ ЗАГРУЗКИ'});
