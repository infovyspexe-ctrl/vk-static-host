import { ENDLESS, FORT_STYLES } from '../../data/endless.js';

// Full style cycles avoid adjacent repetition. RNG belongs to generation only.
export function templateFor(level) {
  return FORT_STYLES[((level - 1) * 5) % FORT_STYLES.length].id;
}
export function generateFortress({level,width,budget,catalog,boss=false,seed=ENDLESS.seed,variation=null}) {
  const style={...FORT_STYLES.find(t=>t.id===templateFor(level)),...variation};
  let state=(Math.imul(level,2654435761)^seed)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const cells=[], occupied=new Map(); let left=budget;
  const cols=Math.min(style.cols,Math.max(0,width-2));
  const rows=variation?.rows??(boss?ENDLESS.bossRows:ENDLESS.rows);
  const shift=Math.floor(random()*3), mid=Math.floor(width/2);
  const pillars=style.shape==='twins'?[mid-2,mid+2,width-1]:style.shape==='steps'||style.shape==='keep'?[mid]:[mid,width-1];
  const types=style.types, offset=Math.floor(random()*types.length);
  for(let row=0;row<rows;row++) {
    const y=row*2+1;
    let end=width-1;
    if(style.shape==='steps')end-=row;
    if(style.shape==='keep')end-=Math.max(0,row-1)+shift;
    const begin=cols+(style.shape==='keep'?Math.max(0,row-1):0);
    const structure=[];
    const add=(x,sy,id)=>{const key=x+','+sy;if(!occupied.has(key)&&!structure.some(c=>c[0]===x&&c[1]===sy))structure.push([x,sy,'block',id]);};
    for(let x=0;x<cols;x++)for(let sy=row===0?1:y-1;sy<=y;sy++)add(x,sy,style.armor);
    // Fixed rear supports across all floors, no new pillars through lower troops.
    for(const x of pillars)for(let sy=row===0?1:y-1;sy<=y;sy++)add(x,sy,'iron');
    if(row>0)for(let x=0;x<=end;x++){
      if(style.shape==='twins'&&Math.abs(x-mid)<2)continue;
      add(x,y-1,'iron');
    }
    const slots=[];
    for(let x=begin;x<end;x++) {
      if(pillars.includes(x))continue;
      if(style.shape==='twins'&&Math.abs(x-mid)<=1)continue;
      if(style.shape==='bridge'&&row===0&&x<mid)continue;
      slots.push(x);
    }
    const price=structure.reduce((sum,c)=>sum+catalog.blocks[c[3]].cost,0);
    const cheapest=Math.min(...types.map(id=>catalog.units[id].cost));
    if(!slots.length||price+cheapest>left)break;
    cells.push(...structure);left-=price;
    for(const c of structure)occupied.set(c[0]+','+c[1],c);
    let index=row+offset;
    for(const x of slots) {
      if(occupied.has(x+','+y))continue;
      const id=types[(index+++Math.floor(random()*types.length))%types.length];
      if(catalog.units[id].cost>left)continue;
      cells.push([x,y,'unit',id]);occupied.set(x+','+y,true);left-=catalog.units[id].cost;
    }
  }
  if(!cells.some(c=>c[2]==='unit')) {
    const id=Object.keys(catalog.units).filter(id=>catalog.units[id].cost>0).sort((a,b)=>catalog.units[a].cost-catalog.units[b].cost)[0];
    return id&&catalog.units[id].cost<=budget?[[0,1,'unit',id]]:[];
  }
  return cells;
}
