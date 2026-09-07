// ВРАГИ. Чистые данные: здоровье вилкой, набор ходов и правило их выбора.
// Имена — в i18n по ключу `enemy_<id>`; картинка — `assets/enemies/<art>.png`.
//
// Как читать `moves`: каждый ход — тот же список операций, что у карт (effects.js).
// `pattern` задаёт жёсткий цикл ходов (для боссов, где важен ритм), иначе ход выбирается
// взвешенно с запретом третьего повтора подряд (`maxRepeat`).
//
// Почему вилка HP, а не число: одинаковый бой дважды подряд читается как повтор, даже
// если враги разные. Разброс ±10% делает второй заход другим, не ломая расчёты игрока.
export const ENEMIES = {
  // ───────────────────────── Урочище 1: Гиблый Бор ──────────────────────────
  volchok: { id: 'volchok', art: 'volchok', hpMin: 18, hpMax: 22, moves: [
    { name: 'bite', effects: [{ op: 'damage', value: 7 }], weight: 3 },
    { name: 'howl', effects: [{ op: 'status', status: 'str', value: 2, to: 'self' }], weight: 1 },
  ] },
  kikimora: { id: 'kikimora', art: 'kikimora', hpMin: 22, hpMax: 26, moves: [
    { name: 'claw', effects: [{ op: 'damage', value: 5, times: 2 }], weight: 3 },
    { name: 'curse', effects: [{ op: 'status', status: 'weak', value: 1 }], weight: 2 },
  ] },
  penek: { id: 'penek', art: 'penek', hpMin: 28, hpMax: 33, moves: [
    { name: 'slam', effects: [{ op: 'damage', value: 9 }], weight: 3 },
    { name: 'bark', effects: [{ op: 'block', value: 8 }], weight: 2 },
  ] },
  durman: { id: 'durman', art: 'durman', hpMin: 15, hpMax: 19, moves: [
    { name: 'spores', effects: [{ op: 'status', status: 'weak', value: 2 }, { op: 'status', status: 'vuln', value: 1 }], weight: 2 },
    { name: 'burst', effects: [{ op: 'damage', value: 6 }], weight: 3 },
  ] },
  voron: { id: 'voron', art: 'voron', hpMin: 12, hpMax: 16, moves: [
    { name: 'peck', effects: [{ op: 'damage', value: 4, times: 2 }], weight: 3 },
    { name: 'dive', effects: [{ op: 'damage', value: 8 }], weight: 2 },
  ] },
  ogonek: { id: 'ogonek', art: 'ogonek', hpMin: 14, hpMax: 18, moves: [
    { name: 'flare', effects: [{ op: 'damage', value: 5 }, { op: 'status', status: 'frail', value: 2 }], weight: 2 },
    { name: 'flicker', effects: [{ op: 'block', value: 6 }], weight: 1 },
  ] },
  shatun: { id: 'shatun', art: 'shatun', elite: true, hpMin: 62, hpMax: 68, moves: [
    { name: 'maul', effects: [{ op: 'damage', value: 14 }], weight: 3 },
    { name: 'roar', effects: [{ op: 'damage', value: 8 }, { op: 'status', status: 'str', value: 2, to: 'self' }], weight: 2 },
    { name: 'hide', effects: [{ op: 'block', value: 10 }], weight: 1 },
  ] },
  poludnitsa: { id: 'poludnitsa', art: 'poludnitsa', elite: true, hpMin: 52, hpMax: 56, moves: [
    { name: 'sickle', effects: [{ op: 'damage', value: 6, times: 3 }], weight: 3 },
    { name: 'noon', effects: [{ op: 'status', status: 'weak', value: 2 }, { op: 'status', status: 'vuln', value: 2 }], weight: 2 },
    { name: 'heat', effects: [{ op: 'damage', value: 12 }], weight: 2 },
  ] },
  leshiy: { id: 'leshiy', art: 'leshiy', boss: true, hpMin: 98, hpMax: 106,
    pattern: [0, 1, 2, 0, 1, 3], moves: [
      { name: 'roots', effects: [{ op: 'damage', value: 10 }, { op: 'status', status: 'frail', value: 2 }] },
      { name: 'branches', effects: [{ op: 'damage', value: 5, times: 3 }] },
      { name: 'grow', effects: [{ op: 'block', value: 12 }, { op: 'status', status: 'str', value: 2, to: 'self' }] },
      { name: 'wrath', effects: [{ op: 'damage', value: 15 }, { op: 'status', status: 'weak', value: 2 }] },
    ] },

  // ───────────────────────── Урочище 2: Мёртвая Топь ────────────────────────
  utoplennik: { id: 'utoplennik', art: 'utoplennik', hpMin: 30, hpMax: 35, moves: [
    { name: 'grab', effects: [{ op: 'damage', value: 10 }], weight: 3 },
    { name: 'silt', effects: [{ op: 'block', value: 10 }], weight: 1 },
  ] },
  piyavka: { id: 'piyavka', art: 'piyavka', hpMin: 24, hpMax: 28, moves: [
    { name: 'suck', effects: [{ op: 'damage', value: 7 }, { op: 'heal', value: 7, to: 'self' }], weight: 3 },
    { name: 'nip', effects: [{ op: 'damage', value: 4, times: 2 }], weight: 2 },
  ] },
  bolotnik: { id: 'bolotnik', art: 'bolotnik', hpMin: 38, hpMax: 44, moves: [
    { name: 'crush', effects: [{ op: 'damage', value: 12 }], weight: 3 },
    { name: 'mire', effects: [{ op: 'damage', value: 6 }, { op: 'status', status: 'weak', value: 2 }], weight: 2 },
  ] },
  tumannik: { id: 'tumannik', art: 'tumannik', hpMin: 26, hpMax: 30, moves: [
    { name: 'haze', effects: [{ op: 'status', status: 'frail', value: 2 }, { op: 'status', status: 'vuln', value: 2 }], weight: 2 },
    { name: 'chill', effects: [{ op: 'damage', value: 9 }], weight: 3 },
  ] },
  zhaba: { id: 'zhaba', art: 'zhaba', hpMin: 34, hpMax: 40, moves: [
    { name: 'spit', effects: [{ op: 'damage', value: 8 }, { op: 'status', status: 'poison', value: 3 }], weight: 3 },
    { name: 'puff', effects: [{ op: 'block', value: 12 }], weight: 1 },
  ] },
  blud: { id: 'blud', art: 'blud', hpMin: 22, hpMax: 26, moves: [
    { name: 'lure', effects: [{ op: 'status', status: 'weak', value: 2 }, { op: 'status', status: 'frail', value: 2 }], weight: 2 },
    { name: 'strike', effects: [{ op: 'damage', value: 11 }], weight: 3 },
  ] },
  omutnitsa: { id: 'omutnitsa', art: 'omutnitsa', elite: true, hpMin: 80, hpMax: 86, moves: [
    { name: 'drag', effects: [{ op: 'damage', value: 8, times: 2 }], weight: 3 },
    { name: 'song', effects: [{ op: 'status', status: 'weak', value: 3 }, { op: 'damage', value: 7 }], weight: 2 },
    { name: 'depth', effects: [{ op: 'block', value: 14 }, { op: 'status', status: 'str', value: 2, to: 'self' }], weight: 2 },
  ] },
  toplyak: { id: 'toplyak', art: 'toplyak', elite: true, hpMin: 88, hpMax: 96, moves: [
    { name: 'log', effects: [{ op: 'damage', value: 16 }], weight: 3 },
    { name: 'bark', effects: [{ op: 'block', value: 12 }, { op: 'status', status: 'thorns', value: 3, to: 'self' }], weight: 2 },
  ] },
  vodyanoy: { id: 'vodyanoy', art: 'vodyanoy', boss: true, hpMin: 152, hpMax: 162,
    pattern: [0, 2, 1, 3, 0, 1, 2], moves: [
      { name: 'wave', effects: [{ op: 'damage', value: 16 }] },
      { name: 'whirl', effects: [{ op: 'damage', value: 7, times: 3 }] },
      { name: 'tide', effects: [{ op: 'block', value: 16 }, { op: 'status', status: 'str', value: 2, to: 'self' }] },
      { name: 'curse', effects: [{ op: 'status', status: 'vuln', value: 3 }, { op: 'damage', value: 10 }] },
    ] },

  // ───────────────────────── Урочище 3: Костяной Кряж ───────────────────────
  kostyak: { id: 'kostyak', art: 'kostyak', hpMin: 40, hpMax: 46, moves: [
    { name: 'chop', effects: [{ op: 'damage', value: 13 }], weight: 3 },
    { name: 'guard', effects: [{ op: 'block', value: 12 }], weight: 1 },
  ] },
  upyr: { id: 'upyr', art: 'upyr', hpMin: 46, hpMax: 52, moves: [
    { name: 'drain', effects: [{ op: 'damage', value: 10 }, { op: 'heal', value: 6, to: 'self' }], weight: 3 },
    { name: 'rake', effects: [{ op: 'damage', value: 6, times: 2 }], weight: 2 },
  ] },
  nav: { id: 'nav', art: 'nav', hpMin: 36, hpMax: 42, moves: [
    { name: 'wail', effects: [{ op: 'damage', value: 8 }, { op: 'status', status: 'weak', value: 2 }], weight: 3 },
    { name: 'rise', effects: [{ op: 'status', status: 'str', value: 3, to: 'self' }], weight: 1 },
  ] },
  glaz: { id: 'glaz', art: 'glaz', hpMin: 30, hpMax: 34, moves: [
    { name: 'gaze', effects: [{ op: 'status', status: 'vuln', value: 3 }, { op: 'damage', value: 6 }], weight: 2 },
    { name: 'blast', effects: [{ op: 'damage', value: 14 }], weight: 3 },
  ] },
  petukh: { id: 'petukh', art: 'petukh', hpMin: 44, hpMax: 50, moves: [
    { name: 'spur', effects: [{ op: 'damage', value: 5, times: 3 }], weight: 3 },
    { name: 'feathers', effects: [{ op: 'block', value: 15 }], weight: 1 },
  ] },
  moroka: { id: 'moroka', art: 'moroka', hpMin: 38, hpMax: 44, moves: [
    { name: 'fog', effects: [{ op: 'status', status: 'frail', value: 3 }, { op: 'status', status: 'weak', value: 3 }], weight: 2 },
    { name: 'slash', effects: [{ op: 'damage', value: 12 }], weight: 3 },
  ] },
  kostyanoy_volk: { id: 'kostyanoy_volk', art: 'kostyanoy_volk', elite: true, hpMin: 118, hpMax: 126, moves: [
    { name: 'rend', effects: [{ op: 'damage', value: 11, times: 2 }], weight: 3 },
    { name: 'hunger', effects: [{ op: 'status', status: 'str', value: 3, to: 'self' }, { op: 'damage', value: 8 }], weight: 2 },
    { name: 'bones', effects: [{ op: 'block', value: 18 }], weight: 1 },
  ] },
  vedma: { id: 'vedma', art: 'vedma', elite: true, hpMin: 108, hpMax: 114, moves: [
    { name: 'brew', effects: [{ op: 'status', status: 'poison', value: 6 }, { op: 'damage', value: 8 }], weight: 3 },
    { name: 'hex', effects: [{ op: 'status', status: 'weak', value: 3 }, { op: 'status', status: 'vuln', value: 3 }], weight: 2 },
    { name: 'bolt', effects: [{ op: 'damage', value: 18 }], weight: 2 },
  ] },
  likho: { id: 'likho', art: 'likho', boss: true, hpMin: 236, hpMax: 252,
    pattern: [0, 1, 2, 3, 0, 1, 1, 2], moves: [
      { name: 'stare', effects: [{ op: 'status', status: 'vuln', value: 3 }, { op: 'status', status: 'weak', value: 3 }, { op: 'damage', value: 12 }] },
      { name: 'claw', effects: [{ op: 'damage', value: 9, times: 3 }] },
      { name: 'famine', effects: [{ op: 'block', value: 20 }, { op: 'status', status: 'str', value: 3, to: 'self' }] },
      { name: 'doom', effects: [{ op: 'damage', value: 22 }] },
    ] },
};
