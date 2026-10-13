import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Save } from '../yandex/save.js';
import { Input } from '../core/input.js';
import { buyUpgradeLine, buyBlockUpgrade, chooseBranch, payPerekovka, toSave } from '../core/progress.js';
import { unitLevel, canTransform, lineCost, MILESTONE } from '../mechanics/unitupgrade/progression.js';
import { effectiveSpec, perekovkaCost } from '../mechanics/unitupgrade/forge.js';
import { UNITS, formFor } from '../data/units.js';
import { addWorldBackdrop } from '../ui/gameArt.js';
import { BLOCKS } from '../data/blocks.js';
import { blockUpgradeCost, effectiveBlockSpec } from '../mechanics/blockupgrade/fortify.js';
import { tutorialStep } from '../core/tutorial.js';
import { tutorialGuide } from '../ui/tutorialGuide.js';
import { isArsenalUnlocked, unlockLevel } from '../data/arsenal.js';

export class UpgradeScene extends Phaser.Scene {
  constructor() { super('Upgrade'); }
  init(data) {
    this.progress = data.progress;
    this.selectedId = data.selectedId ?? 'archer';
    this.selectedBlockId = data.selectedBlockId ?? 'brick';
    this.tab = data.tab ?? 'units';
  }
  text(x, y, value, size = 22, color = THEME.colors.text, wrap = 0) {
    return this.add.text(x, y, value, { fontFamily: THEME.fontFamily, fontSize: size + 'px', color,
      wordWrap: wrap ? { width: wrap } : undefined });
  }
  panel(x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(THEME.colors.panel, .94); g.fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(1.5, THEME.colors.neutral, .5); g.strokeRoundedRect(x, y, w, h, 12);
  }
  button(x, y, label, action, enabled = true, width = 210) {
    const btn = createButton(this, x, y, label, enabled ? action : null, {
      fontSize: '20px', paddingX: 16, paddingY: 10,
      color: enabled ? THEME.colors.primary : THEME.colors.panel,
      textColor: enabled ? THEME.colors.primaryText : THEME.colors.neutralText });
    if (btn.width > width) btn.setScale(width / btn.width);
    btn.off('pointerover'); btn.off('pointerout');
    if (!enabled) btn.disableInteractive();
    return btn;
  }
  create() {
    Input.setup(this);
    addWorldBackdrop(this, { shade: .3 });
    const guided = tutorialStep(this.progress) === 'upgrade';
    if (guided) { this.selectedId = 'archer'; this.tab = 'units'; }
    this.text(40, 26, i18n.t('upgrade.title'), 36);
    this.text(1200, 36, i18n.t('build.gold', { n: this.progress.gold }), 26, THEME.colors.accentText).setOrigin(1, 0);
    if (!guided) {
      const unitsTab = this.button(420, 46, i18n.t('upgrade.unitsTab'), () => this.restart('units'), true, 190);
      const blocksTab = this.button(625, 46, i18n.t('upgrade.blocksTab'), () => this.restart('blocks'), true, 190);
      unitsTab.setBgColor(this.tab === 'units' ? THEME.colors.primary : THEME.colors.neutral);
      blocksTab.setBgColor(this.tab === 'blocks' ? THEME.colors.primary : THEME.colors.neutral);
    }
    if (this.tab === 'blocks' && !guided) return this.createBlocks();
    const baseId = this.selectedId, state = this.progress.unitLevels[baseId], base = UNITS[baseId];
    const form = state.branch ? formFor(baseId, state.branch) : null;
    const current = effectiveSpec({ base, state, form });
    this.text(40, 74, i18n.t('upgrade.help'), 21, THEME.colors.neutralText);
    Object.keys(UNITS).forEach((id, index) => {
      if (guided && id !== 'archer') return;
      const y = 150 + index * 92;
      this.panel(32, y - 12, 270, 80);
      const unlocked = isArsenalUnlocked(this.progress,'unit',id);
      const label = unlocked ? i18n.t('unit.' + id) : i18n.t('upgrade.opensAt',{n:unlockLevel('unit',id)});
      const btn = this.button(194, y + 27, label,
        () => this.scene.restart({ progress: this.progress, selectedId: id }), unlocked, 184);
      btn.setBgColor(!unlocked ? THEME.colors.panel : id === baseId ? THEME.colors.primary : THEME.colors.neutral);
      this.add.image(76, y + 27, 'notebook-' + id).setDisplaySize(64, 64).setAlpha(unlocked?1:.28);
    });
    this.add.image(373, 154, 'notebook-' + current.id).setDisplaySize(78, 78);
    this.text(427, 129, i18n.t('unit.' + current.id), 30);
    this.text(427, 171, i18n.t('upgrade.level', { n: unitLevel(state) }), 20, THEME.colors.neutralText);
    ['hp', 'damage', 'cooldown'].forEach((line, index) => {
      if (guided && line !== 'damage') return;
      const x = 330 + index * 300;
      this.panel(x, 219, 280, 178);
      this.text(x + 18, 236, i18n.t('upgrade.' + (line === 'hp' ? 'health' : line)), 23);
      const next = effectiveSpec({ base, state: { ...state, [line]: state[line] + 1 }, form });
      const format = v => line === 'cooldown' ? i18n.t('upgrade.seconds', { n: Number(v.toFixed(2)) }) : String(Number(v.toFixed(2)));
      const values = this.text(x + 18, 277, format(current[line]) + ' → ' + format(next[line]), 29, THEME.colors.successText);
      if (values.width > 244) values.setScale(244 / values.width);
      const cost = lineCost(base.cost, state[line] + 1);
      this.button(x + 140, 357, i18n.t('upgrade.buy', { n: cost }), () => {
        if (buyUpgradeLine(this.progress, baseId, line).ok) this.persistAndRefresh();
      }, cost <= this.progress.gold, 246);
    });
    if (!guided) this.text(330, 420, i18n.t('upgrade.specialization'), 27);
    const ready = canTransform(state);
    if (!guided && !state.branch && !ready) this.text(330, 457,
      i18n.t('upgrade.unlock', { n: MILESTONE - unitLevel(state) }), 20, THEME.colors.neutralText);
    for (const [index, branch] of ['A', 'B'].entries()) {
      if (guided) continue;
      const x = 330 + index * 450, option = formFor(baseId, branch);
      this.panel(x, 494, 430, 190);
      this.add.image(x + 47, 539, 'notebook-' + option.id).setDisplaySize(68, 68);
      this.text(x + 90, 506, i18n.t('unit.' + option.id), 22, THEME.colors.text, 323);
      this.text(x + 90, 556, i18n.t('upgrade.effect.' + option.id), 17, THEME.colors.neutralText, 322);
      const chosen = state.branch === branch;
      const cost = state.branch ? perekovkaCost(base.cost, state) : 0;
      const enabled = !chosen && (state.branch ? cost <= this.progress.gold : ready);
      const label = chosen ? i18n.t('upgrade.chosen') : state.branch ? i18n.t('upgrade.change', { n: cost })
        : ready ? i18n.t('upgrade.choose') : i18n.t('upgrade.locked');
      this.button(x + 215, 651, label, () => {
        const result = state.branch ? payPerekovka(this.progress, baseId) : chooseBranch(this.progress, baseId, branch);
        if (result.ok) this.persistAndRefresh();
      }, enabled, 390);
    }
    this.button(170, 674, i18n.t('upgrade.back'), () => this.scene.start('Build', { progress: this.progress }));
    if (guided) {
      const guide = tutorialGuide(this, 'buyUpgrade', () => {
        this.progress.tutorial = 'done'; this.persistAndRefresh();
      }, { x: 330, y: 430, width: 580 });
      guide.highlight(770, 357, 246, 48);
    }
  }
  createBlocks() {
    this.text(40, 88, i18n.t('upgrade.blocksHelp'), 20, THEME.colors.neutralText);
    Object.keys(BLOCKS).forEach((id, index) => {
      const y = 150 + index * 92;
      this.panel(32, y - 12, 270, 80);
      const unlocked = isArsenalUnlocked(this.progress,'block',id);
      const label = unlocked ? i18n.t('block.' + id) : i18n.t('upgrade.opensAt',{n:unlockLevel('block',id)});
      const btn = this.button(194, y + 27, label,
        () => { this.selectedBlockId = id; this.restart('blocks'); }, unlocked, 184);
      btn.setBgColor(!unlocked ? THEME.colors.panel : id === this.selectedBlockId ? THEME.colors.primary : THEME.colors.neutral);
      this.add.image(76, y + 27, 'notebook-' + id).setDisplaySize(64, 64).setAlpha(unlocked?1:.28);
    });
    const id = this.selectedBlockId;
    const block = BLOCKS[id];
    const level = this.progress.blockLevels[id];
    const current = effectiveBlockSpec(block, level);
    const next = effectiveBlockSpec(block, level + 1);
    const cost = blockUpgradeCost(block, level + 1);
    this.add.image(385, 177, 'notebook-' + id).setDisplaySize(92, 92);
    this.text(450, 142, i18n.t('block.' + id), 32);
    this.text(450, 184, i18n.t('upgrade.level', { n: level }), 20, THEME.colors.neutralText);
    this.panel(330, 246, 590, id === 'shield' ? 252 : 210);
    this.text(360, 274, i18n.t('upgrade.durability'), 25);
    this.text(360, 320, `${current.hp} → ${next.hp}`, 34, THEME.colors.successText);
    if (id === 'shield') {
      this.text(360, 370, i18n.t('upgrade.reflection'), 21, THEME.colors.neutralText);
      this.text(600, 370, `${Math.round(current.reflect * 100)}% → ${Math.round(next.reflect * 100)}%`, 23, THEME.colors.successText);
    }
    this.button(625, id === 'shield' ? 454 : 414, i18n.t('upgrade.buy', { n: cost }), () => {
      if (buyBlockUpgrade(this.progress, id).ok) this.persistAndRefresh();
    }, cost <= this.progress.gold, 360);
    this.text(330, 535, i18n.t('upgrade.blocksNote'), 20, THEME.colors.neutralText, 650);
    this.button(170, 674, i18n.t('upgrade.back'), () => this.scene.start('Build', { progress: this.progress }));
  }
  restart(tab = this.tab) {
    this.scene.restart({ progress: this.progress, selectedId: this.selectedId, selectedBlockId: this.selectedBlockId, tab });
  }
  persistAndRefresh() {
    Save.update(toSave(this.progress)); Save.flush();
    this.restart();
  }
}
