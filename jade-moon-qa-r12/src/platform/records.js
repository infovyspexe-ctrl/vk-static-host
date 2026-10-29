import {RULES,boardKey,queueGift,monthKey,recordEligible} from '../mechanics/progression.js';
import {VK_DAILY_ENABLED,dailyBoard,queueDaily,flushDaily} from './vk-daily.js';
import {createStorageBudget} from './storage-budget.js';
let sdk=null,live=false,targets={},cloudWritable=false,cloudBusy=false,pendingSave=null;
let confirmed='{}',uncertain=null,reloadNeeded=false,retryTimer=null,retryDelay=1000,epoch=0;
let status='local',statusListener=()=>{};
let vk=null,vkWritable=false,vkBusy=false,vkPending=null,vkTimer=null,vkRevision=0,vkBank='b',vkRetryDelay=1000;
let vkManifestRaw='',vkUncertainRaw='',vkJournalKey='',vkLifecycleBound=false;
let vkBudget=null,vkConfirmed='',vkPendingScheduled=false;
const VK_MANIFEST='jadeMoon_manifest_v1',VK_PREFIX='jadeMoon_data_v1_',VK_CHUNK=3000;
const fingerprint=value=>JSON.stringify(value??{});
function setStatus(value){if(status!==value){status=value;statusListener(value);}}
export const cloudStatus=()=>status;
function scheduleRetry(){if(retryTimer||!cloudWritable)return;retryTimer=setTimeout(()=>{retryTimer=null;void retryCloud();},retryDelay);retryTimer.unref?.();retryDelay=Math.min(30000,retryDelay*2);}
function stopCloud(reason){cloudWritable=false;clearTimeout(retryTimer);retryTimer=null;setStatus(reason);}
function bounded(promise,ms=5000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('VK Bridge timeout'),{code:'NETWORK'})),ms);})]).finally(()=>clearTimeout(timer));}
function splitValue(value){const out=[],encoder=new TextEncoder();let part='',bytes=0;for(const char of value){const size=encoder.encode(char).length;if(bytes+size>VK_CHUNK){out.push(part);part='';bytes=0;}part+=char;bytes+=size;}if(part||!out.length)out.push(part);return out;}
async function readVkSave(attempt=0){
 const response=await bounded(vk.send('VKWebAppStorageGet',{keys:[VK_MANIFEST]}));
 const raw=response?.keys?.find(x=>x.key===VK_MANIFEST)?.value;
 if(!raw)return {data:{},revision:0,bank:'b',raw:''};
 const manifest=JSON.parse(raw);
 if(![1,2].includes(manifest?.v)||!Number.isInteger(manifest.parts)||manifest.parts<1||manifest.parts>64||!Number.isInteger(manifest.revision)||(manifest.v===1?!['a','b'].includes(manifest.bank):!/^\w{8,64}$/.test(manifest.generation)))throw Error('Invalid VK save manifest');
 const keys=Array.from({length:manifest.parts},(_,i)=>VK_PREFIX+(manifest.v===1?manifest.bank:manifest.generation)+'_'+i);
 const parts=await bounded(vk.send('VKWebAppStorageGet',{keys}));
 const map=new Map((parts?.keys||[]).map(x=>[x.key,x.value]));
 const after=await bounded(vk.send('VKWebAppStorageGet',{keys:[VK_MANIFEST]}));
 if((after?.keys?.find(x=>x.key===VK_MANIFEST)?.value||'')!==raw){if(attempt<2)return readVkSave(attempt+1);throw Error('Cloud save is being updated');}
 if(keys.some(key=>!map.get(key)))throw Error('Incomplete VK cloud save');
 return {data:JSON.parse(keys.map(key=>map.get(key)).join('')),revision:manifest.revision,bank:manifest.bank||'b',raw};
}
function journalVk(snapshot){try{if(snapshot)localStorage.setItem(vkJournalKey,JSON.stringify({base:vkManifestRaw,uncertain:vkUncertainRaw,data:snapshot}));else localStorage.removeItem(vkJournalKey);}catch{}}
async function assertVkCurrent(){const r=await bounded(vk.send('VKWebAppStorageGet',{keys:[VK_MANIFEST]}));const raw=r?.keys?.find(x=>x.key===VK_MANIFEST)?.value||'';if(raw&&raw===vkUncertainRaw){vkManifestRaw=raw;vkRevision=JSON.parse(raw).revision;vkUncertainRaw='';}if(raw!==vkManifestRaw)throw Object.assign(Error('Cloud progress changed in another client'),{code:'SAVE_CONFLICT'});}
async function vkSet(key,value){vkBudget.take();try{return await bounded(vk.send('VKWebAppStorageSet',{key,value}));}catch(error){vkBudget.reject(error);throw error;}}
async function clearVkGeneration(prefix,count){for(let i=0;i<count;i++)try{await vkSet(VK_PREFIX+prefix+'_'+i,'');}catch{break;}}
async function writeVkSave(data){
 const values=splitValue(JSON.stringify(data)),generation=crypto.randomUUID().replaceAll('-','');
 if(values.length>64)throw Object.assign(Error('Save exceeds supported size'),{code:'TOO_LARGE'});
 // Allow room for upload + commit + cleanup, including a failed upload cleanup.
 const oldParts=vkManifestRaw?JSON.parse(vkManifestRaw).parts:0;
 await assertVkCurrent();
 vkBudget.begin(Math.max(values.length+1+oldParts,values.length*2));
 const previousRaw=vkManifestRaw,revision=vkRevision+1;
 try{for(let i=0;i<values.length;i++)await vkSet(VK_PREFIX+generation+'_'+i,values[i]);await assertVkCurrent();}
 catch(error){await clearVkGeneration(generation,values.length);throw error;}
 // Publish the new manifest last. A reload during chunk upload keeps seeing the prior save.
 await assertVkCurrent();
 const raw=JSON.stringify({v:2,parts:values.length,revision,generation});
 vkUncertainRaw=raw;journalVk(vkPending||data);
 try{await vkSet(VK_MANIFEST,raw);}
 catch(error){if(Number(error?.error_data?.error_code)===9)throw error;const response=await bounded(vk.send('VKWebAppStorageGet',{keys:[VK_MANIFEST]}));if(response?.keys?.find(x=>x.key===VK_MANIFEST)?.value!==raw)throw error;}
 vkRevision=revision;vkManifestRaw=raw;vkUncertainRaw='';vkConfirmed=fingerprint(data);vkRetryDelay=1000;journalVk(vkPending);setStatus(vkPending?'pending':'saved');
 // Empty values remove obsolete generation keys from VK Storage. Readers recheck the manifest.
 if(previousRaw){const old=JSON.parse(previousRaw);await clearVkGeneration(old.v===1?old.bank:old.generation,old.parts);}
}
function scheduleVkWrite(delay=300){if(vkTimer)return;vkTimer=setTimeout(()=>{vkTimer=null;void flushVkSave();},Math.max(delay,vkBudget?.delay()||0));vkTimer.unref?.();}
async function flushVkSave(){
 if(vkBusy||!vk||!vkWritable||!vkPending)return;
 clearTimeout(vkTimer);vkTimer=null;
 if(!vkUncertainRaw&&fingerprint(vkPending)===vkConfirmed){vkPending=null;vkPendingScheduled=false;journalVk(null);setStatus('saved');return;}
 vkBusy=true;const snapshot=vkPending;vkPending=null;vkPendingScheduled=false;setStatus('saving');
 try{await writeVkSave(snapshot);if(vkPending&&vkPendingScheduled)scheduleVkWrite();}
 catch(error){vkPending??=snapshot;vkPendingScheduled=true;journalVk(vkPending);if(error.code==='SAVE_CONFLICT'||error.code==='TOO_LARGE'){vkWritable=false;setStatus(error.code==='SAVE_CONFLICT'?'conflict':'unavailable');}else{setStatus(error.code==='STORAGE_BUDGET'||Number(error?.error_data?.error_code)===9?'pending':'offline');scheduleVkWrite(Math.max(vkRetryDelay,error.retryAfterMs||0));vkRetryDelay=Math.min(vkRetryDelay*2,30000);}}
 finally{vkBusy=false;}
}

export async function initRecords(){
try{const r=await fetch(new URL('../data/record-targets.json',import.meta.url),{signal:AbortSignal.timeout(3000)});const data=await r.json();if(data.rules===RULES&&data.policy==='top5')targets=data.targets||{};}catch{}
if(new URLSearchParams(globalThis.location?.search||'').has('vk_app_id')){
 try{
  if(!window.vkBridge)throw Error('VK Bridge script is missing');
  vk=window.vkBridge;await bounded(vk.send('VKWebAppInit',{}));
  let ledger;try{ledger=globalThis.localStorage;}catch{}
  const account=new URLSearchParams(globalThis.location?.search||'').get('vk_user_id')||'current';
  vkBudget=createStorageBudget({key:'jadeMoon_vk_budget_'+account,storage:ledger});
  const remote=await readVkSave();vkRevision=remote.revision;vkBank=remote.bank;vkManifestRaw=remote.raw;vkWritable=true;setStatus('saved');
  vkConfirmed=fingerprint(remote.data);
  vkJournalKey='jadeMoon_vk_pending_'+(new URLSearchParams(globalThis.location?.search||'').get('vk_user_id')||'current');
  try{const pending=JSON.parse(localStorage.getItem(vkJournalKey)||'null');if(pending?.data&&(pending.base===remote.raw||pending.uncertain===remote.raw)){vkPending=pending.data;vkPendingScheduled=true;scheduleVkWrite();return pending.data;}if(pending?.data){localStorage.setItem(vkJournalKey+'_conflict',JSON.stringify(pending));localStorage.removeItem(vkJournalKey);setStatus('recovered');}}catch{}
  return remote.data;
 }catch(error){vk=null;vkWritable=false;setStatus('offline');console.warn('[jade-moon] VK cloud storage unavailable; preserving local progress',error);return null;}
}
if(window.parent===window||!window.GameSmileSDK)return null;
try{
sdk=window.GameSmileSDK;const info=await sdk.init();live=!!info.features?.levelLeaderboards&&!!info.levelLeaderboardRules?.includes(RULES);
const remote=await sdk.storage.load();cloudWritable=remote.canSave===true||remote.status==='local';reloadNeeded=remote.canSave!==true;confirmed=fingerprint(remote?.data?.jadeMoon);setStatus(cloudWritable?(reloadNeeded?'offline':'saved'):'unavailable');await sdk.lifecycle.ready();
return remote?.data?.jadeMoon||{};
}catch{cloudWritable=false;live=false;sdk=null;return null;}
}
export function saveCloud(save,{defer=false}={}){
if(vk){if(!vkWritable)return false;if(!vkBusy&&!vkUncertainRaw&&fingerprint(save)===vkConfirmed){clearTimeout(vkTimer);vkTimer=null;vkPending=null;vkPendingScheduled=false;journalVk(null);setStatus('saved');return true;}vkPending=structuredClone(save);journalVk(vkPending);if(!defer){vkPendingScheduled=true;setStatus('pending');scheduleVkWrite();}return true;}
if(!sdk||!cloudWritable)return false;pendingSave=structuredClone(save);if(!cloudBusy&&!retryTimer)void flush();return true;
}
export async function retryCloud(){clearTimeout(retryTimer);retryTimer=null;if(sdk&&cloudWritable&&!cloudBusy)await flush();}
async function flush(){
cloudBusy=true;const version=epoch;
try{while(pendingSave&&cloudWritable&&epoch===version){
 if(reloadNeeded){const remote=await sdk.storage.load();if(epoch!==version)return;
 if(!remote.canSave)throw Object.assign(Error('offline'),{code:'NETWORK'});
 const actual=fingerprint(remote.data?.jadeMoon);
 if(actual!==confirmed&&actual!==uncertain){stopCloud('conflict');return;}
 confirmed=actual;uncertain=null;reloadNeeded=false;
 }
 const snapshot=pendingSave;pendingSave=null;uncertain=fingerprint(snapshot);setStatus('saving');
 try{const result=await sdk.storage.save({jadeMoon:snapshot});if(epoch!==version)return;
 if(result?.reloadRequired){pendingSave??=snapshot;reloadNeeded=true;setStatus('offline');scheduleRetry();return;}
 confirmed=uncertain;uncertain=null;retryDelay=1000;setStatus('saved');
 }catch(error){if(epoch!==version)return;pendingSave??=snapshot;throw error;}
}}
catch(error){if(epoch!==version)return;
 if(['SAVE_CONFLICT','ACCOUNT_CHANGED','TOO_LARGE','INVALID_DATA'].includes(error.code)){stopCloud(error.code==='SAVE_CONFLICT'?'conflict':error.code==='ACCOUNT_CHANGED'?'account':'unavailable');}
 else{reloadNeeded=true;setStatus('offline');scheduleRetry();}
}finally{cloudBusy=false;}
}
export const recordsMode=()=>live?'live':'targets';
export const recordTarget=run=>run.rules&&run.rules!==RULES?null:targets[`${run.difficulty}:${run.daily?'day-'+run.daily:run.level}`]?.score??null;
export async function readRecords(run){
if(vk&&VK_DAILY_ENABLED&&run.daily)return dailyBoard(run);
if(live)return {...await sdk.leaderboards.get(boardKey(run)),mode:'live'};
return {mode:'targets',target:recordTarget(run),top:[],mine:null};
}
export async function submitRecord(save,run){
if(run.rules!==RULES)return {legacy:true};
if(!recordEligible(run))return {assisted:true,gift:false};
if(vk&&VK_DAILY_ENABLED&&run.daily){await queueDaily(save,run);return retryRecords(save);}
if(run.season&&run.season<monthKey())return {expired:true,gift:false};
const key=boardKey(run);
if(!live){const goal=recordTarget(run);return {gift:goal!==null&&run.score>=goal&&queueGift(save,'target:'+key),mode:'targets'};}
const old=save.meta.outbox[key];if(!old||run.score>old.score)save.meta.outbox[key]={score:run.score};
return retryRecords(save,key);
}
let recordFlight=null;
export async function retryRecords(save,only=null){
if(recordFlight){try{await recordFlight;}catch{};if(vk&&VK_DAILY_ENABLED&&Object.keys(save.meta.vkDailyOutbox||{}).length)return retryRecords(save);if(only&&save.meta.outbox[only])return retryRecords(save,only);return {gift:false,mode:'live'};}
recordFlight=flushRecords(save,only);try{return await recordFlight;}finally{recordFlight=null;}
}
async function flushRecords(save,only){
if(vk&&VK_DAILY_ENABLED)return flushDaily(save);
let gift=false,failed=false;if(!live)return {gift};const version=epoch;
for(const key of Object.keys(save.meta.outbox)){if(only&&key!==only)continue;
const [rules,season]=key.split(':');if(rules!==RULES||season<monthKey()){delete save.meta.outbox[key];continue;}
const sent=save.meta.outbox[key].score;
try{const result=await sdk.leaderboards.submit(sent,key);if(epoch!==version)return {gift:false};
if(result.gift)gift=queueGift(save,'server:'+result.gift)||gift;
if(save.meta.outbox[key]?.score===sent)delete save.meta.outbox[key];
}catch(error){if(epoch!==version)return {gift:false};if(['ACCOUNT_CHANGED','SAVE_CONFLICT'].includes(error.code))throw error;failed=true;}
}
if(failed)throw Object.assign(Error('Some scores remain queued'),{code:'NETWORK'});
return {gift,mode:'live'};
}
export function bindPlatform({pause,resume=()=>{},accountChanged,saveStatus=()=>{}}){statusListener=saveStatus;saveStatus(status);if(vk){window.addEventListener?.('online',()=>void flushVkSave());if(!vkLifecycleBound){vkLifecycleBound=true;vk.subscribe?.(event=>{const type=event?.detail?.type;if(type==='VKWebAppViewHide'){pause();void flushVkSave();}if(type==='VKWebAppViewRestore'){resume();void assertVkCurrent().catch(error=>{if(error.code==='SAVE_CONFLICT'){vkWritable=false;setStatus('conflict');}else setStatus('offline');});}});}return;}if(!sdk)return;window.addEventListener?.('online',()=>void retryCloud());sdk.on('pause',pause);sdk.on('resume',resume);sdk.on('accountChanged',()=>{epoch++;stopCloud('account');live=false;pendingSave=null;accountChanged();});}
export function gameplay(playing){if(sdk)sdk.lifecycle[playing?'start':'stop']().catch(()=>{});}
