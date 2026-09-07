// СОБЫТИЯ — узлы без боя, где игрок платит одним ресурсом за другой.
// Данные, без функций: операции исполняет `applyEventOutcome` в run.js.
//
// Правило, по которому событие считается хорошим: у каждого выбора есть ЦЕНА, и она
// разная по природе (здоровье / золото / чистота колоды / максимум здоровья). Событие
// вида «нажми, получи хорошее» ничего не решает и только тратит этаж — таких здесь нет,
// кроме честного «пройти мимо», который всегда доступен и всегда бесплатен.
//
// Операции: gold, heal, healPct, damage, maxHp, curse, card, relic, upgrade,
//           removeRandom, duplicate, allGold.
export const EVENTS = {
  pogost: { art: 'ev_pogost', choices: [
    { id: 'dig', outcomes: [{ op: 'gold', value: 90 }, { op: 'curse', card: 'porcha' }] },
    { id: 'pray', outcomes: [{ op: 'healPct', value: 0.2 }] },
    { id: 'leave', outcomes: [] },
  ] },

  chuzhoy_koster: { art: 'ev_koster', choices: [
    { id: 'warm', outcomes: [{ op: 'heal', value: 20 }] },
    { id: 'search', outcomes: [{ op: 'gold', value: 55 }, { op: 'damage', value: 8 }] },
  ] },

  starukha: { art: 'ev_starukha', choices: [
    { id: 'pay', req: { gold: 80 }, outcomes: [{ op: 'gold', value: -80 }, { op: 'relic', tier: null }] },
    { id: 'leave', outcomes: [] },
  ] },

  idol: { art: 'ev_idol', choices: [
    { id: 'bow', outcomes: [{ op: 'maxHp', value: 9 }, { op: 'curse', card: 'tyazhest' }] },
    { id: 'smash', outcomes: [{ op: 'gold', value: 65 }, { op: 'damage', value: 10 }] },
    { id: 'leave', outcomes: [] },
  ] },

  kolodets: { art: 'ev_kolodets', choices: [
    { id: 'coin', req: { gold: 45 }, outcomes: [{ op: 'gold', value: -45 }, { op: 'upgrade', value: 1 }] },
    { id: 'look', outcomes: [{ op: 'card', rarity: 'rare' }, { op: 'curse', card: 'strakh' }] },
    { id: 'leave', outcomes: [] },
  ] },

  brodyachiy: { art: 'ev_brodyachiy', choices: [
    { id: 'trade', req: { gold: 55 }, outcomes: [{ op: 'gold', value: -55 }, { op: 'removeRandom', value: 1 }] },
    { id: 'leave', outcomes: [] },
  ] },

  ranenyy_volk: { art: 'ev_volk', choices: [
    { id: 'help', outcomes: [{ op: 'damage', value: 7 }, { op: 'relic', tier: 'common' }] },
    { id: 'kill', outcomes: [{ op: 'gold', value: 45 }] },
  ] },

  zerkalo: { art: 'ev_zerkalo', choices: [
    { id: 'look', outcomes: [{ op: 'duplicate' }] },
    { id: 'turn', outcomes: [{ op: 'heal', value: 12 }] },
  ] },

  bolotnyy_dar: { act: 2, art: 'ev_dar', choices: [
    { id: 'take', outcomes: [{ op: 'card', rarity: 'uncommon' }, { op: 'curse', card: 'strakh' }] },
    { id: 'refuse', outcomes: [{ op: 'heal', value: 14 }] },
  ] },

  chelnok: { act: 2, art: 'ev_chelnok', choices: [
    { id: 'pay', req: { gold: 65 }, outcomes: [{ op: 'gold', value: -65 }, { op: 'heal', value: 28 }] },
    { id: 'swim', outcomes: [{ op: 'damage', value: 13 }, { op: 'gold', value: 30 }] },
  ] },

  kostyanoy_altar: { act: 3, art: 'ev_altar', choices: [
    { id: 'blood', outcomes: [{ op: 'damage', value: 16 }, { op: 'upgrade', value: 2 }] },
    { id: 'gold', outcomes: [{ op: 'allGold' }, { op: 'relic', tier: 'rare' }] },
    { id: 'leave', outcomes: [] },
  ] },

  shepot_likha: { act: 3, art: 'ev_shepot', choices: [
    { id: 'listen', outcomes: [{ op: 'maxHp', value: -6 }, { op: 'card', rarity: 'rare' }] },
    { id: 'cover', outcomes: [{ op: 'heal', value: 10 }] },
  ] },
};
