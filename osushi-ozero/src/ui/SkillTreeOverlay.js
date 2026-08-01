// Оверлей прокачки: 6 веток строками, в каждой 5 пипсов-уровней и кнопка
// покупки. Логика владения/цен — в mechanics/skilltree, здесь только вид.
// (Радиальная гекс-сетка v1 не вместила 5 уровней и имела больной хит-тест.)
import { THEME } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { SFX } from '../core/sfx.js';
import { TELEPORT_COOLDOWNS, PUMP } from '../data/balance.js';

const BRANCH_ORDER = ['fill', 'capacity', 'income', 'pour', 'sprint', 'teleport', 'pump'];
const ROW_STEP = 132;
const ROW_H = 120;

export class SkillTreeOverlay {
  // api: { getTokens(), spend(cost), onBought(branch, id) }
  constructor(scene, tree, api) {
    this.scene = scene;
    this.tree = tree;
    this.api = api;
    this.build();
    // Мина Phaser: хит-тест ввода считает по scrollFactor САМОГО ребёнка,
    // а не контейнера. Без этого клики уезжают вместе с прокруткой камеры.
    this.root.iterate((c) => { if (c.setScrollFactor) c.setScrollFactor(0); });
    this.root.setVisible(false);
    this.setInputEnabled(false);
  }

  build() {
    const s = this.scene;
    const { width, height } = s.scale;
    this.root = s.add.container(0, 0).setDepth(200).setScrollFactor(0);

    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setInteractive(); // глушит клики по миру под оверлеем
    this.root.add(bg);

    this.root.add(s.add.text(width / 2, 62, i18n.t('skillsTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5));
    this.tokensText = s.add.text(width / 2, 118, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: '#ffd54f'
    }).setOrigin(0.5);
    this.root.add(this.tokensText);

    this.rows = [];
    BRANCH_ORDER.forEach((branch, i) => {
      const y = 200 + i * ROW_STEP;
      this.root.add(createPanel(s, width / 2, y, width - 60, ROW_H));

      const name = s.add.text(56, y - 48, i18n.t('skill_' + branch), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text, fontStyle: 'bold'
      });
      const desc = s.add.text(56, y - 10, '', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
        wordWrap: { width: 380 }
      });
      this.root.add(name); this.root.add(desc);

      // Пипсы уровней (конечные ветки) ИЛИ число уровня (бесконечные) — см. refresh().
      const pips = s.add.graphics();
      this.root.add(pips);
      const lvlText = s.add.text(76, y + 28, '', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accent, fontStyle: 'bold'
      }).setVisible(false);
      this.root.add(lvlText);

      const btn = createButton(s, width - 130, y, '', () => this.buy(branch),
        { fontSize: THEME.fontSize.tiny });
      this.root.add(btn);
      this.rows.push({ branch, y, desc, pips, lvlText, btn });
    });

    this.closeBtn = createButton(s, width / 2, height - 64, i18n.t('close'), () => this.close(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.closeBtn);
  }

  open() {
    this.root.setVisible(true);
    this.setInputEnabled(true);
    this.refresh();
  }

  close() {
    this.root.setVisible(false);
    this.setInputEnabled(false);
    if (this.onClose) this.onClose();
  }

  get visible() { return this.root.visible; }

  // Скрытый контейнер продолжает ловить клики (мина Phaser, CONVENTIONS §2).
  setInputEnabled(v) {
    this.root.iterate((child) => {
      if (child.input) child.input.enabled = v;
    });
  }

  buy(branch) {
    const cost = this.tree.nextCost(branch);
    if (cost === null || this.api.getTokens() < cost) { SFX.deny(); return; }
    this.api.spend(cost);
    const res = this.tree.buy(branch, cost + 1); // средства уже проверены и списаны
    SFX.buy();
    // Метка покупки для аналитики: ветка + уровень (id 'fill12').
    this.api.onBought(branch, res ? branch + res.level : branch);
    this.refresh();
  }

  refresh() {
    if (!this.root.visible) return;
    const tokens = Math.floor(this.api.getTokens());
    this.tokensText.setText('⬤ ' + tokens);

    for (const row of this.rows) {
      const { branch, y, desc, pips, btn } = row;
      const lvl = this.tree.level(branch);
      const max = this.tree.maxLevel(branch);
      const cost = this.tree.nextCost(branch);

      let descParams;
      if (branch === 'teleport') descParams = { s: TELEPORT_COOLDOWNS[Math.min(lvl, TELEPORT_COOLDOWNS.length - 1)] };
      else if (branch === 'pump') descParams = { l: PUMP.litersPerMinute[Math.min(lvl, PUMP.litersPerMinute.length - 1)] };
      else {
        // Бесконечная ветка: показываем реальный множитель сейчас и после покупки.
        // Прежние статичные «+35%» врали — эффект растёт с уровнем (аддитивно).
        const per = this.tree.branches[branch].effectPer || 0;
        descParams = { cur: (1 + per * lvl).toFixed(2), next: (1 + per * (lvl + 1)).toFixed(2) };
      }
      desc.setText(i18n.t('skill_' + branch + '_desc', descParams));

      pips.clear();
      if (Number.isFinite(max)) {
        // Конечная ветка (teleport, pump): рисуем пипсы уровней.
        row.lvlText.setVisible(false);
        for (let k = 0; k < max; k++) {
          const px = 56 + 20 + k * 40;
          const owned = k < lvl;
          const next = k === lvl;
          pips.fillStyle(owned ? THEME.colors.primary
            : next ? (cost !== null && tokens >= cost ? THEME.colors.accent : THEME.colors.neutral)
            : THEME.colors.panelDark, 1);
          pips.fillCircle(px, y + 40, 13);
          if (owned) {
            pips.fillStyle(0xffffff, 0.9);
            pips.fillCircle(px, y + 40, 5);
          }
        }
      } else {
        // Бесконечная ветка: пипсы не влезут, показываем уровень числом.
        row.lvlText.setVisible(true).setText(i18n.t('skillLevel', { n: lvl }));
      }

      if (cost === null) {
        btn.setLabel('MAX');
        if (btn.input) btn.input.enabled = false;
        btn.setAlpha(0.55);
      } else {
        btn.setLabel(cost + ' ⬤');
        if (btn.input) btn.input.enabled = this.root.visible;
        btn.setAlpha(tokens >= cost ? 1 : 0.75);
      }
    }
  }
}
