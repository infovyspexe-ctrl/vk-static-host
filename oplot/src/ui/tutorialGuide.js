import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from './Button.js';

// Static outlines: no animated zoom, no dimming or moving the notebook world.
export function tutorialGuide(scene, key, onSkip, { x = 20, y = 12, width = 440 } = {}) {
  const text = scene.add.text(x + 12, y + 8, i18n.t('tutorial.' + key), {
    fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.text,
    wordWrap: { width: width - 24 }, lineSpacing: 3,
  }).setDepth(91);
  const h = Math.max(96, text.height + 48);
  const panel = scene.add.graphics().setDepth(90);
  panel.fillStyle(0xf3e8cd, 1).fillRoundedRect(x, y, width, h, 10);
  panel.lineStyle(2, 0x876b39, 1).strokeRoundedRect(x, y, width, h, 10);
  const skip = createButton(scene, x + width - 82, y + h - 19, i18n.t('tutorial.skip'), onSkip,
    { fontSize: '15px', paddingX: 10, paddingY: 3, color: THEME.colors.neutral }).setDepth(92);
  const outline = scene.add.graphics().setDepth(89);
  return {
    highlight(cx, cy, w, height) {
      outline.clear().lineStyle(3, 0x9a651d, 1).strokeRoundedRect(cx-w/2-5, cy-height/2-5, w+10, height+10, 7);
      outline.fillStyle(0x9a651d, 1).fillTriangle(cx-8, cy-height/2-22, cx+8, cy-height/2-22, cx, cy-height/2-10);
    },
    destroy() { text.destroy(); panel.destroy(); skip.destroy(); outline.destroy(); },
  };
}
