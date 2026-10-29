import {DIFFICULTIES,LAYOUTS,THEMES,SYMBOLS,TOTAL_LEVELS} from './data/garden.js';
import {createBoard,free,pairs,canMatch,reshuffle,recoverDeadlock,solveRemaining} from './mechanics/mahjong.js';
import {RULES,GIFT,NAMES,hasAssistance,migrate,compactSave,nextRunSerial,monthKey,boardKey,resetCombo,advanceCombo,awardPair,attachGift,openGift,completeRun} from './mechanics/progression.js';
import {CHAPTERS,chapterForLevel,chapterRun,chapterFinal,chapterStatus,completeChapter,trialLabel} from './mechanics/chapter.js';
import {initRecords,saveCloud,submitRecord,retryRecords,bindPlatform,gameplay} from './platform/records.js';
import {symbol} from './ui/tile-art.js';
import {icon} from './ui/game-icons.js';
import {decorateObjects} from './ui/object-art.js';
import {createProgressUI} from './ui/progression-ui.js';
import {Analytics} from './core/analytics.js';
import {EVENTS} from './data/analytics-events.js';
import {createVkAds} from './platform/vk-ads.js';
import {VK_DAILY_ENABLED,beginDaily} from './platform/vk-daily.js';
const VK_METRICA_ID = 113607035;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
document.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('dragstart',event=>event.preventDefault());
// iOS WebViews can ignore viewport zoom limits. Cancel only pinch gestures;
// single-finger scrolling in game dialogs remains available.
for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,event=>event.preventDefault(),{passive:false});
document.addEventListener('touchmove',event=>{if(event.touches.length>1)event.preventDefault();},{passive:false});

const KEY='jade-moon_save_v1', defaults={version:1,stars:{},daily:{},theme:'jade',difficulty:1,sound:true,motion:true,lastLevel:1,totalPairs:0,bestCombo:0,session:null};
let save;try{save={...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')};if(!save.stars||!save.daily)throw Error();}catch{save={...defaults};}
const inVk=new URLSearchParams(location.search).has('vk_app_id');
let loading;
if(inVk){loading=document.createElement('div');loading.className='platform-loading';loading.setAttribute('role','status');loading.innerHTML='<h2>Нефритовая Луна</h2><p>Загружаем твой прогресс…</p>';document.body.append(loading);$('#app').inert=true;}
let cloud=await initRecords();
while(inVk&&cloud===null){
 loading.innerHTML='<h2>Не удалось загрузить прогресс</h2><p>Проверь соединение и повтори загрузку, чтобы продолжить свою партию.</p><button class="play-button">Повторить</button>';
 await new Promise(resolve=>loading.querySelector('button').onclick=resolve);
 loading.innerHTML='<h2>Нефритовая Луна</h2><p>Повторяем подключение…</p>';cloud=await initRecords();
}
loading?.remove();$('#app').inert=false;if(cloud)save={...defaults,...cloud};migrate(save);
if(inVk)Analytics.init(VK_METRICA_ID,'jade-moon-vk',{platform:'metrika'});
save.difficulty=Math.max(0,Math.min(3,Number(save.difficulty)||0));if(!THEMES.some(t=>t.id===save.theme))save.theme='jade';
let state=null,selected=null,selectedClone=null,busy=false,active=false,focused=false,focusWindow=true,platformHidden=false,hintIds=[],toastTimer,lastFocus=null,ctx=null;
let lastClock=performance.now(),vortexActive=false;
let currentScreen='home',mapPage=0,setIndex=0;
let turnCheckpoint=null,cloudConflictBlocked=false;
let adActive=false,adRecoveryBlocked=false,adPlaySeconds=0;
let pendingLevelTransition=null;
// Native VK can resolve an ad before it restores the game WebView.
function finishLevelTransition(){
 if(!pendingLevelTransition?.ready||busy||adActive||platformHidden||document.hidden)return;
 const next=pendingLevelTransition;pendingLevelTransition=null;
 if(state===next.run&&currentScreen==='game'&&$('#dialog').classList.contains('victory-popup')&&!cloudConflictBlocked&&!adRecoveryBlocked)start(next.level,next.difficulty);
}
document.addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||adActive)return;
 const scope=$('#dialog-backdrop').hidden?$('#app'):$('#dialog');
 const buttons=[...scope.querySelectorAll('button:not(:disabled)')].filter(b=>b.getBoundingClientRect().width&&b.getAttribute('aria-disabled')!=='true');
 if(!buttons.length)return;
 const origin=document.activeElement?.getBoundingClientRect(),horizontal=/Left|Right/.test(event.key),sign=/Left|Up/.test(event.key)?-1:1;
 const center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});const from=origin&&origin.width?center(origin):null;
 const next=from?buttons.filter(b=>b!==document.activeElement).map(b=>{const p=center(b.getBoundingClientRect()),primary=(horizontal?p.x-from.x:p.y-from.y)*sign,secondary=Math.abs(horizontal?p.y-from.y:p.x-from.x);return {b,primary,weight:primary+secondary*3};}).filter(x=>x.primary>2).sort((a,b)=>a.weight-b.weight)[0]?.b:buttons[0];
 if(next){event.preventDefault();next.focus();}
});
const ads=createVkAds({bridge:window.vkBridge,enabled:inVk,clock:()=>adPlaySeconds*1000,fault:()=>{adRecoveryBlocked=true;modal('<h2 id=dialog-title>Видео не ответило</h2><p>Прогресс сохранён. Обнови игру, чтобы безопасно продолжить.</p><button class=play-button id=reload-ad>Обновить игру</button>');$('#close-dialog').disabled=true;$('#reload-ad').onclick=()=>location.reload();},lock:value=>{adActive=value;if(value){ctx?.suspend();persist();}$('#app').inert=value||!$('#dialog-backdrop').hidden;$('#dialog').inert=value;if(!value&&!platformHidden&&focusWindow&&save.sound)ctx?.resume();},event:name=>Analytics.event(name,{place:'level_transition_or_pause'})});
const reduced=()=>!save.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
const stars=()=>Object.values(save.stars).reduce((a,b)=>a+(Number(b)||0),0)+Object.values(save.daily).reduce((a,b)=>a+(Number(b)||0),0);
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
function persist({timerOnly=false}={}){compactSave(save);if(state)save.session=structuredClone(state);const snapshot=turnCheckpoint||save;let local=true;try{localStorage.setItem(KEY,JSON.stringify(snapshot));}catch{local=false;}const cloud=saveCloud(snapshot,{defer:timerOnly});if(!local&&!cloud)toast('Хранилище недоступно: прогресс останется до закрытия игры');}
function tone(freq=520,duration=.15,volume=.06){if(!save.sound||!focusWindow||platformHidden||adActive||document.hidden)return;ctx??=new AudioContext();ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,ctx.currentTime+duration);g.gain.setValueAtTime(volume,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration);}
function cloudConflict(){cloudConflictBlocked=true;clearTimeout(toastTimer);$('#toast').classList.remove('visible');if(busy){setTimeout(cloudConflict,150);return;}modal('<h2 id=dialog-title>Прогресс изменился</h2><p>В другом окне появился более свежий прогресс. Загрузи его, чтобы продолжить.</p><button class=play-button id=reload-cloud>Загрузить прогресс</button>');$('#close-dialog').disabled=true;$('#reload-cloud').onclick=()=>location.reload();}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function modal(html,type=''){void ads.banner(false);if(state)resetCombo(state);clearSelection();gameplay(false);lastFocus=document.activeElement;$('#dialog').className=type;$('#dialog-content').innerHTML=html;decorateObjects($('#dialog-content'));$('#dialog-backdrop').hidden=false;$('#app').inert=true;$('#close-dialog').focus();}
function close(){if(cloudConflictBlocked||adRecoveryBlocked||adActive||(busy&&$('#dialog').inert))return;gameplay(active);const wasVictory=$('#dialog').classList.contains('victory-popup');$('#dialog-backdrop').hidden=true;$('#app').inert=false;if(wasVictory)showHome();else if(lastFocus?.isConnected)lastFocus.focus();}
function clearSelection(){selected=null;selectedClone?.remove();selectedClone=null;$$('.tile.selected').forEach(e=>e.classList.remove('selected'));}
function refreshHeader(){document.body.dataset.skin=save.theme;document.body.classList.toggle('reduce-motion',!save.motion);$('#star-total').textContent=stars();$('#sound').innerHTML=icon(save.sound?'sound':'mute');$('#sound').setAttribute('aria-pressed',String(save.sound));$('#menu').innerHTML=icon(currentScreen==='home'?'settings':currentScreen==='game'?'pause':'back');$('#menu').setAttribute('aria-label',currentScreen==='home'?'Настройки':currentScreen==='game'?'Пауза':'На главный экран');$('#header-title').textContent=currentScreen==='home'?'':currentScreen==='game'?'МАДЖОНГ':'';}
function showScreen(name){if(cloudConflictBlocked||adRecoveryBlocked||adActive)return;pendingLevelTransition=null;void ads.banner(name==='home'&&Object.keys(save.stars).length>0&&innerHeight>=700);clearSelection();currentScreen=name;active=name==='game';gameplay(active);if(state&&!active)resetCombo(state);$$('.screen').forEach(e=>e.hidden=e.id!==name);$('#dialog-backdrop').hidden=true;$('#app').inert=false;document.body.dataset.screen=name;document.body.dataset.region=(name==='game'?chapterRun(state):name==='map'?CHAPTERS[mapPage]:chapterForLevel(save.lastLevel))?.scene||'palace';refreshHeader();if(active)requestAnimationFrame(render);}
function nextLevel(){for(let n=1;n<=TOTAL_LEVELS;n++)if(!save.stars[save.difficulty+':'+n])return n;return 1;}
function showHome(){if(busy)return;if(currentScreen==='game'&&state)persist();showScreen('home');metaUI.banner();const continuing=save.session&&!save.session.won;$('#play span').textContent=continuing?'ПРОДОЛЖИТЬ':'ИГРАТЬ';$('#play-label').textContent=continuing?(save.session.daily?'Испытание дня':'Уровень '+save.session.level):'Уровень '+nextLevel();$('#difficulty-home b').textContent=DIFFICULTIES[save.difficulty].name;$('#difficulty-home .difficulty-dots').textContent='●'.repeat(save.difficulty+1)+'○'.repeat(3-save.difficulty);}
async function start(level=1,difficulty=save.difficulty,daily=null){if(busy)return;clearSelection();const config=DIFFICULTIES[difficulty];let seed=daily?Number(daily.replaceAll('-',''))+difficulty*104729:undefined;const generated=createBoard(level,difficulty,config,seed);const nextState={...generated,level,difficulty,daily,score:0,elapsed:0,hints:config.hints,shuffles:config.shuffles,used:0,history:[],combo:0,bestCombo:0,lastPairAt:-100,won:false,rules:RULES,season:monthKey(),runId:crypto.randomUUID(),serial:nextRunSerial(save),deck:[...save.meta.deck],comboLeft:0,vortices:0,chapterVersion:2,shufflesUsed:0};attachGift(save,nextState);
if(inVk&&VK_DAILY_ENABLED&&daily){
 busy=true;$('#dialog').inert=true;const button=$('#begin');if(button){button.disabled=true;button.textContent='Подключаем рейтинг…';}
 try{nextState.vkMoves=[];await beginDaily(nextState);}catch{toast('Не удалось подключить рейтинг. Проверь соединение и повтори.');return;}finally{busy=false;$('#dialog').inert=false;if(button?.isConnected){button.disabled=false;button.textContent='Играть';}}
}
state=nextState;save.difficulty=difficulty;if(!daily)save.lastLevel=level;focused=false;hintIds=[];enterGame();persist();}
function enterGame(){showScreen('game');$('#combo').textContent='';if(inVk)Analytics.event(EVENTS.GAME_START,{level:state.level,difficulty:state.difficulty});}
function resume(){try{state=structuredClone(save.session);if(!state||!Array.isArray(state.tiles)||!state.tiles.length||state.won)throw Error();resetCombo(state);state.deck??=Array.from({length:20},(_,i)=>i);enterGame();if(state.tiles.every(t=>t.removed))finish();else stuck();}catch{start();}}
function render(){if(!state||!active)return;const wrap=$('#board-wrap'),maxZ=Math.max(...state.tiles.map(t=>t.z));const w=Math.max(15,Math.min(78,(wrap.clientWidth-24)/(6+maxZ*.1),(wrap.clientHeight-18)/(8*1.23+maxZ*.11)));const h=w*1.23,stepX=w+1,stepY=h+1,offset=w*.105;const board=$('#board');board.style.width=`${6*stepX+maxZ*offset}px`;board.style.height=`${8*stepY+maxZ*offset+9}px`;board.innerHTML='';for(const t of state.tiles){if(t.removed)continue;const available=free(t,state.tiles),e=document.createElement('button');e.className=`tile ${available?'available':'blocked'} ${hintIds.includes(t.id)?'hinted':''} ${focused&&!available?'focus-dim':''} ${selected?.id===t.id?'selected':''}`;e.dataset.id=t.id;e.setAttribute('aria-label',`${NAMES[t.kind===GIFT?GIFT:state.deck?.[t.kind]??t.kind]} · ${available?'свободна':'закрыта'}`);e.setAttribute('aria-disabled',String(!available));e.style.cssText=`width:${w}px;height:${h}px;left:${t.x*stepX+(maxZ-t.z)*offset}px;top:${t.y*stepY+(maxZ-t.z)*offset}px;z-index:${Math.round(t.z*100+t.y*2)+1}`;e.innerHTML=symbol(t.kind===GIFT?GIFT:state.deck?.[t.kind]??t.kind)+(state.gift?.ids?.includes(t.id)&&!state.gift.opened?'<span class=gift-mark aria-label=Подарок>'+symbol(GIFT)+'</span>':'');e.onclick=()=>pick(t.id);board.append(e);}updateHUD();}
function updateHUD(){$('#score-label').textContent=hasAssistance(state)?'С ПОМОЩЬЮ':'ОЧКИ';$('#score').textContent=state.score;$('#remaining').textContent=state.tiles.filter(t=>!t.removed).length/2;$('#timer').textContent=time(state.elapsed);$('#layout-title').textContent=chapterRun(state)?chapterRun(state).stops[state.level-chapterRun(state).start]:LAYOUTS[(state.level-1)%12];$('#level-button').textContent=state.daily?'ИСПЫТАНИЕ ДНЯ':'УРОВЕНЬ '+String(state.level).padStart(2,'0');$('#difficulty-label').textContent=chapterFinal(state)?trialLabel(state):DIFFICULTIES[state.difficulty].name;$('#hint small').textContent=state.hints;$('#shuffle small').textContent=state.shuffles;$('#undo').disabled=!state.history.length;$('#hint').disabled=!state.hints;$('#shuffle').disabled=!state.shuffles&&pairs(state.tiles).length>0;$('#focus').classList.toggle('active',focused);}
async function animate(el,frames,duration=440){await el.animate(frames,{duration:reduced()?70:duration,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'}).finished;}
async function fly(t,side){const src=$(`[data-id="${t.id}"]`),r=src.getBoundingClientRect(),target=$('.slot.'+side).getBoundingClientRect(),clone=src.cloneNode(true);clone.removeAttribute('data-id');clone.removeAttribute('aria-label');clone.className='tile flying';clone.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;$('#effects').append(clone);src.classList.add('selected');await animate(clone,[{transform:'translate(0,0) rotate(0deg)',width:r.width+'px',height:r.height+'px'},{transform:`translate(${(target.left-r.left)*.6}px,${target.top-r.top-30}px) rotate(${side==='left'?-12:12}deg)`,offset:.65},{transform:`translate(${target.left-r.left}px,${target.top-r.top}px) rotate(0deg)`,width:target.width+'px',height:target.height+'px'}]);return clone;}
function tickClock(){const now=performance.now(),dt=now-lastClock;lastClock=now;if(active&&state&&!state.won&&!busy&&$('#dialog-backdrop').hidden&&!document.hidden&&focusWindow&&!platformHidden){const had=state.combo;advanceCombo(state,dt);if(had&&!state.combo)$('#combo').textContent='';}}
async function collide(a,b,automatic=false){
const second=await fly(b,'right'),center=$('#match-stage').getBoundingClientRect(),clones=[selectedClone,second];
await Promise.all(clones.map((c,i)=>animate(c,[{transform:getComputedStyle(c).transform},{transform:`translate(${center.left+center.width/2-parseFloat(c.style.left)-22+(i?-4:4)}px,${center.top+12-parseFloat(c.style.top)}px) rotate(${i?-12:12}deg)`}],190)));
burst(center.left+center.width/2,center.top+35);clones.forEach(c=>c.remove());selected=null;selectedClone=null;
a.removed=b.removed=true;const reward=awardPair(state,automatic);if(state.vkMoves)state.vkMoves.push({a:a.id,b:b.id,automatic,chain:state.combo});tone(automatic?1319:[523,587,659,784,880,1047,1175][reward.multiplier-1],.25,.045);save.totalPairs++;save.bestCombo=Math.max(save.bestCombo,state.bestCombo);
if(state.gift?.ids||a.kind===GIFT){const gift=openGift(save,state);if(gift){state.discoveries??=[];state.discoveries.push(gift);}}
$('#combo').textContent=automatic?`ВИХРЬ · +${reward.points}`:`${reward.multiplier>1?'×'+reward.multiplier+' · ':''}+${reward.points}`;
render();persist();return reward;
}
function safeRoute(){const result=solveRemaining(state.tiles,{preferred:state.solution});if(result.status==='solved')state.solution=result.solution;return result;}
async function runVortex(){
tone(1568,.45,.05);vortexActive=true;$('#game').classList.add('vortex-active');$('#combo').textContent='ДРАКОНИЙ ВИХРЬ';
try{for(let i=0;i<3;i++){const route=safeRoute();if(route.status!=='solved'||!route.solution.length)break;const [a,b]=route.solution[0].map(id=>state.tiles.find(t=>t.id===id));selected=a;selectedClone=await fly(a,'left');await collide(a,b,true);}}
finally{vortexActive=false;$('#game').classList.remove('vortex-active');$('#combo').textContent=state.combo?'×7 · СЕРИЯ ПРОДОЛЖАЕТСЯ':'';}
}
async function pick(id){
if(busy||!active||!$('#dialog-backdrop').hidden||state.won)return;tickClock();
const t=state.tiles.find(t=>t.id===id);if(!free(t,state.tiles)){toast('Костяшка закрыта сверху или с боков');tone(180,.1,.025);return;}
hintIds=[];$$('.hinted').forEach(e=>e.classList.remove('hinted'));
if(selected?.id===id){clearSelection();render();return;}
busy=true;tone(610,.16);
try{
if(selected&&!canMatch(selected,t,state.tiles)){clearSelection();render();}
if(!selected){selected=t;selectedClone=await fly(t,'left');return;}
const a=selected,b=t;
// One undo restores the manual pair and all pairs removed by its vortex.
const history={ids:state.tiles.filter(t=>!t.removed).map(t=>t.id),score:state.score,vortices:state.vortices||0,bestCombo:state.bestCombo};
turnCheckpoint=structuredClone({...save,session:state});persist();
const reward=await collide(a,b);if(reward.vortex)await runVortex();
state.history.push(history);turnCheckpoint=null;updateHUD();persist();
for(const g of state.discoveries||[]){if(g.seen)continue;g.seen=true;toast(g.id!==undefined?'В коллекции: '+NAMES[g.id]:'+10 жетонов');const art=document.createElement('span');art.className='tile toast-prize';art.innerHTML=symbol(g.id??GIFT);$('#toast').prepend(art);}persist();
if(state.tiles.every(t=>t.removed))finish();else if(!pairs(state.tiles).length)setTimeout(stuck,450);
}catch(error){if(turnCheckpoint){const saved=turnCheckpoint;turnCheckpoint=null;for(const key of Object.keys(save))delete save[key];Object.assign(save,saved);state=structuredClone(saved.session);}clearSelection();$('#effects').innerHTML='';render();persist();toast('Ход не завершён — повтори выбор пары');console.error(error);}
finally{busy=false;lastClock=performance.now();}
}
function burst(x,y){if(reduced())return;const el=document.createElement('div');el.className='burst';el.style.left=(x-120)+'px';el.style.top=(y-120)+'px';$('#effects').append(el);const start=performance.now();function tick(now){const f=Math.floor((now-start)/25);if(f>=36){el.remove();return;}el.style.backgroundPosition=`${(f%6)*20}% ${Math.floor(f/6)*20}%`;requestAnimationFrame(tick);}requestAnimationFrame(tick);}
function assistanceNotice(){if(!hasAssistance(state))toast('С помощью — без рекорда. Прогресс и сезон сохраняются.');}
function hint(){if(busy||!state||!state.hints)return;clearSelection();resetCombo(state);if(!pairs(state.tiles).length){stuck();return;}
const route=safeRoute();if(route.status!=='solved'){toast(route.status==='unknown'?'Не удалось проверить путь. Подсказка сохранена.':'В этой позиции нет полного решения. Верни ход или перемешай.');return;}
if(inVk)Analytics.first(EVENTS.HINT_FIRST);assistanceNotice();hintIds=route.solution[0];state.hints--;state.used++;render();persist();tone(740,.15);}
function undo(){if(busy||!state?.history.length)return;clearSelection();if(inVk)Analytics.first(EVENTS.UNDO_FIRST);const m=state.history.pop();if(m.ids){const live=new Set(m.ids);for(const t of state.tiles)t.removed=!live.has(t.id);}else for(const id of [m.a,m.b])state.tiles.find(t=>t.id===id).removed=false;state.score=m.score;state.vortices=m.vortices||0;state.bestCombo=m.bestCombo||0;resetCombo(state);assistanceNotice();state.used++;hintIds=[];render();persist();$('#combo').textContent='Ход возвращён';tone(350);}
function shuffle(){
if(busy||!state||state.won)return;
const deadlocked=!pairs(state.tiles).length;
if(!deadlocked&&!state.shuffles)return;
clearSelection();resetCombo(state);
if(inVk)Analytics.first(EVENTS.SHUFFLE_FIRST);state.shufflesUsed=(state.shufflesUsed||0)+1;
if(deadlocked)recoverDeadlock(state);
else{state.shuffles--;state.used++;state.solution=reshuffle(state.tiles,state.seed+1009*(10-state.shuffles)+state.elapsed);state.history=[];state.combo=0;}
hintIds=[];render();persist();$('#dialog-backdrop').hidden=true;$('#app').inert=false;
toast(deadlocked?'Путь открыт · с помощью, без рекорда':'Костяшки перемешаны · с помощью, без рекорда');tone(710,.3);
}
function stuck(){
if(!active||!state||state.won||!state.tiles.some(t=>!t.removed)||pairs(state.tiles).length)return;
const lastPair=state.tiles.filter(t=>!t.removed).length===2;
modal(`<h2 id="dialog-title">${lastPair?'Освободим последнюю пару':'Откроем новые пары'}</h2><div class="popup-art"><i class="object-icon icon-shuffle"></i></div><p>${lastPair?'Костяшки перекрывают друг друга. Разложим их рядом.':'Доступные пары закончились. Переставим оставшиеся костяшки.'}</p><p class="popup-note">Бесплатно · очки и звёзды сохранятся<br>Это прохождение не попадёт в рекорды</p><button class="play-button" id="rescue">${lastPair?'Разложить рядом':'Открыть пары'}</button>`);
decorateObjects($('#dialog'));$('#rescue').onclick=shuffle;
}
function finish(){
if(inVk)Analytics.event(EVENTS.PROGRESS_REACHED,{level:state.level,difficulty:state.difficulty,score:state.score});
state.won=true;const run=state,earned=state.used===0?3:state.used<=3?2:1,key=state.daily||`${state.difficulty}:${state.level}`,table=state.daily?save.daily:save.stars;
table[key]=Math.max(table[key]||0,earned);const result=completeRun(save,state),chapter=completeChapter(save,state),definition=chapterRun(state),retrySeal=chapterFinal(state)&&!chapterStatus(save,state.difficulty,definition).seal;persist();refreshHeader();
modal(`<h2 id="dialog-title">${chapter.reward?'Глава пройдена!':'Победа!'}</h2><div class="victory-stars">${'★'.repeat(earned)}<span class="unearned">${'★'.repeat(3-earned)}</span></div><div class="result-stats"><div><b>${state.score}</b><small>очков</small></div><div><b>${time(state.elapsed)}</b><small>время</small></div><div><b>×${state.bestCombo}</b><small>серия</small></div></div><p class="popup-note">${result.legacy?'Прежние правила · вне новых рекордов':result.ranked?'Без помощи · результат для рекордов':'С помощью · вне рекордов. Прогресс и сезон зачтены.'}</p>${chapter.reward?`<button class="chapter-win-prize" id="chapter-equip"><span class="tile">${symbol(definition.art)}</span><span><b>${definition.prize}</b><small>Твой навсегда · выбрать в наборе ›</small></span></button>`:chapterFinal(state)?`<p class="popup-note">${retrySeal?definition.condition+'.':'Печать получена.'} ${chapterStatus(save,state.difficulty,definition).cleared}/12 уровней главы.</p>`:''}<div id="win-reward">${result.gift?'Подарок ждёт в следующей партии':state.discoveries?.length?'Новые рисунки уже в коллекции':result.legacy?'Партия начата по прежним правилам':result.best?'Личный рекорд!':''}</div><button class="play-button" id="next">${retrySeal?'Повторить финал':chapter.reward?'Продолжить путь':state.daily?'Играть дальше':'Следующий уровень'}</button><br><button class="secondary" id="victory-home">На главный экран</button>`,'victory-popup');
void ads.prepareTransition();
if($('#chapter-equip'))$('#chapter-equip').onclick=()=>{close();metaUI.editor();};
if(chapter.reward){tone(784,.4,.05);setTimeout(()=>tone(1047,.5,.04),140);}
$('#next').onclick=async()=>{if(adActive||pendingLevelTransition)return;const next={run,level:retrySeal?definition.end:run.daily?nextLevel():run.level%TOTAL_LEVELS+1,difficulty:run.difficulty,ready:false};pendingLevelTransition=next;await ads.transition();if(pendingLevelTransition!==next)return;next.ready=true;finishLevelTransition();};$('#victory-home').onclick=()=>{pendingLevelTransition=null;showHome();};
submitRecord(save,run).then(r=>{persist();if(r.gift){if(state===run&&$('#win-reward'))$('#win-reward').textContent='Рекорд побит! Подарок в следующей партии';else toast('За рекорд получен подарок');}}).catch(()=>{persist();if(state===run&&$('#win-reward'))$('#win-reward').textContent='Результат сохранён · отправим при подключении';});
}
function difficulty(level=null,daily=null){if(busy)return;let choice=save.difficulty;const setupOnly=level===null;modal(`<h2 id="dialog-title">${setupOnly?'Сложность':daily?'Испытание дня':'Уровень '+level}</h2><div class="popup-art">${daily?'<i class="object-icon icon-daily"></i>':`<div class="tile">${symbol(0)}</div><div class="tile">${symbol(4)}</div>`}</div><div class="difficulty-options">${DIFFICULTIES.map((d,i)=>`<button data-diff="${i}" class="${i===choice?'selected':''}" aria-pressed="${i===choice}"><span class="diff-medal"><span class="tile">${symbol([0,3,5,2][i])}</span><small>${'◆'.repeat(i+1)}</small></span>${d.name}</button>`).join('')}</div><div id="difficulty-summary"></div>${!daily&&chapterForLevel(level)?.end===level?`<p class="chapter-condition">${chapterForLevel(level).condition}</p>`:''}<button class="play-button" id="begin">${setupOnly?'Выбрать':'Играть'}</button>${!setupOnly&&save.session&&!save.session.won?'<p class="popup-note">Текущая партия будет заменена.</p>':''}`,'difficulty-popup');const summary=()=>{$('#difficulty-summary').innerHTML=`${DIFFICULTIES[choice].layers} сл. · ${DIFFICULTIES[choice].kinds} рисунков<br><span>${DIFFICULTIES[choice].sub}</span>`;};summary();$$('[data-diff]').forEach(b=>b.onclick=()=>{choice=Number(b.dataset.diff);$$('[data-diff]').forEach(e=>{e.classList.toggle('selected',e===b);e.setAttribute('aria-pressed',String(e===b));});summary();});$('#begin').onclick=()=>{if(setupOnly){save.difficulty=choice;persist();close();if(currentScreen==='home')showHome();}else start(level,choice,daily);};}
const mapPoints=[[12,82],[33,76],[52,87],[73,72],[86,53],[63,48],[42,58],[19,45],[13,22],[37,16],[60,25],[84,14]];
function levels(page=Math.floor((save.lastLevel-1)/12)){
 if(busy)return;mapPage=Math.max(0,Math.min(29,page));showScreen('map');
 const def=CHAPTERS[mapPage],status=def?chapterStatus(save,save.difficulty,def):null;
 $('#map-range').textContent=def?`Глава ${def.id} · ${status.cleared}/12 · ${DIFFICULTIES[save.difficulty].name}`:`Уровни ${mapPage*12+1}–${mapPage*12+12}`;
 $('#map .screen-ribbon h2').textContent=def?.short||'ПУТЕШЕСТВИЕ';$('#map').classList.toggle('chapter-map',!!def);
 $('#chapter-reward').hidden=!def;
 if(def){$('#chapter-reward').innerHTML=`<span class=tile>${symbol(def.art)}</span><span><small>НАГРАДА ГЛАВЫ</small><b>${def.prize}</b><small>${status.claimed?'В твоей коллекции':status.seal?'Печать получена · осталось пройти главу':def.summary}</small></span><strong>${status.claimed?'✓':'›'}</strong>`;$('#chapter-reward').onclick=()=>chapterPreview(def);}
 $('#map-page').textContent=`${mapPage+1} / 30`;$('#map-prev').disabled=mapPage===0;$('#map-next').disabled=mapPage===29;
 const points=mapPage===1?mapPoints.map(([x,y])=>[100-x,y]):mapPoints;
 let path=`M ${points[0][0]*6.8} ${points[0][1]*5.2}`;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],mx=(a[0]+b[0])*3.4;path+=` C ${mx} ${a[1]*5.2}, ${mx} ${b[1]*5.2}, ${b[0]*6.8} ${b[1]*5.2}`;}
 $('#map-path').innerHTML=`<path d="${path}" class="map-path-shadow" transform="translate(0 5)"/><path d="${path}" class="map-path-edge"/><path d="${path}" class="map-path-core"/>`;
 const next=nextLevel();$('#map-nodes').innerHTML=points.map(([x,y],i)=>{
  const n=mapPage*12+i+1,earned=save.stars[save.difficulty+':'+n]||0,final=def?.end===n;
  return `<button class="level-node ${final?'chapter-finale':''} ${earned?'won':''} ${n===next?'current':''}" data-level="${n}" style="left:${x}%;top:${y}%" aria-label="Уровень ${n}${earned?', звёзд: '+earned:''}">${final?`<span class="finale-art">${symbol(def.art)}</span><span class="finale-number">${n}</span>`:n}${earned?'<small>'+'★'.repeat(earned)+'</small>':''}${n===next?'<span class="node-flag">ТВОЙ УРОВЕНЬ</span>':''}</button>`;
 }).join('');$$('[data-level]').forEach(b=>b.onclick=()=>difficulty(Number(b.dataset.level)));
}
function chapterPreview(def=CHAPTERS[mapPage]){
 const c=chapterStatus(save,save.difficulty,def);
 modal(`<h2 id="dialog-title">${def.name}</h2><div class="chapter-preview-art tile">${symbol(def.art)}</div><p><b>${def.prize}</b> · навсегда в коллекции</p><p class="popup-note">Пройди 12 уровней на одной сложности.<br>${def.condition}.<br>${def.help}</p><p>${c.cleared}/12 · ${c.seal?'Печать получена':'Печать впереди'}</p><button class="play-button" id="chapter-go">${c.claimed?'В коллекцию':c.cleared===12?'К финалу':'Продолжить главу'}</button>`,'chapter-popup');
 $('#chapter-go').onclick=()=>{if(c.claimed){close();metaUI.editor();}else{const n=Array.from({length:12},(_,i)=>def.start+i).find(n=>!save.stars[save.difficulty+':'+n])||def.end;difficulty(n);}};
}
function collection(index=THEMES.findIndex(t=>t.id===save.theme)){if(busy)return;setIndex=(index+THEMES.length)%THEMES.length;showScreen('collection');drawSet();}
function drawSet(){const t=THEMES[setIndex],total=stars(),selected=t.id===save.theme,unlocked=total>=t.cost;$('#set-display').dataset.skin=t.id;$('#set-tiles').innerHTML=[5,0,4].map(k=>`<div class="tile">${symbol(k)}</div>`).join('');$('#set-name').textContent=t.name;$('#set-dots').innerHTML=THEMES.map((_,i)=>`<i class="${i===setIndex?'active':''}"></i>`).join('');$('#set-choose').disabled=selected||!unlocked;$('#set-choose').textContent=selected?'Выбрано ✓':unlocked?'Выбрать набор':`${t.cost} ★ для открытия`;$('#set-progress').textContent=unlocked?'':`${total} / ${t.cost} ★`;$('#set-prev').disabled=setIndex===0;$('#set-next').disabled=setIndex===THEMES.length-1;}
function achievements(page=0){page=page===1?1:0;const wins=Object.keys(save.stars),list=[['Первый цветок',wins.length>=1,'1 уровень','✿'],['Путешественник',wins.length>=12,`${Math.min(12,wins.length)} / 12 уровней`,'◆'],['Безупречно',Object.values(save.stars).includes(3),'3 звезды без помощи','★'],['В потоке',save.bestCombo>=7,`Серия ×${Math.min(7,save.bestCombo)} / ×7`,'✦'],['Дракон',wins.some(k=>k.startsWith('3:')),'Уровень «Эксперт»','龍'],['Семь дней',Object.keys(save.daily).length>=7,`${Math.min(7,Object.keys(save.daily).length)} / 7 испытаний`,'☀'],['Три дракона',!!save.meta.feats?.threeVortices,'Три вихря за одну победу','龍'],['Чистый поток',!!save.meta.feats?.cleanFlow,'Победа без помощи с ×7','✦'],['Чистая десятка',Object.values(save.stars).filter(n=>n===3).length>=10,'10 уровней на 3 звезды','★'],['Четыре вершины',[0,1,2,3].every(d=>wins.some(k=>k.startsWith(d+':'))),'Победа на каждой сложности','✦'],['Коллекционер',save.meta.owned.length>20,'Получи новый рисунок','✿'],['Постоянство',(save.meta.checkin?.maxStreak||save.meta.checkin?.streak||0)>=7,`${Math.min(7,save.meta.checkin?.maxStreak||save.meta.checkin?.streak||0)} / 7 дней подряд`,'☀']];modal(`<h2 id="dialog-title">Достижения</h2><div class="achievements-grid">${list.slice(page*6,page*6+6).map(([name,ok,desc,mark])=>`<div class="achievement ${ok?'earned':''}"><div class="seal">${mark}</div><b>${name}</b><small>${desc}</small></div>`).join('')}</div><div class=book-controls><button id=ach-prev class="round gold" aria-label="Предыдущие достижения" ${page?'':'disabled'}>‹</button><span>${page+1} / 2</span><button id=ach-next class="round gold" aria-label="Следующие достижения" ${page?'disabled':''}>›</button></div>`);$('#ach-prev').onclick=()=>achievements(0);$('#ach-next').onclick=()=>achievements(1);}
function help(page=0){if(inVk)Analytics.event(EVENTS.TUTORIAL_STEP,{step:page+1});const texts=['Выбирай одинаковые костяшки. Они взлетят и разобьются в пару.','Можно взять костяшку, если сверху ничего нет и свободен левый или правый бок.','Пара — 20 очков, комбо до ×7. Каждая восьмая ручная пара в серии вызывает вихрь. ×7 сохраняется, но окно уменьшается: 2,4 с, затем на 0,2 с за пару до 0,8 с. Полёт не считается.'];const art=[`<div class="tile">${symbol(0)}</div><span class="help-arrow">↔</span><div class="tile">${symbol(0)}</div>`,`<span class="help-arrow">←</span><div class="stack"><div class="tile">${symbol(1)}</div><div class="tile">${symbol(5)}</div></div><span class="help-arrow">→</span>`,`<i class="object-icon icon-hint"></i><i class="object-icon icon-undo"></i><i class="object-icon icon-shuffle"></i>`];modal(`<h2 id="dialog-title">Как играть</h2><div class="help-art">${art[page]}</div><p>${texts[page]}</p><div class="help-steps">${[0,1,2].map(i=>i===page?'●':'○').join(' ')}</div><button id="help-next" class="play-button">${page===2?'Понятно':'Дальше'}</button>`,'help-popup');$('#help-next').onclick=()=>page===2?close():help(page+1);}
function settings(){if(busy)return;modal(`<h2 id="dialog-title">Настройки</h2><div class="settings-row"><span>Звук</span><button id="settings-sound" class="toggle ${save.sound?'on':''}" aria-label="Звук" aria-pressed="${save.sound}"></button></div><div class="settings-row"><span>Анимация</span><button id="settings-motion" class="toggle ${save.motion?'on':''}" aria-label="Анимация" aria-pressed="${save.motion}"></button></div><button class="play-button" id="settings-ok">Готово</button>`,'settings-popup');$('#settings-sound').onclick=()=>{save.sound=!save.sound;persist();refreshHeader();const b=$('#settings-sound');b.classList.toggle('on',save.sound);b.setAttribute('aria-pressed',String(save.sound));if(save.sound)tone();};$('#settings-motion').onclick=()=>{save.motion=!save.motion;persist();refreshHeader();const b=$('#settings-motion');b.classList.toggle('on',save.motion);b.setAttribute('aria-pressed',String(save.motion));};$('#settings-ok').onclick=close;}
function pause(){if(busy||cloudConflictBlocked||adRecoveryBlocked||adActive)return;modal(`<h2 id="dialog-title">Пауза</h2><button class="play-button" id="unpause">Продолжить</button><br><button class="secondary" id="pause-settings">Настройки</button><br><button class="secondary" id="pause-home">На главный экран</button>`,'pause-popup');$('#unpause').onclick=close;$('#pause-settings').onclick=settings;$('#pause-home').onclick=showHome;const dialog=$('#dialog-content'),pauseButton=$('#unpause');if(inVk&&state&&!state.won)void ads.available('reward').then(ok=>{if(!ok||pauseButton!==$('#unpause')||cloudConflictBlocked)return;const button=document.createElement('button');button.className='secondary';button.id='reward-hints';button.textContent='Видео: +2 подсказки';dialog.append(document.createElement('br'),button);button.onclick=async()=>{if(adActive)return;const run=state;button.disabled=true;const earned=await ads.showReward();if(earned&&state===run&&!cloudConflictBlocked){state.hints+=2;persist();render();toast('+2 подсказки');}else if(!earned)toast('Видео недоступно или не досмотрено');if(button.isConnected)button.remove();};});}
const metaUI=createProgressUI({firstUse:name=>{if(inVk)Analytics.first(name);},save,getRun:()=>state||{level:save.lastLevel,difficulty:save.difficulty,season:monthKey()},showScreen,modal,close,persist,toast,materials:()=>collection(),daily:()=>{const date=new Date().toISOString().slice(0,10);difficulty(Number(date.replaceAll('-',''))%360+1,date);}});
$('#records-home').onclick=()=>{if(!busy)metaUI.records();};
$('.hero-tiles').innerHTML=[3,1,0,4,5].map(k=>`<div class="tile">${symbol(k)}</div>`).join('');$('#petals').innerHTML=Array.from({length:15},(_,i)=>`<i class="petal" style="left:${(i*37)%100}%;top:-20px;animation-delay:-${i*1.17}s;animation-duration:${14+i%8}s"></i>`).join('');
$('#play').onclick=()=>save.session&&!save.session.won?resume():start(nextLevel());$('#difficulty-home').onclick=()=>difficulty();$('#levels-home').onclick=()=>levels();$('#daily-home').onclick=()=>metaUI.activities();$('#collection-home').onclick=()=>metaUI.editor();$('#help').onclick=()=>{if(!busy)help();};$('#level-button').onclick=()=>levels(Math.floor((state.level-1)/12));$('#difficulty-label').onclick=()=>difficulty(state.level,state.daily);$('#hint').onclick=hint;$('#undo').onclick=undo;$('#shuffle').onclick=shuffle;$('#focus').onclick=()=>{if(busy)return;focused=!focused;render();};$('#close-dialog').onclick=close;$('#sound').onclick=()=>{save.sound=!save.sound;if(save.sound)tone();persist();refreshHeader();};$('#menu').onclick=()=>{if(busy)return;if(currentScreen==='home')settings();else if(currentScreen==='game')pause();else showHome();};$('#map-prev').onclick=()=>levels(mapPage-1);$('#map-next').onclick=()=>levels(mapPage+1);$('#set-prev').onclick=()=>collection(setIndex-1);$('#set-next').onclick=()=>collection(setIndex+1);$('#set-choose').onclick=()=>{const t=THEMES[setIndex];if(stars()<t.cost)return;save.theme=t.id;persist();refreshHeader();drawSet();tone(820,.3);};$('#achievements').onclick=achievements;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(busy||adActive)return;if(!$('#dialog-backdrop').hidden)close();else if(selected){clearSelection();render();}else $('#menu').click();}if(e.key==='Tab'&&!$('#dialog-backdrop').hidden){const buttons=$$('#dialog button:not(:disabled)'),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
window.addEventListener('resize',()=>{if(!busy)clearSelection();render();});window.addEventListener('blur',()=>{focusWindow=false;if(state)resetCombo(state);ctx?.suspend();persist();});window.addEventListener('focus',()=>{focusWindow=true;if(save.sound&&!platformHidden&&!adActive)ctx?.resume();});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state)resetCombo(state);ctx?.suspend();persist();}else{if(save.sound&&focusWindow&&!platformHidden&&!adActive)ctx?.resume();finishLevelTransition();}});
setInterval(()=>{if(active&&state&&!state.won&&$('#dialog-backdrop').hidden&&!document.hidden&&focusWindow&&!platformHidden&&!adActive){adPlaySeconds++;state.elapsed++;$('#timer').textContent=time(state.elapsed);if(state.elapsed%5===0)persist({timerOnly:true});}},1000);setInterval(tickClock,40);let wasOffline=false;bindPlatform({saveStatus:status=>{if(status==='offline'){wasOffline=true;toast('Нет связи с облаком. Повторим сохранение автоматически.');}else if(status==='saved'&&wasOffline){wasOffline=false;toast('Связь восстановлена — прогресс сохранён');}else if(status==='conflict')cloudConflict();else if(status==='recovered')toast('Загружен более свежий прогресс из облака.');else if(status==='unavailable')toast('Облачное сохранение недоступно');},pause:()=>{platformHidden=true;void ads.banner(false);if(state)resetCombo(state);ctx?.suspend();persist();if(active&&!busy)pause();},resume:()=>{platformHidden=false;if(active&&!busy&&$('#dialog-backdrop').hidden)pause();finishLevelTransition();},accountChanged:()=>{toast('Профиль изменился. Обнови игру для загрузки прогресса.');if(active&&!busy)pause();}});decorateObjects();showHome();

window.addEventListener('pagehide',()=>{persist();if(inVk)Analytics.event(EVENTS.SESSION_END,{level:state?.level||save.lastLevel,score:state?.score||0,pairs:save.totalPairs});});

let dailyRefreshFlight=null,dailyRefreshDay='';
async function refreshDailyRewards(){
 if(!inVk||!VK_DAILY_ENABLED||cloudConflictBlocked||dailyRefreshFlight)return;
 dailyRefreshFlight=retryRecords(save);try{const result=await dailyRefreshFlight;if(cloudConflictBlocked)return;persist();if(result.gift)toast('За рейтинг дня — подарочная костяшка в следующей партии!');dailyRefreshDay=new Date().toISOString().slice(0,10);}catch{}finally{dailyRefreshFlight=null;}
}
void refreshDailyRewards();window.addEventListener('online',()=>void refreshDailyRewards());
setInterval(()=>{if(!document.hidden&&dailyRefreshDay!==new Date().toISOString().slice(0,10))void refreshDailyRewards();},60000);
