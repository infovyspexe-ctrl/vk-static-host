// Список достижений: открытые светятся, закрытые — приглушены с текстом условия.
import { THEME, toCss } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Platform } from '../platform/index.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

export class AchievementsOverlay {
  constructor(scene) {
    this.scene = scene;
    this._navItems = [];
    Input.openLayer(scene, 'achievements');
    this.build();
    Input.closeLayer(scene, 'achievements');
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
    // Полностью непрозрачный фон — при 0.9x кнопки/HUD игры под оверлеем слабо просвечивали
    // («плашки» на скриншоте плейтеста, непонятные полупрозрачные прямоугольники).
    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x0a0714, 1).setInteractive();
    // Тап по фону тоже закрывает — ВТОРОЙ выход, независимый от геометрии кнопки
    // «Закрыть» и от того, снялся ли sticky-баннер VK. Без него игрок, у которого
    // баннер перекрыл кнопку, запирался в модалке: Esc в игре ни на что не подписан,
    // а фон глотал тапы. (Блокер красной команды 11.08, п.4.2.10 + «не зависать».)
    bg.on('pointerup', () => this.close());
    this.root.add(bg);

    this.title = s.add.text(width / 2, 60, i18n.t('achievementsButton'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add(this.title);

    const rowH = 82, top = 130;
    this.rows = ACHIEVEMENTS.map((a, i) => this.buildRow(width, top + i * rowH, a));

    this.closeBtn = this.btn(width / 2, height - 62, i18n.t('close'), () => this.close(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.closeBtn);
  }

  buildRow(width, y, achievement) {
    const s = this.scene;
    const panel = createPanel(s, width / 2, y, width - 60, 70);
    this.root.add(panel);
    const name = s.add.text(50, y - 14, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text, fontStyle: 'bold'
    });
    this.root.add(name);
    const desc = s.add.text(50, y + 14, '', {
      fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.textDim
    });
    this.root.add(desc);
    return { achievement, name, desc, panel };
  }

  open(progress) {
    this.progress = progress;
    this.root.setVisible(true);
    // Sticky-баннер VK висит внизу ПОВЕРХ приложения и закрывал кнопку «Закрыть» этого
    // оверлея целиком: выйти было нечем (фон глотает тапы, Esc ни на что не подписан) —
    // игрок запирался в модалке. Блокер красной команды 11.08 (п.5.1.5.3 + п.4.2.10).
    // Кнопка поднята выше, а баннер на время модалки снимаем — вторая, независимая
    // защита: она работает даже если баннер площадки окажется выше расчётного.
    Platform.ads.hideBanner();
    Input.openLayer(this.scene, 'achievements');
    for (const it of this._navItems) Input.register(this.scene, it.obj, it.onSelect, {});
    this.refresh();
  }

  close() {
    Platform.ads.showBanner(); // вернуть sticky-баннер, снятый на время модалки
    Input.closeLayer(this.scene, 'achievements');
    this.root.setVisible(false);
  }

  refresh() {
    if (!this.progress) return;
    for (const row of this.rows) {
      const got = this.progress.achievements.includes(row.achievement.id);
      row.name.setText((got ? '★ ' : i18n.t('locked') + ': ') + i18n.t('ach_' + row.achievement.id));
      row.desc.setText(i18n.t('ach_' + row.achievement.id + '_desc'));
      row.name.setColor(got ? toCss(THEME.colors.accent) : THEME.colors.textDim);
    }
  }
}
