// АБСТРАКЦИЯ ВВОДА. Мышь, тач и клавиши через один слой.
// Игра слушает действия ('up','down','left','right','confirm','back') из шины,
// не зная, чем их вызвали. Плюс фокус-навигация для десктопа и ТВ: кнопки,
// созданные через ui/Button.js, регистрируются здесь сами, стрелки двигают
// фокус (выделение масштабом), Enter/Space активируют выбранное.
// В сцене обязательно вызвать Input.setup(this), иначе клавиатура не работает.
import { bus } from './events.js';

const nav = new WeakMap(); // сцена -> { items: [{ obj, onSelect }], index }

function navState(scene) {
  if (!nav.has(scene)) {
    nav.set(scene, { items: [], index: -1 });
    scene.events.once('shutdown', () => nav.delete(scene));
  }
  return nav.get(scene);
}

export const Input = {
  // Подключить клавиатуру в сцене: стрелки (фокус), Enter/Space (выбор), Esc (назад).
  setup(scene) {
    const k = scene.input.keyboard;
    if (!k) return;
    k.on('keydown-UP',    () => { bus.emit('input', 'up');    this._move(scene, -1); });
    k.on('keydown-LEFT',  () => { bus.emit('input', 'left');  this._move(scene, -1); });
    k.on('keydown-DOWN',  () => { bus.emit('input', 'down');  this._move(scene, 1); });
    k.on('keydown-RIGHT', () => { bus.emit('input', 'right'); this._move(scene, 1); });
    k.on('keydown-ENTER', () => { bus.emit('input', 'confirm'); this._activate(scene); });
    k.on('keydown-SPACE', () => { bus.emit('input', 'confirm'); this._activate(scene); });
    k.on('keydown-ESC',   () => bus.emit('input', 'back'));
  },

  // Зарегистрировать объект в фокус-навигации сцены (Button.js делает это сам).
  register(scene, gameObject, onSelect) {
    const s = navState(scene);
    s.items.push({ obj: gameObject, onSelect });
    gameObject.once('destroy', () => {
      const i = s.items.findIndex(it => it.obj === gameObject);
      if (i >= 0) { s.items.splice(i, 1); if (s.index >= s.items.length) s.index = -1; }
    });
  },

  // Сделать произвольный объект выбираемым: клик, тач и клавиатурный фокус.
  makeSelectable(gameObject, onSelect) {
    gameObject.setInteractive({ useHandCursor: true });
    gameObject.on('pointerup', () => onSelect());
    if (gameObject.scene) this.register(gameObject.scene, gameObject, onSelect);
    return gameObject;
  },

  // Виден ли объект на самом деле: сам видим И все его контейнеры-родители тоже.
  // Кнопка внутри скрытого оверлея формально visible === true, но игрок её не видит.
  _reachable(obj) {
    let o = obj;
    while (o) {
      if (o.visible === false) return false;
      o = o.parentContainer;
    }
    return true;
  },

  _move(scene, dir) {
    const s = nav.get(scene);
    if (!s || !s.items.length) return;

    // Пропускаем то, чего игрок не видит. Без этого фокус уходил в кнопки «Закрыть»
    // внутри СКРЫТЫХ оверлеев (достижения, рекорды): игрок жал вниз, подсветка
    // пропадала с экрана, Enter ничего не делал. Ловилось смоук-тестом «Осуши озеро».
    const n = s.items.length;
    let idx = s.index;
    for (let step = 0; step < n; step++) {
      idx = idx < 0 ? (dir > 0 ? 0 : n - 1) : (idx + dir + n) % n;
      if (this._reachable(s.items[idx].obj)) { s.index = idx; break; }
    }

    s.items.forEach((it, i) => {
      try { it.obj.setScale(i === s.index ? 1.08 : 1); } catch (e) {}
    });
  },

  _activate(scene) {
    const s = nav.get(scene);
    if (!s || s.index < 0 || !s.items[s.index]) return;
    s.items[s.index].onSelect();
  }
};
