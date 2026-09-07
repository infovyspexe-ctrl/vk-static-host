// ПРОСМОТР КОЛОДЫ. Нужен в четырёх местах (карта, костёр, торговец, награда), поэтому
// один модуль с режимом выбора, а не четыре похожих окна.
//
// Режим выбора (`onPick`) заодно решает задачу «наточить карту» и «выжечь карту»:
// сцена передаёт фильтр доступных карт и колбэк, окно ничего про костёр и торговца не знает.
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { openOverlay, scrollArea } from './Overlay.js';
import { createCardView, CARD_W, CARD_H } from './CardView.js';
import { cardView } from '../mechanics/deckrun/combat.js';
import { CATALOG } from '../data/catalog.js';

const COLS = 3;

export function openDeckViewer(scene, deck, opts = {}) {
  const { width, height } = scene.scale;
  const scale = 0.62;
  const cw = CARD_W * scale;
  const ch = CARD_H * scale;
  const gapX = 18;
  const gapY = 16;

  return openOverlay(scene, {
    title: opts.title || (i18n.t('deck') + ' — ' + deck.length),
    build: (api) => {
      const areaTop = api.top + 78;
      const areaH = api.boxH - 150;
      const area = scrollArea(scene, api, width / 2, areaTop + areaH / 2, width - 70, areaH);

      // Порядок: сначала играбельные по стоимости, потом порча. Колода в 30 карт без
      // сортировки читается как свалка, и игрок перестаёт ей пользоваться.
      const sorted = deck.slice().sort((a, b) => {
        const da = cardView(CATALOG.cards[a.id], a.upgraded);
        const db = cardView(CATALOG.cards[b.id], b.upgraded);
        const ra = da.type === 'curse' ? 9 : 0;
        const rb = db.type === 'curse' ? 9 : 0;
        return (ra - rb) || (da.cost - db.cost) || a.id.localeCompare(b.id);
      });

      const rows = Math.ceil(sorted.length / COLS);
      const totalW = cw * COLS + gapX * (COLS - 1);
      sorted.forEach((card, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const def = cardView(CATALOG.cards[card.id], card.upgraded);
        const x = width / 2 - totalW / 2 + cw / 2 + col * (cw + gapX);
        const y = areaTop + ch / 2 + row * (ch + gapY);
        const v = createCardView(scene, x, y, card.id, def, { scale, upgraded: card.upgraded });
        area.content.add(v);

        const pickable = opts.onPick && (!opts.canPick || opts.canPick(card));
        if (pickable) {
          v.setInteractive({ useHandCursor: true });
          v.on('pointerup', () => { api.close(); opts.onPick(card); });
        } else if (opts.onPick) {
          v.setDim(true);
        }
      });
      area.setContentHeight(rows * (ch + gapY) + 20);
    },
  });
}
