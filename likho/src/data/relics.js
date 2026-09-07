// ОБЕРЕГИ — постоянные усилители на весь забег. Данные, без единой функции.
//
// Два вида, не путать:
//   БОЕВЫЕ — у них есть `on` (событие боя) и `effects` (те же операции, что у карт).
//            Их исполняет combat.js.
//   ПАССИВНЫЕ — у них есть `passive` (множители и надбавки вне боя: золото, скидка
//            торговца, сила костра, число карт в награде). Их читают сцены и run.js.
// Один оберег может быть только одним из двух — так проще и не приходится держать в
// голове, кто чей эффект применяет.
//
// `unique: true` — стартовый оберег героя, в наградах не выпадает.
export const RELICS = {
  // ── Стартовые обереги героев ───────────────────────────────────────────────
  burnaya_krov: { tier: 'starter', unique: true, art: 'burnaya_krov', price: 0,
    on: 'combatEnd', effects: [{ op: 'heal', value: 6, to: 'self' }] },
  nauznaya_nit: { tier: 'starter', unique: true, art: 'nauznaya_nit', price: 0,
    on: 'combatStart', effects: [{ op: 'status', status: 'poison', value: 2, to: 'allEnemies' }] },
  lunnyy_amulet: { tier: 'starter', unique: true, art: 'lunnyy_amulet', price: 0,
    on: 'combatStart', effects: [{ op: 'status', status: 'str', value: 1, to: 'self' }, { op: 'status', status: 'dex', value: 1, to: 'self' }] },

  // ── Обычные ────────────────────────────────────────────────────────────────
  krest: { tier: 'common', art: 'krest', price: 150,
    on: 'combatStart', effects: [{ op: 'block', value: 6 }] },
  zub_volka: { tier: 'common', art: 'zub_volka', price: 160,
    on: 'combatStart', effects: [{ op: 'status', status: 'str', value: 1, to: 'self' }] },
  pero: { tier: 'common', art: 'pero', price: 150,
    on: 'combatStart', effects: [{ op: 'status', status: 'dex', value: 1, to: 'self' }] },
  klubok: { tier: 'common', art: 'klubok', price: 155,
    on: 'combatStart', effects: [{ op: 'draw', value: 1 }] },
  trava: { tier: 'common', art: 'trava', price: 140,
    on: 'combatEnd', effects: [{ op: 'heal', value: 6, to: 'self' }] },
  grosh: { tier: 'common', art: 'grosh', price: 145, passive: { goldMul: 1.2 } },
  lapot: { tier: 'common', art: 'lapot', price: 140, passive: { restHeal: 10 } },
  solonka: { tier: 'common', art: 'solonka', price: 160,
    on: 'combatStart', effects: [{ op: 'status', status: 'weak', value: 1, to: 'allEnemies' }] },

  // ── Необычные ──────────────────────────────────────────────────────────────
  alatyr: { tier: 'uncommon', art: 'alatyr', price: 230,
    on: 'combatStart', effects: [{ op: 'block', value: 10 }] },
  rog: { tier: 'uncommon', art: 'rog', price: 250,
    on: 'turnStart', everyTurn: 3, effects: [{ op: 'energy', value: 1 }] },
  kostyanoy_amulet: { tier: 'uncommon', art: 'kostyanoy_amulet', price: 220,
    on: 'kill', effects: [{ op: 'heal', value: 4, to: 'self' }] },
  zerkaltse: { tier: 'uncommon', art: 'zerkaltse', price: 235,
    on: 'combatStart', effects: [{ op: 'status', status: 'thorns', value: 3, to: 'self' }] },
  kolokolchik: { tier: 'uncommon', art: 'kolokolchik', price: 245,
    on: 'turnStart', everyTurn: 2, effects: [{ op: 'draw', value: 1 }] },
  serebro: { tier: 'uncommon', art: 'serebro', price: 210, passive: { shopDiscount: 0.75 } },
  ryabina: { tier: 'uncommon', art: 'ryabina', price: 260, passive: { cardChoice: 1 } },
  chasha: { tier: 'uncommon', art: 'chasha', price: 240, passive: { restHeal: 20 } },

  // ── Редкие ─────────────────────────────────────────────────────────────────
  serdtse_medvedya: { tier: 'rare', art: 'serdtse_medvedya', price: 380, passive: { maxHp: 14 } },
  glaz_likha: { tier: 'rare', art: 'glaz_likha', price: 420,
    on: 'combatStart', effects: [{ op: 'status', status: 'vuln', value: 2, to: 'allEnemies' }] },
  perunov_kamen: { tier: 'rare', art: 'perunov_kamen', price: 400,
    on: 'combatStart', effects: [{ op: 'status', status: 'str', value: 2, to: 'self' }] },
  sklyanka: { tier: 'rare', art: 'sklyanka', price: 360,
    on: 'combatStart', effects: [{ op: 'status', status: 'regen', value: 4, to: 'self' }] },
  cherep: { tier: 'rare', art: 'cherep', price: 390,
    on: 'cardPlayed', cardType: 'power', limit: 4, effects: [{ op: 'draw', value: 1 }] },
  zvezda: { tier: 'rare', art: 'zvezda', price: 430,
    on: 'turnStart', effects: [{ op: 'block', value: 3 }] },
  vereteno: { tier: 'rare', art: 'vereteno', price: 410,
    on: 'combatStart', effects: [{ op: 'status', status: 'extraDraw', value: 1, to: 'self' }] },
  pyatak: { tier: 'rare', art: 'pyatak', price: 350, passive: { goldMul: 1.5 } },
};
