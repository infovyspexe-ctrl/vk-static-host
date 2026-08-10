// «Обереги» — дерево прокачки деревни (SkillTreeModel через src/meta/progress.js).
import { THEME } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { META_BRANCH_ORDER } from '../data/metaTree.js';
import { START_KIT } from '../data/metaTree.js';
import { buyBranch, buyStartKitLevel } from '../meta/progress.js';
import { createCurrencyLabel } from './currencyLabel.js';

export class UpgradesOverlay {
  constructor(scene) {
    this.scene = scene;
    this._navItems = [];
    Input.openLayer(scene, 'upgrades');
    this.build();
    Input.closeLayer(scene, 'upgrades');
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
    this.root = s.add.container(0, 0).setDepth(300).setScrollFactor(0);
    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x0a0714, 1).setInteractive();
    this.root.add(bg);

    this.title = s.add.text(width / 2, 70, i18n.t('upgradesButton'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add(this.title);
    this.sparksLabel = createCurrencyLabel(s, width / 2, 118, 'currency_sparks',
      { align: 'center', fontSize: THEME.fontSize.normal, iconSize: 24 });
    this.root.add(this.sparksLabel.icon);
    this.root.add(this.sparksLabel.text);

    const rowH = 120, top = 190;
    this.rows = META_BRANCH_ORDER.map((branch, i) => this.buildRow(width, top + i * rowH, branch));

    const kitTop = top + META_BRANCH_ORDER.length * rowH + 20;
    this.kitPanel = createPanel(s, width / 2, kitTop, width - 60, 100);
    this.root.add(this.kitPanel);
    this.kitText = s.add.text(width / 2, kitTop - 22, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text
    }).setOrigin(0.5);
    this.root.add(this.kitText);
    this.kitBtn = this.btn(width / 2, kitTop + 28, '', () => this.buyKit(), { fontSize: THEME.fontSize.small });
    this.root.add(this.kitBtn);

    this.closeBtn = this.btn(width / 2, height - 62, i18n.t('close'), () => this.close(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.closeBtn);
  }

  buildRow(width, y, branch) {
    const s = this.scene;
    const panel = createPanel(s, width / 2, y, width - 60, 96);
    this.root.add(panel);
    const name = s.add.text(50, y - 24, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text, fontStyle: 'bold'
    });
    this.root.add(name);
    const desc = s.add.text(50, y + 10, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
      wordWrap: { width: width - 250 }
    });
    this.root.add(desc);
    const btn = this.btn(width - 130, y, '', () => this.buy(branch), { fontSize: THEME.fontSize.small });
    this.root.add(btn);
    return { branch, name, desc, btn };
  }

  buy(branch) {
    if (buyBranch(this.progress, branch)) this.refresh();
  }

  buyKit() {
    if (buyStartKitLevel(this.progress)) this.refresh();
  }

  open(progress) {
    this.progress = progress;
    this.root.setVisible(true);
    Input.openLayer(this.scene, 'upgrades');
    for (const it of this._navItems) Input.register(this.scene, it.obj, it.onSelect, {});
    this.refresh();
  }

  close() {
    Input.closeLayer(this.scene, 'upgrades');
    this.root.setVisible(false);
    if (this.scene.refresh) this.scene.refresh();
  }

  refresh() {
    if (!this.progress) return;
    this.sparksLabel.setValue(this.progress.sparks);
    for (const row of this.rows) {
      const level = this.progress.tree.level(row.branch);
      const cost = this.progress.tree.nextCost(row.branch);
      const pct = Math.round((this.progress.tree.multiplier(row.branch) - 1) * 100);
      row.name.setText(i18n.t('branch_' + row.branch) + '  Lv.' + level);
      row.desc.setText(i18n.t('branch_' + row.branch + '_desc') + ' (+' + pct + '%)');
      row.btn.setLabel(i18n.t('buyButton', { cost }));
      row.btn.setAlpha(this.progress.sparks >= cost ? 1 : 0.55);
    }
    const next = START_KIT.levels[this.progress.startKitLevel];
    if (next) {
      this.kitText.setText(i18n.t('startKit_' + next.id));
      this.kitBtn.setLabel(i18n.t('buyButton', { cost: next.cost }));
      this.kitBtn.setAlpha(this.progress.sparks >= next.cost ? 1 : 0.55);
    } else {
      this.kitText.setText(i18n.t('maxedOut'));
      this.kitBtn.setLabel(i18n.t('maxedOut'));
      this.kitBtn.setAlpha(0.4);
    }
  }
}
