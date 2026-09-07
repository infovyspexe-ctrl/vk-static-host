// КАРТА УРОЧИЩА — экран, где игрок выбирает маршрут. Здесь же живёт шапка похода
// (здоровье, золото, колода, обереги) и отсюда уходят все остальные экраны.
//
// Полноэкранная реклама показывается ИМЕННО ЗДЕСЬ и только здесь: это единственная
// честная логическая пауза похода. Показ по таймеру прямо в бою Яндекс называет
// антипримером, а между узлами игрок и так остановился подумать.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { panel, hpBar, heading, bodyText, actLabel, toast } from '../ui/widgets.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { Progress } from '../meta/progress.js';
import { AdGate } from '../core/ads.js';
import { Ads } from '../yandex/ads.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { NODE } from '../mechanics/deckrun/map.js';
import { showAdCountdown } from '../ui/adCountdown.js';
import { openDeckViewer } from '../ui/DeckViewer.js';
import { openRelicViewer } from '../ui/RelicViewer.js';

const NODE_SIGN = {
  [NODE.COMBAT]: '⚔', [NODE.ELITE]: '☠', [NODE.REST]: '🔥',
  [NODE.SHOP]: '⚖', [NODE.EVENT]: '?', [NODE.TREASURE]: '▣', [NODE.BOSS]: '☼',
};
const NODE_COLOR = {
  [NODE.COMBAT]: 0x6d2f2a, [NODE.ELITE]: 0x8a2f5a, [NODE.REST]: 0xb87333,
  [NODE.SHOP]: 0x3f6b96, [NODE.EVENT]: 0x4d3168, [NODE.TREASURE]: 0xe0a33c,
  [NODE.BOSS]: 0xa8382f,
};

const HUD_H = 150;
const ROW_H = 96;

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    this.run = Session.run;
    if (!this.run || this.run.state.over) { this.scene.start('Menu'); return; }

    const bgKey = 'bg_act' + this.run.state.act;
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      const k = Math.max(width / bg.width, height / bg.height);
      bg.setScale(k).setAlpha(0.35);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);
    }

    this.buildMap();
    this.buildHud();
    this.maybeShowInterstitial();
  }

  // ---- Шапка ---------------------------------------------------------------
  buildHud() {
    const { width } = this.scale;
    const s = this.run.state;
    panel(this, width / 2, HUD_H / 2, width, HUD_H, { fill: THEME.colors.panelDark, alpha: 0.96, radius: 0 });

    this.add.text(20, 34, actLabel(s.act), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0, 0.5);

    this.add.text(width - 20, 34, '⛁ ' + s.gold, {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.gold,
    }).setOrigin(1, 0.5);

    const bar = hpBar(this, 190, 86, 300, 26);
    bar.set(s.hp, s.maxHp, 0);

    createButton(this, width - 190, 86, i18n.t('deck') + ' (' + s.deck.length + ')', () => {
      Analytics.first(EVENTS.DECK_OPENED);
      Analytics.event(EVENTS.DECK_OPENED);
      openDeckViewer(this, s.deck);
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny, paddingX: 16, paddingY: 10 });

    createButton(this, width - 62, 86, '✦ ' + s.relics.length, () => openRelicViewer(this, s.relics), {
      color: THEME.colors.neutral, textColor: THEME.colors.accentText,
      fontSize: THEME.fontSize.tiny, paddingX: 14, paddingY: 10,
    });
  }

  // ---- Карта ---------------------------------------------------------------
  buildMap() {
    const { width, height } = this.scale;
    const map = this.run.state.map;
    const available = this.run.availableNodes();

    // Карта прокручивается: 12 этажей не помещаются в экран телефона. Контейнер двигаем
    // сами, а не камерой — так шапка остаётся на месте без второй камеры и её настроек.
    const layer = this.add.container(0, 0);
    this.mapLayer = layer;

    const bottom = height - 60;
    const yOf = (floor) => bottom - floor * ROW_H;
    const xOf = (col) => (width / (map.cols + 1)) * (col + 1);

    // Сначала линии, потом узлы: иначе линия перечёркивает кружок.
    const lines = this.add.graphics();
    layer.add(lines);
    for (const row of map.nodes) {
      for (const n of row) {
        for (const id of n.next) {
          const [f2, c2] = id.split(':').map(Number);
          const reachable = available.includes(id) && this.run.state.currentId === n.id;
          lines.lineStyle(reachable ? 5 : 3, reachable ? THEME.colors.accent : THEME.colors.stroke, reachable ? 1 : 0.55);
          lines.beginPath();
          lines.moveTo(xOf(n.col), yOf(n.floor));
          lines.lineTo(xOf(c2), yOf(f2));
          lines.strokePath();
        }
      }
    }

    for (const row of map.nodes) {
      for (const n of row) {
        const x = xOf(n.col);
        const y = yOf(n.floor);
        const isCurrent = this.run.state.currentId === n.id;
        const isOpen = available.includes(n.id);
        const isPast = !isOpen && !isCurrent && n.floor < (this.currentFloor() ?? -1);

        const r = n.type === NODE.BOSS ? 46 : 34;
        const circle = this.add.circle(x, y, r, NODE_COLOR[n.type] || THEME.colors.panel)
          .setStrokeStyle(isOpen ? 5 : 3, isOpen ? THEME.colors.accent : THEME.colors.stroke);
        circle.setAlpha(isOpen || isCurrent ? 1 : (isPast ? 0.35 : 0.6));
        layer.add(circle);

        const sign = this.add.text(x, y, NODE_SIGN[n.type] || '?', {
          fontFamily: THEME.fontUi, fontSize: n.type === NODE.BOSS ? '38px' : '28px',
          color: THEME.colors.text,
        }).setOrigin(0.5).setAlpha(circle.alpha);
        layer.add(sign);

        if (isCurrent) {
          const ring = this.add.circle(x, y, r + 10).setStrokeStyle(3, THEME.colors.accent, 0.9);
          layer.add(ring);
          this.tweens.add({ targets: ring, scale: 1.12, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
        }

        if (isOpen) {
          Input.makeSelectable(circle, () => this.enter(n));
          this.tweens.add({ targets: circle, scale: 1.08, duration: 700, yoyo: true, repeat: -1 });
        }
      }
    }

    // Подпись доступных узлов — иначе значки надо запоминать.
    this.hint = this.add.text(width / 2, height - 18, i18n.t('mapHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
    }).setOrigin(0.5).setDepth(50);

    this.setupScroll(map, bottom, yOf);
  }

  currentFloor() {
    const id = this.run.state.currentId;
    return id ? Number(id.split(':')[0]) : -1;
  }

  // Прокрутка перетаскиванием и колесом. Ограничена содержимым, иначе карту можно
  // утащить в пустоту и она «пропадает» — на телефоне это выглядит как поломка.
  setupScroll(map, bottom, yOf) {
    const { height } = this.scale;
    const topY = yOf(map.floors - 1) - 90;
    const minScroll = 0;
    const maxScroll = Math.max(0, HUD_H + 20 - topY);
    const clamp = (v) => Math.max(minScroll, Math.min(maxScroll, v));

    // Начальное положение: текущий (или первый доступный) этаж у нижней трети экрана.
    const focusFloor = Math.max(0, this.currentFloor());
    this.mapLayer.y = clamp(height * 0.62 - yOf(focusFloor));

    let dragging = false;
    let startY = 0;
    let startScroll = 0;
    let moved = 0;
    this.input.on('pointerdown', (p) => { dragging = true; startY = p.y; startScroll = this.mapLayer.y; moved = 0; });
    this.input.on('pointermove', (p) => {
      if (!dragging) return;
      moved = Math.max(moved, Math.abs(p.y - startY));
      this.mapLayer.y = clamp(startScroll + (p.y - startY));
    });
    this.input.on('pointerup', () => { dragging = false; });
    this.input.on('wheel', (p, o, dx, dy) => { this.mapLayer.y = clamp(this.mapLayer.y - dy * 0.6); });
    this.dragMoved = () => moved;
  }

  // ---- Переход в узел ------------------------------------------------------
  enter(node) {
    // Тап, случившийся в конце протаскивания карты, не должен входить в узел: на телефоне
    // палец почти всегда чуть съезжает, и игрок улетал в бой, просто листая карту.
    if (this.dragMoved && this.dragMoved() > 12) return;
    Sounds.step();
    const pending = this.run.enterNode(node.id);
    if (!pending) return;
    Analytics.event(EVENTS.FLOOR_REACHED, { act: this.run.state.act, floor: node.floor + 1 });
    Session.saveRun();

    // Input.goTo, не голый scene.start(): это САМЫЙ частый клик в игре (тап по любому
    // узлу карты), и он же — то самое звено, где живой игрок поймал ту же гонку Phaser,
    // что раньше чинили только на экране награды (см. Input.goTo в core/input.js).
    switch (pending.kind) {
      case 'combat':
        Session.startCombat(pending);
        Input.goTo(this, 'Combat');
        break;
      case 'rest':
        Analytics.event(EVENTS.REST_OPENED);
        Input.goTo(this, 'Rest');
        break;
      case 'shop':
        Analytics.first(EVENTS.SHOP_FIRST_USE);
        Analytics.event(EVENTS.SHOP_OPENED);
        Input.goTo(this, 'Shop');
        break;
      case 'event':
        Analytics.event(EVENTS.EVENT_OPENED);
        Input.goTo(this, 'Event');
        break;
      case 'treasure':
        Input.goTo(this, 'Reward', { treasure: pending });
        break;
      default:
        toast(this, '?');
    }
  }

  // ---- Полноэкранная реклама ----------------------------------------------
  maybeShowInterstitial() {
    if (!AdGate.isArmed()) return;
    // Отсчёт перед показом обязателен: внезапный ролик читается как сбой игры.
    showAdCountdown(this, () => {
      AdGate.disarm();
      Analytics.event(EVENTS.AD_FULL_SHOWN);
      Ads.showFullscreen({});
    });
  }

  update(time, delta) {
    AdGate.armTimer(delta / 1000);
  }
}
