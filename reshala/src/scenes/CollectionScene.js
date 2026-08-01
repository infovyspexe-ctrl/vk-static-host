// Collection: коллекция персонажей. Гибрид-разблок (CONVENTIONS через данные сейва):
// 0 встреч — силуэт «?»; 1..friendAt-1 — открыт эмодзи+имя, досье скрыто; >=friendAt — полное досье.
// Встречи копит GameScene (charMet в сейве). Досье (tagline/bio) — в CONTENT.characters.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { Save } from '../yandex/save.js';
import { CONTENT } from '../data/content.js';
import { BALANCE } from '../data/balance.js';

export class CollectionScene extends Phaser.Scene {
  constructor() { super('Collection'); }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;
    Input.setup(this);
    Analytics.event(EVENTS.COLLECTION_OPENED);

    const progress = Save.cache || {};   // готовый кэш из Preload, без ожидания
    this.charMet = progress.charMet || {};
    const chars = CONTENT.characters;
    const unlocked = chars.filter((c) => (this.charMet[c.key] || 0) > 0).length;

    this.add.text(this.cx, height * 0.06, i18n.t('collectionBtn', { n: unlocked, m: chars.length }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(this.cx, height * 0.11, i18n.t('tapToView'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.6);

    // сетка 3 колонки
    const cols = 3, cellW = 200, cellH = 168, gapX = 16, gapY = 14;
    const gridW = cols * cellW + (cols - 1) * gapX;
    const x0 = this.cx - gridW / 2 + cellW / 2;
    const y0 = height * 0.20;
    chars.forEach((c, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = x0 + col * (cellW + gapX);
      const y = y0 + row * (cellH + gapY);
      this.buildCell(c, x, y, cellW, cellH);
    });

    createButton(this, this.cx, height * 0.95, i18n.t('back'),
      () => this.scene.start('Menu'), { color: THEME.colors.neutral, textColor: THEME.colors.text });
  }

  state(c) {
    const n = (this.charMet || {})[c.key] || 0;
    if (n <= 0) return 'locked';
    if (n < BALANCE.friendAt) return 'seen';
    return 'friend';
  }

  buildCell(c, x, y, w, h) {
    const st = this.state(c);
    const g = this.add.graphics();
    g.fillStyle(st === 'locked' ? 0x1a2733 : c.color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);
    const items = [g];
    if (st === 'locked') {
      items.push(this.add.text(0, 0, '?', { fontFamily: THEME.fontFamily, fontSize: '56px', color: '#5b6b78', fontStyle: 'bold' }).setOrigin(0.5));
    } else {
      const pk = 'portrait_' + c.key;
      const img = this.add.image(0, -22, pk).setOrigin(0.5);
      if (this.textures.exists(pk)) img.setScale(112 / img.height);
      items.push(img);
      items.push(this.add.text(0, 52, i18n.pick(c.name), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffffff', fontStyle: 'bold',
        align: 'center', wordWrap: { width: w - 16 },
      }).setOrigin(0.5));
      if (st === 'friend') {
        items.push(this.add.text(0, h / 2 - 16, '★', { fontSize: '22px', color: '#ffd54f' }).setOrigin(0.5));
      }
    }
    const cell = this.add.container(x, y, items);
    cell.setSize(w, h);
    Input.makeSelectable(cell, () => this.openDetail(c));
  }

  openDetail(c) {
    if (this.detail) this.detail.destroy();
    const { width, height } = this.scale;
    const st = this.state(c);
    const n = (this.charMet || {})[c.key] || 0;
    const o = this.add.container(0, 0);
    const blocker = this.add.rectangle(this.cx, height / 2, width, height, 0x0e1620, 0.9).setOrigin(0.5).setInteractive();
    blocker.on('pointerup', () => { o.destroy(); this.detail = null; });
    o.add(blocker);
    o.add(createPanel(this, this.cx, height * 0.5, width * 0.86, height * 0.7));

    if (st === 'locked') {
      o.add(this.add.text(this.cx, height * 0.34, '?', { fontFamily: THEME.fontFamily, fontSize: '90px', color: '#5b6b78', fontStyle: 'bold' }).setOrigin(0.5));
      o.add(this.add.text(this.cx, height * 0.48, i18n.t('charLocked'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
      }).setOrigin(0.5));
    } else {
      const pk = 'portrait_' + c.key;
      const pimg = this.add.image(this.cx, height * 0.21, pk).setOrigin(0.5);
      if (this.textures.exists(pk)) pimg.setScale(150 / pimg.height);
      o.add(pimg);
      o.add(this.add.text(this.cx, height * 0.30, i18n.pick(c.name), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
      if (c.tagline) {
        o.add(this.add.text(this.cx, height * 0.355, '«' + i18n.pick(c.tagline) + '»', {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54f',
        }).setOrigin(0.5));
      }
      o.add(this.add.text(this.cx, height * 0.40, i18n.t('metCount', { n }), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      }).setOrigin(0.5).setAlpha(0.55));
      if (st === 'friend') {
        o.add(this.add.text(this.cx, height * 0.45, i18n.pick(c.bio), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
          align: 'center', wordWrap: { width: width * 0.74 }, lineSpacing: 6,
        }).setOrigin(0.5, 0));
      } else {
        o.add(this.add.text(this.cx, height * 0.47, i18n.t('charSeenHint', { n: BALANCE.friendAt - n }), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
          align: 'center', wordWrap: { width: width * 0.74 },
        }).setOrigin(0.5, 0).setAlpha(0.8));
      }
    }

    o.add(createButton(this, this.cx, height * 0.80, i18n.t('back'),
      () => { o.destroy(); this.detail = null; }, { color: THEME.colors.neutral, textColor: THEME.colors.text }));
    this.detail = o;
  }
}
