// КОСТЁР. Одно действие за ночь: подлечиться или наточить карту.
// Выбор «здоровье сейчас против силы колоды потом» — один из двух главных решений жанра
// (второй — маршрут). Поэтому оба варианта намеренно ощутимы, а не символические.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, bodyText, toast, hpBar } from '../ui/widgets.js';
import { openDeckViewer } from '../ui/DeckViewer.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { AdGate } from '../core/ads.js';
import { Ads } from '../yandex/ads.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';

export class RestScene extends Phaser.Scene {
  constructor() { super('Rest'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    this.run = Session.run;
    this.done = false;

    if (this.textures.exists('bg_rest')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_rest');
      const k = Math.max(width / bg.width, height / bg.height);
      bg.setScale(k).setAlpha(0.75);
      this.add.rectangle(width / 2, height / 2, width, height, 0x0a0710, 0.35);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);
    }

    heading(this, width / 2, 140, i18n.t('restTitle'));
    bodyText(this, width / 2, 200, i18n.t('restHint'));

    const bar = hpBar(this, width / 2, 280, 420, 30, { fontSize: THEME.fontSize.small });
    bar.set(this.run.state.hp, this.run.state.maxHp, 0);
    this.bar = bar;

    const healAmount = this.run.restHealAmount();
    createButton(this, width / 2, height * 0.56, i18n.t('restHeal', { n: healAmount }), () => {
      this.act(() => { this.run.heal(healAmount); Sounds.heal(); });
    }, { color: THEME.colors.primary });

    const upgradable = this.run.upgradableCards();
    createButton(this, width / 2, height * 0.66, i18n.t('restUpgrade'), () => {
      if (!upgradable.length) { toast(this, i18n.t('upgraded')); return; }
      openDeckViewer(this, this.run.state.deck, {
        title: i18n.t('restUpgradeHint'),
        canPick: (c) => upgradable.some((u) => u.uid === c.uid),
        onPick: (c) => this.act(() => { this.run.upgradeCardInDeck(c.uid); Sounds.upgrade(); }),
      });
    }, { color: upgradable.length ? THEME.colors.primary : THEME.colors.neutral, textColor: THEME.colors.text });

    // «Выспаться» за рекламу: лечит вдвое больше. Кнопка рисуется только при реально
    // предзагруженной рекламе — иначе это обещание, которое игра не выполнит.
    if (AdGate.canReward('restHeal')) {
      Ads.hasRewarded().then((has) => {
        if (!has || this.done) return;
        const big = this.run.restHealAmountAd();
        createButton(this, width / 2, height * 0.76, i18n.t('restHealAd', { n: big }), () => {
          if (this.done) return;
          AdGate.spendReward('restHeal');
          Analytics.event(EVENTS.AD_REWARD_SHOWN, { place: 'restHeal' });
          Ads.showRewarded({
            onRewarded: () => this.act(() => { this.run.heal(big); Sounds.heal(); }),
          });
        }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText, fontSize: THEME.fontSize.small });
      });
    }
  }

  act(fn) {
    if (this.done) return;
    this.done = true;
    fn();
    // Снять pending ДО сейва — иначе reload сразу после лечения снова открывает костёр
    // с чистого листа (найдено живым игроком 22.08, разбор — в run.js/clearPending).
    this.run.clearPending();
    this.bar.set(this.run.state.hp, this.run.state.maxHp, 0);
    Session.saveRun();
    this.time.delayedCall(500, () => Input.goTo(this, 'Map'));
  }
}
