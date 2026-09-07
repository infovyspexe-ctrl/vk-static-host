// БОЕВЫЕ СУЩНОСТИ ОРУЖИЙ: зоны, лучи, мины, рикошеты, чёрные дыры, орбитальные сферы.
//
// Зачем отдельный модуль: поведения оружий (mechanics/weapons/behaviors.js) описывают
// МЕХАНИКУ и про Phaser не знают — они только просят «сделай зону здесь». Кто-то должен
// эти просьбы исполнять: рисовать, двигать, считать попадания. Раньше такой код рос бы
// внутри GameScene, а она и без того на 1200 строк.
//
// Про конкретную игру модуль не знает: враги, урон и звук приходят колбэками.
import { THEME } from '../../ui/theme.js';

export function createArenaEffects(scene, { getEnemies, damageEnemy, onHitFx } = {}) {
  const enemies = () => (getEnemies ? getEnemies() : []);
  // source нужен игре для достижений («босс, добитый миной») — сам модуль его не трактует.
  const hurt = (e, dmg, source) => { if (damageEnemy) damageEnemy(e, dmg, source); };

  const areas = [];       // мгновенные волны (нова)
  const beams = [];       // лучи (лазер)
  const mines = [];       // мины
  const shots = [];       // рикошеты
  const holes = [];       // чёрные дыры
  let orbiters = [];      // орбитальные сферы
  let orbitCfg = null;

  // ── Волна-кольцо: мгновенный урон по радиусу + видимая вспышка ──
  function spawnArea({ x, y, radius, damage, color, freeze, source }) {
    for (const e of enemies()) {
      if (!e.alive) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        hurt(e, damage, source);
        if (freeze && e.alive) e.frozenFor = Math.max(e.frozenFor || 0, freeze);
      }
    }
    const gfx = scene.add.graphics().setDepth(24);
    areas.push({ gfx, x, y, radius, life: 0.25, max: 0.25, color: color || THEME.colors.primary });
  }

  // ── Луч: прямоугольная зона от корабля. Урон всем, кто внутри ──
  function spawnBeam({ x, y, angle, length, width, damage, crit }) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (const e of enemies()) {
      if (!e.alive) continue;
      const rx = e.x - x, ry = e.y - y;
      const along = rx * cos + ry * sin;              // проекция на ось луча
      if (along < 0 || along > length) continue;
      const across = Math.abs(-rx * sin + ry * cos);  // отклонение от оси
      if (across <= width / 2 + e.radius) hurt(e, damage);
    }
    const gfx = scene.add.graphics().setDepth(24);
    beams.push({ gfx, x, y, angle, length, width, life: 0.12, max: 0.12, crit: !!crit });
  }

  // ── Мина: лежит, ждёт врага, взрывается ──
  function spawnMine({ x, y, damage, radius, fuse, sublings, subDmg, subRadius }) {
    const gfx = scene.add.graphics().setDepth(18);
    mines.push({ gfx, x, y, damage, radius, life: fuse || 8, armed: 0.3,
                 sublings: sublings || 0, subDmg: subDmg || 0, subRadius: subRadius || 0 });
  }

  function explodeMine(m) {
    spawnArea({ x: m.x, y: m.y, radius: m.radius, damage: m.damage,
                color: THEME.colors.accent, source: 'mine' });
    // Кассетная эволюция: суб-взрывы по кругу вокруг основного.
    for (let i = 0; i < m.sublings; i++) {
      const a = (i / m.sublings) * Math.PI * 2;
      const sx = m.x + Math.cos(a) * m.radius * 0.8;
      const sy = m.y + Math.sin(a) * m.radius * 0.8;
      scene.time.delayedCall(90 + i * 60, () => {
        spawnArea({ x: sx, y: sy, radius: m.subRadius, damage: m.subDmg,
                    color: THEME.colors.accent, source: 'mine' });
      });
    }
    m.life = 0;
  }

  // ── Рикошет: летит, бьёт, ищет следующую цель ──
  function spawnRicochet({ x, y, angle, damage, bounces, jump, speed }) {
    const gfx = scene.add.graphics().setDepth(21);
    shots.push({ gfx, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                 speed, damage, bounces, jump, life: 4, hit: new Set() });
  }

  // ── Чёрная дыра: тянет и тикает урон ──
  function spawnBlackhole({ x, y, radius, pull, dps, duration }) {
    const gfx = scene.add.graphics().setDepth(17);
    holes.push({ gfx, x, y, radius, pull, dps, life: duration, max: duration, tick: 0 });
  }

  // ── Орбитальные сферы: постоянные, живут между вызовами ──
  function setOrbiters({ count, damage, hitCooldown, orbit, blocks }) {
    orbitCfg = { count, damage, hitCooldown: hitCooldown || 0.6, orbit: orbit || 80, blocks: !!blocks };
    while (orbiters.length > count) {
      const o = orbiters.pop();
      o.gfx.destroy();
    }
    while (orbiters.length < count) {
      orbiters.push({
        angle: (orbiters.length / Math.max(1, count)) * Math.PI * 2,
        gfx: scene.add.graphics().setDepth(27),
        cool: new Map()   // враг → сколько ещё нельзя бить снова
      });
    }
    // Пересобираем углы, чтобы сферы стояли равномерно после изменения количества.
    orbiters.forEach((o, i) => { o.baseAngle = (i / Math.max(1, orbiters.length)) * Math.PI * 2; });
  }

  function update(dt, playerX, playerY, hostileBullets) {
    // Волны
    for (const a of areas) {
      a.life -= dt;
      const k = Math.max(0, a.life / a.max);
      a.gfx.clear();
      a.gfx.lineStyle(6 * k + 2, a.color, 0.25 + 0.55 * k);
      a.gfx.strokeCircle(a.x, a.y, a.radius * (1.1 - 0.25 * k));
    }
    prune(areas);

    // Лучи
    for (const b of beams) {
      b.life -= dt;
      const k = Math.max(0, b.life / b.max);
      const col = b.crit ? THEME.colors.accent : THEME.colors.primary;
      b.gfx.clear();
      b.gfx.fillStyle(col, 0.20 * k);
      drawBeamRect(b.gfx, b, b.width * 2.2);
      b.gfx.fillStyle(0xffffff, 0.85 * k);
      drawBeamRect(b.gfx, b, b.width * 0.55);
    }
    prune(beams);

    // Мины
    for (const m of mines) {
      m.life -= dt;
      m.armed = Math.max(0, m.armed - dt);
      const pulse = 0.6 + 0.4 * Math.sin(scene.time.now / 160);
      m.gfx.clear();
      m.gfx.fillStyle(THEME.colors.accent, 0.25 * pulse);
      m.gfx.fillCircle(m.x, m.y, 18);
      m.gfx.fillStyle(THEME.colors.accent, 1);
      m.gfx.fillCircle(m.x, m.y, 7);
      if (m.armed > 0) continue;
      for (const e of enemies()) {
        if (!e.alive) continue;
        const dx = e.x - m.x, dy = e.y - m.y;
        const rr = e.radius + 16;
        if (dx * dx + dy * dy <= rr * rr) { explodeMine(m); break; }
      }
    }
    prune(mines);

    // Рикошеты
    for (const s of shots) {
      s.life -= dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.gfx.clear();
      s.gfx.fillStyle(THEME.colors.xp, 0.35);
      s.gfx.fillCircle(s.x, s.y, 16);
      s.gfx.fillStyle(0xffffff, 1);
      s.gfx.fillCircle(s.x, s.y, 7);
      for (const e of enemies()) {
        if (!e.alive || s.hit.has(e)) continue;
        const dx = e.x - s.x, dy = e.y - s.y;
        const rr = e.radius + 8;
        if (dx * dx + dy * dy > rr * rr) continue;
        s.hit.add(e);
        hurt(e, s.damage);
        if (onHitFx) onHitFx(s.x, s.y, false);
        if (s.bounces <= 0) { s.life = 0; break; }
        s.bounces--;
        // Ищем следующую цель в радиусе прыжка; не нашли — шар гаснет.
        const next = nearestExcept(s.x, s.y, s.jump, s.hit);
        if (!next) { s.life = 0; break; }
        const a = Math.atan2(next.y - s.y, next.x - s.x);
        s.vx = Math.cos(a) * s.speed; s.vy = Math.sin(a) * s.speed;
        break;
      }
    }
    prune(shots);

    // Чёрные дыры
    for (const h of holes) {
      h.life -= dt;
      h.tick += dt;
      const k = Math.max(0, h.life / h.max);
      h.gfx.clear();
      h.gfx.fillStyle(0x2a0d4a, 0.5 * k + 0.2);
      h.gfx.fillCircle(h.x, h.y, h.radius * (0.35 + 0.1 * Math.sin(scene.time.now / 120)));
      h.gfx.lineStyle(3, THEME.colors.xp, 0.6 * k);
      h.gfx.strokeCircle(h.x, h.y, h.radius);
      const doDamage = h.tick >= 0.25;
      if (doDamage) h.tick = 0;
      for (const e of enemies()) {
        if (!e.alive) continue;
        const dx = h.x - e.x, dy = h.y - e.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > h.radius * h.radius) continue;
        const d = Math.sqrt(d2) || 1;
        // Босса не тянем: иначе дыра ломает его стейт-машину и бой превращается в фарс.
        if (!e.isBoss) {
          e.x += (dx / d) * h.pull * dt;
          e.y += (dy / d) * h.pull * dt;
        }
        if (doDamage) hurt(e, Math.max(1, Math.round(h.dps * 0.25)));
      }
    }
    prune(holes);

    // Орбитальные сферы
    if (orbitCfg && orbiters.length) {
      for (const o of orbiters) {
        o.baseAngle = (o.baseAngle || 0) + dt * 2.2;
        const ox = playerX + Math.cos(o.baseAngle) * orbitCfg.orbit;
        const oy = playerY + Math.sin(o.baseAngle) * orbitCfg.orbit;
        o.x = ox; o.y = oy;
        o.gfx.clear();
        o.gfx.fillStyle(THEME.colors.primary, 0.3);
        o.gfx.fillCircle(ox, oy, 20);
        o.gfx.fillStyle(0xffffff, 1);
        o.gfx.fillCircle(ox, oy, 9);

        for (const [e, t] of o.cool) {
          const left = t - dt;
          if (left <= 0 || !e.alive) o.cool.delete(e); else o.cool.set(e, left);
        }
        for (const e of enemies()) {
          if (!e.alive || o.cool.has(e)) continue;
          const dx = e.x - ox, dy = e.y - oy;
          const rr = e.radius + 12;
          if (dx * dx + dy * dy <= rr * rr) {
            hurt(e, orbitCfg.damage);
            o.cool.set(e, orbitCfg.hitCooldown);
          }
        }
        // Эгида: сферы сбивают вражеские снаряды.
        if (orbitCfg.blocks && hostileBullets) {
          for (const b of hostileBullets) {
            if (!b.alive) continue;
            const dx = b.x - ox, dy = b.y - oy;
            if (dx * dx + dy * dy <= (b.r + 16) * (b.r + 16)) b.alive = false;
          }
        }
      }
    }
  }

  function nearestExcept(x, y, range, exclude) {
    let best = null, bestD = range * range;
    for (const e of enemies()) {
      if (!e.alive || exclude.has(e)) continue;
      const dx = e.x - x, dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function drawBeamRect(gfx, b, w) {
    const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
    const hx = -sin * w / 2, hy = cos * w / 2;
    gfx.fillPoints([
      { x: b.x + hx, y: b.y + hy },
      { x: b.x + cos * b.length + hx, y: b.y + sin * b.length + hy },
      { x: b.x + cos * b.length - hx, y: b.y + sin * b.length - hy },
      { x: b.x - hx, y: b.y - hy }
    ], true);
  }

  function prune(list) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].life <= 0) { list[i].gfx.destroy(); list.splice(i, 1); }
    }
  }

  function destroyAll() {
    for (const list of [areas, beams, mines, shots, holes]) {
      list.forEach((o) => o.gfx.destroy());
      list.length = 0;
    }
    orbiters.forEach((o) => o.gfx.destroy());
    orbiters = [];
    orbitCfg = null;
  }

  return { spawnArea, spawnBeam, spawnMine, spawnRicochet, spawnBlackhole, setOrbiters,
           update, destroyAll };
}
