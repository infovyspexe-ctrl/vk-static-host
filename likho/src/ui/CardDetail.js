// ВСПЛЫВАШКА «?»: подробность по карте. Открывается значком «?» на карте (см. CardView.js).
//
// Сверху — ПОЛНЫЙ текст карты с числами и расшифровкой (тот, что раньше жил на самом лице
// карты). Ниже — по каждому термину его определение (что значит механически). Так лицо
// карты остаётся коротким и крупным, а всё «дофига текста» переезжает сюда по запросу.
//
// Высота окна считается ПО СОДЕРЖИМОМУ замером (не на глаз): у карты бывает 0–4 термина,
// фиксированная высота либо резала бы длинные, либо зияла бы пустотой у коротких.
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { openOverlay } from './Overlay.js';
import { cardDescription, cardKeywords, keywordName, keywordDesc } from './cardText.js';

export function openCardDetail(scene, id, def) {
  const { width, height } = scene.scale;
  const wrap = width - 120;
  const full = cardDescription(def);
  const kws = cardKeywords(def).map((kw) => ({ name: keywordName(kw), desc: keywordDesc(kw) }));

  const descStyle = { fontFamily: THEME.fontUi, fontSize: '20px', color: THEME.colors.text, align: 'center', wordWrap: { width: wrap } };
  const nameStyle = { fontFamily: THEME.fontFamily, fontSize: '20px', color: THEME.colors.accentText, fontStyle: 'bold', align: 'center' };
  const kwDescStyle = { fontFamily: THEME.fontUi, fontSize: '18px', color: THEME.colors.textDim, align: 'center', wordWrap: { width: wrap } };

  // Замер: строим тексты скрытыми, суммируем реальную высоту, потом удаляем.
  const scratch = [];
  const measure = (str, style) => { const t = scene.add.text(0, -9999, str, style).setVisible(false); scratch.push(t); return t.height; };
  let contentH = measure(full, descStyle) + 22;
  for (const k of kws) contentH += 10 + measure(k.name, nameStyle) + 4 + measure(k.desc, kwDescStyle) + 12;
  scratch.forEach((t) => t.destroy());

  // 84 сверху под заголовок + contentH + 72 снизу под кнопку «Закрыть».
  const boxH = Math.min(height - 60, Math.max(240, 84 + contentH + 72));

  openOverlay(scene, {
    title: i18n.t('card_' + id),
    height: boxH,
    build: (api) => {
      let y = api.top + 84;
      const desc = api.add(scene.add.text(width / 2, y, full, descStyle).setOrigin(0.5, 0));
      y += desc.height + 18;
      for (const k of kws) {
        const nm = api.add(scene.add.text(width / 2, y, k.name, nameStyle).setOrigin(0.5, 0));
        y += nm.height + 4;
        const ds = api.add(scene.add.text(width / 2, y, k.desc, kwDescStyle).setOrigin(0.5, 0));
        y += ds.height + 12;
      }
    },
  });
}
