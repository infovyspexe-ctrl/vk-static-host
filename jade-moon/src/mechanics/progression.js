export const RULES='jade-8';
export const CHAPTER_ART=30;
export const CHAPTER_ARTS=[30,31];
export const hasAssistance=run=>!!(run.used||run.recoveries);
export const recordEligible=run=>run.rules===RULES&&!hasAssistance(run);
export const COMBO_MS=3000;
export const BASE_COUNT=20;
export const GIFT=20;
export const RARE=[21,22,23,24,25,26,27,28,29];
export const NAMES=['Лотос','Бамбук','Красный дракон','Веер','Карп','Журавль','Монеты','Слива','Гора','Облако','Солнце','Лист','Север','Восток','Юг','Запад','Жемчуг','Чай','Персик','Бабочка','Подарок','Нефритовый дракон','Феникс','Лунная лиса','Звёздный месяц','Алый фонарь','Белый тигр','Морская черепаха','Ирис','Императорская корона','Золотой карп','Хранитель бамбука'];
export const dayKey=(date=new Date())=>date.toISOString().slice(0,10);
export const monthKey=(date=new Date())=>dayKey(date).slice(0,7);
export function boardKey(run){return `${run.rules||RULES}:${run.season||monthKey()}:${run.difficulty}:${run.daily?'day-'+run.daily:run.level}`;}
export function migrate(save){
save.meta??={};const m=save.meta;
m.owned=Array.from(new Set([...Array.from({length:20},(_,i)=>i),...(m.owned||[]).filter(n=>RARE.includes(n)||CHAPTER_ARTS.includes(n))]));
m.chapters??={seals:{},claimed:false};m.chapters.seals??={};
const used=new Set();m.deck=Array.from({length:20},(_,i)=>{let k=m.deck?.[i];if(!m.owned.includes(k)||used.has(k))k=m.owned.find(n=>!used.has(n));used.add(k);return k;});
m.pending??=[];m.claimed??={};m.records??={};m.seasons??={};m.days??={};m.finished??={};m.outbox??={};
if(save.session&&m.finished[save.session.runId])save.session.completed=true;
m.runSerial=Math.max(m.runSerial||0,save.session?.serial||0,m.completedSerial||0);
return save;
}
export function nextRunSerial(save){return ++save.meta.runSerial;}
// Retain permanent ownership and personal bests, not an ever-growing log of plays.
export function compactSave(save,date=dayKey()){
const m=save.meta,month=date.slice(0,7);m.recordArchive??={};
for(const [key,value] of Object.entries(m.records)){const [rules,season,...board]=key.split(':');if(season>=month)continue;
const archive=rules+':'+board.join(':');if(!board.at(-1)?.startsWith('day-'))m.recordArchive[archive]=Math.max(m.recordArchive[archive]||0,value);delete m.records[key];}
for(const key of Object.keys(m.days))if(key<date)delete m.days[key];
for(const key of Object.keys(m.seasons))if(key<month)delete m.seasons[key];
for(const key of Object.keys(m.finished).slice(0,-64))delete m.finished[key];
for(const key of Object.keys(m.claimed)){const stamp=key.match(/jade-\d+:(\d{4}-\d{2}):/)?.[1];if(stamp&&stamp<month&&!m.pending.includes(key))delete m.claimed[key];}
}
export function resetCombo(run){run.combo=0;run.comboLeft=0;}
export const comboWindow=chain=>chain<8?COMBO_MS:Math.max(800,2400-(chain-8)*200);
export function advanceCombo(run,ms){if(run.comboLeft>0){run.comboLeft=Math.max(0,run.comboLeft-ms);if(!run.comboLeft)run.combo=0;}}
export function awardPair(run,automatic=false){
let vortex=false,multiplier=1;
if(!automatic){run.combo=run.comboLeft>0?run.combo+1:1;vortex=run.combo%8===0;multiplier=Math.min(7,run.combo);run.bestCombo=Math.max(run.bestCombo||0,multiplier);run.comboLeft=comboWindow(run.combo);}
else multiplier=7;
const points=20*multiplier;run.score+=points;
if(vortex)run.vortices=(run.vortices||0)+1;
return {points,multiplier,vortex};
}
export function queueGift(save,key){const m=save.meta;if(m.claimed[key])return false;m.claimed[key]=true;m.pending.push(key);return true;}
export function attachGift(save,run){
const ticket=save.meta.pending[0];if(!ticket)return;
const ids=run.solution[0];if(!ids)return;
run.gift={ticket,ids:[...ids],opened:false};
}
export function openGift(save,run){
if(!run.gift||run.gift.opened)return null;
if(run.gift.ids&&!run.gift.ids.every(id=>run.tiles.some(t=>t.id===id&&t.removed)))return null;
run.gift.opened=true;if(!save.meta.pending.includes(run.gift.ticket))return null;
save.meta.pending=save.meta.pending.filter(t=>t!==run.gift.ticket);
const id=RARE.find(k=>!save.meta.owned.includes(k));
if(id!==undefined){save.meta.owned.push(id);return {id};}
const s=seasonData(save);s.tokens+=10;return {tokens:10};
}
export function equip(save,slot,id){
if(!Number.isInteger(slot)||slot<0||slot>=20||!replacementArt(save).includes(id))return false;
save.meta.deck[slot]=id;return true;
}
export function replacementArt(save){return save.meta.owned.filter(id=>!save.meta.deck.includes(id));}
export function seasonData(save,month=monthKey()){return save.meta.seasons[month]??={tokens:0,spent:0,claims:{}};}
export function tasks(save,date=dayKey()){
const d=save.meta.days[date]||{score:0,wins:0,combo:0,vortices:0,daily:0};
return [{id:'score',name:'Набери 2 000 очков',value:d.score,goal:2000,reward:10},{id:'wins',name:'Пройди 3 уровня',value:d.wins,goal:3,reward:10},{id:'combo',name:'Собери комбо ×5',value:d.combo,goal:5,reward:10},{id:'vortices',name:'Вызови драконий вихрь',value:d.vortices,goal:1,reward:15},{id:'daily',name:'Пройди испытание дня',value:d.daily,goal:1,reward:15}];
}
export function claimTask(save,id,date=dayKey()){
const task=tasks(save,date).find(t=>t.id===id),s=seasonData(save,date.slice(0,7)),key=date+':'+id;
if(!task||task.value<task.goal||s.claims[key])return false;
s.claims[key]=true;s.tokens+=task.reward;return true;
}
export const seasonPrice=id=>30+RARE.indexOf(id)*10;
export function seasonOverview(save,date=new Date()){
const month=monthKey(date),data=seasonData(save,month),day=dayKey(date);
const number=Math.max(1,(date.getUTCFullYear()-2026)*12+date.getUTCMonth()-7);
const end=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);
const next=RARE.find(id=>!save.meta.owned.includes(id));
return {month,number,tokens:data.tokens,next,price:next===undefined?0:seasonPrice(next),
 daysLeft:Math.max(1,Math.ceil((end-date.getTime())/86400000)),
 ready:tasks(save,day).filter(t=>t.value>=t.goal&&!data.claims[day+':'+t.id]).length};
}
export function buyTile(save,id,month=monthKey()){
const s=seasonData(save,month),price=seasonPrice(id);
if(!RARE.includes(id)||save.meta.owned.includes(id)||s.tokens<price)return false;
s.tokens-=price;s.spent+=price;save.meta.owned.push(id);return true;
}
export function completeRun(save,run,date=dayKey()){
if(![RULES,'jade-5','jade-6','jade-7'].includes(run.rules)||run.completed||save.meta.finished[run.runId]||(run.serial&&run.serial<=(save.meta.completedSerial||0)))return {legacy:run.rules!==RULES};
run.completed=true;if(run.serial)save.meta.completedSerial=run.serial;
save.meta.finished[run.runId]=true;
const ranked=recordEligible(run),key=boardKey(run),best=save.meta.records[key]||0;
if(ranked)save.meta.records[key]=Math.max(best,run.score);
const d=save.meta.days[date]??={score:0,wins:0,combo:0,vortices:0,daily:0};
d.score+=run.score;d.wins++;d.combo=Math.max(d.combo,run.bestCombo);d.vortices+=run.vortices||0;if(run.daily===date)d.daily=1;
const gift=queueGift(save,'welcome');
return {best:ranked&&run.score>best,gift,ranked,legacy:run.rules!==RULES};
}
