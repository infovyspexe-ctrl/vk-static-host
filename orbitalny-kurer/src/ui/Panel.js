// Базовая панель (фон окна, меню, диалога). Все окна используют её.
import { THEME } from './theme.js';

export function createPanel(scene, x, y, w, h) {
  const g = scene.add.graphics();
  g.fillStyle(THEME.colors.panel, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, THEME.radius);
  return g;
}
