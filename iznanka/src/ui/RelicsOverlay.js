// Список подобранных за текущий забег реликвий (иконка+имя+описание+счётчик). Заменил
// собой безымянную полоску мелких иконок в HUD — жалоба живого плейтеста: «иконка сама по
// себе ничего не говорит, нужно название/описание, и это должно масштабироваться хоть на
// 100 реликвий». Масштабируется тривиально: реликвий в игре всего 12 типов (RELICS), повторы
// сворачиваются в счётчик ×N, так что строк никогда не бывает больше 12 — обычный список без
// прокрутки, тот же паттерн, что и в AchievementsOverlay.
import { THEME } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { RELICS } from '../data/relics.js';

export class RelicsOverlay {
  constructor(scene) {
    this.scene = scene;
    this._navItems = [];
    Input.openLayer(scene, 'relics');
    this.build();
    Input.closeLayer(scene, 'relics');
    this.root.setVisible(false);
  }

  btn(x, y, label, onClick, opts) {
    const b = createButton(this.scene, x, y, label, onClick, opts);
    this._navItems.push({ obj: b, onSelect: onClick });
    return b;
  }

  build() {
    const s = this.scene;
    const { width, height } = s.scale;
    this.width = width;
    this.root = s.add.container(0, 0).setDepth(300).setScrollFactor(0);
    // Полностью непрозрачный — при частичной прозрачности сквозь список просвечивали кнопки
    // GameScene под оверлеем («4 плашки справа», жалоба плейтеста).
    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x0a0714, 1).setInteractive();
    this.root.add(bg);

    // y=76, не 56: у крупного кегля верх букв стоял впритык к краю экрана (дефект найден
    // при съёмке витрины 06.08 — заголовок читался как обрезанный).
    this.title = s.add.text(width / 2, 76, i18n.t('relicsTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add(this.title);

    this.emptyText = s.add.text(width / 2, height * 0.4, i18n.t('relicsEmpty'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
      align: 'center', wordWrap: { width: width - 140 }
    }).setOrigin(0.5);
    this.root.add(this.emptyText);

    this.rowH = 100;
    this.rowTop = 140;
    this.rows = RELICS.map((relic) => this.buildRow(relic));

    this.closeBtn = this.btn(width / 2, height - 56, i18n.t('close'), () => this.close(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.closeBtn);
  }

  buildRow(relic) {
    const s = this.scene;
    const width = this.width;
    // Позиция выставляется в refresh() (только у ВЛАДЕЕМЫХ реликвий, без дыр в списке) —
    // здесь достаточно создать объекты один раз.
    // Панель рисуется в (0,0): createPanel РИСУЕТ прямоугольник с центром в переданных
    // координатах внутри Graphics, а refresh() потом двигает сам Graphics через
    // setPosition — при создании в (width/2, 0) смещения СКЛАДЫВАЛИСЬ, и центр панели
    // уезжал в x=720, за правый край экрана (реальный дефект, найден при съёмке витрины
    // 06.08: панели торчали за экран, текст лежал мимо них).
    const panel = createPanel(s, 0, 0, width - 60, 86);
    this.root.add(panel);
    const icon = s.add.image(66, 0, relic.icon);
    icon.setScale(52 / Math.max(icon.width, icon.height));
    this.root.add(icon);
    const name = s.add.text(108, 0, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.root.add(name);
    const desc = s.add.text(108, 0, '', {
      fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.textDim,
      wordWrap: { width: width - 250 }
    }).setOrigin(0, 0.5);
    this.root.add(desc);
    return { relic, panel, icon, name, desc };
  }

  // relicsArray — state.relics (список id, с повторами в порядке подбора).
  open(relicsArray) {
    this.root.setVisible(true);
    Input.openLayer(this.scene, 'relics');
    for (const it of this._navItems) Input.register(this.scene, it.obj, it.onSelect, {});
    this.refresh(relicsArray);
  }

  close() {
    Input.closeLayer(this.scene, 'relics');
    this.root.setVisible(false);
  }

  get visible() { return this.root.visible; }

  refresh(relicsArray) {
    const counts = {};
    for (const id of relicsArray) counts[id] = (counts[id] || 0) + 1;

    let slot = 0;
    for (const row of this.rows) {
      const count = counts[row.relic.id] || 0;
      const owned = count > 0;
      row.panel.setVisible(owned);
      row.icon.setVisible(owned);
      row.name.setVisible(owned);
      row.desc.setVisible(owned);
      if (!owned) continue;

      const y = this.rowTop + slot * this.rowH;
      row.panel.setPosition(this.width / 2, y);
      row.icon.setPosition(66, y);
      row.name.setPosition(108, y - 20).setText(
        i18n.t('relic_' + row.relic.id) + (count > 1 ? '  ×' + count : '')
      );
      row.desc.setPosition(108, y + 16).setText(i18n.t('relic_' + row.relic.id + '_desc'));
      slot++;
    }
    this.emptyText.setVisible(slot === 0);
  }
}
