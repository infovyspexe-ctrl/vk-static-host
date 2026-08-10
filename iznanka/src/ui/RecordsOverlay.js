// Таблица рекордов лидерборда `bestDepth` (SDK площадки). Раньше в игре был только ЛОКАЛЬНЫЙ
// личный рекорд (bestDepthLabel в деревне) — реальный персистентный лидерборд был заявлен в
// CLAUDE.md игры, но нигде не вызывался (найдено при разборе готовности к релизу). Паттерн
// повторяет уже проверенный на другой игре (games/osushi-ozero/src/scenes/MenuScene.js) — своя
// строка подсвечивается, вне площадки/без записей — честное сообщение, не пустой экран.
import { THEME, toCss } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Platform } from '../platform/index.js';

export class RecordsOverlay {
  constructor(scene) {
    this.scene = scene;
    this._navItems = [];
    Input.openLayer(scene, 'records');
    this.build();
    Input.closeLayer(scene, 'records');
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
    this.height = height;
    this.root = s.add.container(0, 0).setDepth(300).setScrollFactor(0);
    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x0a0714, 1).setInteractive();
    // Тап по фону тоже закрывает — ВТОРОЙ выход, независимый от геометрии кнопки
    // «Закрыть» и от того, снялся ли sticky-баннер VK. Без него игрок, у которого
    // баннер перекрыл кнопку, запирался в модалке: Esc в игре ни на что не подписан,
    // а фон глотал тапы. (Блокер красной команды 11.08, п.4.2.10 + «не зависать».)
    bg.on('pointerup', () => this.close());
    this.root.add(bg);

    this.title = s.add.text(width / 2, 56, i18n.t('recordsTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add(this.title);

    this.statusText = s.add.text(width / 2, height * 0.4, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
      align: 'center', wordWrap: { width: width - 120 }
    }).setOrigin(0.5);
    this.root.add(this.statusText);

    this.rowsLayer = s.add.container(0, 0);
    this.root.add(this.rowsLayer);

    this.closeBtn = this.btn(width / 2, height - 200, i18n.t('close'), () => this.close(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.closeBtn);
  }

  // Личные рекорды из меты. Нужны для площадок БЕЗ клиентского лидерборда (VK Bridge
  // такого API не даёт, adapters/vk.js). Раньше там был тупик: пустой экран с отсылкой
  // «откройте игру на другой площадке» — и нарушение п.4.2.6 правил VK (упоминание чужой
  // площадки), и кнопка меню, которая НИКОГДА ничего не показывает, то есть бесполезный
  // элемент управления (тот же пункт, по которому в аудите 04.08 убрали тумблер звука).
  // Теперь на таких площадках экран показывает свою таблицу личных рекордов.
  open({ bestDepth = 0, todayDepth = 0, streak = 0 } = {}) {
    this.local = { bestDepth, todayDepth, streak };
    this.root.setVisible(true);
    // Sticky-баннер VK висит внизу ПОВЕРХ приложения и закрывал кнопку «Закрыть» этого
    // оверлея целиком: выйти было нечем (фон глотает тапы, Esc ни на что не подписан) —
    // игрок запирался в модалке. Блокер красной команды 11.08 (п.5.1.5.3 + п.4.2.10).
    // Кнопка поднята выше, а баннер на время модалки снимаем — вторая, независимая
    // защита: она работает даже если баннер площадки окажется выше расчётного.
    Platform.ads.hideBanner();
    Input.openLayer(this.scene, 'records');
    for (const it of this._navItems) Input.register(this.scene, it.obj, it.onSelect, {});
    this.load();
  }

  close() {
    Platform.ads.showBanner(); // вернуть sticky-баннер, снятый на время модалки
    Input.closeLayer(this.scene, 'records');
    this.root.setVisible(false);
  }

  get visible() { return this.root.visible; }

  async load() {
    this.rowsLayer.removeAll(true);
    this.statusText.setText(i18n.t('recordsLoading')).setVisible(true);

    let entries = [];
    let myRank = null;
    try {
      const [top, mine] = await Promise.all([
        Platform.leaderboard.getTop('bestDepth', 10),
        Platform.leaderboard.getPlayerEntry('bestDepth')
      ]);
      entries = top || [];
      myRank = mine && typeof mine.rank === 'number' ? mine.rank : null;
    } catch (e) {
      entries = [];
    }
    // Оверлей могли закрыть, пока шёл запрос.
    if (!this.root.visible) return;

    if (!entries.length) {
      // Вне площадки (dev-сервер, VK без поддержки лидерборда) записей не будет вовсе —
      // честно объясняем и показываем СВОИ рекорды, а не пустой экран без причины.
      this.statusText.setText(i18n.t('recordsEmpty'));
      this.drawLocalRows();
      return;
    }
    this.statusText.setVisible(false);
    this.drawRows(entries, myRank);
  }

  // Таблица ЛИЧНЫХ рекордов — фолбэк для площадок без лидерборда (VK) и для локального
  // запуска. Тот же вид строки, что и у общей таблицы, чтобы экран не выглядел заглушкой.
  drawLocalRows() {
    const width = this.width;
    const rows = [
      [i18n.t('recordsLocalBest'), this.local.bestDepth || 0],
      [i18n.t('recordsLocalToday'), this.local.todayDepth || 0],
      [i18n.t('recordsLocalStreak'), this.local.streak || 0],
    ];
    const startY = this.height * 0.5;
    rows.forEach(([label, value], i) => {
      const y = startY + i * 70;
      this.rowsLayer.add(createPanel(this.scene, width / 2, y, width - 60, 54));
      this.rowsLayer.add(this.scene.add.text(56, y, label, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim
      }).setOrigin(0, 0.5));
      this.rowsLayer.add(this.scene.add.text(width - 56, y, String(value), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, fontStyle: 'bold',
        color: toCss(THEME.colors.accent)
      }).setOrigin(1, 0.5));
    });
  }

  drawRows(entries, myRank) {
    const width = this.width;
    const hl = toCss(THEME.colors.accent);
    entries.slice(0, 10).forEach((e, i) => {
      const y = 110 + i * 64;
      const mine = myRank !== null && e.rank === myRank;
      const panel = createPanel(this.scene, width / 2, y, width - 60, 54);
      this.rowsLayer.add(panel);
      const rank = this.scene.add.text(56, y, '#' + (e.rank ?? i + 1), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, fontStyle: 'bold',
        color: mine ? hl : THEME.colors.textDim
      }).setOrigin(0, 0.5);
      this.rowsLayer.add(rank);
      const name = (e.player && (e.player.publicName || e.player.name)) || i18n.t('recordsAnon');
      const nameText = this.scene.add.text(120, y, name, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small,
        color: mine ? hl : THEME.colors.text, fontStyle: mine ? 'bold' : 'normal'
      }).setOrigin(0, 0.5);
      this.rowsLayer.add(nameText);
      const score = e.formattedScore ?? e.score ?? 0;
      const scoreText = this.scene.add.text(width - 56, y, i18n.t('recordsScore', { n: score }), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: toCss(THEME.colors.safe)
      }).setOrigin(1, 0.5);
      this.rowsLayer.add(scoreText);
    });
  }
}
