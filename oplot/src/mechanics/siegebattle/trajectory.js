import { worldX } from './targeting.js';

// World coordinates: X rightwards, Y upwards from platform surface.
// Cell (x,y) occupies [x,x+1] × [y-1,y]. UI only projects these coordinates.
export function shotTrajectory({shooter,shooterSide,target,layout,spec={}}){
  const profile=spec.projectile??{},muzzle=profile.muzzle??[0,.5];
  const side=shooterSide==='player'?'enemy':'player';
  return {from:{x:worldX(shooterSide,shooter.x,layout)+.5+muzzle[0]*(shooterSide==='player'?1:-1),y:shooter.y-1+muzzle[1]},
    to:{x:worldX(side,target.x,layout)+.5,y:target.y-.5},arc:profile.arc??0,
    duration:profile.duration??120,kind:profile.kind??'bullet',endT:1};
}

export function trajectoryPoint(path,t){
  return {x:path.from.x+(path.to.x-path.from.x)*t,
    y:path.from.y+(path.to.y-path.from.y)*t+4*path.arc*t*(1-t)};
}

// Partition the parabola at EVERY grid boundary, not at a fixed sample rate.
// Each open interval lies in one cell. Tangency without entry is not a hit.
export function trajectoryCells(path){
  const dx=path.to.x-path.from.x,dy=path.to.y-path.from.y;
  const a=-4*path.arc,b=dy+4*path.arc,c=path.from.y;
  const times=[0,1],push=t=>{if(t>0&&t<1)times.push(t);};
  if(dx!==0)for(let x=Math.ceil(Math.min(path.from.x,path.to.x));x<=Math.floor(Math.max(path.from.x,path.to.x));x++)push((x-path.from.x)/dx);
  const peak=a!==0?-b/(2*a):-1;
  const ys=[path.from.y,path.to.y];if(peak>0&&peak<1)ys.push(trajectoryPoint(path,peak).y);
  for(let y=Math.ceil(Math.min(...ys));y<=Math.floor(Math.max(...ys));y++){
    if(a===0){if(b!==0)push((y-c)/b);}
    else{const d=b*b-4*a*(c-y);if(d>=0){const root=Math.sqrt(d);push((-b-root)/(2*a));push((-b+root)/(2*a));}}
  }
  times.sort((x,y)=>x-y);
  const cells=[];
  for(let i=1;i<times.length;i++){
    const start=times[i-1],end=times[i];if(end-start<1e-10)continue;
    const p=trajectoryPoint(path,(start+end)/2);
    cells.push({x:Math.floor(p.x),y:Math.floor(p.y)+1,t:start});
  }
  return cells;
}

export function trajectoryBlockers({path,enemyBase,shooterSide,layout}){
  const origin=worldX(shooterSide==='player'?'enemy':'player',0,layout),seen=new Set(),result=[];
  for(const step of trajectoryCells(path)){
    const key=`${step.x-origin},${step.y}`;
    if(seen.has(key))continue;seen.add(key);
    const cell=enemyBase.cells.get(key);
    if(cell?.kind==='block')result.push({cell,t:step.t});
  }
  return result;
}
