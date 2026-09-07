// ROGUE-LITE АПГРЕЙДЫ — предлагаются между уровнями (выбор 1 из 3).
// Каждый апгрейд — замкнутая запись: id, иконка, имя (i18n-ключ), описание (i18n-ключ),
// apply(state) применяет эффект к боевому состоянию игрока, rarity — вес в выборке.
//
// icon — ключ текстуры из assets/ (после prep_icons). name/desc — КЛЮЧИ в strings.js.
// rarity: common (вес 1.0), rare (0.5), epic (0.22). Чем выше редкость, тем реже выпадает.
//
// maxStacks — сколько раз можно взять один апгрейд за партию (защита от бесконечного стака).
// apply получает полный объект state (игрок), мутирует его поля.
//
// Потолки подняты 2026-08-21: при PASSIVE_SLOTS=4 и части потолков 3-4 пул реально
// пересыхал к 12 уровню (игра бесконечная, а выбор кончался раньше, чем росла сложность
// волн). Сильные/потенциально ломающие эффекты (multishot, pierce) остались ниже общей
// планки 8, но подняты с 4 до 6 — не безлимит, но заметно дальше от мгновенного упора.
export const UPGRADES = [
  // ── Урон ──
  { id: 'damage', icon: 'upg_damage', name: 'up_damage_name', desc: 'up_damage_desc',
    rarity: 'common', maxStacks: 8,
    apply: (s) => { s.damage = Math.round(s.damage * 1.22 + 2); } },
  // ── Скорострельность ──
  { id: 'fireRate', icon: 'upg_firerate', name: 'up_firerate_name', desc: 'up_firerate_desc',
    rarity: 'common', maxStacks: 8,
    apply: (s) => { s.fireRate = s.fireRate * 1.15; } },
  // ── Скорость движения ──
  { id: 'speed', icon: 'upg_speed', name: 'up_speed_name', desc: 'up_speed_desc',
    rarity: 'common', maxStacks: 6,
    apply: (s) => { s.speed = Math.round(s.speed * 1.1 + 6); } },
  // ── Макс. HP (и лечит на величину прибавки) ──
  { id: 'maxHp', icon: 'upg_maxhp', name: 'up_maxhp_name', desc: 'up_maxhp_desc',
    rarity: 'common', maxStacks: 8,
    apply: (s) => { const add = 20; s.maxHp += add; s.hp += add; } },
  // ── Мультишот: +1 снаряд ──
  { id: 'multishot', icon: 'upg_multishot', name: 'up_multishot_name', desc: 'up_multishot_desc',
    rarity: 'epic', maxStacks: 6,
    apply: (s) => { s.multishot += 1; } },
  // ── Пробитие: +1 врага пробивает снаряд ──
  { id: 'pierce', icon: 'upg_pierce', name: 'up_pierce_name', desc: 'up_pierce_desc',
    rarity: 'rare', maxStacks: 6,
    apply: (s) => { s.pierce += 1; } },
  // ── Броня: +8% снижения урона (до потолка 0.8) ──
  { id: 'armor', icon: 'upg_armor', name: 'up_armor_name', desc: 'up_armor_desc',
    rarity: 'rare', maxStacks: 8,
    apply: (s) => { s.armor = Math.min(0.8, s.armor + 0.08); } },
  // ── Скорость снаряда ──
  { id: 'bulletSpeed', icon: 'upg_bulletspeed', name: 'up_bulletspeed_name', desc: 'up_bulletspeed_desc',
    rarity: 'common', maxStacks: 6,
    apply: (s) => { s.bulletSpeed = Math.round(s.bulletSpeed * 1.12); } },
  // ── Дальность авто-огня ──
  { id: 'range', icon: 'upg_range', name: 'up_range_name', desc: 'up_range_desc',
    rarity: 'common', maxStacks: 6,
    apply: (s) => { s.range = Math.round(s.range * 1.12 + 10); } },
  // ── Регенерация HP ──
  { id: 'regen', icon: 'upg_regen', name: 'up_regen_name', desc: 'up_regen_desc',
    rarity: 'rare', maxStacks: 6,
    apply: (s) => { s.regen += 0.8; } },
  // ── Мгновенное лечение (одноразовый, не стак) ──
  { id: 'heal', icon: 'upg_heal', name: 'up_heal_name', desc: 'up_heal_desc',
    rarity: 'common', maxStacks: 99,
    apply: (s) => { s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.4)); } },
  // ── Радиус подбора XP ──
  { id: 'pickup', icon: 'upg_pickup', name: 'up_pickup_name', desc: 'up_pickup_desc',
    rarity: 'common', maxStacks: 6,
    apply: (s) => { s.pickupRange = Math.round(s.pickupRange * 1.3 + 15); } },
  // ── Бонус XP (сильнее качается) ──
  { id: 'xpGain', icon: 'upg_xpgain', name: 'up_xpgain_name', desc: 'up_xpgain_desc',
    rarity: 'rare', maxStacks: 6,
    apply: (s) => { s.xpMul = (s.xpMul || 1) * 1.2; } },
  // ── Полное исцеление + небольшой буст maxHp ──
  { id: 'fullheal', icon: 'upg_fullheal', name: 'up_fullheal_name', desc: 'up_fullheal_desc',
    rarity: 'epic', maxStacks: 99,
    apply: (s) => { s.hp = s.maxHp; s.maxHp += 10; } },

  // ═══ НОВЫЕ ЭФФЕКТ-АПГРЕЙДЫ (источники урона — АДДИТИВНЫЕ, не множители damage) ═══
  // apply — пустой (GameScene._recalcEffects читает upgradeStacks[id] и считает плоский эффект).
  // Цепная молния при убийстве — фикс. урон по цепочке врагов.
  { id: 'chainLightning', icon: 'upg_chain', name: 'up_chain_name', desc: 'up_chain_desc',
    rarity: 'rare', maxStacks: 6, apply: () => {} },
  // Дроны-помощники убраны из пассивов: с Вехи 2 это ОРУЖИЕ `orbiters` (data/weapons.js) —
  // орбитальные сферы с таранным уроном, со своими пятью уровнями и эволюцией «Эгида».
  // Держать одну и ту же идею и пассивом, и оружием — значит дважды тратить слот игрока.
  // Взрыв при убийстве — AoE фикс. урон вокруг убитого.
  { id: 'explodeOnKill', icon: 'upg_explode', name: 'up_explode_name', desc: 'up_explode_desc',
    rarity: 'rare', maxStacks: 5, apply: () => {} },
  // Самонаводящиеся снаряды — доля выстрелов летит к цели.
  { id: 'homing', icon: 'upg_homing', name: 'up_homing_name', desc: 'up_homing_desc',
    rarity: 'rare', maxStacks: 6, apply: () => {} },
  // Шанс крита — множитель на ОТДЕЛЬНЫЙ выстрел (не на базу), не разгоняет средний DPS.
  { id: 'crit', icon: 'upg_crit', name: 'up_crit_name', desc: 'up_crit_desc',
    rarity: 'rare', maxStacks: 6, apply: () => {} },
  // Отражение урона (thorns) — враг получает долю контактного урона обратно.
  { id: 'thorns', icon: 'upg_thorns', name: 'up_thorns_name', desc: 'up_thorns_desc',
    rarity: 'common', maxStacks: 6, apply: () => {} },
  // Аура замедления — враги в радиусе двигаются медленнее.
  { id: 'slowAura', icon: 'upg_slow', name: 'up_slow_name', desc: 'up_slow_desc',
    rarity: 'rare', maxStacks: 6, apply: () => {} },
  // Увеличение размера снаряда — больше радиус коллизии (легче попадать).
  { id: 'bulletSize', icon: 'upg_bulletsize', name: 'up_bulletsize_name', desc: 'up_bulletsize_desc',
    rarity: 'common', maxStacks: 6, apply: () => {} },

  // ═══ НОВЫЕ ИДЕИ (2026-08-21, по запросу «пул ощущается маленьким») ═══
  // Не просто новые множители к старым числам — новое ПОВЕДЕНИЕ: лечение с убийства,
  // уклонение, дебафф на враге, доп. валюта, временный бафф после убийства, риск/награда
  // на низком HP, разовая страховка от смерти, шанс мины с трупа.
  // Вампиризм — фикс. лечение HP за каждое убийство.
  { id: 'vampirism', icon: 'upg_heal', name: 'up_vampirism_name', desc: 'up_vampirism_desc',
    rarity: 'rare', maxStacks: 5, apply: () => {} },
  // Уклонение — шанс полностью избежать урона (контакт и вражеские снаряды).
  { id: 'dodge', icon: 'upg_armor', name: 'up_dodge_name', desc: 'up_dodge_desc',
    rarity: 'rare', maxStacks: 6, apply: () => {} },
  // Ослабление — попадание снаряда временно снижает контактный урон врага.
  { id: 'weaken', icon: 'upg_slow', name: 'up_weaken_name', desc: 'up_weaken_desc',
    rarity: 'common', maxStacks: 5, apply: () => {} },
  // Кристалл-магнит — шанс доп. кристаллов с убийства (метавалюта прокачки старта).
  { id: 'crystalMagnet', icon: 'upg_pickup', name: 'up_crystalmagnet_name', desc: 'up_crystalmagnet_desc',
    rarity: 'common', maxStacks: 5, apply: () => {} },
  // Разгон убийствами — убийство освежает временный бонус скорострельности.
  { id: 'killStreak', icon: 'upg_firerate', name: 'up_killstreak_name', desc: 'up_killstreak_desc',
    rarity: 'rare', maxStacks: 5, apply: () => {} },
  // Адреналин — бонус урона, пока HP ниже порога (риск/награда).
  { id: 'adrenaline', icon: 'upg_damage', name: 'up_adrenaline_name', desc: 'up_adrenaline_desc',
    rarity: 'epic', maxStacks: 4, apply: () => {} },
  // Второй шанс — один раз за забег не даёт умереть (остаёшься на 1 HP). Не стакается —
  // страховка разовая по смыслу, maxStacks: 1 не даёт взять карту снова.
  { id: 'secondChance', icon: 'upg_fullheal', name: 'up_secondchance_name', desc: 'up_secondchance_desc',
    rarity: 'epic', maxStacks: 1, apply: () => {} },
  // Мина-огрызок — убитый враг иногда оставляет мину (реюз ArenaEffects.spawnMine).
  { id: 'fragMine', icon: 'upg_explode', name: 'up_fragmine_name', desc: 'up_fragmine_desc',
    rarity: 'rare', maxStacks: 5, apply: () => {} }
];

// Веса редкости в выборке.
export const RARITY_WEIGHTS = { common: 1.0, rare: 0.5, epic: 0.22 };

// Выбрать 3 случайных неповторяющихся апгрейда с учётом редкости и лимита стаков.
// taken — карта { id: количество уже взятых }.
export function rollUpgrades(taken = {}, count = 3) {
  const pool = UPGRADES.filter((u) => (taken[u.id] || 0) < u.maxStacks);
  const out = [];
  const bag = pool.slice();
  while (out.length < count && bag.length > 0) {
    // Взвешенный выбор по редкости.
    let total = 0;
    for (const u of bag) total += RARITY_WEIGHTS[u.rarity] || 1;
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < bag.length; i++) {
      r -= RARITY_WEIGHTS[bag[i].rarity] || 1;
      if (r <= 0) { idx = i; break; }
    }
    out.push(bag[idx]);
    bag.splice(idx, 1);
  }
  return out;
}
