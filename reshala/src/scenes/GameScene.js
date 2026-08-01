// Game: игровая сцена «Решала». Рисует шкалы и карточку, ловит свайп, крутит reigns-движок.
// Движок считает (чистая логика), сцена показывает. Оба режима («Срок» и «Побег») — здесь.
import { YA } from '../yandex/sdk.js';
import { Ads } from '../yandex/ads.js';
import { Save } from '../yandex/save.js';
import { Leaderboard } from '../yandex/leaderboard.js';
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { bus } from '../core/events.js';
import { Input } from '../core/input.js';
import { Sfx } from '../core/sfx.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { CONTENT } from '../data/content.js';
import { METERS, MODE_METERS, BALANCE, difficultyFactor, blocksConfig, blockDifficultyFactor } from '../data/balance.js';
import { END_REASONS, END_FALLBACK, CAUGHT } from '../data/endings.js';
import { TIMINGBARS } from '../data/timingbars.js';
import { SHELLGAMES } from '../data/shellgames.js';
import { createReigns } from '../mechanics/reigns/reigns.js';
import { newlyUnlocked, ACH_BY_ID } from '../data/achievements.js';

const CARD_W = 560, CARD_H = 560, BAND_H = 150;

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.mode = (data && data.mode) || 'endless';
    this.busy = false;
    this.ended = false;
  }

  // Фон под локацию карты: у каждой локации свой арт.
  bgForPlace(place) {
    const map = { cell: 'bg_cellblock', canteen: 'bg_canteen', corridor: 'bg_corridor',
      yard: 'bg_yard', library: 'bg_library', medbay: 'bg_medbay',
      laundry: 'bg_laundry', workshop: 'bg_workshop' };
    const key = map[place] || (this.mode === 'campaign' ? 'bg_night' : 'bg_cellblock');
    return this.textures.exists(key) ? key : 'bg_cellblock';   // страховка, если текстуры нет
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;
    this.cardY = height * 0.52;

    // фон-подложка (за всем). Дальше меняется под локацию карты (см. showCard/bgForPlace).
    this.bgImage = this.add.image(this.cx, height / 2,
      this.mode === 'campaign' ? 'bg_night' : 'bg_cellblock');

    YA.gameplayStart();
    Input.setup(this);
    // старт режима: каждый забег + «первый в жизни» (различаем зашедших и играющих)
    if (this.mode === 'campaign') {
      Analytics.event(EVENTS.CAMPAIGN_STARTED);
      Analytics.first(EVENTS.CAMPAIGN_FIRST_USE);
    } else {
      Analytics.event(EVENTS.ENDLESS_STARTED);
      Analytics.first(EVENTS.ENDLESS_FIRST_USE);
    }

    // прогресс: готовый кэш из Preload, без ожидания (см. PreloadScene — гонка задвоения HUD)
    this.progress = Save.cache || {};
    this.bestDays = this.progress.bestDays || 0;
    this.charMet = this.progress.charMet || {}; // счётчик встреч персонажей (для коллекции)

    // Межстраничная реклама раз в BALANCE.adEveryCards карт. В самом ПЕРВОМ забеге игрока
    // не показываем вовсе (чистое первое впечатление).
    this.cardsSinceAd = 0;
    this.curBlock = 0;                 // для рекламы на смене главы (см. continueWithAd)
    this.firstEver = (this.progress.runs || 0) === 0;

    // справочники
    this.charMap = {};
    for (const c of CONTENT.characters) this.charMap[c.key] = c;

    this.meterKeys = MODE_METERS[this.mode];
    this.buildEngine();
    this.buildHud();
    this.buildMeters();
    this.buildCard();
    this.buildChoiceLabels();

    // управление с клавиатуры: ←/→ — решение
    this.onInput = (dir) => {
      if (this.busy || this.ended) return;
      if (dir === 'left') this.commit('left');
      else if (dir === 'right') this.commit('right');
    };
    bus.on('input', this.onInput);
    this.events.once('shutdown', () => bus.off('input', this.onInput));

    // Первый в жизни забег — короткое объяснение шкал. Без него игрок видит три одинаковые
    // полосы и считает, что все три нельзя доводить до потолка, хотя здоровью опасен только
    // ноль (жалоба с прохождения). Показывается один раз, флаг живёт в сейве.
    if (!this.progress.tutSeen) this.showMeterIntro();
    else this.startRun();
  }

  showMeterIntro() {
    const { height, width } = this.scale;
    this.busy = true;
    const o = this.overlay(0.78);
    o.add(this.add.text(this.cx, height * 0.20, i18n.t('tutTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5));

    // строка на шкалу: та же иконка и тот же цвет, что в HUD — связь «это про вон ту полосу»
    const rows = [['suspicion', 'tutSuspicion'], ['respect', 'tutRespect'], ['health', 'tutHealth']];
    rows.forEach(([key, textKey], i) => {
      const y = height * 0.29 + i * height * 0.115;
      o.add(this.add.image(width * 0.13, y, 'art_' + key).setDisplaySize(46, 46));
      o.add(this.add.text(width * 0.21, y, i18n.t(textKey), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
        align: 'left', wordWrap: { width: width * 0.66 }, lineSpacing: 5,
      }).setOrigin(0, 0.5));
    });

    // жёлтая подсказка — origin по центру по вертикали, чтобы её высота не наезжала на кнопку
    o.add(this.add.text(this.cx, height * 0.63, i18n.t('tutHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54a',
      align: 'center', wordWrap: { width: width * 0.78 }, lineSpacing: 5,
    }).setOrigin(0.5, 0.5));

    o.add(createButton(this, this.cx, height * 0.80, i18n.t('tutOk'), () => {
      o.destroy();
      Save.update({ tutSeen: true });       // локально; в облако уедет ближайшим flush
      if (this.card) this.card.setVisible(true);
      (this.choiceUI || []).forEach((x) => x && x.setVisible(true));
      this.startRun();
    }, { color: THEME.colors.primary }));
  }

  buildEngine() {
    const meters = {};
    for (const key of this.meterKeys) meters[key] = METERS[key];

    // Один пул blockCards кормит оба режима, движок делит его по блокам (главам);
    // в «Побеге» на границе главы форсится карта побега из escapeCards.
    this.engine = createReigns({
      meters,
      deck: CONTENT.blockCards,
      escapeDeck: CONTENT.escapeCards,
      winMeter: this.mode === 'campaign' ? 'escape' : null,
      blocks: blocksConfig(this.mode),
      // В кампании кривая своя и пологая (иначе игрок не доживает до финала —
      // см. комментарий у BLOCKS.difficultyPerDay). «Срок» остаётся на крутой кривой.
      scaleEffects: (day) => (this.mode === 'campaign' ? blockDifficultyFactor(day) : difficultyFactor(day)),
      // Мини-игры по расписанию, а не по удаче: в каждой главе лежит своя event-карта
      // (тема под локацию), движок сам вытягивает её раз в miniEvery дней. Без этого
      // три мини-движка не встречались бы вовсе.
      push: {
        every: BALANCE.miniEvery,
        match: (c) => !!((c.left && c.left.mini) || (c.right && c.right.mini)),
      },
      // сцена: несколько карт подряд про одного собеседника или одно место
      stick: { by: ['who', 'place'], chance: BALANCE.stickChance, max: BALANCE.stickMax },
    });
  }

  // --- HUD: день, рекорд, кнопка паузы/выхода ---
  buildHud() {
    this.dayText = this.add.text(24, 34, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    // Рекорд сдвинут левее — освобождает верхний правый угол под кнопку паузы.
    this.bestText = this.add.text(this.scale.width - 80, 34, i18n.t('best', { n: this.bestDays }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(1, 0.5).setAlpha(0.8);
    this.buildPauseButton();
  }

  // Кнопка «пауза/выход в меню» в верхнем правом углу. Требование VK: из активного забега
  // игрок должен иметь возможность выйти в главное меню (не только через проигрыш/победу).
  buildPauseButton() {
    const x = this.scale.width - 42, y = 36, r = 24;
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(THEME.colors.panel, 0.92); g.fillRoundedRect(x - r, y - r, r * 2, r * 2, 9);
    g.lineStyle(2, THEME.colors.accent, 0.9); g.strokeRoundedRect(x - r, y - r, r * 2, r * 2, 9);
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 8, y - 10, 6, 20); g.fillRect(x + 2, y - 10, 6, 20); // две «паузные» полоски
    // Кликабельная зона отдельно (надёжный hit-area, как у кнопок мини-игр).
    this.add.zone(x, y, (r + 8) * 2, (r + 8) * 2).setDepth(21)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.openPauseMenu());
  }

  // Оверлей паузы: «Продолжить» или «В меню» (забег бросается). Прогресс текущего забега
  // в облако уходит на ключевых точках; накопленную мету дожимаем flush перед выходом.
  openPauseMenu() {
    if (this.ended || this.pauseOverlay) return;
    const wasBusy = this.busy;
    this.busy = true;
    const { width, height } = this.scale;
    const o = this.add.container(0, 0).setDepth(60);
    this.pauseOverlay = o;
    o.add(this.add.rectangle(this.cx, height / 2, width, height, 0x0e1620, 0.86).setOrigin(0.5).setInteractive());
    o.add(createPanel(this, this.cx, height * 0.42, width * 0.82, height * 0.34));
    o.add(this.add.text(this.cx, height * 0.30, i18n.t('paused'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5));
    o.add(this.add.text(this.cx, height * 0.375, i18n.t('quitConfirm'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: width * 0.72 }, lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.85));
    o.add(createButton(this, this.cx, height * 0.50, i18n.t('resume'),
      () => { o.destroy(); this.pauseOverlay = null; this.busy = wasBusy; }, { color: THEME.colors.primary }));
    o.add(createButton(this, this.cx, height * 0.585, i18n.t('toMenu'),
      () => { Save.flush(); this.scene.start('Menu'); }, { color: THEME.colors.accent }));
  }

  updateHud() {
    this.dayText.setText(i18n.t('day', { n: this.engine.day })
      + ' · ' + i18n.t('blockLabel', { n: this.engine.block }));
  }

  // --- шкалы ---
  buildMeters() {
    this.meterUI = {};
    const barX = 118, barW = 470, rowY0 = 92, dy = 58, barH = 26;
    this.meterKeys.forEach((key, i) => {
      const m = METERS[key];
      const y = rowY0 + i * dy;
      this.add.image(56, y, 'art_' + key).setDisplaySize(40, 40); // иконка шкалы
      this.add.rectangle(barX, y, barW, barH, THEME.colors.panel).setOrigin(0, 0.5);
      const fill = this.add.rectangle(barX, y, barW, barH, m.color).setOrigin(0, 0.5);
      const vt = this.add.text(barX + barW + 12, y, '', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      }).setOrigin(0, 0.5);
      this.meterUI[key] = { fill, vt, barW, y, mid: barX + barW / 2 };
    });
    this.refreshMeters();
  }

  refreshMeters() {
    const v = this.engine.values;
    for (const key of this.meterKeys) {
      const ui = this.meterUI[key];
      const max = METERS[key].max;
      const ratio = Phaser.Math.Clamp(v[key] / max, 0, 1);
      ui.fill.displayWidth = Math.max(2, ui.barW * ratio);
      ui.vt.setText(String(v[key]));
    }
  }

  // Реакция на выбор: что из твоего решения вышло. Текст есть у каждой карты (reply).
  // Раньше был авто-исчезающий баннер — игрок (даже взрослый, тем более ребёнок) не успевал
  // прочитать. Теперь это ОКНО С КНОПКОЙ: следующая карта не придёт, пока не нажмёшь «Дальше».
  // onOk продолжает поток (смерть/победа/мини-игра/следующая карта).
  showReplyModal(reply, onOk) {
    const text = i18n.pick(reply);
    if (!text) { onOk(); return; }
    const { width, height } = this.scale;

    // спрятать подписи выбора: карта уже улетела, а они бы просвечивали под окном
    (this.choiceUI || []).forEach((o) => o && o.setVisible(false));   // включая зоны нажатия

    const layer = this.add.container(0, 0).setDepth(50);
    // блокер: гасит клики по карте под окном
    layer.add(this.add.rectangle(this.cx, height / 2, width, height, 0x0e1620, 0.72)
      .setOrigin(0.5).setInteractive());

    // Раскладка адаптивна по высоте текста: реплики карт побега («сорвалось, зато узнал…»)
    // длиннее обычных, и при фиксированной панели последняя строка пряталась за кнопкой.
    // Меряем текст → под него растим панель и опускаем кнопку.
    const txt = this.add.text(this.cx, 0, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: '#ffd54a',
      align: 'center', wordWrap: { width: width * 0.74 }, lineSpacing: 6,
    }).setOrigin(0.5, 0);
    const gap = 26, btnH = 58, padY = 40;
    const panelH = Math.max(height * 0.24, txt.height + gap + btnH + padY * 2);
    const cy = height * 0.46;
    const top = cy - panelH / 2;
    layer.add(createPanel(this, this.cx, cy, width * 0.86, panelH));
    txt.setY(top + padY);
    layer.add(txt);

    const proceed = () => {
      if (!layer.active) return;         // защита от двойного нажатия (кнопка + клавиша)
      bus.off('input', onKey);
      layer.destroy();
      onOk();
    };
    const onKey = (dir) => { if (dir === 'confirm') proceed(); };
    bus.on('input', onKey);              // Enter/Space тоже подтверждают
    layer.add(createButton(this, this.cx, top + padY + txt.height + gap + btnH / 2,
      i18n.t('replyNext'), proceed, { color: THEME.colors.primary }));
  }

  floatDelta(key, delta) {
    if (!delta) return;
    const ui = this.meterUI[key];
    const sign = delta > 0 ? '+' : '−';
    const t = this.add.text(ui.mid, ui.y - 4, sign + Math.abs(delta), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#000000', 4);
    this.tweens.add({ targets: t, y: ui.y - 42, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  // --- карточка ---
  buildCard() {
    this.bgG = this.add.graphics();
    this.bgG.fillStyle(THEME.colors.panel, 1);
    this.bgG.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, THEME.radius);
    this.bandG = this.add.graphics();
    this.portraitImg = this.add.image(0, -CARD_H / 2 + 60, 'portrait_sokamernik').setOrigin(0.5);
    this.nameText = this.add.text(0, -CARD_H / 2 + 128, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.bodyText = this.add.text(0, -CARD_H / 2 + 190, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
      align: 'center', wordWrap: { width: CARD_W - 64 }, lineSpacing: 8,
    }).setOrigin(0.5, 0);

    this.card = this.add.container(this.cx, this.cardY, [
      this.bgG, this.bandG, this.portraitImg, this.nameText, this.bodyText,
    ]);
    this.card.setSize(CARD_W, CARD_H);
    // Зону захвата Phaser отсчитывает ОТ ЛЕВОГО ВЕРХНЕГО УГЛА: при хит-тесте он сам прибавляет
    // displayOrigin контейнера (после setSize это половина размера). Центровой прямоугольник
    // (-W/2,-H/2,W,H) из-за этого уезжал на пол-карты вверх-влево, и карта хваталась только за
    // левый верхний квадрант — свайп влево (его начинают с правого края карты) не работал вовсе.
    // Без аргументов setInteractive строит из setSize верную зону Rectangle(0,0,W,H).
    this.card.setInteractive();
    this.input.setDraggable(this.card);

    this.input.on('drag', (pointer, go, dragX) => {
      if (go !== this.card || this.busy || this.ended) return;
      go.x = dragX;
      const dx = go.x - this.cx;
      go.rotation = Phaser.Math.Clamp(dx * 0.0006, -0.22, 0.22);
      this.highlightSide(dx);
    });
    this.input.on('dragend', (pointer, go) => {
      if (go !== this.card || this.busy || this.ended) return;
      const dx = go.x - this.cx;
      if (Math.abs(dx) >= BALANCE.swipeThreshold) this.commit(dx < 0 ? 'left' : 'right');
      else this.resetCardPosition();
    });
  }

  drawCard(card) {
    const who = this.charMap[card.who] || { name: { ru: '', en: '' }, color: THEME.colors.neutral };
    this.bandG.clear();
    this.bandG.fillStyle(who.color, 1);
    // верхняя цветная полоса со скруглением сверху
    this.bandG.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, BAND_H, { tl: THEME.radius, tr: THEME.radius, bl: 0, br: 0 });
    // портрет персонажа (высота ~112, аспект сохраняем)
    const key = 'portrait_' + card.who;
    if (this.textures.exists(key)) {
      this.portraitImg.setVisible(true).setTexture(key);
      this.portraitImg.setScale(112 / this.portraitImg.height);
    } else this.portraitImg.setVisible(false);
    this.nameText.setText(i18n.pick(who.name));
    this.bodyText.setText(i18n.pick(card.text));
  }

  buildChoiceLabels() {
    const { width, height } = this.scale;
    const y = height * 0.86;
    this.leftLabel = this.add.text(28, y, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'left', wordWrap: { width: width * 0.42 },
    }).setOrigin(0, 0.5).setAlpha(0.55);
    this.rightLabel = this.add.text(width - 28, y, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'right', wordWrap: { width: width * 0.42 },
    }).setOrigin(1, 0.5).setAlpha(0.55);
    this.hintText = this.add.text(this.cx, height * 0.93, i18n.t('dragHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.5);

    // Подписи выбора — это ЕЩЁ И КНОПКИ. Игрок читает их как кнопки и пытается нажать, а
    // работал только свайп (жалоба с прохождения). Свайп остаётся, тап — равноправный способ.
    // Зона нажатия сильно шире текста: попасть пальцем в тонкую строку на телефоне тяжело.
    const zw = width * 0.48, zh = height * 0.11;
    this.leftHit = this.add.zone(width * 0.25, y, zw, zh).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.rightHit = this.add.zone(width * 0.75, y, zw, zh).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const wire = (zone, label, side) => {
      zone.on('pointerover', () => { if (!this.busy && !this.ended) label.setAlpha(1); });
      zone.on('pointerout', () => label.setAlpha(0.55));
      zone.on('pointerdown', () => { if (!this.busy && !this.ended) label.setAlpha(1); });
      zone.on('pointerup', () => {
        if (this.busy || this.ended || !this.current) return;
        this.commit(side);           // ровно тот же путь, что и у свайпа
      });
    };
    wire(this.leftHit, this.leftLabel, 'left');
    wire(this.rightHit, this.rightLabel, 'right');
    // всё, что прячется на время окна реакции и концовки
    this.choiceUI = [this.leftLabel, this.rightLabel, this.hintText, this.leftHit, this.rightHit];
  }

  setChoiceLabels(card) {
    this.leftLabel.setText('← ' + i18n.pick(card.left.text));
    this.rightLabel.setText(i18n.pick(card.right.text) + ' →');
    this.leftLabel.setAlpha(0.55).setVisible(true);
    this.rightLabel.setAlpha(0.55).setVisible(true);
    // окно реакции прячет подписи и зоны нажатия — вернуть обе
    if (this.hintText) this.hintText.setVisible(true);
    if (this.leftHit) this.leftHit.setVisible(true);
    if (this.rightHit) this.rightHit.setVisible(true);
  }

  highlightSide(dx) {
    const active = Math.abs(dx) >= BALANCE.swipeThreshold;
    this.leftLabel.setAlpha(dx < 0 && active ? 1 : 0.55);
    this.rightLabel.setAlpha(dx > 0 && active ? 1 : 0.55);
  }

  // --- поток игры ---
  startRun() {
    const st = this.engine.start();
    this.showCard(st.card, true);
    this.refreshMeters();
    this.updateHud();
    // регистрируем режим и добираем ретро-достижения (both_modes, survive*, collect_all — из сейва)
    this.checkAch();
  }

  showCard(card, instant) {
    if (!card) { this.finishNoCards(); return; }
    this.current = card;
    this.card.setVisible(true);   // оверлеи (реклама/предложение) могли скрыть карту — вернуть
    // блочный режим: фон под локацию карты
    if (card.place && this.bgImage) {
      this.bgImage.setTexture(this.bgForPlace(card.place));
    }
    // встреча персонажа — копим для коллекции (частые вызовы склеиваются в одну запись)
    if (card.who) {
      this.charMet[card.who] = (this.charMet[card.who] || 0) + 1;
      Save.update({ charMet: this.charMet });
      // веха: встречены все персонажи коллекции (шлётся один раз за жизнь игрока)
      if (CONTENT.characters.every((c) => (this.charMet[c.key] || 0) > 0)) {
        Analytics.first(EVENTS.COLLECTION_FULL);
      }
      this.checkAch();   // достижения: глава (по block), кот, вся банда
    }
    this.drawCard(card);
    this.setChoiceLabels(card);
    this.card.setRotation(0);
    if (instant) {
      this.card.setPosition(this.cx, this.cardY).setAlpha(1).setScale(1);
      this.busy = false;
      return;
    }
    // прилёт новой карты
    this.card.setPosition(this.cx, this.cardY + 40).setAlpha(0).setScale(0.96);
    this.tweens.add({
      targets: this.card, y: this.cardY, alpha: 1, scale: 1, duration: 200, ease: 'Quad.out',
      onComplete: () => { this.busy = false; },
    });
  }

  resetCardPosition() {
    this.tweens.add({ targets: this.card, x: this.cx, y: this.cardY, rotation: 0, duration: 160, ease: 'Quad.out' });
    this.leftLabel.setAlpha(0.55);
    this.rightLabel.setAlpha(0.55);
  }

  commit(side) {
    if (this.busy || this.ended || !this.current) return;
    this.busy = true;
    Sfx.play('swipe');
    const dir = side === 'left' ? -1 : 1;
    this.tweens.add({
      targets: this.card,
      x: this.cx + dir * (this.scale.width),
      rotation: dir * 0.5,
      alpha: 0,
      duration: 220,
      ease: 'Quad.in',
      onComplete: () => this.applyChoice(side),
    });
  }

  applyChoice(side) {
    const chosen = this.current ? this.current[side] : null; // запомнить сторону (event-карта)
    const res = this.engine.choose(side);
    // мгновенная обратная связь: шкалы и всплывающие дельты
    this.refreshMeters();
    if (res.applied) for (const key in res.applied) this.floatDelta(key, res.applied[key]);
    this.updateHud();

    // вехи выживания в «Сроке» (first — каждая уйдёт один раз за жизнь игрока)
    if (this.mode === 'endless') {
      const d = this.engine.day;
      if (d >= 10) Analytics.first(EVENTS.DAY_10_REACHED);
      if (d >= 25) Analytics.first(EVENTS.DAY_25_REACHED);
      if (d >= 50) Analytics.first(EVENTS.DAY_50_REACHED);
    }

    // продолжение забега — ПОСЛЕ того, как игрок прочитал реакцию и нажал «Дальше»
    const advance = () => {
      if (res.dead) { this.endRun(res); return; }
      if (res.won) { this.win(res); return; }
      // event-карта: выбранная сторона запускает мини-игру, потом продолжаем забег
      if (chosen && chosen.mini) { this.launchMiniGame(chosen, res.card); return; }
      if (res.escapeFailed) {
        // Вторую попытку за рекламу предлагаем ТОЛЬКО при реальном срыве (escape НЕ вырос).
        // Удачная попытка (escape прибавился) всегда завершает главу и уводит дальше — иначе
        // за рекламу можно бесконечно переигрывать ОДНУ главу, каждый раз добивая escape
        // удачной стороной, и выйти на волю в первой же главе (эксплойт, найденный игроком).
        const gained = (res.applied && res.applied.escape) || 0;
        if (gained <= 0) { this.offerEscapeRetry(res.card); return; }
        this.showCard(res.card, false);
        return;
      }
      this.continueWithAd(res.card);
    };
    this.showReplyModal(res.reply, advance);
  }

  // Показать следующую карту, но раз в BALANCE.adEveryCards — сперва межстраничную рекламу.
  // Момент естественный: игрок уже прочитал реакцию, следующая карта ещё не пришла (не во
  // время действия — модерация C3). Яндекс сам не покажет чаще раза в 60 с, так что счётчик —
  // мягкая цель. В первом забеге игрока рекламы нет вовсе.
  continueWithAd(nextCard) {
    // Смена главы — естественная точка показа (в «Срок» главы меняются молча по счётчику дней).
    const chapterChanged = this.engine.block > this.curBlock;
    this.curBlock = this.engine.block;
    this.cardsSinceAd += 1;
    const due = this.cardsSinceAd >= BALANCE.adEveryCards;
    if (!this.firstEver && (due || chapterChanged)) {
      this.cardsSinceAd = 0;
      this.busy = true;
      Ads.showFullscreen({ onClose: () => this.showCard(nextCard, false) });
      return;
    }
    this.showCard(nextCard, false);
  }

  // ── ДОСТИЖЕНИЯ (удержание) ──────────────────────────────────────────────────
  // Обновляет накопители в сейве, проверяет условия и показывает тост на новых.
  // Зовётся в ключевых точках: старт забега, встреча персонажа, победа, смерть,
  // выигрыш мини-игры, вторая попытка. extra — событие момента.
  checkAch(extra = {}) {
    const p = Save.cache || {};
    const block = this.engine ? this.engine.block : 0;
    const maxChapter = Math.max(p.maxChapter || 0, block, extra.block || 0);
    const modes = { ...(p.modes || {}) };
    if (this.mode) modes[this.mode] = true;
    const mgWon = { ...(p.mgWon || {}) };
    if (extra.mgType) mgWon[extra.mgType] = true;
    const retryUsed = !!(p.retryUsed || extra.retryUsed);

    const acc = { maxChapter, modes, mgWon };
    if (retryUsed) acc.retryUsed = true;
    Save.update(acc);                         // накопители — локально, в облако ближайшим flush

    const charMet = p.charMet || this.charMet || {};
    const state = {
      maxChapter,
      bestDays: Math.max(p.bestDays || 0, this.bestDays || 0),
      metCount: Object.keys(charMet).filter((k) => charMet[k] > 0).length,
      metCat: (charMet.kot || 0) > 0,
      mgTypes: Object.values(mgWon).filter(Boolean).length,
      modesCount: Object.values(modes).filter(Boolean).length,
      retryUsed,
      won: !!extra.won,
      winBlock: extra.winBlock || 0,
      deathEdge: extra.deathEdge || null,
    };
    const ach = { ...(p.ach || {}) };
    const newly = newlyUnlocked(state, ach);
    if (!newly.length) return;
    for (const id of newly) ach[id] = true;
    Save.update({ ach });
    this.showAchToast(newly);
  }

  // Тост об открытии достижения: плашка сверху, сама уезжает. Несколько разом — показываем
  // первое и «+N» (совпадения редки; остальные видны на экране достижений).
  showAchToast(ids) {
    const a = ACH_BY_ID[ids[0]];
    if (!a) return;
    const { width, height } = this.scale;
    const text = i18n.t('achUnlocked') + ': ' + i18n.pick(a.name) + (ids.length > 1 ? ` +${ids.length - 1}` : '');
    const y0 = height * 0.255;   // в промежутке между шкалами и карточкой, не поверх шкал
    const w = width * 0.82, h = 74;
    const c = this.add.container(this.cx, y0 - 20).setDepth(60).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0x1b2b3a, 0.97); g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(3, 0xffd54a, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    c.add(g);
    c.add(this.add.text(0, 0, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54a',
      fontStyle: 'bold', align: 'center', wordWrap: { width: w - 44 }, lineSpacing: 4,
    }).setOrigin(0.5));
    Sfx.play('good');
    this.tweens.add({
      targets: c, alpha: 1, y: y0, duration: 260, ease: 'Quad.out',
      onComplete: () => this.tweens.add({ targets: c, alpha: 0, y: y0 - 16, delay: 2400, duration: 400, onComplete: () => c.destroy() }),
    });
  }

  // Попытка побега сорвалась. Предлагаем посмотреть ролик и попробовать ещё раз в этой же главе.
  // Награда обозначена ДО просмотра и выдаётся ТОЛЬКО в onRewarded (модерация C4).
  offerEscapeRetry(nextCard) {
    const { height } = this.scale;
    this.busy = true;
    const o = this.overlay(0.5);
    o.add(this.add.text(this.cx, height * 0.30, i18n.t('retryTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5));
    o.add(this.add.text(this.cx, height * 0.38, i18n.t('retryBody'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: this.scale.width * 0.76 }, lineSpacing: 6,
    }).setOrigin(0.5, 0));

    const proceed = () => { o.destroy(); this.showCard(nextCard, false); };
    // «Дальше» = переход в следующую главу → межстраничная реклама (смена главы).
    // В первом забеге игрока рекламы нет; Яндекс всё равно не покажет чаще раза в 60 с.
    const proceedNext = () => {
      o.destroy();
      if (this.firstEver) { this.showCard(nextCard, false); return; }
      this.cardsSinceAd = 0; this.busy = true;
      Ads.showFullscreen({ onClose: () => this.showCard(nextCard, false) });
    };
    o.add(createButton(this, this.cx, height * 0.58, i18n.t('retryWatch'), () => {
      let rewarded = false;
      Ads.showRewarded({
        onRewarded: () => { rewarded = true; },
        onClose: () => {
          if (!rewarded) { proceed(); return; }   // не досмотрел — идём в следующую главу
          o.destroy();
          this.checkAch({ retryUsed: true });      // достижение «Со второго раза»
          const st = this.engine.retryEscape();
          this.refreshMeters();
          this.updateHud();
          this.showCard(st.card, false);           // новая карта побега той же главы
        },
      });
    }, { color: THEME.colors.accent }));
    o.add(createButton(this, this.cx, height * 0.70, i18n.t('retrySkip'), proceedNext,
      { color: THEME.colors.neutral, textColor: THEME.colors.text }));
  }

  // Запуск мини-игры с event-карты. По итогу применяем награду/штраф к шкалам и продолжаем.
  launchMiniGame(chosen, nextCard) {
    this.busy = true;
    // тип движка мини-игры (для достижения «выиграл все три вида»): timing/shell/lane
    const mgType = TIMINGBARS[chosen.mini] ? 'timing' : SHELLGAMES[chosen.mini] ? 'shell' : 'lane';
    const onDone = ({ win }) => {
      bus.off('minigame:done', onDone);
      Sfx.play(win ? 'good' : 'bad');
      this.scene.resume();
      if (win) this.checkAch({ mgType });   // достижения: выиграл мини-игру / все три вида
      // Победа в мини-игре НЕ должна завершать забег: игрок выиграл, а награда добивала
      // шкалу до края и убивала — «выиграл, и за это наказали» (жалоба с прохождения).
      // Штраф за проигрыш идёт без safe: это честный риск, на который игрок пошёл сам.
      const reward = win ? (chosen.rewardWin || {}) : (chosen.rewardLose || {});
      const r = this.engine.apply(reward, { safe: win });
      this.refreshMeters();
      for (const key in r.applied) this.floatDelta(key, r.applied[key]);
      this.updateHud();
      if (r.dead) { this.endRun({ ...r, day: this.engine.day }); return; }
      if (r.won) { this.win({ ...r, day: this.engine.day }); return; }
      this.showCard(nextCard, false);
    };
    bus.on('minigame:done', onDone);
    this.events.once('shutdown', () => bus.off('minigame:done', onDone));
    // выбрать сцену по ключу мини-игры
    const sceneKey = TIMINGBARS[chosen.mini] ? 'TimingBar'
      : SHELLGAMES[chosen.mini] ? 'ShellGame'
      : 'MiniGame';
    this.scene.launch(sceneKey, { theme: chosen.mini, mode: this.mode });
    this.scene.pause();
  }

  finishNoCards() {
    // страховка: карты кончились — завершаем как обычный конец забега без причины
    this.endRun({ dead: true, reason: null, day: this.engine.day });
  }

  // --- концовки ---
  overlay(hFrac = 0.54) {
    const { width, height } = this.scale;
    // спрятать игровые элементы, чтобы не просвечивали сквозь оверлей
    if (this.card) this.card.setVisible(false);
    (this.choiceUI || []).forEach((o) => o && o.setVisible(false));   // включая зоны нажатия
    const o = this.add.container(0, 0);
    o.add(this.add.rectangle(this.cx, height / 2, width, height, 0x0e1620, 0.9).setOrigin(0.5));
    o.add(createPanel(this, this.cx, height * 0.5, width * 0.88, height * hFrac));
    return o;
  }

  async endRun(res) {
    this.ended = true;
    Sfx.play('lose');
    YA.gameplayStop();
    const days = res.day || this.engine.day;
    const isRecord = this.mode === 'endless' && days > this.bestDays;
    if (days > this.bestDays) this.bestDays = days;

    // Конец забега — ключевая точка: одной записью уходит в облако всё накопленное
    // за забег (встречи персонажей копились локально, без запросов).
    Save.update({ bestDays: this.bestDays, runs: (this.progress.runs || 0) + 1 });
    await Save.flush();
    const reasonKey = res.reason ? `${res.reason.meter}_${res.reason.edge}` : null;
    Analytics.event(EVENTS.RUN_ENDED, { mode: this.mode, days, reason: reasonKey || 'none' });
    // Счёт шлём ТОЛЬКО когда рекорд реально вырос: отправлять тот же результат после
    // каждого забега — лишний запрос к площадке, таблица от него не меняется.
    if (isRecord) await Leaderboard.setScore('days', this.bestDays);
    // достижения: рекорды дней «Срока» + «Перебор» (смерть по верхнему краю шкалы)
    this.checkAch({ deathEdge: res.reason ? res.reason.edge : null });

    // текст причины
    let reasonText;
    if (this.mode === 'campaign') reasonText = i18n.pick(CAUGHT);
    else reasonText = i18n.pick((reasonKey && END_REASONS[reasonKey]) || END_FALLBACK);

    const { height } = this.scale;
    const o = this.overlay();
    const title = this.mode === 'campaign' ? i18n.t('caughtTitle') : i18n.t('over');
    o.add(this.add.text(this.cx, height * 0.26, title, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5));
    o.add(this.add.text(this.cx, height * 0.36, reasonText, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: this.scale.width * 0.76 }, lineSpacing: 6,
    }).setOrigin(0.5, 0));
    o.add(this.add.text(this.cx, height * 0.5, i18n.t('daysSurvived', { n: days }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
    }).setOrigin(0.5));
    if (isRecord) {
      o.add(this.add.text(this.cx, height * 0.56, i18n.t('newRecord'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54f', fontStyle: 'bold',
      }).setOrigin(0.5));
    }
    o.add(createButton(this, this.cx, height * 0.66, i18n.t('again'),
      () => Ads.showFullscreen({ onClose: () => this.scene.restart({ mode: this.mode }) }),
      { color: THEME.colors.primary }));
    o.add(createButton(this, this.cx, height * 0.76, i18n.t('toMenu'),
      () => Ads.showFullscreen({ onClose: () => this.scene.start('Menu') }),
      { color: THEME.colors.neutral, textColor: THEME.colors.text }));
  }

  async win(res) {
    this.ended = true;
    Sfx.play('win');
    YA.gameplayStop();
    const days = res.day || this.engine.day;
    // Победа — ключевая точка синхронизации сейва (одна облачная запись).
    Save.update({ runs: (this.progress.runs || 0) + 1 });
    await Save.flush();
    Analytics.event(EVENTS.ESCAPE_WIN, { days, block: this.engine.block });
    // достижения: «На воле!», «Вырвался рано» (до финальной главы)
    this.checkAch({ won: true, winBlock: this.engine.block });

    const endingText = i18n.t('freedomText');
    const { height } = this.scale;
    const o = this.overlay(0.66);
    o.add(this.add.text(this.cx, height * 0.20, i18n.t('freedomTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: '#ffd54f', fontStyle: 'bold',
    }).setOrigin(0.5));
    o.add(this.add.text(this.cx, height * 0.25, i18n.t('daysSurvived', { n: days }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.8));
    o.add(this.add.text(this.cx, height * 0.30, endingText, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: this.scale.width * 0.78 }, lineSpacing: 6,
    }).setOrigin(0.5, 0));
    o.add(createButton(this, this.cx, height * 0.72, i18n.t('again'),
      () => Ads.showFullscreen({ onClose: () => this.scene.restart({ mode: this.mode }) }),
      { color: THEME.colors.primary }));
    o.add(createButton(this, this.cx, height * 0.81, i18n.t('toMenu'),
      () => Ads.showFullscreen({ onClose: () => this.scene.start('Menu') }),
      { color: THEME.colors.neutral, textColor: THEME.colors.text }));
  }

}
