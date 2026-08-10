// ДОСТИЖЕНИЯ. Хранится список открытых id в сейве (GLOSSARY.md: ключ `achievements`).
// Проверка условий — src/meta/progress.js: checkAchievements(stats).
export const ACHIEVEMENTS = [
  { id: 'first_blood', icon: 'ach_first_blood' },
  { id: 'first_floor', icon: 'ach_first_floor' },
  { id: 'floor_5', icon: 'ach_floor5' },
  { id: 'floor_10', icon: 'ach_floor10' },
  { id: 'floor_15', icon: 'ach_floor15' },
  { id: 'floor_20', icon: 'ach_floor20' },
  { id: 'all_heroes', icon: 'ach_all_heroes' },
  { id: 'relic_collector', icon: 'ach_relics' },   // 20 реликвий за жизнь
  { id: 'spirit_hoarder', icon: 'ach_spirit' },    // 500 духа за жизнь
  { id: 'boss_slayer', icon: 'ach_boss' },         // 3 босса за жизнь
  { id: 'daily_streak_3', icon: 'ach_streak3' },
  { id: 'daily_streak_7', icon: 'ach_streak7' },
  { id: 'no_hit_floor', icon: 'ach_nohit' }        // этаж без урона
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
