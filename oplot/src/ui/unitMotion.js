import { UNIT_MOTION } from '../data/unitMotion.js';
import { UNIT_FORMS } from '../data/units.js';

export function motionProfile(typeId) {
  return UNIT_MOTION[UNIT_FORMS[typeId]?.baseId ?? typeId] ?? UNIT_MOTION.shooter;
}
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };
// Absolute pose, not additive transforms: repeated volleys cannot accumulate
// displacement or scaling. The pivot is at the original sole baseline.
export function unitPose({ typeId, side, time, firedAt = -Infinity, period = 1, phase = 0, hitAt = -Infinity, active = true }) {
  const p = motionProfile(typeId), age = time-firedAt;
  const duration = Math.min(p.duration, period*.72);
  let angle = 0, x = 0;
  if (age >= 0 && age < duration) {
    const t = age / duration;
    if (t < .12) angle = p.kick * smooth(t/.12);
    else if (t < .38) angle = p.kick * (1-smooth((t-.12)/.26));
    else if (t < .65) angle = p.reload * smooth((t-.38)/.27);
    else angle = p.reload * (1-smooth((t-.65)/.35));
    x = p.roll * (t < .12 ? smooth(t/.12) : 1-smooth((t-.12)/.88));
  } else if (active) {
    angle = Math.sin(time*2.8+phase)*p.idle;
    // Anticipation of the next real shot, using this troop's upgraded cooldown.
    if (age >= 0 && age < period) angle += p.prepare * smooth((age/period-.78)/.22);
  }
  const hitAge = time-hitAt;
  if (hitAge >= 0 && hitAge < .24) angle -= 2*Math.sin(Math.PI*hitAge/.24);
  const direction = side === 'enemy' ? -1 : 1;
  return { angle: angle * Math.PI/180 * direction, x: x*direction };
}

export function muzzlePoint(typeId, side, pose, x, floor, cellSize) {
  const [mx,my] = motionProfile(typeId).muzzle;
  const lx=mx*cellSize*(side==='enemy'?-1:1), ly=my*cellSize;
  return { sx:x+pose.x*cellSize+lx*Math.cos(pose.angle)-ly*Math.sin(pose.angle),
    sy:floor+lx*Math.sin(pose.angle)+ly*Math.cos(pose.angle) };
}
