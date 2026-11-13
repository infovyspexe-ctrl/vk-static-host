import {queueGift} from '../mechanics/progression.js';
// Enable only after the dedicated endpoint passes authenticated deployment checks.
export const VK_DAILY_ENABLED=true;
const endpoint='https://gamesmile.ru/vk/jade-moon/v1';
const day=()=>new Date().toISOString().slice(0,10);
const starts=new Map();
async function request(route,data={}){
 const response=await fetch(endpoint+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,launch:location.search.slice(1)}),signal:AbortSignal.timeout(8000),credentials:'omit'});
 if(!response.ok)throw Object.assign(Error(response.status===401?'Перезапусти игру через VK':'Рейтинг временно недоступен'),{code:response.status});return response.json();
}
export async function dailyBoard(run){return {...await request('/board',{difficulty:run.difficulty}),mode:'vk-daily'};}
export function beginDaily(run){
 if(!VK_DAILY_ENABLED||!run.daily)return Promise.resolve();
 const pending=request('/start',{difficulty:run.difficulty}).then(data=>{if(data.day!==run.daily)throw Error('day changed');run.vkTicket=data.ticket;});starts.set(run.runId,pending);pending.finally(()=>starts.delete(run.runId)).catch(()=>{});return pending;
}
export async function queueDaily(save,run){
 if(starts.has(run.runId))await starts.get(run.runId);if(!run.vkTicket||!run.vkMoves)throw Error('Начни новое испытание дня для участия в рейтинге');
 const key=run.daily+':'+run.difficulty;save.meta.vkDailyOutbox??={};const old=save.meta.vkDailyOutbox[key];if(!old||old.score<run.score)save.meta.vkDailyOutbox[key]={day:run.daily,difficulty:run.difficulty,score:run.score,ticket:run.vkTicket,moves:run.vkMoves};
}
export async function flushDaily(save){
 const outbox=save.meta.vkDailyOutbox??={};
 let failure;
 while(Object.keys(outbox).length){let changed=false;for(const [key,entry] of Object.entries(outbox)){if(entry.day<day()){delete outbox[key];changed=true;continue;}try{await request('/submit',entry);if(outbox[key]===entry)delete outbox[key];changed=true;}catch(error){if(error.code===400){if(outbox[key]===entry)delete outbox[key];changed=true;}else failure=error;}}if(failure||!changed)break;}
 const data=await request('/rewards');let gift=false;
 for(const reward of data.rewards||[])if(reward.type==='gift'&&/^vk-daily:\d{4}-\d{2}-\d{2}:[0-3]$/.test(reward.id))gift=queueGift(save,reward.id)||gift;
 if(failure)throw failure;
 return {gift,mode:'vk-daily'};
}
