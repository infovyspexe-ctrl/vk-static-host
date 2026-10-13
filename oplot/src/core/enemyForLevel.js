import { UNITS } from '../data/units.js';
import { BLOCKS } from '../data/blocks.js';
import { ENEMY_TRAINING, ENDURANCE_TRAINING } from '../data/endless.js';
export function fortressPower(cells,units=UNITS,blocks=BLOCKS){
  return cells.reduce((sum,c)=>{
    const spec=(c[2]==='unit'?units:blocks)[c[3]];
    return sum+(c[2]==='unit'?Math.sqrt(spec.hp*spec.damage/spec.cooldown):spec.hp*ENEMY_TRAINING.blockWeight);
  },0);
}
// One source for browser and simulations. Never scales the images themselves.
export function enemyTables(spec) {
  const strength=spec.strength??1;
  const tactics=spec.tactics;
  const endurance=spec.endurance??1;
  return {
    units:Object.fromEntries(Object.entries(UNITS).map(([id,u])=>[id,{...u,hp:u.hp*strength*(tactics?.hp??1)*endurance,damage:u.damage*strength*(tactics?.damage??1)*Math.pow(endurance,ENDURANCE_TRAINING.damagePower),cooldown:Math.max(ENEMY_TRAINING.minCooldown,u.cooldown/Math.pow(spec.training??1,ENEMY_TRAINING.reloadPower))}])),
    blocks:Object.fromEntries(Object.entries(BLOCKS).map(([id,b])=>[id,{...b,hp:b.hp*strength*(tactics?.armor??1)*endurance}])),
  };
}
