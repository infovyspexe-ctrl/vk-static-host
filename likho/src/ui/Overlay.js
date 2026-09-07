// МОДАЛЬНЫЙ ОВЕРЛЕЙ. Один на всю игру: просмотр колоды, обереги, обучение, подтверждения.
//
// Две вещи, ради которых он существует и которые в играх забывают по отдельности:
//   1) СЛОЙ ФОКУСА (Input.openLayer/closeLayer) — иначе стрелки уводят выделение на кнопки
//      ПОД затемнением, а Enter нажимает их вслепую.
//   2) ПЕРЕХВАТ ТАПОВ фоном — иначе тап «мимо окна» проваливается на сцену под ним
//      (на карте это означает случайный вход в узел прямо из открытого окна).
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from './Button.js';
import { panel } from './widgets.js';
import { Input } from '../core/input.js';

let counter = 0;

export function openOverlay(scene, { title, height, build, onClose, closeLabel } = {}) {
  const { width, height: H } = scene.scale;
  const key = 'ov' + (++counter);
  const layer = scene.add.container(0, 0).setDepth(700);

  const dim = scene.add.rectangle(width / 2, H / 2, width, H, 0x08050c, 0.82).setInteractive();
  layer.add(dim);

  const boxH = height || H * 0.78;
  layer.add(panel(scene, width / 2, H / 2, width - 40, boxH, { fill: THEME.colors.panel }));

  if (title) {
    const t = scene.add.text(width / 2, H / 2 - boxH / 2 + 42, title, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
      color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5);
    layer.add(t);
  }

  Input.openLayer(scene, key);

  const close = () => {
    Input.closeLayer(scene, key);
    layer.destroy();
    if (onClose) onClose();
  };

  const api = {
    layer, close,
    key,
    top: H / 2 - boxH / 2,
    bottom: H / 2 + boxH / 2,
    boxH,
    add: (obj) => { layer.add(obj); return obj; },
    // Кнопки внутри оверлея обязаны регистрироваться в ЕГО слое фокуса.
    button: (x, y, label, cb, opts = {}) => {
      const b = createButton(scene, x, y, label, cb, { ...opts, layer: key });
      layer.add(b);
      return b;
    },
  };

  if (build) build(api);

  api.button(width / 2, H / 2 + boxH / 2 - 44, closeLabel || i18n.t('close'), close, {
    color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small,
  });

  return api;
}

// Вертикальная прокрутка содержимого внутри оверлея. Маска обязательна: без неё длинный
// список выезжает за окно и рисуется поверх затемнения.
export function scrollArea(scene, api, x, y, w, h) {
  // Контейнер стоит в НАЧАЛЕ КООРДИНАТ, а не в центре области: дети добавляются с
  // абсолютными координатами сцены, и контейнер со смещением сдвигал бы их второй раз.
  // Ровно на этом список зарубок уехал в правый нижний угол при первой же проверке.
  const content = scene.add.container(0, 0);
  api.add(content);

  const shape = scene.make.graphics({ x: 0, y: 0, add: false });
  shape.fillRect(x - w / 2, y - h / 2, w, h);
  content.setMask(shape.createGeometryMask());

  let maxScroll = 0;
  const clamp = (v) => Math.max(-maxScroll, Math.min(0, v));
  let dragging = false, startY = 0, startPos = 0;

  const onDown = (p) => {
    if (p.y < y - h / 2 || p.y > y + h / 2) return;
    dragging = true; startY = p.y; startPos = content.y;
  };
  const onMove = (p) => { if (dragging) content.y = clamp(startPos + (p.y - startY)); };
  const onUp = () => { dragging = false; };
  const onWheel = (p, o, dx, dy) => { content.y = clamp(content.y - dy * 0.6); };

  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('wheel', onWheel);

  // Снимаем обработчики вместе с окном: иначе они копятся при каждом открытии и
  // прокрутка начинает «ускоряться» с каждым разом.
  const origClose = api.close;
  api.close = () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
    scene.input.off('wheel', onWheel);
    shape.destroy();
    origClose();
  };

  return {
    content,
    setContentHeight(ch) { maxScroll = Math.max(0, ch - h); },
  };
}
