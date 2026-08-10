// БОЙ. Чистые функции над «сущностями» — простыми объектами { hp, maxHp, atk, def,
// evadeChance?, rootOnHitChance? }. Модуль не знает про реликвии/героев по имени —
// run.js агрегирует эффекты реликвий в эти числовые поля один раз при выборе.
export function rollDamage(atk, def, rng, combatCfg) {
  const variance = combatCfg.dmgVariance;
  const mult = 1 + (rng.next() * 2 - 1) * variance;
  return Math.max(combatCfg.minDmg, Math.round((atk - def) * mult));
}

// resolveAttack(attacker, defender, rng, BALANCE, opts) -> { missed, dmg, killed, rooted }
// opts.dmgMult — множитель урона скилла (см. heroes.js skills[].dmgMult).
export function resolveAttack(attacker, defender, rng, balance, opts = {}) {
  // Блок (герой «Щит») отменяет ВЕСЬ входящий удар целиком и разово, до броска урона —
  // проверяется раньше уклонения, чтобы игрок был уверен: щит = 100% защита на этот удар.
  if (defender.blockNext) {
    defender.blockNext = false;
    return { missed: false, blocked: true, dmg: 0, killed: false, rooted: false };
  }
  if (defender.evadeChance && rng.chance(defender.evadeChance)) {
    return { missed: true, dmg: 0, killed: false, rooted: false };
  }
  const atk = attacker.atk * (opts.dmgMult || 1);
  const dmg = rollDamage(atk, defender.def, rng, balance.combat);
  defender.hp = Math.max(0, defender.hp - dmg);
  const killed = defender.hp <= 0;
  const rooted = !killed && !!defender.rootOnHitChance && rng.chance(defender.rootOnHitChance);
  return { missed: false, dmg, killed, rooted };
}

export function heal(entity, amount) {
  const before = entity.hp;
  entity.hp = Math.min(entity.maxHp, entity.hp + amount);
  return entity.hp - before;
}

export function isAlive(entity) { return entity.hp > 0; }
