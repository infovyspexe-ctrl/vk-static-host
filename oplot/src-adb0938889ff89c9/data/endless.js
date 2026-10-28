// Field occupancy is capped; overflow budget buys stats, not invisible cells.
export const ENDLESS = { version:2, seed:9173, firstBudget:4800, budgetStep:120, rows:4, bossRows:5, maxCells:220, trainingSpan:5000, trainingPower:.85 };
export const ENEMY_TRAINING = { reloadPower:.3, minCooldown:.2, blockWeight:.025 };
// Late armies need sustained combat, not increasingly lethal opening volleys.
export const ENDURANCE_TRAINING={first:121,full:1000,max:8,damagePower:-.5,powerGrowth:.5};
export function enduranceForLevel(level){
  const t=Math.max(0,Math.min(1,(level-ENDURANCE_TRAINING.first+1)/(ENDURANCE_TRAINING.full-ENDURANCE_TRAINING.first+1)));
  return 1+(ENDURANCE_TRAINING.max-1)*t;
}
// Preserve the audited opening. Beyond it, follow affordable stat growth rather
// than the former ~level^2.2 total power curve (cash accumulates ~level^2, but
// exponential upgrade prices turn that into much slower combat growth).
export const LATE_TRAINING = { pivot:60, power:.65 };
export const TACTICAL_TRAINING = { first:121, full:240, intensity:.5,
  profiles:{
    bastion:{hp:3,damage:1/3,armor:2},
    steps:{hp:1/1.3,damage:1.3,armor:1},
    twins:{hp:2,damage:.5,armor:1},
    bridge:{hp:1/1.3,damage:1.3,armor:1},
    shielded:{hp:1,damage:1,armor:1},
    keep:{hp:3,damage:1/3,armor:2},
  }
};
export const ASSAULT_TRAINING={first:70,damage:2};
// The last chapter of the authored balance arc must feel like a siege, not an
// opening-volley cleanup. This is a neutral hp/damage trade (product = 1), so
// it lengthens exchanges without secretly increasing computed enemy power.
export const FINAL_CHAPTER_TACTICS={first:81,last:100,hp:24,damage:1/24};
export function tacticsForLevel(level,style){
  if(level>=ASSAULT_TRAINING.first&&level%10===0&&style==='bridge')return {id:'bridge',hp:1/ASSAULT_TRAINING.damage,damage:ASSAULT_TRAINING.damage,armor:1};
  if(level>=FINAL_CHAPTER_TACTICS.first&&level<=FINAL_CHAPTER_TACTICS.last)
    return {id:'attrition',hp:FINAL_CHAPTER_TACTICS.hp,damage:FINAL_CHAPTER_TACTICS.damage,armor:1};
  if(level<TACTICAL_TRAINING.first)return null;
  const p=TACTICAL_TRAINING.profiles[style];
  const t=TACTICAL_TRAINING.intensity*Math.min(1,(level-TACTICAL_TRAINING.first+1)/(TACTICAL_TRAINING.full-TACTICAL_TRAINING.first+1));
  return {id:style,hp:Math.pow(p.hp,t),damage:Math.pow(p.damage,t),armor:Math.pow(p.armor,t)};
}
export function trainingForLevel(level){
  const curve=n=>1+(n-31)*(n+31)/ENDLESS.trainingSpan;
  if(level<=LATE_TRAINING.pivot)return Math.pow(curve(level),ENDLESS.trainingPower);
  const anchor=curve(LATE_TRAINING.pivot);
  return Math.pow(anchor,ENDLESS.trainingPower)*Math.pow(curve(level)/anchor,LATE_TRAINING.power);
}
export const FORT_STYLES = [
  { id:'bastion', cols:3, armor:'gold', types:['cannon','shooter','cannon'], shape:'flat' },
  { id:'steps', cols:2, armor:'iron', types:['rocket','cannon','shooter'], shape:'steps' },
  { id:'twins', cols:1, armor:'gold', types:['cannon','grenadier','shooter'], shape:'twins' },
  { id:'bridge', cols:2, armor:'iron', types:['shooter','cannon','rocket'], shape:'bridge' },
  { id:'shielded', cols:2, armor:'shield', types:['rocket','cannon','archer'], shape:'flat' },
  { id:'keep', cols:2, armor:'gold', types:['grenadier','shooter','cannon'], shape:'keep' },
];
