import { Monetization } from '../platform/monetization.js';
import { Platform } from '../platform/index.js';
import { canDoubleReward, doubleReward, canReinforce, grantReinforcement, toSave } from '../core/progress.js';
import { tutorialStep } from '../core/tutorial.js';
import { Input } from '../core/input.js';
import { createButton } from './Button.js';
import { showAdCountdown } from './adCountdown.js';
import { i18n } from '../i18n/strings.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';

function lock(scene) {
  scene.adPending = true;
  Input.openLayer(scene, 'advertisement');
  const { width, height } = scene.scale;
  return scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, .12)
    .setDepth(300).setInteractive();
}
function unlock(scene, cover) {
  cover.destroy(); scene.adPending = false;
  Input.closeLayer(scene, 'advertisement');
}

export function setupResultAds(scene) {
  const token = Symbol('result');
  scene.adToken = token; scene.adPending = false; scene.interstitialReady = false;
  scene.events.once('shutdown', () => { scene.adToken = null; });
  const live = () => scene.adToken === token;
  if (scene.progress.mode === 'missions' || tutorialStep(scene.progress) !== 'done' || !Monetization.enabled()) return;
  Monetization.ready('interstitial').then(ok => { if (live()) scene.interstitialReady = ok; });
  const eligible = () => scene.won ? canDoubleReward(scene.progress) : canReinforce(scene.progress);
  const placement = scene.won ? 'victory_double' : 'defeat_reinforcement';
  let button, retrySave = false;
  const rewardLevel = scene.won ? scene.progress.pendingReward?.level : scene.progress.level;
  const refresh = async () => {
    if (!eligible() || button || scene.adPending) return;
    if (!(await Monetization.ready('reward')) || !live() || !eligible() || button || scene.adPending) return;
    const { width, height } = scene.scale;
    button = createButton(scene, scene.won ? width * .81 : width / 2, scene.won ? 50 : height * .82,
      i18n.t(scene.won ? 'ads.double' : 'ads.reinforce'), async () => {
        if (!live() || scene.adPending || (!retrySave && !eligible())) return;
        const cover = lock(scene);
        button.setLabel(i18n.t('ads.wait'));
        let result;
        try {
          if (retrySave) {
            await Platform.save.flush();
            result = { rewarded: !eligible(), saveFailed: Platform._dirty };
          } else result = await Monetization.show('reward', placement, () => {
            if (!live()) return false;
            const granted = scene.won ? doubleReward(scene.progress, rewardLevel) : grantReinforcement(scene.progress, rewardLevel);
            if (granted) Platform.save.update(toSave(scene.progress));
            return granted;
          });
          if (!live()) return;
          scene.interstitialReady = false; // Never follow a voluntary video with an automatic ad.
          retrySave = !!result.saveFailed;
          button.setLabel(i18n.t(retrySave ? 'ads.saveFailed' : result.rewarded ?
            (scene.won ? 'ads.doubled' : 'ads.reinforced') : 'ads.unavailable'));
          if (scene.won && scene.progress.pendingReward?.doubled) {
            scene.rewardLabel?.setText(i18n.t('result.reward', { n: scene.progress.pendingReward.reward * 2 }));
          }
          if (!retrySave && !result.rewarded) {
            scene.time.delayedCall(2500, () => { button?.destroy(); button = null; });
          }
        } finally { if (live()) unlock(scene, cover); }
      }, { fontSize: '24px', paddingX: 16, paddingY: scene.won ? 12 : 28,
        maxWidth: scene.won ? width * .36 : width * .8 });
    Analytics.event(EVENTS.AD_OFFER, { placement, level: rewardLevel });
  };
  refresh();
  scene.time.addEvent({ delay: 10000, loop: true, callback: refresh });
}

export async function continueAfterResult(scene, next) {
  if (!scene.interstitialReady || !Monetization.enabled()) { next(); return; }
  scene.interstitialReady = false;
  const token = scene.adToken, cover = lock(scene);
  showAdCountdown(scene, async () => {
    try { await Monetization.show('interstitial', 'victory_continue'); }
    finally {
      if (scene.adToken === token) { unlock(scene, cover); next(); }
    }
  });
}
