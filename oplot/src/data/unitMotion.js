// Visual choreography only: degrees, seconds and fractions of one grid cell.
export const UNIT_MOTION = {
  archer: { kick: -5, reload: 3.5, prepare: -3, duration: .72, idle: .55, roll: 0, muzzle: [.36, -.68] },
  shooter: { kick: -7, reload: 4, prepare: 1.5, duration: .44, idle: .4, roll: 0, muzzle: [.49, -.64] },
  cannon: { kick: -3, reload: 1, prepare: 0, duration: .9, idle: 0, roll: -.085, muzzle: [.48, -.48] },
  rocket: { kick: -6, reload: 3, prepare: -2, duration: .85, idle: .35, roll: 0, muzzle: [.42, -.76] },
  grenadier: { kick: 8, reload: -4, prepare: -7, duration: .95, idle: .6, roll: 0, muzzle: [.3, -.82] },
};
