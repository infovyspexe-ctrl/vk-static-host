// ТИПЫ ВРАГОВ. Каждый — архетип с визуальной текстурой и поведением.
// Текстуры (texture) — ключи из assets/, нарезанные из листа enemies_sheet.png.
// Поведение (ai) определяет, как враг двигается к игроку — см. mechanics/arena/Enemy.js.
//
// В мобах важна РАЗНОГЛАСИЯ силуэтов, а не одинаковые жуки (правило ASSETGEN про листы).
// 9 архетипов: от лёгких быстрых до танковых и боссов.
export const ENEMIES = [
  { id: 'fighter',  texture: 'enemy_fighter',  ai: 'chase',   weight: 30, minWave: 1,
    radius: 18, hpMul: 1.0, speedMul: 1.0, xpMul: 1.0, color: 0xff5a5a },
  { id: 'jelly',    texture: 'enemy_jelly',    ai: 'chase',   weight: 18, minWave: 2,
    radius: 22, hpMul: 1.6, speedMul: 0.8, xpMul: 1.3, color: 0x6effb0 },
  { id: 'crab',     texture: 'enemy_crab',     ai: 'chase',   weight: 14, minWave: 3,
    radius: 26, hpMul: 2.4, speedMul: 0.7, xpMul: 1.6, color: 0xb388ff },
  { id: 'dart',     texture: 'enemy_dart',     ai: 'chase',   weight: 16, minWave: 2,
    radius: 15, hpMul: 0.8, speedMul: 1.5, xpMul: 1.1, color: 0x40c4ff },
  { id: 'bat',      texture: 'enemy_bat',      ai: 'zigzag',  weight: 12, minWave: 4,
    radius: 18, hpMul: 1.2, speedMul: 1.25, xpMul: 1.4, color: 0xff8a3d },
  { id: 'hex',      texture: 'enemy_hex',      ai: 'chase',   weight: 10, minWave: 5,
    radius: 24, hpMul: 2.0, speedMul: 0.9, xpMul: 1.5, color: 0xffd54f },
  { id: 'butterfly',texture: 'enemy_butterfly',ai: 'orbit',   weight: 8,  minWave: 6,
    radius: 20, hpMul: 1.4, speedMul: 1.1, xpMul: 1.6, color: 0xff6ec7 },
  { id: 'saucer',   texture: 'enemy_saucer',   ai: 'chase',   weight: 6,  minWave: 7,
    radius: 28, hpMul: 3.0, speedMul: 0.85, xpMul: 2.0, color: 0xe0e0e0 },
  { id: 'serpent',  texture: 'enemy_serpent',  ai: 'zigzag',  weight: 5,  minWave: 8,
    radius: 16, hpMul: 1.1, speedMul: 1.4, xpMul: 1.5, color: 0x4dd0e1 },

  // ── Веха 2: враги, требующие не «больше урона», а другого поведения ──
  // Раньше все девять архетипов шли вплотную, и тактика сводилась к «кружи и стреляй».
  // Стрелок наказывает за стояние на месте, щитовик — за стрельбу ему в лоб.
  { id: 'gunner',   texture: 'enemy_saucer',   ai: 'ranged',  weight: 10, minWave: 4,
    radius: 20, hpMul: 1.2, speedMul: 0.9, xpMul: 1.8, color: 0xffa726,
    keepRange: 260, shootPeriod: 2.4, shootDamage: 10 },
  { id: 'bulwark',  texture: 'enemy_hex',      ai: 'shielded', weight: 8, minWave: 6,
    radius: 26, hpMul: 2.2, speedMul: 0.75, xpMul: 2.0, color: 0x90caf9 }
];

// Босс — отдельный архетип, спавнится поBALANCE.waves.bossEveryWaves.
export const BOSS = {
  id: 'boss', texture: 'enemy_crab', ai: 'chase',
  radius: 60, isBoss: true, color: 0xff3b6e
};

// ТИПЫ ВОЛН. Раньше волна означала только «врагов больше и они толще» — на экране
// менялись числа, а не картина. Тип волны перекашивает веса архетипов, поэтому волна
// читается за секунду и требует другой тактики: от ливня мелочи убегают, танков
// расстреливают, от стрелков прячутся за движением.
export const WAVE_TYPES = [
  { id: 'normal', label: 'waveTypeNormal', from: 1, weights: {} },
  { id: 'swarm',  label: 'waveTypeSwarm',  from: 3, weights: { fighter: 4, dart: 4, bat: 3, serpent: 3 } },
  { id: 'tank',   label: 'waveTypeTank',   from: 6, weights: { crab: 5, saucer: 5, hex: 4, bulwark: 5 } },
  { id: 'ranged', label: 'waveTypeRanged', from: 8, weights: { gunner: 8, butterfly: 3 } }
];

// Тип волны детерминирован её номером: игрок запоминает ритм («каждая четвёртая — ливень»),
// а не гадает. Первые две волны всегда обычные — это ещё онбординг.
export function waveTypeFor(waveNum) {
  const pool = WAVE_TYPES.filter((t) => waveNum >= t.from);
  if (waveNum < 3 || pool.length <= 1) return WAVE_TYPES[0];
  if (waveNum % 4 !== 0) return WAVE_TYPES[0];
  const special = pool.filter((t) => t.id !== 'normal');
  return special[(Math.floor(waveNum / 4) - 1) % special.length];
}

// Выбрать тип врага для текущей волны (взвешенно среди доступных по minWave).
// waveType перекашивает веса: архетипы «своего» типа выпадают заметно чаще.
export function rollEnemy(waveNum, waveType) {
  const pool = ENEMIES.filter((e) => e.minWave <= waveNum);
  const w = (waveType && waveType.weights) || {};
  let total = 0;
  for (const e of pool) total += e.weight * (w[e.id] || 1);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.weight * (w[e.id] || 1);
    if (r <= 0) return e;
  }
  return pool[0];
}
