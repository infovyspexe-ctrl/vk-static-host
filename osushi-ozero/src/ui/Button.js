// Базовая кнопка. ВСЕ кнопки в игре создаются через неё.
// Смена THEME меняет вид всех кнопок сразу, без правок по сценам.
// Кнопка сама регистрируется в фокус-навигации Input: выбирается стрелками
// и Enter, если в сцене вызван Input.setup(this).
// Менять надпись: btn.setLabel('текст') — фон перерисуется под новую ширину.
import { THEME } from './theme.js';
import { Input } from '../core/input.js';

export function createButton(scene, x, y, label, onClick, opts = {}) {
  let color = opts.color ?? THEME.colors.primary;
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

  function redraw() {
    const w = txt.width + padX * 2;
    const h = txt.height + padY * 2;
    bg.clear();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);
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
  // Смена цвета кнопки на лету (вкладки: активная — основная, неактивная — второстепенная).
  // Держим ЦВЕТОМ, а не прозрачностью: погашенная кнопка хуже читается, а это причина
  // отказа модерации VK 02.08 («цветовое решение не позволяет быстро читать текст»).
  container.setColor = (fill, textCol) => {
    color = fill;
    txt.setColor(textCol ?? THEME.colors.primaryText);
    redraw();
  };
  container.setTabActive = (on) => container.setColor(
    on ? THEME.colors.primary : THEME.colors.neutral,
    on ? THEME.colors.primaryText : THEME.colors.text
  );
  Input.register(scene, container, () => { if (onClick) onClick(); });
  return container;
}
