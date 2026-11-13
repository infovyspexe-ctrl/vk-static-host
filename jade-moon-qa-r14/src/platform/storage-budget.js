// Client safety policy, NOT a published VK quota. Each attempted key write counts,
// including cleanup and failures. A durable ledger survives reload when available.
export function createStorageBudget({key,storage,now=Date.now,maxWrites=240,windowMs=3600000,minIntervalMs=30000}={}){
 let state={writes:[],next:0,blocked:0},durable=storage;
 function read(){
  try{const saved=JSON.parse(durable?.getItem(key)||'null');if(saved&&Array.isArray(saved.writes))state=saved;}catch{durable=null;}
  state.writes=state.writes.filter(t=>Number.isFinite(t)&&t>now()-windowMs);
  state.next=Number(state.next)||0;state.blocked=Number(state.blocked)||0;
 }
 function persist(){try{durable?.setItem(key,JSON.stringify(state));}catch{durable=null;}}
 function delay(cost=1,snapshot=true){
  read();if(cost>maxWrites)throw Error('Storage transaction exceeds client request budget');
  const excess=state.writes.length+cost-maxWrites;
  return Math.max(0,state.blocked-now(),snapshot?state.next-now():0,excess>0?state.writes[excess-1]+windowMs-now():0);
 }
 function requireRoom(cost,snapshot){const ms=delay(cost,snapshot);if(ms>0)throw Object.assign(Error('Storage write deferred'),{code:'STORAGE_BUDGET',retryAfterMs:ms});}
 return {
  delay,
  // Pace complete transactions, not snapshots alone: a multi-key save also
  // writes its manifest and cleans up the previous generation. Keep the ledger
  // and flood cooldown intact, including when upgrading an existing session.
  begin(cost){requireRoom(cost,true);const transactions=Math.floor(maxWrites/cost);state.next=now()+Math.max(minIntervalMs,Math.ceil(windowMs/transactions));persist();},
  take(){requireRoom(1,false);state.writes.push(now());persist();},
  reject(error){if(Number(error?.error_data?.error_code)===9){read();state.blocked=Math.max(state.blocked,now()+windowMs);persist();return true;}return false;},
  inspect(){read();return {...state,writes:[...state.writes],maxWrites,windowMs,minIntervalMs};}
 };
}
