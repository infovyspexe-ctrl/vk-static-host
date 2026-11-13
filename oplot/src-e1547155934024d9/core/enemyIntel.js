import { UNITS } from '../data/units.js';
export function enemyIntel(cells) {
  const counts={normal:0,pierce:0,splash:0};
  for(const c of cells) if(c[2]==='unit') counts[UNITS[c[3]].damageType]++;
  const type=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  return {type,count:Object.values(counts).reduce((a,b)=>a+b,0)};
}
