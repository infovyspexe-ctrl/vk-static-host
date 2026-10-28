import { Platform } from './index.js';
import { AdPolicy } from '../core/adPolicy.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { AdDiagnostics } from './adDiagnostics.js';

let policy, busy = false;
const getPolicy = () => policy ||= new AdPolicy(Platform.cache?.adTiming);
const persist = () => Platform.save.update({ adTiming: { ...getPolicy().state } });

export const Monetization = {
  enabled() { return Platform.name === 'vk' && Platform.available && !Platform._loadFailed && !Platform.readOnly; },
  async ready(format) {
    if (!this.enabled() || busy || !getPolicy().ready(format)) {
      AdDiagnostics.record('gate', format, !this.enabled() ? 'disabled' : busy ? 'busy' : 'cooldown');
      return false;
    }
    return Platform.ads.check(format);
  },
  async show(format, placement, onRewarded) {
    if (!this.enabled() || busy || !getPolicy().ready(format)) return { shown: false, rewarded: false };
    busy = true;
    let rewarded = false;
    try {
      // Do not offer an economic transaction while an earlier save is uncommitted.
      await Platform.save.flush();
      if (Platform._dirty || Platform._loadFailed) return { shown: false, rewarded: false, saveFailed: true };
      getPolicy().attempted(); persist();
      AdDiagnostics.record('show', format, 'requested');
      Analytics.event(EVENTS.AD_REQUEST, { placement, format });
      return await new Promise(resolve => {
        const onClose = async (result, shown) => {
          AdDiagnostics.record('close', format, shown ? 'shown' : 'not_shown');
          if (shown) {
            getPolicy().opened(format);
            Analytics.event(format === 'reward' ? EVENTS.REWARD_AD_SHOWN : EVENTS.INTERSTITIAL_AD_SHOWN, { placement, rewarded });
          }
          persist();
          await Platform.save.flush();
          Analytics.event(EVENTS.AD_RESULT, { placement, format, shown: !!shown, rewarded });
          resolve({ shown: !!shown, rewarded, saveFailed: Platform._dirty });
        };
        if (format === 'reward') Platform.ads.showRewarded({ onClose, onRewarded: () => {
          if (rewarded) return;
          rewarded = onRewarded?.() === true;
          if (rewarded) Analytics.event(EVENTS.AD_REWARD, { placement });
        } });
        else Platform.ads.showFullscreen({ onClose });
      });
    } finally { busy = false; }
  },
};
