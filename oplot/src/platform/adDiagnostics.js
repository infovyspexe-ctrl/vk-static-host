// Opt-in, short-lived support trace, separate from campaign saves. No user IDs,
// launch parameters or raw SDK errors. Enable for this VK account for <= 1 hour.
export function createAdDiagnostics() {
  let bridge, until = 0, rows = [], timer, pending = false, changed = false;
  const bounded = promise => {
    let timeout;
    return Promise.race([promise, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('diagnostics timeout')), 2000);
    })]).finally(() => clearTimeout(timeout));
  };
  const api = {
    async init(b) {
      bridge = b;
      try {
        const response = await bounded(b.send('VKWebAppStorageGet', { keys: ['oplot_ad_debug_until'] }));
        const value = Number(response.keys?.find(k => k.key === 'oplot_ad_debug_until')?.value);
        if (value > Date.now() && value <= Date.now() + 3600000) until = value;
      } catch { /* Diagnostics must never prevent startup. */ }
    },
    record(stage, format, result, detail = {}) {
      if (Date.now() >= until) return;
      const row = { t: Date.now(), stage, format, result };
      for (const key of ['ms', 'code', 'wait']) if (Number.isFinite(detail[key])) row[key] = detail[key];
      rows.push(row); rows = rows.slice(-16); changed = true;
      clearTimeout(timer); timer = setTimeout(() => api.flush(), 300);
    },
    async flush() {
      clearTimeout(timer);
      if (pending || !changed || Date.now() >= until) return;
      pending = true; changed = false;
      try {
        await bounded(bridge.send('VKWebAppStorageSet', {
          key: 'oplot_ad_debug', value: JSON.stringify({ v: 1, rows }),
        }));
      } catch { /* Support trace is best effort, never campaign state. */ }
      finally { pending = false; if (changed) timer = setTimeout(() => api.flush(), 300); }
    },
  };
  return api;
}
export const AdDiagnostics = createAdDiagnostics();
