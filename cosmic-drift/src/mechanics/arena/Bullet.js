// СНАРЯД. Простой класс: летит по вектору, при попадании по врагу наносит урон,
// может пробить N врагов. Жизнь ограничена дальностью (дистанцией полёта).
// Не знает про игрока — только про стартовую точку и направление.
export class Bullet {
  constructor(scene, x, y, angle, opts) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.angle = angle;                  // текущее направление (рад) — меняется при наведении
    this.vx = Math.cos(angle) * opts.speed;
    this.vy = Math.sin(angle) * opts.speed;
    this.speed = opts.speed;
    this.damage = opts.damage;
    this.radius = opts.radius;
    this.pierce = opts.pierce || 0;     // сколько ещё врагов пробить
    this.range = opts.range;            // дальность полёта
    this.travelled = 0;
    this.alive = true;
    this.hit = new Set();
    this.homing = opts.homing || 0;     // рад/сек скорости наведения (0 = не наводится)
    this.crit = !!opts.crit;
    this.targetFn = opts.target || null;// функция, возвращающая текущую цель {x,y}

    // Визуал: неоновый шарик. Крит — золотой.
    this.gfx = scene.add.graphics().setDepth(20);
    this._draw();
  }

  update(dt, enemies) {
    if (!this.alive) return;
    // Наведение: плавно доворачиваем вектор к цели.
    if (this.homing > 0 && this.targetFn) {
      const tgt = this.targetFn();
      if (tgt) {
        const desired = Math.atan2(tgt.y - this.y, tgt.x - this.x);
        let diff = desired - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-this.homing * dt, Math.min(this.homing * dt, diff));
        this.angle += turn;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
    }
    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    this.x += stepX;
    this.y += stepY;
    this.travelled += Math.hypot(stepX, stepY);
    this.gfx.x = this.x;
    this.gfx.y = this.y;

    if (this.travelled > this.range) { this._destroy(); return; }

    for (const e of enemies) {
      if (!e.alive || this.hit.has(e)) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const rr = e.radius + this.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        this.hit.add(e);
        // Позиция снаряда нужна щитовику: он держит удар в лоб и почти не держит в спину.
        const killed = e.takeDamage(this.damage, this.x, this.y);
        // Колбэк нужен сцене для вспышки/звука/подсчёта убийств.
        if (this.onHit) this.onHit(e, killed);
        if (this.pierce > 0) {
          this.pierce--;
        } else {
          this._destroy();
          return;
        }
      }
    }
  }

  setOnHit(cb) { this.onHit = cb; }

  _draw() {
    this.gfx.clear();
    const glow = this.crit ? 0xffd54f : 0x38e8ff;
    this.gfx.fillStyle(glow, 0.35);
    this.gfx.fillCircle(0, 0, this.radius * 2.2);
    this.gfx.fillStyle(0xffffff, 1);
    this.gfx.fillCircle(0, 0, this.radius);
  }

  _destroy() {
    this.alive = false;
    if (this.gfx) this.gfx.destroy();
  }

  destroy() { this._destroy(); }
}
