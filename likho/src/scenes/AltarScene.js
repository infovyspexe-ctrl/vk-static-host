// АЛТАРЬ ПАМЯТИ — постоянная прокачка между походами.
//
// Зачем она есть: проигрыш в рогалике обязан чем-то заканчиваться, кроме слова «увы».
// Память капает за пройденное, и следующий поход начинается ощутимо крепче — это и есть
// причина нажать «ещё раз» после смерти на восьмом этаже.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, bodyText, panel, toast } from '../ui/widgets.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Progress } from '../meta/progress.js';
import { BALANCE } from '../data/balance.js';

const KEYS = ['hp', 'gold', 'choice', 'relic'];

export class AltarScene extends Phaser.Scene {
  constructor() { super('Altar'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);
    heading(this, width / 2, 110, i18n.t('altar'));
    bodyText(this, width / 2, 166, i18n.t('altarHint'));

    this.memText = this.add.text(width / 2, 220, '', {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.normal, color: THEME.colors.accentText,
    }).setOrigin(0.5);

    this.rows = [];
    KEYS.forEach((key, i) => {
      const y = 330 + i * 180;
      panel(this, width / 2, y, width - 60, 156, { fill: THEME.colors.panel });

      const title = this.add.text(50, y - 46, i18n.t('altar_' + key), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      }).setOrigin(0, 0.5);

      const desc = this.add.text(50, y - 4, i18n.t('altar_' + key + '_t', { v: BALANCE.ALTAR[key].value }), {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
        wordWrap: { width: width - 140 },
      }).setOrigin(0, 0.5);

      const level = this.add.text(50, y + 42, '', {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.successText,
      }).setOrigin(0, 0.5);

      const btn = createButton(this, width - 150, y + 36, '', () => this.buy(key), {
        color: THEME.colors.primary, fontSize: THEME.fontSize.tiny,
      });

      this.rows.push({ key, level, btn });
    });

    createButton(this, width / 2, height - 70, i18n.t('back'), () => Input.goTo(this, 'Menu'), {
      color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small,
    });

    this.render();
  }

  render() {
    this.memText.setText('✦ ' + i18n.t('memory') + ': ' + Progress.data.memory);
    for (const row of this.rows) {
      const cfg = BALANCE.ALTAR[row.key];
      const lvl = Progress.altarLevel(row.key);
      row.level.setText(i18n.t('altarLevel', { cur: lvl, max: cfg.max }));
      const cost = Progress.altarCost(row.key);
      if (cost === null) {
        row.btn.setLabel(i18n.t('altarMax'));
        row.btn.setBgColor(THEME.colors.neutral);
      } else {
        row.btn.setLabel(i18n.t('altarBuy', { n: cost }));
        row.btn.setBgColor(Progress.canBuyAltar(row.key) ? THEME.colors.primary : THEME.colors.neutral);
      }
    }
  }

  buy(key) {
    if (!Progress.canBuyAltar(key)) {
      toast(this, Progress.altarCost(key) === null ? i18n.t('altarMax') : i18n.t('notEnoughGold'));
      return;
    }
    Progress.buyAltar(key);
    Sounds.upgrade();
    Progress.flush();
    this.render();
  }
}
