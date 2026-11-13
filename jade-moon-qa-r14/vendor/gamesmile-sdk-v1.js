/* GameSmile SDK 1.4.1. Игровой клиент, не требует доступа к cookies/localStorage. */
(function () {
  'use strict';
  if (window.GameSmileSDK) return;
  const client = crypto.randomUUID();
  const pending = new Map();
  let seq = 0, initPromise;
  let queued = 0, tail = Promise.resolve(), transportFailed = false;
  const listeners = new Map();
  const pauses = new Set();
  function emit(name, data) { (listeners.get(name) || []).forEach(fn => { try { fn(data); } catch (_) {} }); }
  function pauseSignal(name, data) {
    const wasPaused = pauses.size > 0;
    const reason = data?.reason || 'platform';
    if (name === 'pause') pauses.add(reason); else pauses.delete(reason);
    if (!wasPaused && pauses.size) emit('pause', {reason,reasons:Array.from(pauses)});
    if (wasPaused && !pauses.size) emit('resume', {reason,reasons:[]});
    if(wasPaused !== (pauses.size>0)) {
      try {window.parent.postMessage({gsSDK:1,client,event:'clientPause',data:{paused:pauses.size>0}},'*');} catch(_) {}
    }
  }
  function failure(code, message) { const e = new Error(message || code); e.code = code; return e; }
  window.addEventListener('message', function (event) {
    const m = event.data;
    if (event.source === window.parent && m?.gsSDK === 1 && m.client === client && ['pause','resume'].includes(m.event)) { pauseSignal(m.event,m.data); return; }
    if (event.source !== window.parent || !m || m.gsSDK !== 1 || m.client !== client || !pending.has(m.id)) return;
    const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer); clearInterval(p.retry);
    if (m.ok) p.resolve(m.result); else {
      if (m.error?.code === 'ACCOUNT_CHANGED') { pauseSignal('pause',{reason:'account'}); emit('accountChanged', {reloadRequired:true}); }
      p.reject(failure(m.error?.code || 'UNAVAILABLE', m.error?.message));
    }
  });
  function ask(method, data) {
    if (transportFailed) return Promise.reject(failure('RELOAD_REQUIRED', 'Ответ площадки потерян; перезагрузите игру перед новыми запросами'));
    if (window.parent === window) return Promise.reject(failure('NOT_EMBEDDED', 'Откройте игру в тестовом запуске GameSmile'));
    if (pending.size >= 16) return Promise.reject(failure('BUSY', 'Слишком много запросов'));
    return new Promise(function (resolve, reject) {
      const id = ++seq;
      const send = () => window.parent.postMessage({gsSDK:1, client, id, method, data}, '*');
      // Родительский host может ещё загружаться. Повторяем только init, никогда запись.
      const retry = method === 'init' ? setInterval(send, 1000) : null;
      const timer = setTimeout(function () {
        pending.delete(id); clearInterval(retry);
        // Нельзя запускать следующий запрос: host ещё может выполнять предыдущую запись.
        if (method !== 'init') { transportFailed = true; pauseSignal('pause', {reason:'transport'}); }
        reject(failure('TIMEOUT', 'Площадка не ответила; результат записи неизвестен'));
      }, 15000);
      pending.set(id, {resolve, reject, timer, retry});
      try { send(); }
      catch (_) { clearTimeout(timer); clearInterval(retry); pending.delete(id); reject(failure('UNAVAILABLE')); }
    });
  }
  function init() { return initPromise || (initPromise = ask('init').catch(function (e) { initPromise = null; throw e; })); }
  function run(method, data) {
    if (queued >= 16) return Promise.reject(failure('BUSY', 'Очередь SDK заполнена'));
    queued++;
    const result = tail.then(() => init()).then(() => ask(method, data));
    tail = result.then(() => { queued--; }, () => { queued--; });
    return result;
  }
  function jsonValue(value, ancestors = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || ancestors.has(value)) throw Error();
    const proto = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && proto !== null && !(Object.getPrototypeOf(proto) === null && proto.constructor?.name === 'Object')) throw Error();
    if ('toJSON' in value) throw Error();
    if (Object.getOwnPropertySymbols(value).length) throw Error();
    ancestors.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const d = Object.getOwnPropertyDescriptor(value, String(i));
        if (!d || !('value' in d)) throw Error();
        jsonValue(d.value, ancestors);
      }
      if (Object.keys(value).some(k => !/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= value.length)) throw Error();
    } else {
      for (const k of Object.keys(value)) {
        const d = Object.getOwnPropertyDescriptor(value, k);
        if (!('value' in d)) throw Error();
        jsonValue(d.value, ancestors);
      }
    }
    ancestors.delete(value);
  }
  if (typeof document !== 'undefined') {
    if (document.hidden) pauses.add('visibility');
    document.addEventListener('visibilitychange', () => pauseSignal(document.hidden ? 'pause' : 'resume', {reason:'visibility'}));
  }
  window.GameSmileSDK = Object.freeze({
    version:'1.4.1', init,
    on:(name, fn) => {
      if (!['pause','resume','accountChanged'].includes(name) || typeof fn !== 'function') throw failure('INVALID_DATA');
      const rows=listeners.get(name)||new Set(); rows.add(fn); listeners.set(name,rows);
      if (name === 'pause' && pauses.size) { try { fn({reason:Array.from(pauses)[0],reasons:Array.from(pauses)}); } catch (_) {} }
      return () => rows.delete(fn);
    },
    player:Object.freeze({get:() => run('player.get')}),
    auth:Object.freeze({open:() => run('auth.open')}),
    lifecycle:Object.freeze({ready:() => run('lifecycle.ready'),start:() => run('lifecycle.start'),stop:() => run('lifecycle.stop')}),
    fullscreen:Object.freeze({request:() => run('fullscreen.request'),exit:() => run('fullscreen.exit')}),
    leaderboards:Object.freeze({get:board => run('leaderboards.get',board===undefined?undefined:{board}),submit:(score,board) => run('leaderboards.submit',board===undefined?{score}:{score,board})}),
    achievements:Object.freeze({list:() => run('achievements.list'),unlock:code => run('achievements.unlock',{code}),progress:(code,progress) => run('achievements.progress',{code,progress}),sync:() => run('achievements.sync')}),
    analytics:Object.freeze({track:(name,key,value) => run('analytics.track',{name,key,value})}),
    gameEvents:Object.freeze({getActive:() => run('gameEvents.getActive')}),
    ads:Object.freeze({showInterstitial:() => run('ads.interstitial'),showRewarded:() => run('ads.rewarded')}),
    payments:Object.freeze({getCatalog:() => run('payments.catalog'),purchase:id => run('payments.purchase',{id}),getPurchases:() => run('payments.purchases'),consume:id => run('payments.consume',{id})}),
    storage:Object.freeze({
      load:() => run('load'),
      save:data => {
        try {
          jsonValue(data);
          const payload = JSON.stringify(data);
          if (!data || typeof data !== 'object' || Array.isArray(data) || typeof payload !== 'string') throw Error();
          if (new TextEncoder().encode(payload).length > 262144) return Promise.reject(failure('TOO_LARGE', 'Предел сохранения — 256 КБ'));
          return run('save', {payload});
        } catch (_) { return Promise.reject(failure('INVALID_DATA', 'Сохранение должно быть JSON-объектом')); }
      },
      importGuest:() => run('importGuest'),
      getPending:() => run('getPending'),
    }),
  });
})();
