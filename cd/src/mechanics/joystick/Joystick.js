// ВИРТУАЛЬНЫЙ ДЖОЙСТИК. Управление пальцем/мышью в нижней части экрана.
// Замкнутый модуль: на вход получает сцену и колбэк onMove(dx, dy) с нормированным
// вектором направления (длина 0..1). Снаружи не знает ни про игрока, ни про сцену.
//
// Поддерживает 2 режима:
//  - FIXED: база в фиксированной точке (classical joystick).
//  - FLOAT: база появляется под первым касанием (удобнее на большом экране). По умолчанию.
//
// Мультитач: каждое касание в зоне джойстика ведёт свою базу, но активен первый начатый
// указатель — так случайное второе касание не дёргает управление. При отпускании указателя,
// который вёл джойстик, управление обнуляется (кто бы ни нажимал ещё).
import { THEME } from '../../ui/theme.js';

export class Joystick {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.zone = opts.zone || null;          // Phaser.Geom.Rectangle — область активации
    this.maxRadius = opts.maxRadius || 90;  // радиус отклонения ручки
    this.deadZone = opts.deadZone || 0.16;  // порог: меньше этого — нулевое направление
    this.onMove = opts.onMove || (() => {});
    this.onEnd = opts.onEnd || (() => {});

    this.activePointerId = null;            // ID указателя, который ведёт джойстик
    this.baseX = 0;
    this.baseY = 0;
    this._suspended = false;                // см. suspend()/resume()

    // Визуал: база (большое кольцо) + ручка (маленькое). Создаём один раз, прячем.
    // setScrollFactor(0) ОБЯЗАТЕЛЕН: рисуем фигуры по pointer.x/y — это ЭКРАННЫЕ координаты
    // касания, а не мировые. Без scrollFactor(0) Phaser трактует их как мировые: камера
    // следует за кораблём через бесконечный мир, и как только она отъезжает от точки, где
    // рисовался джойстик, узел «отклеивается» от пальца и остаётся висеть в мире фиксированной
    // точкой — до которой потом можно долететь, будто это подбираемый предмет. Каждое новое
    // касание оставляло СВОЙ такой призрак (проверено: scrollFactorX/Y был 1 по умолчанию,
    // как у обычного игрового объекта, а не 0, как у всего остального HUD в этой игре).
    this.base = scene.add.graphics().setDepth(1000).setScrollFactor(0);
    this.knob = scene.add.graphics().setDepth(1001).setScrollFactor(0);
    this._drawBase(0, 0, false);
    this._drawKnob(0, 0, false);
  }

  // Активировать: начать следить за указателями в зоне. Возвращает сам себя.
  start() {
    this.scene.input.on('pointerdown', this._onDown, this);
    this.scene.input.on('pointermove', this._onMoveEvt, this);
    this.scene.input.on('pointerup', this._onUp, this);
    // pointerupoutside — палец ушёл за пределы canvas и отпустился там (мобильный кейс).
    this.scene.input.on('pointerupoutside', this._onUp, this);
    return this;
  }

  destroy() {
    this.scene.input.off('pointerdown', this._onDown, this);
    this.scene.input.off('pointermove', this._onMoveEvt, this);
    this.scene.input.off('pointerup', this._onUp, this);
    this.scene.input.off('pointerupoutside', this._onUp, this);
    this.base.destroy();
    this.knob.destroy();
  }

  // Принудительно снять текущее нажатие (если оно есть), спрятать визуал и запретить НОВЫЕ
  // нажатия, пока не позвали resume(). Джойстик слушает pointer ГЛОБАЛЬНО по всей своей зоне
  // (обычно нижние 58% экрана) — той же, где рисуются карточки апгрейда и кнопки паузы/game
  // over. Без suspend() клик по такой кнопке ОДНОВРЕМЕННО стартовал бы драг джойстика: сцена
  // это заметит слишком поздно, потому что update() при паузе не крутится вовсе — оставшийся
  // в player.moveX/moveY вектор просто ждал до первого кадра после закрытия окна и тащил
  // корабль в сторону клика, пока игрок не нажимал клавишу движения снова.
  suspend() {
    this._suspended = true;
    if (this.activePointerId === null) return;
    this.activePointerId = null;
    this._drawBase(0, 0, false);
    this._drawKnob(0, 0, false);
    this.onMove(0, 0);
    this.onEnd();
  }

  // Разрешить джойстику снова реагировать на касания — звать при возврате в активный геймплей.
  resume() {
    this._suspended = false;
  }

  _inZone(x, y) {
    if (!this.zone) return true;
    return this.zone.contains(x, y);
  }

  _onDown(pointer) {
    if (this._suspended) return;
    // Если уже активен — игнорируем новые касания (мультитач-стабильность).
    if (this.activePointerId !== null) return;
    if (!this._inZone(pointer.x, pointer.y)) return;
    this.activePointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this._drawBase(this.baseX, this.baseY, true);
    this._drawKnob(this.baseX, this.baseY, true);
    this._update(pointer.x, pointer.y);
  }

  _onMoveEvt(pointer) {
    if (pointer.id !== this.activePointerId) return;
    this._update(pointer.x, pointer.y);
  }

  _onUp(pointer) {
    // Снимаем только тот указатель, что вёл джойстик. Чужой pointerup игнорируем.
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this._drawBase(0, 0, false);
    this._drawKnob(0, 0, false);
    this.onMove(0, 0);
    this.onEnd();
  }

  _update(px, py) {
    let dx = px - this.baseX;
    let dy = py - this.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > this.maxRadius) {
      dx = (dx / dist) * this.maxRadius;
      dy = (dy / dist) * this.maxRadius;
    }
    this._drawKnob(this.baseX + dx, this.baseY + dy, true);

    // Нормированный вектор направления: длина 0..1, мёртвая зона у нуля.
    const n = dist / this.maxRadius;
    if (n < this.deadZone) {
      this.onMove(0, 0);
      return;
    }
    // Слегка сглаживаем за мёртвой зоной, чтобы не было скачка от 0 к полному значению.
    const mag = Math.min(1, (n - this.deadZone) / (1 - this.deadZone));
    const ux = (px - this.baseX) / (dist || 1);
    const uy = (py - this.baseY) / (dist || 1);
    this.onMove(ux * mag, uy * mag);
  }

  _drawBase(x, y, visible) {
    this.base.clear();
    if (!visible) return;
    this.base.lineStyle(3, THEME.colors.primary, 0.5);
    this.base.fillStyle(THEME.colors.panel, 0.45);
    this.base.fillCircle(x, y, this.maxRadius);
    this.base.strokeCircle(x, y, this.maxRadius);
  }

  _drawKnob(x, y, visible) {
    this.knob.clear();
    if (!visible) return;
    this.knob.fillStyle(THEME.colors.primary, 0.85);
    this.knob.fillCircle(x, y, this.maxRadius * 0.42);
    this.knob.lineStyle(2, 0xffffff, 0.4);
    this.knob.strokeCircle(x, y, this.maxRadius * 0.42);
  }
}
