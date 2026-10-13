import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { addWorldBackdrop } from '../ui/gameArt.js';
import { Input } from '../core/input.js';
import { Save } from '../yandex/save.js';
import { toSave } from '../core/progress.js';
import { saveBlueprint, previewBlueprint, deployBlueprint } from '../core/blueprints.js';
import { i18n } from '../i18n/strings.js';

export class BlueprintScene extends Phaser.Scene {
  constructor() { super('Blueprint'); }
  init(data) { this.progress = data.progress; this.confirmSlot = null; }
  text(x, y, text, size = 22, wrap = 0) {
    return this.add.text(x, y, text, { fontFamily: THEME.fontFamily,
      fontSize: size, color: THEME.colors.text, wordWrap: wrap ? { width: wrap } : undefined });
  }
  button(x, y, key, action, enabled = true) {
    return createButton(this, x, y, key, enabled ? action : null, {
      fontSize: '21px', paddingX: 20, paddingY: 12,
      color: enabled ? THEME.colors.primary : THEME.colors.panel,
      textColor: enabled ? THEME.colors.primaryText : THEME.colors.neutralText,
    });
  }
  persist() { Save.update(toSave(this.progress)); Save.flush(); }
  create() {
    Input.setup(this);
    addWorldBackdrop(this);
    this.text(44, 28, i18n.t('blueprint.title'), 36);
    this.text(44, 84, i18n.t('blueprint.help'), 21, 1180);
    this.text(44, 145, i18n.t('build.gold', { n: this.progress.gold }), 24);
    this.slotButtons = [];
    for (let i = 0; i < 3; i++) {
      const x = 44 + i * 407, cx = x + 190;
      const g = this.add.graphics();
      g.fillStyle(THEME.colors.panel, .88); g.fillRoundedRect(x, 195, 378, 423, 12);
      g.lineStyle(2, THEME.colors.neutral, .5); g.strokeRoundedRect(x, 195, 378, 423, 12);
      this.text(x + 20, 211, i18n.t('blueprint.slot', { n: i + 1 }), 25);
      const preview = previewBlueprint(this.progress, i);
      if (preview.base) {
        const cells = [...preview.base.cells.values()];
        const maxY = Math.max(1, ...cells.map(c => c.y));
        const s = Math.min(320 / this.progress.width, 155 / maxY);
        const left = cx - this.progress.width * s / 2;
        g.lineStyle(2, THEME.colors.neutral, .6); g.lineBetween(left, 426, left + this.progress.width*s, 426);
        for (const c of cells) this.add.image(left + (c.x+.5)*s, 426-(c.y-.5)*s,
          `notebook-${c.typeId}`).setDisplaySize(s, s);
        this.text(x + 20, 441, i18n.t(preview.ok ? 'blueprint.balance' : 'blueprint.missing',
          { n: preview.ok ? preview.gold : preview.missing }), 20);
      } else this.text(x + 20, 321, i18n.t(preview.reason === 'empty' ? 'blueprint.empty' : 'blueprint.invalid'), 21, 334);
      const save = this.button(cx, 510, i18n.t('blueprint.save'), () => {
        if (this.progress.blueprints[i]?.length && this.confirmSlot !== i) {
          this.confirmSlot = i;
          this.slotButtons.forEach((b, j) => b.setLabel(i18n.t(j === i ? 'blueprint.confirm' : 'blueprint.save')));
          return;
        }
        if (saveBlueprint(this.progress, i)) { this.persist(); this.scene.restart({ progress: this.progress }); }
      }, this.progress.base.cells.size > 0);
      this.slotButtons.push(save);
      this.button(cx, 576, i18n.t('blueprint.deploy'), () => {
        if (deployBlueprint(this.progress, i).ok) { this.persist(); this.scene.start('Build', { progress: this.progress }); }
      }, preview.ok);
    }
    this.button(640, 672, i18n.t('blueprint.back'), () => this.scene.start('Build', { progress: this.progress }));
  }
}
