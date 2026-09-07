// ВРАГ. Замкнутый класс: спавнится, движется к игроку по AI, получает урон.
// Боссы (isBoss) имеют state-machine атак: залп снарядов, charge-dash с телеграфом,
// спавн аддов на поздних фазах HP. Атаки через колбэки сцене (onShoot/onSummon/onTelegraph),
// чтобы враг не знал о пулах сцены напрямую.
//
// AI рядовых: chase / zigzag / orbit. Босс: chase-медленный + фазы атак по таймерам и HP.
import { THEME } from '../../ui/theme.js';
import { BALANCE } from '../../data/balance.js';

// ЩИТ ЩИТОВИКА — чистая функция, поэтому проверяется юнит-тестом без поднятия игры.
// Щит закрывает ФРОНТ: удар в лоб почти не проходит, в спину — полностью. Это делает
// врага не «мешком с HP», а задачей на позицию: игрок должен обойти его, а не перестрелять.
// facing — куда враг смотрит (рад), (ex,ey) — где он, (sx,sy) — откуда прилетело.
export const SHIELD_FRONT_MULT = 0.2;   // доля урона, проходящая в лоб
export const SHIELD_ARC = Math.PI / 2;  // полураствор фронтального сектора (90° влево-вправо)

export function shieldMultiplier(facing, ex, ey, sx, sy) {
  if (typeof sx !== 'number' || typeof sy !== 'number') return 1; // источник неизвестен — без щита
  const toSrc = Math.atan2(sy - ey, sx - ex);
  let diff = toSrc - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= SHIELD_ARC ? SHIELD_FRONT_MULT : 1;
}

export class Enemy {
  constructor(scene, opts) {
    this.scene = scene;
    this.def = opts.def;
    this.x = opts.x;
    this.y = opts.y;
    this.target = opts.target;
    this.maxHp = opts.hp;
    this.hp = opts.hp;
    this.speed = opts.speed;
    this.radius = opts.radius || this.def.radius;
    this.contactDamage = opts.contactDamage;
    this.isBoss = !!opts.isBoss || !!this.def.isBoss;
    this.onDeath = opts.onDeath || (() => {});
    this.slowFactor = opts.slowFactor ?? 1;

    // Колбэки для атак босса (сцена реализует пулы/телеграф/аддов).
    this.onShoot = opts.onShoot || null;
    this.onSummon = opts.onSummon || null;
    this.onTelegraph = opts.onTelegraph || null;
    this.arenaCenter = opts.arenaCenter || null; // если задан — босс клампится в арену

    if (scene.textures.exists(this.def.texture)) {
      this.sprite = scene.add.image(this.x, this.y, this.def.texture);
      const size = this.radius * 2.4;
      this.sprite.setDisplaySize(size, size);
    } else {
      this.sprite = null;
      this._fallbackGfx = scene.add.graphics();
    }

    if (this.isBoss) {
      this.ring = scene.add.graphics();
      this._drawRing();
      this._initBossState();
    }

    this.ai = this.def.ai || 'chase';
    this.t = Math.random() * Math.PI * 2;
    this.alive = true;
    this.hpBar = null;
  }

  // Стейт атак босса.
  _initBossState() {
    this.shootTimer = 1.5;          // первая атака — с задержкой (игрок успевает сориентироваться)
    this.dashTimer = BALANCE.bossAttacks.dashCooldown;
    this.dashing = false;
    this.dashVx = 0; this.dashVy = 0;
    this.dashLife = 0;
    this.summonTimer = 6;
    this.bossPhase = 0;             // 0..2, растёт по порогам HP [0.66, 0.33]
  }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    if (this.weakenFor > 0) this.weakenFor -= dt;
    if (this.isBoss) { this._updateBoss(dt); }
    else { this._updateMinion(dt); }

    if (this.sprite) {
      this.sprite.x = this.x; this.sprite.y = this.y;
    } else {
      this._drawFallback();
    }
    if (this.ring) this._drawRing();
    this._updateHpBar();
  }

  _updateMinion(dt) {
    const tx = this.target.x, ty = this.target.y;
    let dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    let vx = 0, vy = 0;
    // Заморозка от эволюции «Мороз»: враг стоит, но остаётся целью.
    if (this.frozenFor > 0) {
      this.frozenFor -= dt;
      this.facing = Math.atan2(uy, ux);
      return;
    }
    const spd = this.speed * (this.slowFactor ?? 1);

    // ── Стрелок: держит дистанцию и стреляет. Заставляет игрока ДВИГАТЬСЯ, а не
    // нарезать круги вокруг толпы, — этого в игре не хватало: все враги шли вплотную.
    if (this.ai === 'ranged') {
      const want = this.def.keepRange || 260;
      if (d > want + 40) { vx = ux * spd; vy = uy * spd; }
      else if (d < want - 40) { vx = -ux * spd * 0.8; vy = -uy * spd * 0.8; }
      this.x += vx * dt; this.y += vy * dt;
      this.facing = Math.atan2(uy, ux);
      if (this.sprite) this.sprite.rotation = this.facing + Math.PI / 2;
      this.shootTimer = (this.shootTimer ?? (this.def.shootPeriod || 2.4)) - dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.def.shootPeriod || 2.4;
        if (this.onShoot) this.onShoot(this.x, this.y, this.facing, this.def.shootDamage || 10);
      }
      return;
    }

    // ── Щитовик: идёт в лоб, но фронт закрыт. Урон считается в takeDamage по углу.
    if (this.ai === 'shielded') {
      vx = ux * spd; vy = uy * spd;
      this.x += vx * dt; this.y += vy * dt;
      this.facing = Math.atan2(uy, ux);
      if (this.sprite) this.sprite.rotation = this.facing + Math.PI / 2;
      this._drawShield();
      return;
    }

    if (this.ai === 'chase') {
      vx = ux * spd; vy = uy * spd;
    } else if (this.ai === 'zigzag') {
      const wob = Math.sin(this.t * 4) * 0.7;
      vx = (ux - uy * wob) * spd; vy = (uy + ux * wob) * spd;
    } else if (this.ai === 'orbit') {
      const close = d < 200;
      const tang = Math.sin(this.t * 2.2);
      if (close) { vx = (ux * 0.2 - uy * tang) * spd; vy = (uy * 0.2 + ux * tang) * spd; }
      else { vx = ux * spd; vy = uy * spd; }
    }
    this.x += vx * dt; this.y += vy * dt;
    this.facing = Math.atan2(vy, vx);
    if (this.sprite) this.sprite.rotation = this.facing + Math.PI / 2;
  }

  // Дуга щита перед врагом: игрок должен ВИДЕТЬ, с какой стороны бить бесполезно.
  _drawShield() {
    if (!this._shieldGfx) this._shieldGfx = this.scene.add.graphics().setDepth(6);
    const g = this._shieldGfx;
    g.clear();
    g.lineStyle(5, 0x9fd8ff, 0.85);
    g.beginPath();
    g.arc(this.x, this.y, this.radius + 10, this.facing - SHIELD_ARC, this.facing + SHIELD_ARC);
    g.strokePath();
  }

  // БОСС: медленное приближение + атаки по таймерам, фазы по HP.
  _updateBoss(dt) {
    const A = BALANCE.bossAttacks;
    // Фазы по HP (доля): на порогах — апгрейд фазы (сильнее атаки).
    const frac = this.hp / this.maxHp;
    const newPhase = frac <= 0.33 ? 2 : (frac <= 0.66 ? 1 : 0);
    if (newPhase > this.bossPhase) this.bossPhase = newPhase;

    // Charge-dash: приоритетная атака. Во время рывка — только движение по вектору.
    if (this.dashing) {
      this.x += this.dashVx * dt; this.y += this.dashVy * dt;
      this.dashLife -= dt;
      if (this.dashLife <= 0) { this.dashing = false; this.dashTimer = A.dashCooldown; }
      this._clampArena();
      return;
    }

    // Медленное приближение к игроку (босс не «догоняет», а держит дистанцию для атак).
    const tx = this.target.x, ty = this.target.y;
    let dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = 200; // держится на дистанции ~200px
    if (d > want + 30) {
      const spd = this.speed * 0.6;
      this.x += (dx / d) * spd * dt; this.y += (dy / d) * spd * dt;
    } else if (d < want - 30) {
      const spd = this.speed * 0.5;
      this.x -= (dx / d) * spd * dt; this.y -= (dy / d) * spd * dt;
    }
    this._clampArena();

    // ── Залп снарядов (веер в сторону игрока) ──
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      // На поздних фазах залпы чаще.
      const period = A.volleyPeriod * (this.bossPhase >= 2 ? 0.6 : (this.bossPhase >= 1 ? 0.8 : 1));
      this.shootTimer = period;
      const baseAng = Math.atan2(dy, dx);
      const n = A.volleyCount;
      for (let i = 0; i < n; i++) {
        const a = baseAng - A.volleySpread / 2 + (A.volleySpread / (n - 1)) * i;
        if (this.onShoot) this.onShoot(this.x, this.y, a, A.volleyBulletDamage);
      }
    }

    // ── Charge-dash с телеграфом (только с фазы 1+) ──
    if (this.bossPhase >= 1) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.dashTimer = A.dashCooldown;
        // Телеграф: предупредить, потом рывок к позиции игрока.
        const tx2 = this.target.x, ty2 = this.target.y;
        if (this.onTelegraph) this.onTelegraph(this.x, this.y, 60, A.dashTelegraph);
        // Запускаем рывок после задержки телеграфа.
        this.scene.time.delayedCall(A.dashTelegraph * 1000, () => {
          if (!this.alive) return;
          const ax = this.target.x - this.x, ay = this.target.y - this.y;
          const ad = Math.hypot(ax, ay) || 1;
          this.dashVx = (ax / ad) * A.dashSpeed;
          this.dashVy = (ay / ad) * A.dashSpeed;
          this.dashing = true;
          this.dashLife = 0.55;
        });
      }
    }

    // ── Спавн аддов (только с фазы 2 / порога addSpawnThreshold) ──
    if (this.bossPhase >= 2 && frac <= BALANCE.bossAttacks.addSpawnThreshold + 0.01) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = A.addSpawnPeriod;
        if (this.onSummon) this.onSummon(A.addCount);
      }
    }
  }

  _clampArena() {
    if (!this.arenaCenter) return;
    const ac = this.arenaCenter;
    const ar = BALANCE.waves.bossArenaRadius - this.radius;
    const dx = this.x - ac.x, dy = this.y - ac.y;
    const d = Math.hypot(dx, dy);
    if (d > ar) { this.x = ac.x + (dx / d) * ar; this.y = ac.y + (dy / d) * ar; }
  }

  // srcX/srcY — откуда прилетело. Нужны щитовику: удар в лоб он почти держит.
  takeDamage(amount, srcX, srcY) {
    if (!this.alive) return false;
    let dmg = amount;
    if (this.ai === 'shielded') {
      dmg = Math.max(1, Math.round(amount * shieldMultiplier(this.facing || 0, this.x, this.y, srcX, srcY)));
    }
    this.hp -= dmg;
    if (this.sprite) {
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(40, () => { if (this.sprite) this.sprite.clearTint(); });
    }
    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  // Контакт с игроком. Во время charge-dash урон выше (главная угроза босса).
  takeContact() {
    let dmg = (this.isBoss && this.dashing) ? BALANCE.bossAttacks.dashDamage : this.contactDamage;
    // Ослабление (апгрейд «Ослабление»): временно снижает контактный урон после попадания.
    if (this.weakenFor > 0) dmg = Math.round(dmg * (this.weakenMult ?? 1));
    return dmg;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    if (this.sprite) this.sprite.destroy();
    if (this._fallbackGfx) this._fallbackGfx.destroy();
    if (this._shieldGfx) this._shieldGfx.destroy();
    if (this.ring) this.ring.destroy();
    if (this.hpBar) this.hpBar.destroy();
    this.onDeath(this);
  }

  destroy() { this.die(); }

  _drawRing() {
    if (!this.ring) return;
    this.ring.clear();
    // Во время рывка — пульсирующее красное (опасность), иначе розовое.
    const col = this.dashing ? 0xff1a3c : THEME.colors.danger;
    this.ring.lineStyle(this.dashing ? 6 : 4, col, this.dashing ? 0.9 : 0.55);
    this.ring.strokeCircle(this.x, this.y, this.radius + 12);
  }

  _drawFallback() {
    if (!this._fallbackGfx) return;
    this._fallbackGfx.clear();
    this._fallbackGfx.fillStyle(this.def.color || 0xff3b6e, 1);
    this._fallbackGfx.fillCircle(this.x, this.y, this.radius);
  }

  _updateHpBar() {
    if (this.isBoss) return; // у босса полоску рисует HUD сцены
    const wounded = this.hp < this.maxHp;
    if (wounded && !this.hpBar) {
      this.hpBar = this.scene.add.graphics().setDepth(5);
    } else if (!wounded && this.hpBar) {
      this.hpBar.destroy(); this.hpBar = null;
    }
    if (!this.hpBar) return;
    const w = this.radius * 1.8, h = 5;
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.5);
    this.hpBar.fillRect(this.x - w / 2, this.y - this.radius - 12, w, h);
    this.hpBar.fillStyle(THEME.colors.danger, 1);
    this.hpBar.fillRect(this.x - w / 2, this.y - this.radius - 12, w * pct, h);
  }
}
