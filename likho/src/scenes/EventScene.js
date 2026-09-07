// ВСТРЕЧА (событие). Текст, выбор, последствия.
//
// Последствия показываются ЯВНО отдельным экраном, а не молча применяются: «-6 к максимуму
// здоровья» игрок не замечает и считает игру сломанной. Строки последствий собираются из
// тех же операций, что их применили, — расходиться нечему.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, bodyText, panel } from '../ui/widgets.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { CATALOG } from '../data/catalog.js';

export class EventScene extends Phaser.Scene {
  constructor() { super('Event'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    this.run = Session.run;
    const pending = this.run.state.pending;
    if (!pending || pending.kind !== 'event') { this.scene.start('Map'); return; }

    this.eventId = pending.event;
    this.def = CATALOG.events[this.eventId];

    const artKey = 'ev_' + this.def.art;
    if (this.textures.exists(artKey)) {
      const bg = this.add.image(width / 2, height * 0.3, artKey);
      const k = Math.min(width / bg.width, (height * 0.42) / bg.height);
      bg.setScale(k);
    }
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum, 0.35).setDepth(-1);

    heading(this, width / 2, height * 0.52, i18n.t('ev_' + this.eventId));
    bodyText(this, width / 2, height * 0.6, i18n.t('ev_' + this.eventId + '_t'), {
      wrap: width - 90, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    });

    this.buildChoices();
  }

  buildChoices() {
    const { width, height } = this.scale;
    this.choiceLayer = this.add.container(0, 0);
    const start = height * 0.68;
    this.def.choices.forEach((ch, i) => {
      const enabled = this.run.canChoose(ch);
      const btn = createButton(this, width / 2, start + i * 94, i18n.t('ev_' + this.eventId + '_' + ch.id),
        enabled ? () => this.choose(ch) : null, {
          color: enabled ? THEME.colors.primary : THEME.colors.neutral,
          textColor: enabled ? THEME.colors.primaryText : THEME.colors.neutralText,
          fontSize: THEME.fontSize.small,
        });
      this.choiceLayer.add(btn);
    });
  }

  choose(ch) {
    const done = this.run.applyEventOutcome(ch.outcomes);
    // Та же причина, что у костра: без этого reload после выбора переоткрывает те же
    // кнопки и последствие (например, золото) применяется заново.
    this.run.clearPending();
    Sounds.cardPick();
    Session.saveRun();
    this.choiceLayer.destroy();
    this.showOutcome(done);
  }

  // Человеческая строка на каждое произошедшее последствие.
  lineFor(o) {
    switch (o.op) {
      case 'gold': return (o.value >= 0 ? '+' : '') + o.value + ' ' + i18n.t('gold');
      case 'heal': return '+' + o.value + ' ' + i18n.t('hp');
      case 'damage': return '-' + o.value + ' ' + i18n.t('hp');
      case 'maxHp': return (o.value >= 0 ? '+' : '') + o.value + ' ' + i18n.t('hp') + ' (max)';
      case 'curse': return '+ ' + i18n.t('card_' + o.card);
      case 'card': return '+ ' + i18n.t('card_' + o.card);
      case 'duplicate': return '+ ' + i18n.t('card_' + o.card);
      case 'relic': return '+ ' + i18n.t('relic_' + o.relic);
      case 'upgrade': return '✦ ' + i18n.t('card_' + o.card);
      case 'removeRandom': return '− ' + i18n.t('card_' + o.card);
      default: return '';
    }
  }

  showOutcome(done) {
    const { width, height } = this.scale;
    // «Пройти мимо»/«перейти самому» честно ничего не делает (см. events.js: у выбора без
    // цены и outcomes пустой) — но пустой экран без единой строки читается как «тап не
    // сработал», особенно после того, как игрок весь сеанс ловил реально сломанные кнопки.
    // Явное «Ничего не случилось» — подтверждение, что выбор принят, а не поломка.
    const lines = done.map((o) => this.lineFor(o)).filter(Boolean);
    if (!lines.length) lines.push(i18n.t('ev_nothing'));
    const y = height * 0.74;
    if (lines.length) {
      panel(this, width / 2, y, width - 80, 40 + lines.length * 38, { fill: THEME.colors.panel });
      lines.forEach((l, i) => {
        this.add.text(width / 2, y - (lines.length - 1) * 19 + i * 38, l, {
          fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.text,
        }).setOrigin(0.5);
      });
    }

    createButton(this, width / 2, height - 110, i18n.t('take'), () => {
      // Событие могло убить (плата здоровьем) — тогда это конец похода, а не переход.
      if (this.run.state.over) Input.goTo(this, 'Result');
      else Input.goTo(this, 'Map');
    }, { color: THEME.colors.primary });
  }
}
