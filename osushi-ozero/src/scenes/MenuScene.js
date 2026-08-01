// Menu: главное меню на фоне мини-разреза озера. Вид через THEME, тексты через i18n.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';
import { Platform } from '../platform/index.js';
import { Checkpoint, pickNewest } from '../core/checkpoint.js';
import { BADGES } from '../data/balance.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);

    // Фоновая музыка догружается ЗДЕСЬ, а не в предзагрузке: она весит 1,58 МБ и
    // нужна только в GameScene. Пока игрок читает меню, загрузка идёт фоном и меню
    // при этом остаётся отзывчивым — Phaser грузит асинхронно, кнопки работают.
    // Если игрок нажмёт «Играть» раньше, чем трек доехал, GameScene дождётся его сама.
    if (!this.cache.audio.exists('bg')) {
      this.load.audio('bg', 'assets/music/bg.mp3');
      this.load.start();
    }

    // Фон: небо, вода, дно и светящийся телефон — обещание геймплея.
    const W = THEME.world;
    const g = this.add.graphics();
    g.fillStyle(W.sky, 1).fillRect(0, 0, width, height * 0.42);
    g.fillStyle(W.sun, 1).fillCircle(width - 120, 110, 54);
    g.fillStyle(W.zones.shore.rock, 1).fillRect(0, height * 0.42 - 12, width, 14);
    g.fillStyle(W.waterTint, 0.75).fillRect(0, height * 0.42, width, height * 0.58);
    g.fillStyle(W.zones.abyss.rock, 1).fillRect(0, height - 90, width, 90);
    // телефон на дне
    const phoneGlow = this.add.circle(width / 2, height - 120, 34, W.phoneGlow, 0.4);
    this.add.rectangle(width / 2, height - 120, 18, 30, 0x263238).setStrokeStyle(2, W.phoneGlow);
    this.tweens.add({ targets: phoneGlow, scale: 1.5, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });

    this.add.text(width / 2, height * 0.20, i18n.t('title'), {
      fontFamily: THEME.fontFamily,
      fontSize: THEME.fontSize.title,
      color: THEME.colors.text,
      fontStyle: 'bold',
      stroke: '#0e1621', strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.28, i18n.t('subtitle'), {
      fontFamily: THEME.fontFamily,
      fontSize: THEME.fontSize.small,
      color: THEME.colors.text,
      stroke: '#0e1621', strokeThickness: 4,
      align: 'center', wordWrap: { width: width - 120 }
    }).setOrigin(0.5);

    // Состояние для меню — свежайшее из облака и локального чекпойнта, ровно как
    // в GameScene. Иначе меню показывало бы облачный снимок, отставший от партии:
    // в облако мы пишем редко, на ключевых точках, а чекпойнт — каждое ведро.
    const d = pickNewest(Platform.cache, Checkpoint.read()) || {};

    // «Продолжить», если есть прогресс.
    const hasSave = (d.drained > 0 || d.tokens > 0);
    createButton(this, width / 2, height * 0.52, i18n.t(hasSave ? 'continue_' : 'play'),
      () => this.scene.start('Game'));

    const label = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    const soundBtn = createButton(this, width / 2, height * 0.66, label(), () => {
      Audio.toggleMute();
      soundBtn.setLabel(label());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text });

    // Достижения: сколько собрано + список оверлеем.
    const earned = d.badges || [];
    createButton(this, width / 2, height * 0.74,
      i18n.t('badgesTitle') + ' ' + earned.length + '/' + BADGES.length,
      () => this.toggleBadges(true),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });

    // Таблица рекордов. До этого рекорд только ОТПРАВЛЯЛСЯ и игроку нигде не показывался —
    // RETENTION.md §9 называет такой лидерборд «мебелью»: он не работает на удержание,
    // пока игрок не видит своё место и соседей, до которых можно дотянуться.
    // На VK кнопки нет вовсе: у VK Bridge нет клиентского лидерборда (рекорды — только
    // серверными вызовами VK API), а кнопка, которая всегда открывает пустую таблицу, —
    // это неработающая функция в глазах модерации, а не «мебель».
    if (!Platform.isVk) {
      createButton(this, width / 2, height * 0.84, i18n.t('recordsTitle'),
        () => this.openRecords(),
        { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    }

    this.buildBadgesOverlay(earned);
    if (!Platform.isVk) this.buildRecordsOverlay();
  }

  buildBadgesOverlay(earned) {
    const { width, height } = this.scale;
    const c = this.add.container(0, 0).setDepth(200).setVisible(false);
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82).setInteractive());
    c.add(this.add.text(width / 2, 64, i18n.t('badgesTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5));
    BADGES.forEach((b, i) => {
      const y = 150 + i * 84;
      const got = earned.includes(b.id);
      c.add(createPanel(this, width / 2, y, width - 70, 74));
      c.add(this.add.circle(70, y, 17, got ? THEME.colors.primary : THEME.colors.panelDark)
        .setStrokeStyle(3, got ? 0xffffff : 0x455a64, 0.6));
      if (got) c.add(this.add.text(70, y, '✓', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: '#fff', fontStyle: 'bold'
      }).setOrigin(0.5));
      c.add(this.add.text(104, y - 26, i18n.t('badge_' + b.id), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny,
        color: got ? THEME.colors.text : THEME.colors.textDim, fontStyle: 'bold'
      }));
      c.add(this.add.text(104, y + 2, i18n.t('badge_' + b.id + '_desc'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim
      }));
      c.add(this.add.text(width - 66, y, '+' + b.gems + ' ◆', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: '#4dd0e1'
      }).setOrigin(1, 0.5));
    });
    const closeBtn = createButton(this, width / 2, height - 56, i18n.t('close'),
      () => this.toggleBadges(false),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    c.add(closeBtn);
    this.badgesOverlay = c;
    this.toggleBadges(false);
  }

  toggleBadges(v) {
    this.badgesOverlay.setVisible(v);
    this.badgesOverlay.iterate((ch) => { if (ch.input) ch.input.enabled = v; });
  }

  // --- Таблица рекордов -----------------------------------------------------
  // Каркас строится один раз, строки перерисовываются при каждом открытии:
  // таблица живая, а держать в памяти чужие результаты между открытиями незачем.
  buildRecordsOverlay() {
    const { width, height } = this.scale;
    const c = this.add.container(0, 0).setDepth(200).setVisible(false);
    // Затемнение плотнее, чем у достижений (0.82): строк тут мало (обычно 4-10),
    // и сквозь редкий список просвечивал заголовок меню прямо посреди таблицы.
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.94).setInteractive());
    c.add(this.add.text(width / 2, 64, i18n.t('recordsTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5));

    // Строки живут в отдельном контейнере: чистим только его, не трогая шапку и кнопку.
    this.recordsRows = this.add.container(0, 0);
    c.add(this.recordsRows);

    this.recordsStatus = this.add.text(width / 2, height * 0.42, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
      align: 'center', wordWrap: { width: width - 120 }
    }).setOrigin(0.5);
    c.add(this.recordsStatus);

    c.add(createButton(this, width / 2, height - 56, i18n.t('close'),
      () => this.toggleRecords(false),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small }));

    this.recordsOverlay = c;
    this.toggleRecords(false);
  }

  toggleRecords(v) {
    this.recordsOverlay.setVisible(v);
    this.recordsOverlay.iterate((ch) => { if (ch.input) ch.input.enabled = v; });
  }

  async openRecords() {
    this.toggleRecords(true);
    this.recordsRows.removeAll(true);
    this.recordsStatus.setText(i18n.t('recordsLoading')).setVisible(true);

    let entries = [];
    let myRank = null;
    try {
      // Свою запись берём отдельно: в списке нет признака «это ты», а подсветить
      // себя обязательно — иначе таблица не отвечает на главный вопрос игрока.
      const [top, mine] = await Promise.all([
        Platform.leaderboard.getTop('liters', 10),
        Platform.leaderboard.getPlayerEntry('liters'),
      ]);
      entries = top || [];
      myRank = mine && typeof mine.rank === 'number' ? mine.rank : null;
    } catch (e) {
      entries = [];
    }
    // Сцену могли закрыть, пока шёл запрос.
    if (!this.scene.isActive() || !this.recordsOverlay.visible) return;

    if (!entries.length) {
      // Вне площадки лидербордов нет вовсе — честно объясняем, а не показываем пустоту.
      this.recordsStatus.setText(i18n.t('recordsEmpty'));
      return;
    }
    this.recordsStatus.setVisible(false);
    this.drawRecords(entries, myRank);
  }

  drawRecords(entries, myRank) {
    const { width } = this.scale;
    // THEME.colors.primary — число (для graphics), а Phaser.Text ждёт css-строку.
    // Выводим строку из того же значения темы, чтобы не заводить второй источник цвета
    // (CONVENTIONS.md: вид только через theme.js).
    const hl = '#' + THEME.colors.primary.toString(16).padStart(6, '0');
    entries.slice(0, 12).forEach((e, i) => {
      const y = 150 + i * 62;
      // Своя строка подсвечена: игрок должен сразу видеть себя и соседей,
      // до которых реально дотянуться, — в этом весь смысл таблицы.
      const mine = myRank !== null && e.rank === myRank;
      this.recordsRows.add(createPanel(this, width / 2, y, width - 70, 54));
      this.recordsRows.add(this.add.text(60, y, '#' + (e.rank ?? i + 1), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny,
        color: mine ? hl : THEME.colors.textDim, fontStyle: 'bold'
      }).setOrigin(0, 0.5));
      const name = (e.player && (e.player.publicName || e.player.name)) || i18n.t('recordsAnon');
      this.recordsRows.add(this.add.text(130, y, name, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny,
        color: mine ? hl : THEME.colors.text,
        fontStyle: mine ? 'bold' : 'normal'
      }).setOrigin(0, 0.5));
      const score = e.formattedScore ?? e.score ?? 0;
      this.recordsRows.add(this.add.text(width - 66, y, i18n.t('recordsScore', { s: score }), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: '#4dd0e1'
      }).setOrigin(1, 0.5));
    });
  }
}
