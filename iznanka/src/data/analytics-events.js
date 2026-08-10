// ТОЧКИ КОНТРОЛЯ (CONVENTIONS.md §11). Закладываются с первого дня, не потом.
export const EVENTS = {
  GAME_START: 'game_start',             // старт забега { hero, floor: 1, daily: bool }
  SESSION_END: 'session_end',           // выход/смерть { floor, sparksEarned }
  FLOOR_REACHED: 'floor_reached',       // { floor } — видно, где сливаются
  RELIC_CHOSEN: 'relic_chosen',         // { relicId, floor }
  BOSS_KILLED: 'boss_killed',           // { bossId, floor }
  PLAYER_DIED: 'player_died',           // { floor, killerId }
  HUB_OPENED: 'hub_opened',             // первый экран деревни в сессии
  UPGRADE_BOUGHT: 'upgrade_bought',     // { branch, level } или { kit: id }
  HERO_UNLOCKED: 'hero_unlocked',       // { heroId }
  HERO_SELECTED: 'hero_selected',       // { heroId }
  DAILY_STARTED: 'daily_started',       // { streak }
  DAILY_CLAIMED: 'daily_claimed',       // ежедневная награда за стрик получена
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked', // { id }
  AD_REWARDED_SHOWN: 'ad_rewarded_shown',       // { placement: 'revive'|'reroll' }
  AD_INTERSTITIAL_SHOWN: 'ad_interstitial_shown',
  TUTORIAL_HINT_SHOWN: 'tutorial_hint_shown'    // { hintId } — препятствия онбординга
};
