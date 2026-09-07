// ВЫБОР ЗАСТУПНИКА. Заодно это экран «что мне ещё открывать» — закрытые герои показаны
// с условием, а не спрятаны: невидимая цель не мотивирует.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, bodyText, panel, toast } from '../ui/widgets.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { Progress } from '../meta/progress.js';
import { CATALOG } from '../data/catalog.js';

const UNLOCK_TEXT = { boss1: 'unlockBoss1', boss2: 'unlockBoss2' };

export class HeroesScene extends Phaser.Scene {
  constructor() { super('Heroes'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);
    heading(this, width / 2, 120, i18n.t('heroes'));

    const ids = CATALOG.heroIds;
    ids.forEach((id, i) => {
      const def = CATALOG.heroes[id];
      const unlocked = Progress.heroUnlocked(id);
      const y = 300 + i * 280;

      panel(this, width / 2, y, width - 60, 250, { fill: THEME.colors.panel });

      const artKey = 'hero_' + id;
      if (this.textures.exists(artKey)) {
        const img = this.add.image(130, y, artKey);
        img.setScale(Math.min(170 / img.width, 200 / img.height));
        img.setAlpha(unlocked ? 1 : 0.3);
      } else {
        this.add.circle(130, y, 74, THEME.colors.panelLight).setStrokeStyle(3, THEME.colors.stroke);
      }

      this.add.text(250, y - 78, i18n.t('hero_' + id), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
        color: unlocked ? THEME.colors.text : THEME.colors.neutralText,
      }).setOrigin(0, 0.5);

      this.add.text(250, y - 22, i18n.t('hero_' + id + '_t'), {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
        wordWrap: { width: width - 300 }, lineSpacing: 4,
      }).setOrigin(0, 0.5);

      this.add.text(250, y + 34, '♥ ' + (def.maxHp + Progress.runMeta().bonusHp), {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.successText,
      }).setOrigin(0, 0.5);

      if (unlocked) {
        createButton(this, width - 150, y + 78, i18n.t('play'), () => {
          Sounds.click();
          Session.startRun(id);
          Input.goTo(this, 'Map');
        }, { color: THEME.colors.primary, fontSize: THEME.fontSize.small });
      } else {
        this.add.text(250, y + 84, '🔒 ' + i18n.t(UNLOCK_TEXT[def.unlock] || 'locked'), {
          fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.accentText,
        }).setOrigin(0, 0.5);
      }
    });

    createButton(this, width / 2, height - 70, i18n.t('back'), () => Input.goTo(this, 'Menu'), {
      color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small,
    });
  }
}
