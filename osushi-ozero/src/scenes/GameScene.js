// Game: разрез озера. Цикл: тап по воде -> черпаем -> тап по сливу -> несём,
// выливаем -> жетоны -> прокачка. Уровень воды падает от каждого ведра,
// открывая зоны глубины. Телефон на дне виден с первой секунды.
import { Platform } from '../platform/index.js';
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { bus } from '../core/events.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { Audio } from '../core/audio.js';
import { SFX } from '../core/sfx.js';
import { EVENTS } from '../data/analytics-events.js';
import {
  ZONES, PLAYER_BASE, SKILLS, TELEPORT_COOLDOWNS, BUCKETS, CHESTS, ECONOMY, SHARK,
  PUMP, FISH, FINDS, QUESTS, BADGES, LAKES, GAS, HATS, FLOAT_CHEST
} from '../data/balance.js';
import { Checkpoint, pickNewest } from '../core/checkpoint.js';
import { LakeModel } from '../mechanics/lake/lake.js';
import { SkillTreeModel } from '../mechanics/skilltree/skilltree.js';
import { QuestSystem } from '../mechanics/quests/quests.js';
import {
  BASE_W, WORLD_H, SURFACE_Y, LAKE_BOTTOM_Y,
  yFromDepth, wallLeftAtY, wallRightAtY, wallLeft, wallRight,
  DRAIN_ZONES, drainPos, activeDrainZone, zoneTopDepth
} from './layout.js';
import { drawWorld, WaterLayer, AmbienceLayer } from './world.js';
import { createPlayer, createDrain, createShark, createChest, createPhone, BUCKET_COLORS } from './actors.js';
import { SkillTreeOverlay } from '../ui/SkillTreeOverlay.js';
import { ShopOverlay } from '../ui/ShopOverlay.js';
import { VictoryOverlay } from '../ui/VictoryOverlay.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  async create() {
    // Сцена перезапускается (престиж): update() не должен трогать мир,
    // пока асинхронный create() не пересоздал его заново.
    this.started = false;
    this.events.once('shutdown', () => { this.started = false; });

    Platform.gameplayStart();
    Input.setup(this);
    Analytics.event(EVENTS.GAME_START);

    // --- Состояние из сейва -------------------------------------------------
    // Облако читаем ОДИН раз за жизнь страницы (Platform.cache), не при каждом
    // входе в сцену. Поверх — локальный чекпойнт партии, если он свежее.
    const cloud = Platform.cache || await Platform.save.load();
    const d = pickNewest(cloud, Checkpoint.read()) || {};
    Platform.cache = { ...d }; // мета в кэше соответствует применённому состоянию
    this.tokens = d.tokens || 0;
    this.gems = d.gems || 0;
    this.litersTotal = d.litersTotal || 0;
    this.prestigeN = d.prestigeN || 0;
    this.tutor = d.tutor || 0;
    this.ownedBuckets = d.buckets || ['wood'];
    this.bucketId = d.bucketId || 'wood';
    this.collectedChests = d.chests || [];
    this.lakeStart = d.lakeStart || Date.now();

    this.badges = d.badges || [];
    this.dodgeCount = d.dodgeCount || 0;
    this.noBiteStreak = 0;
    this.dailyDate = d.dailyDate || '';
    this.dailyLiters = d.dailyLiters || 0;
    this.dailyDone = d.dailyDone || false;
    this.streak = d.streak || 0;
    // Смена суток. Серия продолжается, только если ВЧЕРА цель была выполнена:
    // пропустил день целиком — серия обнуляется. Дни считаем по UTC (toISOString),
    // так же, как записан dailyDate, иначе на границе часовых поясов серия рвалась бы
    // у игрока, который ничего не пропускал.
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyDate !== today) {
      const yesterday = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
      if (!(this.dailyDate === yesterday && this.dailyDone)) this.streak = 0;
      this.dailyDate = today;
      this.dailyLiters = 0;
      this.dailyDone = false;
    }

    // Активное озеро: обычное или болото (выбирается на экране победы).
    this.lakeId = d.lakeId === 'swamp' ? 'swamp' : 'lake';
    this.zones = LAKES[this.lakeId].zones;
    this.hazard = LAKES[this.lakeId].hazard;
    this.ownedHats = d.hats || ['cap'];
    this.hatId = d.hatId || 'cap';

    this.lake = new LakeModel(this.zones);
    this.lake.drained = Math.min(d.drained || 0, this.lake.totalLiters);
    // costScale — цена прокачки растёт с каждым престижем (болото тяжелее качать).
    const costScale = Math.pow(ECONOMY.prestigeCostMult, this.prestigeN);
    this.tree = new SkillTreeModel(SKILLS, d.nodes || {}, costScale);
    this.maxZone = this.lake.zoneIndex();

    // Офлайн-насос: качал, пока игрока не было. Пределы: не дольше
    // PUMP.maxOfflineHours и не дальше границы текущей зоны.
    this.pumpReport = null;
    const pumpLvl = this.tree.level('pump');
    if (pumpLvl > 0 && d.ts) {
      const minutes = Math.min(Date.now() - d.ts, PUMP.maxOfflineHours * 3600e3) / 60000;
      const zi = this.lake.zoneIndex();
      const zoneEnd = this.zones.slice(0, zi + 1).reduce((s, z) => s + z.depth * z.litersPerMeter, 0);
      const cap = Math.max(0, zoneEnd - this.lake.drained - 1); // до границы, не через неё
      const pumped = Math.min(PUMP.litersPerMinute[pumpLvl - 1] * minutes, cap);
      if (pumped > 1) {
        // Доход за офлайн-литры срезан до offlineIncomeShare (30%) от активного:
        // насос возвращает игрока, но играть выгоднее, чем отсутствовать.
        const gained = Math.floor(pumped * PLAYER_BASE.tokensPerLiter * this.zones[zi].mult
          * this.tree.multiplier('income') * Math.pow(ECONOMY.prestigeIncomeMult, this.prestigeN)
          * PUMP.offlineIncomeShare);
        this.lake.drain(pumped);
        this.tokens += gained;
        this.litersTotal += pumped;
        this.pumpReport = { liters: Math.floor(pumped), tokens: gained };
        Analytics.event(EVENTS.PUMP_REPORT, { liters: Math.floor(pumped) });
      }
    }

    // Задания: ротация мелких + дневная цель.
    this.quests = new QuestSystem(QUESTS, {
      zoneLiters: () => this.zones[this.lake.zoneIndex()].litersPerMeter,
      zoneMult: () => this.zones[this.lake.zoneIndex()].mult,
      onReward: (r) => {
        if (r.tokens) { this.tokens += r.tokens; }
        if (r.gems) { this.gems += r.gems; }
        this.toast(i18n.t('questDone') + ' ' + i18n.t('questReward', { r: r.tokens ? r.tokens + ' ⬤' : r.gems + ' ◆' }),
          THEME.colors.primary);
        SFX.buy();
        this.saveMeta(false); // мелкая мета: копим, уйдёт на ближайшей точке
      },
      onDone: (type) => Analytics.event(EVENTS.QUEST_DONE, { type })
    });

    // --- Мир ----------------------------------------------------------------
    this.cameras.main.setBounds(0, 0, BASE_W, WORLD_H);
    this.cameras.main.setBackgroundColor(THEME.colors.bg);
    drawWorld(this, this.zones);
    this.water = new WaterLayer(this, this.zones, this.lakeId === 'swamp');
    this.ambience = new AmbienceLayer(this, this.zones);

    // Фоновая музыка: один запущенный луп на всю игру, mute — через Audio.
    // Трек грузится фоном из MenuScene (в предзагрузке его нет — он весит 1,58 МБ
    // и задерживал показ меню). Поэтому здесь два случая: уже доехал — играем сразу;
    // ещё едет — играем по событию загрузки. Без этой ветки быстрый игрок,
    // нажавший «Играть» в первую секунду, остался бы вообще без музыки.
    const startMusic = () => {
      if (!this.scene.isActive()) return; // ушли из сцены, пока трек догружался
      if (!this.sound.get('bg') || !this.sound.get('bg').isPlaying) {
        Audio.play('bg', { loop: true, volume: 0.35 });
      }
    };
    if (this.cache.audio.exists('bg')) {
      startMusic();
    } else {
      // Грузим СВОИМ загрузчиком, а не ждём чужой: переход в эту сцену останавливает
      // MenuScene вместе с её загрузчиком, и незавершённый запрос там может оборваться.
      // Файл к этому моменту обычно уже в кэше браузера — запрос дешёвый.
      this.load.audio('bg', 'assets/music/bg.mp3');
      this.load.once('complete', startMusic);
      this.load.start();
    }

    this.drains = {};
    for (const z of DRAIN_ZONES) {
      const p = drainPos(z);
      this.drains[z] = createDrain(this, p.x, p.y);
    }

    this.chestSprites = CHESTS.map((ch, i) => {
      const y = yFromDepth(ch.depth);
      const x = ch.side === 'R' ? wallRightAtY(y) + 42 : wallLeftAtY(y) - 34;
      const c = createChest(this, x, y - 18, ch.art === 'chest' ? null : 'decor_' + ch.art);
      c.chestIndex = i;
      if (this.collectedChests.includes(i)) c.setVisible(false);
      return c;
    });

    this.phone = createPhone(this, (wallLeft(6) + wallRight(6)) / 2, LAKE_BOTTOM_Y - 26);

    this.player = createPlayer(this);
    const startDrain = drainPos(activeDrainZone(this.lake.zoneIndex()));
    this.playerY = startDrain.y;
    this.playerX = wallLeftAtY(this.playerY);
    this.bucketFill = 0;
    this.state = 'idle';       // idle | run | scoop | pour | stunned
    this.runPurpose = null;    // scoop | pour
    this.stunRemain = 0;
    this.applyBucket();

    this.shark = createShark(this);
    this.shark.setVisible(false);
    this.sharkDir = 1;
    this.sharkWarnT = -1;
    this.sharkRest = 0;

    // --- HUD и оверлеи ------------------------------------------------------
    this.buildHud();
    this.buildTutorial();

    this.skillOverlay = new SkillTreeOverlay(this, this.tree, {
      getTokens: () => this.tokens,
      spend: (c) => { this.tokens -= c; this.refreshHud(); },
      onBought: (branch, id) => {
        Analytics.event(EVENTS.SKILL_BOUGHT, { node: id });
        if (this.tutor === 2) this.setTutor(3);
        this.applyBucket();
        this.saveMeta(true); // покупка узла — ключевая точка
      }
    });
    this.shopOverlay = new ShopOverlay(this, {
      getGems: () => this.gems,
      spendGems: (n) => { this.gems -= n; this.refreshHud(); },
      addGems: (n) => { this.gems += n; this.refreshHud(); this.saveMeta(true); },
      getOwned: () => this.ownedBuckets,
      getEquipped: () => this.bucketId,
      onBuy: (id) => { this.ownedBuckets.push(id); this.bucketId = id; this.applyBucket(); this.saveMeta(true); },
      onEquip: (id) => { this.bucketId = id; this.applyBucket(); this.saveMeta(true); },
      getOwnedHats: () => this.ownedHats,
      getEquippedHat: () => this.hatId,
      onBuyHat: (id) => { this.ownedHats.push(id); this.hatId = id; this.applyBucket(); this.saveMeta(true); },
      onEquipHat: (id) => { this.hatId = id; this.applyBucket(); this.saveMeta(true); }
    });
    this.victoryOverlay = new VictoryOverlay(this, {
      getStats: () => ({
        seconds: (Date.now() - this.lakeStart) / 1000,
        litersTotal: this.litersTotal,
        nextMult: Math.pow(ECONOMY.prestigeIncomeMult, this.prestigeN + 1),
        lakeId: this.lakeId
      }),
      onPrestige: (target) => this.prestige(target),
      onKeepPlaying: () => { /* остаёмся: сундуки ещё можно собрать */ }
    });
    this.victoryShown = false;

    // --- Ввод ---------------------------------------------------------------
    // Второй аргумент Phaser — интерактивные объекты под указателем:
    // тап по кнопке HUD не должен одновременно быть тапом по миру.
    this.input.on('pointerdown', (p, overObjects) => this.onTap(p, overObjects));
    this.busHandler = (action) => {
      if (this.overlayOpen()) return;
      if (action === 'down') this.goScoop();
      if (action === 'up') this.goDrain();
    };
    bus.on('input', this.busHandler);
    this.events.once('shutdown', () => bus.off('input', this.busHandler));

    this.boostRemain = 0;
    this.tpRemain = 0;
    this.lbSent = Math.floor(this.litersTotal); // лидерборд шлём только при росте
    this.metaDirty = false;
    this.lastMetaSaveAt = Date.now(); // отсчёт троттлинга — от старта сессии

    // Закрытие/сворачивание вкладки: синхронный локальный чекпойнт.
    // На облачную запись при ВЫГРУЗКЕ не полагаемся — она не гарантирована.
    this.pagehideHandler = () => { if (this.started) this.checkpoint(); };
    // А вот сворачивание вкладки (hidden) — момент, когда время на асинхронную
    // запись ещё есть. Это единственная точка, где облако догоняет фактический
    // прогресс: без неё игрок, который просто играл и закрыл вкладку, НЕ получал
    // облачной записи вовсе, и на другом устройстве прогресс откатывался к
    // последней ключевой точке (замер 2026-07-19: 90 с игры = 0 облачных записей,
    // ключ *_save_local не создавался ни разу).
    // Пишем только если с последней облачной записи что-то изменилось — иначе
    // переключение вкладок туда-сюда стоило бы запросов на пустом месте.
    this.lastCloudLiters = -1; // -1: первая же отправка в фон синхронизирует облако
    this.visHandler = () => {
      if (!document.hidden || !this.started) return;
      this.checkpoint();
      if (this.metaDirty || this.litersTotal !== this.lastCloudLiters) this.saveMeta(true);
    };
    window.addEventListener('pagehide', this.pagehideHandler);
    document.addEventListener('visibilitychange', this.visHandler);
    this.events.once('shutdown', () => {
      window.removeEventListener('pagehide', this.pagehideHandler);
      document.removeEventListener('visibilitychange', this.visHandler);
    });

    // Золотая рыбка: таймер до появления.
    this.fish = null;
    this.fishT = FISH.minDelay + Math.random() * (FISH.maxDelay - FISH.minDelay);
    // Плавающий сундук: первый приплыв не сразу, чтобы не столкнуться с туториалом.
    this.floatChest = null;
    this.floatChestT = FLOAT_CHEST.minDelay
      + Math.random() * (FLOAT_CHEST.maxDelay - FLOAT_CHEST.minDelay);
    this.fishBoostActive = false;
    this.ringMult = 1;
    this.adTimer = 0;        // счётчик активного времени для полноэкранной рекламы по таймеру
    this.adArmed = 0;        // таймер взведён и ждёт ближайшей паузы (сколько уже ждёт)
    this.adPending = false;  // идёт отсчёт/показ рекламы — не запускать второй раз

    this.started = true;

    Platform.ads.showBanner();        // sticky-баннер (пассивный доход, идёт всё время партии)

    // Отчёт насоса — после построения HUD.
    if (this.pumpReport) {
      this.toast(i18n.t('pumpReport', { l: this.pumpReport.liters, t: this.pumpReport.tokens }), THEME.colors.accent);
      this.saveMeta(true); // раз за вход: зафиксировать результат насоса
    }
  }

  // ---------------------------------------------------------------- стат-блок
  bucket() { return BUCKETS.find(b => b.id === this.bucketId) || BUCKETS[0]; }
  capacity() { return this.bucket().capacity * this.tree.multiplier('capacity'); }
  fillRate() { return PLAYER_BASE.fillRate * this.tree.multiplier('fill'); }
  pourRate() { return PLAYER_BASE.pourRate * this.tree.multiplier('pour'); }
  runSpeed() { return PLAYER_BASE.runSpeed * this.tree.multiplier('sprint'); }
  incomeMult() {
    return this.tree.multiplier('income')
      * (this.bucket().incomeMult || 1)
      * Math.pow(ECONOMY.prestigeIncomeMult, this.prestigeN)
      * (this.boostRemain > 0 ? ECONOMY.boostMult : 1);
  }

  applyBucket() {
    this.player.setBucketColor(BUCKET_COLORS[this.bucketId]);
    this.player.setHat(this.hatId);
    this.bucketFill = Math.min(this.bucketFill, this.capacity());
  }

  overlayOpen() {
    return (this.skillOverlay && this.skillOverlay.visible)
      || (this.shopOverlay && this.shopOverlay.visible)
      || (this.victoryOverlay && this.victoryOverlay.visible);
  }

  // ------------------------------------------------------------------- ввод
  onTap(p, overObjects) {
    if (!this.started || this.overlayOpen() || this.state === 'stunned') return;
    if (this.adPending) return; // идёт отсчёт рекламы — ввод заморожен, это настоящая пауза (C6М)
    // Палец на кнопке/интерактивном объекте — это НЕ тап по миру
    // (иначе клик по «Прокачке» внизу экрана гнал героя черпать).
    if (overObjects && overObjects.length > 0) return;
    const wx = p.worldX, wy = p.worldY;

    // Золотая рыбка?
    if (this.fish && Phaser.Math.Distance.Between(wx, wy, this.fish.x, this.fish.g.y) < 64) {
      this.catchFish();
      return;
    }
    // Плавающий сундук? Проверяем раньше прочего: он на поверхности, и тап
    // по нему не должен уходить в «зачерпнуть воду».
    if (this.floatChest) {
      const fc = this.floatChest.c;
      if (Phaser.Math.Distance.Between(wx, wy, fc.x, fc.y) < 70) { this.collectFloatChest(); return; }
    }
    // Сундук?
    for (const c of this.chestSprites) {
      if (c.visible && c.exposed && Phaser.Math.Distance.Between(wx, wy, c.x, c.y) < 56) {
        this.collectChest(c);
        return;
      }
    }
    // Слив?
    const dz = activeDrainZone(this.lake.zoneIndex());
    const dp = drainPos(dz);
    if (Phaser.Math.Distance.Between(wx, wy, dp.x, dp.y - 36) < 92) { this.goDrain(); return; }
    // Вода?
    const surfY = this.surfaceY();
    if (wy > surfY - 30 && wy < LAKE_BOTTOM_Y && !this.lake.empty) { this.goScoop(); return; }
  }

  surfaceY() { return yFromDepth(this.lake.depth()); }

  goScoop() {
    if (this.lake.empty) return;
    this.state = 'run';
    this.runPurpose = 'scoop';
  }

  goDrain() {
    this.state = 'run';
    this.runPurpose = 'pour';
  }

  teleport() {
    const lvl = this.tree.level('teleport');
    if (lvl <= 0 || this.tpRemain > 0 || this.overlayOpen()) return;
    const dp = drainPos(activeDrainZone(this.lake.zoneIndex()));
    this.playerY = dp.y;
    this.tpRemain = TELEPORT_COOLDOWNS[lvl - 1];
    this.state = 'run';
    this.runPurpose = 'pour';
    SFX.teleport();
    Analytics.first(EVENTS.TELEPORT_FIRST_USE);
    this.flash(this.player.x, this.player.y - 40);
  }

  // ------------------------------------------------------------------- цикл
  update(time, delta) {
    if (!this.started) return;
    const dt = Math.min(delta / 1000, 0.05);

    if (this.boostRemain > 0) this.boostRemain -= dt;
    if (this.tpRemain > 0) this.tpRemain -= dt;
    this.maybeShowAd(dt);

    this.updatePlayer(dt);
    this.updateShark(dt);
    this.updateGas(dt);
    this.updateFish(dt);
    this.updateFloatChest(dt);
    this.updateChests();
    this.quests.update(dt);
    this.checkZone();
    this.checkVictory();
    this.checkBadges();

    // Вода, атмосфера и камера.
    this.water.draw(this.surfaceY(), dt);
    this.ambience.update(dt, this.surfaceY(), this.playerX, this.playerY);
    const cam = this.cameras.main;
    const target = Phaser.Math.Clamp(this.playerY - this.scale.height * 0.52, 0, WORLD_H - this.scale.height);
    cam.scrollY += (target - cam.scrollY) * Math.min(1, dt * 5);

    this.refreshHud();
    this.updateTutorial();
  }

  updatePlayer(dt) {
    const p = this.player;
    const surfY = this.surfaceY();

    if (this.state === 'stunned') {
      this.stunRemain -= dt;
      if (this.stunRemain <= 0) this.state = 'idle';
      p.setLean(Math.sin(this.stunRemain * 30) * 0.15);
    } else if (this.state === 'run') {
      const targetY = this.runPurpose === 'scoop'
        ? surfY - 4
        : drainPos(activeDrainZone(this.lake.zoneIndex())).y;
      const dy = targetY - this.playerY;
      const step = this.runSpeed() * dt;
      if (Math.abs(dy) <= step) {
        this.playerY = targetY;
        if (this.runPurpose === 'scoop') {
          this.state = 'scoop';
          SFX.scoop();
          // Всплеск и муть у кромки.
          this.burst(this.playerX + 30, this.playerY + 4, { count: 8, rise: 50, spread: 30 });
          this.burst(this.playerX + 34, this.playerY + 16,
            { color: 0x6b5a43, count: 6, up: false, gravity: false, alpha: 0.35, size: 9, life: 1200, rise: 30 });
        } else {
          this.state = 'pour';
          this.pourGained = 0;
        }
      } else {
        this.playerY += Math.sign(dy) * step;
      }
      // Бежит к воде — смотрит вправо, несёт к сливу — разворачивается влево.
      p.setFacing(this.runPurpose === 'pour' ? -1 : 1);
      p.setLean(0);
      p.stepWalk(dt, true);
    } else if (this.state === 'scoop') {
      // Черпаем у кромки — лицом к воде.
      p.setFacing(1);
      const cap = this.capacity();
      if (this.bucketFill < cap) {
        this.bucketFill = Math.min(cap, this.bucketFill + this.fillRate() * dt);
        p.setLean(0.25);
        if (this.bucketFill >= cap - 1e-9) this.onBucketFull();
      } else {
        p.setLean(0);
      }
      p.stepWalk(dt, false);
    } else if (this.state === 'pour') {
      if (this.bucketFill > 0) {
        const pour = Math.min(this.pourRate() * dt, this.bucketFill);
        const real = this.lake.drain(pour);
        this.bucketFill -= pour;
        this.creditLiters(real);
        this.pourGained = (this.pourGained || 0) + real * PLAYER_BASE.tokensPerLiter * this.lake.zone().mult
          * this.incomeMult() * (this.fishBoostActive ? FISH.boostMult : 1) * (this.ringMult || 1);
        p.setFacing(-1); // лицом к сливу
        // Положительный поворот = наклон ВПЕРЁД по взгляду: контейнер отзеркален,
        // и знак поворота визуально переворачивается вместе с ним.
        p.setLean(0.35);
        // Струйка из ведра в воронку (слив слева от игрока).
        this.pourDropT = (this.pourDropT || 0) - dt;
        if (this.pourDropT <= 0) {
          this.pourDrop(this.playerX - 20, this.playerY - 46);
          this.pourDropT = 0.06;
        }
      } else {
        this.state = 'idle';
        p.setLean(0);
        this.fishBoostActive = false; // бусты рыбки/колечка — на одно ведро
        this.ringMult = 1;
        // Каждое ведро — ТОЛЬКО локальный чекпойнт; накопленная мелкая мета
        // уезжает в облако не чаще раза в 60 с (страховочный троттлинг).
        if (this.metaDirty) this.saveMeta(false); else this.checkpoint();
        if (this.tutor === 1) this.setTutor(2);
        SFX.coin();
        // Награда наглядно: «+N» у слива и монетки в счётчик.
        const gained = Math.floor(this.pourGained || 0);
        if (gained > 0) {
          this.floatText(this.playerX + 10, this.playerY - 110, '+' + gained, THEME.world.tokens);
          this.coinFly(this.playerX, this.playerY - 60, Math.min(6, 2 + Math.floor(gained / 20)));
        }
        this.pourGained = 0;
      }
      p.stepWalk(dt, false);
    } else {
      p.setLean(0);
      p.stepWalk(dt, false);
    }

    // Позиция: по стенке, x подтягивается к ступени своей зоны.
    const targetX = wallLeftAtY(this.playerY) - 2;
    this.playerX += (targetX - this.playerX) * Math.min(1, dt * 8);
    p.x = this.playerX;
    p.y = this.playerY;
    p.setFill(this.bucketFill / this.capacity());
  }

  onBucketFull() {
    SFX.scoop();
    if (this.tutor === 0) this.setTutor(1);
    this.quests.bucketNoBite(); // серия «вёдра без укуса»
    // Редкие находки в ведре.
    const roll = Math.random();
    let acc = 0;
    for (const f of FINDS) {
      acc += f.chance;
      if (roll < acc) {
        if (f.tokensMult) {
          this.ringMult = f.tokensMult;
          // Ключ по id находки, а не жёстко 'find_ring': иначе любая новая
          // находка с множителем показывала бы подпись колечка.
          this.toast(i18n.t('find_' + f.id, { m: f.tokensMult }), THEME.world.tokens);
        } else {
          this.gems += f.gems;
          this.toast(i18n.t('find_' + f.id, { g: f.gems }), THEME.world.gems);
        }
        SFX.gem();
        break;
      }
    }
    // Токсичное ведро: шанс мгновенного слива на месте.
    const b = this.bucket();
    if (b.instantPour && Math.random() < b.instantPour) {
      const real = this.lake.drain(this.bucketFill);
      const gained = Math.floor(real * PLAYER_BASE.tokensPerLiter * this.lake.zone().mult * this.incomeMult());
      this.creditLiters(real);
      this.bucketFill = 0;
      this.flash(this.player.x + 26, this.player.y - 20);
      this.burst(this.player.x + 26, this.player.y - 10, { color: 0x9ccc65, count: 10, rise: 60, spread: 40 });
      if (gained > 0) this.floatText(this.player.x, this.player.y - 100, '+' + gained, THEME.world.tokens);
      SFX.pour();
    }
  }

  creditLiters(liters) {
    if (liters <= 0) return;
    this.litersTotal += liters;
    const bonus = (this.fishBoostActive ? FISH.boostMult : 1) * (this.ringMult || 1);
    this.tokens += liters * PLAYER_BASE.tokensPerLiter * this.lake.zone().mult * this.incomeMult() * bonus;
    // прогресс заданий и дневной цели
    this.quests.pouredLiters(liters);
    if (!this.dailyDone) {
      this.dailyLiters += liters;
      if (this.dailyLiters >= QUESTS.daily.liters) {
        this.dailyDone = true;
        this.streak += 1;
        // Награда растёт с серией до потолка streakMax (см. balance.js).
        const extraDays = Math.min(this.streak, QUESTS.daily.streakMax) - 1;
        const reward = QUESTS.daily.gems + extraDays * QUESTS.daily.streakBonus;
        this.gems += reward;
        this.toast(i18n.t('dailyDone', { n: this.streak }) + ' ' + i18n.t('questReward', { r: reward + ' ◆' }),
          THEME.colors.primary);
        SFX.buy();
        Analytics.event(EVENTS.DAILY_DONE, { streak: this.streak });
        // Ежедневная цель — ключевая точка удержания: пишем в облако сразу, а не копим.
        // Потеря стрика из-за отложенной записи обесценивает всю механику.
        this.saveMeta(true);
      }
    }
  }

  // ------------------------------------------------------------------ акула
  updateShark(dt) {
    const zi = this.lake.zoneIndex();
    const active = this.hazard === 'shark' && zi >= SHARK.fromZone && !this.lake.empty;
    this.shark.setVisible(active);
    if (!active) { this.sharkWarnT = -1; return; }

    const surfY = this.surfaceY();
    const minX = wallLeft(zi) + 46, maxX = wallRight(zi) - 60;
    this.shark.y = surfY + 26;
    if (this.sharkRest > 0) {
      this.sharkRest -= dt; // отдых у дальней стенки: окно для черпания
    } else {
      this.shark.x = Phaser.Math.Clamp(this.shark.x + this.sharkDir * SHARK.speed * dt, minX, maxX);
      if (this.shark.x >= maxX) { this.sharkDir = -1; this.sharkRest = SHARK.restSeconds; }
      else if (this.shark.x <= minX) this.sharkDir = 1;
    }
    const scooping = this.state === 'scoop';
    const dx = Math.abs(this.shark.x - this.playerX);
    const closeY = Math.abs(this.shark.y - this.playerY) < 90;

    if (this.sharkWarnT >= 0) {
      // АТАКА: патруль на паузе, акула подкрадывается к игроку. Предупреждение
      // держится, пока игрок черпает (гистерезис по дистанции), поэтому укус
      // реально случается — уйти можно, только прекратив черпать.
      const keep = scooping && closeY && dx < SHARK.knockRadius * 1.7;
      if (!keep) {
        this.sharkWarnT = -1;
        this.shark.warn.setVisible(false);
        this.shark.setBiting(false);
        // Уворот с водой в ведре — засчитывается в «Не сегодня!».
        if (this.bucketFill > 0.5) {
          this.dodgeCount++;
          if (this.dodgeCount >= 5) this.grantBadge('dodger');
        }
      } else {
        this.shark.x += Math.sign(this.playerX - this.shark.x) * 34 * dt;
        this.shark.setDir(this.playerX >= this.shark.x ? 1 : -1);
        this.sharkWarnT -= dt;
        if (this.sharkWarnT <= 0) {
          // Укус: ведро выбито, вода потеряна.
          this.bucketFill = 0;
          this.state = 'stunned';
          this.stunRemain = 1.2;
          this.shark.warn.setVisible(false);
          this.shark.setBiting(false);
          this.sharkWarnT = -1;
          this.sharkDir = 1; // после укуса уплывает к дальней стенке
          this.toast(i18n.t('sharkHit'), THEME.colors.danger);
          SFX.shark();
          this.cameras.main.shake(160, 0.006);
          this.burst(this.playerX + 20, this.playerY, { count: 14, rise: 90, spread: 60 });
          this.quests.streakReset();
          this.grantBadge('shark_bait');
        }
      }
    } else {
      this.shark.setDir(this.sharkDir);
      // Начало атаки: игрок черпает, акула подошла на радиус укуса.
      if (scooping && closeY && dx < SHARK.knockRadius) {
        this.sharkWarnT = SHARK.warnSeconds;
        this.shark.warn.setVisible(true);
        this.shark.setBiting(true); // пасть открыта — понятно, что сейчас укусит
        if (!this.sharkHintShown) {
          this.sharkHintShown = true;
          this.toast(i18n.t('sharkWarnHint'), THEME.colors.danger);
        }
      }
    }
  }

  // ------------------------------------------------------- болотный газ
  // Опасность болота: пузырь телеграфится у точки черпания, лопается —
  // черпающий рядом теряет половину ведра. Мягче акулы, но чаще.
  updateGas(dt) {
    if (this.hazard !== 'gas' || this.lake.empty || this.lake.zoneIndex() < GAS.fromZone) return;
    const surfY = this.surfaceY();
    if (!this.gasBubble) {
      this.gasT = (this.gasT ?? GAS.minDelay) - dt;
      if (this.gasT > 0) return;
      // Пузырь рождается возле точки черпания (там, где стоит игрок).
      const x = Phaser.Math.Clamp(this.playerX + 30 + Math.random() * 90,
        wallLeftAtY(surfY) + 30, wallRightAtY(surfY) - 30);
      const g = this.add.graphics().setDepth(4.7);
      this.gasBubble = { x, g, t: GAS.warnSeconds };
      if (!this.gasHintShown) {
        this.gasHintShown = true;
        this.toast(i18n.t('gasWarnHint'), THEME.colors.danger);
      }
      return;
    }
    const b = this.gasBubble;
    b.t -= dt;
    // Телеграф: мелкие пузырьки поднимаются, главный растёт.
    b.g.clear();
    const grow = 1 - Math.max(0, b.t / GAS.warnSeconds);
    b.g.fillStyle(0xaed581, 0.5);
    b.g.fillCircle(b.x, surfY + 10, 6 + grow * 22);
    for (let k = 0; k < 3; k++) {
      const ph = (this.time.now / 300 + k * 1.1) % 2;
      b.g.fillCircle(b.x - 14 + k * 14, surfY + 26 - ph * 18, 3 + k);
    }
    if (b.t <= 0) {
      // Лопнул.
      this.burst(b.x, surfY + 6, { color: 0xaed581, count: 14, rise: 80, spread: 50 });
      SFX.pour();
      if (this.state === 'scoop' && Math.abs(this.playerX - b.x) < GAS.radius && this.bucketFill > 0) {
        this.bucketFill *= (1 - GAS.lossPart);
        this.toast(i18n.t('gasHit'), THEME.colors.danger);
        this.cameras.main.shake(120, 0.004);
        SFX.shark();
        this.quests.streakReset();
      }
      b.g.destroy();
      this.gasBubble = null;
      this.gasT = GAS.minDelay + Math.random() * (GAS.maxDelay - GAS.minDelay);
    }
  }

  // ------------------------------------------------------------ золотая рыбка
  updateFish(dt) {
    if (this.lake.empty) return;
    if (!this.fish) {
      this.fishT -= dt;
      if (this.fishT > 0) return;
      // Появление: плывёт по поверхности справа налево.
      const surfY = this.surfaceY();
      const g = this.add.graphics().setDepth(4.6);
      g.fillStyle(0xffd54f, 1);
      g.fillEllipse(0, 0, 44, 18);
      g.fillTriangle(-20, 0, -34, -10, -34, 10);
      g.fillStyle(0xffecb3, 1).fillCircle(12, -2, 3);
      const glow = this.add.circle(0, 0, 30, 0xffd54f, 0.25).setDepth(4.55);
      this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.1, duration: 500, yoyo: true, repeat: -1 });
      this.fish = { g, glow, x: wallRightAtY(surfY) - 20, dir: -1, passesLeft: FISH.passes, pause: 0 };
      return;
    }
    const surfY = this.surfaceY();

    // Заминка на развороте: рыбка «раздумывает» у стенки. Даёт игроку лишний
    // момент прицелиться и читается как поведение, а не как рывок туда-сюда.
    if (this.fish.pause > 0) {
      this.fish.pause -= dt;
    } else {
      this.fish.x += this.fish.dir * FISH.speed * dt;
      const left = wallLeftAtY(surfY) + 20, right = wallRightAtY(surfY) - 20;
      if (this.fish.x <= left || this.fish.x >= right) {
        this.fish.x = Math.min(right, Math.max(left, this.fish.x));
        this.fish.passesLeft -= 1;
        if (this.fish.passesLeft <= 0) { this.despawnFish(); return; }
        this.fish.dir *= -1;           // разворот
        this.fish.pause = FISH.turnPause;
      }
    }

    this.fish.g.x = this.fish.x;
    this.fish.g.y = surfY + 16 + Math.sin(this.fish.x * 0.05) * 4;
    this.fish.g.scaleX = this.fish.dir;
    this.fish.glow.x = this.fish.x;
    this.fish.glow.y = this.fish.g.y;
  }

  // ---------------------------------------------------------- плавающий сундук
  // Приплывает справа, качается на воде, уплывает обратно. Привязан ко ВРЕМЕНИ,
  // а не к глубине — тем и закрывает провал в поздних зонах (см. FLOAT_CHEST).
  updateFloatChest(dt) {
    if (this.lake.empty) return;
    const zi = this.lake.zoneIndex();

    if (!this.floatChest) {
      if (zi < FLOAT_CHEST.fromZone) return; // в ранних зонах не нужен
      this.floatChestT -= dt;
      if (this.floatChestT > 0) return;
      const surfY = this.surfaceY();
      const c = createChest(this, wallRightAtY(surfY) + 40, surfY + 6);
      c.setDepth(4.5);
      c.setExposed(true);                    // подсветка: его видно и понятно, что можно взять
      this.floatChest = {
        c, phase: 'in', t: 0,
        targetX: wallRightAtY(surfY) - 90,   // куда доплывает и останавливается
        bobT: 0
      };
      return;
    }

    const fc = this.floatChest;
    const surfY = this.surfaceY();
    fc.bobT += dt;

    if (fc.phase === 'in') {
      fc.c.x -= FLOAT_CHEST.driftSpeed * dt;
      if (fc.c.x <= fc.targetX) { fc.c.x = fc.targetX; fc.phase = 'stay'; fc.t = 0; }
    } else if (fc.phase === 'stay') {
      fc.t += dt;
      if (fc.t >= FLOAT_CHEST.staySeconds) fc.phase = 'out';
    } else {
      fc.c.x += FLOAT_CHEST.driftSpeed * dt;
      if (fc.c.x > wallRightAtY(surfY) + 60) { this.despawnFloatChest(); return; }
    }

    // Покачивание на воде: вверх-вниз и лёгкий крен.
    fc.c.y = surfY + 6 + Math.sin(fc.bobT * 2.2) * 5;
    fc.c.rotation = Math.sin(fc.bobT * 1.7) * 0.08;
  }

  despawnFloatChest() {
    if (!this.floatChest) return;
    this.floatChest.c.destroy();
    this.floatChest = null;
    this.floatChestT = FLOAT_CHEST.minDelay
      + Math.random() * (FLOAT_CHEST.maxDelay - FLOAT_CHEST.minDelay);
  }

  collectFloatChest() {
    const zi = this.lake.zoneIndex();
    const gems = FLOAT_CHEST.gemsBase + FLOAT_CHEST.gemsPerZone * zi;
    const { c } = this.floatChest;
    this.flash(c.x, c.y);
    this.burst(c.x, c.y, { color: THEME.world.gems, count: 14, rise: 70, spread: 46, size: 4 });
    this.despawnFloatChest();
    this.gems += gems;
    this.quests.chestCollected(); // засчитывается заданию «собери сокровище»
    this.toast(i18n.t('floatChest', { g: gems }), THEME.world.gems);
    SFX.gem();
    Analytics.event(EVENTS.FLOAT_CHEST, { zone: zi + 1 });
    this.saveMeta(false);
  }

  despawnFish() {
    if (!this.fish) return;
    this.fish.g.destroy();
    this.fish.glow.destroy();
    this.fish = null;
    this.fishT = FISH.minDelay + Math.random() * (FISH.maxDelay - FISH.minDelay);
  }

  catchFish() {
    this.flash(this.fish.x, this.fish.g.y);
    this.burst(this.fish.x, this.fish.g.y, { color: 0xffd54f, count: 12, rise: 70, spread: 40, size: 4 });
    this.despawnFish();
    this.fishBoostActive = true;
    this.toast(i18n.t('fishBoost', { m: FISH.boostMult }), THEME.world.tokens);
    SFX.gem();
    this.grantBadge('fisher');
  }

  // ---------------------------------------------------------------- бейджи
  grantBadge(id) {
    if (this.badges.includes(id)) return;
    const def = BADGES.find(b => b.id === id);
    if (!def) return;
    this.badges.push(id);
    this.gems += def.gems;
    this.toast(i18n.t('badgeEarned', { name: i18n.t('badge_' + id) }) + ' +' + def.gems + ' ◆', THEME.world.gems);
    SFX.buy();
    Analytics.event(EVENTS.BADGE_EARNED, { id });
    this.saveMeta(false); // бейдж: мелкая мета, копим
  }

  // Дешёвые условия, проверяются раз в кадр.
  checkBadges() {
    if (this.litersTotal > 0) this.grantBadge('first_bucket');
    if (this.maxZone >= 2) this.grantBadge('caves');
    if (this.maxZone >= 4) this.grantBadge('lava');
    if (this.maxZone >= 6) this.grantBadge('abyss');
    if (this.tokens >= 10000) this.grantBadge('rich');
    if (this.collectedChests.length >= CHESTS.length) this.grantBadge('collector');
    if (this.ownedBuckets.length >= BUCKETS.length) this.grantBadge('all_buckets');
    if (this.prestigeN >= 1) this.grantBadge('prestige');
  }

  // --------------------------------------------------------------- сундуки
  updateChests() {
    const surfY = this.surfaceY();
    const magnet = this.bucket().magnet;
    for (const c of this.chestSprites) {
      if (!c.visible) continue;
      // экспонирован = вода ушла ниже сундука
      const exposed = surfY > c.y + 6;
      c.setExposed(exposed);
      if (exposed && magnet && Phaser.Math.Distance.Between(this.playerX, this.playerY, c.x, c.y) < 170) {
        this.collectChest(c);
      }
    }
  }

  collectChest(c) {
    const ch = CHESTS[c.chestIndex];
    this.quests.chestCollected();
    const bonus = this.bucket().chestBonusGems || 0;
    this.gems += ch.gems + bonus;
    this.collectedChests.push(c.chestIndex);
    c.setVisible(false);
    this.burst(c.x, c.y, { color: THEME.world.gems, count: 10, rise: 80, spread: 40, size: 4 });
    this.floatText(c.x, c.y - 30, '+' + (ch.gems + bonus), THEME.world.gems);
    this.coinFly(c.x, c.y, Math.min(4, ch.gems), 'gem');
    SFX.gem();
    this.saveMeta(false); // сундук: мелкая мета, копим
  }

  // ------------------------------------------------------------------- зоны
  checkZone() {
    const zi = this.lake.zoneIndex();
    while (zi > this.maxZone) {
      this.maxZone++;
      const z = this.zones[this.maxZone];
      this.gems += ECONOMY.zoneEnterGems;
      this.showZoneBanner(this.maxZone);
      this.toast(i18n.t('zoneGems', { g: ECONOMY.zoneEnterGems }), THEME.world.gems);
      this.cameras.main.flash(280, 180, 220, 255);
      SFX.zone();
      Analytics.event(EVENTS.ZONE_REACHED, { zone: this.maxZone + 1 });
      this.saveMeta(true); // новая зона — ключевая точка
      // (Полноэкранную рекламу НЕ вешаем на переход зоны: он случается посреди тапа,
      //  игрок не ждёт → случайные клики = фрод. Реклама идёт по таймеру, см. maybeShowAd.)
      // Исключение — VK: там показ по таймеру запрещён правилами (п.5.1.5.1), и переход
      // зоны остаётся единственным законным моментом внутри партии. Плашка зоны уже
      // накрыла экран и игрок смотрит на неё — тапа под рекламу нет.
      if (Platform.isVk) this.time.delayedCall(900, () => this.showTransitionAd());
    }
  }

  checkVictory() {
    if (this.victoryShown || !this.lake.empty) return;
    this.victoryShown = true;
    const minutes = Math.round((Date.now() - this.lakeStart) / 60000);
    Analytics.event(EVENTS.PHONE_FOUND, { minutes });
    this.sendLeaderboard();
    this.grantBadge('phone');
    this.saveMeta(true); // победа — ключевая точка
    SFX.victory();
    this.victoryOverlay.open();
  }

  // Престиж с выбором озера: то же самое или другое (болото <-> озеро).
  prestige(targetLakeId) {
    if (targetLakeId && LAKES[targetLakeId]) this.lakeId = targetLakeId;
    this.prestigeN++;
    Analytics.event(EVENTS.PRESTIGE, { n: this.prestigeN, lake: this.lakeId });
    this.tokens = 0;
    this.tree.reset();
    this.lake.drained = 0;
    this.collectedChests = [];
    this.lakeStart = Date.now();
    this.tutor = 3;
    this.victoryShown = false;
    this.saveMeta(true); // престиж — ключевая точка
    this.scene.restart();
  }

  // -------------------------------------------------------------------- HUD
  buildHud() {
    const { width, height } = this.scale;

    const hudBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    hudBg.fillStyle(0x000000, 0.25);
    hudBg.fillRoundedRect(17, 18, 250, 132, 14); // мягкая тень
    hudBg.fillStyle(THEME.colors.panelDark, 0.85);
    hudBg.fillRoundedRect(14, 14, 250, 132, 14);
    // Иконки валют кодом: монета и гем.
    hudBg.fillStyle(THEME.world.tokens, 1).fillCircle(44, 42, 12);
    hudBg.fillStyle(0xffe082, 1).fillCircle(44, 42, 7);
    hudBg.fillStyle(THEME.world.gems, 1);
    hudBg.fillTriangle(44, 70, 56, 82, 44, 94);
    hudBg.fillTriangle(44, 70, 32, 82, 44, 94);
    hudBg.fillStyle(0xb2ebf2, 0.8).fillTriangle(44, 74, 50, 82, 44, 90);

    const mk = (y, color) => this.add.text(64, y, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color, fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(101);
    this.tokensText = mk(26, '#ffd54f');
    this.gemsText = mk(66, '#4dd0e1');
    this.depthText = this.add.text(34, 106, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text, fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(101);
    // Надпись зоны центрируется НЕ по экрану, а по свободному полю между панелью HUD
    // (заканчивается на x=264) и кнопкой «В меню» (начинается примерно на width-128).
    // По центру экрана она левым краем уходила под панель на ~64 px — при 720 в ширину
    // это заметно во всех вьюпортах, потому что координата фиксированная.
    const zoneLeft = 264, zoneRight = width - 128;
    // ПОДЛОЖКА под надписью зоны. Без неё белый текст лежит прямо на светлом небе —
    // контраст около 1.6:1, надпись «плавает» и не читается (отказ VK 02.08:
    // «цветовое решение не позволяет быстро читать текст»). Подложка того же вида, что
    // у панели валют, поэтому вид игры не меняется — меняется только читаемость.
    this.zonePlate = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.zoneText = this.add.text((zoneLeft + zoneRight) / 2, 30, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
      fontStyle: 'bold', align: 'center', wordWrap: { width: zoneRight - zoneLeft }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    this.menuBtn = createButton(this, width - 90, 50, i18n.t('toMenu'), () => this.exitToMenu(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });
    this.menuBtn.setScrollFactor(0).setDepth(101);

    // Нижняя панель действий.
    this.skillsBtn = createButton(this, 140, height - 56, i18n.t('skillsTitle'), () => {
      this.skillOverlay.open();
    }, { fontSize: THEME.fontSize.small });
    this.shopBtn = createButton(this, 370, height - 56, i18n.t('shopTitle'), () => {
      this.shopOverlay.open();
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.boostBtn = createButton(this, 590, height - 56, i18n.t('boostBtn'), () => this.watchBoostAd(),
      { color: THEME.colors.accent, fontSize: THEME.fontSize.tiny });
    for (const b of [this.skillsBtn, this.shopBtn, this.boostBtn]) b.setScrollFactor(0).setDepth(101);
    this.layoutBottomBar();

    this.tpBtn = createButton(this, width - 110, height - 150, i18n.t('teleportBtn'), () => this.teleport(),
      { color: THEME.colors.accent, fontSize: THEME.fontSize.tiny });
    this.tpBtn.setScrollFactor(0).setDepth(101);
    this.tpBtn.setVisible(false);

    this.toastY = 190;
    this.activeToasts = 0;

    // Плашка заданий: текущее задание + дневная цель. Тоже на подложке — строки лежат
    // поверх неба, а тонкая обводка жёлтого по светло-голубому читаемость не вытягивает.
    this.questPlate = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.questText = this.add.text(20, 158, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: '#ffe082',
      fontStyle: 'bold', lineSpacing: 6
    }).setScrollFactor(0).setDepth(101);

    // HUD целиком — чтобы разом гасить его на время оверлея. Затемнение оверлея
    // полупрозрачное, и HUD просвечивал сквозь него, налезая на заголовок и вкладки
    // магазина: два текста в одной точке — это и есть «текст не читается» (отказ VK).
    this.hudItems = [
      hudBg, this.tokensText, this.gemsText, this.depthText,
      this.zonePlate, this.zoneText, this.menuBtn,
      this.skillsBtn, this.shopBtn, this.boostBtn, this.tpBtn,
      this.questPlate, this.questText,
    ];
  }

  // РАСКЛАДКА НИЖНЕЙ ПАНЕЛИ по фактической ширине кнопок. Раньше центры были прибиты
  // числами (140 / 370 / 590), и самая длинная кнопка — «×2 на 3 мин (реклама)» —
  // вылезала за правый край: обрезанная надпись это и есть «текст не читается».
  // Надпись кнопки меняется на ходу (идёт отсчёт буста), поэтому раскладка пересчитывается
  // при каждой смене текста, а не один раз при сборке.
  layoutBottomBar() {
    const btns = [this.skillsBtn, this.shopBtn, this.boostBtn].filter(Boolean);
    if (!btns.length) return;
    const { width } = this.scale;
    const margin = 18;
    const gap = 14;
    for (const b of btns) b.setScale(1);
    let total = btns.reduce((s, b) => s + b.width, 0) + gap * (btns.length - 1);
    const avail = width - margin * 2;
    // Не влезает даже впритык — ужимаем всю панель разом, пропорции кнопок сохраняются.
    const k = total > avail ? avail / total : 1;
    if (k < 1) { for (const b of btns) b.setScale(k); total = avail; }
    let x = (width - total) / 2;
    for (const b of btns) {
      const w = b.width * (k < 1 ? k : 1);
      b.x = Math.round(x + w / 2);
      x += w + gap * (k < 1 ? k : 1);
    }
  }

  // Тёмная скруглённая подложка под текст поверх мира. Рисуется по ФАКТИЧЕСКИМ размерам
  // надписи (текст меняется каждый кадр: глубина, счётчики заданий), поэтому пересчёт
  // живёт в refreshHud, а не в buildHud.
  drawTextPlate(plate, text, padX = 14, padY = 8) {
    plate.clear();
    if (!text.text || !text.visible) return;
    const w = text.width + padX * 2;
    const h = text.height + padY * 2;
    const x = text.x - text.width * text.originX - padX;
    const y = text.y - text.height * text.originY - padY;
    plate.fillStyle(0x000000, 0.22);
    plate.fillRoundedRect(x + 3, y + 3, w, h, 12);
    plate.fillStyle(THEME.colors.panelDark, 0.85);
    plate.fillRoundedRect(x, y, w, h, 12);
  }

  questLabel() {
    const lines = [];
    const q = this.quests.quest;
    if (q) {
      if (q.type === 'pour') {
        lines.push('▸ ' + i18n.t('questPour', { x: q.target, t: Math.ceil(q.timeLeft) })
          + ' · ' + Math.floor(q.progress) + '/' + q.target);
      } else if (q.type === 'buckets') {
        lines.push('▸ ' + i18n.t('questBuckets', { x: q.target }) + ' · ' + q.progress + '/' + q.target);
      } else {
        lines.push('▸ ' + i18n.t('questChest'));
      }
    }
    if (!this.dailyDone) {
      // Показываем и НАГРАДУ, и серию: невидимый стрик не работает на возвращаемость.
      // Игрок должен видеть, что завтрашний заход стоит дороже сегодняшнего.
      const next = Math.min(this.streak + 1, QUESTS.daily.streakMax);
      const reward = QUESTS.daily.gems + (next - 1) * QUESTS.daily.streakBonus;
      let line = '▸ ' + i18n.t('questDaily', { x: QUESTS.daily.liters })
        + ' · ' + Math.floor(this.dailyLiters) + '/' + QUESTS.daily.liters
        + ' · +' + reward + ' ◆';
      if (this.streak > 0) line += '  ' + i18n.t('streakDays', { n: this.streak });
      lines.push(line);
    } else if (this.streak > 0) {
      lines.push('▸ ' + i18n.t('streakKeep', { n: this.streak }));
    }
    return lines.join('\n');
  }

  refreshHud() {
    // Открыт оверлей — HUD прячем целиком (см. hudItems). Дальше считать нечего:
    // ни одна надпись всё равно не видна, а лишняя работа идёт каждый кадр.
    const overlay = this.overlayOpen();
    if (this.hudItems) {
      for (const o of this.hudItems) if (o) o.setVisible(!overlay);
    }
    if (overlay) return;

    this.tokensText.setText(String(Math.floor(this.tokens)));
    this.gemsText.setText(String(Math.floor(this.gems)));
    this.depthText.setText(i18n.t('depth', { m: this.lake.depth().toFixed(1) }));
    const zi = this.lake.zoneIndex();
    this.zoneText.setText(i18n.t('zoneLabel', {
      n: zi + 1, name: i18n.t('zone_' + this.zones[zi].id), mult: this.zones[zi].mult
    }));

    const boostLabel = this.boostRemain > 0
      ? i18n.t('boostActive', { s: Math.ceil(this.boostRemain) })
      : i18n.t('boostBtn');
    if (boostLabel !== this._boostLabel) {
      this._boostLabel = boostLabel;
      this.boostBtn.setLabel(boostLabel);
      this.layoutBottomBar(); // надпись сменила ширину — панель переразложить
    }

    this.questText.setText(this.questLabel());
    // Подложки — после установки текстов: их размер зависит от того, что реально написано.
    this.drawTextPlate(this.zonePlate, this.zoneText, 16, 7);
    this.drawTextPlate(this.questPlate, this.questText, 12, 7);

    const tpLvl = this.tree.level('teleport');
    const showTp = tpLvl > 0;
    if (this.tpBtn.visible !== showTp) {
      this.tpBtn.setVisible(showTp);
      if (this.tpBtn.input) this.tpBtn.input.enabled = showTp;
    }
    if (showTp) {
      this.tpBtn.setLabel(this.tpRemain > 0
        ? i18n.t('teleportBtn') + ' ' + Math.ceil(this.tpRemain)
        : i18n.t('teleportBtn'));
    }

    // Подсветка активного слива.
    const dz = activeDrainZone(this.lake.zoneIndex());
    for (const [z, spr] of Object.entries(this.drains)) {
      spr.setActive2(Number(z) === dz && this.bucketFill > 0);
    }
  }

  // Полноэкранная реклама ПО ТАЙМЕРУ с обратным отсчётом. Копим только активное игровое
  // время (не в меню/оверлее/на победе). Отсчёт даёт логическую паузу — игрок ждёт рекламу,
  // а не ловит её посреди тапа (иначе случайные клики = фрод, YANDEX-SDK.md).
  maybeShowAd(dt) {
    if (this.adPending || this.overlayOpen() || this.victoryShown || this.state === 'stunned') return;
    this.adTimer += dt;
    if (this.adTimer < ECONOMY.adInterval) return;
    // VK, п.5.1.5.1: полноэкранная реклама показывается ТОЛЬКО на переходах между
    // экранами/локациями, не чаще 1 раза в 30 с. Показ по таймеру поверх геймплея —
    // прямое нарушение, даже с обратным отсчётом (на Яндексе он, наоборот, официально
    // рекомендован для длинных «уровней»). Поэтому на VK таймер только ВЗВОДИТ показ,
    // а выпускает его ближайший настоящий переход: новая зона или выход в меню.
    if (Platform.isVk) { this.adReady = true; return; }
    // Таймер только ВЗВЁЛ показ. Отсчёт запускаем в ближайшей логической паузе — когда игрок
    // стоит между циклами черпания (state==='idle'), а не посреди бега/черпания/выливания.
    // Страховка: если паузы всё нет — через adArmedGrace показываем всё равно, отсчёт сам её создаёт.
    // (C6М: «таймер взводит — логическая пауза показывает»; голый таймер посреди действия — антипример Яндекса.)
    this.adArmed += dt;
    if (this.state === 'idle' || this.adArmed >= ECONOMY.adArmedGrace) this.beginAdCountdown();
  }

  beginAdCountdown() {
    if (this.adPending) return;
    this.adPending = true;
    this.adTimer = 0;
    this.adArmed = 0;
    const label = this.add.text(this.scale.width / 2, this.scale.height * 0.38, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: '#ffffff',
      fontStyle: 'bold', stroke: '#0a2030', strokeThickness: 8, align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    let n = 3;
    const tick = () => {
      if (!this.started) { label.destroy(); this.adPending = false; return; }
      if (n > 0) {
        label.setText(i18n.t('adCountdown', { n }));
        n--;
        this.time.delayedCall(1000, tick);
      } else {
        label.destroy();
        this.lastAdAt = Date.now();
        Platform.ads.showFullscreen({ onClose: () => { this.adPending = false; } });
      }
    };
    tick();
  }

  // Показ на ПЕРЕХОДЕ — путь VK (см. maybeShowAd). Условия все сразу: таймер уже взвёл
  // показ, обучение пройдено, с прошлой рекламы прошло не меньше vkAdMinGapMs и сейчас
  // не крутится другая. Ни одного показа «просто так на переходе» — иначе частая смена
  // зон в начале игры превратилась бы в спам, а это тот же п.5.1.5.1.
  showTransitionAd() {
    if (!this.adReady || this.adPending || this.tutor < 3) return;
    const now = Date.now();
    if (now - (this.lastAdAt || 0) < ECONOMY.vkAdMinGapMs) return;
    this.adReady = false;
    this.adTimer = 0;
    this.adArmed = 0;
    this.adPending = true;
    this.lastAdAt = now;
    Platform.ads.showFullscreen({ onClose: () => { this.adPending = false; } });
  }

  watchBoostAd() {
    if (this.boostRemain > 0) return;
    Platform.ads.showRewarded({
      onRewarded: () => {
        this.boostRemain = ECONOMY.boostSeconds;
        Analytics.event(EVENTS.REWARD_AD_SHOWN, { place: 'boost' });
        SFX.buy();
      }
    });
  }

  // Плашка новой зоны: имя и множитель, в цвете зоны, на полтора такта.
  showZoneBanner(zi) {
    const z = this.zones[zi];
    const { width } = this.scale;
    const c = this.add.container(width / 2, 430).setScrollFactor(0).setDepth(255).setAlpha(0);
    c.add(this.add.rectangle(0, 0, width, 170, THEME.colors.panelDark, 0.94));
    c.add(this.add.rectangle(0, -84, width, 6, THEME.world.zones[z.id].deco));
    c.add(this.add.rectangle(0, 84, width, 6, THEME.world.zones[z.id].deco));
    c.add(this.add.text(0, -30, i18n.t('zoneBanner1', { n: zi + 1, name: i18n.t('zone_' + z.id) }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5));
    c.add(this.add.text(0, 32, i18n.t('zoneBanner2', { mult: z.mult }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: '#ffd54f'
    }).setOrigin(0.5));
    c.setScale(0.9);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c, alpha: 0, delay: 1900, duration: 420,
      onComplete: () => c.destroy(true)
    });
  }

  toast(text, colorNum) {
    const t = this.add.text(this.scale.width / 2, this.toastY + this.activeToasts * 46, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, fontStyle: 'bold',
      color: '#' + (colorNum ?? 0xffffff).toString(16).padStart(6, '0'),
      stroke: '#0e1621', strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(250);
    this.activeToasts++;
    this.tweens.add({
      targets: t, y: t.y - 40, alpha: 0, delay: 1300, duration: 600,
      onComplete: () => { t.destroy(); this.activeToasts = Math.max(0, this.activeToasts - 1); }
    });
  }

  flash(x, y) {
    const c = this.add.circle(x, y, 26, 0xffffff, 0.85).setDepth(7);
    this.tweens.add({ targets: c, scale: 2.2, alpha: 0, duration: 320, onComplete: () => c.destroy() });
  }

  // ----------------------------------------------------------- спецэффекты
  // Разлёт кружков (брызги, муть, искры). Твины вместо particle-API —
  // не зависит от версии Phaser и дёшево при наших количествах.
  burst(x, y, { color = THEME.world.waterLine, count = 10, up = true, size = 5,
                spread = 60, rise = 70, gravity = true, alpha = 0.9, life = 550 } = {}) {
    for (let i = 0; i < count; i++) {
      const c = this.add.circle(x, y, size * (0.6 + Math.random() * 0.8), color, alpha).setDepth(6.5);
      const dx = (Math.random() - 0.5) * spread * 2;
      const dy = up ? -(rise * (0.4 + Math.random())) : (Math.random() - 0.5) * rise;
      this.tweens.add({
        targets: c, x: x + dx, y: y + dy + (gravity ? rise * 1.3 : 0),
        alpha: 0, scale: 0.3, duration: life * (0.7 + Math.random() * 0.6),
        ease: 'Quad.easeOut', onComplete: () => c.destroy()
      });
    }
  }

  // Струйка воды из ведра в слив (во время выливания, зовётся с троттлингом).
  pourDrop(x, y) {
    const c = this.add.circle(x, y, 4, THEME.world.waterTint, 0.95).setDepth(6.4);
    this.tweens.add({
      targets: c, y: y + 34, x: x - 14, alpha: 0.2, duration: 200,
      ease: 'Quad.easeIn', onComplete: () => c.destroy()
    });
  }

  // Монетки летят из точки мира к счётчику жетонов в HUD (экранные координаты).
  coinFly(worldX, worldY, n, texKind = 'coin') {
    const cam = this.cameras.main;
    const sx = worldX - cam.scrollX, sy = worldY - cam.scrollY;
    const targetX = 44, targetY = texKind === 'coin' ? 42 : 82;
    const color = texKind === 'coin' ? THEME.world.tokens : THEME.world.gems;
    for (let i = 0; i < n; i++) {
      const c = this.add.circle(sx, sy, 8, color, 1)
        .setScrollFactor(0).setDepth(240).setStrokeStyle(2, 0x0e1621, 0.6);
      const midX = sx + (Math.random() - 0.5) * 120;
      const midY = sy - 60 - Math.random() * 60;
      // Две ступени обычными твинами (tweens.chain есть не во всех версиях Phaser).
      this.tweens.add({
        targets: c, x: midX, y: midY, duration: 180 + i * 30, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({
          targets: c, x: targetX, y: targetY, scale: 0.6, duration: 320,
          ease: 'Quad.easeIn', onComplete: () => c.destroy()
        })
      });
    }
  }

  // Всплывающий «+N» в мире.
  floatText(x, y, text, colorNum) {
    const t = this.add.text(x, y, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, fontStyle: 'bold',
      color: '#' + (colorNum ?? 0xffffff).toString(16).padStart(6, '0'),
      stroke: '#0e1621', strokeThickness: 5
    }).setOrigin(0.5).setDepth(7);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  // -------------------------------------------------------------- туториал
  buildTutorial() {
    this.tutorText = this.add.text(0, 0, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#ffffff', fontStyle: 'bold',
      stroke: '#0e1621', strokeThickness: 5, align: 'center'
    }).setOrigin(0.5).setDepth(120);
    this.tweens.add({ targets: this.tutorText, scale: 1.08, duration: 450, yoyo: true, repeat: -1 });
  }

  setTutor(step) {
    this.tutor = step;
    this.saveMeta(false); // туториал: мелкая мета, копим
  }

  updateTutorial() {
    const t = this.tutorText;
    if (this.tutor >= 3 || this.overlayOpen()) { t.setVisible(false); return; }
    t.setVisible(true);
    if (this.tutor === 0) {
      t.setScrollFactor(1);
      const surfY = this.surfaceY();
      t.setPosition(BASE_W / 2, surfY - 70);
      t.setText(i18n.t('tutorScoop'));
    } else if (this.tutor === 1) {
      t.setScrollFactor(1);
      const dp = drainPos(activeDrainZone(this.lake.zoneIndex()));
      t.setPosition(BASE_W / 2, dp.y - 130);
      t.setText(i18n.t('tutorPour'));
    } else if (this.tutor === 2) {
      t.setScrollFactor(0);
      t.setPosition(BASE_W / 2, this.scale.height - 140);
      t.setText(i18n.t('tutorSkills'));
    }
  }

  // ------------------------------------------------------------------ сейв
  buildSave() {
    return {
      tokens: Math.round(this.tokens * 100) / 100,
      gems: this.gems,
      drained: Math.round(this.lake.drained * 10) / 10,
      litersTotal: Math.round(this.litersTotal * 10) / 10,
      nodes: this.tree.toSave(),
      buckets: this.ownedBuckets,
      bucketId: this.bucketId,
      chests: this.collectedChests,
      prestigeN: this.prestigeN,
      tutor: this.tutor,
      lakeStart: this.lakeStart,
      badges: this.badges,
      dodgeCount: this.dodgeCount,
      dailyDate: this.dailyDate,
      dailyLiters: Math.round(this.dailyLiters),
      dailyDone: this.dailyDone,
      streak: this.streak,
      lakeId: this.lakeId,
      hats: this.ownedHats,
      hatId: this.hatId,
      ts: Date.now() // для офлайн-насоса
    };
  }

  // ЛОКАЛЬНЫЙ чекпойнт: часто и дёшево, облако не трогает. Восстанавливает
  // партию после закрытия вкладки (pickNewest при загрузке).
  checkpoint() {
    Checkpoint.write(this.buildSave());
  }

  // ОБЛАЧНАЯ запись меты (подготовка к тарификации GamePush: облако — только
  // ключевые точки). force=true — покупка/зона/победа/престиж/выход.
  // Мелкая мета (сундук/бейдж/квест/туториал) копится флагом metaDirty и
  // уезжает одной записью на ближайшей точке или по троттлингу раз в 5 мин
  // (страховка кросс-девайса; на этом устройстве всё уже в чекпойнте).
  saveMeta(force = false) {
    const now = Date.now();
    if (!force) {
      this.metaDirty = true;
      if (now - (this.lastMetaSaveAt || 0) < 300000) {
        this.checkpoint();
        return Promise.resolve();
      }
    }
    this.metaDirty = false;
    this.lastMetaSaveAt = now;
    this.lastCloudLiters = this.litersTotal; // отметка для visHandler: облако догнало прогресс
    this.checkpoint();
    this.cloudWrites = (this.cloudWrites || 0) + 1; // замер для отчёта/отладки
    return Platform.save.save(this.buildSave());
  }

  // Лидерборд: слать только когда счёт реально вырос с последней отправки —
  // выход в меню без прогресса не должен стоить запроса.
  sendLeaderboard() {
    const score = Math.floor(this.litersTotal);
    if (score <= (this.lbSent || 0)) return Promise.resolve();
    this.lbSent = score;
    return Platform.leaderboard.setScore('liters', score);
  }

  async exitToMenu() {
    Platform.gameplayStop();
    Analytics.event(EVENTS.SESSION_END, { liters: Math.floor(this.litersTotal), zone: this.maxZone + 1 });
    await this.saveMeta(true); // выход — ключевая точка
    await this.sendLeaderboard();
    // Выход в меню — законный переход и на Яндексе, и на VK. Но на VK его надо развести
    // с предыдущим показом: п.5.1.5.1 запрещает interstitial чаще 1 раза в 30 с и подряд,
    // а игрок мог только что увидеть рекламу на переходе зоны.
    if (Platform.isVk && Date.now() - (this.lastAdAt || 0) < ECONOMY.vkAdMinGapMs) {
      this.scene.start('Menu');
      return;
    }
    this.lastAdAt = Date.now();
    Platform.ads.showFullscreen({ onClose: () => this.scene.start('Menu') });
  }
}
