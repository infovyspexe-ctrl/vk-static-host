// Оверлей магазина: две вкладки — вёдра (геймплей) и шапки (косметика).
// Покупка за гемы, экипировка, вознаграждаемая реклама «+гемы».
import { THEME } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { SFX } from '../core/sfx.js';
import { BUCKETS, HATS, ECONOMY } from '../data/balance.js';
import { BUCKET_COLORS, drawHat } from '../scenes/actors.js';
import { Platform } from '../platform/index.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';

export class ShopOverlay {
  // api: { getGems(), spendGems(n), addGems(n),
  //        getOwned(), getEquipped(), onBuy(id), onEquip(id),          — вёдра
  //        getOwnedHats(), getEquippedHat(), onBuyHat(id), onEquipHat(id) }
  constructor(scene, api) {
    this.scene = scene;
    this.api = api;
    this.tab = 'buckets';
    this.build();
    this.root.iterate((c) => { if (c.setScrollFactor) c.setScrollFactor(0); });
    this.root.setVisible(false);
    this.setInputEnabled(false);
  }

  build() {
    const s = this.scene;
    const { width, height } = s.scale;
    this.root = s.add.container(0, 0).setDepth(200).setScrollFactor(0);

    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78).setInteractive();
    this.root.add(bg);

    this.gemsText = s.add.text(width / 2, 54, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: '#4dd0e1'
    }).setOrigin(0.5);
    this.root.add(this.gemsText);

    // Вкладки.
    this.bucketsTabBtn = createButton(s, width / 2 - 130, 122, i18n.t('bucketsTab'),
      () => this.setTab('buckets'), { fontSize: THEME.fontSize.small });
    this.hatsTabBtn = createButton(s, width / 2 + 130, 122, i18n.t('hatsTab'),
      () => this.setTab('hats'), { fontSize: THEME.fontSize.small });
    this.root.add(this.bucketsTabBtn);
    this.root.add(this.hatsTabBtn);

    // Строки вёдер.
    this.bucketRows = BUCKETS.map((b, i) => this.buildRow(i, {
      kind: 'bucket', id: b.id, price: b.price,
      name: i18n.t('bucket_' + b.id), desc: perkText(b),
      drawIcon: (g, x, y) => {
        if (s.textures.exists('bucket_' + b.id)) return 'img';
        g.fillStyle(BUCKET_COLORS[b.id], 1);
        g.fillTriangle(x - 22, y - 18, x + 22, y - 18, x + 14, y + 20);
        g.fillTriangle(x - 22, y - 18, x - 14, y + 20, x + 14, y + 20);
      }
    }));
    // Строки шапок.
    this.hatRows = HATS.map((h, i) => this.buildRow(i, {
      kind: 'hat', id: h.id, price: h.price,
      name: i18n.t('hat_' + h.id), desc: h.price ? h.price + ' ◆' : '',
      drawIcon: (g, x, y) => {
        g.fillStyle(0xffcc80, 1).fillCircle(x, y + 8, 13); // болванка-голова
        drawHat(g, h.id, x, y + 8);
      }
    }));

    this.adBtn = createButton(s, width / 2, height - 150, i18n.t('gemsAd', { g: ECONOMY.rewardAdGems }),
      () => this.watchAd(), { color: THEME.colors.accent, fontSize: THEME.fontSize.tiny });
    this.root.add(this.adBtn);

    this.closeBtn = createButton(s, width / 2, height - 62, i18n.t('close'), () => this.close(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.closeBtn);
  }

  // Универсальная строка каталога: панель, иконка, имя, описание, кнопка.
  buildRow(i, item) {
    const s = this.scene;
    const { width } = s.scale;
    const y = 190 + i * 92;
    const parts = [];
    const panel = createPanel(s, width / 2, y, width - 60, 82);
    this.root.add(panel); parts.push(panel);

    let icon;
    if (item.kind === 'bucket' && s.textures.exists('bucket_' + item.id)) {
      icon = s.add.image(84, y, 'bucket_' + item.id);
      icon.setScale(70 / Math.max(icon.width, icon.height));
    } else {
      icon = s.add.graphics();
      item.drawIcon(icon, 84, y);
    }
    this.root.add(icon); parts.push(icon);

    const name = s.add.text(134, y - 32, item.name, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text, fontStyle: 'bold'
    });
    this.root.add(name); parts.push(name);
    // Описание перка: перенос шире (356) — длинные вёдра (Золотое) укладываются в 2 строки,
    // а не в 3, и не вылезают в следующую строку каталога. Кнопка справа от x≈500 не задета.
    const desc = s.add.text(134, y - 6, item.desc, {
      fontFamily: THEME.fontFamily, fontSize: '20px', color: THEME.colors.textDim,
      lineSpacing: -2, wordWrap: { width: 356 }
    });
    this.root.add(desc); parts.push(desc);

    const btn = createButton(s, width - 140, y, '', () => this.action(item),
      { fontSize: THEME.fontSize.tiny });
    this.root.add(btn); parts.push(btn);

    // Базовый Y каждой части — чтобы список можно было двигать целиком (layoutRows).
    for (const p of parts) p.__baseY = p.y;
    return { item, btn, parts, y };
  }

  setTab(tab) {
    this.tab = tab;
    this.refresh();
  }

  open() { this.root.setVisible(true); this.setInputEnabled(true); this.refresh(); }
  close() { this.root.setVisible(false); this.setInputEnabled(false); if (this.onClose) this.onClose(); }
  get visible() { return this.root.visible; }

  setInputEnabled(v) {
    this.root.iterate((child) => { if (child.input) child.input.enabled = v; });
    if (v) this.applyTabVisibility();
  }

  // ЦЕНТРИРОВАНИЕ СПИСКА по свободной высоте. Высота сцены теперь зависит от пропорций
  // окна (на вытянутом экране она больше 1280), и короткий список вёдер оставлял снизу
  // пустое поле в пол-экрана. Двигаем блок строк целиком, ничего не пересобирая.
  layoutRows() {
    const rows = this.tab === 'buckets' ? this.bucketRows : this.hatRows;
    if (!rows.length) return;
    const { height } = this.scene.scale;
    const top = rows[0].y - 46;                       // верх первой панели
    const bottom = rows[rows.length - 1].y + 46;      // низ последней
    const areaTop = 160;                              // под вкладками
    const areaBottom = height - 210;                  // над кнопкой «+гемы за рекламу»
    const dy = Math.max(0, Math.round(((areaTop + areaBottom) - (top + bottom)) / 2));
    for (const list of [this.bucketRows, this.hatRows]) {
      for (const row of list) {
        for (const p of row.parts) p.y = p.__baseY + (list === rows ? dy : 0);
      }
    }
  }

  applyTabVisibility() {
    const showBuckets = this.tab === 'buckets';
    for (const row of this.bucketRows) {
      for (const p of row.parts) {
        p.setVisible(showBuckets);
        if (p.input) p.input.enabled = showBuckets && this.root.visible;
      }
    }
    for (const row of this.hatRows) {
      for (const p of row.parts) {
        p.setVisible(!showBuckets);
        if (p.input) p.input.enabled = !showBuckets && this.root.visible;
      }
    }
    this.layoutRows();
  }

  action(item) {
    const isHat = item.kind === 'hat';
    const owned = isHat ? this.api.getOwnedHats() : this.api.getOwned();
    const equipped = isHat ? this.api.getEquippedHat() : this.api.getEquipped();
    if (owned.includes(item.id)) {
      if (equipped !== item.id) {
        (isHat ? this.api.onEquipHat : this.api.onEquip)(item.id);
        SFX.buy();
      }
    } else if (this.api.getGems() >= item.price) {
      this.api.spendGems(item.price);
      (isHat ? this.api.onBuyHat : this.api.onBuy)(item.id);
      Analytics.event(EVENTS.BUCKET_BOUGHT, { id: (isHat ? 'hat_' : '') + item.id });
      SFX.buy();
    } else {
      SFX.deny();
    }
    this.refresh();
  }

  watchAd() {
    Platform.ads.showRewarded({
      onRewarded: () => {
        this.api.addGems(ECONOMY.rewardAdGems);
        Analytics.event(EVENTS.REWARD_AD_SHOWN, { place: 'shop_gems' });
        SFX.gem();
        this.refresh();
      }
    });
  }

  refresh() {
    if (!this.root.visible) return;
    this.gemsText.setText('◆ ' + Math.floor(this.api.getGems()));
    // Неактивная вкладка раньше гасилась до alpha 0.55 — надпись на ней уходила в фон и
    // читалась хуже, чем должна кнопка (отказ VK 02.08 про читаемость). Разница между
    // вкладками теперь держится не прозрачностью, а тем же приёмом, что во всей игре:
    // активная — зелёная, неактивная — серая, обе полностью непрозрачные.
    this.bucketsTabBtn.setAlpha(1);
    this.hatsTabBtn.setAlpha(1);
    this.bucketsTabBtn.setTabActive(this.tab === 'buckets');
    this.hatsTabBtn.setTabActive(this.tab === 'hats');
    this.applyTabVisibility();

    const rows = this.tab === 'buckets' ? this.bucketRows : this.hatRows;
    const isHat = this.tab === 'hats';
    const owned = isHat ? this.api.getOwnedHats() : this.api.getOwned();
    const equipped = isHat ? this.api.getEquippedHat() : this.api.getEquipped();
    for (const row of rows) {
      const id = row.item.id;
      if (equipped === id) row.btn.setLabel(i18n.t('equipped'));
      else if (owned.includes(id)) row.btn.setLabel(i18n.t('equip'));
      else row.btn.setLabel(i18n.t('buy') + ' ' + row.item.price + ' ◆');
    }
  }
}

function perkText(b) {
  const parts = [i18n.t('perk_capacity', { l: b.capacity })];
  if (b.incomeMult) parts.push(i18n.t('perk_income', { p: Math.round((b.incomeMult - 1) * 100) }));
  if (b.magnet) parts.push(i18n.t('perk_magnet'));
  if (b.instantPour) parts.push(i18n.t('perk_instant', { p: Math.round(b.instantPour * 100) }));
  if (b.chestBonusGems) parts.push(i18n.t('perk_chest', { g: b.chestBonusGems }));
  return parts.join(' · ');
}
