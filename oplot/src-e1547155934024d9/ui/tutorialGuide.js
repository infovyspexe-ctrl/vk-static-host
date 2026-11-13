import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from './Button.js';

// Короткая подпись шага. Само действие — на поле: подсвеченная клетка или кнопка.
// skipAt выносит «Пропустить» в свободный слот шапки, чтобы плашка не накрывала «Обзор».
export function tutorialGuide(scene, key, onSkip, { x = 20, y = 12, width = 440, skipAt = null } = {}) {
  const skip = createButton(scene, x + width - 70, y + 28, i18n.t('tutorial.skip'), onSkip,
    { fontSize: '16px', paddingX: 10, paddingY: 4, color: THEME.colors.neutral }).setDepth(92);
  const textWidth = skipAt ? width - 16 : Math.max(120, width - skip.width - 28);
  const text = scene.add.text(x + 12, y + 10, i18n.t('tutorial.' + key), {
    fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.text,
    wordWrap: { width: textWidth }, lineSpacing: 2,
  }).setDepth(91);
  const h = Math.max(skipAt ? text.height + 18 : text.height + skip.height + 16, 52);
  const panelW = skipAt ? Math.min(width, text.width + 24) : width;
  const panel = scene.add.graphics().setDepth(90);
  panel.fillStyle(0xf3e8cd, 1).fillRoundedRect(x, y, panelW, h, 10);
  panel.lineStyle(2, 0x876b39, 1).strokeRoundedRect(x, y, panelW, h, 10);
  if (skipAt) skip.setPosition(skipAt.x, skipAt.y);
  else skip.setPosition(x + panelW - skip.width / 2 - 8, y + h - skip.height / 2 - 6);
  const outline = scene.add.graphics().setDepth(89);
  return {
    highlight(cx, cy, w, height) {
      outline.clear().lineStyle(3, 0x9a651d, 1).strokeRoundedRect(cx - w / 2 - 5, cy - height / 2 - 5, w + 10, height + 10, 7);
      outline.fillStyle(0x9a651d, 1).fillTriangle(cx - 8, cy - height / 2 - 22, cx + 8, cy - height / 2 - 22, cx, cy - height / 2 - 10);
    },
    destroy() { text.destroy(); panel.destroy(); skip.destroy(); outline.destroy(); },
  };
}
