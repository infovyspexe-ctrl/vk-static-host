import { MONETIZATION } from '../data/monetization.js';

export class AdPolicy {
  constructor(state = {}, now = Date.now()) {
    const valid = value => Number.isFinite(value) && value >= 0 && value <= now ? value : 0;
    this.state = { started: valid(state.started) || now, lastAd: valid(state.lastAd),
      lastReward: valid(state.lastReward), lastAttempt: valid(state.lastAttempt) };
  }
  ready(format, now = Date.now()) {
    if (this.state.lastAttempt && now - this.state.lastAttempt < MONETIZATION.retryMs) return false;
    if (format === 'reward') return !this.state.lastReward || now - this.state.lastReward >= MONETIZATION.rewardedMs;
    return now - Math.max(this.state.started, this.state.lastAd) >= MONETIZATION.interstitialMs;
  }
  attempted(now = Date.now()) { this.state.lastAttempt = now; }
  opened(format, now = Date.now()) {
    this.state.lastAd = now;
    if (format === 'reward') this.state.lastReward = now;
  }
}
