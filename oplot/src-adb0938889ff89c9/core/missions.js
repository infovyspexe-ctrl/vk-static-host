import { MISSIONS, OBJECTIVES, missionFor } from '../data/missions.js';
import { createProgress, fromSave } from './progress.js';
import { groundedKeys } from '../mechanics/gridbuild/support.js';
import { hasGround } from '../mechanics/gridbuild/base.js';
import { missionLimits } from './missionLimits.js';
import { readMissionDrafts } from './missionDrafts.js';

export function objectiveFloors(p){
  const grounded=groundedKeys(p.base),floors=[];
  for(const [x,y,typeId] of p.mission?.targets??[]){
    const w=OBJECTIVES[typeId].width??1;
    for(let dx=0;dx<w;dx++){
      const cx=x+dx,key=`${cx},${y-1}`;
      floors.push({x:cx,y,ready:y===1?hasGround(p.base,cx):p.base.cells.get(key)?.kind==='block'&&grounded.has(key)});
    }
  }
  return floors;
}

export function missionState(saved) {
  const completed=[...new Set((Array.isArray(saved?.completed)?saved.completed:[]).filter(n=>Number.isInteger(n)&&missionFor(n)))].sort((a,b)=>a-b);
  let unlocked=1;while(completed.includes(unlocked)&&unlocked<MISSIONS.length)unlocked++;
  return {completed,unlocked};
}
export function startMission(id,catalog,state={},saved=null) {
  const mission=missionFor(id), meta=missionState(state);
  if(!mission||id>meta.unlocked)throw new RangeError('Mission locked');
  const drafts=readMissionDrafts(state);
  saved=saved??drafts[id]??null;
  const fullCatalog={...catalog,units:{...catalog.units,...OBJECTIVES}};
  const initialCells=(mission.fixedBlocks??[]).map(([x,y,typeId])=>({x,y,typeId,kind:'block',hp:catalog.blocks[typeId].hp,fixed:true}));
  const p=saved&&saved.level===id?fromSave(saved,fullCatalog,mission.platformHoles,initialCells):createProgress({startGold:mission.budget,width:12,catalog:fullCatalog});
  for(const cell of initialCells)p.base.cells.set(`${cell.x},${cell.y}`,cell);
  p.base.platformHoles=[...(mission.platformHoles??[])];
  p.mode='missions';p.level=id;p.width=12;p.base.width=12;p.tutorial='done';p.pendingReward=null;
  p.mission=mission;p.missionState=meta;p.missionCompleted=Boolean(saved?.missionCompleted);
  p.missionDrafts=drafts;
  // Targets can await a floor in Build, but never enter Battle unsupported.
  for(const [x,y,typeId] of mission.targets??[]){
    const spec=OBJECTIVES[typeId], w=spec.width??1,h=spec.height??1;
    for(let dx=0;dx<w;dx++)for(let dy=0;dy<h;dy++){
      const cx=x+dx,cy=y+dy;
      p.base.cells.set(`${cx},${cy}`,{x:cx,y:cy,kind:'unit',typeId,hp:spec.hp,locked:true,
        ...(w*h>1?{objectId:`${x},${y}`,objectX:x,objectY:y,objectWidth:w,objectHeight:h}:{} )});
    }
  }
  return p;
}
export function missionReady(p) {
  return !missionBuildIssue(p);
}
export function restartMission(id,catalog,state={}) {
  const drafts=readMissionDrafts(state);
  delete drafts[id];
  // Do not pass legacy active: otherwise it would migrate the discarded plan back.
  return startMission(id,catalog,{...missionState(state),drafts});
}
export function fixedBlockStatus(p){
  const grounded=groundedKeys(p.base);
  return [...p.base.cells.values()].filter(c=>c.fixed).map(c=>({...c,ready:grounded.has(`${c.x},${c.y}`)}));
}
export function missionBuildIssue(p){
  if(p.mode!=='missions')return null;
  for(const [kind,count] of Object.entries(missionLimits(p)))if(count.used>count.limit)return `mission-${kind}-limit`;
  if([...p.base.cells.values()].some(c=>c.y>(p.mission.maxHeight??Infinity)))return 'mission-height';
  const grounded=groundedKeys(p.base);
  if([...p.base.cells.values()].some(c=>c.fixed&&!grounded.has(`${c.x},${c.y}`)))return 'mission-ruins';
  return (p.mission.targets??[]).every(([x,y])=>grounded.has(`${x},${y}`))?null:'mission-support';
}
export function completeMission(p) {
  if(p.mode!=='missions'||p.missionCompleted)return false;
  p.missionCompleted=true;
  if(p.missionDrafts)delete p.missionDrafts[p.level];
  p.missionState=missionState({completed:[...p.missionState.completed,p.level]});
  return true;
}
