// Menu: главное меню. Логотип, рекорд, кристаллы, кнопки Играть/Лаборатория/Как играть/Звук.
// Лаборатория — панель постоянных мета-апгрейдов за кристаллы (удержание D1/D7).
import { THEME } from '../ui/theme.js';
import { BALANCE } from '../data/balance.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Sounds } from '../core/sounds.js';
import { Input } from '../core/input.js';
import { Save } from '../yandex/save.js';
import { RunSave } from '../yandex/runSave.js';
import { Ads } from '../yandex/ads.js';
import { AdGate } from '../core/adGate.js';
import { META_UPGRADES, metaCost } from '../data/meta.js';
import { SHIPS, shipUnlocked } from '../data/ships.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { achievementProgress } from '../meta/achievements.js';
import { todayKey, dailyState, claimDaily } from '../meta/daily.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { createButton } from '../ui/Button.js';
import { fitIcon } from '../ui/icon.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);

    // Не больше ОДНОЙ модалки одновременно: без этого «Лаборатория» и «Ангар» могли
    // повиснуть разом, их заголовки визуально накладывались друг на друга — баг с
    // реального скриншота владельца. Обе панели используют _closeAnyModal/_registerModal.
    this._activeModalClose = null;
    this._menuButtonsList = [];

    // Sticky-баннер: постоянный доход в спокойных экранах. В бою он скрывается (GameScene),
    // чтобы не отъедать низ портретного поля, где живёт джойстик.
    Ads.showBanner();

    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height);
    const vg = this.add.graphics();
    vg.fillGradientStyle(0x000000, 0x000000, 0x05060f, 0x05060f, 0.35);
    vg.fillRect(0, 0, width, height);

    this._refreshMeta();

    // Логотип (если есть), иначе текстовый заголовок.
    if (this.textures.exists('logo')) {
      const logo = this.add.image(width / 2, height * 0.22, 'logo').setDisplaySize(width * 0.7, width * 0.7 * 0.3);
      this.tweens.add({ targets: logo, y: logo.y + 8, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    } else {
      this.add.text(width / 2, height * 0.22, i18n.t('title'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: THEME.colors.primaryText,
        fontStyle: 'bold'
      }).setOrigin(0.5).setStroke(THEME.textStroke.color, 6);
    }

    // Рекорд и кристаллы.
    this.bestTxt = this.add.text(width / 2, height * 0.38, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5).setStroke(THEME.textStroke.color, 4);
    this.crystalsTxt = this.add.text(width / 2, height * 0.38 + 46, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.xpText, fontStyle: 'bold'
    }).setOrigin(0.5).setStroke(THEME.textStroke.color, 3);
    this._updateMetaText();

    // Кнопки. Между «Играть» и «Лабораторией» зарезервирована строка под стартовый набор:
    // место держится ВСЕГДА, даже когда кнопки нет (лимит выбран или ролик не предзагружен) —
    // иначе раскладка прыгала бы между заходами в меню.
    const btnX = width / 2;
    let by = height * 0.52;

    // «Продолжить» — только если есть чекпоинт прерванного забега (спека:
    // docs/superpowers/specs/2026-08-22-run-save-design.md). Без чекпоинта раскладка
    // НИЧЕМ не отличается от прежней (та же «Играть» на том же месте) — новый блок
    // не трогает уже выверенные отступы ниже, только сдвигает старт координаты `by`.
    const resumeInfo = RunSave.load();
    let playBtn, startOverBtn;
    if (resumeInfo) {
      playBtn = createButton(this, btnX, by, i18n.t('continueRun', { wave: resumeInfo.waveNum }), () => {
        Sounds.click();
        this.scene.start('Game', { resume: true });
      }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText });
      by += 60;
      startOverBtn = createButton(this, btnX, by, i18n.t('startOver'), () => {
        Sounds.click();
        this._commitAbandonedRun(resumeInfo);
        this.scene.start('Game', { startKit: !!this._startKit });
      }, { color: THEME.colors.neutral, textColor: THEME.colors.text,
           paddingX: 20, paddingY: 10, fontSize: THEME.fontSize.small });
      by += 76;
    } else {
      playBtn = createButton(this, btnX, by, i18n.t('play'), () => {
        Sounds.click();
        this.scene.start('Game', { startKit: !!this._startKit });
      });
      by += 73;
    }
    const kitY = by;      // строка стартового набора (мелкая кнопка, 24px + padding 10)
    // 113, а не 76: под кнопкой ещё строка описания бонуса (+25 к кнопке, +20 к тексту,
    // высоты вплотную) — при 76 текст пересекался с кнопкой набора на 1px сверху и
    // с «Лабораторией» на 3.5px снизу (замер object.height живых объектов в браузере,
    // не на глаз — прошлая раскладка казалась нормальной на скриншоте, а на деле их
    // ничего не разделяло). 113 даёт по 16px воздуха с обеих сторон описания.
    by += 113;
    const labBtn = createButton(this, btnX, by, i18n.t('lab'), () => { Sounds.click(); this._openLab(); },
      { color: THEME.colors.neutral, textColor: THEME.colors.text });
    // 88, а не 80: при высоте кнопки 75 шаг 80 оставлял между «Лабораторией» и «Как играть»
    // 5 px — кнопки читались слипшимися (замер object.height в браузере, не на глаз).
    // Ангар и достижения — в один ряд мелкими кнопками: столбик из шести штук не влезает
    // в портретный экран, а прятать их в подменю значит спрятать причину возвращаться.
    by += 84;
    const rowY = by;
    const shipsBtn = createButton(this, btnX - 96, rowY, i18n.t('ships'), () => { Sounds.click(); this._openShips(); },
      { color: THEME.colors.neutral, textColor: THEME.colors.text,
        paddingX: 20, paddingY: 10, fontSize: THEME.fontSize.small });
    const achBtn = createButton(this, btnX + 96, rowY, i18n.t('achTitle'), () => { Sounds.click(); this._openAchievements(); },
      { color: THEME.colors.neutral, textColor: THEME.colors.text,
        paddingX: 20, paddingY: 10, fontSize: THEME.fontSize.small });

    by += 76;
    const howToBtn = createButton(this, btnX, by, i18n.t('howTo'), () => { Sounds.click(); this._openHowTo(); },
      { color: THEME.colors.neutral, textColor: THEME.colors.text,
        paddingX: 26, paddingY: 12, fontSize: THEME.fontSize.small });

    // Стартовый набор за просмотр. Флаг живёт в поле СЦЕНЫ, а не в сейве: набор действует
    // на один забег, и после смерти игрок возвращается в свежесозданное меню без него.
    this._startKit = false;
    if (AdGate.canReward('startKit')) {
      Ads.hasRewarded().then((ready) => {
        if (!ready || !this.scene.isActive()) return;
        const kit = createButton(this, btnX, kitY, i18n.t('startKit'), () => {
          kit.disableInteractive();
          Analytics.event(EVENTS.AD_REWARD_SHOWN, { point: 'startKit' });
          let paid = false;
          Ads.showRewarded({
            onRewarded: () => {
              paid = true;
              this._startKit = true;
              AdGate.spendReward('startKit');
              kit.setLabel(i18n.t('startKitOn'));
              kit.setBgColor(THEME.colors.success);
              kitDesc.setColor(THEME.colors.successText);
            },
            onClose: () => {
              if (paid) return;
              Analytics.event(EVENTS.AD_REWARD_DECLINED, { point: 'startKit' });
              if (kit.active) kit.setInteractive({ useHandCursor: true });
            }
          });
        }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText,
             paddingX: 22, paddingY: 10, fontSize: THEME.fontSize.small });
        // Обязательное требование модерации (YANDEX-MODERATION.md): у вознаграждаемой рекламы
        // должна быть ЧЁТКО обозначена награда. Раньше кнопка называлась просто «Стартовый
        // набор» — ни до, ни после просмотра нигде не было сказано, что именно даёт набор
        // (+25% урона, +25 HP), только смена подписи на «Набор активен» без цифр (жалоба
        // игрока: «посмотрел рекламу — тот же экран без объяснения, что получил»).
        // Цифры берутся из BALANCE.rewards, а не дублируются вручную — не разойдутся с балансом.
        const kitDmgPct = Math.round((BALANCE.rewards.startKitDamageMul - 1) * 100);
        const kitDesc = this.add.text(btnX, kitY + 49, i18n.t('startKitDesc', {
          dmg: kitDmgPct, hp: BALANCE.rewards.startKitBonusHp
        }), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim
        }).setOrigin(0.5);
        // Родилась ПОЗЖЕ остальных кнопок (ответ hasRewarded асинхронный) — если модалка
        // уже открыта к этому моменту, кнопка обязана появиться заблокированной.
        this._menuButtonsList.push(kit);
        if (this._activeModalClose) kit.disableInteractive();
      });
    }

    // Кнопка звука внизу.
    const muteLabel = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    this.muteBtn = createButton(this, width / 2, height - 70, muteLabel(), () => {
      Audio.toggleMute();
      this.muteBtn.setLabel(muteLabel());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, paddingX: 26, paddingY: 12 });

    // Кнопки, блокируемые на время открытой модальной панели: без этого клик проходил
    // СКВОЗЬ оверлей и открывал вторую панель поверх первой — их заголовки накладывались
    // друг на друга (ровно баг с реального скриншота владельца).
    this._menuButtonsList.push(playBtn, labBtn, shipsBtn, achBtn, howToBtn, this.muteBtn);
    if (startOverBtn) this._menuButtonsList.push(startOverBtn);

    // Ежедневный груз показываем САМ, последним — поверх уже собранного меню.
    this._showDailyIfAvailable();
  }

  // Не больше ОДНОЙ модальной панели одновременно. Вызывать ПЕРВОЙ строкой в каждом _open*().
  _closeAnyModal() {
    if (!this._activeModalClose) return;
    const prev = this._activeModalClose;
    this._activeModalClose = null;
    prev();
  }

  // Зарегистрировать только что открытую панель и заблокировать фоновые кнопки меню —
  // основная защита: даже если клик всё же проходит сквозь оверлей (как в баге со
  // скриншота), кнопкам под ним просто нечем ответить.
  _registerModal(closeFn) {
    this._activeModalClose = closeFn;
    this._menuButtonsList.forEach((b) => { if (b && b.active) b.disableInteractive(); });
  }

  // Снять регистрацию и вернуть фоновым кнопкам кликабельность. Вызывать ВНУТРИ close().
  _unregisterModal() {
    this._activeModalClose = null;
    this._menuButtonsList.forEach((b) => { if (b && b.active) b.setInteractive({ useHandCursor: true }); });
  }

  _refreshMeta() {
    const m = (Save.cache && Save.cache.meta) || {};
    // Гарантируем структуру: сейв мог быть сохранён до появления любого из этих полей.
    if (typeof m.crystals !== 'number') m.crystals = 0;
    if (typeof m.bestScore !== 'number') m.bestScore = 0;
    if (!m.upgrades || typeof m.upgrades !== 'object') m.upgrades = {};
    if (!m.achievements || typeof m.achievements !== 'object') m.achievements = {};
    if (!m.ships || typeof m.ships !== 'object') m.ships = {};
    if (!m.daily || typeof m.daily !== 'object') {
      m.daily = { streak: 0, lastBonusDate: null, maxSeenDate: null };
    }
    if (!m.selectedShip) m.selectedShip = 'scout';
    this.meta = m;
  }

  // «Начать заново» поверх чекпоинта прерванного забега: прогресс не выбрасывается молча —
  // кристаллы уже пройденных волн зачисляются в мету, как в games/rubezh (спека:
  // docs/superpowers/specs/2026-08-22-run-save-design.md).
  _commitAbandonedRun(snap) {
    const meta = (Save.cache && Save.cache.meta) || {};
    meta.crystals = (meta.crystals || 0) + (snap.crystalsRun || 0);
    Save.update({ meta });
    RunSave.clear();
  }

  // ЕЖЕДНЕВНЫЙ ГРУЗ. Показывается САМ при входе в меню, если сегодня ещё не получен:
  // награда, за которой надо охотиться по кнопке, работает заметно хуже.
  _showDailyIfAvailable() {
    this._closeAnyModal();
    const st = dailyState(this.meta.daily, todayKey(new Date()));
    if (!st.available) return;

    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const LAYER = 'daily';
    const panelW = width - 80, panelH = 420;
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.8).setDepth(300);
    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);
    panel.lineStyle(3, THEME.colors.accent, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);

    const title = this.add.text(cx, cy - panelH / 2 + 50, i18n.t('dailyTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
      color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302).setStroke(THEME.textStroke.color, 4);
    const streak = this.add.text(cx, cy - panelH / 2 + 110, i18n.t('dailyStreak', { n: st.nextStreak }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text
    }).setOrigin(0.5).setDepth(302);
    const icon = this.add.image(cx, cy - 20, 'xp').setDisplaySize(96, 96).setDepth(302);

    Input.openLayer(this, LAYER);
    const objs = [overlay, panel, title, streak, icon];
    const close = () => {
      Input.closeLayer(this, LAYER);
      objs.forEach((o) => o.destroy());
      buttons.forEach((b) => b.destroy());
      this._updateMetaText();
      Save.update({ meta: this.meta });
      this._unregisterModal();
    };
    this._registerModal(close);

    const grant = (mult) => {
      const got = claimDaily(this.meta.daily, todayKey(new Date()));
      if (!got) { close(); return; }
      this.meta.crystals = (this.meta.crystals || 0) + got.reward * mult;
      Analytics.event(EVENTS.CRYSTALS_EARNED, { n: got.reward * mult, source: 'daily' });
      Sounds.buy();
      close();
    };

    const buttons = [];
    const claimBtn = createButton(this, cx, cy + 80, i18n.t('dailyClaim', { n: st.reward }),
      () => grant(1), { color: THEME.colors.primary, layer: LAYER });
    claimBtn.setDepth(303);
    buttons.push(claimBtn);

    // Удвоение за просмотр — точка, где реклама даёт очевидную ценность.
    if (AdGate.canReward('x2crystals')) {
      Ads.hasRewarded().then((ready) => {
        if (!ready || !this.scene.isActive() || !claimBtn.active) return;
        const dbl = createButton(this, cx, cy + 160, i18n.t('dailyDouble'), () => {
          dbl.disableInteractive();
          Analytics.event(EVENTS.AD_REWARD_SHOWN, { point: 'x2crystals' });
          let paid = false;
          Ads.showRewarded({
            onRewarded: () => { paid = true; AdGate.spendReward('x2crystals'); grant(2); },
            onClose: () => {
              if (paid) return;
              Analytics.event(EVENTS.AD_REWARD_DECLINED, { point: 'x2crystals' });
              if (dbl.active) dbl.setInteractive({ useHandCursor: true });
            }
          });
        }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText, layer: LAYER,
             paddingX: 22, paddingY: 10, fontSize: THEME.fontSize.small });
        dbl.setDepth(303);
        buttons.push(dbl);
      });
    }
  }

  _updateMetaText() {
    this._refreshMeta();
    this.bestTxt.setText(i18n.t('menuBest', { n: this.meta.bestScore || 0 }));
    this.crystalsTxt.setText(i18n.t('menuCrystals', { n: this.meta.crystals || 0 }));
  }

  // ── Лаборатория: панель постоянных апгрейдов ──
  _openLab() {
    this._closeAnyModal();
    Analytics.event(EVENTS.LAB_OPENED);
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(300);
    const panelW = width - 40, panelH = height - 80;
    const cx = width / 2, cy = height / 2;
    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);
    panel.lineStyle(3, THEME.colors.xp, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);

    this.add.text(cx, cy - panelH / 2 + 40, i18n.t('meta_title'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.xpText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302).setStroke(THEME.textStroke.color, 4);

    const crystalsTop = this.add.text(cx, cy - panelH / 2 + 86, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302).setStroke(THEME.textStroke.color, 3);

    const LAYER = 'lab';
    Input.openLayer(this, LAYER);

    // Список апгрейдов с прокруткой по клику. Экран высокий — помещается 6 штук.
    const itemH = 110;
    const listTop = cy - panelH / 2 + 130;
    const cards = [];
    META_UPGRADES.forEach((def, i) => {
      const card = this._makeMetaCard(def, cx, listTop + i * itemH, panelW - 40, itemH - 10, LAYER,
        crystalsTop, cards);
      cards.push(card);
    });

    const refresh = () => {
      crystalsTop.setText(i18n.t('meta_crystals', { n: this.meta.crystals || 0 }));
      cards.forEach((c) => c.refresh());
    };
    refresh();

    // Кнопка закрытия.
    let closeBtn;
    const close = () => {
      Input.closeLayer(this, LAYER);
      [overlay, panel, crystalsTop].forEach((o) => o.destroy());
      cards.forEach((c) => c.destroy());
      closeBtn.destroy();
      this._updateMetaText();
      Save.update({ meta: this.meta });
      this._unregisterModal();
    };
    closeBtn = createButton(this, cx, cy + panelH / 2 - 50, i18n.t('close'), close,
      { color: THEME.colors.neutral, textColor: THEME.colors.text, layer: LAYER });
    closeBtn.setDepth(303);
    this._registerModal(close);
  }

  _makeMetaCard(def, x, y, w, h, layer, crystalsTxt, allCards) {
    const g = this.add.graphics().setDepth(302);
    const container = this.add.container(x, y).setDepth(303);

    const refresh = () => {
      g.clear();
      const lvl = this.meta.upgrades[def.id] || 0;
      const maxed = lvl >= def.maxLevel;
      const cost = metaCost(def, lvl);
      const canBuy = !maxed && this.meta.crystals >= cost;
      const border = maxed ? THEME.colors.success : (canBuy ? THEME.colors.primary : THEME.colors.neutral);

      g.fillStyle(0x0a1024, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);
      g.lineStyle(2, border, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);

      container.removeAll(true);
      const icon = fitIcon(this.add.image(-w / 2 + 50, 0, def.icon), 64);
      const name = this.add.text(-w / 2 + 100, -22, i18n.t(def.name), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text, fontStyle: 'bold'
      });
      const desc = this.add.text(-w / 2 + 100, 8, i18n.t(def.desc), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
        wordWrap: { width: w - 260 }
      });
      const lvlTxt = this.add.text(w / 2 - 30, -22, i18n.t('meta_level', { n: lvl, max: def.maxLevel }), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.xpText, fontStyle: 'bold'
      }).setOrigin(1, 0);
      const costTxt = this.add.text(w / 2 - 30, 6,
        maxed ? i18n.t('meta_maxed') : i18n.t('meta_cost', { n: cost }), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny,
          color: maxed ? THEME.colors.successText : (canBuy ? THEME.colors.accentText : THEME.colors.dangerText),
          fontStyle: 'bold'
        }).setOrigin(1, 0);
      container.add([icon, name, desc, lvlTxt, costTxt]);

      this._canBuy = !maxed && this.meta.crystals >= cost;
      this._cost = cost;
      this._maxed = maxed;
    };

    const tryBuy = () => {
      refresh();
      if (this._maxed) return;
      if (this.meta.crystals < this._cost) { Sounds.hurt(); return; }
      this.meta.crystals -= this._cost;
      this.meta.upgrades[def.id] = (this.meta.upgrades[def.id] || 0) + 1;
      Analytics.event(EVENTS.META_BOUGHT, { id: def.id });
      Sounds.buy();
      Save.update({ meta: this.meta });
      allCards.forEach((c) => c.refresh());
      crystalsTxt.setText(i18n.t('meta_crystals', { n: this.meta.crystals }));
    };

    container.setSize(w, h);
    // setInteractive без явного hitArea: Phaser берёт размер из setSize (как в ui/Button.js,
    // проверенный путь). Контейнер центрирован (origin 0.5), hitArea автоматически по размеру.
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => container.setScale(1.02));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerup', () => tryBuy());
    Input.register(this, container, tryBuy, { layer });

    return {
      container, g, refresh,
      destroy() { this.container.destroy(); this.g.destroy(); }
    };
  }

  // ── Ангар: выбор корабля ──
  // Корабль задаёт СТАРТОВОЕ ОРУЖИЕ, то есть стиль всего забега. Закрытые показываем
  // вместе с условием: игрок должен видеть, за чем возвращаться, а не гадать.
  _openShips() {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const LAYER = 'ships';
    const rows = SHIPS.map((def) => {
      const unlocked = shipUnlocked(def, this.meta);
      const ach = ACHIEVEMENTS.find((a) => a.ship === def.id);
      return {
        icon: def.icon,
        title: i18n.t(def.name),
        sub: unlocked ? i18n.t(def.desc)
                      : i18n.t('shipLocked', { how: ach ? i18n.t('ach_' + ach.id + '_desc') : '—' }),
        right: () => (this.meta.selectedShip === def.id ? i18n.t('shipSelected') : (unlocked ? i18n.t('shipSelect') : '')),
        rightColor: () => (this.meta.selectedShip === def.id ? THEME.colors.successText : THEME.colors.accentText),
        dim: !unlocked,
        onPick: () => {
          if (!unlocked) { Sounds.hurt(); return false; }
          this.meta.selectedShip = def.id;
          Sounds.click();
          Save.update({ meta: this.meta });
          return true;
        }
      };
    });
    this._openListPanel(i18n.t('shipsTitle'), rows, LAYER);
  }

  // ── Достижения ──
  _openAchievements() {
    const p = achievementProgress(this.meta.achievements);
    const rows = ACHIEVEMENTS.map((a) => {
      const done = !!this.meta.achievements[a.id];
      return {
        icon: done ? 'upg_fullheal' : 'upg_armor',
        title: i18n.t('ach_' + a.id + '_name'),
        sub: i18n.t('ach_' + a.id + '_desc'),
        right: () => (done ? '✓' : ('+' + a.reward + ' ✦')),
        rightColor: () => (done ? THEME.colors.successText : THEME.colors.textDim),
        dim: !done,
        onPick: () => false
      };
    });
    this._openListPanel(i18n.t('achTitle') + ' — ' + i18n.t('achProgress', p), rows, 'ach');
  }

  // Общая панель-список с прокруткой перетаскиванием. Ангар и достижения — один и тот же
  // экран с разными строками: писать их по отдельности значило бы держать две копии
  // раскладки, которые неизбежно разъедутся.
  _openListPanel(titleText, rows, LAYER) {
    this._closeAnyModal();
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const panelW = width - 40, panelH = height - 80;
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.8).setDepth(300);
    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);
    panel.lineStyle(3, THEME.colors.panelBorder, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);

    // Цвет ТЕКСТА — только из строковых полей темы. THEME.colors.primary это ЧИСЛО (0x…),
    // и Phaser молча красит такой текст в чёрный: заголовок пропадал на тёмной панели.
    const title = this.add.text(cx, cy - panelH / 2 + 40, titleText, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small,
      color: THEME.colors.accentText, fontStyle: 'bold', align: 'center',
      wordWrap: { width: panelW - 60 }
    }).setOrigin(0.5).setDepth(302);

    Input.openLayer(this, LAYER);

    // Список внутри маски: строк больше, чем влезает, поэтому его можно тянуть пальцем.
    const listTop = cy - panelH / 2 + 90;
    const listH = panelH - 170;
    const itemH = 96;
    const container = this.add.container(0, 0).setDepth(302);
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillRect(cx - panelW / 2, listTop, panelW, listH);
    container.setMask(maskShape.createGeometryMask());

    const cards = [];
    rows.forEach((row, i) => {
      const y = listTop + 10 + i * itemH + itemH / 2;
      const g = this.add.graphics();
      g.fillStyle(0x0a1024, 1);
      g.fillRoundedRect(cx - panelW / 2 + 16, y - itemH / 2 + 4, panelW - 32, itemH - 12, THEME.radius);
      g.lineStyle(2, row.dim ? THEME.colors.neutral : THEME.colors.primary, 1);
      g.strokeRoundedRect(cx - panelW / 2 + 16, y - itemH / 2 + 4, panelW - 32, itemH - 12, THEME.radius);
      const icon = fitIcon(this.add.image(cx - panelW / 2 + 66, y, row.icon), 52)
        .setAlpha(row.dim ? 0.45 : 1);
      const name = this.add.text(cx - panelW / 2 + 106, y - 22, row.title, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small,
        color: row.dim ? THEME.colors.textDim : THEME.colors.text, fontStyle: 'bold'
      });
      const sub = this.add.text(cx - panelW / 2 + 106, y + 6, row.sub, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
        wordWrap: { width: panelW - 250 }
      });
      const right = this.add.text(cx + panelW / 2 - 30, y - 10, row.right(), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny,
        color: row.rightColor(), fontStyle: 'bold'
      }).setOrigin(1, 0);
      container.add([g, icon, name, sub, right]);

      const hit = this.add.zone(cx, y, panelW - 32, itemH - 12).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (row.onPick()) cards.forEach((c) => c.right.setText(c.row.right()));
      });
      container.add(hit);
      cards.push({ row, right });
    });

    // Перетаскивание списка. Границы считаем по фактической высоте содержимого.
    const contentH = rows.length * itemH + 20;
    const minY = Math.min(0, listH - contentH);
    let dragFrom = null;
    overlay.setInteractive();
    const onDown = (p) => { dragFrom = { y: p.y, at: container.y }; };
    const onMove = (p) => {
      if (!dragFrom || !p.isDown) return;
      container.y = Phaser.Math.Clamp(dragFrom.at + (p.y - dragFrom.y), minY, 0);
    };
    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);

    let closeBtn;
    const close = () => {
      this.input.off('pointerdown', onDown);
      this.input.off('pointermove', onMove);
      Input.closeLayer(this, LAYER);
      [overlay, panel, title].forEach((o) => o.destroy());
      container.destroy(true);
      maskShape.destroy();
      closeBtn.destroy();
      this._updateMetaText();
      this._unregisterModal();
    };
    closeBtn = createButton(this, cx, cy + panelH / 2 - 46, i18n.t('close'), close,
      { color: THEME.colors.neutral, textColor: THEME.colors.text, layer: LAYER });
    closeBtn.setDepth(303);
    this._registerModal(close);
  }

  // ── Как играть ──
  _openHowTo() {
    this._closeAnyModal();
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(300);
    const panelW = width - 60, panelH = height * 0.7;
    const cx = width / 2, cy = height / 2;
    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);
    panel.lineStyle(3, THEME.colors.panelBorder, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);

    this.add.text(cx, cy - panelH / 2 + 50, i18n.t('howTo'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.primaryText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302).setStroke(THEME.textStroke.color, 4);

    this.add.text(cx, cy, i18n.t('howToBody'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: panelW - 60 }, lineSpacing: 8
    }).setOrigin(0.5).setDepth(302);

    const LAYER = 'howto';
    Input.openLayer(this, LAYER);
    let btn;
    const close = () => {
      Input.closeLayer(this, LAYER);
      [overlay, panel].forEach((o) => o.destroy());
      btn.destroy();
      this._unregisterModal();
    };
    btn = createButton(this, cx, cy + panelH / 2 - 50, i18n.t('close'), close, { layer: LAYER });
    btn.setDepth(303);
    this._registerModal(close);
  }
}
