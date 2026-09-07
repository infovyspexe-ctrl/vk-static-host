// УРОЧИЩА (акты) и их пулы столкновений. Каждое столкновение — набор врагов,
// у него свой id, чтобы забег не повторял одно и то же, пока пул не кончился.
//
// Кривая сложности задана здесь, а не в коде: `easy` — первые два боя урочища
// (в них игрок собирает первые карты и не должен погибнуть от невезения),
// `combat` — обычные, `elite` — тяжёлые с оберегом в награде, `boss` — финал урочища.
export const ACTS = [
  {
    id: 1, art: 'act1',
    easy: [
      { id: 'a1e1', enemies: ['volchok'] },
      { id: 'a1e2', enemies: ['voron', 'voron'] },
      { id: 'a1e3', enemies: ['durman'] },
      { id: 'a1e4', enemies: ['ogonek', 'voron'] },
    ],
    combat: [
      { id: 'a1c1', enemies: ['volchok', 'volchok'] },
      { id: 'a1c2', enemies: ['kikimora', 'ogonek'] },
      { id: 'a1c3', enemies: ['penek'] },
      { id: 'a1c4', enemies: ['durman', 'durman', 'voron'] },
      { id: 'a1c5', enemies: ['kikimora', 'volchok'] },
      { id: 'a1c6', enemies: ['penek', 'ogonek'] },
      { id: 'a1c7', enemies: ['voron', 'voron', 'volchok'] },
    ],
    elite: [
      { id: 'a1t1', enemies: ['shatun'] },
      { id: 'a1t2', enemies: ['poludnitsa'] },
      { id: 'a1t3', enemies: ['penek', 'penek'] },
    ],
    boss: [{ id: 'a1b1', enemies: ['leshiy'] }],
  },
  {
    id: 2, art: 'act2',
    easy: [
      { id: 'a2e1', enemies: ['piyavka', 'piyavka'] },
      { id: 'a2e2', enemies: ['blud'] },
      { id: 'a2e3', enemies: ['utoplennik'] },
    ],
    combat: [
      { id: 'a2c1', enemies: ['utoplennik', 'piyavka'] },
      { id: 'a2c2', enemies: ['bolotnik'] },
      { id: 'a2c3', enemies: ['tumannik', 'blud'] },
      { id: 'a2c4', enemies: ['zhaba', 'piyavka'] },
      { id: 'a2c5', enemies: ['utoplennik', 'utoplennik'] },
      { id: 'a2c6', enemies: ['bolotnik', 'tumannik'] },
      { id: 'a2c7', enemies: ['zhaba', 'blud', 'piyavka'] },
    ],
    elite: [
      { id: 'a2t1', enemies: ['omutnitsa'] },
      { id: 'a2t2', enemies: ['toplyak'] },
      { id: 'a2t3', enemies: ['bolotnik', 'zhaba', 'tumannik'] },
    ],
    boss: [{ id: 'a2b1', enemies: ['vodyanoy'] }],
  },
  {
    id: 3, art: 'act3',
    easy: [
      { id: 'a3e1', enemies: ['nav', 'nav'] },
      { id: 'a3e2', enemies: ['kostyak'] },
      { id: 'a3e3', enemies: ['glaz'] },
    ],
    combat: [
      { id: 'a3c1', enemies: ['kostyak', 'nav'] },
      { id: 'a3c2', enemies: ['upyr'] },
      { id: 'a3c3', enemies: ['glaz', 'moroka'] },
      { id: 'a3c4', enemies: ['petukh', 'nav'] },
      { id: 'a3c5', enemies: ['upyr', 'kostyak'] },
      { id: 'a3c6', enemies: ['moroka', 'petukh'] },
      { id: 'a3c7', enemies: ['glaz', 'glaz', 'nav'] },
    ],
    elite: [
      { id: 'a3t1', enemies: ['kostyanoy_volk'] },
      { id: 'a3t2', enemies: ['vedma'] },
      { id: 'a3t3', enemies: ['upyr', 'upyr', 'moroka'] },
    ],
    boss: [{ id: 'a3b1', enemies: ['likho'] }],
  },
];
