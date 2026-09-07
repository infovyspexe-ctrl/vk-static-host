// ТИКЕР ОРУЖИЙ: копит время, дёргает поведение, когда кулдаун набежал.
//
// Замкнутый модуль: про Phaser не знает. Набор приходит снаружи (loadout), поведение —
// таблицей функций, весь доступ к миру идёт через ctx с колбэками сцены.
//
// Почему НАКОПЛЕНИЕ, а не «стрелять раз в кадр»: при 60 FPS кадр 16 мс, а кулдауны у
// оружий от 0.22 до 6 секунд. Считать «прошёл ли кулдаун» по кадрам — значит терять
// остаток времени на каждом выстреле и получать плавающую скорострельность.

// Потолок срабатываний одного оружия за тик. Нужен на случай большого dt: вкладку свернули,
// вернулись — иначе накопленные минуты выстрелят разом стеной снарядов и уронят кадр.
export const MAX_FIRES_PER_TICK = 3;

export function createWeaponTicker({ loadout, behaviors = {} } = {}) {
  const cooldowns = new Map();   // id → сколько времени осталось до следующего срабатывания

  function update(dt, ctx) {
    const step = (typeof dt === 'number' && isFinite(dt) && dt > 0) ? dt : 0;
    if (step <= 0) return;
    const rateMul = (ctx && ctx.stats && ctx.stats.rateMul) || 1;

    for (const item of loadout.active()) {
      const { id, level, def, stats } = item;
      const fire = behaviors[id];
      if (!fire) continue;                       // поведения нет — оружие молчит, но тик живёт

      const cd = Math.max(0.05, (stats.cd || 1) / rateMul);
      // Новое оружие входит в ритм через свой кулдаун, а не бьёт мгновенно в момент
      // закрытия окна выбора. Со стартом от нуля первый же тик давал лишнее срабатывание,
      // и скорострельность на первой секунде была выше заявленной.
      let left = cooldowns.has(id) ? cooldowns.get(id) : cd;
      left -= step;

      let fired = 0;
      while (left <= 0 && fired < MAX_FIRES_PER_TICK) {
        // Оружиям с needsTarget без врага стрелять некуда: держим кулдаун готовым,
        // чтобы выстрел случился сразу, как только цель появится.
        if (def.needsTarget && ctx.nearestEnemy && !ctx.nearestEnemy()) {
          left = 0;
          break;
        }
        try {
          fire(ctx, stats, level);
        } catch (e) {
          // Сбой одного оружия (например, упал визуальный эффект) не должен ронять бой целиком.
          console.warn('[weapons] поведение «' + id + '» упало', e);
        }
        fired++;
        left += cd;
      }
      cooldowns.set(id, left);
    }
  }

  function reset() { cooldowns.clear(); }

  return { update, reset };
}
