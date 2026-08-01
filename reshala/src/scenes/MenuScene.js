// Menu: выбор режима («Срок» / «Побег»), маршрута побега и «Как играть».
// Весь вид через THEME и базовые компоненты, тексты через i18n, маршруты из CONTENT.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { CONTENT } from '../data/content.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { MUSIC } from '../data/music.js';
import { Leaderboard } from '../yandex/leaderboard.js';
import { Save } from '../yandex/save.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    this.cx = width / 2;
    // Кей-арт меню: герой сверху, нижняя половина намеренно пустая под интерфейс.
    // В игровых режимах фоны свои (bg_cellblock / bg_night).
    this.add.image(this.cx, height / 2, 'bg_menu');
    // счётчик коллекции для кнопки в меню (приманка вернуться достукивать)
    const progress = Save.cache || {};   // готовый кэш из Preload, без ожидания
    const met = progress.charMet || {};
    this.collectedCount = CONTENT.characters.filter((c) => (met[c.key] || 0) > 0).length;
    this.charsTotal = CONTENT.characters.length;
    this.achCount = Object.keys(progress.ach || {}).length;   // открытых достижений
    this.achTotal = ACHIEVEMENTS.length;
    this.layer = this.add.container(0, 0); // очищаемый слой текущего экрана

    // Музыка: треки догружаются фоном уже сейчас (в старте их нет — см. PreloadScene),
    // а играть браузер разрешит только после жеста игрока (событие UNLOCKED).
    Audio.lazyLoad(MUSIC, (key) => 'assets/audio/' + key + '.mp3');
    if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, () => Audio.startMusic());
    else Audio.startMusic();

    this.showMain();
  }

  clear() { this.layer.removeAll(true); }

  // Затемнение кей-арта на подэкранах. Герой нарисован в верхней половине, и голый
  // текст поверх него не читается — подэкраны кладём на затемнение, а не на арт.
  scrim() {
    const { width, height } = this.scale;
    this.layer.add(this.add.rectangle(this.cx, height / 2, width, height, 0x0e1620, 0.86).setOrigin(0.5));
  }

  // Заголовок подэкрана на плашке (тот же приём, что у логотипа).
  header(titleKey, subKey) {
    const { width, height } = this.scale;
    const y = height * 0.13;
    const w = width * 0.86, h = subKey ? 140 : 100;
    const g = this.add.graphics();
    g.fillStyle(0x121c26, 0.92);
    g.fillRoundedRect(this.cx - w / 2, y - h / 2, w, h, THEME.radius);
    g.lineStyle(3, 0xffb300, 0.9);
    g.strokeRoundedRect(this.cx - w / 2, y - h / 2, w, h, THEME.radius);
    this.layer.add(g);
    this.layer.add(this.add.text(this.cx, subKey ? y - 28 : y, i18n.t(titleKey), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5));
    if (subKey) {
      this.layer.add(this.add.text(this.cx, y + 34, i18n.t(subKey), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54a',
      }).setOrigin(0.5));
    }
  }

  // Логотип на тёмной плашке: без неё заголовок лежит на пёстром арте и не читается.
  logoPlate(y) {
    const { width } = this.scale;
    const w = width * 0.86, h = 156;
    const g = this.add.graphics();
    g.fillStyle(0x121c26, 0.82);
    g.fillRoundedRect(this.cx - w / 2, y - h / 2, w, h, THEME.radius);
    g.lineStyle(3, 0xffb300, 0.9);
    g.strokeRoundedRect(this.cx - w / 2, y - h / 2, w, h, THEME.radius);
    this.layer.add(g);
    this.layer.add(this.add.text(this.cx, y - 26, i18n.t('title'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5));
    this.layer.add(this.add.text(this.cx, y + 42, i18n.t('subtitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54a',
    }).setOrigin(0.5));
  }

  // Кнопка режима: подпись — ВТОРАЯ СТРОКА ВНУТРИ кнопки. Раньше она ставилась снаружи
  // на y+44 при полувысоте кнопки ~36 и наезжала на неё. Часть кнопки наехать не может.
  modeButton(y, labelKey, hintKey, color, onClick) {
    const { width } = this.scale;
    const w = width * 0.78, h = 128;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);
    const title = this.add.text(0, -24, i18n.t(labelKey), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.primaryText, fontStyle: 'bold',
    }).setOrigin(0.5);
    const hint = this.add.text(0, 30, i18n.t(hintKey), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.primaryText,
      align: 'center', wordWrap: { width: w - 40 },
    }).setOrigin(0.5).setAlpha(0.75);

    const btn = this.add.container(this.cx, y, [g, title, hint]);
    btn.setSize(w, h);              // хит-зона строится из размера, от левого верхнего угла
    Input.makeSelectable(btn, onClick);
    this.layer.add(btn);
    return btn;
  }

  // Служебная иконка с подписью под ней (коллекция, рекорды, как играть, звук).
  iconButton(x, y, iconKey, labelText, onClick) {
    const img = this.add.image(0, -14, iconKey).setOrigin(0.5);
    img.setScale(60 / Math.max(img.width, img.height));
    const label = this.add.text(0, 40, labelText, {
      fontFamily: THEME.fontFamily, fontSize: '22px', color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.9);

    const btn = this.add.container(x, y, [img, label]);
    btn.setSize(136, 120);
    Input.makeSelectable(btn, onClick);
    this.layer.add(btn);
    return { btn, img, label };
  }

  showMain() {
    const { width, height } = this.scale;
    this.clear();

    this.logoPlate(height * 0.42);

    // старт режима шлёт GameScene (endless_started / campaign_started), тут не дублируем
    this.modeButton(height * 0.585, 'modeEndless', 'modeEndlessHint', THEME.colors.primary,
      () => this.scene.start('Game', { mode: 'endless' }));
    // Маршрутов нет: «Побег» стартует сразу, история идёт главами.
    this.modeButton(height * 0.72, 'modeCampaign', 'modeCampaignHint', THEME.colors.accent,
      () => this.scene.start('Game', { mode: 'campaign' }));

    // ряд служебных иконок: два режима крупно, остальное мелко — отсюда иерархия.
    // Пять иконок: коллекция, рекорды, достижения, как играть, звук.
    const rowY = height * 0.875;
    const step = width * 0.185;
    const x0 = this.cx - step * 2;
    this.iconButton(x0, rowY, 'ui_cards', `${this.collectedCount}/${this.charsTotal}`,
      () => this.scene.start('Collection'));
    this.iconButton(x0 + step, rowY, 'ui_trophy', i18n.t('leaderboardBtn'),
      () => this.showLeaderboard());
    this.starIconButton(x0 + step * 2, rowY, `${this.achCount}/${this.achTotal}`,
      () => this.showAchievements());
    this.iconButton(x0 + step * 3, rowY, 'ui_help', i18n.t('howto'),
      () => this.showHowto());

    const sound = this.iconButton(x0 + step * 4, rowY, Audio.muted ? 'ui_sound_off' : 'ui_sound_on',
      i18n.t('soundBtn'), () => {
        Audio.toggleMute();
        sound.img.setTexture(Audio.muted ? 'ui_sound_off' : 'ui_sound_on'); // состояние — по иконке
      });
  }

  // Иконка-звезда достижений (текстуры-медали нет — рисуем кодом, как приём в конвейере).
  starIconButton(x, y, labelText, onClick) {
    const g = this.add.graphics();
    const R = 26, pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = (i % 2 ? 0.44 : 1) * R;
      pts.push(new Phaser.Geom.Point(Math.cos(ang) * rad, -14 + Math.sin(ang) * rad));
    }
    g.fillStyle(0xffd54a, 1); g.fillPoints(pts, true);
    g.lineStyle(2, 0x1b2b3a, 1); g.strokePoints(pts, true);
    const label = this.add.text(0, 40, labelText, {
      fontFamily: THEME.fontFamily, fontSize: '22px', color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.9);
    const btn = this.add.container(x, y, [g, label]);
    btn.setSize(128, 120);
    Input.makeSelectable(btn, onClick);
    this.layer.add(btn);
    return { btn, label };
  }

  // Экран достижений: список из 14, цветом — статус (открыто золотом / закрыто серым).
  showAchievements() {
    const { width, height } = this.scale;
    this.clear();
    this.scrim();
    const unlocked = (Save.cache || {}).ach || {};
    const n = Object.keys(unlocked).length;
    this.header('achTitle', null);
    this.layer.add(this.add.text(this.cx, height * 0.19, i18n.t('achProgress', { n, m: ACHIEVEMENTS.length }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54a',
    }).setOrigin(0.5));

    const top = height * 0.235, rowH = (height * 0.63) / ACHIEVEMENTS.length;
    ACHIEVEMENTS.forEach((a, i) => {
      const y = top + i * rowH;
      const done = !!unlocked[a.id];
      this.layer.add(this.add.text(width * 0.10, y, (done ? '★ ' : '☆ ') + i18n.pick(a.name), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: done ? '#ffd54a' : '#5f7183', fontStyle: 'bold',
      }).setOrigin(0, 0.5));
      this.layer.add(this.add.text(width * 0.10, y + rowH * 0.42, i18n.pick(a.desc), {
        fontFamily: THEME.fontFamily, fontSize: '20px', color: done ? THEME.colors.text : '#4c5c6b',
        wordWrap: { width: width * 0.8 },
      }).setOrigin(0, 0.5));
    });

    const back = createButton(this, this.cx, height * 0.95, i18n.t('back'),
      () => this.showMain(), { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.layer.add(back);
  }

  // Таблица рекордов «Срока» (лидерборд days). Работает внутри Яндекса; локально/офлайн
  // показывает подсказку. Записи: rank, имя игрока (или Аноним), счёт в днях; своя строка подсвечена.
  async showLeaderboard() {
    const { width, height } = this.scale;
    this.clear();
    this.scrim();
    this.header('leaderboardTitle', null);
    const panel = createPanel(this, this.cx, height * 0.55, width * 0.86, height * 0.62);
    this.layer.add(panel);

    const back = createButton(this, this.cx, height * 0.92, i18n.t('back'),
      () => this.showMain(), { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.layer.add(back);

    const note = (key) => this.layer.add(this.add.text(this.cx, height * 0.5, i18n.t(key), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: width * 0.72 },
    }).setOrigin(0.5).setAlpha(0.85));

    const loading = this.add.text(this.cx, height * 0.5, i18n.t('loading'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.8);
    this.layer.add(loading);

    const res = await Leaderboard.getTop('days', 10);
    if (loading.scene) loading.destroy(); // сцену могли уже сменить, пока ждали ответ

    if (res === null) { note('leaderboardOffline'); return; } // вне Яндекса / ошибка
    const entries = (res && res.entries) || [];
    if (entries.length === 0) { note('leaderboardEmpty'); return; }

    const YOU = '#ffd54a'; // подсветка своей строки
    const top = height * 0.30;
    const rowH = Math.min(height * 0.05, (height * 0.5) / Math.max(entries.length, 1));
    entries.forEach((e, i) => {
      const y = top + i * rowH;
      const isYou = res.userRank != null && e.rank === res.userRank;
      const name = (e.player && e.player.publicName) ? e.player.publicName : i18n.t('lbAnon');
      const rowStyle = { fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: isYou ? YOU : THEME.colors.text };
      const rank = this.add.text(width * 0.14, y, String(e.rank), rowStyle).setOrigin(0, 0.5);
      const who = this.add.text(width * 0.24, y, isYou ? `${name} (${i18n.t('lbYou')})` : name, rowStyle).setOrigin(0, 0.5);
      const sc = this.add.text(width * 0.86, y, i18n.t('lbDays', { n: e.score }), rowStyle).setOrigin(1, 0.5);
      [rank, who, sc].forEach((t) => { t.setAlpha(isYou ? 1 : 0.9); this.layer.add(t); });
    });
  }


  showHowto() {
    const { width, height } = this.scale;
    this.clear();
    this.scrim();
    Analytics.event(EVENTS.HOWTO_OPENED);
    this.header('howtoTitle', null);
    this.layer.add(createPanel(this, this.cx, height * 0.52, width * 0.86, height * 0.5));
    this.layer.add(this.add.text(this.cx, height * 0.34, i18n.t('howtoText'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: width * 0.78 }, lineSpacing: 8,
    }).setOrigin(0.5, 0));

    const back = createButton(this, this.cx, height * 0.82, i18n.t('back'),
      () => this.showMain(), { color: THEME.colors.neutral, textColor: THEME.colors.text });
    this.layer.add(back);
  }
}
