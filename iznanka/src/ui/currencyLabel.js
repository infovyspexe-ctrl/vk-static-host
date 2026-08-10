// Виджет «иконка + число» для валют. Раньше и Дух (за забег), и Искры (навсегда) рисовались
// одним и тем же символом ✦ — жалоба живого плейтеста «нужны чёткие разные иконки». Теперь
// у каждой валюты своя картинка (currency_spirit — холодный дух, currency_sparks — тёплая искра).
import { THEME, toCss } from './theme.js';

// align — куда «растёт» связка иконка+число относительно точки (x,y): 'left' | 'center' | 'right'.
export function createCurrencyLabel(scene, x, y, iconKey, opts = {}) {
  const fontSize = opts.fontSize || THEME.fontSize.normal;
  const align = opts.align || 'left';
  const gap = opts.gap ?? 8;
  const iconSize = opts.iconSize ?? 26;

  const icon = scene.add.image(0, 0, iconKey);
  icon.setScale(iconSize / Math.max(icon.width, icon.height));
  const text = scene.add.text(0, 0, '0', {
    fontFamily: THEME.fontFamily, fontSize, color: toCss(THEME.colors.accent), fontStyle: 'bold'
  }).setOrigin(0, 0.5);

  function layout() {
    const totalW = icon.displayWidth + gap + text.width;
    const startX = align === 'right' ? x - totalW : align === 'center' ? x - totalW / 2 : x;
    icon.setPosition(startX + icon.displayWidth / 2, y);
    text.setPosition(startX + icon.displayWidth + gap, y);
  }
  layout();

  return {
    icon, text,
    setValue(v) { text.setText(String(v)); layout(); },
    setVisible(v) { icon.setVisible(v); text.setVisible(v); }
  };
}
