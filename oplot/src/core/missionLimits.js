// Limits concern player purchases, not protected objectives or authored masonry.
export function missionLimits(p){
  const cells=[...p.base.cells.values()],m=p.mode==='missions'?p.mission:null;
  return {
    unit:{used:cells.filter(c=>c.kind==='unit'&&!c.locked&&!p.catalog.units[c.typeId]?.passive).length,limit:m?.maxUnits??Infinity},
    block:{used:cells.filter(c=>c.kind==='block'&&!c.fixed).length,limit:m?.maxBlocks??Infinity},
  };
}
export function placementLimit(p,kind){
  if(p.mode!=='missions')return null;
  if(!Number.isFinite(kind==='unit'?p.mission?.maxUnits:p.mission?.maxBlocks))return null;
  const count=missionLimits(p)[kind];
  return count&&count.used>=count.limit?`mission-${kind}-limit`:null;
}
