// ПРОСМОТР ОБЕРЕГОВ. Список «значок — название — что делает». Описание боевых оберегов
// собирается из их же эффектов (`cardText.relicDescription`), поэтому не может разойтись
// с тем, что реально делает движок.
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { openOverlay, scrollArea } from './Overlay.js';
import { relicDescription } from './cardText.js';
import { CATALOG } from '../data/catalog.js';

export function openRelicViewer(scene, relicIds) {
  const { width } = scene.scale;
  const ROW = 96;

  return openOverlay(scene, {
    title: i18n.t('relicsWord') + ' — ' + relicIds.length,
    build: (api) => {
      const areaTop = api.top + 78;
      const areaH = api.boxH - 150;
      const area = scrollArea(scene, api, width / 2, areaTop + areaH / 2, width - 70, areaH);

      if (!relicIds.length) {
        area.content.add(scene.add.text(width / 2, areaTop + 40, '—', {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.textDim,
        }).setOrigin(0.5));
        area.setContentHeight(80);
        return;
      }

      relicIds.forEach((id, i) => {
        const def = CATALOG.relics[id];
        const y = areaTop + 30 + i * ROW;
        const left = 60;

        const artKey = 'relic_' + def.art;
        if (scene.textures.exists(artKey)) {
          const img = scene.add.image(left + 6, y + 18, artKey);
          img.setScale(Math.min(62 / img.width, 62 / img.height));
          area.content.add(img);
        } else {
          area.content.add(scene.add.circle(left + 6, y + 18, 26, THEME.colors.panelLight)
            .setStrokeStyle(2, THEME.colors.accent));
        }

        area.content.add(scene.add.text(left + 52, y, i18n.t('relic_' + id), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
        }).setOrigin(0, 0.5));

        area.content.add(scene.add.text(left + 52, y + 32, relicDescription(id, def), {
          fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
          wordWrap: { width: width - 210 }, lineSpacing: 2,
        }).setOrigin(0, 0.5));
      });

      area.setContentHeight(relicIds.length * ROW + 40);
    },
  });
}
