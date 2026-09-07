// ТОРГОВЕЦ. Карты, обереги и — главное — выжигание карты из колоды.
//
// Выжигание стоит дороже любой карты намеренно: в делибилдере убрать слабую карту почти
// всегда сильнее, чем добавить хорошую, и цена обязана это отражать. Иначе «удалить
// Удар» становится очевидной покупкой, и торговец перестаёт быть выбором.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, toast, panel } from '../ui/widgets.js';
import { createCardView, CARD_W, CARD_H } from '../ui/CardView.js';
import { cardView } from '../mechanics/deckrun/combat.js';
import { openDeckViewer } from '../ui/DeckViewer.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { CATALOG } from '../data/catalog.js';
import { relicDescription } from '../ui/cardText.js';

export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    this.run = Session.run;
    this.stock = this.run.state.pending && this.run.state.pending.stock;
    if (!this.stock) { this.scene.start('Map'); return; }

    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);
    heading(this, width / 2, 96, i18n.t('shopTitle'));

    this.goldText = this.add.text(width / 2, 148, '', {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.gold,
    }).setOrigin(0.5);

    this.cardLayer = this.add.container(0, 0);
    this.relicLayer = this.add.container(0, 0);
    this.renderStock();
    this.renderGold();

    this.removeBtn = createButton(this, width / 2, height - 190,
      i18n.t('shopRemove') + ' — ' + this.stock.removePrice, () => this.removeCard(), {
        color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small,
      });

    createButton(this, width / 2, height - 100, i18n.t('leaveShop'), () => {
      // Покупки сами по себе безопасны (item.sold пишется в тот же объект, что уходит
      // в сейв), но без этого reload ПОСЛЕ ухода снова открывал лавку вместо карты.
      this.run.clearPending();
      Session.saveRun();
      Input.goTo(this, 'Map');
    }, { color: THEME.colors.primary });
  }

  renderGold() {
    this.goldText.setText('⛁ ' + this.run.state.gold);
    if (this.removeBtn) this.removeBtn.setAlpha(this.stock.removed ? 0.4 : 1);
  }

  renderStock() {
    const { width } = this.scale;
    this.cardLayer.removeAll(true);
    this.relicLayer.removeAll(true);

    // Карты — сеткой 2×2, чтобы описание оставалось читаемым на телефоне.
    const scale = 0.72;
    const cw = CARD_W * scale;
    const ch = CARD_H * scale;
    this.stock.cards.forEach((item, i) => {
      if (item.sold) return;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = width / 2 + (col === 0 ? -1 : 1) * (cw / 2 + 26);
      const y = 300 + row * (ch + 66);
      const def = cardView(CATALOG.cards[item.id], false);
      const v = createCardView(this, x, y, item.id, def, { scale });
      const affordable = this.run.state.gold >= item.price;
      v.setDim(!affordable);
      v.setInteractive({ useHandCursor: true });
      v.on('pointerup', () => this.buyCard(i));
      this.cardLayer.add(v);
      const price = this.add.text(x, y + ch / 2 + 20, '⛁ ' + item.price, {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small,
        color: affordable ? THEME.colors.gold : THEME.colors.neutralText,
      }).setOrigin(0.5);
      this.cardLayer.add(price);
    });

    // Обереги — строкой с описанием: картинка без пояснения ничего не говорит.
    this.stock.relics.forEach((item, i) => {
      if (item.sold) return;
      const y = 800 + i * 100;
      const def = CATALOG.relics[item.id];
      const affordable = this.run.state.gold >= item.price;
      const p = panel(this, width / 2, y, width - 60, 88, { fill: THEME.colors.panel });
      this.relicLayer.add(p);
      this.relicLayer.add(this.add.text(40, y - 22, i18n.t('relic_' + item.id), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small,
        color: affordable ? THEME.colors.accentText : THEME.colors.neutralText,
      }).setOrigin(0, 0.5));
      this.relicLayer.add(this.add.text(40, y + 14, relicDescription(item.id, def), {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
        wordWrap: { width: width - 200 },
      }).setOrigin(0, 0.5));
      const price = this.add.text(width - 40, y, '⛁ ' + item.price, {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small,
        color: affordable ? THEME.colors.gold : THEME.colors.neutralText,
      }).setOrigin(1, 0.5);
      this.relicLayer.add(price);
      // НАЙДЕНО ЖИВЫМ ИГРОКОМ 22.08 (тянулось через жалобы на схрон/награду — казалось,
      // что дело в тех экранах, а ломалось здесь): `Input.makeSelectable` уже сама вызывает
      // `p.setInteractive({useHandCursor:true})` — а следующей строкой шёл ВТОРОЙ вызов
      // `setInteractive(new Rectangle(...), Contains)` с другой формой. У Graphics без
      // текстуры первый вызов не даёт кликабельной области, поэтому кто-то дописал второй —
      // но Phaser на ПОВТОРНОМ setInteractive() кладёт новый hitArea без парного
      // hitAreaCallback. Один клик/наведение по обережному ряду — и Phaser бросает
      // `hitAreaCallback is not a function` ВНУТРИ своего глобального hit-test'а на КАЖДОЕ
      // движение мыши после этого, для ВСЕХ сцен разом — отсюда «то схрон не открывается,
      // то награда, то магазин», без видимой связи. Плюс pointerup вешался дважды — та же
      // болезнь, что чинили в RewardScene, здесь просто не заметили.
      // Правильный порядок: интерактив с нужной формой ОДИН раз, дальше обычная регистрация
      // без второго setInteractive (Input.register этого не делает, в отличие от makeSelectable).
      p.setInteractive(new Phaser.Geom.Rectangle(30, y - 44, width - 60, 88), Phaser.Geom.Rectangle.Contains);
      p.on('pointerup', () => this.buyRelic(i));
      Input.register(this, p, () => this.buyRelic(i));
    });
  }

  buyCard(i) {
    const item = this.stock.cards[i];
    if (!item || item.sold) return;
    if (this.run.state.gold < item.price) { toast(this, i18n.t('notEnoughGold')); return; }
    this.run.state.gold -= item.price;
    this.run.addCardToDeck(item.id, false);
    item.sold = true;
    Sounds.coin();
    this.renderStock();
    this.renderGold();
    Session.saveRun();
  }

  buyRelic(i) {
    const item = this.stock.relics[i];
    if (!item || item.sold) return;
    if (this.run.state.gold < item.price) { toast(this, i18n.t('notEnoughGold')); return; }
    this.run.state.gold -= item.price;
    this.run.addRelic(item.id);
    item.sold = true;
    Sounds.relic();
    this.renderStock();
    this.renderGold();
    Session.saveRun();
  }

  removeCard() {
    if (this.stock.removed) return;
    if (this.run.state.gold < this.stock.removePrice) { toast(this, i18n.t('notEnoughGold')); return; }
    openDeckViewer(this, this.run.state.deck, {
      title: i18n.t('shopRemoveHint'),
      onPick: (c) => {
        this.run.state.gold -= this.stock.removePrice;
        this.run.removeCardFromDeck(c.uid);
        this.stock.removed = true;
        Sounds.upgrade();
        this.renderGold();
        Session.saveRun();
      },
    });
  }
}
