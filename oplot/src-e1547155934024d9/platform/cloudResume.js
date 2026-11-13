import { Platform } from './index.js';
import { bus } from '../core/events.js';

// A native app may keep its WebView alive while another device advances the save.
// Pause before refreshing; scenes must be recreated if the authoritative state changed.
export function setupCloudResume() {
  if (Platform.name !== 'vk') return;
  let syncing = false;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#eee4c8;color:#302722;display:none;align-items:center;justify-content:center;flex-direction:column;gap:20px;padding:24px;text-align:center;font:20px/1.4 Arial';
  document.body.append(overlay);
  const ru = (Platform.getLang() || '').startsWith('ru');
  const sync = async () => {
    if (syncing || document.hidden) return;
    syncing = true;
    bus.emit('cloud:pause');
    overlay.style.display = 'flex';
    overlay.textContent = ru ? 'Проверяем сохранение…' : 'Checking cloud progress…';
    const state = () => JSON.stringify({...Platform.cache, savedAt:undefined, _v:undefined});
    const before = state();
    try {
      await Platform.save.load();
      if (Platform._loadFailed) throw new Error('Cloud unavailable');
      if (before !== state()) { location.reload(); return; }
      overlay.style.display = 'none';
      syncing = false;
      bus.emit('cloud:resume');
    } catch {
      overlay.textContent = ru ? 'Не удалось проверить сохранение. Подключитесь к сети и повторите.' : 'Could not check progress. Reconnect and retry.';
      const retry = document.createElement('button');
      retry.textContent = ru ? 'Повторить' : 'Retry';
      retry.style.cssText = 'font:inherit;padding:14px 24px';
      retry.onclick = () => { syncing = false; sync(); };
      overlay.append(retry);
    }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
  window.vkBridge?.subscribe?.(event => {
    if (event.detail?.type === 'VKWebAppViewRestore') sync();
  });
  bus.on('save:conflict', () => {
    // Do not await the write that emitted this event from inside itself.
    setTimeout(sync, 0);
  });
}
