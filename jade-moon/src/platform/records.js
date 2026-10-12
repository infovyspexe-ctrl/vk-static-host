import {RULES,boardKey,queueGift,monthKey,recordEligible} from '../mechanics/progression.js';
let sdk=null,live=false,targets={},cloudWritable=false,cloudBusy=false,pendingSave=null;
let confirmed='{}',uncertain=null,reloadNeeded=false,retryTimer=null,retryDelay=1000,epoch=0;
let status='local',statusListener=()=>{};
let vk=null,vkWritable=false,vkBusy=false,vkPending=null,vkTimer=null,vkRevision=0,vkBank='b',vkRetryDelay=1000;
const VK_MANIFEST='jadeMoon_manifest_v1',VK_PREFIX='jadeMoon_data_v1_',VK_CHUNK=3000;
const fingerprint=value=>JSON.stringify(value??{});
function setStatus(value){if(status!==value){status=value;statusListener(value);}}
export const cloudStatus=()=>status;
function scheduleRetry(){if(retryTimer||!cloudWritable)return;retryTimer=setTimeout(()=>{retryTimer=null;void retryCloud();},retryDelay);retryTimer.unref?.();retryDelay=Math.min(30000,retryDelay*2);}
function stopCloud(reason){cloudWritable=false;clearTimeout(retryTimer);retryTimer=null;setStatus(reason);}
function bounded(promise,ms=5000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('VK Bridge timeout'),{code:'NETWORK'})),ms);})]).finally(()=>clearTimeout(timer));}
function splitValue(value){const out=[];let part='';for(const char of value){if(part.length+char.length>VK_CHUNK){out.push(part);part='';}part+=char;}if(part||!out.length)out.push(part);return out;}
async function readVkSave(){
 const response=await bounded(vk.send('VKWebAppStorageGet',{keys:[VK_MANIFEST]}));
 const raw=response?.keys?.find(x=>x.key===VK_MANIFEST)?.value;
 if(!raw)return {data:{},revision:0,bank:'b'};
 const manifest=JSON.parse(raw);
 if(manifest?.v!==1||!Number.isInteger(manifest.parts)||manifest.parts<1||manifest.parts>64||!Number.isInteger(manifest.revision)||!['a','b'].includes(manifest.bank))throw Error('Invalid VK save manifest');
 const keys=Array.from({length:manifest.parts},(_,i)=>VK_PREFIX+manifest.bank+'_'+i);
 const parts=await bounded(vk.send('VKWebAppStorageGet',{keys}));
 const map=new Map((parts?.keys||[]).map(x=>[x.key,x.value]));
 if(keys.some(key=>!map.has(key)))throw Error('Incomplete VK cloud save');
 return {data:JSON.parse(keys.map(key=>map.get(key)).join('')),revision:manifest.revision,bank:manifest.bank};
}
async function writeVkSave(data){
 const values=splitValue(JSON.stringify(data)),revision=vkRevision+1,bank=vkBank==='a'?'b':'a';
 for(let i=0;i<values.length;i++)await bounded(vk.send('VKWebAppStorageSet',{key:VK_PREFIX+bank+'_'+i,value:values[i]}));
 // Publish the new manifest last. A reload during chunk upload keeps seeing the prior save.
 await bounded(vk.send('VKWebAppStorageSet',{key:VK_MANIFEST,value:JSON.stringify({v:1,parts:values.length,revision,bank})}));
 vkRevision=revision;vkBank=bank;vkRetryDelay=1000;setStatus('saved');
}
function scheduleVkWrite(delay=300){if(vkTimer)return;vkTimer=setTimeout(()=>{vkTimer=null;void flushVkSave();},delay);}
async function flushVkSave(){
 if(vkBusy||!vk||!vkWritable||!vkPending)return;
 vkBusy=true;const snapshot=vkPending;vkPending=null;setStatus('saving');
 try{await writeVkSave(snapshot);if(vkPending)scheduleVkWrite();}
 catch(error){vkPending??=snapshot;setStatus('offline');scheduleVkWrite(vkRetryDelay);vkRetryDelay=Math.min(vkRetryDelay*2,30000);}
 finally{vkBusy=false;}
}

export async function initRecords(){
try{const r=await fetch(new URL('../data/record-targets.json',import.meta.url));const data=await r.json();if(data.rules===RULES&&data.policy==='top5')targets=data.targets||{};}catch{}
if(new URLSearchParams(globalThis.location?.search||'').has('vk_app_id')){
 try{
  if(!window.vkBridge)throw Error('VK Bridge script is missing');
  vk=window.vkBridge;await bounded(vk.send('VKWebAppInit',{}));
  const remote=await readVkSave();vkRevision=remote.revision;vkBank=remote.bank;vkWritable=true;setStatus('saved');
  window.addEventListener('online',()=>void flushVkSave());
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
export function saveCloud(save){
if(vk){if(!vkWritable)return false;vkPending=structuredClone(save);scheduleVkWrite();return true;}
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
if(live)return {...await sdk.leaderboards.get(boardKey(run)),mode:'live'};
return {mode:'targets',target:recordTarget(run),top:[],mine:null};
}
export async function submitRecord(save,run){
if(run.rules!==RULES)return {legacy:true};
if(!recordEligible(run))return {assisted:true,gift:false};
if(run.season&&run.season<monthKey())return {expired:true,gift:false};
const key=boardKey(run);
if(!live){const goal=recordTarget(run);return {gift:goal!==null&&run.score>=goal&&queueGift(save,'target:'+key),mode:'targets'};}
const old=save.meta.outbox[key];if(!old||run.score>old.score)save.meta.outbox[key]={score:run.score};
return retryRecords(save,key);
}
let recordFlight=null;
export async function retryRecords(save,only=null){
if(recordFlight){try{await recordFlight;}catch{};if(only&&save.meta.outbox[only])return retryRecords(save,only);return {gift:false,mode:'live'};}
recordFlight=flushRecords(save,only);try{return await recordFlight;}finally{recordFlight=null;}
}
async function flushRecords(save,only){
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
export function bindPlatform({pause,accountChanged,saveStatus=()=>{}}){statusListener=saveStatus;if(vk){window.addEventListener?.('online',()=>void flushVkSave());return;}if(!sdk)return;window.addEventListener?.('online',()=>void retryCloud());sdk.on('pause',pause);sdk.on('accountChanged',()=>{epoch++;stopCloud('account');live=false;pendingSave=null;accountChanged();});}
export function gameplay(playing){if(sdk)sdk.lifecycle[playing?'start':'stop']().catch(()=>{});}
