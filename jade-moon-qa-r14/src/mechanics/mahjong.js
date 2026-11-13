import {DIFFICULTY_SEEDS} from '../data/difficulty-seeds.js';
import {CHAPTER_RECIPES} from '../data/chapter-recipes.js';
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function free(t,tiles){if(t.removed)return false;const live=tiles.filter(b=>!b.removed&&b.id!==t.id);if(live.some(b=>b.z>t.z&&Math.abs(b.x-t.x)<.98&&Math.abs(b.y-t.y)<.98))return false;return !live.some(b=>b.z===t.z&&Math.abs(b.y-t.y)<.8&&b.x<t.x&&t.x-b.x<1.05)||!live.some(b=>b.z===t.z&&Math.abs(b.y-t.y)<.8&&b.x>t.x&&b.x-t.x<1.05);}
export function pairs(tiles){const f=tiles.filter(t=>free(t,tiles)),out=[];for(let i=0;i<f.length;i++)for(let j=i+1;j<f.length;j++)if(f[i].kind===f[j].kind)out.push([f[i],f[j]]);return out;}
export function layout(index,layers){const shape=index%12;let p=[];for(let y=0;y<8;y++){let width=[y===0||y===7?2:y===1||y===6?4:6,y===0||y===7?6:4,y===0||y===7?2:y===3||y===4?6:4,y<2||y>5?4:6,y%4<2?6:4,y===3||y===4?6:4,y%3===0?6:4,y===0||y===7?4:6,y===1||y===6?6:4,y<2?6:y>5?4:6,y===3||y===4?2:6,y<2||y>5?2:6][shape];for(let x=0;x<width;x++)p.push({x:(6-width)/2+x,y,z:0});}
for(let z=1;z<layers;z++){const ys=z===1?[2,3,4,5]:z===2?[3,4]:[3],width=z===1?4:2;for(const y of ys)for(let x=0;x<width;x++)p.push({x:(6-width)/2+x,y,z});}
return p.map((t,id)=>({...t,id,kind:0,removed:false}));}
export function deal(tiles,seed,kinds){const random=rng(seed),work=tiles.map(t=>({...t})),solution=[];let remaining=work.filter(t=>!t.removed).length;while(remaining){const top=Math.max(...work.filter(t=>!t.removed).map(t=>t.z));const f=work.filter(t=>t.z===top&&free(t,work));if(f.length<2)throw Error('Layout has no removable pair');const a=f.splice(Math.floor(random()*f.length),1)[0],b=f[Math.floor(random()*f.length)],kind=Math.floor(random()*kinds);tiles.find(t=>t.id===a.id).kind=kind;tiles.find(t=>t.id===b.id).kind=kind;solution.push([a.id,b.id]);a.removed=b.removed=true;remaining-=2;}return solution;}
export function createBoard(level,difficulty,config,seed){
const random=rng(seed??0),recipeLevel=seed===undefined?(CHAPTER_RECIPES[difficulty]?.[level-1]??level):(level-1)%12+12*Math.floor(random()*30)+1;
const calibratedSeed=DIFFICULTY_SEEDS[difficulty]?.[recipeLevel-1];
if(calibratedSeed===undefined)throw Error('Missing calibrated deal');
const board=strategicBoard(recipeLevel,difficulty,config,calibratedSeed);
if(!board)throw Error('Invalid calibrated deal');
// Daily games reuse a measured dependency graph of the same silhouette and
// permute faces bijectively. This preserves its solution and difficulty.
if(seed!==undefined){const faces=Array.from({length:config.kinds},(_,i)=>i);for(let i=faces.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[faces[i],faces[j]]=[faces[j],faces[i]];}for(const t of board.tiles)t.kind=faces[t.kind];board.seed=seed;}
return {...board,recipeLevel};}
export function canMatch(a,b,tiles){return !!a&&!!b&&a.id!==b.id&&a.kind===b.kind&&free(a,tiles)&&free(b,tiles);}
// Pair positions first, then assign a balanced set of faces.
// Every accepted candidate carries a complete legal removal order.
export function strategicBoard(level,difficulty,config,seed){
const tiles=layout(level-1,1);
for(let z=1;z<config.layers;z++){
 const xs=z===1?[.5,1.5,2.5,3.5,4.5]:z===2?[1,2,3,4]:[1.5,3.5];
 const ys=z===1?(difficulty===3?[1.5,2.5,4.5,5.5]:[2,3,4,5]):difficulty===3?[2,5]:[2.5,4.5];
 for(const y of ys)for(const x of xs)tiles.push({id:tiles.length,x,y,z,kind:0,removed:false});
}
const random=rng(seed),work=tiles.map(t=>({...t})),solution=[];
while(work.some(t=>!t.removed)){
 const available=work.filter(t=>free(t,work));if(available.length<2)return null;
 const a=available.splice(Math.floor(random()*available.length),1)[0];
 const other=available.filter(t=>t.z!==a.z),pool=other.length&&random()<.55?other:available;
 const b=pool[Math.floor(random()*pool.length)];solution.push([a.id,b.id]);a.removed=b.removed=true;
}
const bag=solution.map((_,i)=>i%config.kinds);
for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
solution.forEach(([a,b],i)=>{tiles[a].kind=tiles[b].kind=bag[i];});
return {tiles,solution,seed};
}
// A hint is returned only with a complete witness for the remaining board.
// Exhausting the search budget is NOT evidence of a deadlock.
export function solveRemaining(tiles,{preferred=[],maxNodes=12000,timeBudget=80}={}){
const live=tiles.filter(t=>!t.removed),n=live.length;
if(!n)return {status:'solved',solution:[],nodes:0};
const copy=tiles.map(t=>({...t})),byId=new Map(copy.map(t=>[t.id,t]));let witness=[],valid=true;
for(const ids of preferred){const a=byId.get(ids[0]),b=byId.get(ids[1]);if(a?.removed&&b?.removed)continue;
if(!canMatch(a,b,copy)){valid=false;break;}a.removed=b.removed=true;witness.push(ids);}
if(valid&&copy.every(t=>t.removed))return {status:'solved',solution:witness,nodes:0};
const bit=live.map((_,i)=>1n<<BigInt(i)),above=[],left=[],right=[];
for(let i=0;i<n;i++){above[i]=left[i]=right[i]=0n;const t=live[i];for(let j=0;j<n;j++){if(i===j)continue;const b=live[j];
if(b.z>t.z&&Math.abs(b.x-t.x)<.98&&Math.abs(b.y-t.y)<.98)above[i]|=bit[j];
if(b.z===t.z&&Math.abs(b.y-t.y)<.8&&Math.abs(b.x-t.x)<1.05){if(b.x<t.x)left[i]|=bit[j];if(b.x>t.x)right[i]|=bit[j];}}}
const groups=new Map();for(let i=0;i<n;i++){const kind=live[i].kind;if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(i);}
const preferredOrder=new Map(preferred.map((ids,index)=>[[...ids].sort((a,b)=>a-b).join(':'),index]));
let nodes=0,limited=false;const deadline=performance.now()+timeBudget,dead=new Set();
function visit(mask){if(!mask)return [];if(++nodes>maxNodes||performance.now()>deadline){limited=true;return null;}if(dead.has(mask))return null;
const available=[];for(let i=0;i<n;i++)if((mask&bit[i])&&!(mask&above[i])&&(!(mask&left[i])||!(mask&right[i])))available.push(i);
const open=new Set(available);
for(const group of groups.values()){
 const remaining=group.filter(i=>mask&bit[i]);
 // The last two copies cannot be paired if one covers the other.
 if(remaining.length===2&&((above[remaining[0]]&bit[remaining[1]])||(above[remaining[1]]&bit[remaining[0]]))){dead.add(mask);return null;}
 // All remaining copies of this face are free: removing two is always safe.
 // Avoid exploring permutations of independent, forced removals.
 if(remaining.length>=2&&remaining.every(i=>open.has(i))){const [i,j]=remaining,rest=visit(mask^bit[i]^bit[j]);if(rest)return [[live[i].id,live[j].id],...rest];if(!limited)dead.add(mask);return null;}
}
const moves=[];for(let a=0;a<available.length;a++)for(let b=a+1;b<available.length;b++){const i=available[a],j=available[b];if(live[i].kind===live[j].kind)moves.push([i,j]);}
const rank=([i,j])=>preferredOrder.get([live[i].id,live[j].id].sort((a,b)=>a-b).join(':'))??(1000-live[i].z-live[j].z);
moves.sort((a,b)=>rank(a)-rank(b));
for(const [i,j] of moves){
const rest=visit(mask^bit[i]^bit[j]);if(rest)return [[live[i].id,live[j].id],...rest];if(limited)return null;}
dead.add(mask);return null;}
const solution=visit((1n<<BigInt(n))-1n);
return {status:solution?'solved':limited?'unknown':'unsolvable',solution:solution||[],nodes};
}
export function reshuffle(tiles,seed){const counts=new Map();for(const t of tiles)if(!t.removed)counts.set(t.kind,(counts.get(t.kind)||0)+1);const kinds=[];for(const [kind,n] of counts){if(n%2)throw Error('Unpaired tile inventory');for(let i=0;i<n/2;i++)kinds.push(kind);}const random=rng(seed);for(let i=kinds.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}const remaining=tiles.filter(t=>!t.removed);remaining.forEach((t,i)=>{const layer=i<48?0:1,index=i%48,count=layer?remaining.length-48:Math.min(48,remaining.length),rows=Math.ceil(count/6),row=Math.floor(index/6),width=Math.min(6,count-row*6);t.x=(6-width)/2+index%6;t.y=(8-rows)/2+row;t.z=layer;});const solution=deal(tiles,seed,1);solution.forEach((ids,i)=>ids.forEach(id=>tiles.find(t=>t.id===id).kind=kinds[i]));return solution;}
export function recoverDeadlock(state){
if(!state.tiles.some(t=>!t.removed)||pairs(state.tiles).length)return false;
state.solution=reshuffle(state.tiles,state.seed+1009+(state.recoveries||0));
state.recoveries=(state.recoveries||0)+1;
// Old coordinates cannot be restored by the pair-only undo history.
state.history=[];state.combo=0;state.lastPairAt=-100;
return true;
}
