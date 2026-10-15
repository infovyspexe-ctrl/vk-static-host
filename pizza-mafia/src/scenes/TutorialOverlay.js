// TutorialOverlay: обучение первой смены. Отдельная сцена ПОВЕРХ GameScene.
//
// Зачем отдельной сценой: GameScene и так большая, а обучение — временный слой, который
// живёт полминуты и больше никогда не показывается. Смешивать их значит навсегда таскать
// в игровом цикле проверки «а не обучение ли сейчас».
//
// Почему подсветкой, а не текстом: методика площадок прямо просит показывать, а не писать,
// а в замеренном кейсе всплывающая подсказка с текстом давала 30% ухода. Здесь текст —
// одна короткая строка, а работает картинка: всё затемнено, кроме нужного места, и рука
// показывает пальцем.
//
// Затемнение собрано из ЧЕТЫРЁХ прямоугольников вокруг окна, а не из маски с вырезом:
// маска через BlendModes.ERASE капризна на части мобильных GPU, а четыре заливки работают
// везде одинаково.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';

// Порядок шагов. Каждый снимается ДЕЙСТВИЕМ игрока, а не таймером: пока не сделал —
// подсветка висит, и уйти в непонятное состояние невозможно.
export const TUTORIAL_STEPS = [
  'pickCustomer', 'rollDough', 'addSauce', 'addCheese', 'toOven', 'takeFromOven'
];

export class TutorialOverlay extends Phaser.Scene {
  constructor() { super('Tutorial'); }

  create(data) {
    const { width, height } = this.scale;
    this.game_scene = data.gameScene;
    this.index = 0;
    this.finished = false;

    this.dim = this.add.graphics().setDepth(1);
    this.hand = this.add.graphics().setDepth(3);
    this.label = this.add.text(width / 2, height * 0.845, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: width - 80 },
      stroke: '#2c1810', strokeThickness: 6
    }).setOrigin(0.5).setDepth(3);

    // НИЖЕ ПЛАШКИ HUD (она занимает 12–76 по высоте) и ниже второго ряда со шкалами
    // (82–97). На y=44 кнопка налезала прямо на таймер смены — замерено на смоук-тесте
    // 2026-08-12: «Skip» перекрывал часы на 7 px, а русское «Пропустить» шире и закрывало
    // их целиком.
    this.skipBtn = createButton(this, width - 92, 112, i18n.t('tutSkip'), () => this.skip(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });
    this.skipBtn.setDepth(4);

    Analytics.event(EVENTS.TUTORIAL_START);
    this.redraw();
  }

  step() { return TUTORIAL_STEPS[this.index]; }

  // Игрок сделал шаг. Вызывается из GameScene; чужие шаги игнорируем, чтобы случайное
  // действие не проматывало обучение вперёд.
  advance(stepId) {
    if (this.finished || stepId !== this.step()) return;
    Analytics.event(EVENTS.TUTORIAL_STEP, { n: this.index + 1 });
    this.index += 1;
    if (this.index >= TUTORIAL_STEPS.length) { this.finish(); return; }
    this.redraw();
  }

  redraw() {
    const { width, height } = this.scale;
    const target = this.game_scene && this.game_scene.tutorialTarget
      ? this.game_scene.tutorialTarget(this.step())
      : null;

    this.dim.clear();
    this.dim.fillStyle(0x000000, 0.62);
    if (!target) {
      this.dim.fillRect(0, 0, width, height);
    } else {
      // Четыре прямоугольника вокруг окна подсветки.
      const { x, y, w, h } = target;
      const l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2;
      this.dim.fillRect(0, 0, width, Math.max(0, t));
      this.dim.fillRect(0, b, width, Math.max(0, height - b));
      this.dim.fillRect(0, t, Math.max(0, l), Math.max(0, b - t));
      this.dim.fillRect(r, t, Math.max(0, width - r), Math.max(0, b - t));
      // Рамка вокруг окна — чтобы граница читалась даже на светлом фоне.
      this.dim.lineStyle(4, THEME.colors.accent, 0.95);
      this.dim.strokeRoundedRect(l, t, w, h, 12);
    }

    this.label.setText(i18n.t('tut_' + this.step()));
    this.drawHand(target);
  }

  // Рука-указатель: круг-«палец» с треугольным остриём, с пульсацией.
  drawHand(target) {
    this.hand.clear();
    if (this.handTween) { this.handTween.remove(); this.handTween = null; }
    if (!target) return;
    const x = target.x;
    const y = target.y + target.h / 2 + 34;
    this.hand.fillStyle(THEME.colors.accent, 1);
    this.hand.fillTriangle(x, y - 26, x - 13, y + 4, x + 13, y + 4);
    this.hand.fillCircle(x, y + 16, 15);
    this.hand.lineStyle(3, 0x2c1810, 0.65);
    this.hand.strokeCircle(x, y + 16, 15);
    this.hand.setAlpha(1);
    this.handTween = this.tweens.add({
      targets: this.hand, alpha: 0.35, duration: 620, yoyo: true, repeat: -1
    });
  }

  skip() {
    Analytics.event(EVENTS.TUTORIAL_SKIPPED, { n: this.index + 1 });
    this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    Analytics.event(EVENTS.TUTORIAL_DONE);
    if (this.game_scene && this.game_scene.onTutorialFinished) this.game_scene.onTutorialFinished();
    this.scene.stop();
  }
}
