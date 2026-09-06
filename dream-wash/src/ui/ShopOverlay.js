// Оверлей магазина: три вкладки — апгрейды (тряпка/бригада/пушка/манёвр), награды
// (достижения) и точка (престиж + гемы за рекламу). Паттерн строки-каталога и вкладок —
// как в games/osushi-ozero/src/ui/ShopOverlay.js (тот же жанровый каркас, доказан на практике).
//
// api: {
//   getCoins(), getGems(), getReputation(), getWashedTotal(),
//   getLevels() -> { sponge, crew, turbo, speed },
//   getUpgradeCost(id), getUpgradeEffectNow(id), getUpgradeEffectNext(id),
//   onBuyUpgrade(id),
//   getBadges() -> string[] (id заработанных),
//   prestigeUnlockAt, reputationIncomePerStar,
//   canPrestige(), onPrestige(),
//   onWatchAdGems(), onWatchAdBoost(), boostRemainingSec(), rewardAdGems
// }
import { THEME } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { fmt } from './format.js';
import { UPGRADES, BADGES, ECONOMY, TIERS, WEEKLY } from '../data/balance.js';
import { Input } from '../core/input.js';

const UPGRADE_IDS = ['sponge', 'crew', 'turbo', 'speed'];

export class ShopOverlay {
  constructor(scene, api) {
    this.scene = scene;
    this.api = api;
    this.tab = 'upgrades';
    // Кнопки строятся ОДИН раз здесь, а не при каждом open() — панель просто прячется/
    // показывается. НО core/input.js closeLayer() физически УДАЛЯЕТ слой из стека
    // (splice), а не просто прячет: следующий openLayer с тем же ключом создаёт слой
    // ЗАНОВО ПУСТЫМ. Система рассчитана на модалки, которые пересобирают контент при
    // каждом открытии (см. GameScene.showModal) — наш персистентный оверлей под это не
    // подходит напрямую. Поэтому сами GameObject'ы кнопок строятся один раз (дёшево по
    // памяти), а их РЕГИСТРАЦИЯ в клавиатурной навигации переигрывается заново в open()
    // из списка _navItems, собранного при первой постройке через btn()-обёртку ниже.
    this._navItems = [];
    Input.openLayer(scene, 'shop');
    this.build();
    Input.closeLayer(scene, 'shop');
    this.root.setVisible(false);
    this.setInputEnabled(false);
  }

  // Обёртка над createButton: создаёт кнопку и запоминает (объект, обработчик) для
  // повторной регистрации в open() — сама кнопка (GameObject) переиспользуется.
  btn(x, y, label, onClick, opts) {
    const b = createButton(this.scene, x, y, label, onClick, opts);
    this._navItems.push({ obj: b, onSelect: onClick });
    return b;
  }

  build() {
    const s = this.scene;
    const { width, height } = s.scale;
    this.root = s.add.container(0, 0).setDepth(200).setScrollFactor(0);

    // Alpha почти непрозрачная: при 0.82 сквозь панель было видно HUD игры на той же
    // высоте (монеты/квест дублировались призрачным текстом позади «своих» — жалоба на
    // живом плейтесте прочиталась как «двоится»).
    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x0d1b2a, 0.97).setInteractive();
    this.root.add(bg);

    // Иконки валют картинкой, не текстовым символом (жалоба игрока: непонятно, что за
    // жёлтый кругляшок/ромбик). Два блока икона+число, symметрично от центра.
    this.coinsIcon = s.add.image(width / 2 - 95, 50, 'icon_coin');
    this.coinsIcon.setScale(30 / Math.max(this.coinsIcon.width, this.coinsIcon.height));
    this.root.add(this.coinsIcon);
    this.currencyCoinsText = s.add.text(width / 2 - 72, 50, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.gold
    }).setOrigin(0, 0.5);
    this.root.add(this.currencyCoinsText);

    this.gemsIcon = s.add.image(width / 2 + 35, 50, 'icon_gem');
    this.gemsIcon.setScale(30 / Math.max(this.gemsIcon.width, this.gemsIcon.height));
    this.root.add(this.gemsIcon);
    this.currencyGemsText = s.add.text(width / 2 + 58, 50, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#4dd0e1'
    }).setOrigin(0, 0.5);
    this.root.add(this.currencyGemsText);

    // Раскладка с запасом воздуха (было слишком тесно — «Тряпка» наезжала на вкладки,
    // жалоба игрока при живом плейтесте). TAB_Y ниже currencyText с полем, CONTENT_TOP —
    // ниже нижнего края кнопки вкладки (TAB_Y + её полувысота ~29) с явным зазором ~35px.
    const TAB_Y = 132;
    const CONTENT_TOP = 232;
    const ROW_GAP = 106;
    // BADGE_GAP уменьшен под 20 строк (было 16, +4 бейджа усиления 2026-07-31): при
    // старом шаге 72 последняя строка уезжала за нижний край (y=1600 при высоте канваса
    // 1280) — весь список наград был невидим. Формула: CONTENT_TOP + (BADGES.length-1)*GAP
    // должно оставлять зазор ~55-60px над кнопкой «Закрыть» (y = height-62 = 1218, с учётом
    // её половины высоты ~35px верхний край кнопки ≈1183). Панель строки пропорционально
    // уменьшена в buildBadgeRow (58 -> 38), чтобы соседние строки не перекрывались (46-38=8px
    // просвет между панелями).
    const BADGE_GAP = 46;

    const TAB_LABELS = {
      upgrades: 'tabUpgrades', badges: 'tabAchievements', collection: 'tabCollection',
      weekly: 'tabWeekly', location: 'tabDaily'
    };
    const tabW = width / 5;
    this.tabBtns = {};
    ['upgrades', 'badges', 'collection', 'weekly', 'location'].forEach((tab, i) => {
      const btn = this.btn(tabW * i + tabW / 2, TAB_Y, i18n.t(TAB_LABELS[tab]), () => this.setTab(tab), { fontSize: '20px' });
      this.root.add(btn);
      this.tabBtns[tab] = btn;
    });
    // Значок-точка на вкладке «Точка»: игрок уже открыл магазин (значок на кнопке «Апгрейды»
    // его сюда привёл), теперь указывает на нужную из пяти вкладок. Условие — hasLocationNews
    // в GameScene, здесь то же самое собрано из уже прокинутых в api полей.
    this.locationTabDot = s.add.circle(
      this.tabBtns.location.x + this.tabBtns.location.width / 2 - 4, TAB_Y - this.tabBtns.location.height / 2 + 4,
      7, 0xff5252
    ).setStrokeStyle(2, 0xffffff).setDepth(1);
    this.root.add(this.locationTabDot);

    this.upgradeRows = UPGRADE_IDS.map((id, i) => this.buildRow(CONTENT_TOP + i * ROW_GAP, {
      kind: 'upgrade', id,
      drawIcon: (g, x, y) => { g.fillStyle(THEME.colors.primary, 1).fillCircle(x, y, 26); }
    }));

    this.boostBtn = this.btn(width / 2, CONTENT_TOP + UPGRADE_IDS.length * ROW_GAP + 26, i18n.t('adBoostBtn'),
      () => this.api.onWatchAdBoost(), { color: THEME.colors.accent, fontSize: THEME.fontSize.tiny });
    this.root.add(this.boostBtn);

    this.badgeRows = BADGES.map((b, i) => this.buildBadgeRow(CONTENT_TOP + i * BADGE_GAP, b));

    this.collectionRows = TIERS.map((t, i) => this.buildCollectionRow(CONTENT_TOP + i * 92, t, i));

    this.weeklyHeaderText = s.add.text(width / 2, CONTENT_TOP, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text, align: 'center'
    }).setOrigin(0.5);
    this.root.add(this.weeklyHeaderText);
    this.weeklyRows = WEEKLY.milestones.map((m, i) => this.buildWeeklyRow(CONTENT_TOP + 56 + i * 78, m, i));

    this.prestigePanel = createPanel(s, width / 2, CONTENT_TOP + 90, width - 60, 240);
    this.root.add(this.prestigePanel);
    this.prestigeText = s.add.text(width / 2, CONTENT_TOP + 30, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: width - 110 }
    }).setOrigin(0.5);
    this.root.add(this.prestigeText);
    this.prestigeBtn = this.btn(width / 2, CONTENT_TOP + 160, '', () => this.doPrestige(), { fontSize: THEME.fontSize.small });
    this.root.add(this.prestigeBtn);

    this.adGemsBtn = this.btn(width / 2, CONTENT_TOP + 270, i18n.t('adGemsBtn', { n: ECONOMY.rewardAdGems }),
      () => this.api.onWatchAdGems(), { color: THEME.colors.accent, fontSize: THEME.fontSize.tiny });
    this.root.add(this.adGemsBtn);

    // Покупка 3-го поста мойки — на вкладке «Точка», рядом с престижем/гемами за рекламу.
    // Скрывается насовсем, когда куплены все посты (BAYS.maxCount) — покупать больше нечего.
    this.bayBtn = this.btn(width / 2, CONTENT_TOP + 380, '', () => this.buyBay(), { fontSize: THEME.fontSize.tiny });
    this.root.add(this.bayBtn);

    this.closeBtn = this.btn(width / 2, height - 62, i18n.t('close'), () => this.close(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.closeBtn);
  }

  buildRow(y, item) {
    const s = this.scene;
    const { width } = s.scale;
    const parts = [];
    const panel = createPanel(s, width / 2, y, width - 60, 90);
    this.root.add(panel); parts.push(panel);

    let icon;
    if (s.textures.exists('icon_' + item.id)) {
      icon = s.add.image(84, y, 'icon_' + item.id);
      icon.setScale(64 / Math.max(icon.width, icon.height));
    } else {
      icon = s.add.graphics();
      item.drawIcon(icon, 84, y);
    }
    this.root.add(icon); parts.push(icon);

    const name = s.add.text(134, y - 30, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text, fontStyle: 'bold'
    });
    this.root.add(name); parts.push(name);
    const desc = s.add.text(134, y - 2, '', {
      fontFamily: THEME.fontFamily, fontSize: '19px', color: THEME.colors.textDim, wordWrap: { width: 360 }
    });
    this.root.add(desc); parts.push(desc);

    const btn = this.btn(width - 130, y, '', () => this.buyUpgrade(item.id), { fontSize: THEME.fontSize.tiny });
    this.root.add(btn); parts.push(btn);

    return { item, name, desc, btn, parts };
  }

  buildBadgeRow(y, badge) {
    const s = this.scene;
    const { width } = s.scale;
    const parts = [];
    const panel = createPanel(s, width / 2, y, width - 60, 38);
    this.root.add(panel); parts.push(panel);

    const icon = s.add.image(66, y, 'icon_lock');
    icon.setScale(26 / Math.max(icon.width, icon.height));
    this.root.add(icon); parts.push(icon);

    const name = s.add.text(108, y, i18n.t('badge_' + badge.id), {
      fontFamily: THEME.fontFamily, fontSize: '20px', color: THEME.colors.textDim
    }).setOrigin(0, 0.5);
    this.root.add(name); parts.push(name);

    const reward = s.add.text(width - 90, y, '+' + badge.gems + ' ◆', {
      fontFamily: THEME.fontFamily, fontSize: '20px', color: THEME.colors.textDim
    }).setOrigin(0.5);
    this.root.add(reward); parts.push(reward);

    return { badge, icon, name, reward, parts };
  }

  // Строка коллекции: один тир машин, иконка первого варианта, прогресс/статус, кнопка
  // покупки недостающего цвета за гемы (только у тиров с несколькими вариантами окраски).
  buildCollectionRow(y, tier, tierIndex) {
    const s = this.scene;
    const { width } = s.scale;
    const parts = [];
    const panel = createPanel(s, width / 2, y, width - 60, 82);
    this.root.add(panel); parts.push(panel);

    const iconKey = 'car_clean_' + tier.id + (tier.variants ? tier.variants[0] : '');
    let icon;
    if (s.textures.exists(iconKey)) {
      icon = s.add.image(84, y, iconKey);
      icon.setScale(66 / Math.max(icon.width, icon.height));
    } else {
      icon = s.add.graphics();
    }
    this.root.add(icon); parts.push(icon);

    const name = s.add.text(134, y - 20, i18n.t('car_' + tier.id), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text, fontStyle: 'bold'
    });
    this.root.add(name); parts.push(name);
    const status = s.add.text(134, y + 12, '', {
      fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.textDim
    });
    this.root.add(status); parts.push(status);

    const multi = (tier.variants || ['']).length > 1;
    const btn = multi
      ? this.btn(width - 130, y, '', () => this.buySkin(tier.id), { fontSize: '17px' })
      : null;
    if (btn) { this.root.add(btn); parts.push(btn); }

    return { tier, tierIndex, name, status, btn, parts };
  }

  // Строка недельного трека: один этап (25/50/75/100%). Иконка замок/кубок переиспользует
  // текстуры бейджей (icon_lock/icon_trophy) — без нового арта под этот UI-элемент.
  buildWeeklyRow(y, milestone, index) {
    const s = this.scene;
    const { width } = s.scale;
    const parts = [];
    const panel = createPanel(s, width / 2, y, width - 60, 66);
    this.root.add(panel); parts.push(panel);

    const icon = s.add.image(66, y, 'icon_lock');
    icon.setScale(30 / Math.max(icon.width, icon.height));
    this.root.add(icon); parts.push(icon);

    // Награда этапа не показывалась вовсе (жалоба финального ревью — «Milestone 25% / 75
    // left», непонятно за что). Формат суффикса — как в тосте GameScene.checkWeeklyMilestones:
    // только ненулевые части валют.
    const reward = (milestone.coins ? '  +' + milestone.coins + ' ●' : '') +
      (milestone.gems ? '  +' + milestone.gems + ' ◆' : '');
    const name = s.add.text(108, y - 12, i18n.t('weeklyMilestone', { pct: milestone.pct }) + reward, {
      fontFamily: THEME.fontFamily, fontSize: '20px', color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.root.add(name); parts.push(name);

    const status = s.add.text(108, y + 14, '', {
      fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.textDim
    }).setOrigin(0, 0.5);
    this.root.add(status); parts.push(status);

    return { milestone, index, icon, name, status, parts };
  }

  buyUpgrade(id) {
    const cost = this.api.getUpgradeCost(id);
    if (this.api.getCoins() >= cost) {
      this.api.onBuyUpgrade(id);
      this.refresh();
    }
  }

  doPrestige() {
    if (this.api.canPrestige()) {
      this.api.onPrestige();
      this.refresh();
    }
  }

  buySkin(tierId) {
    this.api.onBuySkin(tierId);
    this.refresh();
  }

  buyBay() {
    this.api.onBuyBay();
    this.refresh();
  }

  setTab(tab) {
    this.tab = tab;
    this.refresh();
  }

  open() {
    this.root.setVisible(true);
    this.setInputEnabled(true);
    // Свежий (пустой) слой — прошлый closeLayer() его уничтожил (см. коммент в
    // конструкторе). Кнопки не пересоздаём, только переигрываем их регистрацию.
    Input.openLayer(this.scene, 'shop');
    for (const it of this._navItems) Input.register(this.scene, it.obj, it.onSelect, {});
    this.refresh();
  }
  close() {
    Input.closeLayer(this.scene, 'shop');
    this.root.setVisible(false);
    this.setInputEnabled(false);
    if (this.onClose) this.onClose();
  }
  get visible() { return this.root.visible; }

  setInputEnabled(v) {
    this.root.iterate((child) => { if (child.input) child.input.enabled = v; });
    if (v) this.applyTabVisibility();
  }

  applyTabVisibility() {
    const show = (rows, on) => rows.forEach((r) => r.parts.forEach((p) => {
      p.setVisible(on);
      if (p.input) p.input.enabled = on && this.root.visible;
    }));
    show(this.upgradeRows, this.tab === 'upgrades');
    this.boostBtn.setVisible(this.tab === 'upgrades');
    if (this.boostBtn.input) this.boostBtn.input.enabled = this.tab === 'upgrades' && this.root.visible;
    show(this.badgeRows, this.tab === 'badges');
    show(this.collectionRows, this.tab === 'collection');
    show(this.weeklyRows, this.tab === 'weekly');
    this.weeklyHeaderText.setVisible(this.tab === 'weekly');
    const showLoc = this.tab === 'location';
    [this.prestigePanel, this.prestigeText, this.prestigeBtn, this.adGemsBtn, this.bayBtn].forEach((o) => {
      o.setVisible(showLoc);
      if (o.input) o.input.enabled = showLoc && this.root.visible;
    });
  }

  refresh() {
    if (!this.root.visible) return;
    this.currencyCoinsText.setText(fmt(this.api.getCoins()));
    this.currencyGemsText.setText(fmt(this.api.getGems()));
    for (const tab in this.tabBtns) this.tabBtns[tab].setAlpha(this.tab === tab ? 1 : 0.55);
    this.applyTabVisibility();
    this.locationTabDot.setVisible(
      this.api.canPrestige() || (this.api.getBaysOwned() < this.api.bayMaxCount && this.api.getGems() >= this.api.thirdBayCost)
    );

    const levels = this.api.getLevels();
    for (const row of this.upgradeRows) {
      const id = row.item.id;
      const level = levels[id];
      const cost = this.api.getUpgradeCost(id);
      row.name.setText(i18n.t('upg_' + id) + '  ' + i18n.t('level', { n: level }));
      row.desc.setText(i18n.t('upg_' + id + '_desc', { n: this.api.getUpgradeEffectNext(id) }));
      row.btn.setLabel(i18n.t('buyFor', { n: fmt(cost) }));
      row.btn.setAlpha(this.api.getCoins() >= cost ? 1 : 0.6);
    }

    const remain = this.api.boostRemainingSec();
    this.boostBtn.setLabel(remain > 0 ? i18n.t('adBoostActive', { sec: Math.ceil(remain) }) : i18n.t('adBoostBtn'));

    const earned = this.api.getBadges();
    for (const row of this.badgeRows) {
      const got = earned.includes(row.badge.id);
      row.icon.setTexture(got ? 'icon_trophy' : 'icon_lock');
      row.name.setColor(got ? THEME.colors.text : THEME.colors.textDim);
      row.reward.setColor(got ? THEME.colors.gold : THEME.colors.textDim);
    }

    const collection = this.api.getCollection();
    for (const row of this.collectionRows) {
      const arr = collection[row.tier.id] || [];
      const owned = arr.filter(Boolean).length;
      const total = arr.length;
      const unlocked = this.api.isTierUnlocked(row.tierIndex);
      if (!unlocked) {
        row.status.setText(i18n.t('collectionLocked', { n: row.tier.unlockAt }));
      } else if (owned >= total) {
        row.status.setText(i18n.t('collectionDone'));
      } else {
        row.status.setText(i18n.t('collectionProgress', { n: owned, m: total }));
      }
      if (row.btn) {
        const done = owned >= total;
        const cost = this.api.skinCost + owned * 4;
        const showBtn = this.tab === 'collection' && unlocked && !done;
        row.btn.setVisible(showBtn);
        if (row.btn.input) row.btn.input.enabled = showBtn && this.root.visible;
        if (!done) {
          row.btn.setLabel(i18n.t('collectionBuyBtn', { n: cost }));
          row.btn.setAlpha(this.api.getGems() >= cost ? 1 : 0.6);
        }
      }
    }

    const weeklyWashed = this.api.getWeeklyWashed();
    const weeklyClaimed = this.api.getWeeklyClaimed();
    this.weeklyHeaderText.setText(i18n.t('weeklyHeader', { n: Math.min(weeklyWashed, WEEKLY.goal), m: WEEKLY.goal }));
    for (const row of this.weeklyRows) {
      const threshold = Math.ceil(WEEKLY.goal * row.milestone.pct / 100);
      const done = !!weeklyClaimed[row.index];
      row.icon.setTexture(done ? 'icon_trophy' : 'icon_lock');
      row.status.setText(done ? i18n.t('weeklyDone') : i18n.t('weeklyLeft', { n: Math.max(0, threshold - weeklyWashed) }));
    }

    const washed = this.api.getWashedTotal();
    const rep = this.api.getReputation();
    const pct = Math.round(this.api.reputationIncomePerStar * 100);
    if (this.api.canPrestige()) {
      this.prestigeText.setText(i18n.t('prestigeDesc', { p: pct, rep }));
      this.prestigeBtn.setLabel(i18n.t('prestigeBtn'));
      this.prestigeBtn.setAlpha(1);
    } else {
      const left = Math.max(0, this.api.prestigeUnlockAt - washed);
      this.prestigeText.setText(i18n.t('prestigeLocked', { n: left }));
      this.prestigeBtn.setLabel(i18n.t('prestigeBtn'));
      this.prestigeBtn.setAlpha(0.5);
    }

    // Куплены все посты (BAYS.maxCount) — кнопку прячем насовсем, покупать больше нечего.
    const baysOwned = this.api.getBaysOwned();
    if (baysOwned >= this.api.bayMaxCount) {
      this.bayBtn.setVisible(false);
      if (this.bayBtn.input) this.bayBtn.input.enabled = false;
    } else {
      const showBay = this.tab === 'location';
      this.bayBtn.setVisible(showBay);
      if (this.bayBtn.input) this.bayBtn.input.enabled = showBay && this.root.visible;
      this.bayBtn.setLabel(i18n.t('buyBayBtn', { n: this.api.thirdBayCost }));
      this.bayBtn.setAlpha(this.api.getGems() >= this.api.thirdBayCost ? 1 : 0.6);
    }
  }
}
