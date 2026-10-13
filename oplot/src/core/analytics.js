import { EVENTS } from '../data/analytics-events.js';

// All providers receive the same bounded, non-identifying attribution fields.
// Storage failures must never break gameplay or suppress this session's events.
export function createAnalytics(env = {}) {
  const now = env.now || (() => Date.now());
  const storage = () => env.storage || globalThis.localStorage;
  let prefix = 'oplot', send = () => {}, context = {}, session = null, suspended = null;
  let seen = {}, day = null, attribution = {};
  const read = key => { try { return JSON.parse(storage().getItem(key)); } catch { return null; } };
  const write = (key, value) => { try { storage().setItem(key, JSON.stringify(value)); } catch {} };
  const api = {
    init(id, gamePrefix, options = {}) {
      prefix = gamePrefix || prefix;
      seen = read(prefix + '_metrika_first') || {};
      if (typeof seen !== 'object' || Array.isArray(seen)) seen = {};
      day = read(prefix + '_analytics_day');
      const query = new URLSearchParams(options.search ?? globalThis.location?.search ?? '');
      attribution = { platform: options.platform || 'local' };
      for (const key of ['vk_ref', 'vk_platform', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'])
        if (query.has(key)) attribution[key] = query.get(key).slice(0, 128);
      send = env.send || (() => {});
      const local = /^(localhost|127\.|192\.168\.)/.test(globalThis.location?.hostname || 'localhost');
      if (!env.send && id && !local) {
        try {
          const w = globalThis.window;
          w.ym ||= function () { (w.ym.a ||= []).push(arguments); };
          w.ym.l ||= now();
          if (!document.querySelector('script[src="https://mc.yandex.ru/metrika/tag.js"]')) {
            const script = document.createElement('script');
            script.async = true; script.src = 'https://mc.yandex.ru/metrika/tag.js';
            document.head.appendChild(script);
          }
          w.ym(id, 'init', { clickmap: false, trackLinks: false, accurateTrackBounce: true });
          send = (name, params) => w.ym(id, 'reachGoal', name, params);
        } catch {}
      }
      this.event('app_launch');
      this.first('first_launch');
      const today = Math.floor(now() / 86400000);
      if (Number.isFinite(day) && today > day) this.event('return_day', { days_since_last: today - day });
      if (!Number.isFinite(day) || today > day) write(prefix + '_analytics_day', today);
      day = today;
    },
    event(name, params = {}) {
      try { send(name, { ...attribution, ...params }); } catch {}
    },
    first(name, params) {
      if (seen[name]) return;
      seen[name] = true; write(prefix + '_metrika_first', seen);
      this.event(name, params);
    },
    begin(progress) {
      const mode = progress.mode === 'missions' ? 'missions' : 'endless';
      if (session && context.mode !== mode) this.end('mode_change');
      context = { mode, level: progress.level };
      if (!session) {
        session = { started: now(), depth: progress.level, wins: 0 };
        suspended = null;
        this.event(EVENTS.GAME_START, context);
      }
      session.depth = Math.max(session.depth, progress.level);
    },
    completed(progress, level) {
      this.begin(progress);
      session.wins++;
      this.event(EVENTS.PROGRESS_REACHED, { mode: context.mode, level, wins: session.wins });
    },
    end(reason = 'menu') {
      if (reason !== 'hidden') suspended = null;
      if (!session) return;
      this.event(EVENTS.SESSION_END, { ...context, depth: session.depth, wins: session.wins,
        duration_seconds: Math.max(0, Math.round((now() - session.started) / 1000)), reason });
      session = null;
    },
    hide() {
      if (!session) return;
      suspended = { ...context };
      this.end('hidden');
    },
    resume() {
      if (suspended) { const previous = suspended; suspended = null; this.begin(previous); }
    },
  };
  return api;
}
export const Analytics = createAnalytics();
