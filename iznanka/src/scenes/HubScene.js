// Починок — деревенский хаб между забегами. Прокачка, выбор героя, ежедневный стрик,
// «Испытание дня». Сама ничего не считает — только читает/пишет через src/meta/progress.js.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { HEROES, HERO_ORDER } from '../data/heroes.js';
import { seedFromDate } from '../mechanics/dungeon/rng.js';
import {
  loadProgress, unlockHero, touchDailyStreak, dailyStreakReward, canClaimDailyBonus,
  claimDailyBonus, canPlayDailyTrial, todaySeed
} from '../meta/progress.js';
import { UpgradesOverlay } from '../ui/UpgradesOverlay.js';
import { AchievementsOverlay } from '../ui/AchievementsOverlay.js';
import { RecordsOverlay } from '../ui/RecordsOverlay.js';
import { createCurrencyLabel } from '../ui/currencyLabel.js';
import { Platform } from '../platform/index.js';

export class HubScene extends Phaser.Scene {
  constructor() { super('Hub'); }

  async create() {
    Input.setup(this);
    Analytics.event(EVENTS.HUB_OPENED);
    Platform.ads.showBanner(); // возвращаем баннер, если он был скрыт при входе в подземелье

    this.progress = await loadProgress();
    touchDailyStreak(this.progress);
    this.selectedHero = this.progress.heroesUnlocked.includes(this.progress.lastHero)
      ? this.progress.lastHero : 'bogatyr';

    const w = this.scale.width, h = this.scale.height;

    this.add.image(w / 2, h / 2, 'bg_hub').setDisplaySize(w, h).setAlpha(0.55);
    this.add.rectangle(w / 2, 145, w, 290, 0x0a0714, 0.55);

    this.add.text(w / 2, 60, i18n.t('hubTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Возврат на стартовый экран. Требование VK Mini Apps п.4.2.10: из ЛЮБОГО места игры
    // должна быть возможность вернуться в стартовое меню. До этого путь был односторонним:
    // Меню → Починок, и обратно только перезагрузкой страницы (найдено аудитом блока H
    // перед публикацией в VK 11.08). Угол левый верхний — не трогает плотную колонку
    // кнопок ниже и не попадает в зону нижнего sticky-баннера VK (п.5.1.5.3).
    this.menuBtn = createButton(this, 96, 60, i18n.t('backToMenu'), () => this.scene.start('Menu'),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });

    // Искры — постоянная валюта деревни, тёплая иконка (в отличие от холодного духа забега).
    this.sparksLabel = createCurrencyLabel(this, w / 2, 120, 'currency_sparks',
      { align: 'center', fontSize: THEME.fontSize.big, iconSize: 32 });
    this.bestDepthText = this.add.text(w / 2, 160, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim
    }).setOrigin(0.5);

    this.streakText = this.add.text(w / 2, 200, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim
    }).setOrigin(0.5);
    this.claimBtn = createButton(this, w / 2, 250, '', () => this.claimDaily(),
      { color: THEME.colors.accent, fontSize: THEME.fontSize.small });

    this.add.text(w / 2, 330, i18n.t('heroSelectTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text
    }).setOrigin(0.5);

    this.heroCards = HERO_ORDER.map((heroId, i) => this.buildHeroCard(heroId, w / 2 + (i - 1) * 220, 420));

    this.descendBtn = createButton(this, w / 2, 700, i18n.t('descendButton'), () => this.descend(),
      { fontSize: THEME.fontSize.normal });
    this.dailyBtn = createButton(this, w / 2, 780, '', () => this.startDaily(),
      { color: THEME.colors.accent, fontSize: THEME.fontSize.normal });
    this.dailyInfoText = this.add.text(w / 2, 830, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim
    }).setOrigin(0.5);

    this.upgradesBtn = createButton(this, w / 2, 920, i18n.t('upgradesButton'), () => this.upgrades.open(this.progress),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.normal });
    this.achievementsBtn = createButton(this, w / 2, 1000, i18n.t('achievementsButton'), () => this.achievements.open(this.progress),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.normal });
    this.recordsBtn = createButton(this, w / 2, 1080, i18n.t('recordsButton'), () => this.records.open({
        bestDepth: this.progress.bestDepth,
        todayDepth: this.progress.lastDailyDepth,
        streak: this.progress.streak
      }),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.normal });

    // Кнопка «Звук» убрана: в игре нет ни одного звукового ассета (SFX/музыка), тумблер
    // технически переключал game.sound.mute, но эффект был неотличим от «ничего не делает» —
    // находка аудита 04.08 (п.6.7, «нет бесполезных элементов управления»). Добавление
    // полноценного аудио — отдельная задача (генерация через ASSETGEN.md), не багфикс.

    this.upgrades = new UpgradesOverlay(this);
    this.achievements = new AchievementsOverlay(this);
    this.records = new RecordsOverlay(this);

    this.refresh();
  }

  buildHeroCard(heroId, x, y) {
    const def = HEROES[heroId];
    const unlocked = this.progress.heroesUnlocked.includes(heroId);
    const circle = this.add.circle(x, y, 60, unlocked ? THEME.colors.primary : THEME.colors.neutral);
    const portrait = this.add.image(x, y, 'hero_' + heroId);
    portrait.setScale(96 / Math.max(portrait.width, portrait.height));
    const name = this.add.text(x, y + 78, i18n.t('hero_' + heroId), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text, align: 'center'
    }).setOrigin(0.5);
    const actionBtn = createButton(this, x, y + 120,
      unlocked ? '' : i18n.t('heroLocked', { cost: def.unlockCost }),
      () => this.onHeroCardTap(heroId), { fontSize: '18px' });
    return { heroId, circle, portrait, name, actionBtn };
  }

  onHeroCardTap(heroId) {
    const unlocked = this.progress.heroesUnlocked.includes(heroId);
    if (unlocked) {
      this.selectedHero = heroId;
      Analytics.event(EVENTS.HERO_SELECTED, { heroId });
      this.refresh();
      return;
    }
    if (unlockHero(this.progress, heroId)) {
      Analytics.event(EVENTS.HERO_UNLOCKED, { heroId });
      this.selectedHero = heroId;
    }
    this.refresh();
  }

  claimDaily() {
    const gained = claimDailyBonus(this.progress);
    if (gained > 0) Analytics.event(EVENTS.DAILY_CLAIMED, { amount: gained });
    this.refresh();
  }

  descend() {
    this.scene.start('Game', { heroId: this.selectedHero, isDaily: false });
  }

  startDaily() {
    if (!canPlayDailyTrial(this.progress)) return;
    Analytics.event(EVENTS.DAILY_STARTED, { streak: this.progress.streak });
    this.scene.start('Game', { heroId: this.selectedHero, seed: seedFromDate(todaySeed()), isDaily: true });
  }

  refresh() {
    this.sparksLabel.setValue(this.progress.sparks);
    this.bestDepthText.setText(i18n.t('bestDepthLabel', { n: this.progress.bestDepth }));
    this.streakText.setText(i18n.t('dailyStreakLabel', { n: this.progress.streak }));

    const claimable = canClaimDailyBonus(this.progress);
    this.claimBtn.setLabel(claimable ? i18n.t('dailyClaimButton', { n: dailyStreakReward(this.progress) }) : i18n.t('dailyClaimed'));
    this.claimBtn.setAlpha(claimable ? 1 : 0.55);

    for (const card of this.heroCards) {
      const unlocked = this.progress.heroesUnlocked.includes(card.heroId);
      const selected = card.heroId === this.selectedHero;
      card.circle.fillColor = unlocked ? THEME.colors.primary : THEME.colors.neutral;
      card.circle.setStrokeStyle(selected ? 4 : 0, THEME.colors.accent);
      card.actionBtn.setLabel(unlocked
        ? (selected ? '✓' : i18n.t('heroChoose'))
        : i18n.t('heroLocked', { cost: HEROES[card.heroId].unlockCost }));
      card.actionBtn.setAlpha(unlocked || this.progress.sparks >= HEROES[card.heroId].unlockCost ? 1 : 0.55);
    }

    const canDaily = canPlayDailyTrial(this.progress);
    this.dailyBtn.setLabel(canDaily ? i18n.t('dailyButton') : i18n.t('dailyAlreadyPlayed'));
    this.dailyBtn.setAlpha(canDaily ? 1 : 0.55);
    this.dailyInfoText.setText(i18n.t('dailyBestToday', { n: this.progress.lastDailyDepth }));
  }
}
