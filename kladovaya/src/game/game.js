// ЛОГИКА ПАРТИИ. Состояние игры, подвес и броски, разбор очереди слияний,
// очки и шкала, банка и закатка, конец партии и спасение за рекламу.
// Физика — в physics.js, отрисовка — в render.js, мета-коллекция — в pantry.js.
import { CONFIG } from '../data/config.js';
import { Physics } from './physics.js';
import { Pantry } from './pantry.js';
import { Audio } from '../core/audio.js';
import { Analytics } from '../core/analytics.js';
import { Platform } from '../platform/index.js';
import { i18n } from '../i18n/strings.js';
import { LAYOUT } from '../ui/layout.js';
import { COLLECTIONS, collectionById, SEASON_BONUS } from '../data/collections.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

function pickBranch() {
  return Math.random() < CONFIG.BRANCH_FRUIT_CHANCE ? 'fruit' : 'veg';
}

function pickRank() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < CONFIG.RANK_CHANCES.length; i++) {
    acc += CONFIG.RANK_CHANCES[i];
    if (r < acc) return i;
  }
  return 0;
}

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0');
}

function yesterday() {
  const d = new Date(Date.now() - 86400000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0');
}

export const Game = {
  state: 'playing',      // 'playing' | 'over'
  pantryOpen: false,
  pantryTab: 'pantry',   // 'pantry' | 'collection' | 'awards'
  order: null,           // активный заказ: рецепт из COLLECTIONS
  dailySpecial: null,    // «банка дня»: { branch, rank }, очки закатки ×2
  ach: {},               // открытые достижения: id -> 1
  recipeCard: null,      // открытая карточка рецепта (id коллекции) | null
  recipesThisGame: 0,    // новых рецептов за партию (для итогов)
  score: 0,
  best: 0,
  newBest: false,
  gauge: 0,
  jarReady: false,
  captureMode: false,
  captureUntil: 0,
  canDrop: true,
  current: null,         // подвес: { branch, rank, x }
  next: null,            // превью следующего: { branch, rank }
  rescueUsed: false,
  rescueBusy: false,     // идёт показ вознаграждаемой
  dangerTimer: 0,
  jarsThisGame: 0,
  soundOn: true,
  streak: 1,
  tutorialActive: false,
  seasons: 0,            // сколько раз коллекция сдана на ярмарку
  floaters: [],          // всплывающие +очки: { x, y, text, color, born }
  toast: null,           // текущая плашка: { text, until }
  _toastQueue: [],       // плашки не затирают друг друга, а идут очередью
  _dropTimer: 0,
  _lastInterstitialAt: 0,
  _aiming: false,
  _dailyGiven: false,

  init(save) {
    this.best = save.best || 0;
    this.soundOn = save.sound !== false;
    Audio.setEnabled(this.soundOn);
    this.streak = save.streak || 0;
    this.tutorialActive = !save.tutorialDone;
    this.seasons = save.seasons || 0;
    this.ach = save.ach || {};
    Pantry.load(save);
    // Активный заказ: восстановить из сейва или выдать новый.
    this.order = collectionById(save.activeOrder) || this._pickOrder();
    Platform.save.update({ activeOrder: this.order.id });
    // Тёплое приветствие по времени суток — первая плашка сессии.
    const h = new Date().getHours();
    this.showToast(i18n.t(h < 5 ? 'greetNight' : h < 12 ? 'greetMorning'
      : h < 18 ? 'greetDay' : 'greetEvening'));
    // Кулдаун полноэкранной отсчитывается от загрузки: первый interstitial
    // случится не раньше чем через 90 секунд игры и никогда — на входе.
    this._lastInterstitialAt = performance.now();
    this.startGame();
  },

  // ---- Партия ---------------------------------------------------------------

  startGame() {
    Physics.clear();
    this.state = 'playing';
    this.score = 0;
    this.newBest = false;
    this.gauge = 0;
    this.jarReady = false;
    this.captureMode = false;
    this.canDrop = true;
    this.rescueUsed = false;
    this.rescueBusy = false;
    this.dangerTimer = 0;
    this.jarsThisGame = 0;
    this.recipesThisGame = 0;
    this.floaters = [];
    this._dropTimer = 0;
    this.current = { ...this._roll(), x: CONFIG.W / 2 };
    this.next = this._roll();
    this._rollDailySpecial();
    this._applyDailyBonus();
    Analytics.event('game_start');
    Platform.gameplayStart();
  },

  _roll() {
    return { branch: pickBranch(), rank: pickRank() };
  },

  // «Банка дня»: детерминированно от даты, младшие ранги обеих веток —
  // закатка этого плода даёт удвоенные очки. Ритуал разнообразит дни.
  _rollDailySpecial() {
    const t = today();
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    const pool = [];
    for (const branch of ['fruit', 'veg']) {
      for (let rank = 0; rank <= 3; rank++) pool.push({ branch, rank });
    }
    this.dailySpecial = pool[h % pool.length];
  },

  // Ежедневный бонус со стриком (RETENTION.md): первая партия нового дня
  // начинается с готовой банкой. Стрик рвётся, если пропущен день.
  _applyDailyBonus() {
    const t = today();
    const save = Platform.cache || {};
    if (save.lastDay === t) return;
    this.streak = save.lastDay === yesterday() ? (save.streak || 0) + 1 : 1;
    Platform.save.update({ lastDay: t, streak: this.streak });
    this.gauge = CONFIG.GAUGE_MAX;
    this.jarReady = true;
    this._dailyGiven = true;
    this.showToast(i18n.t('dailyBonus') + ' ' + i18n.t('streakDay', { n: this.streak }));
    const ds = this.dailySpecial;
    this.showToast(i18n.t('dailySpecialToast',
      { name: i18n.t('jar_' + ds.branch + '_' + ds.rank) }));
    Analytics.event('daily_bonus', { streak: this.streak });
    this._checkAchievements();
  },

  // ---- Ввод -----------------------------------------------------------------
  // Координаты уже в логических единицах 720×1280 (пересчитывает main.js).

  pointerDown(x, y) {
    Audio.unlock();

    if (this.pantryOpen) {
      // Открытая карточка рецепта закрывается любым тапом.
      if (this.recipeCard) { Audio.click(); this.recipeCard = null; return; }
      const id = LAYOUT.overlayHit(x, y);
      if (id === 'pantryClose') this.closePantry();
      else if (id === 'tabPantry') { Audio.click(); this.pantryTab = 'pantry'; }
      else if (id === 'tabCollection') { Audio.click(); this.pantryTab = 'collection'; }
      else if (id === 'tabAwards') { Audio.click(); this.pantryTab = 'awards'; }
      else if (id === 'orderCollect') this.completeOrder();
      else if (id === 'fairCollect') this.completeFair();
      else if (id && id.startsWith('col_')) this.openRecipe(id.slice(4));
      else if (id === null && !LAYOUT.hit(LAYOUT.pantryPanel, x, y)) this.closePantry();
      return;
    }

    if (this.state === 'over') {
      const id = LAYOUT.overlayHit(x, y);
      if (id === 'restart') this.restart();
      else if (id === 'rescue') this.rescue();
      else if (id === 'pantry') this.openPantry();
      return;
    }

    // HUD
    if (LAYOUT.hit(LAYOUT.sound, x, y)) { this.toggleSound(); return; }
    if (LAYOUT.hit(LAYOUT.pantryBtn, x, y)) { this.openPantry(); return; }
    if (LAYOUT.hit(LAYOUT.order, x, y)) {
      // Заказ готов — собрать сразу; нет — показать детали в коллекции.
      if (this.orderReady()) this.completeOrder();
      else this.openPantry('collection');
      return;
    }
    if (this.jarReady && !this.captureMode && LAYOUT.hit(LAYOUT.jar, x, y)) {
      this.captureMode = true;
      this.captureUntil = performance.now() + CONFIG.JAR_TIMEOUT_MS;
      Audio.click();
      return;
    }

    if (this.captureMode) {
      const body = Physics.fruitAt(x, y);
      if (body) this._capture(body);
      else this.captureMode = false; // тап мимо — выйти из режима, банка остаётся
      return;
    }

    // Поле: начало прицеливания
    this._aiming = true;
    this._moveCurrent(x);
  },

  pointerMove(x) {
    if (this.state !== 'playing' || this.pantryOpen || this.captureMode) return;
    this._moveCurrent(x);
  },

  pointerUp() {
    if (!this._aiming) return;
    this._aiming = false;
    this.drop();
  },

  key(action) {
    if (this.pantryOpen) {
      if (this.recipeCard) { this.recipeCard = null; return; }
      if (action === 'back' || action === 'confirm') this.closePantry();
      return;
    }
    if (this.state === 'over') {
      if (action === 'confirm') this.restart();
      return;
    }
    if (action === 'left') this._moveCurrent(this.current.x - 24);
    else if (action === 'right') this._moveCurrent(this.current.x + 24);
    else if (action === 'confirm') { Audio.unlock(); this.drop(); }
    else if (action === 'back' && this.captureMode) this.captureMode = false;
  },

  _moveCurrent(x) {
    if (!this.current) return;
    const r = CONFIG.FRUITS[this.current.branch][this.current.rank].radius;
    this.current.x = Math.max(CONFIG.INNER_LEFT + r + 2,
      Math.min(x, CONFIG.INNER_RIGHT - r - 2));
  },

  drop() {
    if (this.state !== 'playing' || !this.canDrop || this.captureMode || !this.current) return;
    const { branch, rank, x } = this.current;
    Physics.spawnFruit(branch, rank, x, CONFIG.DROP_Y);
    Audio.drop();
    if (this.tutorialActive) {
      this.tutorialActive = false;
      Platform.save.update({ tutorialDone: true });
      Analytics.event('tutorial_done');
    }
    this.canDrop = false;
    this._dropTimer = CONFIG.DROP_COOLDOWN_MS;
    this.current = { ...this.next, x };
    this._moveCurrent(x); // новый радиус — новые границы
    this.next = this._roll();
  },

  // ---- Шаг симуляции --------------------------------------------------------

  step(dtMs) {
    if (this.state !== 'playing' || this.pantryOpen || this.rescueBusy) return;

    Physics.step(dtMs);
    this._handleMerges();

    if (!this.canDrop) {
      this._dropTimer -= dtMs;
      if (this._dropTimer <= 0) this.canDrop = true;
    }

    if (this.captureMode && performance.now() > this.captureUntil) {
      this.captureMode = false; // время вышло, банка остаётся ждать
    }

    this._checkGameEnd(dtMs);
    this._tickEffects();
  },

  _handleMerges() {
    const pairs = Physics.takeMerges();
    for (const [a, b] of pairs) {
      // Партнёра могли снять закаткой/спасением, пока пара ждала разбора —
      // тогда слияние отменяется, а выживший размечается заново.
      if (!Physics.contains(a) || !Physics.contains(b)) {
        a.plugin.fruit.mergedFlag = false;
        b.plugin.fruit.mergedFlag = false;
        continue;
      }
      const { branch, rank } = a.plugin.fruit;
      const mx = (a.position.x + b.position.x) / 2;
      const my = (a.position.y + b.position.y) / 2;
      Physics.remove([a, b]);

      if (rank < 6) {
        // «Поп»: новый плод подбрасывается, соседи расталкиваются от эпицентра.
        Physics.spawnFruit(branch, rank + 1, mx, my,
          { velocity: { x: 0, y: CONFIG.MERGE_POP.newUp } });
        Physics.popNeighbors(mx, my, CONFIG.FRUITS[branch][rank + 1].radius);
        this._addScore(CONFIG.MERGE_SCORE[rank], mx, my);
        this._addGauge(CONFIG.GAUGE_GAIN[rank]);
        Audio.merge(rank);
      } else {
        // Две шестёрки: обе исчезают с сильной ударной волной, крупный куш.
        Physics.popNeighbors(mx, my, CONFIG.FRUITS[branch][6].radius);
        this._addScore(CONFIG.MAX_MERGE_SCORE, mx, my);
        this._addGauge(CONFIG.GAUGE_GAIN_MAX);
        Audio.mergeMax();
        Analytics.event('merge_max');
        this._checkAchievements('merge_max');
      }
    }

    // СТРАХОВКА: очередь только что разобрана, значит флаг «сливаюсь» не имеет
    // права оставаться ни на одном живом плоде. Утёкший флаг (любой будущий
    // баг) навсегда выключал бы плоду слияния — самоизлечиваемся за кадр.
    for (const body of Physics.fruits()) {
      if (body.plugin.fruit.mergedFlag) body.plugin.fruit.mergedFlag = false;
    }
  },

  _addScore(points, x, y) {
    this.score += points;
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
    }
    if (x !== undefined) {
      this.floaters.push({ x, y, text: '+' + points, born: performance.now() });
    }
    if (this.score >= 1000 && !this.ach.tysyacha) this._checkAchievements();
  },

  _addGauge(v) {
    if (this.jarReady) return; // банка ждёт — шкала копится после закатки
    this.gauge += v;
    if (this.gauge >= CONFIG.GAUGE_MAX) {
      this.gauge = CONFIG.GAUGE_MAX;
      this.jarReady = true;
      this.showToast(i18n.t('jarReady'));
      Audio.jar();
      Analytics.event('jar_ready');
    }
  },

  _capture(body) {
    const { branch, rank } = body.plugin.fruit;
    Physics.remove(body);
    this.captureMode = false;
    this.jarReady = false;
    this.gauge = 0;
    this.jarsThisGame++;
    // «Банка дня»: закатка плода дня — удвоенные очки.
    const ds = this.dailySpecial;
    const isSpecial = ds && ds.branch === branch && ds.rank === rank;
    const points = CONFIG.CAPTURE_SCORE[rank] * (isSpecial ? 2 : 1);
    this._addScore(points, body.position.x, body.position.y);
    if (isSpecial) {
      this.floaters.push({ x: body.position.x, y: body.position.y - 40,
        text: '×2!', born: performance.now() });
    }

    const isNew = Pantry.add(branch, rank);
    if (isNew) this.recipesThisGame++;
    Platform.save.update({ pantry: Pantry.counts, recipes: Pantry.recipes });
    Analytics.event('jar_captured', { branch, rank });
    Analytics.first('jar_first_use');
    if (isNew) {
      this.showToast(i18n.t('newRecipe', { name: i18n.t('jar_' + branch + '_' + rank) }));
      Audio.recipe();
      Analytics.event('recipe_new', { key: branch + '_' + rank });
    } else {
      // Тёплая присказка вместо сухого звука — голос игры.
      this.showToast(i18n.t('praise' + (1 + Math.floor(Math.random() * 4))));
      Audio.jar();
    }
    this._checkAchievements();
  },

  _checkGameEnd(dtMs) {
    let danger = false;
    const now = performance.now();
    for (const body of Physics.fruits()) {
      if (body.bounds.min.y < CONFIG.DEATH_Y &&
          body.speed < CONFIG.DEATH_MAX_SPEED &&
          now - body.plugin.fruit.bornAt > CONFIG.DEATH_MIN_AGE_MS) {
        danger = true;
        break;
      }
    }
    this.dangerTimer = danger ? this.dangerTimer + dtMs : 0;
    if (this.dangerTimer >= CONFIG.DEATH_DELAY_MS) this._endGame();
  },

  _endGame() {
    this.state = 'over';
    this.captureMode = false;
    Audio.over();
    Platform.gameplayStop();
    Platform.save.update({ best: this.best });
    Platform.save.flush();
    if (this.score > 0) {
      Platform.leaderboard.setScore(CONFIG.LEADERBOARD_NAME, this.score);
    }
    Analytics.event('game_end', { score: this.score, jars: this.jarsThisGame });
  },

  restart() {
    Audio.click();
    // Полноэкранная реклама между партиями, не чаще кулдауна. Слой платформы
    // сам ставит игру и звук на паузу и снимает её (требование модерации).
    const now = performance.now();
    if (now - this._lastInterstitialAt >= CONFIG.INTERSTITIAL_COOLDOWN_MS) {
      this._lastInterstitialAt = now;
      Platform.ads.showFullscreen({ onClose: () => this.startGame() });
    } else {
      this.startGame();
    }
  },

  // Спасение за рекламу (ТЗ 7.7): раз за партию, убирает верхние плоды.
  // Награда выдаётся только в onRewarded (YANDEX-SDK.md).
  rescue() {
    if (this.rescueUsed || this.rescueBusy) return;
    this.rescueBusy = true;
    let granted = false;
    Platform.ads.showRewarded({
      onRewarded: () => { granted = true; },
      onClose: () => {
        this.rescueBusy = false;
        if (!granted) return;
        const limit = CONFIG.DEATH_Y + CONFIG.RESCUE_CLEAR_DEPTH;
        for (const body of Physics.fruits()) {
          if (body.bounds.min.y < limit) Physics.remove(body);
        }
        this.rescueUsed = true;
        this.dangerTimer = 0;
        this.state = 'playing';
        Platform.gameplayStart();
        Analytics.event('rescue_used');
        this._checkAchievements('rescue');
      }
    });
  },

  // ---- Заказы и коллекция ---------------------------------------------------

  // Следующий заказ: несобранные — от дешёвых к дорогим (кривая сложности),
  // все собраны — случайный, но не тот же подряд.
  _pickOrder(excludeId) {
    const fresh = COLLECTIONS
      .filter((c) => !Pantry.collectionCount(c.id) && c.id !== excludeId)
      .sort((a, b) => a.bonus - b.bonus);
    if (fresh.length) return fresh[0];
    const pool = COLLECTIONS.filter((c) => c.id !== excludeId);
    return pool[Math.floor(Math.random() * pool.length)] || COLLECTIONS[0];
  },

  // Хватает ли банок в кладовой на активный заказ.
  orderReady() {
    if (!this.order) return false;
    // Одинаковые компоненты в заказе считаем с накоплением (пока таких нет,
    // но каталог данных не должен ломать логику).
    const need = {};
    for (const [branch, rank] of this.order.components) {
      const k = branch + '_' + rank;
      need[k] = (need[k] || 0) + 1;
    }
    return Object.entries(need).every(([k, n]) => (Pantry.counts[k] || 0) >= n);
  },

  completeOrder() {
    if (!this.order || !this.orderReady() || this.state !== 'playing') return;
    const order = this.order;
    for (const [branch, rank] of order.components) Pantry.consume(branch, rank);
    const isNew = Pantry.addCollection(order.id);
    const name = i18n.t('col_' + order.id);
    this._addScore(order.bonus, LAYOUT.order.x + LAYOUT.order.w / 2, LAYOUT.order.y + 40);
    this.showToast(i18n.t('orderDone', { name, n: order.bonus }));
    Audio.recipe();
    Analytics.event('order_completed', { id: order.id, bonus: order.bonus });
    if (isNew) Analytics.event('collection_new', { id: order.id });

    this.order = this._pickOrder(order.id);
    // Явно объявить новый заказ: без этого уже лежащие на складе банки
    // выглядят как «прогресс перетёк из прошлой коллекции».
    this.showToast(i18n.t('orderNew', { name: i18n.t('col_' + this.order.id) }));
    if (this.fairReady()) this.showToast(i18n.t('fairReady'));
    this._checkAchievements();
    Platform.save.update({
      pantry: Pantry.counts,
      collection: Pantry.collection,
      activeOrder: this.order.id
    });
  },

  // ---- Ярмарка: бесконечная петля коллекций ---------------------------------

  // Собраны все коллекции (хотя бы по одной банке каждой) — можно на ярмарку.
  fairReady() {
    return COLLECTIONS.every((c) => Pantry.collectionCount(c.id) > 0);
  },

  // Обмен: по одной банке каждой коллекции → крупный бонус, сезон закрыт,
  // сбор начинается заново. Лишние дубликаты остаются — задел нового сезона.
  completeFair() {
    if (!this.fairReady() || this.state !== 'playing') return;
    for (const c of COLLECTIONS) Pantry.consumeCollection(c.id);
    this.seasons++;
    this._addScore(SEASON_BONUS, CONFIG.W / 2, 620);
    this.showToast(i18n.t('seasonDone', { s: this.seasons, n: SEASON_BONUS }));
    Audio.mergeMax();
    Analytics.event('season_completed', { season: this.seasons });
    Platform.save.update({ collection: Pantry.collection, seasons: this.seasons });
    this._checkAchievements();
  },

  // ---- Достижения -----------------------------------------------------------

  // ev — разовое событие ('merge_max', 'rescue'), метрики считаются всегда.
  _checkAchievements(ev) {
    for (const a of ACHIEVEMENTS) {
      if (this.ach[a.id]) continue;
      let done = false;
      if (a.type === 'jars') done = Pantry.totalJars() + this._consumedJars() >= a.n;
      else if (a.type === 'collections') done = Pantry.collectionsOpened() + (this.seasons ? 12 : 0) >= a.n;
      else if (a.type === 'collection_id') done = Pantry.collectionCount(a.cid) > 0 || this.seasons > 0;
      else if (a.type === 'seasons') done = this.seasons >= a.n;
      else if (a.type === 'score') done = this.score >= a.n;
      else if (a.type === 'streak') done = this.streak >= a.n;
      else if (a.type === 'event') done = ev === a.ev;
      if (!done) continue;
      this.ach[a.id] = 1;
      this.showToast('🏅 ' + i18n.t('achUnlocked', { name: i18n.t('ach_' + a.id) }));
      Audio.recipe();
      Analytics.event('achievement', { id: a.id });
      Platform.save.update({ ach: this.ach });
    }
  },

  // Банки, потраченные на заказы, тоже труд хозяйки: 3 за каждую коллекцию.
  _consumedJars() {
    let n = 0;
    for (const id in Pantry.collection) n += Pantry.collection[id] * 3;
    return n + this.seasons * 36;
  },

  // ---- Кладовая и настройки -------------------------------------------------

  openPantry(tab = 'pantry') {
    if (this.pantryOpen) { this.pantryTab = tab; return; }
    Audio.click();
    this.pantryOpen = true;
    this.pantryTab = tab;
    if (this.state === 'playing') Platform.gameplayStop();
    Analytics.event('pantry_opened');
    Analytics.first('pantry_first_use');
  },

  closePantry() {
    if (!this.pantryOpen) return;
    Audio.click();
    this.pantryOpen = false;
    this.recipeCard = null;
    if (this.state === 'playing') Platform.gameplayStart();
  },

  // Карточка рецепта — награда за собранную коллекцию (альбом рецептов).
  openRecipe(id) {
    if (!Pantry.collectionCount(id) && !this.seasons) return; // ещё не собрана
    Audio.click();
    this.recipeCard = id;
    Analytics.event('recipe_read', { id });
  },

  toggleSound() {
    this.soundOn = !this.soundOn;
    Audio.setEnabled(this.soundOn);
    Audio.click();
    Platform.save.update({ sound: this.soundOn });
  },

  // ---- Эффекты --------------------------------------------------------------

  showToast(text) {
    this._toastQueue.push(text);
    if (!this.toast) this._nextToast();
  },

  _nextToast() {
    const text = this._toastQueue.shift();
    this.toast = text ? { text, until: performance.now() + 2600 } : null;
  },

  _tickEffects() {
    const now = performance.now();
    this.floaters = this.floaters.filter((f) => now - f.born < 1000);
    if (this.toast && now > this.toast.until) this._nextToast();
  }
};
