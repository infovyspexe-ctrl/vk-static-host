// Cell-space launch points: horizontal offset from centre, height above floor.
// Every arc belongs to collision geometry too, never only to the renderer.
export const PROJECTILES = {
  arrow:{kind:'arrow',arc:.65,muzzle:[.36,.68],duration:320},
  bullet:{kind:'bullet',arc:0,muzzle:[.49,.64],duration:120},
  cannonball:{kind:'cannonball',arc:.9,muzzle:[.48,.48],duration:440},
  rocket:{kind:'rocket',arc:.22,muzzle:[.42,.76],duration:480},
  bomb:{kind:'bomb',arc:1.8,muzzle:[.3,.82],duration:650},
};
