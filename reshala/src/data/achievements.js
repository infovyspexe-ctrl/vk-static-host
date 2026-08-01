// ДОСТИЖЕНИЯ — удержание (RETENTION E9). Session-based цели: дают повод переигрывать,
// не навязывая ежедневный бонус (он свайп-игре «попробовал пару раз» не подходит — RETENTION §9).
//
// Хранятся в сейве (поле `ach: { id: true }`); открытие показывает тост. Нативного API
// достижений у Яндекса нет — это внутриигровой список. У GamePush API есть, подключим при
// миграции на слой platform/ (см. NOTES).
//
// Каждое достижение: { id, name:{ru,en}, desc:{ru,en}, test(state) }.
// state — снимок прогресса + событие текущего момента (см. newlyUnlocked / GameScene.checkAch):
//   maxChapter  — самая дальняя достигнутая глава (любой режим)
//   bestDays    — рекорд дней «Срока»
//   metCount    — сколько персонажей встречено (Object.keys(charMet).length)
//   metCat      — встречен ли тюремный кот
//   mgTypes     — сколько РАЗНЫХ видов мини-игр выиграно (0..3: драка/тайминг/напёрстки)
//   modesCount  — сколько режимов сыграно (0..2)
//   retryUsed   — пользовался ли второй попыткой побега за рекламу
//   won         — текущее событие: победа в «Побеге»
//   winBlock    — глава, на которой победил (для «вырвался до финала»)
//   deathEdge   — 'min' | 'max' | null: чем закончился проигрыш

export const ACHIEVEMENTS = [
  { id: 'ch2', name: { ru: 'Освоился', en: 'Settled in' },
    desc: { ru: 'Дойти до 2-й главы', en: 'Reach chapter 2' },
    test: (s) => s.maxChapter >= 2 },
  { id: 'ch5', name: { ru: 'Полпути', en: 'Halfway' },
    desc: { ru: 'Дойти до 5-й главы', en: 'Reach chapter 5' },
    test: (s) => s.maxChapter >= 5 },
  { id: 'ch10', name: { ru: 'Ва-банк', en: 'All in' },
    desc: { ru: 'Дойти до финальной главы', en: 'Reach the final chapter' },
    test: (s) => s.maxChapter >= 10 },
  { id: 'escape', name: { ru: 'На воле!', en: 'Free!' },
    desc: { ru: 'Сбежать с зоны', en: 'Break out of prison' },
    test: (s) => !!s.won },
  { id: 'escape_early', name: { ru: 'Вырвался рано', en: 'Early bird' },
    desc: { ru: 'Сбежать ещё до финальной главы', en: 'Escape before the final chapter' },
    test: (s) => !!s.won && s.winBlock > 0 && s.winBlock < 10 },
  { id: 'survive25', name: { ru: 'Старожил', en: 'Old-timer' },
    desc: { ru: 'Продержаться 25 дней в «Сроке»', en: 'Last 25 days in The Time' },
    test: (s) => s.bestDays >= 25 },
  { id: 'survive50', name: { ru: 'Ветеран нар', en: 'Bunk veteran' },
    desc: { ru: 'Продержаться 50 дней в «Сроке»', en: 'Last 50 days in The Time' },
    test: (s) => s.bestDays >= 50 },
  { id: 'both_modes', name: { ru: 'И там, и там', en: 'Both sides' },
    desc: { ru: 'Сыграть и «Срок», и «Побег»', en: 'Play both The Time and The Escape' },
    test: (s) => s.modesCount >= 2 },
  { id: 'collect_all', name: { ru: 'Вся банда', en: 'The whole crew' },
    desc: { ru: 'Встретить всех 13 персонажей', en: 'Meet all 13 characters' },
    test: (s) => s.metCount >= 13 },
  { id: 'mg_win', name: { ru: 'Не робкого десятка', en: 'No pushover' },
    desc: { ru: 'Выиграть мини-игру', en: 'Win a mini-game' },
    test: (s) => s.mgTypes >= 1 },
  { id: 'mg_all', name: { ru: 'Мастер на все руки', en: 'Jack of all trades' },
    desc: { ru: 'Выиграть все три вида мини-игр', en: 'Win all three kinds of mini-game' },
    test: (s) => s.mgTypes >= 3 },
  // необычные
  { id: 'retry_ad', name: { ru: 'Со второго раза', en: 'Second wind' },
    desc: { ru: 'Использовать вторую попытку побега', en: 'Use a second escape attempt' },
    test: (s) => !!s.retryUsed },
  { id: 'meet_cat', name: { ru: 'Кис-кис', en: 'Here, kitty' },
    desc: { ru: 'Встретить тюремного кота', en: 'Meet the prison cat' },
    test: (s) => !!s.metCat },
  { id: 'edge_top', name: { ru: 'Перебор', en: 'Overdid it' },
    desc: { ru: 'Проиграть, упершись в потолок шкалы', en: 'Lose by maxing out a meter' },
    test: (s) => s.deathEdge === 'max' },
];

// Какие достижения открылись ИМЕННО СЕЙЧАС (ещё не были в unlocked, а теперь проходят test).
export function newlyUnlocked(state, unlocked) {
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked[a.id] && a.test(state)) out.push(a.id);
  }
  return out;
}

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
