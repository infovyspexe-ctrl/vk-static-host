// ШИНА СОБЫТИЙ. Механики общаются через неё, а не дёргают друг друга напрямую.
// В шаблоне здесь Phaser.Events.EventEmitter; Кладовая без Phaser, поэтому
// маленький совместимый эмиттер с тем же контрактом on/off/emit.
export const bus = {
  _handlers: {},

  on(name, fn) {
    (this._handlers[name] = this._handlers[name] || []).push(fn);
  },

  off(name, fn) {
    const list = this._handlers[name];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  },

  emit(name, data) {
    const list = this._handlers[name];
    if (!list) return;
    for (const fn of list.slice()) {
      try { fn(data); } catch (e) { console.warn('[bus]', name, e); }
    }
  }
};
