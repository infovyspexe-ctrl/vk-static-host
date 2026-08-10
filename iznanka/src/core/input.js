// АБСТРАКЦИЯ ВВОДА. Мышь, тач и клавиши через один слой.
// Игра слушает действия ('up','down','left','right','confirm','back') из шины,
// не зная, чем их вызвали. Плюс фокус-навигация для десктопа и ТВ: кнопки,
// созданные через ui/Button.js, регистрируются здесь сами, стрелки двигают
// фокус (выделение масштабом), Enter/Space активируют выбранное.
// В сцене обязательно вызвать Input.setup(this), иначе клавиатура не работает.
//
// МОДАЛЬНЫЕ СЛОИ (нужны, как только над сценой появляется окно с затемнением/scrim).
// Плоский список фокуса, один на сцену, про модальные окна не знает: пока открыта модалка
// (диалог, оверлей, карточка) поверх scrim, стрелки уводили бы фокус на кнопки ПОД затемнением,
// а Enter активировал бы их прямо из-под неразрешённого окна. Поэтому фокус-навигация — СТЕК СЛОЁВ:
//   - слой 0 (базовый) заводится сам, в нём живут обычные кнопки сцены;
//   - модальная панель на показе зовёт Input.openLayer(scene, ключ) и всё, что она создаёт
//     ПОСЛЕ этого, попадает в её слой (createButton/makeSelectable кладут в ВЕРХНИЙ слой);
//   - стрелки и Enter работают ТОЛЬКО с верхним слоем — кнопки под затемнением недостижимы;
//   - на скрытии панель зовёт Input.closeLayer(scene, ключ), слой снимается, фокус (и подсветка)
//     возвращается туда, где был до открытия окна.
// Требование модерации B6 (клавиатурная навигация) при этом соблюдено: клавиатура работает
// всегда, просто в границах активного окна.
//
// Немодальный элемент, который перерисовывается ПОКА открыта модалка (например, панель под
// сценой, перерисованная из колбэка модального окна), обязан регистрироваться явно в базовый
// слой: Input.makeSelectable(obj, cb, { layer: null }) / Input.register(scene, obj, cb, { layer: null }).
//
// Обратная совместимость: register/makeSelectable без opts кладут объект в ВЕРХНИЙ слой
// (базовый, если модалок нет) — старый трёхаргументный вызов Button.js работает как раньше.
import { bus } from './events.js';

const BASE_LAYER = null; // ключ базового слоя сцены (он всегда на дне стека)

const nav = new WeakMap(); // сцена -> { layers: [{ key, items: [{obj,onSelect}], index }] }

function navState(scene) {
  if (!nav.has(scene)) {
    nav.set(scene, { layers: [{ key: BASE_LAYER, items: [], index: -1 }] });
    if (scene.events && scene.events.once) scene.events.once('shutdown', () => nav.delete(scene));
  }
  return nav.get(scene);
}

function topLayer(s) {
  return s.layers[s.layers.length - 1];
}

// Подсветка (масштаб) — только у активного слоя: у слоя, ушедшего под затемнение, выделение
// гасим, чтобы игрок не видел «подсвеченную» кнопку, которую нажать нельзя.
function paint(layer, active) {
  layer.items.forEach((it, i) => {
    try { it.obj.setScale(active && i === layer.index ? 1.08 : 1); } catch (e) {}
  });
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

  // Открыть модальный слой фокуса. Всё, что зарегистрируется ПОСЛЕ вызова, попадёт в него.
  // Повторный вызов с тем же ключом (панель перерисовывает себя) слой не дублирует.
  openLayer(scene, key) {
    const s = navState(scene);
    if (key === BASE_LAYER) return s.layers[0]; // базовый слой уже открыт всегда
    const i = s.layers.findIndex((l) => l.key === key);
    paint(topLayer(s), false);
    if (i > 0) {
      // Слой уже есть: перерисовка панели. Если он почему-то не верхний — поднимаем наверх,
      // иначе новые кнопки панели ушли бы в чужой слой.
      const layer = s.layers.splice(i, 1)[0];
      layer.index = -1;
      s.layers.push(layer);
      return layer;
    }
    const layer = { key, items: [], index: -1 };
    s.layers.push(layer);
    return layer;
  },

  // Снять модальный слой (панель скрыта). Слои, открытые поверх него, снимаются тоже —
  // висячих слоёв не остаётся, иначе фокус залип бы навсегда.
  closeLayer(scene, key) {
    const s = nav.get(scene); // именно get: на shutdown состояние уже удалено, воскрешать нечего
    if (!s) return;
    const i = s.layers.findIndex((l) => l.key === key);
    if (i <= 0) return; // базовый слой (0) не снимается никогда
    s.layers.splice(i);
    paint(topLayer(s), true);
  },

  // Есть ли сейчас открытый модальный слой (кроме базового).
  hasLayer(scene) {
    const s = nav.get(scene);
    return !!s && s.layers.length > 1;
  },

  // Зарегистрировать объект в фокус-навигации сцены (Button.js делает это сам).
  // opts.layer === null — положить в БАЗОВЫЙ слой (для немодального UI, который может
  // перерисовываться при открытой модалке). По умолчанию — верхний слой.
  register(scene, gameObject, onSelect, opts = {}) {
    const s = navState(scene);
    const layer = ('layer' in opts && opts.layer === BASE_LAYER) ? s.layers[0] : topLayer(s);
    layer.items.push({ obj: gameObject, onSelect });
    gameObject.once('destroy', () => {
      const i = layer.items.findIndex((it) => it.obj === gameObject);
      if (i >= 0) { layer.items.splice(i, 1); if (layer.index >= layer.items.length) layer.index = -1; }
    });
  },

  // Сделать произвольный объект выбираемым: клик, тач и клавиатурный фокус.
  makeSelectable(gameObject, onSelect, opts = {}) {
    gameObject.setInteractive({ useHandCursor: true });
    gameObject.on('pointerup', () => onSelect());
    if (gameObject.scene) this.register(gameObject.scene, gameObject, onSelect, opts);
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
    if (!s) return;
    const layer = topLayer(s);
    if (!layer.items.length) return; // модалка без своих кнопок — стрелки просто ничего не делают

    // Пропускаем то, чего игрок не видит. Без этого фокус уходил в кнопки «Закрыть»
    // внутри СКРЫТЫХ оверлеев (достижения, рекорды): игрок жал вниз, подсветка
    // пропадала с экрана, Enter ничего не делал. Ловилось смоук-тестом «Осуши озеро».
    const n = layer.items.length;
    let idx = layer.index;
    for (let step = 0; step < n; step++) {
      idx = idx < 0 ? (dir > 0 ? 0 : n - 1) : (idx + dir + n) % n;
      if (this._reachable(layer.items[idx].obj)) { layer.index = idx; break; }
    }

    paint(layer, true);
  },

  _activate(scene) {
    const s = nav.get(scene);
    if (!s) return;
    const layer = topLayer(s);
    if (layer.index < 0 || !layer.items[layer.index]) return;
    layer.items[layer.index].onSelect();
  }
};
