import { trajectoryPoint } from '../mechanics/siegebattle/trajectory.js';

// No aiming or arc creation here. Project the EXACT precomputed flight, cut
// at its collision parameter, instead of drawing a new parabola to a block centre.
export function projectileScreenPoint(path,layout,progress){
  const t=Math.max(0,Math.min(1,progress))*path.endT,p=trajectoryPoint(path,t);
  return {sx:layout.playerOriginX+p.x*layout.cellSize,sy:layout.groundY-p.y*layout.cellSize,
    angle:Math.atan2(-(path.to.y-path.from.y+4*path.arc*(1-2*t)),path.to.x-path.from.x)};
}
