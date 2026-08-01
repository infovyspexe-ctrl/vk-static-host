// TimingBar: мини-игра «попади в зону». Одна сцена — все темы (шкурка из timingbars.js).
// Движок timingbar считает, сцена рисует. Итог наружу через bus.emit('minigame:done', {theme, win}).
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { bus } from '../core/events.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { TIMINGBARS } from '../data/timingbars.js';
import { createTimingBar } from '../mechanics/timingbar/timingbar.js';

export class TimingBarScene extends Phaser.Scene {
  constructor() { super('TimingBar'); }

  init(data) {
    this.themeKey = (data && data.theme) || 'lockpick';
    this.mode = (data && data.mode) || 'endless';
    this.started = false;
    this.over = false;
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;
    this.theme = TIMINGBARS[this.themeKey] || TIMINGBARS.lockpick;
    Input.setup(this);

    const t = this.theme.tuning;
    this.engine = createTimingBar({ ...t });

    // фон-двор
    this.add.image(this.cx, height / 2, 'bg_yard').setOrigin(0.5);

    // геометрия полоски
    this.barX0 = width * 0.1;
    this.barW = width * 0.8;
    this.barY = height * 0.5;
    this.barH = 44;

    // HUD: иконка темы + счётчик
    this.goalIcon = this.add.image(this.cx - 60, height * 0.2, this.theme.iconKey).setOrigin(0.5);
    this.goalIcon.setScale(52 / this.goalIcon.height);
    this.goalText = this.add.text(this.cx - 26, height * 0.2, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.hpText = this.add.text(this.cx, height * 0.28, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
    }).setOrigin(0.5);
    // Панель под полосой. Раньше полоса висела прямо на арте двора и читалась как случайный
    // прямоугольник, а подсказка тонула в фоне. Панель собирает мини-игру в «прибор».
    const padX = 26, padTop = 34, padBottom = 78;
    const pw = this.barW + padX * 2, ph = this.barH + padTop + padBottom;
    const px = this.barX0 - padX, py = this.barY - this.barH / 2 - padTop;
    const panel = this.add.graphics();
    panel.fillStyle(0x0e1620, 0.86);
    panel.fillRoundedRect(px, py, pw, ph, THEME.radius);
    panel.lineStyle(3, 0xffb300, 0.85);
    panel.strokeRoundedRect(px, py, pw, ph, THEME.radius);

    // подсказка — ВНУТРИ панели, поэтому читается (снаружи она терялась на фоне)
    this.add.text(this.cx, this.barY + this.barH / 2 + 34, i18n.t('tbTapHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.9);

    // полоска, зона, бегунок
    this.add.rectangle(this.barX0, this.barY, this.barW, this.barH, this.theme.colors.bar).setOrigin(0, 0.5);
    this.zoneRect = this.add.rectangle(this.barX0, this.barY, 10, this.barH, this.theme.colors.zone).setOrigin(0, 0.5);
    this.marker = this.add.rectangle(this.barX0, this.barY, 8, this.barH + 26, this.theme.colors.marker).setOrigin(0.5);

    // ввод: тап где угодно / Пробел-Enter — зафиксировать
    this.input.on('pointerdown', () => this.doLock());
    this.onInput = (act) => { if (act === 'confirm') this.doLock(); };
    bus.on('input', this.onInput);
    this.events.once('shutdown', () => bus.off('input', this.onInput));

    this.engine.start();
    this.drawZone();
    this.updateHud();
    this.showIntro();
  }

  drawZone() {
    const s = this.engine.state;
    this.zoneRect.x = this.barX0 + s.zoneMin * this.barW;
    this.zoneRect.width = Math.max(6, (s.zoneMax - s.zoneMin) * this.barW);
  }

  updateHud() {
    const s = this.engine.state;
    this.goalText.setText(`${s.round}/${s.roundsTotal}`);
    this.hpText.setText('❤️'.repeat(Math.max(0, s.lives)));
  }

  update(time, delta) {
    if (!this.started || this.over) return;
    const s = this.engine.advance(delta / 1000);
    this.marker.x = this.barX0 + s.pos * this.barW;
  }

  doLock() {
    if (!this.started || this.over) return;
    const res = this.engine.lock();
    this.drawZone();
    this.updateHud();
    const t = this.add.text(this.marker.x, this.barY - 60, res.hit ? '✓' : '✗', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: res.hit ? '#66bb6a' : '#ef5350', fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#000000', 4);
    this.tweens.add({ targets: t, y: this.barY - 110, alpha: 0, duration: 550, onComplete: () => t.destroy() });
    if (res.over) this.endGame(res.over);
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
    o.add(this.add.text(this.cx, height * 0.35, i18n.pick(this.theme.rules), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: this.scale.width * 0.78 }, lineSpacing: 8,
    }).setOrigin(0.5, 0));
    o.add(createButton(this, this.cx, height * 0.52, i18n.t('mgStart'), () => { o.destroy(); this.startLoop(); }, { color: THEME.colors.accent }));
  }

  startLoop() {
    this.started = true;
    Analytics.event(EVENTS.MINIGAME_STARTED, { theme: this.themeKey });
    Analytics.first(EVENTS.MINIGAME_FIRST_USE);
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
    o.add(this.add.text(this.cx, height * 0.42, i18n.pick(this.theme.goalLabel), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setAlpha(0.8));
    o.add(createButton(this, this.cx, height * 0.54, i18n.t('mgNext'), () => {
      bus.emit('minigame:done', { theme: this.themeKey, win });
      this.scene.stop();
    }, { color: THEME.colors.primary }));
  }
}
