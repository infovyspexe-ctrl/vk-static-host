// ЧТО ДЕЛАЕТ ВЫСТРЕЛ. По функции на каждое оружие: (ctx, stats, level) → эффект.
//
// Модуль замкнутый: ни Phaser, ни сцены, ни спрайтов здесь нет. Всё, что нужно от мира,
// приходит колбэками в ctx — сцена сама решает, как это нарисовать и как посчитать
// столкновения. Поэтому поведение читается как описание механики, а не как графика.
//
// Контракт ctx:
//   playerX, playerY, lastAngle
//   stats: { damageMul, rateMul, range, bulletSpeed, pierce, critChance, critMult, bulletSizeBonus }
//   nearestEnemy() → {x,y} | null
//   spawnBullet({ x, y, angle, speed, damage, radius, pierce, range, homing, crit })
//   spawnArea({ x, y, radius, damage, color, freeze })
//   spawnBeam({ x, y, angle, length, width, damage, crit })
//   spawnMine({ x, y, damage, radius, fuse, sublings, subDmg, subRadius })
//   spawnRicochet({ x, y, angle, damage, bounces, jump, speed })
//   spawnBlackhole({ x, y, radius, pull, dps, duration })
//   setOrbiters({ count, damage, hitCooldown, orbit, blocks })
//
// Урон везде считается как ПЛОСКОЕ число оружия × ctx.stats.damageMul: апгрейд «Урон»
// усиливает все оружия сразу, но перестаёт быть единственным содержанием прокачки.

// Общий расчёт урона с критом. Крит — множитель на ОТДЕЛЬНЫЙ выстрел (как и раньше в игре),
// поэтому средний DPS растёт линейно от шанса, а не разгоняется экспонентой.
function roll(ctx, base) {
  const dmg = Math.max(1, Math.round(base * (ctx.stats.damageMul || 1)));
  const crit = Math.random() < (ctx.stats.critChance || 0);
  return { damage: crit ? Math.round(dmg * (ctx.stats.critMult || 2)) : dmg, crit };
}

// Угол на ближайшего врага; если врагов нет — направление движения корабля.
function aimAngle(ctx) {
  const t = ctx.nearestEnemy ? ctx.nearestEnemy() : null;
  if (t) return Math.atan2(t.y - ctx.playerY, t.x - ctx.playerX);
  return ctx.lastAngle || 0;
}

// Веер снарядов: общая часть бластера и его эволюции.
// multishotBonus — пассив «Мультивыстрел» (data/upgrades.js): раньше прибавлял
// state.multishot, но это число нигде не читалось при стрельбе — апгрейд был взят,
// виден в HUD, а снарядов больше не летело (жалоба игрока 2026-08-22). Добавляется
// ПОВЕРХ count конкретного оружия, а не заменяет его.
function fireSpread(ctx, { count, damage, spread, pierce, range }) {
  const base = aimAngle(ctx);
  const n = Math.max(1, count + (ctx.stats.multishotBonus || 0));
  const arc = n > 1 ? (spread ?? 0.18 * (n - 1)) : 0;
  const start = base - arc / 2;
  const stepAng = n > 1 ? arc / (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    const r = roll(ctx, damage);
    // Хоминг остаётся пассивом из upgrades.js: доля снарядов доворачивает к цели.
    const homing = Math.random() < (ctx.stats.homingChance || 0) ? (ctx.stats.homingTurn || 4.5) : 0;
    ctx.spawnBullet({
      x: ctx.playerX, y: ctx.playerY, angle: start + stepAng * i,
      speed: ctx.stats.bulletSpeed, damage: r.damage, crit: r.crit,
      radius: 8 + (ctx.stats.bulletSizeBonus || 0),
      pierce: (pierce ?? 0) + (ctx.stats.pierce || 0),
      range: range || ctx.stats.range * 1.6
    });
  }
}

export const BEHAVIORS = {
  // ── Бластер: снаряды в ближайшего. Это прежняя авто-стрельба игры ──
  blaster(ctx, stats) {
    fireSpread(ctx, { count: stats.count, damage: stats.dmg });
  },

  // ── Нова: кольцо-импульс вокруг корабля. Ответ на окружение ──
  nova(ctx, stats) {
    const r = roll(ctx, stats.dmg);
    ctx.spawnArea({ x: ctx.playerX, y: ctx.playerY, radius: stats.radius, damage: r.damage });
  },

  // ── Орбитальные сферы: не «стреляют», а поддерживают своё состояние ──
  // Тикер зовёт это по кулдауну; поведение лишь синхронизирует то, что должно крутиться.
  orbiters(ctx, stats) {
    ctx.setOrbiters({
      count: stats.count,
      damage: Math.max(1, Math.round(stats.dmg * (ctx.stats.damageMul || 1))),
      hitCooldown: stats.cd, orbit: stats.orbit
    });
  },

  // ── Луч: прямая зона урона к ближайшему врагу ──
  laser(ctx, stats) {
    const r = roll(ctx, stats.dmg);
    ctx.spawnBeam({
      x: ctx.playerX, y: ctx.playerY, angle: aimAngle(ctx),
      length: stats.length, width: stats.width, damage: r.damage, crit: r.crit
    });
  },

  // ── Мины: сбрасываются ЗА СПИНОЙ, награда за кайтинг ──
  mines(ctx, stats) {
    const r = roll(ctx, stats.dmg);
    const back = (ctx.lastAngle || 0) + Math.PI;
    ctx.spawnMine({
      x: ctx.playerX + Math.cos(back) * 40, y: ctx.playerY + Math.sin(back) * 40,
      damage: r.damage, radius: stats.radius, fuse: stats.fuse
    });
  },

  // ── Рикошет: шар скачет между врагами ──
  ricochet(ctx, stats) {
    const r = roll(ctx, stats.dmg);
    ctx.spawnRicochet({
      x: ctx.playerX, y: ctx.playerY, angle: aimAngle(ctx),
      damage: r.damage, bounces: stats.bounces, jump: stats.jump,
      speed: (ctx.stats.bulletSpeed || 540) * 0.9
    });
  },

  // ── Чёрная дыра: стягивает толпу и тикает урон. Ставится на ближайшего врага ──
  blackhole(ctx, stats) {
    const t = ctx.nearestEnemy ? ctx.nearestEnemy() : null;
    const x = t ? t.x : ctx.playerX + Math.cos(ctx.lastAngle || 0) * 160;
    const y = t ? t.y : ctx.playerY + Math.sin(ctx.lastAngle || 0) * 160;
    ctx.spawnBlackhole({
      x, y, radius: stats.radius, pull: stats.pull, duration: stats.duration,
      dps: Math.max(1, Math.round(stats.dps * (ctx.stats.damageMul || 1)))
    });
  },

  // ═══ ЭВОЛЮЦИИ ═══

  // Шторм: широкий веер со сквозным пробитием — бластер перестаёт быть «одна цель».
  evo_storm(ctx, stats) {
    fireSpread(ctx, { count: stats.count, damage: stats.dmg, spread: stats.spread, pierce: stats.pierce });
  },

  // Мороз: нова, которая ещё и замораживает — контроль вместо чистого урона.
  evo_frost(ctx, stats) {
    const r = roll(ctx, stats.dmg);
    ctx.spawnArea({
      x: ctx.playerX, y: ctx.playerY, radius: stats.radius,
      damage: r.damage, freeze: stats.freeze, color: 0x7fdcff
    });
  },

  // Эгида: больше сфер, и они сбивают вражеские снаряды (blocks).
  evo_aegis(ctx, stats) {
    ctx.setOrbiters({
      count: stats.count,
      damage: Math.max(1, Math.round(stats.dmg * (ctx.stats.damageMul || 1))),
      hitCooldown: stats.cd, orbit: stats.orbit, blocks: true
    });
  },

  // Призма: на крите луч раздваивается — крит начинает менять КАРТИНУ, а не только число.
  evo_prism(ctx, stats) {
    const base = aimAngle(ctx);
    const r = roll(ctx, stats.dmg);
    ctx.spawnBeam({ x: ctx.playerX, y: ctx.playerY, angle: base,
      length: stats.length, width: stats.width, damage: r.damage, crit: r.crit });
    if (r.crit) {
      const half = (stats.split || 0.5) / 2;
      for (const s of [-half, half]) {
        ctx.spawnBeam({ x: ctx.playerX, y: ctx.playerY, angle: base + s,
          length: stats.length * 0.8, width: stats.width * 0.7, damage: Math.round(r.damage * 0.6), crit: true });
      }
    }
  },

  // Кассета: мина рассыпается на суб-взрывы.
  evo_cluster(ctx, stats) {
    const r = roll(ctx, stats.dmg);
    const back = (ctx.lastAngle || 0) + Math.PI;
    ctx.spawnMine({
      x: ctx.playerX + Math.cos(back) * 40, y: ctx.playerY + Math.sin(back) * 40,
      damage: r.damage, radius: stats.radius, fuse: stats.fuse,
      sublings: stats.sublings,
      subDmg: Math.max(1, Math.round(stats.subDmg * (ctx.stats.damageMul || 1))),
      subRadius: stats.subRadius
    });
  }
};
