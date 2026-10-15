// AchievementsScene: список заслуг. Открывается из меню.
//
// Все 15 строк помещаются на экран без прокрутки (строка 64 px при высоте 1280) — это
// осознанно: прокрутка в веб-игре на телефоне конфликтует с прокруткой страницы площадки
// и часто «залипает», а список фиксированной длины этой проблемы не имеет.
//
// Вид — через THEME, тексты — через i18n, условия и награды — из data/achievements.js.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Save } from '../yandex/save.js';
import { mergeProgress } from '../meta/progress.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { achievementProgress } from '../meta/achievements.js';
import { drawCoinIcon } from '../render/icons.js';

export class AchievementsScene extends Phaser.Scene {
  constructor() { super('Achievements'); }

  async create() {
    const { width, height } = this.scale;
    Input.setup(this);

    const bg = this.add.graphics();
    bg.fillGradientStyle(THEME.colors.bgTopHex, THEME.colors.bgTopHex, THEME.colors.bgHex, THEME.colors.bgHex, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);

    const progress = mergeProgress((await Save.load()) || null);
    const { done, total } = achievementProgress(progress.achievements);

    this.add.text(width / 2, height * 0.055, i18n.t('achTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
      color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.095, i18n.t('achProgress', { done, total }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text
    }).setOrigin(0.5);

    const rowH = 64;
    const top = height * 0.13;
    ACHIEVEMENTS.forEach((a, i) => {
      const y = top + i * rowH + rowH / 2;
      const got = !!progress.achievements[a.id];

      const row = this.add.graphics();
      row.fillStyle(THEME.colors.panelLight, got ? 0.75 : 0.3);
      row.fillRoundedRect(20, y - rowH / 2 + 3, width - 40, rowH - 6, 10);
      if (got) {
        row.lineStyle(2, THEME.colors.success, 0.8);
        row.strokeRoundedRect(20, y - rowH / 2 + 3, width - 40, rowH - 6, 10);
      }

      // Галочка у полученных — рисованная, а не символ шрифта.
      if (got) {
        const tick = this.add.graphics();
        tick.lineStyle(5, THEME.colors.success, 1);
        tick.beginPath();
        tick.moveTo(44, y);
        tick.lineTo(54, y + 11);
        tick.lineTo(72, y - 12);
        tick.strokePath();
      }

      this.add.text(88, y - 12, i18n.t('ach_' + a.id), {
        fontFamily: THEME.fontFamily, fontSize: 22,
        color: got ? THEME.colors.text : THEME.colors.neutralText, fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      this.add.text(88, y + 13, got ? i18n.t('ach_' + a.id + '_desc') : i18n.t('achLocked'), {
        fontFamily: THEME.fontFamily, fontSize: 16,
        color: THEME.colors.text, wordWrap: { width: width - 240 }
      }).setOrigin(0, 0.5).setAlpha(got ? 0.85 : 0.45);

      // Награда справа: монета + число.
      drawCoinIcon(this, width - 92, y, 22).setAlpha(got ? 1 : 0.4);
      this.add.text(width - 74, y, String(a.reward), {
        fontFamily: THEME.fontFamily, fontSize: 20,
        color: got ? THEME.colors.accentText : THEME.colors.neutralText
      }).setOrigin(0, 0.5);
    });

    createButton(this, width / 2, height - 70, i18n.t('back'), () => this.scene.start('Menu'),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
  }
}
