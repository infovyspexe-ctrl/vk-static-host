// ИТОГ ПОХОДА. Слава, память, рекорд, предложение удвоить память за рекламу.
//
// Память начисляется ЗА ПРОЙДЕННОЕ, а не за победу: иначе первые десять проигранных
// походов не дают ничего, мета не запускается, и игрок уходит раньше, чем игра успевает
// показать, ради чего в неё возвращаться.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, bodyText, panel, actLabel } from '../ui/widgets.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { Progress } from '../meta/progress.js';
import { AdGate } from '../core/ads.js';
import { Ads } from '../yandex/ads.js';
import { Platform } from '../platform/index.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { claimUnlocks } from '../meta/achievements.js';

const LEADERBOARD = 'glory';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    const run = Session.run;
    if (!run) { this.scene.start('Menu'); return; }

    const s = run.state;
    this.score = run.score();
    this.memory = Progress.memoryFor(s, this.score);
    this.doubled = false;
    const isWin = s.result === 'win';
    const isRecord = this.score > Progress.data.bestScore;

    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);

    heading(this, width / 2, 200, i18n.t(isWin ? 'victory' : 'defeat'), {
      color: isWin ? THEME.colors.successText : THEME.colors.dangerText,
    });
    isWin ? Sounds.win() : Sounds.lose();

    bodyText(this, width / 2, 280, actLabel(s.act) + '\n' + i18n.t('floor', { n: s.stats.floors }), {
      fontSize: THEME.fontSize.small, color: THEME.colors.text,
    });

    panel(this, width / 2, 440, width - 80, 200, { fill: THEME.colors.panel });
    this.add.text(width / 2, 390, i18n.t('resultScore', { n: this.score }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.gold,
    }).setOrigin(0.5);
    this.memText = this.add.text(width / 2, 460, i18n.t('memoryGained', { n: this.memory }), {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5);
    if (isRecord) {
      this.add.text(width / 2, 512, i18n.t('newRecord'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
      }).setOrigin(0.5);
    }

    // Начисляем сразу: если игрок закроет вкладку на этом экране, память не должна
    // пропасть — это ощущается как обман и стоит игре возвратов.
    Progress.addMemory(this.memory);
    Progress.recordRun(s, this.score);
    claimUnlocks();
    AdGate.noteRunFinished();
    Analytics.event(isWin ? EVENTS.RUN_WIN : EVENTS.RUN_LOSE, { act: s.act, floor: s.stats.floors });
    Analytics.event(EVENTS.SESSION_END, { score: this.score });
    Platform.leaderboard.setScore(LEADERBOARD, this.score);
    Session.endRun();
    Progress.flush();

    this.buildButtons();
  }

  buildButtons() {
    const { width, height } = this.scale;

    if (AdGate.canReward('x2memory') && this.memory > 0) {
      Ads.hasRewarded().then((has) => {
        if (!has || this.doubled) return;
        this.adBtn = createButton(this, width / 2, height - 340, i18n.t('adDoubleMemory'), () => {
          if (this.doubled) return;
          AdGate.spendReward('x2memory');
          Analytics.event(EVENTS.AD_REWARD_SHOWN, { place: 'x2memory' });
          Ads.showRewarded({
            onRewarded: () => {
              this.doubled = true;
              Progress.addMemory(this.memory);
              this.memText.setText(i18n.t('memoryGained', { n: this.memory * 2 }));
              Sounds.coin();
              if (this.adBtn) this.adBtn.destroy();
              Progress.flush();
            },
          });
        }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText });
      });
    }

    createButton(this, width / 2, height - 230, i18n.t('retry'), () => Input.goTo(this, 'Heroes'), {
      color: THEME.colors.primary,
    });
    createButton(this, width / 2, height - 130, i18n.t('toMenu'), () => Input.goTo(this, 'Menu'), {
      color: THEME.colors.neutral, textColor: THEME.colors.text,
    });
  }
}
