// ЭКЗЕМПЛЯР ПОЛИТИКИ РЕКЛАМЫ этой игры. Сам модуль — замкнутая копия из
// `library/mechanics/ad-gate/` (см. meta/adGate.js), здесь только связка с числами
// игры и с сохранением.
//
// Отдельный файл, а не вызов в main.js, потому что сцены зовут AdGate напрямую и не
// должны знать, откуда он взялся и чем настроен.
import { createAdGate } from '../meta/adGate.js';
import { REWARD_LIMITS, INTERSTITIAL_ARM_SEC, INTERSTITIAL_MIN_RUNS } from '../data/ads.js';
import { todayKey } from '../meta/dailyBonus.js';
import { Progress } from '../meta/progress.js';

export const AdGate = createAdGate({
  rewardLimits: REWARD_LIMITS,
  armSec: INTERSTITIAL_ARM_SEC,
  minRuns: INTERSTITIAL_MIN_RUNS,
});

// Вызывается один раз после загрузки прогресса. onChange пишет трату НЕМЕДЛЕННО:
// без него суточные лимиты не переживали перезагрузку страницы (находка cosmic-drift).
export function initAdGate() {
  AdGate.init({
    state: Progress.data.ads,
    today: todayKey(new Date()),
    onChange: (state) => Progress.put({ ads: state }),
  });
}
