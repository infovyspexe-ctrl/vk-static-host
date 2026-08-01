// ShellGame: мини-игра «напёрстки». Одна сцена — все темы (шкурка из shellgames.js).
// Движок shellgame считает (стартовый слот + обмены + итоговый слот), сцена анимирует и рисует.
// Итог наружу через bus.emit('minigame:done', { theme, win }).
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { bus } from '../core/events.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { SHELLGAMES } from '../data/shellgames.js';
import { createShellGame } from '../mechanics/shellgame/shellgame.js';

const CUP_W = 130, CUP_H = 150;

export class ShellGameScene extends Phaser.Scene {
  constructor() { super('ShellGame'); }

  init(data) {
    this.themeKey = (data && data.theme) || 'bread';
    this.mode = (data && data.mode) || 'endless';
    this.started = false;
    this.over = false;
    this.phase = 'idle';
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;
    this.theme = SHELLGAMES[this.themeKey] || SHELLGAMES.bread;
    Input.setup(this);

    this.engine = createShellGame({ ...this.theme.tuning });
    const cups = this.engine.cups;

    this.add.image(this.cx, height / 2, 'bg_yard').setOrigin(0.5);

    this.cupY = height * 0.52;
    this.liftY = this.cupY - 96;
    this.slotX = [];
    for (let i = 0; i < cups; i++) this.slotX.push(width * (0.5 + (i - (cups - 1) / 2) * 0.24));

    // HUD: иконка предмета + счётчик
    this.goalIcon = this.add.image(this.cx - 60, height * 0.2, this.theme.itemKey).setOrigin(0.5);
    this.goalIcon.setScale(50 / this.goalIcon.height);
    this.goalText = this.add.text(this.cx - 26, height * 0.2, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.hpText = this.add.text(this.cx, height * 0.28, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
    }).setOrigin(0.5);
    // Обводка вместо полупрозрачности: на пёстром арте двора бледная подсказка не читалась.
    this.add.text(this.cx, height * 0.72, i18n.t('sgTapHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5).setStroke('#0e1620', 6);

    // предмет (показывается под поднятой кружкой)
    this.item = this.add.image(0, this.cupY, this.theme.itemKey).setOrigin(0.5).setVisible(false);
    this.item.setScale(56 / this.item.height);

    // кружки
    this.cupObjs = [];
    this.slotCups = [];
    for (let i = 0; i < cups; i++) {
      const cup = this.makeCup();
      cup.setPosition(this.slotX[i], this.cupY);
      Input.makeSelectable(cup, () => this.onCupTap(cup));
      this.cupObjs.push(cup);
      this.slotCups.push(cup);
    }

    this.updateHud();
    this.engine.start();
    this.showIntro();
  }

  // Кружка — настоящая иконка. Раньше рисовался серо-коричневый прямоугольник, хотя
  // иконка кружки в игре уже была: главный объект напёрстков выглядел заглушкой.
  makeCup() {
    const img = this.add.image(0, 0, 'art_mug').setOrigin(0.5);
    img.setScale(Math.min(CUP_W / img.width, CUP_H / img.height));
    const cup = this.add.container(0, 0, [img]);
    cup.setSize(CUP_W, CUP_H);
    return cup;
  }

  updateHud() {
    const s = this.engine.state;
    this.goalText.setText(`${s.round}/${s.roundsTotal}`);
    this.hpText.setText('❤️'.repeat(Math.max(0, s.lives)));
  }

  // --- поток раунда ---
  startLoop() {
    this.started = true;
    Analytics.event(EVENTS.MINIGAME_STARTED, { theme: this.themeKey });
    Analytics.first(EVENTS.MINIGAME_FIRST_USE);
    this.playRound();
  }

  playRound() {
    if (this.over) return;
    // вернуть кружки в слот-порядок
    this.slotCups = this.cupObjs.slice();
    this.cupObjs.forEach((c, i) => c.setPosition(this.slotX[i], this.cupY));
    this.item.setVisible(false);

    const reveal = this.engine.state.reveal;
    this.phase = 'reveal';
    // показать предмет под стартовой кружкой
    const startCup = this.slotCups[reveal.start];
    this.item.setPosition(startCup.x, this.cupY);
    this.tweens.add({
      targets: startCup, y: this.liftY, duration: 220, yoyo: true, hold: this.theme.tuning.revealMs,
      onStart: () => this.item.setVisible(true),
      onComplete: () => { this.item.setVisible(false); this.doShuffle(reveal.swaps, 0); },
    });
  }

  doShuffle(swaps, idx) {
    if (this.over) return;
    this.phase = 'shuffle';
    if (idx >= swaps.length) { this.phase = 'pick'; return; }
    const [a, b] = swaps[idx];
    const cupA = this.slotCups[a], cupB = this.slotCups[b];
    const xa = this.slotX[a], xb = this.slotX[b];
    this.tweens.add({ targets: cupA, x: xb, y: this.cupY - 30, duration: this.theme.tuning.swapMs, yoyo: false, ease: 'Sine.inOut',
      onUpdate: (tw, t) => { t.y = this.cupY - 30 * Math.sin(Math.PI * tw.progress); } });
    this.tweens.add({ targets: cupB, x: xa, duration: this.theme.tuning.swapMs, ease: 'Sine.inOut',
      onComplete: () => {
        cupA.y = this.cupY;
        this.slotCups[a] = cupB; this.slotCups[b] = cupA;
        this.doShuffle(swaps, idx + 1);
      } });
  }

  onCupTap(cup) {
    if (this.phase !== 'pick' || this.over) return;
    const slot = this.slotCups.indexOf(cup);
    if (slot < 0) return;
    this.resolvePick(slot);
  }

  resolvePick(slot) {
    this.phase = 'resolve';
    const actualBall = this.engine.state.ballIndex;
    const res = this.engine.pick(slot);
    this.updateHud();

    // поднять выбранную кружку и показать правду (где был предмет)
    const chosen = this.slotCups[slot];
    const truth = this.slotCups[actualBall];
    this.item.setPosition(truth.x, this.cupY).setVisible(true);
    this.tweens.add({ targets: chosen, y: this.liftY, duration: 200, yoyo: true, hold: 350 });
    if (truth !== chosen) this.tweens.add({ targets: truth, y: this.liftY, duration: 200, yoyo: true, hold: 350 });

    const fx = this.add.text(chosen.x, this.cupY - 120, res.correct ? '✓' : '✗', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: res.correct ? '#66bb6a' : '#ef5350', fontStyle: 'bold',
    }).setOrigin(0.5).setStroke('#000000', 4);
    this.tweens.add({ targets: fx, y: this.cupY - 170, alpha: 0, duration: 700, onComplete: () => fx.destroy() });

    this.time.delayedCall(900, () => {
      if (res.over) this.endGame(res.over);
      else this.playRound();
    });
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
    o.add(createButton(this, this.cx, height * 0.52, i18n.t('mgStart'), () => { o.destroy(); this.introOverlay = null; this.startLoop(); }, { color: THEME.colors.accent }));
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
