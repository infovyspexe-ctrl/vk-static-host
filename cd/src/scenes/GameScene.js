// Game: основной геймплей Cosmic Drift.
// Арена-сурвайвер: игрок выживает от бесконечных волн врагов, авто-стрельба,
// rogue-lite прокачка по уровням. Бесконечная сессия — цель рекорд.
//
// Архитектура: данные в data/, враги/снаряды/джойстик в mechanics/, вид в theme/,
// тексты в i18n/. Сцена — оркестратор: связывает их через локальные обработчики
// (механики не знают друг о друге напрямую, §10 CONVENTIONS).
import { YA } from '../yandex/sdk.js';
import { Ads } from '../yandex/ads.js';
import { Save } from '../yandex/save.js';
import { RunSave } from '../yandex/runSave.js';
import { Leaderboard } from '../yandex/leaderboard.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { BALANCE } from '../data/balance.js';
import { BOSS, rollEnemy, waveTypeFor } from '../data/enemies.js';
import { rollUpgrades, RARITY_WEIGHTS, UPGRADES } from '../data/upgrades.js';
import { weightedPick } from '../core/weightedPick.js';
import { WEAPONS, EVOLUTIONS, WEAPON_SLOTS, PASSIVE_SLOTS, STARTING_WEAPON } from '../data/weapons.js';
import { createLoadout } from '../mechanics/weapons/loadout.js';
import { createWeaponTicker } from '../mechanics/weapons/weapons.js';
import { BEHAVIORS } from '../mechanics/weapons/behaviors.js';
import { createArenaEffects } from '../mechanics/arena/ArenaEffects.js';
import { shipById } from '../data/ships.js';
import { claimUnlocks } from '../meta/achievements.js';
import { defaultStats } from '../data/achievements.js';
import { applyMetaToStart, metaProgress } from '../data/meta.js';
import { EVENTS } from '../data/analytics-events.js';
import { REROLLS_PER_RUN } from '../data/ads.js';
import { Analytics } from '../core/analytics.js';
import { Sounds } from '../core/sounds.js';
import { Input } from '../core/input.js';
import { AdGate } from '../core/adGate.js';
import { createButton } from '../ui/Button.js';
import { fitIcon } from '../ui/icon.js';
import { Joystick } from '../mechanics/joystick/Joystick.js';
import { Enemy } from '../mechanics/arena/Enemy.js';
import { Bullet } from '../mechanics/arena/Bullet.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create(data = {}) {
    const { width, height } = this.scale;
    this.width = width;
    this.height = height;

    // ── Фон: тайловый, бесконечно скроллится за камерой ──
    // tileSprite размера экрана, tilePosition синхронизируем с камерой в update.
    const bgTex = this.textures.exists('bg_tile') ? 'bg_tile' : 'bg';
    this.bgTile = this.add.tileSprite(width / 2, height / 2, width, height, bgTex)
      .setDepth(-10).setScrollFactor(0);
    // Слой далёких звёзд (параллакс): отдельный tileSprite, движется медленнее фона.
    if (this.textures.exists('bg_tile')) {
      this.bgStars = this.add.tileSprite(width / 2, height / 2, width, height, bgTex)
        .setDepth(-9).setScrollFactor(0).setAlpha(0.4).setTint(0x6688ff);
    }

    // «Продолжить» из меню — снимок волны/оружия/пассивов читается один раз здесь,
    // прикладывается дальше по create() в двух местах (статы ниже, оружие — у loadout).
    // Спека: docs/superpowers/specs/2026-08-22-run-save-design.md.
    this._resumeSnapshot = data.resume ? RunSave.load() : null;

    const meta = (Save.cache && Save.cache.meta) || { upgrades: {} };
    this.state = this._buildStartState(meta, !!data.startKit);
    // Сложность волн подтягивается к тому, насколько прокачана Лаборатория — считается
    // ОДИН раз на старте забега, не пересчитывается за игру (см. BALANCE.waves, комментарий
    // у metaDifficultyDamping).
    this._difficultyMul = 1 + metaProgress((meta && meta.upgrades) || {}) * BALANCE.waves.metaDifficultyDamping;

    // Игрок стартует в «мировом нуле» (0,0). Мир бесконечный, границ нет.
    this.player = {
      x: 0, y: 0,
      radius: BALANCE.player.radius,
      moveX: 0, moveY: 0
    };

    if (this.textures.exists('player')) {
      this.playerSprite = this.add.image(this.player.x, this.player.y, 'player').setDepth(30);
      this.playerSprite.setDisplaySize(this.player.radius * 2.6, this.player.radius * 2.6);
    } else {
      this.playerSprite = this.add.graphics().setDepth(30);
    }
    this.aura = this.add.graphics().setDepth(29);
    // Слой эффектов боя (в мировых координатах — двигается с миром).
    this.fxLayer = this.add.graphics().setDepth(28);

    // Камера следует за игроком. Мир без границ (setBounds не зовём).
    const cam = this.cameras.main;
    cam.startFollow(this.playerSprite, true, 0.12, 0.12);
    cam.roundPixels = true;

    this.enemies = [];
    this.bullets = [];
    this.hostileBullets = [];     // снаряды босса (бьют игрока)
    this.orbs = [];
    this.telegraphs = [];         // активные telegraph-маркеры атак босса
    this.score = 0;
    this.kills = 0;
    this.waveNum = 1;
    this.waveType = waveTypeFor(1);
    this.level = 1;
    this.xp = 0;
    this.xpToNext = BALANCE.xp.firstLevel;
    this.crystalsRun = 0;
    this.fireCooldown = 0;
    this.invuln = 0;
    this.regenAcc = 0;
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.elapsed = 0;
    // this.paused — ГЕТТЕР/СЕТТЕР, а не плоское поле. Он переключается в шести местах файла
    // (тумблер паузы, окно апгрейда, game over — и открытие, и закрытие каждого), и джойстик
    // обязан подчиниться КАЖДОМУ такому переключению: он слушает pointer по всей нижней зоне
    // экрана, той же, где рисуются карточки апгрейда и кнопки паузы/game over, поэтому клик по
    // ним параллельно стартовал бы его собственный драг. Раз мест переключения шесть и седьмое
    // рано или поздно появится, вызов joystick.suspend()/resume() вручную в каждом — гарантия
    // того, что однажды его забудут. Сеттер не даст.
    // configurable: true ОБЯЗАТЕЛЕН: «Заново» после смерти зовёт scene.restart(), а тот
    // выполняет create() ПОВТОРНО на ТОМ ЖЕ объекте сцены — без configurable вторая попытка
    // defineProperty на уже занятое имя бросает TypeError, и рестарт роняет сцену насмерть.
    Object.defineProperty(this, 'paused', {
      configurable: true,
      get: () => this._paused,
      set: (v) => {
        this._paused = v;
        if (!this.joystick) return; // самый первый this.paused = false ставится до его создания
        if (v) this.joystick.suspend();
        else { this.joystick.resume(); this.player.moveX = 0; this.player.moveY = 0; }
      }
    });
    this.paused = false;            // своя пауза (окно апгрейдов / game over)
    this.gameOverShown = false;
    this.revivesUsed = 0;
    this.rerollsUsed = 0;
    // Счётчики забега для достижений (в meta.stats уезжают на конце партии).
    this.bossKillsRun = 0;
    this.eliteKillsRun = 0;
    this.flawlessWavesRun = 0;
    this.bossByMinesRun = 0;
    this.hurtThisWave = false;
    this.lastDamageSource = null;   // чем нанесён последний урон — для «Минёра»
    this.upgradeStacks = {};
    // Восстановление из чекпоинта («Продолжить»). HP сознательно НЕ восстанавливаем —
    // _buildStartState() выше уже дал полное здоровье, ровно как задумано.
    if (this._resumeSnapshot) {
      const snap = this._resumeSnapshot;
      this.waveNum = snap.waveNum;
      this.waveType = waveTypeFor(this.waveNum);
      this.level = snap.level;
      this.xp = snap.xp;
      this.xpToNext = snap.xpToNext;
      this.crystalsRun = snap.crystalsRun;
      Object.assign(this.upgradeStacks, snap.upgradeStacks);
      this._recalcEffects();
    }
    this.killStreakTimer = 0;       // сек до истечения бонуса «Разгон убийствами»
    this.secondChanceUsed = false;  // «Второй шанс» — разовая страховка, один раз за забег
    // Очередь окон выбора апгрейда: _collectXp может засчитать НЕСКОЛЬКО уровней за один
    // кадр (крупный орб, высокий xpMul) — раньше каждый уровень тут же звал _openUpgradeChoice
    // без проверки «а не открыто ли уже окно», и второе окно рисовалось поверх первого,
    // а первое зависало нерабочим (жалоба игрока: «уровень пришёл, а выбора не было»).
    // Теперь уровни складываются в очередь, окна открываются строго одно за другим.
    this._upgradeChoiceOpen = false;
    this._pendingUpgradeChoices = 0;
    // Разовый буст, когда пул выбора внутри забега пуст (_rollChoices вернул 0 карт):
    // полное исцеление + временный баф на волну вместо кристаллов, которые бесполезны,
    // если игрок уже прокачал Лабораторию до предела (решение игрока 2026-08-22).
    this.overflowBuffTimer = 0;
    this.bossActive = false;
    this.boss = null;
    this.bossArenaCenter = null;
    this.bossArenaRing = null;      // графика границы арены босса — рисуется на спавне, живёт до его смерти
    this._sentWaveEvent = new Set();

    // ПОКОЛЕНИЯ КЛИКОВ — защита от авто-выбора в оверлеях.
    // Сценарий бага: игрок ведёт корабль мышью (pointer зажат) → открывается окно выбора →
    // игрок отпускает кнопку над картой → она выбирается НЕОЗНАННО (тот же клик, что вёл корабль).
    // Решение: оверлей при открытии запоминает _overlayClickGen, а карта реагирует на pointerup
    // только если pointerdown случился ПОСЛЕ открытия (новое нажатие = осознанный выбор).
    this._clickGen = 0;
    this.input.on('pointerdown', () => { this._clickGen++; });

    YA.gameplayStart();
    // Баннер отъедает низ экрана, а там живёт джойстик — на время боя убираем.
    Ads.hideBanner();
    Analytics.event(EVENTS.GAME_START);

    Input.setup(this);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    const joyZone = new Phaser.Geom.Rectangle(0, height * 0.42, width, height * 0.58);
    this.joystick = new Joystick(this, {
      zone: joyZone, maxRadius: 92,
      onMove: (x, y) => { this.player.moveX = x; this.player.moveY = y; },
      onEnd: () => { this.player.moveX = 0; this.player.moveY = 0; }
    }).start();

    // ── Набор оружия: слоты, уровни, эволюции ──
    this.loadout = createLoadout({
      weapons: WEAPONS, evolutions: EVOLUTIONS, weaponSlots: WEAPON_SLOTS
    });
    // Стартовое оружие даёт КОРАБЛЬ: именно оно, а не пара процентов, задаёт стиль забега.
    this.ship = shipById((meta && meta.selectedShip) || 'scout');
    if (this._resumeSnapshot) {
      // Повторяем take() по сохранённому списку столько раз, сколько там уровней —
      // тот же публичный API, что и у обычного выбора карт, loadout.js трогать не пришлось.
      for (const w of this._resumeSnapshot.weapons) {
        for (let i = 0; i < w.level; i++) this.loadout.take(w.id);
      }
    } else {
      this.loadout.take(this.ship.weapon || STARTING_WEAPON);
    }
    this.weaponTicker = createWeaponTicker({ loadout: this.loadout, behaviors: BEHAVIORS });
    this.effects = createArenaEffects(this, {
      getEnemies: () => this.enemies,
      damageEnemy: (e, dmg) => this._damageEnemyFromWeapon(e, dmg),
      onHitFx: (x, y, crit) => this._spawnHitFlash(x, y, crit)
    });

    this._createHud();
    this._refreshBuildIcons();

    // Пауза стоит в правом НИЖНЕМ углу панели: на прежних (width-70, 64) она наезжала на
    // строку «Ур. N» (замер габаритов всех элементов HUD показал пересечение 618..696 ×
    // 616..684 — на экране цифра уровня была наполовину под кнопкой).
    const pauseBtn = createButton(this, width - 46, 82, '⏸', () => this._togglePause(), {
      color: THEME.colors.neutral, textColor: THEME.colors.text,
      paddingX: 14, paddingY: 8, fontSize: THEME.fontSize.small
    });
    pauseBtn.setDepth(200).setScrollFactor(0);

    this._showWaveBanner();
  }

  _buildStartState(meta, startKit = false) {
    const b = BALANCE.player;
    const start = {
      radius: b.radius, speed: b.speed, maxHp: b.maxHp, hp: b.maxHp,
      damage: b.damage, fireRate: b.fireRate, bulletSpeed: b.bulletSpeed,
      bulletRadius: b.bulletRadius, range: b.range, armor: b.armor, pierce: b.pierce,
      multishot: b.multishot, pickupRange: b.pickupRange, regen: b.regen,
      invulnAfterHit: b.invulnAfterHit, xpMul: 1
    };
    applyMetaToStart(start, (meta && meta.upgrades) || {});
    // Модификатор корабля — поверх мета-апгрейдов, до стартового набора.
    const ship = shipById((meta && meta.selectedShip) || 'scout');
    if (ship.apply) ship.apply(start);
    // Стартовый набор за просмотр рекламы — применяется ПОВЕРХ мета-апгрейдов.
    if (startKit) {
      start.damage = Math.round(start.damage * BALANCE.rewards.startKitDamageMul);
      start.maxHp += BALANCE.rewards.startKitBonusHp;
    }
    start.hp = start.maxHp;
    return start;
  }

  // Пул активных эффектов (аддитивные источники урона/защиты).
  // Пересчитывается при взятии апгрейда. Все значения — ПЛОСКИЕ или доли, не множители damage.
  _effects = {
    chainChance: 0, chainTargets: 0, chainDamage: 0,
    explodeChance: 0, explodeDamage: 0,
    homingChance: 0, homingTurn: 4.5,
    critChance: 0, critMult: 2,
    thorns: 0, slowAura: 0, bulletSizeBonus: 0,
    vampHeal: 0,
    dodgeChance: 0,
    weakenChance: 0, weakenMult: 0.5, weakenDuration: 1.5,
    crystalChance: 0, crystalAmount: 1,
    killStreakBonus: 0, killStreakDuration: 2.5,
    adrenalineBonus: 0, adrenalineThreshold: 0.3,
    secondChance: false,
    fragMineChance: 0, fragMineDamage: 0
  };

  // Дроны-помощники были пассивом и жили здесь своей петлёй. Теперь это оружие
  // `orbiters` (data/weapons.js): сферы на орбите с таранным уроном, а их симуляция —
  // в mechanics/arena/ArenaEffects.js. Отдельный код в сцене больше не нужен.

  // Снаряды босса — бьют игрока. Летят по вектору, при попадании — урон.
  _spawnHostileBullet(x, y, ang, dmg) {
    const cfg = BALANCE.bossAttacks;
    const b = {
      x, y, vx: Math.cos(ang) * cfg.volleyBulletSpeed, vy: Math.sin(ang) * cfg.volleyBulletSpeed,
      r: 9, alive: true, life: 6,
      gfx: this.add.graphics().setDepth(26)
    };
    b.damage = dmg;
    b._draw = () => {
      b.gfx.clear();
      b.gfx.fillStyle(0xff3b6e, 0.35);
      b.gfx.fillCircle(b.x, b.y, b.r * 2);
      b.gfx.fillStyle(0xff8aa8, 1);
      b.gfx.fillCircle(b.x, b.y, b.r);
    };
    this.hostileBullets.push(b);
  }

  _updateHostileBullets(dt) {
    const px = this.player.x, py = this.player.y;
    for (const b of this.hostileBullets) {
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b._draw();
      const dx = b.x - px, dy = b.y - py;
      const rr = b.r + this.player.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        this._takeDamage(b.damage);
        b.alive = false;
      }
    }
    this.hostileBullets = this.hostileBullets.filter((b) => {
      if (!b.alive || b.life <= 0) { b.gfx.destroy(); return false; }
      return true;
    });
  }

  // Цепная молния между ближайшими врагами (аддитивный фикс. урон).
  _chainLightning(x, y, targets, damage, range) {
    if (targets <= 0 || damage <= 0) return;
    const hit = new Set();
    let cx = x, cy = y;
    const pts = [{ x: cx, y: cy }];
    for (let i = 0; i < targets; i++) {
      let best = null, bestD = range * range;
      for (const e of this.enemies) {
        if (!e.alive || hit.has(e)) continue;
        const dx = e.x - cx, dy = e.y - cy;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;
      hit.add(best);
      const killed = best.takeDamage(damage);
      cx = best.x; cy = best.y;
      pts.push({ x: cx, y: cy });
      if (killed) this._onEnemyDeath(best);
    }
    // Визуал: ломаная линия-молния.
    if (pts.length > 1) this._drawChain(pts);
  }

  _drawChain(pts) {
    const g = this.add.graphics().setDepth(40);
    g.lineStyle(3, 0xb388ff, 0.9);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  // Взрыв при убийстве: AoE фикс. урон.
  _explodeAt(x, y, radius, damage) {
    const r2 = radius * radius;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= r2) {
        const killed = e.takeDamage(damage);
        if (killed) this._onEnemyDeath(e);
      }
    }
    const g = this.add.graphics().setDepth(35);
    g.fillStyle(0xffb300, 0.5);
    g.fillCircle(x, y, radius);
    this.tweens.add({ targets: g, alpha: 0, scale: 1.3, duration: 220, onComplete: () => g.destroy() });
  }

  // Босс вызывает аддов (поздние фазы).
  _bossSummonAdds(n) {
    const w = BALANCE.waves;
    for (let i = 0; i < n; i++) {
      const def = rollEnemy(this.waveNum);
      const hp = this._enemyHpForWave() * (def.hpMul || 1) * 0.6; // адды слабее
      const ang = Math.random() * Math.PI * 2;
      const x = (this.bossArenaCenter?.x ?? this.player.x) + Math.cos(ang) * 60;
      const y = (this.bossArenaCenter?.y ?? this.player.y) + Math.sin(ang) * 60;
      const enemy = new Enemy(this, {
        def, x, y, target: this.player, hp, speed: w.enemySpeedBase * 1.2,
        radius: def.radius, contactDamage: w.enemyDamage * this._difficultyMul,
        onDeath: (e) => this._onEnemyDeath(e), slowFactor: 1
      });
      this.enemies.push(enemy);
    }
  }

  // Telegraph — предупреждение перед атакой босса (читаемость угрозы).
  _drawTelegraph(x, y, r, duration) {
    const g = this.add.graphics().setDepth(34);
    const draw = (alpha) => { g.clear(); g.lineStyle(4, 0xff3b6e, alpha); g.strokeCircle(x, y, r); };
    draw(0.4);
    this.tweens.add({ targets: { a: 0.4 }, a: 0.9, duration: 120, yoyo: true, repeat: Math.max(1, Math.floor(duration * 6)), onComplete: () => g.destroy(), onUpdate: (t) => draw(t.targets[0].a) });
  }

  // Граница арены босса — тот же круг, которым игрока и врагов реально зажимает _updateMovement
  // (BALANCE.waves.bossArenaRadius). Раньше эта граница нигде не рисовалась: игрок утыкался
  // в невидимую стену и не мог понять, баг это или нет (жалоба игрока 2026-08-21). Статичный
  // круг, не пульсирует и не соревнуется взглядом с красными telegraph-предупреждениями атак.
  _drawBossArenaRing() {
    if (!this.bossArenaCenter) return;
    if (!this.bossArenaRing) this.bossArenaRing = this.add.graphics().setDepth(5);
    const g = this.bossArenaRing;
    const ac = this.bossArenaCenter;
    const r = BALANCE.waves.bossArenaRadius;
    g.clear();
    g.lineStyle(3, THEME.colors.primary, 0.4);
    g.strokeCircle(ac.x, ac.y, r);
    g.lineStyle(1, THEME.colors.primary, 0.15);
    g.strokeCircle(ac.x, ac.y, r - 8);
  }

  // Деспавн врагов далеко от игрока — бесконечный мир не должен копить объекты.
  _despawnFar() {
    const r2 = BALANCE.world.despawnRadius * BALANCE.world.despawnRadius;
    const px = this.player.x, py = this.player.y;
    this.enemies = this.enemies.filter((e) => {
      if (!e.alive) return false;
      if (e.isBoss) return true; // босс не деспавнится
      const dx = e.x - px, dy = e.y - py;
      if (dx * dx + dy * dy > r2) { e.destroy(); return false; }
      return true;
    });
  }

  update(_, deltaMs) {
    if (this.paused) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    this.elapsed += dt;
    // Копим время до ВЗВОДА интерстишла. Показ — не здесь: его делает экран смерти,
    // то есть логическая пауза. Показ прямо из боя по таймеру — антипример Яндекса.
    AdGate.armTimer(dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.killStreakTimer = Math.max(0, this.killStreakTimer - dt);
    this.overflowBuffTimer = Math.max(0, this.overflowBuffTimer - dt);

    // Тайловый фон едет за камерой (параллакс: звёзды медленнее).
    if (this.bgTile) {
      const s = this.cameras.main.scrollX, t = this.cameras.main.scrollY;
      this.bgTile.tilePositionX = s;
      this.bgTile.tilePositionY = t;
      if (this.bgStars) { this.bgStars.tilePositionX = s * 0.4; this.bgStars.tilePositionY = t * 0.4; }
    }

    this._updateMovement(dt);
    this._updateRegen(dt);
    this._updateWaves(dt);
    this._updateSpawning(dt);
    this._updateFiring(dt);
    this._updateEnemies(dt);
    this._updateBullets(dt);
    this._updateHostileBullets(dt);
    this.effects.update(dt, this.player.x, this.player.y, this.hostileBullets);
    this._updateOrbs(dt);
    this._updateContacts(dt);
    this._despawnFar(dt);
    this._updateHud();
    this._drawPlayer();
  }

  _updateMovement(dt) {
    let mx = this.player.moveX;
    let my = this.player.moveY;
    const k = this.keys;
    if (k) {
      let kx = 0, ky = 0;
      if (k.A.isDown || k.LEFT.isDown) kx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) kx += 1;
      if (k.W.isDown || k.UP.isDown) ky -= 1;
      if (k.S.isDown || k.DOWN.isDown) ky += 1;
      const kl = Math.hypot(kx, ky);
      if (kl > 0) { mx = kx / kl; my = ky / kl; }
    }
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    this.player.x += mx * this.state.speed * dt;
    this.player.y += my * this.state.speed * dt;
    // Мир бесконечный — границ нет. Но при активном боссе игрок заперт в арене (круг вокруг центра).
    if (this.bossArenaCenter) {
      const ac = this.bossArenaCenter;
      const ar = BALANCE.waves.bossArenaRadius - this.player.radius;
      const dx = this.player.x - ac.x, dy = this.player.y - ac.y;
      const d = Math.hypot(dx, dy);
      if (d > ar) { this.player.x = ac.x + (dx / d) * ar; this.player.y = ac.y + (dy / d) * ar; }
    }
    if (m > 0.05) this.lastAngle = Math.atan2(my, mx);
  }

  _updateRegen(dt) {
    this._sanitizeHp();
    if (this.state.regen <= 0 || this.state.hp >= this.state.maxHp) return;
    this.regenAcc += this.state.regen * dt;
    if (this.regenAcc >= 1) {
      const add = Math.floor(this.regenAcc);
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + add);
      this.regenAcc -= add;
    }
    this._sanitizeHp();
  }

  // ГАРАНИТ ЗДОРОВЬЯ HP. NaN/не-число в hp/maxHp → игрок бессмертен (NaN <= 0 === false),
  // HP-полоска не рисуется (fillRect с NaN-шириной), сейв портится (NaN → null в JSON).
  // Источники NaN: Math.round/Math.min с уже-NaN аргументом, дробные апгрейды-«лечения».
  // Санитайзим в каждой точке мутации hp и после применения апгрейдов.
  _sanitizeHp() {
    const s = this.state;
    if (typeof s.maxHp !== 'number' || !isFinite(s.maxHp) || s.maxHp <= 0) {
      s.maxHp = BALANCE.player.maxHp; // безопасный базовый фолбэк
    }
    if (typeof s.hp !== 'number' || !isFinite(s.hp)) {
      s.hp = s.maxHp; // испорченное hp → полное здоровье (не смерть, не бессмертие)
    } else if (s.hp < 0) {
      s.hp = 0;
    } else if (s.hp > s.maxHp) {
      s.hp = s.maxHp;
    }
  }

  _updateWaves(dt) {
    // Пока идёт бой с боссом, часы волны стоят — иначе таймер тикает в фоне НЕЗАВИСИМО
    // от боя, и стоит боссу продержаться дольше длины волны, счётчик и баннер «Волна N+1»
    // всплывают прямо поверх ещё живого босса (жалоба игрока: «волна 10 началась ещё до
    // того, как я сумел убить босса»). Отсчёт продолжится с того же места, откуда прервался,
    // как только onDeath босса сбросит bossActive — потерянного времени нет.
    if (this.bossActive) return;
    this.waveTimer += dt;
    if (this.waveTimer >= BALANCE.waves.duration) {
      this.waveTimer = 0;
      // Волна засчитывается безупречной, если за неё не получено НИ ОДНОГО урона.
      if (!this.hurtThisWave) this.flawlessWavesRun++;
      this.hurtThisWave = false;
      this.waveNum++;
      this.waveType = waveTypeFor(this.waveNum);
      // Награда за ПРОЙДЕННУЮ волну (растёт с глубиной — см. balance.js, блок xp).
      // Без неё длинный забег приносил меньше кристаллов в минуту, чем два коротких.
      this.crystalsRun += BALANCE.xp.crystalsPerWave
        + Math.floor((this.waveNum - 1) / BALANCE.xp.crystalsPerWaveStep);
      // Чекпоинт забега — строго в этой точке: сюда не попасть ни в бою с боссом
      // (ранний return в начале функции), ни с открытым окном выбора апгрейда
      // (update() целиком не идёт при this.paused) — оба условия уже гарантированы
      // существующими проверками, дублировать не нужно (спека 2026-08-22-run-save-design.md).
      this._saveCheckpoint();
      this._showWaveBanner();
      if (this.waveNum % BALANCE.waves.bossEveryWaves === 0 && !this.bossActive) {
        this._spawnBoss();
      }
    }
    if (!this._sentWaveEvent.has(this.waveNum)) {
      this._sentWaveEvent.add(this.waveNum);
      Analytics.event(EVENTS.WAVE_REACHED, { wave: this.waveNum });
    }
  }

  // Снимок для «Продолжить» в меню — см. docs/superpowers/specs/2026-08-22-run-save-design.md.
  // HP сознательно НЕ сохраняем: при восстановлении игрок всегда начинает с полным здоровьем,
  // а не «как было в момент сохранения» (решение владельца 2026-08-22).
  _saveCheckpoint() {
    RunSave.save({
      waveNum: this.waveNum, level: this.level, xp: this.xp, xpToNext: this.xpToNext,
      crystalsRun: this.crystalsRun,
      weapons: this.loadout.list().map((w) => ({ id: w.id, level: w.level })),
      upgradeStacks: { ...this.upgradeStacks }
    });
  }

  _updateSpawning(dt) {
    if (this.bossActive) return;
    const w = BALANCE.waves;
    let interval = w.spawnIntervalStart * Math.pow(w.spawnAccel, this.waveNum - 1);
    interval = Math.max(w.spawnIntervalMin, interval);
    this.spawnTimer += dt;
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._spawnEnemy();
      // Было с 8-й волны — при замедленной XP-кривой (data/balance.js, xp.levelGrowth) целей
      // должно хватать раньше, иначе ранние волны превращаются в перелёты между одиночными
      // врагами (жалоба игрока 2026-08-22).
      const burst = this.waveNum >= 3 ? 2 : 1;
      for (let i = 1; i < burst; i++) this._spawnEnemy();
    }
  }

  _spawnEnemy() {
    const w = BALANCE.waves;
    const def = rollEnemy(this.waveNum, this.waveType);
    // Элита: тот же архетип, но толще, крупнее и с гарантированным сундуком.
    const elite = this.waveNum >= w.eliteFromWave && Math.random() < w.eliteChance;
    const hp = this._enemyHpForWave() * (def.hpMul || 1) * (elite ? w.eliteHpMul : 1);
    const speed = Math.min(w.enemySpeedMax,
      (w.enemySpeedBase + w.enemySpeedPerWave * (this.waveNum - 1)) * (def.speedMul || 1));
    const pos = this._edgeSpawnPoint();
    const enemy = new Enemy(this, {
      def, x: pos.x, y: pos.y,
      target: this.player, hp, speed,
      radius: def.radius * (elite ? w.eliteRadiusMul : 1), contactDamage: w.enemyDamage * this._difficultyMul,
      onDeath: (e) => this._onEnemyDeath(e),
      // Стрелкам нужен тот же канал снарядов, что и боссу: они держат дистанцию и стреляют.
      onShoot: (bx, by, ang, dmg) => this._spawnHostileBullet(bx, by, ang, dmg),
      slowFactor: 1
    });
    if (elite) {
      enemy.isElite = true;
      // Ореол рисуем тем же механизмом, что и у босса: игрок обязан отличить элиту
      // от рядового ДО того, как начнёт в неё стрелять.
      enemy.ring = this.add.graphics();
      enemy._drawRing();
    }
    this.enemies.push(enemy);
  }

  // HP рядового врага на текущей волне: база + линейный + сублинейный (√) рост.
  // Мягче разгоняется на поздних волнах, чем чисто линейный (бывший +6/wave).
  _enemyHpForWave() {
    const w = BALANCE.waves;
    const n = this.waveNum;
    const base = w.enemyHpBase + w.enemyHpLinPerWave * (n - 1) + w.enemyHpSqrtPerWave * Math.sqrt(Math.max(0, n - 1));
    return base * this._difficultyMul;
  }

  _spawnBoss() {
    const w = BALANCE.waves;
    // Центр арены нужен ДО зачистки — иначе орбы зачистки летят на позиции старых врагов,
    // которые до этого момента гуляли по всей карте БЕЗ ограничения ареной, и часть орбов
    // оказывается за пределами ещё не существовавшего на тот момент круга (жалоба игрока:
    // «кристаллы образуются за пределами арены, а долететь до них нельзя»).
    const pos = this._bossSpawnPoint();
    const arenaCenter = { x: pos.x, y: pos.y };
    const arenaR = w.bossArenaRadius;

    // ОЧИСТКА ПОЛЯ: при боссе убираем обычных мобов (образец rubezh/revive).
    // Честно выдаём XP за убранных, чтобы игрок не терял прогресс — но орб прижимаем
    // внутрь будущей арены, если враг стоял дальше её границы: иначе награда видна,
    // но физически недостижима (игрок заперт внутри), и через 12 сек орб просто истекает.
    const cleared = this.enemies.filter((e) => !e.isBoss);
    for (const e of cleared) {
      const xpVal = BALANCE.xp.perKill * (e.def.xpMul || 1) * 0.5; // половина XP за зачистку
      const dx = e.x - arenaCenter.x, dy = e.y - arenaCenter.y;
      const d = Math.hypot(dx, dy);
      let ox = e.x, oy = e.y;
      if (d > arenaR - 20) {
        const k = (arenaR - 20) / (d || 1);
        ox = arenaCenter.x + dx * k;
        oy = arenaCenter.y + dy * k;
      }
      this._spawnOrb(ox, oy, xpVal);
      e.destroy();
    }
    this.enemies = this.enemies.filter((e) => e.isBoss);

    this.bossActive = true;
    const hp = this._enemyHpForWave() * w.bossHpMul;
    const speed = Math.min(w.enemySpeedMax,
      (w.enemySpeedBase + w.enemySpeedPerWave * (this.waveNum - 1))) * w.bossSpeedMul;
    // Босс спавнится в видимой части, чуть поодаль от игрока — арена вокруг него.
    this.bossArenaCenter = arenaCenter;
    this._drawBossArenaRing();
    const boss = new Enemy(this, {
      def: { ...BOSS, texture: this._bossTextureForWave() },
      x: pos.x, y: pos.y, target: this.player, hp, speed,
      radius: w.bossRadius, contactDamage: w.bossContactDamage * this._difficultyMul,
      isBoss: true,
      arenaCenter: this.bossArenaCenter,
      onShoot: (bx, by, ang, dmg) => this._spawnHostileBullet(bx, by, ang, dmg),
      onSummon: (n) => this._bossSummonAdds(n),
      onTelegraph: (x, y, r, dur) => this._drawTelegraph(x, y, r, dur),
      onDeath: (e) => {
        this.bossActive = false;
        this.bossArenaCenter = null;
        if (this.bossArenaRing) { this.bossArenaRing.destroy(); this.bossArenaRing = null; }
        this.crystalsRun += BALANCE.xp.crystalsPerBoss;
        this._onEnemyDeath(e);
        Analytics.event(EVENTS.BOSS_KILLED, { wave: this.waveNum });
      }
    });
    this.enemies.push(boss);
    this.boss = boss;
    Sounds.boss();
    this._flash(i18n.t('bossIncoming'), THEME.colors.dangerText);
  }

  _bossTextureForWave() {
    const pool = ['enemy_crab', 'enemy_saucer', 'enemy_hex', 'enemy_jelly'];
    return pool[this.waveNum % pool.length];
  }

  _edgeSpawnPoint() {
    // Спавн за краем видимой области (мировые координаты). При боссе — спавним у края арены босса.
    if (this.bossArenaCenter) {
      const r = BALANCE.waves.bossArenaRadius + 40;
      const ang = Math.random() * Math.PI * 2;
      return { x: this.bossArenaCenter.x + Math.cos(ang) * r, y: this.bossArenaCenter.y + Math.sin(ang) * r };
    }
    const cam = this.cameras.main;
    const vw = cam.worldView;
    const side = Phaser.Math.Between(0, 3);
    let x, y;
    if (side === 0) { x = vw.left + Math.random() * vw.width; y = vw.top - 30; }
    else if (side === 1) { x = vw.left + Math.random() * vw.width; y = vw.bottom + 30; }
    else if (side === 2) { x = vw.left - 30; y = vw.top + Math.random() * vw.height; }
    else { x = vw.right + 30; y = vw.top + Math.random() * vw.height; }
    return { x, y };
  }

  // Босс спавнится в видимой части, на комфортной дистанции от игрока.
  _bossSpawnPoint() {
    const cam = this.cameras.main;
    const cx = cam.worldView.centerX, cy = cam.worldView.centerY;
    const ang = Math.random() * Math.PI * 2;
    const dist = 180;
    return { x: this.player.x + Math.cos(ang) * dist, y: this.player.y + Math.sin(ang) * dist };
  }

  // СТРЕЛЬБА идёт через набор оружий: тикер копит кулдауны и зовёт поведение, поведение
  // просит сцену «сделай снаряд/зону/луч». Прежний единственный ствол стал оружием
  // `blaster` в data/weapons.js — картина боя у него та же, но теперь он один из семи.
  _updateFiring(dt) {
    this.weaponTicker.update(dt, this._weaponCtx());
  }

  // Контекст для поведений оружий. Всё, что оружие может знать о мире, — здесь.
  _weaponCtx() {
    if (!this._ctx) {
      const fx = this._effects;
      this._ctx = {
        stats: {},
        nearestEnemy: () => this._nearestEnemyInRange(),
        spawnBullet: (o) => this._spawnPlayerBullet(o),
        spawnArea: (o) => this.effects.spawnArea(o),
        spawnBeam: (o) => { this.effects.spawnBeam(o); Sounds.shoot(); },
        spawnMine: (o) => this.effects.spawnMine(o),
        spawnRicochet: (o) => { this.effects.spawnRicochet(o); Sounds.shoot(); },
        spawnBlackhole: (o) => this.effects.spawnBlackhole(o),
        setOrbiters: (o) => this.effects.setOrbiters(o)
      };
    }
    const c = this._ctx;
    const fx = this._effects;
    c.playerX = this.player.x;
    c.playerY = this.player.y;
    c.lastAngle = this.lastAngle || 0;
    // Стат-апгрейды стали МНОЖИТЕЛЯМИ ко всем оружиям (см. шапку data/weapons.js).
    // Адреналин — доп. множитель урона, пока HP ниже порога (риск/награда).
    const lowHp = fx.adrenalineBonus > 0 && this.state.hp < this.state.maxHp * fx.adrenalineThreshold;
    // Баф пустого пула — временный, независим от адреналина/разгона убийствами (свои условия).
    const overflowActive = this.overflowBuffTimer > 0;
    c.stats.damageMul = (this.state.damage / BALANCE.player.damage)
      * (lowHp ? (1 + fx.adrenalineBonus) : 1)
      * (overflowActive ? BALANCE.rewards.overflowDamageMul : 1);
    // Разгон убийствами — временный множитель скорострельности, освежается убийством.
    c.stats.rateMul = (this.state.fireRate / BALANCE.player.fireRate)
      * (this.killStreakTimer > 0 ? (1 + fx.killStreakBonus) : 1)
      * (overflowActive ? BALANCE.rewards.overflowRateMul : 1);
    c.stats.range = this.state.range;
    c.stats.bulletSpeed = this.state.bulletSpeed;
    c.stats.pierce = this.state.pierce;
    // state.multishot стартует с 1 (BALANCE.player.multishot) — это НЕ бонус, а базовое
    // «один снаряд», поэтому в добавку к count оружия идёт (multishot - 1) (см. behaviors.js).
    c.stats.multishotBonus = Math.max(0, this.state.multishot - 1);
    c.stats.critChance = fx.critChance || 0;
    c.stats.critMult = fx.critMult || 2;
    c.stats.bulletSizeBonus = fx.bulletSizeBonus || 0;
    c.stats.homingChance = fx.homingChance || 0;
    c.stats.homingTurn = fx.homingTurn || 4.5;
    return c;
  }

  _spawnPlayerBullet(o) {
    const b = new Bullet(this, o.x, o.y, o.angle, {
      speed: o.speed, damage: o.damage, radius: o.radius, pierce: o.pierce,
      range: o.range, homing: o.homing || 0, crit: !!o.crit,
      target: () => this._nearestEnemyInRange()
    });
    b.setOnHit((enemy) => {
      Sounds.hit(); this._spawnHitFlash(b.x, b.y, !!o.crit);
      // Ослабление: попадание временно снижает контактный урон цели.
      const fx = this._effects;
      if (fx.weakenChance > 0 && enemy && enemy.alive && Math.random() < fx.weakenChance) {
        enemy.weakenFor = fx.weakenDuration;
        enemy.weakenMult = fx.weakenMult;
      }
    });
    this.bullets.push(b);
    Sounds.shoot();
  }

  // Урон врагу из любой сущности оружия (зона, луч, мина, дыра, сфера).
  // Единая точка: смерть обязана пройти через _onEnemyDeath, иначе не будет ни XP, ни
  // кристаллов, ни эффектов при убийстве.
  _damageEnemyFromWeapon(e, dmg, source) {
    if (!e || !e.alive) return;
    this.lastDamageSource = source || null;
    const killed = e.takeDamage(dmg);
    if (killed) this._onEnemyDeath(e);
  }

  _nearestEnemyInRange() {
    const px = this.player.x, py = this.player.y;
    const r2 = this.state.range * this.state.range;
    let best = null, bestD = r2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - px, dy = e.y - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  _updateEnemies(dt) {
    // slowAura: замедление врагов в радиусе ауры (если апгрейд взят).
    const fx = this._effects;
    const slow = fx.slowAura || 0;
    const slowR2 = slow > 0 ? BALANCE.effects.slowAuraRadius * BALANCE.effects.slowAuraRadius : 0;
    for (const e of this.enemies) {
      if (slowR2 > 0) {
        const dx = e.x - this.player.x, dy = e.y - this.player.y;
        e.slowFactor = (dx * dx + dy * dy < slowR2) ? (1 - slow) : 1;
      } else {
        e.slowFactor = 1;
      }
      e.update(dt);
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  _updateBullets(dt) {
    for (const b of this.bullets) b.update(dt, this.enemies);
    this.bullets = this.bullets.filter((b) => b.alive);
  }

  _onEnemyDeath(e) {
    this.kills++;
    Sounds.kill();
    if (e.isElite) this.eliteKillsRun++;
    if (e.isBoss) {
      this.bossKillsRun++;
      // «Минёр»: босс, добитый миной. Источник последнего урона помечает ArenaEffects.
      if (this.lastDamageSource === 'mine') this.bossByMinesRun++;
    }
    const eliteMul = e.isElite ? BALANCE.waves.eliteXpMul : 1;
    const xpVal = BALANCE.xp.perKill * eliteMul
      * (e.isBoss ? BALANCE.waves.bossXpMul : (e.def.xpMul || 1));
    // Элита и босс роняют сундук — единственная награда, которую можно ВЫБРАТЬ.
    // Открываем в следующем кадре: смерть врага может случиться внутри обхода списка.
    if (e.isElite || e.isBoss) this.time.delayedCall(300, () => this._openChest());
    this._spawnOrb(e.x, e.y, xpVal);
    this._spawnDeathBurst(e.x, e.y, e.def.color);
    // ── Эффекты при убийстве (аддитивные источники урона, не множители) ──
    const fx = this._effects;
    // Цепная молния: шанс бьёт ближайших врагов фикс. уроном.
    if (fx.chainChance > 0 && Math.random() < fx.chainChance) {
      this._chainLightning(e.x, e.y, fx.chainTargets, fx.chainDamage, BALANCE.effects.chainLightning.range);
    }
    // Взрыв при убийстве: AoE фикс. урон вокруг.
    if (fx.explodeChance > 0 && Math.random() < fx.explodeChance) {
      this._explodeAt(e.x, e.y, BALANCE.effects.explodeOnKill.radius, fx.explodeDamage);
    }
    // Вампиризм: фикс. лечение HP за убийство.
    if (fx.vampHeal > 0) {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + fx.vampHeal);
      this._sanitizeHp();
    }
    // Кристалл-магнит: шанс доп. кристаллов забега с убийства.
    if (fx.crystalChance > 0 && Math.random() < fx.crystalChance) {
      this.crystalsRun += fx.crystalAmount;
    }
    // Разгон убийствами: каждое убийство освежает таймер бонуса скорострельности.
    if (fx.killStreakBonus > 0) {
      this.killStreakTimer = fx.killStreakDuration;
    }
    // Мина-огрызок: шанс, что убитый враг оставит мину (реюз ArenaEffects.spawnMine).
    if (fx.fragMineChance > 0 && Math.random() < fx.fragMineChance) {
      this.effects.spawnMine({ x: e.x, y: e.y, damage: fx.fragMineDamage, radius: 70, fuse: 6 });
    }
  }

  _spawnOrb(x, y, value) {
    const orb = {
      x, y, value,
      vx: (Math.random() - 0.5) * 90,
      vy: (Math.random() - 0.5) * 90,
      life: 12,
      sprite: this.add.image(x, y, 'xp').setDepth(15).setDisplaySize(20, 20)
    };
    this.orbs.push(orb);
  }

  _updateOrbs(dt) {
    const px = this.player.x, py = this.player.y;
    const pickR2 = this.state.pickupRange * this.state.pickupRange;
    const grab = (this.player.radius + 10);
    const grab2 = grab * grab;
    for (const o of this.orbs) {
      o.life -= dt;
      o.vx *= 0.92; o.vy *= 0.92;
      o.x += o.vx * dt; o.y += o.vy * dt;
      const dx = px - o.x, dy = py - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < pickR2) {
        const d = Math.sqrt(d2) || 1;
        const pull = 260;
        o.x += (dx / d) * pull * dt;
        o.y += (dy / d) * pull * dt;
      }
      o.sprite.x = o.x; o.sprite.y = o.y;
      if (d2 < grab2) {
        o.collected = true;
        this._collectXp(o.value);
      }
    }
    this.orbs = this.orbs.filter((o) => {
      if (o.collected || o.life <= 0) { o.sprite.destroy(); return false; }
      return true;
    });
  }

  _collectXp(value) {
    this.xp += value * this.state.xpMul;
    Sounds.pickup();
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.round(this.xpToNext * BALANCE.xp.levelGrowth);
      this.crystalsRun += BALANCE.xp.crystalsPerLevel;
      this._onLevelUp();
    }
  }

  _onLevelUp() {
    Sounds.levelUp();
    Analytics.event(EVENTS.LEVEL_UP, { level: this.level });
    this._pendingUpgradeChoices++;
    this._tryOpenNextUpgradeChoice();
  }

  // Открыть следующее окно выбора из очереди — но только если предыдущее уже закрыто.
  // Единственная точка входа для «показать окно апгрейда после уровня»: и _onLevelUp,
  // и закрытие текущего окна проходят через неё, поэтому очередь не может обогнать сама себя.
  _tryOpenNextUpgradeChoice() {
    if (this._upgradeChoiceOpen || this._pendingUpgradeChoices <= 0) return;
    this._pendingUpgradeChoices--;
    this._openUpgradeChoice();
  }

  _updateContacts() {
    if (this.invuln > 0) return;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.player.x, dy = e.y - this.player.y;
      const rr = e.radius + this.player.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        const raw = e.takeContact();
        const dmg = Math.max(1, Math.round(raw * (1 - this.state.armor)));
        // Thorns: отражение доли контактного урона обратно во врага (плоско).
        const thorns = this._effects.thorns || 0;
        if (thorns > 0) e.takeDamage(Math.max(1, Math.round(raw * thorns)));
        this._takeDamage(dmg);
        break;
      }
    }
  }

  _takeDamage(amount) {
    if (this.invuln > 0) return;
    const fx = this._effects;
    // Уклонение: шанс полностью избежать урона — invuln не трогаем, это не «попадание».
    if (fx.dodgeChance > 0 && Math.random() < fx.dodgeChance) return;
    // amount может прийти NaN (контакт-урон через armor, дробные апгрейды) — защищаемся.
    const dmg = (typeof amount === 'number' && isFinite(amount)) ? amount : 0;
    this.state.hp -= Math.max(0, dmg);
    this.hurtThisWave = true;   // волна больше не «безупречная»
    this.invuln = this.state.invulnAfterHit;
    Sounds.hurt();
    this._flashScreen();
    this._sanitizeHp();
    if (this.state.hp <= 0) {
      // Второй шанс: разовая страховка за забег — вместо смерти остаёмся на 1 HP.
      if (fx.secondChance && !this.secondChanceUsed) {
        this.secondChanceUsed = true;
        this.state.hp = 1;
        this.invuln = Math.max(this.invuln, 1.5);
      } else {
        this.state.hp = 0;
        this._onDeath();
      }
    }
  }

  async _onDeath() {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    Sounds.gameOver();
    Analytics.event(EVENTS.PLAYER_DIED, { wave: this.waveNum, level: this.level });
    // Забег завершён — чекпоинт «Продолжить» больше не актуален.
    RunSave.clear();
    const info = await this._commitRunToMeta();
    this._showGameOver(info);
  }

  // Возвращает { isNewBest, prevBest } — флаг ОБЯЗАН считаться здесь, ДО записи рекорда.
  // Баг, который этим чинится: раньше isNewBest считался в _showGameOver уже после записи,
  // сравнение score >= meta.bestScore было истинным всегда, и «НОВЫЙ РЕКОРД!» горел после
  // каждой смерти, обесценивая награду.
  async _commitRunToMeta() {
    this.score = this._calcScore();
    const meta = (Save.cache && Save.cache.meta) || {};
    if (typeof meta.crystals !== 'number') meta.crystals = 0;
    if (typeof meta.bestScore !== 'number') meta.bestScore = 0;
    if (!meta.upgrades) meta.upgrades = {};
    const prevBest = meta.bestScore;
    // Строго больше: повтор прежнего результата — не рекорд.
    const isNewBest = this.score > prevBest;

    // ── Статистика забега для достижений ──
    // Считаем ЗДЕСЬ, одним местом: достижения проверяют счётчики, и если их обновлять
    // россыпью по сцене, рано или поздно какой-нибудь перестанет расти незаметно.
    if (!meta.stats) meta.stats = defaultStats();
    const st = meta.stats;
    for (const k of Object.keys(defaultStats())) if (typeof st[k] !== 'number') st[k] = 0;
    st.runs += 1;
    st.kills += this.kills;
    st.crystalsTotal += this.crystalsRun;
    st.revives += this.revivesUsed;
    st.bossKills += this.bossKillsRun || 0;
    st.elitesKilled += this.eliteKillsRun || 0;
    st.flawlessWaves += this.flawlessWavesRun || 0;
    st.bossByMines += this.bossByMinesRun || 0;
    st.maxWave = Math.max(st.maxWave, this.waveNum);
    st.maxLevel = Math.max(st.maxLevel, this.level);
    // Эволюции и максимальные оружия считаем по фактическому набору на момент смерти.
    const active = this.loadout.active();
    st.evolutions = Math.max(st.evolutions, active.filter((w) => w.id.startsWith('evo_')).length);
    st.weaponsMaxed = Math.max(st.weaponsMaxed,
      active.filter((w) => w.level >= w.def.maxLevel).length);
    // День засчитывается один раз в календарные сутки — иначе «7 дней подряд»
    // закрывалось бы за один вечер.
    const dayKey = AdGate.state().maxSeenDay;
    if (dayKey && meta.lastPlayDay !== dayKey) { meta.lastPlayDay = dayKey; st.daysPlayed += 1; }

    this.unlocked = claimUnlocks(meta);
    meta.crystals = (meta.crystals || 0) + this.crystalsRun;
    Analytics.event(EVENTS.CRYSTALS_EARNED, { n: this.crystalsRun, source: 'run' });
    if (isNewBest) meta.bestScore = this.score;
    AdGate.noteRunFinished();
    Object.assign(meta, AdGate.state());
    Save.update({ meta });
    try { await Leaderboard.setScore('score', this.score); } catch (e) {}
    return { isNewBest, prevBest };
  }

  _calcScore() {
    return Math.floor(this.elapsed * 10) + this.kills * 5 + (this.level - 1) * 25;
  }

  _showGameOver(info = {}) {
    this.paused = true;
    YA.gameplayStop();
    Analytics.event(EVENTS.SESSION_END, { score: this.score, wave: this.waveNum, level: this.level });
    this.scene.launch('GameOver', {
      score: this.score, wave: this.waveNum, crystals: this.crystalsRun,
      best: (Save.cache && Save.cache.meta && Save.cache.meta.bestScore) || 0,
      isNewBest: !!info.isNewBest,
      // Первое воскрешение доступно всегда, второе — пока не выбран суточный бакет.
      canRevive: this.revivesUsed < BALANCE.rewards.reviveAdsPerRun
        && (this.revivesUsed === 0 || AdGate.canReward('revive2')),
      onRetry: () => { this.scene.stop('GameOver'); this._restart(); },
      onRevive: () => this._revive(),
      onMenu: () => { this.scene.stop('GameOver'); this._toMenu(); },
      // Награда за просмотр: начисляем ДОБАВКУ к уже записанным кристаллам —
      // _commitRunToMeta их сохранил до открытия этого экрана.
      onDoubleCrystals: (add) => {
        const meta = (Save.cache && Save.cache.meta) || {};
        meta.crystals = (meta.crystals || 0) + add;
        Save.update({ meta });
        Analytics.event(EVENTS.CRYSTALS_EARNED, { n: add, source: 'x2' });
      }
    });
  }

  _revive() {
    const second = this.revivesUsed >= 1;
    this.revivesUsed++;
    Analytics.event(EVENTS.REVIVE_USED);
    Analytics.event(EVENTS.AD_REWARD_SHOWN, { point: second ? 'revive2' : 'revive' });
    this.scene.stop('GameOver');
    Ads.showRewarded({
      onRewarded: () => { if (second) AdGate.spendReward('revive2'); this._applyRevive(); },
      onClose: (result, opened) => {
        // Если ролика не было (нет инвентаря) — всё равно воскресаем по onClose без opened,
        // иначе игрок застрял бы на Game Over без возможности продолжить.
        if (!opened) this._applyRevive();
      }
    });
  }

  _applyRevive() {
    this.state.hp = Math.round((this.state.maxHp || BALANCE.player.maxHp) * BALANCE.rewards.reviveHpPct);
    this.invuln = 2.5;
    this.gameOverShown = false;
    this.paused = false;
    this._sanitizeHp();
    YA.gameplayStart();
    for (const e of this.enemies) {
      const dx = e.x - this.player.x, dy = e.y - this.player.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 240) { e.x += (dx / d) * 280; e.y += (dy / d) * 280; }
    }
  }

  _restart() {
    this._cleanup();
    this.scene.restart();
  }

  // Интерстишл здесь БЕЗУСЛОВНЫМ быть не должен: решение принимает AdGate на экране смерти.
  // Выход по кнопке «пауза» — не место для рекламы: игрок ничего не завершил, а показ на
  // каждом выходе быстро надоедает и роняет удержание.
  _toMenu() {
    this._cleanup();
    YA.gameplayStop();
    this.scene.start('Menu');
  }

  _cleanup() {
    if (this.joystick) this.joystick.destroy();
    this.enemies.forEach((e) => e.destroy());
    this.bullets.forEach((b) => b.destroy());
    this.hostileBullets.forEach((b) => b.gfx && b.gfx.destroy());
    this.orbs.forEach((o) => o.sprite.destroy());
    if (this.effects) this.effects.destroyAll();
    this.enemies = []; this.bullets = []; this.orbs = []; this.hostileBullets = [];
  }

  // Экранный центр — для оверлеев с setScrollFactor(0).
  // ВАЖНО: объект с scrollFactor(0) рендерится БЕЗ смещения камерой, его позиция = экранная.
  // Поэтому центр экрана = canvas (width/2, height/2), а НЕ worldView.centerX (это мировая точка).
  _scrCenter() {
    return { cx: this.width / 2, cy: this.height / 2 };
  }

  // СМЕШАННЫЙ ПУЛ ВЫБОРА: оружия и пассивы соревнуются за одни и те же три карты.
  // Созревшая эволюция всегда занимает первую карту — это обещание игроку: собрал условия,
  // получил награду, а не «повезёт с роллом».
  //
  // Пассивных слотов тоже конечное число: когда взято PASSIVE_SLOTS РАЗНЫХ пассивов,
  // предлагаются только уже взятые. Иначе к 10-й волне у всех один и тот же полный набор,
  // и билд перестаёт быть выбором.
  _rollChoices(count = 3) {
    const out = [];
    const passiveLevels = this.upgradeStacks;

    const offers = this.loadout.offers({ passives: passiveLevels, count: count + 2 });
    const evo = offers.find((o) => o.kind === 'evolution');
    if (evo) out.push(this._weaponCard(evo));

    const pool = [];
    for (const o of offers) {
      if (o.kind === 'evolution') continue;
      pool.push(this._weaponCard(o));
    }
    const takenDistinct = Object.keys(passiveLevels).filter((k) => passiveLevels[k] > 0).length;
    const passives = rollUpgrades(passiveLevels, count + 2)
      .filter((u) => takenDistinct < PASSIVE_SLOTS || (passiveLevels[u.id] || 0) > 0);
    for (const p of passives) pool.push(this._passiveCard(p));

    // Финальный отбор ТОЖЕ взвешен по редкости — раньше здесь стоял голый Math.random(),
    // и подпись «Редкое» переставала быть правдой на экране: вес учитывался только на
    // предварительном отборе кандидатов, а какие 3 из них реально покажутся — уже нет.
    // Найдено игроком: «редкий» бонус выпадал не реже обычного.
    const rest = weightedPick(pool, count - out.length, (c) => RARITY_WEIGHTS[c.rarity] || 1);
    out.push(...rest);
    return out;
  }

  // Оружейная карта в том же виде, что и пассивная: у карточки один интерфейс.
  _weaponCard(offer) {
    const def = offer.def;
    const isEvo = offer.kind === 'evolution';
    return {
      id: offer.id, icon: def.icon, name: def.name, desc: def.desc,
      rarity: isEvo ? 'epic' : (offer.kind === 'new' ? 'rare' : 'common'),
      kind: offer.kind, nextLevel: offer.nextLevel, maxLevel: def.maxLevel,
      apply: () => {
        this.loadout.take(offer.id);
        this._refreshBuildIcons();
        // Орбитальные сферы — постоянные: при смене уровня их надо пересобрать сразу,
        // не дожидаясь следующего срабатывания кулдауна.
        this.weaponTicker.update(0.0001, this._weaponCtx());
      }
    };
  }

  _passiveCard(up) {
    return {
      id: up.id, icon: up.icon, name: up.name, desc: up.desc, rarity: up.rarity,
      kind: 'passive',
      apply: () => {
        up.apply(this.state);
        this.upgradeStacks[up.id] = (this.upgradeStacks[up.id] || 0) + 1;
        this._refreshBuildIcons();
      }
    };
  }

  // Сундук с элиты/босса — то же окно выбора, но со своим заголовком и возможностью
  // открыть второй за просмотр рекламы. Отдельный экран здесь был бы копией этого.
  _openChest() {
    if (this.gameOverShown || this.paused) return;   // не лезем поверх другого окна
    Sounds.upgrade();
    this._openUpgradeChoice({ chest: true });
  }

  // Пул выбора пуст (оружие и пассивы одновременно на потолке) — полное исцеление
  // + временный баф на волну вместо награды, которую нечем показать.
  _grantOverflowReward() {
    this.state.hp = this.state.maxHp;
    this._sanitizeHp();
    this.overflowBuffTimer = BALANCE.waves.duration;
    Sounds.levelUp();
    this._flash(i18n.t('overflowReward'), THEME.colors.successText);
  }

  _openUpgradeChoice(opts = {}) {
    const isChest = !!opts.chest;
    this._upgradeChoiceOpen = true;
    this.paused = true;
    YA.gameplayStop();
    // Пока идёт очередь окон (_tryOpenNextUpgradeChoice), update() не выполняется вообще
    // (ранний return при this.paused) — HUD за модалкой ни разу не перерисовывался бы между
    // окнами, хотя this.level/this.xp внутри уже полностью актуальны после ВСЕЙ пачки
    // уровней. Игрок видел «полоса опыта будто не связана с уровнем» (жалоба 2026-08-22):
    // взял карту, а цифры за окном не сдвинулись — потому что кадр с новым значением
    // никогда не рисовался, а не потому что счёт был неверным. Один явный вызов здесь
    // покрывает и первое открытие, и каждый переход по очереди.
    this._updateHud();
    const choices = this._rollChoices(3);
    // Пул полностью исчерпан (и оружие, и пассивы на потолке) — выбирать не из чего.
    // Раньше это молча ничего не показывало (жалоба игрока: «уровень пришёл — окна нет»).
    // Кристаллы тут бессмысленны, если Лаборатория уже прокачана до предела — вместо них
    // полное исцеление + временный баф (решение игрока 2026-08-22).
    if (choices.length === 0) {
      this._grantOverflowReward();
      this._upgradeChoiceOpen = false;
      if (this._pendingUpgradeChoices > 0) this._tryOpenNextUpgradeChoice();
      else { this.paused = false; YA.gameplayStart(); }
      return;
    }

    const { width, height } = this.scale;
    const { cx: panelCx, cy: panelCy } = this._scrCenter();
    // Сундук элиты/босса и левел-ап ведут в одно и то же окно, но должны читаться с первого
    // взгляда как РАЗНЫЕ вещи (жалоба игрока 2026-08-24: путал сундуки с левел-апами, полоска
    // опыта под HP отражает только уровень, а сундук с ней вообще не связан). Золото/янтарь
    // (THEME.colors.accent — «награды, реклама, золото») против фиолетового цвета опыта.
    const overlay = this.add.rectangle(panelCx, panelCy, width, height,
      isChest ? THEME.colors.chestOverlay : 0x000000, 0.7).setDepth(300).setScrollFactor(0);
    const panelW = width - 60, panelH = height * 0.72;
    const panel = this.add.graphics().setDepth(301).setScrollFactor(0);
    panel.fillStyle(isChest ? THEME.colors.chestPanel : THEME.colors.panel, 1);
    panel.fillRoundedRect(panelCx - panelW / 2, panelCy - panelH / 2, panelW, panelH, THEME.radius);
    panel.lineStyle(isChest ? 5 : 3, isChest ? THEME.colors.accent : THEME.colors.panelBorder, 1);
    panel.strokeRoundedRect(panelCx - panelW / 2, panelCy - panelH / 2, panelW, panelH, THEME.radius);

    // Цвет рамки и заголовка меняли раньше — игрок сказал прямо: мелочи, глаз не цепляют.
    // Рисуем настоящую иконку сундука (форма, не оттенок) и делаем ей эффектное появление —
    // это то, что считывается за долю секунды, даже не читая текст заголовка.
    if (isChest) { this._chestIcon = this._drawChestIcon(panelCx, panelCy - panelH / 2 + 34); }
    const titleTopOffset = isChest ? 78 : 50;
    const hintTopOffset = isChest ? 128 : 100;
    const title = this.add.text(panelCx, panelCy - panelH / 2 + titleTopOffset,
      i18n.t(isChest ? 'chestTitle' : 'chooseUpgrade'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
      color: isChest ? THEME.colors.accentText : THEME.colors.xpText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302).setStroke(THEME.textStroke.color, 4).setScrollFactor(0);
    const hint = this.add.text(panelCx, panelCy - panelH / 2 + hintTopOffset,
      i18n.t(isChest ? 'chestHint' : 'chooseHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0);

    const LAYER = 'upgradeChoice';
    Input.openLayer(this, LAYER);

    const cardW = (panelW - 80) / 3;
    const cardH = panelH * 0.55;
    const cardY = panelCy + 30;
    const startX = panelCx - panelW / 2 + 40 + cardW / 2;
    const cards = [];
    choices.forEach((up, i) => {
      const cx = startX + i * (cardW + 10);
      const card = this._makeUpgradeCard(up, cx, cardY, cardW, cardH, LAYER, () => {
        up.apply(this.state);
        this._sanitizeHp();
        this._recalcEffects();
        Analytics.event(EVENTS.UPGRADE_CHOSEN, { id: up.id });
        Sounds.upgrade();
        this._closeUpgradeChoice(overlay, panel, title, hint, cards);
        this._upgradeChoiceOpen = false;
        // Если за это время накопился ещё уровень — следующее окно открывается СРАЗУ,
        // не снимая паузу между ними (иначе на кадр-другой игра дёрнется в бой и обратно).
        if (this._pendingUpgradeChoices > 0) this._tryOpenNextUpgradeChoice();
        else { this.paused = false; YA.gameplayStart(); }
      });
      cards.push(card);
    });

    // Кнопка за просмотр рекламы: в сундуке — «открыть второй», в обычном выборе — реролл.
    // Обе точки одинаковые по сути: игрок сам решает, стоит ли ролик лишней карты.
    const adKey = isChest ? 'chest' : 'reroll';
    const adLabel = isChest ? 'chestSecond' : 'reroll';
    const adAllowed = isChest
      ? AdGate.canReward('chest')
      : (this.rerollsUsed < REROLLS_PER_RUN && AdGate.canReward('reroll'));
    if (adAllowed) {
      Ads.hasRewarded().then((ready) => {
        // Пока шёл ответ, игрок мог выбрать карту или погибнуть — окна уже нет.
        if (!ready || this.gameOverShown || !this.paused) return;
        const btn = createButton(this, panelCx, panelCy + panelH / 2 - 46, i18n.t(adLabel), () => {
          btn.disableInteractive();
          Analytics.event(EVENTS.AD_REWARD_SHOWN, { point: adKey });
          let paid = false;
          Ads.showRewarded({
            onRewarded: () => {
              paid = true;
              if (!isChest) this.rerollsUsed++;
              AdGate.spendReward(adKey);
              // Закрываем текущее окно и открываем заново — свежая тройка карт.
              // Пауза при этом не снимается: _openUpgradeChoice ставит её сам.
              this._closeUpgradeChoice(overlay, panel, title, hint, cards);
              this._openUpgradeChoice({ chest: isChest });
            },
            onClose: () => {
              if (paid) return;
              Analytics.event(EVENTS.AD_REWARD_DECLINED, { point: adKey });
              if (btn.active) btn.setInteractive({ useHandCursor: true });
            }
          });
        }, { color: isChest ? THEME.colors.accent : THEME.colors.neutral,
             textColor: isChest ? THEME.colors.primaryText : THEME.colors.text, layer: LAYER,
             paddingX: 22, paddingY: 10, fontSize: THEME.fontSize.small });
        btn.setDepth(303).setScrollFactor(0);
        // В массив cards кнопку класть НЕЛЬЗЯ: _closeUpgradeChoice зовёт у элементов
        // c.container.destroy() и c.g.destroy(), а у кнопки таких полей нет.
        this._rerollBtn = btn;
      });
    }

    Save.update({ meta: (Save.cache && Save.cache.meta) || {} });
  }

  // Пересчёт пула эффектов из upgradeStacks (после взятия апгрейда).
  // ВСЕ источники урона — аддитивные/плоские/доли, не множители damage.
  _recalcEffects() {
    const s = this.upgradeStacks;
    const e = BALANCE.effects;
    const fx = this._effects;
    fx.chainChance = Math.min(1, (s.chainLightning || 0) * 0.18);
    fx.chainTargets = (s.chainLightning || 0) * 2;
    fx.chainDamage = (s.chainLightning || 0) * e.chainLightning.damage * 4 + 8;
    fx.explodeChance = Math.min(1, (s.explodeOnKill || 0) * 0.2);
    fx.explodeDamage = (s.explodeOnKill || 0) * e.explodeOnKill.damage * 5 + 12;
    fx.homingChance = Math.min(0.6, (s.homing || 0) * 0.12);
    fx.critChance = Math.min(0.6, (s.crit || 0) * 0.08);
    fx.thorns = Math.min(0.6, (s.thorns || 0) * 0.1);
    fx.slowAura = Math.min(0.5, (s.slowAura || 0) * 0.1);
    fx.bulletSizeBonus = (s.bulletSize || 0) * 2;
    fx.vampHeal = (s.vampirism || 0) * 2;
    fx.dodgeChance = Math.min(0.35, (s.dodge || 0) * 0.06);
    fx.weakenChance = Math.min(0.5, (s.weaken || 0) * 0.1);
    fx.weakenMult = e.weaken.mult;
    fx.weakenDuration = e.weaken.duration;
    fx.crystalChance = Math.min(0.25, (s.crystalMagnet || 0) * 0.05);
    fx.killStreakBonus = Math.min(0.5, (s.killStreak || 0) * 0.1);
    fx.killStreakDuration = e.killStreak.duration;
    fx.adrenalineBonus = Math.min(0.32, (s.adrenaline || 0) * 0.08);
    fx.adrenalineThreshold = e.adrenaline.threshold;
    fx.secondChance = (s.secondChance || 0) > 0;
    fx.fragMineChance = Math.min(0.4, (s.fragMine || 0) * 0.08);
    fx.fragMineDamage = (s.fragMine || 0) * 6 + 15;
  }

  _makeUpgradeCard(up, x, y, w, h, layer, onPick) {
    // Фон и рамка рисуются ЛОКАЛЬНЫМИ координатами и живут ВНУТРИ container (а не отдельным
    // top-level объектом с координатами, зашитыми в путь). Раньше g лежал вне контейнера с
    // абсолютными координатами карты в самом пути отрисовки — при наведении g.setScale(1.04)
    // масштабировал рамку вокруг точки (0,0) СЦЕНЫ, а не вокруг центра карты. Три карты в ряд
    // давали три разных сдвига (+7/+15/+23 px, тем больше, чем правее карта) — рамка визуально
    // отрывалась от иконки и текста. Замер подтвердил: g.x === 0 при центре карты x === 573.
    const g = this.add.graphics();
    const accent = up.rarity === 'epic' ? THEME.colors.accent : (up.rarity === 'rare' ? THEME.colors.xp : THEME.colors.primary);
    // Цвет ТЕКСТА — только строковые поля темы: у обычной редкости здесь стояло числовое
    // THEME.colors.primary, и Phaser молча красил подпись в чёрный.
    const accentText = up.rarity === 'epic' ? THEME.colors.accentText
      : (up.rarity === 'rare' ? THEME.colors.xpText : THEME.colors.text);
    g.fillStyle(THEME.colors.panel, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);
    g.lineStyle(3, accent, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.radius);

    const container = this.add.container(x, y).setDepth(303).setScrollFactor(0);
    // Иконки после slice_icons.py не квадратные (обрезаны по содержимому) — fitIcon вписывает
    // их в 96×96 без искажения пропорций, а не растягивает как setDisplaySize.
    const icon = fitIcon(this.add.image(0, -h / 2 + 70, up.icon), 96);
    // Перенос обязателен: без него длинные названия («Критический выстрел») вылезали
    // за карточку и налезали на соседнюю — поймано скриншотом окна сундука.
    const nameTxt = this.add.text(0, -14, i18n.t(up.name), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      fontStyle: 'bold', align: 'center', wordWrap: { width: w - 20 }
    }).setOrigin(0.5);
    const descTxt = this.add.text(0, 42, i18n.t(up.desc), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
      align: 'center', wordWrap: { width: w - 24 }
    }).setOrigin(0.5);
    // Нижняя строка: у оружия важнее уровень («ур. 2 → 3»), чем редкость — игрок должен
    // видеть, во что вкладывается, и как близко эволюция.
    let bottom = i18n.t('rarity_' + up.rarity);
    if (up.kind === 'evolution') bottom = i18n.t('cardEvolution');
    else if (up.kind === 'new') bottom = i18n.t('cardNewWeapon');
    else if (up.kind === 'levelup') {
      // «N из M» читалось как «уже прокачано до N» — игрок принял последний доступный
      // пик (было 4, станет 5) за повторное предложение уже максимального уровня.
      // Стрелка показывает переход, а «(макс.)» прямо снимает вопрос «а дальше что».
      const key = up.nextLevel >= up.maxLevel ? 'cardLevelMax' : 'cardLevel';
      bottom = i18n.t(key, { prev: up.nextLevel - 1, n: up.nextLevel });
    }
    const rarityTxt = this.add.text(0, h / 2 - 30, bottom, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: accentText, fontStyle: 'bold'
    }).setOrigin(0.5);
    // g — ПЕРВЫМ, чтобы фон/рамка легли под иконку и текст (порядок в контейнере = порядок
    // отрисовки, как раньше давали отдельные depth 302/303).
    container.add([g, icon, nameTxt, descTxt, rarityTxt]);

    container.setSize(w, h).setScrollFactor(0);
    // setInteractive без явного hitArea: размер берётся из setSize (проверено в ui/Button.js).
    container.setInteractive({ useHandCursor: true });
    // Один setScale на весь контейнер — g теперь его ребёнок и масштабируется вокруг ТОЙ ЖЕ
    // точки (центра карты), что и содержимое, вместо отдельного вызова с другим пивотом.
    container.on('pointerover', () => container.setScale(1.04));
    container.on('pointerout', () => container.setScale(1));
    // ВЫБОР ТОЛЬКО ПО down→up НА САМОЙ КАРТЕ.
    // Баг: игрок вёл корабль мышью (pointer зажат) → открылось окно → отпустил над картой →
    // она выбиралась неосознанно. Теперь pointerup выбирает, только если на ЭТОЙ карте был
    // pointerdown (осознанное нажатие). Висящий с прошлого клика pointerup игнорируется.
    let pressedOnCard = false;
    container.on('pointerdown', () => { pressedOnCard = true; });
    container.on('pointerup', () => { if (pressedOnCard) { pressedOnCard = false; onPick(); } });
    container.on('pointerout', () => { pressedOnCard = false; });
    Input.register(this, container, onPick, { layer });

    return { container };
  }

  _closeUpgradeChoice(overlay, panel, title, hint, cards) {
    overlay.destroy(); panel.destroy(); title.destroy(); hint.destroy();
    // g теперь ребёнок container — container.destroy(true) убирает его вместе с остальным.
    cards.forEach((c) => c.container.destroy(true));
    // Кнопка реролла живёт вне массива cards (у неё нет полей container/g) — снимаем явно.
    if (this._rerollBtn) { this._rerollBtn.destroy(); this._rerollBtn = null; }
    if (this._chestIcon) { this._chestIcon.destroy(); this._chestIcon = null; }
    Input.closeLayer(this, 'upgradeChoice');
  }

  // Иконка сундука над заголовком окна-трофея: два тона золота (крышка светлее корпуса) +
  // тёмный замок посередине — узнаваемый силуэт без художника, чистой векторной графикой.
  // Появление с overshoot (Back.easeOut) плюс россыпь искр — то, что цепляет глаз за
  // долю секунды, в отличие от одной лишь смены цвета рамки (жалоба игрока 2026-08-24).
  _drawChestIcon(cx, cy) {
    const g = this.add.graphics().setDepth(302).setScrollFactor(0);
    g.lineStyle(3, 0x5c3a00, 1);
    g.fillStyle(0xdb9400, 1);
    g.fillRoundedRect(-32, -4, 64, 26, 6);
    g.strokeRoundedRect(-32, -4, 64, 26, 6);
    g.fillStyle(0xffc94d, 1);
    g.fillRoundedRect(-32, -20, 64, 18, 6);
    g.strokeRoundedRect(-32, -20, 64, 18, 6);
    g.fillStyle(0x1a1206, 1);
    g.fillRoundedRect(-7, -11, 14, 14, 3);
    g.setPosition(cx, cy);
    g.setScale(0);
    this.tweens.add({ targets: g, scale: 1, duration: 260, ease: 'Back.easeOut' });
    for (let i = 0; i < 8; i++) {
      const p = this.add.graphics().setDepth(303).setScrollFactor(0);
      p.fillStyle(THEME.colors.accent, 1);
      p.fillCircle(0, 0, 3);
      p.setPosition(cx, cy);
      const ang = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      this.tweens.add({
        targets: p, alpha: 0,
        x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist,
        duration: 420, onComplete: () => p.destroy()
      });
    }
    return g;
  }

  _togglePause() {
    if (this.gameOverShown || this.paused) return;
    this.paused = true;
    YA.gameplayStop();
    const { width, height } = this.scale;
    const { cx, cy } = this._scrCenter();
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.75).setDepth(300).setScrollFactor(0);
    const txt = this.add.text(cx, cy - 60, i18n.t('paused'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);

    const resume = createButton(this, cx, cy + 30, i18n.t('resume'), () => {
      overlay.destroy(); txt.destroy(); resume.destroy(); menuBtn.destroy();
      Input.closeLayer(this, 'pause');
      this.paused = false; YA.gameplayStart();
    }, { layer: 'pause' }).setDepth(301).setScrollFactor(0);

    const menuBtn = createButton(this, cx, cy + 110, i18n.t('toMenu'), () => {
      overlay.destroy(); txt.destroy(); resume.destroy(); menuBtn.destroy();
      Input.closeLayer(this, 'pause');
      this._toMenu();
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, layer: 'pause' }).setDepth(301).setScrollFactor(0);

    Input.openLayer(this, 'pause');
  }

  _createHud() {
    const { width } = this.scale;
    // Весь HUD — fixed к экрану (setScrollFactor 0): мир под ним едет, интерфейс стоит.
    this.hud = this.add.graphics().setDepth(150).setScrollFactor(0);
    this.hud.fillStyle(THEME.colors.panel, 0.85);
    this.hud.fillRect(0, 0, width, 110);
    this.hud.lineStyle(2, THEME.colors.panelBorder, 1);
    this.hud.lineBetween(0, 110, width, 110);

    this.waveTxt = this.add.text(24, 18, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text, fontStyle: 'bold'
    }).setDepth(151).setStroke(THEME.textStroke.color, 4).setScrollFactor(0);

    this.scoreTxt = this.add.text(24, 58, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText
    }).setDepth(151).setStroke(THEME.textStroke.color, 3).setScrollFactor(0);

    this.levelTxt = this.add.text(width - 24, 18, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.xpText, fontStyle: 'bold'
    }).setOrigin(1, 0).setDepth(151).setStroke(THEME.textStroke.color, 4).setScrollFactor(0);

    const hpBarW = width - 48;
    this.hpBarBg = this.add.graphics().setDepth(151).setScrollFactor(0);
    this.hpBar = this.add.graphics().setDepth(152).setScrollFactor(0);
    this.hpBarY = 128;

    this.xpBar = this.add.graphics().setDepth(152).setScrollFactor(0);
    this.xpBarY = 156;

    // Полоса HP босса (сверху, появляется только когда босс активен).
    this.bossBarBg = this.add.graphics().setDepth(153).setScrollFactor(0);
    this.bossBar = this.add.graphics().setDepth(154).setScrollFactor(0);
    this.bossNameTxt = this.add.text(width / 2, 184, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.dangerText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(154).setScrollFactor(0).setStroke(THEME.textStroke.color, 3);

    // Слоты билда: игрок обязан видеть свой набор и уровни, иначе билд собирается вслепую
    // и «во что вкладываться» становится угадайкой. Живут в правой части верхней панели,
    // под строкой уровня — там свободно и не задевают HP/XP снизу.
    this.slotIcons = [];
    this._slotsY = 78;
    this._hpBarW = hpBarW;
  }

  // Полный список взятого: оружие (loadout) + пассивы (upgradeStacks), в одной форме
  // для иконок HUD и для карточки/списка при тапе. levelText — что написано в бейдже
  // на иконке: у оружия голое число уровня, у пассивов «×N» стаков (другая природа
  // прокачки — отличать надо и когда оба типа стоят рядом в одном ряду).
  _buildItems() {
    const items = [];
    for (const w of this.loadout.active()) {
      items.push({
        icon: w.def.icon, name: w.def.name, desc: w.def.desc,
        levelText: String(w.level), maxed: w.level >= w.def.maxLevel
      });
    }
    for (const up of UPGRADES) {
      const n = this.upgradeStacks[up.id] || 0;
      if (n <= 0) continue;
      items.push({
        icon: up.icon, name: up.name, desc: up.desc,
        levelText: '×' + n, maxed: n >= up.maxStacks
      });
    }
    return items;
  }

  // Перерисовать полоску иконок билда. Зовётся при изменении набора, а не каждый кадр:
  // иконки — тяжелее текста, дёргать их 60 раз в секунду незачем.
  //
  // Иконки — оружие (макс. 3, WEAPON_SLOTS) вперемешку с пассивами (макс. 6, PASSIVE_SLOTS) —
  // до 9 штук. Такая мелкая иконка на телефоне пальцем прицельно не взять (жалоба игрока
  // 2026-08-22: «иконки просто есть, что каждая значит — непонятно, и не навести мышкой»),
  // поэтому точность тапа по КОНКРЕТНОЙ иконке нужна только на мыши — там клик по иконке
  // открывает карточку именно её. На тач-устройстве тап по ЛЮБОЙ иконке ряда открывает
  // общий список всего билда: раз промах ведёт туда же, что и точное попадание, мелкий
  // размер иконок перестаёт быть проблемой.
  _refreshBuildIcons() {
    this.slotIcons.forEach((o) => o.destroy());
    this.slotIcons = [];
    const items = this._buildItems();
    const size = 34, gap = 6, step = size + gap;
    // Середина панели: справа кнопка паузы (её центр width-70) и строка уровня, слева —
    // «Волна» и «Очки». Первая версия клала иконки справа и уезжала прямо под паузу —
    // поймано скриншотом, замер против отдельных элементов этого не показал.
    let x = 230 + size / 2;
    for (const item of items) {
      const icon = fitIcon(this.add.image(x, this._slotsY, item.icon), size)
        .setDepth(151).setScrollFactor(0).setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => this._onBuildIconTap(item));
      const lvl = this.add.text(x + size / 2 - 2, this._slotsY + size / 2 - 4, item.levelText, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny,
        color: item.maxed ? THEME.colors.accentText : THEME.colors.text,
        fontStyle: 'bold'
      }).setOrigin(1, 1).setDepth(152).setScrollFactor(0).setStroke(THEME.textStroke.color, 4);
      this.slotIcons.push(icon, lvl);
      x += step;
    }
  }

  // Тач — устройство БЕЗ os.desktop, с поддержкой touch: точный тап по мелкой иконке
  // ненадёжен, поэтому любая открывает общий список. Мышь — точный клик по конкретной
  // иконке открывает карточку только её.
  _onBuildIconTap(item) {
    const touch = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
    if (touch) this._showBuildList();
    else this._showBuildInfo(item);
  }

  // Карточка одного пункта билда (мышь, клик по конкретной иконке).
  _showBuildInfo(item) {
    const LAYER = 'buildinfo';
    this.paused = true;
    Input.openLayer(this, LAYER);
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const w = 300, h = 220;
    const objs = [];
    const scrim = this.add.rectangle(cx, cy, width, height, 0x000000, 0.6)
      .setDepth(300).setScrollFactor(0).setInteractive();
    objs.push(scrim);
    const panel = this.add.graphics().setDepth(301).setScrollFactor(0);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, THEME.radius);
    panel.lineStyle(3, THEME.colors.primary, 1);
    panel.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, THEME.radius);
    objs.push(panel);
    objs.push(fitIcon(this.add.image(cx, cy - h / 2 + 60, item.icon), 72)
      .setDepth(302).setScrollFactor(0));
    objs.push(this.add.text(cx, cy - h / 2 + 112, i18n.t(item.name), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      fontStyle: 'bold', align: 'center', wordWrap: { width: w - 30 }
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0));
    objs.push(this.add.text(cx, cy - h / 2 + 150, i18n.t(item.desc), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
      align: 'center', wordWrap: { width: w - 30 }
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0));
    // Закрытие ТОЛЬКО явной кнопкой, не кликом по скриму: скрим лежит ПОД панелью на
    // всю площадь экрана, а панель и текст поверх него не интерактивны (это просто
    // фон/подписи) — клик по описанию или иконке провалился бы сквозь них до скрима
    // и закрывал бы карточку в момент, когда игрок пытается её прочитать.
    const close = () => {
      objs.forEach((o) => o.destroy());
      btn.destroy();
      Input.closeLayer(this, LAYER);
      this.paused = false;
    };
    const btn = createButton(this, cx, cy + h / 2 - 30, i18n.t('close'), close,
      { color: THEME.colors.neutral, textColor: THEME.colors.text, layer: LAYER,
        paddingX: 20, paddingY: 8, fontSize: THEME.fontSize.tiny }).setDepth(302).setScrollFactor(0);
  }

  // Общий список всего билда (тач, тап по любой иконке ряда).
  _showBuildList() {
    const items = this._buildItems();
    const LAYER = 'buildlist';
    this.paused = true;
    Input.openLayer(this, LAYER);
    const { width, height } = this.scale;
    const cx = width / 2;
    const rowH = 78;
    const panelH = Math.min(height - 80, 150 + items.length * rowH);
    const cy = height / 2;
    const w = width - 60;
    const objs = [];
    const scrim = this.add.rectangle(cx, cy, width, height, 0x000000, 0.7)
      .setDepth(300).setScrollFactor(0).setInteractive();
    objs.push(scrim);
    const panel = this.add.graphics().setDepth(301).setScrollFactor(0);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(cx - w / 2, cy - panelH / 2, w, panelH, THEME.radius);
    panel.lineStyle(3, THEME.colors.primary, 1);
    panel.strokeRoundedRect(cx - w / 2, cy - panelH / 2, w, panelH, THEME.radius);
    objs.push(panel);
    const top = cy - panelH / 2;
    objs.push(this.add.text(cx, top + 34, i18n.t('buildTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0));
    let ry = top + 78;
    for (const item of items) {
      objs.push(fitIcon(this.add.image(cx - w / 2 + 50, ry, item.icon), 44)
        .setDepth(302).setScrollFactor(0));
      objs.push(this.add.text(cx - w / 2 + 90, ry - 16, `${i18n.t(item.name)} (${item.levelText})`, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
        fontStyle: 'bold', wordWrap: { width: w - 130 }
      }).setDepth(302).setScrollFactor(0));
      objs.push(this.add.text(cx - w / 2 + 90, ry + 8, i18n.t(item.desc), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
        wordWrap: { width: w - 130 }
      }).setDepth(302).setScrollFactor(0));
      ry += rowH;
    }
    // Закрытие ТОЛЬКО явной кнопкой (та же причина, что и в _showBuildInfo — иначе клик
    // по любой строке списка проваливается сквозь неё до скрима и закрывает список).
    const close = () => {
      objs.forEach((o) => o.destroy());
      btn.destroy();
      Input.closeLayer(this, LAYER);
      this.paused = false;
    };
    const btn = createButton(this, cx, top + panelH - 34, i18n.t('close'), close,
      { color: THEME.colors.neutral, textColor: THEME.colors.text, layer: LAYER,
        paddingX: 20, paddingY: 8, fontSize: THEME.fontSize.tiny }).setDepth(302).setScrollFactor(0);
  }

  _updateHud() {
    this.waveTxt.setText(i18n.t('wave', { n: this.waveNum }));
    this.scoreTxt.setText(i18n.t('score') + ': ' + this._calcScore());
    this.levelTxt.setText(i18n.t('level', { n: this.level }));

    const hpW = this._hpBarW;
    // hp/maxHp теперь всегда валидны (_sanitizeHp), но защищаемся на случай.
    const mh = this.state.maxHp || BALANCE.player.maxHp;
    const hpPct = Math.max(0, Math.min(1, (this.state.hp || 0) / mh));
    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x000000, 0.45);
    this.hpBarBg.fillRoundedRect(24, this.hpBarY, hpW, 18, 8);
    this.hpBar.clear();
    const hpColor = hpPct > 0.5 ? THEME.colors.success : (hpPct > 0.25 ? THEME.colors.accent : THEME.colors.danger);
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRoundedRect(24, this.hpBarY, Math.max(0, hpW * hpPct), 18, 8);

    const xpPct = Math.min(1, this.xp / this.xpToNext);
    this.xpBar.clear();
    this.xpBar.fillStyle(0x000000, 0.4);
    this.xpBar.fillRoundedRect(24, this.xpBarY, hpW, 8, 4);
    this.xpBar.fillStyle(THEME.colors.xp, 1);
    this.xpBar.fillRoundedRect(24, this.xpBarY, hpW * xpPct, 8, 4);

    // HP босса.
    this.bossBarBg.clear();
    this.bossBar.clear();
    if (this.boss && this.boss.alive) {
      const bw = this._hpBarW, by = 200;
      const pct = Math.max(0, Math.min(1, this.boss.hp / this.boss.maxHp));
      this.bossNameTxt.setVisible(true).setText(i18n.t('bossIncoming'));
      this.bossBarBg.fillStyle(0x000000, 0.55);
      this.bossBarBg.fillRoundedRect(24, by, bw, 14, 7);
      this.bossBar.fillStyle(THEME.colors.danger, 1);
      this.bossBar.fillRoundedRect(24, by, bw * pct, 14, 7);
    } else {
      this.bossNameTxt.setVisible(false);
    }
  }

  _drawPlayer() {
    const p = this.player;
    this.aura.clear();
    this.aura.fillStyle(THEME.colors.primary, 0.12);
    this.aura.fillCircle(p.x, p.y, p.radius * 1.8);
    if (this.invuln > 0) {
      const a = (Math.sin(this.elapsed * 30) + 1) * 0.5;
      this.aura.lineStyle(2, THEME.colors.primary, 0.4 + a * 0.4);
      this.aura.strokeCircle(p.x, p.y, p.radius * 1.5);
    }
    if (this.playerSprite && this.playerSprite.type === 'Image') {
      this.playerSprite.x = p.x;
      this.playerSprite.y = p.y;
      if (this.lastAngle !== undefined) this.playerSprite.rotation = this.lastAngle + Math.PI / 2;
    } else if (this.playerSprite) {
      this.playerSprite.clear();
      this.playerSprite.fillStyle(THEME.colors.primary, 1);
      this.playerSprite.fillCircle(p.x, p.y, p.radius);
    }
  }

  _spawnHitFlash(x, y, crit) {
    const f = this.add.graphics().setDepth(25);
    f.fillStyle(crit ? 0xffd54f : 0xffffff, crit ? 0.9 : 0.7);
    f.fillCircle(x, y, crit ? 22 : 14);
    this.tweens.add({ targets: f, alpha: 0, duration: crit ? 160 : 120, onComplete: () => f.destroy() });
  }

  _spawnDeathBurst(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const p = this.add.graphics().setDepth(24);
      p.fillStyle(color || THEME.colors.primary, 1);
      p.fillCircle(x, y, 4);
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 30;
      this.tweens.add({
        targets: p, alpha: 0,
        x: Math.cos(ang) * dist, y: Math.sin(ang) * dist,
        duration: 280, onComplete: () => p.destroy()
      });
    }
  }

  _flashScreen() {
    // Экранный оверлей: scrollFactor 0 → позиция экранная (canvas-центр), не мировая.
    const f = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, THEME.colors.danger, 0.25)
      .setDepth(250).setScrollFactor(0);
    this.tweens.add({ targets: f, alpha: 0, duration: 200, onComplete: () => f.destroy() });
  }

  _showWaveBanner() {
    const txt = this.add.text(this.width / 2, this.height * 0.3, i18n.t('wave', { n: this.waveNum }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(260).setAlpha(0).setStroke(THEME.textStroke.color, 6).setScrollFactor(0);
    this.tweens.add({
      targets: txt, alpha: 1, duration: 250, yoyo: true, hold: 600,
      onComplete: () => txt.destroy()
    });
    // Тип волны подписью под номером: игрок должен успеть перестроиться ДО того,
    // как «особая» волна вылезет на экран, а не догадываться по составу толпы.
    if (this.waveType && this.waveType.id !== 'normal') {
      const sub = this.add.text(this.width / 2, this.height * 0.3 + 62, i18n.t(this.waveType.label), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
        color: THEME.colors.dangerText, fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(260).setAlpha(0).setStroke(THEME.textStroke.color, 5).setScrollFactor(0);
      this.tweens.add({
        targets: sub, alpha: 1, duration: 250, yoyo: true, hold: 600,
        onComplete: () => sub.destroy()
      });
    }
  }

  _flash(text, color) {
    // wordWrap обязателен: короткие баннеры («БОСС!») в него не упирались, но более
    // длинная фраза (награда за пустой пул апгрейдов) без переноса вылезала за оба края
    // экрана — поймано скриншотом, а не на глаз в коде.
    const t = this.add.text(this.width / 2, this.height * 0.35, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: color || THEME.colors.text,
      fontStyle: 'bold', align: 'center', wordWrap: { width: this.width - 60 }
    }).setOrigin(0.5).setDepth(260).setAlpha(0).setStroke(THEME.textStroke.color, 5).setScrollFactor(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 200, yoyo: true, hold: 700,
      onComplete: () => t.destroy()
    });
  }
}
