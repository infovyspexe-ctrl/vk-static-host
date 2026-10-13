import { Analytics } from './analytics.js';
import { EVENTS } from '../data/analytics-events.js';
// Saved onboarding state. Legacy saves deliberately bypass the new guide.
import { TUTORIAL_TARGETS } from '../data/tutorial.js';
export const TUTORIAL_STEPS = ['unit', 'wall', 'battle', 'reward', 'upgrade', 'done'];
export function tutorialStep(progress) {
  return TUTORIAL_STEPS.includes(progress.tutorial) ? progress.tutorial : 'done';
}
export function advanceTutorial(progress, event) {
  const step = tutorialStep(progress);
  const expected = { unit: 'unit', wall: 'wall', battle: 'victory', reward: 'claim', upgrade: 'upgrade' };
  if (expected[step] !== event) return false;
  progress.tutorial = TUTORIAL_STEPS[TUTORIAL_STEPS.indexOf(step) + 1];
  Analytics.event(EVENTS.TUTORIAL_STEP, { step, next: progress.tutorial, level: progress.level });
  return true;
}
export function tutorialTarget(progress) {
  const step = tutorialStep(progress);
  return TUTORIAL_TARGETS[step] ? { ...TUTORIAL_TARGETS[step] } : null;
}
