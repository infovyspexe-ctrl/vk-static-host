// MiniGame: мини-игра lane-runner. Одна сцена — все три темы (шкурка из minigames.js).
// Движок считает (mechanics/lanerunner), сцена рисует. Итог отдаёт наружу через шину
// bus.emit('minigame:done', { theme, win }) — GameScene применяет награду и продолжает забег.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { bus } from '../core/events.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { MINIGAMES } from '../data/minigames.js';
import { createLaneRunner } from '../mechanics/lanerunner/lanerunner.js';

const COLS = 5, ROWS = 6;

export class MiniGameScene extends Phaser.Scene {
  constructor() { super('MiniGame'); }

  init(data) {
    this.themeKey = (data && data.theme) || 'brawl';
    this.mode = (data && data.mode) || 'endless';
    this.started = false;
    this.over = false;
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;
    this.theme = MINIGAMES[this.themeKey] || MINIGAMES.brawl;
    Input.setup(this);

    this.cellW = 120; this.cellH = 116;
    this.gridX0 = (width - COLS * this.cellW) / 2;
    this.boardTop = 196;
    this.laneY = this.boardTop + ROWS * this.cellH + 30;

    // фон-двор (сплошной — основная сцена под нами на паузе не должна просвечивать)
    this.add.image(this.cx, height / 2, 'bg_yard').setOrigin(0.5);

    const t = this.theme.tuning;
    this.engine = createLaneRunner({ cols: COLS, rows: ROWS, playerHP: t.playerHP, goalHits: t.goalHits });
    this.tickMs = t.startTick;
    this.prevHp = t.playerHP;

    // подложка поля
    this.add.rectangle(this.cx, this.boardTop + ROWS * this.cellH / 2, COLS * this.cellW + 8, ROWS * this.cellH + 8, 0x162230).setOrigin(0.5);

    // HUD сверху: ЦЕЛЬ СЛОВАМИ + прогресс (раньше был только «0/12» без пояснения — игрок
    // не понимал, к чему стремиться и как проигрывает).
    this.goalIcon = this.add.image(this.cx - 76, 84, this.theme.icons.goal).setOrigin(0.5);
    this.goalIcon.setScale(52 / this.goalIcon.height);
    this.goalText = this.add.text(this.cx - 40, 84, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.add.text(this.cx, 138, i18n.pick(this.theme.goalLabel), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54a',
    }).setOrigin(0.5).setStroke('#0e1620', 5);

    // Жизни — настоящие сердца, а не бледный текст. Мигают/гаснут при ударе, есть подпись.
    // Подняты над рядом кнопок управления (кнопки ◄ ► живут в самом низу).
    const hpN = t.playerHP, hy = height - 190, hgap = 46;
    const hx0 = this.cx - (hpN - 1) * hgap / 2;
    this.add.text(hx0 - 40, hy, i18n.t('mgLives'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(1, 0.5).setStroke('#0e1620', 5);
    this.hearts = [];
    for (let i = 0; i < hpN; i++) {
      const h = this.add.image(hx0 + i * hgap, hy, 'art_health').setOrigin(0.5);
      h.setScale(38 / h.height);
      this.hearts.push(h);
    }
    this.shieldIcon = this.add.image(hx0 + hpN * hgap + 8, hy, 'art_shield').setOrigin(0.5).setVisible(false);
    this.shieldIcon.setScale(38 / this.shieldIcon.height);

    // Обводка вместо полупрозрачности: на пёстром арте двора бледная подсказка не читалась.
    this.add.text(this.cx, height - 250, i18n.t('mgTapHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setStroke('#0e1620', 6);

    // поле и герой
    this.boardC = this.add.container(this.gridX0, this.boardTop);
    this.token = this.add.image(0, this.laneY, this.theme.icons.player).setOrigin(0.5);
    this.token.setScale(70 / this.token.height);

    // ВВОД. Раньше был «тап по левой/правой половине экрана» — на телефоне неочевидно
    // (жалоба: «не всем понятно, как управлять»). Теперь явные экранные кнопки ◄ ► внизу
    // (палец до них дотягивается) + клавиши ←/→ на десктопе. Тап = шаг героя на соседний ряд.
    this.makeArrowButton(width * 0.27, height - 80, 'left');
    this.makeArrowButton(width * 0.73, height - 80, 'right');
    this.onInput = (dir) => {
      if (!this.started || this.over) return;
      if (dir === 'left' || dir === 'right') this.stepHero(dir);
    };
    bus.on('input', this.onInput);
    this.events.once('shutdown', () => { bus.off('input', this.onInput); });

    this.engine.start();
    this.renderBoard();
    this.renderToken(false);
    this.updateHud();
    this.showIntro();
  }

  // Экранная кнопка-стрелка внизу: тап -> шаг героя на соседний ряд. Крупная (палец),
  // с рамкой-акцентом и лёгким «нажатием» (масштаб-пульс). Одна сцена на все три темы —
  // кнопки появляются во всех мини-играх lane-runner сразу.
  makeArrowButton(x, y, dir) {
    const W = 264, H = 120, r = 20;
    const bg = this.add.graphics();
    bg.fillStyle(THEME.colors.panel, 0.92); bg.fillRoundedRect(-W / 2, -H / 2, W, H, r);
    bg.lineStyle(3, THEME.colors.accent, 1); bg.strokeRoundedRect(-W / 2, -H / 2, W, H, r);
    const s = 34;
    const arrow = this.add.graphics();
    arrow.fillStyle(0xffffff, 1);
    if (dir === 'left') arrow.fillTriangle(-s * 0.6, 0, s * 0.5, -s, s * 0.5, s);
    else arrow.fillTriangle(s * 0.6, 0, -s * 0.5, -s, -s * 0.5, s);
    const visual = this.add.container(x, y, [bg, arrow]).setSize(W, H);
    // Кликабельная область — ОТДЕЛЬНАЯ невидимая Zone во весь размер (и чуть больше по
    // высоте — палец на телефоне попадает вернее). Ручной hit-area на контейнере с graphics
    // у Phaser считается со смещением и оказывался куда меньше картинки: «кнопка большая,
    // а нажать нельзя». У Zone hit-area по её size — честно весь прямоугольник.
    const hit = this.add.zone(x, y, W + 24, H + 40).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (!this.started || this.over) return;
      this.stepHero(dir);
      visual.setScale(0.95);
      this.tweens.add({ targets: visual, scale: 1, duration: 120, ease: 'Quad.out' });
    });
    return hit;
  }

  cellColor(type) {
    const c = this.theme.colors;
    if (type === 'dark') return c.dark;
    if (type === 'light') return c.light;
    if (type === 'sign') return c.sign;
    return 0x24333f; // empty
  }

  renderBoard() {
    this.boardC.removeAll(true);
    const s = this.engine.state;
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        const type = s.board[i][j];
        const x = j * this.cellW + this.cellW / 2;
        const y = i * this.cellH + this.cellH / 2;
        this.boardC.add(this.add.rectangle(x, y, this.cellW - 10, this.cellH - 10, this.cellColor(type), type === 'empty' ? 0.5 : 0.85).setOrigin(0.5));
        if (type !== 'empty') {
          const img = this.add.image(x, y, this.theme.icons[type]).setOrigin(0.5);
          img.setScale(Math.min((this.cellW - 30) / img.width, (this.cellH - 30) / img.height));
          this.boardC.add(img);
        }
      }
    }
  }

  colX(col) { return this.gridX0 + col * this.cellW + this.cellW / 2; }

  renderToken(animate) {
    const col = this.engine.state.player.col;
    const x = this.colX(col);
    if (animate) this.tweens.add({ targets: this.token, x, duration: 110 });
    else this.token.x = x;
  }

  // Прямой шаг героя по тапу/клавише: двигаем модель и сразу перерисовываем фишку.
  stepHero(dir) {
    this.engine.move(dir);
    this.renderToken(true);
  }

  updateHud() {
    const s = this.engine.state;
    this.goalText.setText(`${s.hits}/${s.goalHits}`);
    this.hearts.forEach((h, i) => h.setAlpha(i < s.hp ? 1 : 0.16)); // погасшие = потерянные жизни
    this.shieldIcon.setVisible(!!s.shield);
  }

  // Удар: красная вспышка + «лопается» только что потерянное сердце. Чтобы игрок ВИДЕЛ,
  // что произошло и сколько жизней осталось (жалоба: «должен быть отчёт жизни»).
  onDamage(hpNow) {
    const { width, height } = this.scale;
    const flash = this.add.rectangle(this.cx, height / 2, width, height, 0xff2b2b, 0.26)
      .setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: flash, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
    const lost = this.hearts[hpNow]; // сердце, которое только что погасло
    if (lost) {
      const base = lost.scale;
      lost.setAlpha(1);
      // пульс: подскочило и осело тусклым в своём слоте (пустая жизнь остаётся видимой)
      this.tweens.add({
        targets: lost, scale: base * 1.6, duration: 130, yoyo: true,
        onComplete: () => lost.setScale(base).setAlpha(0.16),
      });
    }
  }

  floatText(text, color) {
    const t = this.add.text(this.token.x, this.laneY - 40, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color, fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#000000', 4);
    this.tweens.add({ targets: t, y: this.laneY - 90, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }

  showIntro() {
    const { height } = this.scale;
    const o = this.add.container(0, 0);
    this.introOverlay = o;
    o.add(this.add.rectangle(this.cx, height / 2, this.scale.width, height, 0x0e1620, 0.88).setOrigin(0.5));
    o.add(createPanel(this, this.cx, height * 0.42, this.scale.width * 0.86, height * 0.4));
    o.add(this.add.text(this.cx, height * 0.28, i18n.pick(this.theme.name), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5));
    o.add(this.add.text(this.cx, height * 0.34, i18n.pick(this.theme.rules), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: this.scale.width * 0.78 }, lineSpacing: 8,
    }).setOrigin(0.5, 0));
    // Управление и ставки словами: игрок раньше не понимал, что уводит героя САМ (стоял и проигрывал).
    o.add(this.add.text(this.cx, height * 0.45, i18n.t('mgIntroHow', { n: this.theme.tuning.playerHP }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffd54a',
      align: 'center', wordWrap: { width: this.scale.width * 0.78 }, lineSpacing: 6,
    }).setOrigin(0.5, 0));
    o.add(createButton(this, this.cx, height * 0.585, i18n.t('mgStart'), () => { o.destroy(); this.startLoop(); }, { color: THEME.colors.accent }));
  }

  startLoop() {
    this.started = true;
    Analytics.event(EVENTS.MINIGAME_STARTED, { theme: this.themeKey });
    Analytics.first(EVENTS.MINIGAME_FIRST_USE);
    this.scheduleTick();
  }

  scheduleTick() {
    if (this.over) return;
    // слайд поля вниз на ряд, затем шаг движка. По ходу слайда — окно подбора окорочка:
    // как только предмет наезжает на героя (~30% слайда и дальше), стоять в его колонке
    // достаточно, чтобы засчитать, — не нужно ловить единственный миг резолва тика.
    this.tweens.add({
      targets: this.boardC, y: this.boardTop + this.cellH, duration: this.tickMs, ease: 'Linear',
      onUpdate: (tw) => { if (tw.progress >= 0.3) this.tryCatchLight(); },
      onComplete: () => this.doStep(),
    });
  }

  // Подбор окорочка в текущей колонке героя, пока ряд проходит над ним. Гасит клетку,
  // показывает +1, обновляет счёт; при добивании цели — сразу победа.
  tryCatchLight() {
    if (this.over) return;
    const res = this.engine.grab(this.engine.state.player.col);
    if (!res.caught) return;
    this.floatText('+1', '#ffd54f');
    this.renderBoard();
    this.updateHud();
    if (res.over) this.endGame(res.over);
  }

  doStep() {
    if (this.over) return;
    const res = this.engine.step();
    const s = this.engine.state;
    // вернуть поле на место и перерисовать (новый ряд сверху)
    this.boardC.y = this.boardTop;
    this.renderBoard();
    this.renderToken(true);
    this.updateHud();

    // флейвор
    const dmg = this.prevHp - s.hp;
    if (dmg > 0) { this.floatText('−1', '#ef5350'); this.onDamage(s.hp); }
    else if (res.resolved === 'light') this.floatText('+1', '#ffd54f');
    else if (res.resolved === 'sign') this.floatText('щит', '#42a5f5');
    this.prevHp = s.hp;

    if (res.over) { this.endGame(res.over); return; }
    this.tickMs = Math.max(this.theme.tuning.minTick, this.tickMs - 12);
    this.scheduleTick();
  }

  endGame(over) {
    this.over = true;
    const win = !!over.win;
    Analytics.event(win ? EVENTS.MINIGAME_WON : EVENTS.MINIGAME_LOST, { theme: this.themeKey });

    const { height } = this.scale;
    const o = this.add.container(0, 0);
    o.add(this.add.rectangle(this.cx, height / 2, this.scale.width, height, 0x0e1620, 0.9).setOrigin(0.5));
    o.add(createPanel(this, this.cx, height * 0.44, this.scale.width * 0.82, height * 0.34));
    o.add(this.add.text(this.cx, height * 0.34, i18n.t(win ? 'mgWin' : 'mgLose'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: win ? '#ffd54f' : '#ef5350', fontStyle: 'bold',
    }).setOrigin(0.5));
    // Причина проигрыша словами (жалоба: «должен быть отчёт — минус жизни, ты проиграл»).
    o.add(this.add.text(this.cx, height * 0.42, win ? i18n.pick(this.theme.goalLabel) : i18n.t('mgLoseReason'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.85));
    o.add(createButton(this, this.cx, height * 0.54, i18n.t('mgNext'), () => {
      bus.emit('minigame:done', { theme: this.themeKey, win });
      this.scene.stop();
    }, { color: THEME.colors.primary }));
  }
}
