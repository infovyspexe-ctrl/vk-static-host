// Базовая кнопка. ВСЕ кнопки в игре создаются через неё.
// Смена THEME меняет вид всех кнопок сразу, без правок по сценам.
// Кнопка сама регистрируется в фокус-навигации Input: выбирается стрелками
// и Enter, если в сцене вызван Input.setup(this).
// Менять надпись: btn.setLabel('текст') — фон перерисуется под новую ширину.
import { THEME } from './theme.js';
import { Input } from '../core/input.js';

export function createButton(scene, x, y, label, onClick, opts = {}) {
  const color = opts.color ?? THEME.colors.primary;
  const textColor = opts.textColor ?? THEME.colors.primaryText;
  const padX = THEME.button.paddingX;
  const padY = THEME.button.paddingY;

  const txt = scene.add.text(0, 0, label, {
    fontFamily: THEME.fontFamily,
    fontSize: opts.fontSize ?? THEME.fontSize.normal,
    color: textColor
  }).setOrigin(0.5);

  const bg = scene.add.graphics();
  const container = scene.add.container(x, y, [bg, txt]);

  // Оттенки для градиента и кромки считаем ОДИН РАЗ от базового цвета, не на каждый redraw.
  const c = Phaser.Display.Color.ValueToColor(color);
  const lighten = (n) => Phaser.Display.Color.GetColor(
    Math.min(255, c.red + n), Math.min(255, c.green + n), Math.min(255, c.blue + n));
  const top = lighten(26);
  const bottom = lighten(-18);

  function redraw() {
    const w = txt.width + padX * 2;
    const h = txt.height + padY * 2;
    bg.clear();
    // Плоская заливка одним цветом читалась как значок, а не как нажимаемый предмет —
    // жалоба игрока 14.08: «все кнопки очень дешёвые». Тень + вертикальный градиент +
    // светлая кромка сверху — стандартный «объёмный» приём, целиком через Graphics,
    // без новых картинок: меняется в ОДНОМ месте, и вид меняется сразу у всех кнопок игры.
    bg.fillStyle(0x000000, 0.28);
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, THEME.radius);
    bg.fillGradientStyle(top, top, bottom, bottom, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);
    bg.lineStyle(2, 0xffffff, 0.2);
    bg.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, THEME.radius - 1);
    container.setSize(w, h);
    if (container.input && container.input.hitArea && container.input.hitArea.setSize) {
      container.input.hitArea.setSize(w, h);
    }
  }
  redraw();

  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => container.setScale(1.04));
  container.on('pointerout', () => container.setScale(1));
  container.on('pointerup', () => { if (onClick) onClick(); });

  container.setLabel = (t) => { txt.setText(t); redraw(); };
  // ОТКЛЮЧЁННУЮ кнопку (onClick === null — так панели рисуют недоступное действие) в кольцо
  // фокуса не берём: иначе она в нём остаётся и «съедает» нажатие Enter, изображая сломанную
  // клавиатуру (находка смоук-теста 2026-07-24). Указателя это не касается — клик по ней
  // по-прежнему перехватывается и ничего не делает.
  // opts прокидываем в register: так кнопка модальной панели попадёт в её слой (opts.layer).
  if (onClick) Input.register(scene, container, onClick, opts);
  return container;
}
