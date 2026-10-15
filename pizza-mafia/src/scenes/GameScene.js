// GameScene: рабочий день пиццерии. Рисует очередь клиентов сверху, рабочую зону
// сборки пиццы в центре (этапы: тесто → соус → сыр → топпинги → печь), HUD и выдачу.
//
// Архитектура (CONVENTIONS.md): чистая логика — в mechanics/orders и mechanics/kitchen,
// числа — в data/balance, прогресс — в meta/progress. Сцена ТОЛЬКО рисует то, что вернули
// движки, ловит ввод и решает, когда сохраняться. Вид — через THEME, тексты — через i18n.
//
// Поток дня: клиенты спавнятся по интервалу (DAY.spawnInterval*) → у каждого тает терпение
// (tickPatience). Игрок выбирает клиента из очереди → начинает сборку (startBuild) →
// проходит этапы тапами → печь → выдаёт (serveReward). На нуле терпения — клиент уходит.
// День кончается по таймеру DAY.durationSeconds → переход на DayEnd-сцену.
import { YA } from '../yandex/sdk.js';
import { Ads } from '../yandex/ads.js';
import { Platform } from '../platform/index.js';
import { Save } from '../yandex/save.js';
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { showInterstitial } from '../ui/interstitial.js';
import { i18n } from '../i18n/strings.js';
import {
  BALANCE, RECIPES, INGREDIENTS, STAGES, EACH_STAGE, OVEN, PATIENCE, DAY, ECONOMY, PREP,
  upgradeCost, upgradeEffect, PATIENCE_BOOST_SECONDS
} from '../data/balance.js';
import { bus } from '../core/events.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import {
  createCustomer, tickPatience, addPatience, patienceFraction, checkPizza, serveReward
} from '../mechanics/orders/orders.js';
import {
  startBuild, rollDough, addSauce, addCheese, addTopping, finishToppings,
  putInOven, tickOven, ovenState, takeOut, instantCook, pizzaAsServed, pizzaSnapshot, OvenResult
} from '../mechanics/kitchen/kitchen.js';
import {
  createPrepTable, assign, release, entryAt, isFull, usedCount, resize, indexOfCustomer
} from '../mechanics/prep/prep.js';
import { mergeProgress, upgradeLevel } from '../meta/progress.js';
import {
  currentDistrict, isBossShift, shiftNumber, shiftLabel, completeShift, tributeState,
  unlockedRecipeIds, unlockedCustomerIds, shiftRevenueTarget
} from '../meta/campaign.js';
import { shiftStars, shiftGoalFraction } from '../meta/stars.js';
import { pickPatron, PATRONS } from '../data/patrons.js';
import { rollModifiers, combineModifiers } from '../data/modifiers.js';
import { claimUnlocks } from '../meta/achievements.js';
import { drawCoinIcon, drawClockIcon, drawStageIcon, drawArrowUp, drawIngredientIcon } from '../render/icons.js';
import { createCustomerView } from '../render/customers.js';
import { drawPizzaInto, drawOven } from '../render/pizza.js';
import { drawPrepColumn } from '../render/prep.js';

// Число слотов очереди берётся из данных (DAY.queueCapacity). Отдельной константы «сколько
// РИСУЕМ» больше нет намеренно: пока их было две (рисовали 4, в очереди сколько угодно),
// гость с пятого места тикал терпением и мог уйти, ни разу не показавшись игроку.

// РАСКЛАДКА ЭКРАНА. Три пояса: очередь у стойки сверху, рабочая зона с пиццей и печью
// в середине, ингредиенты и кнопки снизу.
//
// Зачем константой: в первой версии координаты были разбросаны по методам магическими
// числами (cy = height*0.5, y = height-150, cy - radius - 90), из-за чего между пиццей и
// нижними кнопками зияло ~300 px пустоты, а печи в кадре не было вовсе. Всё в долях
// высоты — раскладка держится на любом вьюпорте, а не только на 720x1280.
//
// Пицца сдвинута левее центра, чтобы справа поместилась печь и они не наезжали:
// доска пиццы кончается на 0.46*w + r + 26, печь начинается на 0.845*w - ovenW/2.
function layoutFor(width, height) {
  // Числа подогнаны под АРТ: на всех четырёх фонах край стойки лежит примерно на 38–41%
  // высоты. Гости стоят НАД этой линией (как будто за стойкой), рабочая зона — под ней.
  // Меняешь фон — проверь, что край стойки на нём там же, иначе гости повиснут в воздухе.
  const queueTop = height * 0.10;
  const queueH = height * 0.21;
  const pizzaR = width * 0.19;
  return {
    queueTop,
    queueH,
    counterY: queueTop + queueH + height * 0.004,
    stageStripY: height * 0.35,
    stageLabelY: height * 0.39,
    stageHintY: height * 0.422,
    pizzaX: width * 0.46,
    pizzaY: height * 0.60,
    pizzaR,
    ovenX: width * 0.845,
    ovenY: height * 0.60,
    ovenW: width * 0.235,
    ovenH: height * 0.125,
    actionY: height * 0.775,
    ingredientsY: height * 0.87,
    controlsY: height - 70
  };
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  async create() {
    const { width, height } = this.scale;

    // Состояние дня инициализируем ДО первого await: create() async, и Phaser начинает
    // звать update() сразу после старта сцены, не дожидаясь разрешения await Save.load().
    // Без этого this.queue ещё undefined на первых кадрах → update падает в forEach
    // (реальный крах игрового цикла, ловился в консоли). ready=false держит update тихим.
    this.ready = false;
    this.ended = false;
    this.queue = [];
    // СТОЛ ЗАГОТОВОК вместо единственной активной пиццы. activePizza/activeCustomer теперь
    // ГЕТТЕРЫ (см. ниже) — производные от активного места стола. Присваивать их нельзя:
    // класс исполняется в strict mode, присваивание в геттер без сеттера бросит исключение.
    // Это намеренно: пара «гость + пицца» должна жить в одном месте, иначе они разъедутся,
    // как уже разъезжались очередь и печь.
    this.prep = createPrepTable(PREP.slots);
    this.activeSlot = 0;
    this.dayServed = 0;
    this.dayLost = 0;
    this.dayCoins = 0;
    this.dayTips = 0;
    this.dayTimeLeft = DAY.durationSeconds;
    this.spawnTimer = 2.0;
    this.baking = [];      // пиццы В ПЕЧИ: { cust, pizza }. Освобождают руки под следующий заказ
    this.combo = 0;        // серия подряд ТОЧНО собранных пицц
    this.bestCombo = 0;
    this.rivals = 0;       // шкала конкурентов через дорогу
    this.usedRewardThisShift = false;  // жал ли rewarded — для заслуги «своими руками»
    this._donOrderSpawned = false;
    this.L = layoutFor(width, height);   // раскладка: одна на сцену, см. layoutFor

    // ── Прогресс и состояние дня ──────────────────────────────────────────
    this.progress = mergeProgress((await Save.load()) || null);
    Object.keys(this.progress.achievements || {}).forEach((id) => Platform.achievements.unlock(id));
    this.campaign = this.progress.campaign;
    // Апгрейд стола добавляет место. Расширяем ПОСЛЕ загрузки прогресса — до неё уровень
    // апгрейда ещё неизвестен.
    resize(this.prep, PREP.slots + upgradeLevel(this.progress, 'prepTable'));
    // day — СКВОЗНОЙ номер смены. Он по-прежнему кормит формулы терпения (чем дальше,
    // тем терпеливее гости — иначе сложные рецепты стали бы непроходимыми), но больше
    // не решает, что открыто: это дело района.
    this.day = shiftNumber(this.campaign);
    this.bossShift = isBossShift(this.campaign);

    // МОДИФИКАТОРЫ — только после финала кампании. Пока идёт сюжет, сложность задают район
    // и рецепты; случайная «остывшая печь» посреди района дани читалась бы как поломка.
    this.modifiers = this.campaign.done ? rollModifiers(this.campaign.endlessDay) : [];
    this.mods = combineModifiers(this.modifiers);

    // Цель выручки смены — по ней считаются звёзды и рисуется полоса в HUD. Игрок должен
    // видеть её ВО ВРЕМЯ смены, а не узнавать на экране итога, почему звёзд две.
    this.shiftGoal = shiftRevenueTarget(this.campaign);
    // ПОКАЗЫВАЕМ порог ТРЁХ звёзд, а не «средний темп дани». Игроку нужна одна цифра-цель,
    // и это должна быть та, за которую дают лучшую оценку: иначе полоса в HUD заполняется
    // на 520, а звёзд всё равно две — читается как обман.
    this.shiftGoalShown = Math.round(this.shiftGoal * ECONOMY.starTargets.three);

    // Что открыто — решает кампания (накопительно по пройденным районам).
    const recipeIds = new Set(unlockedRecipeIds(this.campaign));
    const customerIds = new Set(unlockedCustomerIds(this.campaign));
    this.unlockedRecipes = () => RECIPES.filter((rc) => recipeIds.has(rc.id));
    this.unlockedCustomers = () => BALANCE.customers.filter((c) => customerIds.has(c.id));

    YA.gameplayStart();
    Input.setup(this);
    Analytics.event(EVENTS.GAME_START, { day: this.day });

    // Sticky-баннер держим включённым и В СМЕНЕ, а не только в меню: он платит за время
    // сессии, а время игрок проводит именно здесь. Баннер площадки живёт ВНЕ канваса
    // (браузерный слой), поэтому интерфейс он не закрывает. Повторный вызов безопасен.
    Ads.showBanner();

    // ── Фон ───────────────────────────────────────────────────────────────
    this.drawBackground(width, height);

    // ── HUD ───────────────────────────────────────────────────────────────
    this.hud = {};
    this.drawHud(width);

    // ── Печь ──────────────────────────────────────────────────────────────
    // Стоит ОТДЕЛЬНО от workZone: та полностью пересобирается при смене этапа, а печь
    // — постоянная декорация, которая должна быть в кадре всегда, даже когда заказа нет.
    this.oven = drawOven(this, this.L.ovenX, this.L.ovenY, this.L.ovenW, this.L.ovenH);
    this.oven.setDepth(-10);
    this.ovenSlots = null;
    this.drawOvenSlots();

    // ── Колонка заготовок (левый край, симметрично печи) ──────────────────
    this.prepColumn = null;
    this.drawPrepSlots();

    // ── Очередь клиентов (верхняя зона) ──────────────────────────────────
    this.queueContainer = this.add.container(0, 0);
    this.queueCards = [];            // визуальные карточки клиентов

    // ── Рабочая зона (центр): пицца + этапы ───────────────────────────────
    this.workZone = this.add.container(0, 0);
    this.pizzaGraphics = null;
    this.stageLabel = null;
    this.stageHint = null;
    this.toppingButtons = [];

    // ── Кнопки управления днём ────────────────────────────────────────────
    this.drawDayControls(width, height);

    // Стартовая рабочая зона пуста — игрок выбирает клиента.
    this.refreshWorkZone();

    // Обновление HUD на старте.
    this.updateHud();

    // Автосохранение при закрытии — через lifecycle (pagehide → flush).
    this.events.once('shutdown', () => this.cleanup());

    // ОБУЧЕНИЕ. Только у нового игрока и только на самой первой смене: иначе оно
    // превратится в назойливость для того, кто уже всё понял.
    this.tutorial = null;
    this.isTutorialShift = !this.progress.tutorialDone
      && this.campaign.district === 0 && this.campaign.shift === 0 && !this.campaign.done;
    if (this.isTutorialShift) {
      this.scene.launch('Tutorial', { gameScene: this });
      this.tutorial = this.scene.get('Tutorial');
    }

    // Условия ночи объявляем баннером на старте: подпись в HUD мелкая, а изменение правил
    // игрок должен заметить ДО того, как оно его удивит.
    if (this.modifiers.length) {
      this.time.delayedCall(400, () => {
        if (!this.ended) {
          this.showBanner(i18n.t('nightRules') + '\n'
            + this.modifiers.map((m) => i18n.t('mod_' + m.id)).join(' · '), THEME.colors.accentText);
        }
      });
    }

    // УСЛОВИЕ БОСС-СМЕНЫ ОБЪЯВЛЯЕТСЯ ВСЛУХ. Строка `bossShiftHint` лежала в локализации и
    // не использовалась нигде: игрок узнавал, что нельзя терять гостей, только когда смена
    // уже провалена и Дон «даёт отсрочку» (красная команда 12.08). Правило, о котором не
    // сказали, — это не сложность, а несправедливость.
    if (this.bossShift && !this.campaign.done) {
      this.time.delayedCall(600, () => {
        if (!this.ended) this.showBanner(i18n.t('bossShiftHint'), THEME.colors.dangerText);
      });
    }

    // Всё инициализировано (после async create) — разрешаем update тикать.
    this.ready = true;
  }

  // ── АКТИВНОЕ МЕСТО СТОЛА ───────────────────────────────────────────────
  // Вся сцена работает с «активной пиццей» и «активным гостем». Раньше это были два
  // независимых поля, и их приходилось обнулять в трёх местах — там и терялась связь
  // (пицца оставалась без гостя, гость без пиццы). Теперь это одна пара на месте стола,
  // а поля — только чтение.
  get activeEntry() { return entryAt(this.prep, this.activeSlot); }
  get activePizza() { return this.activeEntry ? this.activeEntry.pizza : null; }
  get activeCustomer() { return this.activeEntry ? this.activeEntry.cust : null; }

  // Сколько мест на столе занято — по нему решается, брать ли заказ автоматически.
  prepUsed() { return usedCount(this.prep); }

  // Переключиться на другое место стола: рабочая зона пересобирается под его пиццу.
  // Кэши последнего этапа сбрасываются принудительно — иначе updateStageUI решит, что
  // «ничего не изменилось», и оставит контролы от предыдущей пиццы.
  switchSlot(index) {
    this.activeSlot = index;
    this._lastStage = null;
    this._lastOvenPhase = null;
    this._lastFinished = null;
    this.refreshQueueView();
    this.refreshWorkZone();
    this.drawPrepSlots();
  }

  // Навести фокус на любое занятое место (после того, как активное освободилось).
  // Без этого игрок смотрел бы в пустую рабочую зону, имея вторую пиццу в двух шагах.
  focusOccupied() {
    if (this.activeEntry) return true;
    const i = this.prep.slots.findIndex(Boolean);
    if (i < 0) return false;
    this.switchSlot(i);
    return true;
  }

  // ── ФОН ────────────────────────────────────────────────────────────────
  drawBackground(width, height) {
    // Фон района, если ассет загружен. Ассет обязательным не считаем: без него игра
    // должна остаться играбельной, поэтому ниже — прежний градиент со стойкой.
    const d = currentDistrict(this.campaign);
    const key = d ? d.bg : null;
    if (key && this.textures.exists(key)) {
      const img = this.add.image(width / 2, height / 2, key);
      // cover: заполняем экран целиком, лишнее уходит за края — фон нарисован 9:16,
      // как и базовое разрешение, так что обрезка минимальна.
      const scale = Math.max(width / img.width, height / img.height);
      img.setScale(scale).setDepth(-100);
      return;
    }

    // Запасной путь: градиент «потолок пиццерии» и нарисованная стойка.
    // fillGradientStyle ждёт ЧИСЛА (hex), не css-строки — иначе фон остаётся чёрным.
    const bg = this.add.graphics();
    bg.fillGradientStyle(THEME.colors.bgTopHex, THEME.colors.bgTopHex, THEME.colors.bgHex, THEME.colors.bgHex, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-100);
    const counter = this.add.graphics();
    counter.fillStyle(THEME.colors.panelLight, 1);
    counter.fillRect(0, this.L.counterY, width, height * 0.042);
    counter.fillStyle(0x000000, 0.18);
    counter.fillRect(0, this.L.counterY + height * 0.042, width, height * 0.008);
    counter.setDepth(-90);
  }

  // ── HUD ────────────────────────────────────────────────────────────────
  drawHud(width) {
    const g = this.add.graphics();
    g.fillStyle(THEME.colors.panel, 0.92);
    g.fillRoundedRect(12, 12, width - 24, 64, 14);
    g.setDepth(50);

    const y = 44;
    // Две строки и жёсткий предел по ширине: «Деловой квартал · Смена 2 из 6» одной
    // строкой налезало на счётчик монет (видно на скриншоте с артом).
    this.hud.day = this.add.text(28, y, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
      lineSpacing: 2, wordWrap: { width: width * 0.34 }
    }).setOrigin(0, 0.5).setDepth(51);

    // Монеты и время: РИСОВАННАЯ иконка + текст. Эмодзи здесь были и выводились
    // квадратами-тофу (проверено живьём) — см. render/icons.js.
    drawCoinIcon(this, width / 2 - 26, y, 26).setDepth(51);
    this.hud.coins = this.add.text(width / 2 - 8, y, '', { fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText, fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(51);

    drawClockIcon(this, width - 104, y, 24).setDepth(51);
    this.hud.time = this.add.text(width - 28, y, '', { fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text }).setOrigin(1, 0.5).setDepth(51);

    // ЦЕЛЬ СМЕНЫ прямо под монетами: полоса и «сколько из скольких». Без неё игрок узнаёт
    // о цели только на экране итога и не понимает, почему звёзд две, — а знать это надо
    // ТОГДА, когда ещё можно поднажать.
    // Полоса стоит во ВТОРОМ ряду, между серией слева и конкурентами справа: в самой
    // плашке HUD места нет, там монеты и время.
    this.hud.goalBar = this.add.graphics().setDepth(51);
    this.hud.goal = this.add.text(width / 2, 89, '', {
      fontFamily: THEME.fontFamily, fontSize: 13, color: THEME.colors.text,
      fontStyle: 'bold', stroke: '#2c1810', strokeThickness: 3
    }).setOrigin(0.5, 0.5).setDepth(52);

    // Второй ряд: серия слева, шкала конкурентов справа.
    this.hud.combo = this.add.text(28, 89, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.successText, fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(51).setVisible(false);
    this.hud.rivals = this.add.graphics().setDepth(51);
  }

  updateHud() {
    if (!this.hud.day) return;
    this.hud.day.setText(this.shiftTitle());

    // Серия и конкуренты — второй ряд HUD. Показываем серию только когда она есть:
    // постоянный «Серия 0» — шум, который перестают замечать.
    if (this.hud.combo) {
      const on = this.combo >= ECONOMY.combo.minStreak;
      this.hud.combo.setVisible(on);
      if (on) this.hud.combo.setText(i18n.t('comboLabel', { n: this.combo }));
    }
    if (this.hud.rivals) {
      this.hud.rivals.clear();
      const cap = ECONOMY.rivals.capacity;
      const w = 18, gap = 6;
      const x0 = this.scale.width - 24 - (cap * w + (cap - 1) * gap);
      for (let i = 0; i < cap; i++) {
        this.hud.rivals.fillStyle(i < this.rivals ? THEME.colors.danger : 0x000000, i < this.rivals ? 1 : 0.3);
        this.hud.rivals.fillRoundedRect(x0 + i * (w + gap), 84, w, 10, 5);
      }
    }
    this.hud.coins.setText(String(this.progress.coins));

    // Полоса цели смены. В бесконечном режиме цели нет — и полосы тоже.
    if (this.hud.goalBar) {
      const w = this.scale.width;
      this.hud.goalBar.clear();
      if (this.shiftGoalShown > 0) {
        const frac = Math.min(1, shiftGoalFraction(this.dayCoins, this.shiftGoalShown));
        const bw = w * 0.30, bx = w / 2 - bw / 2, by = 82;
        this.hud.goalBar.fillStyle(0x000000, 0.45);
        this.hud.goalBar.fillRoundedRect(bx, by, bw, 15, 7);
        this.hud.goalBar.fillStyle(frac >= 1 ? THEME.colors.success : THEME.colors.accent, 1);
        this.hud.goalBar.fillRoundedRect(bx, by, bw * frac, 15, 7);
        this.hud.goal.setText(this.dayCoins + ' / ' + this.shiftGoalShown);
        this.hud.goal.setVisible(true);
      } else {
        this.hud.goal.setVisible(false);
      }
    }

    const m = Math.floor(this.dayTimeLeft / 60);
    const s = Math.ceil(this.dayTimeLeft % 60);
    this.hud.time.setText(m + ':' + String(s).padStart(2, '0'));
  }

  // Подпись смены: «Порт · Смена 2 из 5», на босс-смене — «Заказ Дона»,
  // после финала кампании — «Ночная смена N».
  shiftTitle() {
    const l = shiftLabel(this.campaign);
    if (l.endless) {
      const lines = [i18n.t('nightShift', { n: l.endlessDay + 1 })];
      // Условие ночи — второй строкой: игрок должен понимать, ПОЧЕМУ смена идёт иначе,
      // иначе удвоенное время готовки читается как баг.
      if (this.modifiers.length) lines.push(this.modifiers.map((m) => i18n.t('mod_' + m.id)).join(' · '));
      return lines;
    }
    if (this.bossShift) return [i18n.t('bossShift')];
    const d = currentDistrict(this.campaign);
    // Перевод строки, а не разделитель: название района бывает длинным
    // («Деловой квартал»), и одной строкой оно налезало на счётчик монет.
    const shift = i18n.t('shiftOf', { n: l.shift, of: l.of });
    return d ? [i18n.t('district_' + d.id), shift] : [shift];
  }

  // Задвинуть кнопку внутрь экрана. Ширина кнопки считается ПО ТЕКСТУ, а тексты у языков
  // разные: «+30с терпения за ролик» шире английского «+30s patience — ad» на 40 px, и при
  // фиксированном отступе от края русская кнопка вылезала за границу канваса на 12 px
  // (замер красной команды 12.08). Обрезанный элемент интерфейса — прямой пункт чек-листа
  // модерации, и обрезалась именно кнопка монетизации.
  clampToScreen(btn, margin = 12) {
    const half = btn.width / 2;
    const x = Math.min(this.scale.width - margin - half, Math.max(margin + half, btn.x));
    btn.setX(x);
    return btn;
  }

  // ── Кнопки управления днём ─────────────────────────────────────────────
  drawDayControls(width, height) {
    // Спасение очереди за рекламу (когда очередь есть).
    this.saveBtn = createButton(this, width - 130, height - 70,
      i18n.t('saveCustomers', { n: PATIENCE_BOOST_SECONDS }),
      () => this.saveCustomersAd(),
      { color: THEME.colors.accent, textColor: THEME.colors.textDark, fontSize: THEME.fontSize.tiny });
    this.clampToScreen(this.saveBtn);
    this.saveBtn.setVisible(false);

    // Выход в меню (с сохранением).
    createButton(this, 130, height - 70, i18n.t('toMenu'),
      () => this.exitToMenu(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });
  }

  // Куда светить на текущем шаге обучения. Прямоугольник в игровых координатах.
  // Считается по ЖИВЫМ объектам сцены, а не по константам: раскладка зависит от вьюпорта,
  // и жёстко прописанные числа рассинхронизировались бы с реальными кнопками.
  tutorialTarget(step) {
    const { width } = this.scale;
    if (step === 'pickCustomer') {
      const view = this.queueCards[0];
      if (!view) return null;
      return { x: view.x, y: view.y, w: view.width + 14, h: view.height + 14 };
    }
    if (step === 'rollDough') {
      const r = this.L.pizzaR;
      return { x: this.L.pizzaX, y: this.L.pizzaY, w: r * 2.3, h: r * 2.3 };
    }
    if (step === 'addSauce' || step === 'addCheese') {
      // Подсвечиваем ИМЕННО нужную плитку — ту, что уже обведена акцентом.
      const p = this.activePizza;
      const want = !p ? null : (step === 'addSauce' ? p.recipe.sauce : p.recipe.cheese);
      const tile = this.toppingButtons.find((b) => b.ingredientId === want) || this.toppingButtons[0];
      if (!tile) return null;
      return { x: tile.x, y: tile.y, w: tile.width + 12, h: tile.height + 12 };
    }
    if (step === 'toOven') {
      return { x: width / 2, y: this.L.actionY, w: 300, h: 90 };
    }
    if (step === 'takeFromOven') {
      const y = this.L.ovenY + this.L.ovenH / 2 + 46;
      return { x: this.L.ovenX, y, w: 110, h: 110 };
    }
    return null;
  }

  // Обучение закончилось (пройдено или пропущено) — больше не показываем никогда.
  onTutorialFinished() {
    this.tutorial = null;
    this.progress.tutorialDone = true;
    Save.update({ tutorialDone: true });
  }

  // Короткая обёртка: шаг снимается, только если обучение идёт.
  tutStep(id) { if (this.tutorial) this.tutorial.advance(id); }

  // СНЯТЬ ОВЕРЛЕЙ ОБУЧЕНИЯ. Он живёт ОТДЕЛЬНОЙ сценой поверх игровой и раньше умел
  // останавливаться только сам, изнутри, когда игрок дошёл до конца или нажал «Пропустить».
  // Стоило выйти в меню или дождаться конца смены прямо во время обучения — и затемнение с
  // подсказкой «Тапни по гостю» оставалось висеть поверх МЕНЮ и поверх экрана итога.
  // Это первая минута игры, то есть ровно то, что открывает модератор. Красная команда 12.08.
  closeTutorial() {
    if (this.tutorial) {
      this.tutorial = null;
      this.progress.tutorialDone = true;
      Save.update({ tutorialDone: true });
    }
    if (this.scene.isActive('Tutorial')) this.scene.stop('Tutorial');
  }

  // ── СПАВН КЛИЕНТОВ ─────────────────────────────────────────────────────
  spawnIntervalNow() {
    // Линейный рамп от start до min за spawnRampSeconds.
    const elapsed = DAY.durationSeconds - this.dayTimeLeft;
    const t = Math.min(1, elapsed / DAY.spawnRampSeconds);
    const base = DAY.spawnIntervalStart + (DAY.spawnIntervalMin - DAY.spawnIntervalStart) * t;
    return base * this.mods.spawnMult;   // «Наплыв» сокращает интервал
  }

  spawnCustomer() {
    if (this.ended) return;
    // Очередь полна — гость не приходит вовсе. Это не «потеря клиента»: он просто не
    // появляется, и игрок недополучает выручку. Так давление живёт на скорости работы,
    // а не на наказании за то, что уже начато.
    if (this.queue.length >= DAY.queueCapacity) {
      Analytics.event(EVENTS.QUEUE_FULL);
      return;
    }
    const recipes = this.unlockedRecipes();
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];
    // 60% — постоянный персонаж (с любимым заказом), 40% — случайный гость.
    //
    // ОДИН И ТОТ ЖЕ ПОСТОЯННЫЙ ГОСТЬ НЕ СТОИТ В ОЧЕРЕДИ ДВАЖДЫ. В первом районе их всего
    // двое, и без этой проверки очередь набивалась четырьмя одинаковыми Марио подряд —
    // одно лицо, одно имя, один спрайт (видно на скриншоте смоук-теста 2026-08-12).
    // Выглядит как ошибка отрисовки, а не как посетители пиццерии.
    const busy = new Set(this.queue.map((c) => c.customer && c.customer.id)
      .concat(this.baking.map((b) => b.cust.customer && b.cust.customer.id)));
    const customers = this.unlockedCustomers().filter((c) => !busy.has(c.id));
    let customer = null;
    if (customers.length && Math.random() < 0.6) {
      customer = customers[Math.floor(Math.random() * customers.length)];
    }
    const patienceAdd = upgradeEffect('patience', upgradeLevel(this.progress, 'patience'));
    // Тип гостя из открытых в этом районе. На босс-смене первый гость — человек Дона:
    // капо с пометкой donOrder, его нельзя терять.
    let patron = pickPatron(this.campaign.district);
    const donOrder = this.bossShift && !this._donOrderSpawned;
    if (donOrder) { patron = PATRONS.capo; this._donOrderSpawned = true; }

    // Ночной модификатор действует РОВНО как черта гостя (терпение, оплата, «только точные»),
    // поэтому он и вкладывается в патрона, а не заводит вторую систему множителей рядом.
    // id сохраняем: по нему считается заслуга «капо за 15 секунд» и уходит аналитика.
    if (this.modifiers.length) {
      const p = patron || { id: 'plain', patienceMult: 1, payMult: 1, exactOnly: false };
      patron = {
        ...p,
        patienceMult: (p.patienceMult ?? 1) * this.mods.patienceMult,
        payMult: (p.payMult ?? 1) * this.mods.payMult,
        exactOnly: !!p.exactOnly || this.mods.exactOnly
      };
    }
    const c = createCustomer({ recipe, customer, day: this.day, patienceAdd, eachStage: EACH_STAGE, patron });
    c.donOrder = donOrder;
    c.spawnAt = Date.now();
    // Человек Дона ничем не отличался от обычного гостя, хотя от его заказа зависит,
    // придётся ли переигрывать смену. Строка `donOrderHere` тоже лежала неиспользованной.
    if (donOrder) this.showBanner(i18n.t('donOrderHere'), THEME.colors.accentText);
    Audio.guest();
    this.queue.push(c);
    this.refreshQueueView();
    this.updateSaveBtnVisibility();

    // ОНБОРДИНГ: если игрок ещё ничего не выбрал (нет активной пиццы) — автоматически
    // открываем первый заказ в сборку. Иначе новичок смотрит на пустую рабочую зону и не
    // понимает, что надо кликнуть по карточке. Дальше он сам выбирает следующих.
    // ВО ВРЕМЯ ОБУЧЕНИЯ автовыбор отключён на шаге «тапни по гостю»: иначе игра сделает
    // это за игрока, шаг снимется сам, и человек не выполнит ровно то действие, которому
    // его учат. Дальше автовыбор снова работает — он же онбординг для остальных.
    const tutWaitsForTap = this.tutorial && this.tutorial.step && this.tutorial.step() === 'pickCustomer';
    if (this.prepUsed() === 0 && !tutWaitsForTap) {
      this.selectCustomer(c);
    }
  }

  // ── ОТРИСОВКА ОЧЕРЕДИ ──────────────────────────────────────────────────
  refreshQueueView() {
    const { width } = this.scale;
    // Уничтожаем старые карточки.
    this.queueCards.forEach((c) => c.destroy());
    this.queueCards = [];

    const top = this.L.queueTop;
    const slots = DAY.queueCapacity;
    const cardW = (width - 40 - (slots - 1) * 12) / slots;
    const cardH = this.L.queueH;
    const shown = this.queue.slice(0, slots);

    shown.forEach((cust, i) => {
      const x = 20 + cardW / 2 + i * (cardW + 12);
      const view = createCustomerView(this, cust, x, top + cardH / 2, cardW, cardH, {
        active: cust === this.activeCustomer,
        baking: this.baking.some((b) => b.cust === cust),
        onTap: () => this.selectCustomer(cust)
      });
      Input.register(this, view, () => this.selectCustomer(cust), { layer: null });
      cust._view = view;              // update() дёргает refresh() именно у него
      this.queueContainer.add(view);
      this.queueCards.push(view);
    });
  }

  selectCustomer(cust) {
    if (this.ended) return;
    if (this.baking.some((b) => b.cust === cust)) return;   // его пицца уже печётся

    // Гость уже на столе — просто переключаемся на его заготовку. Прежний запрет
    // «нельзя сменить клиента, пока пицца в сборке» УДАЛЁН: он и был тем, что убивало
    // решения, — порядок работы за игрока выбирала игра.
    const existing = indexOfCustomer(this.prep, cust);
    if (existing >= 0) { this.switchSlot(existing); return; }

    if (isFull(this.prep)) {
      // Молчаливый отказ читался бы как сломанный тап.
      this.showBanner(i18n.t('prepFull'), THEME.colors.dangerText);
      return;
    }

    // Заказ взят в работу: терпение замирает до самой выдачи. Иначе гость мог уйти,
    // пока его пицца собирается или печётся, и вся работа уходила в никуда — это и был
    // «порочный круг», из которого игрок не мог выбраться (жалоба 2026-08-11).
    cust.inWork = true;
    const i = assign(this.prep, { cust, pizza: startBuild(cust.recipe) });
    this.tutStep('pickCustomer');
    this.switchSlot(i);
  }

  // ── РАБОЧАЯ ЗОНА: отрисовка пиццы и контролов этапов ───────────────────
  refreshWorkZone() {
    const { width, height } = this.scale;
    this.workZone.removeAll(true);
    this.toppingButtons = [];

    const cx = this.L.pizzaX;
    const cy = this.L.pizzaY;
    const radius = this.L.pizzaR;

    if (!this.activePizza) {
      // Нет активного клиента — чёткая подсказка, куда смотреть.
      // Подсказка живёт в колонке ПИЦЦЫ, а не во всю ширину: справа стоит печь, и текст
      // на неё налезал. Ширина переноса — по свободному месту слева от печи.
      // Свободная колонка слева от печи: и ширина переноса, и ЦЕНТР считаются по ней,
      // иначе текст, отцентрованный по пицце, всё равно заезжает на печь.
      const freeRight = this.L.ovenX - this.L.ovenW / 2 - 16;
      const hintW = Math.max(200, freeRight - 40);
      const hintX = 20 + hintW / 2;
      this.workZone.add(drawArrowUp(this, hintX, cy - 54, 40));
      const hint = this.add.text(hintX, cy, i18n.t('pickOrderHint'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
        align: 'center', wordWrap: { width: hintW }
      }).setOrigin(0.5);
      this.workZone.add(hint);
      return;
    }

    const p = this.activePizza;

    // Подложка-доска.
    const board = this.add.graphics();
    board.fillStyle(THEME.colors.panel, 1);
    board.fillCircle(cx, cy, radius + 26);
    this.workZone.add(board);
    this.pizzaBoard = board; // сохраняем, чтобы refreshWorkZoneControlsOnly не снёс его

    // Сама пицца (перерисовывается в update через drawPizza).
    this.pizzaGraphics = this.add.graphics();
    this.workZone.add(this.pizzaGraphics);
    this.pizzaCenter = { x: cx, y: cy, r: radius };
    this.drawPizza();

    // Подложка под подписи этапа. На фоне-картинке (окно, столы, лампы) золотой текст
    // без плашки не читается — проверено скриншотом. Плашка тёмная и полупрозрачная,
    // чтобы не спорить с артом.
    const plate = this.add.graphics();
    this.stagePlate = plate;   // держим ссылку: иначе пересборка контролов её сносит
    plate.fillStyle(0x1a0f08, 0.72);
    plate.fillRoundedRect(24, this.L.stageStripY - 30, width - 48, this.L.stageHintY - this.L.stageStripY + 58, 16);
    this.workZone.add(plate);

    // Подпись этапа + подсказка.
    this.stageLabel = this.add.text(width / 2, this.L.stageLabelY, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stageHint = this.add.text(width / 2, this.L.stageHintY, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text
    }).setOrigin(0.5);
    this.workZone.add(this.stageLabel);
    this.workZone.add(this.stageHint);

    // Полоса этапов сборки: точки тесто→соус→сыр→топпинги→печь. Текущий — подсвечен,
    // пройденные — зелёные. Даёт игроку ощущение прогресса и понимание, сколько осталось.
    this.stageProgress = this.add.container(width / 2, this.L.stageStripY);
    this._stageProgressKey = null;   // контейнер новый — заставить updateStageProgress отрисовать
    this.workZone.add(this.stageProgress);

    // Контролы этапа (перерисовываются в updateStageUI).
    this.buildStageUI(cx, cy, radius, width);
    this._lastStage = null;
    this._lastOvenPhase = null;
    this._lastFinished = null;
    this.updateStageUI();
  }

  addWorkzoneHint(cx, cy, text) {
    const t = this.add.text(cx, cy, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text
    }).setOrigin(0.5);
    this.workZone.add(t);
  }

  // Отрисовать пиццу: вся геометрия — в render/pizza.js, здесь только сбор состояния.
  drawPizza() {
    if (!this.pizzaGraphics) return;
    const snap = pizzaSnapshot(this.activePizza);
    const inOven = snap && snap.inOven && !snap.finished;
    const ovenSt = inOven ? ovenState(this.activePizza, this.cookSeconds(), this.ovenWindowSeconds()) : null;
    drawPizzaInto(this.pizzaGraphics, snap, {
      x: this.pizzaCenter.x, y: this.pizzaCenter.y, r: this.pizzaCenter.r,
      ovenSt, cookSeconds: this.cookSeconds(), windowSeconds: this.ovenWindowSeconds()
    });
  }

  cookSeconds() {
    // Время готовки апгрейдом больше НЕ трогается: в схеме с парковкой печь не узкое
    // место (3 с готовки против 8.5-13 с сборки), ускорять её бессмысленно.
    // Ночной модификатор «печь остыла» — единственное, что его меняет.
    return OVEN.cookSeconds * this.mods.cookMult;
  }

  // Сколько пицца ждёт готовой, не сгорая. Апгрейд печи продлевает именно это — то есть
  // прямо лечит неприятность, которую игрок реально испытывает («не успел, сгорело»).
  ovenWindowSeconds() {
    const lvl = upgradeLevel(this.progress, 'ovenSpeed');
    return OVEN.windowSeconds + upgradeEffect('ovenSpeed', lvl);
  }

  // Контролы под текущий этап.
  buildStageUI(cx, cy, r, width) {
    const p = this.activePizza;
    if (!p) return;
    const stage = p.stage;

    // Этап dough: тап-зона по пицце (раскатка тапами).
    if (stage === STAGES.DOUGH) {
      const zone = this.add.zone(cx, cy, r * 2, r * 2).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        rollDough(p);
        Audio.dough(p.doughRolls);   // тон растёт с каждым тапом — слышно, что дело идёт
        if (p.stage !== STAGES.DOUGH) this.tutStep('rollDough');   // тесто раскатано
        this.drawPizza();
        this.updateStageUI();
      });
      this.workZone.add(zone);
    }

    // Этапы sauce/cheese: кнопки ингредиентов (тап вместо drag — см. NOTES, баланс не меняет).
    if (stage === STAGES.SAUCE || stage === STAGES.CHEESE) {
      const cats = stage === STAGES.SAUCE ? ['sauce'] : ['cheese'];
      const opts = Object.values(INGREDIENTS).filter((ing) => cats.includes(ing.category));
      // Подсветка нужной плитки — ПОДСКАЗКА, и её игрок может выключить (за надбавку).
      // Во время обучения она нужна всегда: там подсветка и есть урок.
      const wanted = stage === STAGES.SAUCE ? p.recipe.sauce : p.recipe.cheese;
      this.layoutIngredientRow(opts, width, (ing) => {
        if (stage === STAGES.SAUCE) { addSauce(p, ing.id); Audio.sauce(); this.tutStep('addSauce'); }
        else { addCheese(p, ing.id); Audio.cheese(); this.tutStep('addCheese'); }
        this.drawPizza();
        this.updateStageUI();
      }, this.hintsOn() ? wanted : null);
    }

    // Топпинги: ТОЛЬКО те, что встречаются в уже открытых рецептах, + кнопка «В печь».
    // Раньше лента показывала ВСЕ 7 топпингов игры всегда, включая те, что появятся лишь
    // в следующих районах, — жалоба 13.08: «зачем столько ингредиентов, если их никогда
    // не просят». В первом районе реально нужны 2-3 из 7, остальные пять — чистый шум.
    if (stage === STAGES.TOPPINGS) {
      const unlockedToppings = new Set(this.unlockedRecipes().flatMap((rc) => rc.toppings));
      const opts = Object.values(INGREDIENTS)
        .filter((ing) => ing.category === 'topping' && unlockedToppings.has(ing.id));
      // На топпингах нужных может быть несколько — подсвечиваем первый ещё не положенный.
      const snap = pizzaSnapshot(p);
      const placed = new Set(snap ? snap.toppings : []);
      const nextWanted = p.recipe.toppings.find((id) => !placed.has(id)) || null;
      this.layoutIngredientRow(opts, width, (ing) => {
        addTopping(p, ing.id);
        Audio.topping();
        this.drawPizza();
        this.updateStageUI();
      }, this.hintsOn() ? nextWanted : null);
      // Кнопка «В печь» (finishToppings) — снизу.
      const toOven = createButton(this, width / 2, this.L.actionY, i18n.t('toOven'), () => {
        finishToppings(p);
        this.drawPizza();
        this.updateStageUI();
      }, { color: THEME.colors.primary, fontSize: THEME.fontSize.small });
      this.workZone.add(toOven);
    }

    // Печь как ПАРКОВКА. Отправил пиццу — руки свободны, берёшь следующего гостя, а пицца
    // допекается сама; готовую забираешь тапом по слоту печи (она сразу уходит гостю).
    //
    // Так апгрейд «вторая духовка» наконец что-то значит: он расширяет число парковочных
    // мест. Раньше сцена умела ровно одну активную пиццу, слот второй печи не использовался
    // вообще — апгрейд продавался за 220 монет и не делал НИЧЕГО.
    if (stage === STAGES.OVEN && !p.inOven) {
      const free = this.baking.length < this.ovenCapacity();
      const put = createButton(this, width / 2, this.L.actionY,
        free ? i18n.t('stageOven') : i18n.t('ovenFull'),
        free ? () => this.parkInOven() : null,
        { color: free ? THEME.colors.danger : THEME.colors.neutral, fontSize: THEME.fontSize.small });
      this.workZone.add(put);
    }
  }

  // Показывать ли подсказки «куда тыкать». Во время обучения — ВСЕГДА: там подсветка и
  // есть урок, гасить её значило бы учить пустотой.
  hintsOn() {
    if (this.tutorial) return true;
    return this.progress.hintsOn !== false;
  }

  // Сколько пицц помещается в печи одновременно (базовый слот + апгрейд).
  ovenCapacity() {
    return OVEN.slots + upgradeLevel(this.progress, 'oven2');
  }

  // Отправить собранную пиццу в печь и освободить МЕСТО НА СТОЛЕ под следующий заказ.
  parkInOven() {
    const e = this.activeEntry;
    if (!e || e.pizza.inOven) return;
    if (this.baking.length >= this.ovenCapacity()) return;

    putInOven(e.pizza);
    Audio.toOven();
    this.tutStep('toOven');
    this.baking.push({ cust: e.cust, pizza: e.pizza });
    release(this.prep, this.activeSlot);
    this._lastStage = null;
    this.drawOvenSlots();

    // Освободившееся место не оставляем в фокусе, если на столе есть другая заготовка:
    // иначе игрок смотрит в пустую зону, имея начатую пиццу рядом.
    if (this.focusOccupied()) return;

    this.refreshQueueView();
    this.refreshWorkZone();
    this.drawPrepSlots();

    // Стол пуст — открываем следующего ожидающего сами. Это онбординг, а не автоигра:
    // ВТОРОЙ заказ игра за игрока не берёт, это его решение (в нём и вся глубина).
    const next = this.queue.find((c) => !c.served && !this.baking.some((b) => b.cust === c));
    if (next) this.selectCustomer(next);
  }

  // КОЛОНКА ЗАГОТОВОК слева. Пересобирается по событию (смена состава стола, смена этапа
  // активной пиццы), а не каждый кадр: это графика, её пересоздание не бесплатно.
  drawPrepSlots() {
    if (this.prepColumn) this.prepColumn.destroy();
    this.prepColumn = drawPrepColumn(this, this.prep.slots, this.activeSlot, {
      snapshotOf: pizzaSnapshot,
      onTap: (i) => { if (entryAt(this.prep, i)) this.switchSlot(i); }
    }).setDepth(5);
  }

  // СЛОТЫ ПЕЧИ: по одной мини-пицце на каждое парковочное место, под печью.
  // Кольцо вокруг слота показывает готовность и красится по фазе; готовый слот пульсирует,
  // чтобы игрок заметил его боковым зрением, не отрываясь от сборки. Тап = достать и выдать.
  drawOvenSlots() {
    if (this.ovenSlots) this.ovenSlots.destroy();
    this.ovenSlots = this.add.container(0, 0).setDepth(5);
    const cap = this.ovenCapacity();
    const size = 62;
    const gap = 12;
    const totalW = cap * size + (cap - 1) * gap;
    const x0 = this.L.ovenX - totalW / 2 + size / 2;
    const y = this.L.ovenY + this.L.ovenH / 2 + 46;

    for (let i = 0; i < cap; i++) {
      const entry = this.baking[i];
      const x = x0 + i * (size + gap);
      const g = this.add.graphics();
      // Пустое место — контур, занятое — пицца с кольцом готовности.
      if (!entry) {
        g.lineStyle(3, THEME.colors.panelLight, 0.9);
        g.strokeCircle(x, y, size / 2);
      } else {
        const st = ovenState(entry.pizza, this.cookSeconds(), this.ovenWindowSeconds());
        const snap = pizzaSnapshot(entry.pizza);
        g.fillStyle(THEME.colors.dough, 1);
        g.fillCircle(x, y, size / 2 - 6);
        if (snap && snap.sauce) { g.fillStyle(INGREDIENTS[snap.sauce].color, 0.9); g.fillCircle(x, y, size / 2 - 10); }
        if (st.phase === 'burning') { g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, size / 2 - 6); }
        const color = st.phase === 'ready' ? THEME.colors.success
          : st.phase === 'burning' ? THEME.colors.danger : THEME.colors.accent;
        // КОЛЬЦО-ШКАЛА, А НЕ ПРОСТО ЦВЕТ. Игрок жаловался: без нашей же подсказки не понимал,
        // что зелёное кольцо значит «готово» — цвет один в один читается только теми, кто уже
        // знает код. Кольцо растёт по часовой во время готовки (0→1 оборот = готова), а в
        // окне «доесть, пока не сгорела» СЖИМАЕТСЯ обратно до нуля — сама шкала показывает
        // и заполнение, и переполнение, а не заставляет запоминать, что означает цвет.
        const windowProgress = this.ovenWindowSeconds() / Math.max(0.1, this.cookSeconds());
        let fraction;
        if (st.phase === 'cooking') fraction = Math.min(1, st.progress);
        else if (st.phase === 'ready') fraction = Math.max(0, 1 - (st.progress - 1) / windowProgress);
        else fraction = 1;
        g.lineStyle(3, THEME.colors.panelLight, 0.5);
        g.strokeCircle(x, y, size / 2);
        if (fraction > 0.01) {
          const start = -Math.PI / 2;
          g.lineStyle(5, color, 1);
          g.slice(x, y, size / 2, start, start + Math.PI * 2 * fraction, false);
          g.strokePath();
        }

        const zone = this.add.zone(x, y, size + 12, size + 12).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => this.takeFromOven(entry));
        Input.register(this, zone, () => this.takeFromOven(entry), { layer: null });
        this.ovenSlots.add(zone);

        if (st.phase === 'ready' && !entry._pulse) {
          entry._pulse = true;
          const ring = this.add.graphics();
          ring.lineStyle(4, THEME.colors.success, 1);
          ring.strokeCircle(x, y, size / 2 + 8);
          this.ovenSlots.add(ring);
          this.tweens.add({ targets: ring, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });
        }
      }
      this.ovenSlots.add(g);
    }

    // СПАСТИ ПИЦЦУ ЗА РЕКЛАМУ — только когда что-то реально ГОРИТ. Раньше кнопка «Ускорить
    // за ролик» висела всё время, пока в печи хоть что-то есть, — в том числе когда пицца
    // уже ГОТОВА (доставать бесплатно, тапом по слоту). Игрок жаловался: «зачем кнопка
    // горит, если пицца уже готова» — а второй вопрос был по существу: ролик на площадке
    // идёт 15–30 с (замер 13.08), это ДОЛЬШЕ, чем сама готовка (6 с), так что как «ускорение»
    // кнопка не имела смысла вообще НИКОГДА — ждать самому быстрее. Единственный момент,
    // где реклама реально выгоднее ожидания: пицца уже пережаривается и через секунды
    // уйдёт браком — тогда цена (ролик) оправдана спасённым заказом. Целимся в САМУЮ
    // горящую заготовку, а не всегда в первый слот: печь на апгрейде держит несколько.
    const burning = this.baking.find((b) => ovenState(b.pizza, this.cookSeconds(), this.ovenWindowSeconds()).phase === 'burning');
    if (burning && !this.tutorial) {
      const inst = createButton(this, this.L.ovenX, y + 58, i18n.t('rescuePizza'),
        () => this.instantCookAd(burning.pizza),
        { color: THEME.colors.danger, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });
      this.clampToScreen(inst);
      this.ovenSlots.add(inst);
    }
  }

  // Достать из печи и сразу выдать гостю: пицца уже привязана к своему заказу,
  // отдельная кнопка «Выдать» была бы лишним тапом в игре про скорость.
  takeFromOven(entry) {
    if (this.ended || !entry) return;
    const idx = this.baking.indexOf(entry);
    if (idx < 0) return;
    takeOut(entry.pizza, this.cookSeconds(), this.ovenWindowSeconds());
    this.tutStep('takeFromOven');
    this.baking.splice(idx, 1);
    this.serveEntry(entry.cust, entry.pizza);
    this.drawOvenSlots();
  }

  // Ряд плиток-ингредиентов внизу рабочей зоны.
  //
  // Плитка = ИКОНКА + подпись. Раньше это был прямоугольник цвета ингредиента с одним
  // текстом внутри: подписи вроде «Барбекю соус» не помещались, а два похожих по цвету
  // ингредиента (моцарелла и сыр) отличались только чтением. Иконка решает и то, и другое —
  // и она же стоит в облачке заказа над гостем, так что глаз сопоставляет их напрямую.
  //
  // Подсветка нужного: на этапах соуса и сыра рецепт однозначен, поэтому правильная плитка
  // обводится акцентом. Это онбординг, а не подсказка-костыль: новичок за первую смену
  // запоминает соответствие «иконка в облачке = плитка внизу».
  layoutIngredientRow(opts, width, onTap, wantedId) {
    const y = this.L.ingredientsY;
    const n = opts.length;
    const tileW = Math.min(112, (width - 40) / Math.max(n, 1) - 8);
    const tileH = Math.min(104, tileW * 1.05);
    const iconSize = Math.min(44, tileW * 0.46);
    const totalW = n * tileW + (n - 1) * 8;
    const startX = (width - totalW) / 2 + tileW / 2;

    opts.forEach((ing, i) => {
      const x = startX + i * (tileW + 8);
      // Контейнер СТОИТ в (x, y); дети рисуются в ЛОКАЛЬНЫХ координатах относительно
      // его центра (0,0). Раньше контейнер стоял в (0,0), а дети — в (x,y): hit-area
      // контейнера (setSize вокруг 0,0) не совпадала с визуалом, и тап по видимой кнопке
      // проходил мимо → «кнопка есть, но не реагирует».
      const wanted = wantedId && ing.id === wantedId;
      const g = this.add.graphics();
      g.fillStyle(THEME.colors.panelLight, 1);
      g.fillRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, 12);
      g.lineStyle(wanted ? 4 : 2, wanted ? THEME.colors.accent : 0x000000, wanted ? 1 : 0.25);
      g.strokeRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, 12);

      const icon = drawIngredientIcon(this, 0, -tileH * 0.16, iconSize, ing.id);
      const t = this.add.text(0, tileH * 0.28, i18n.t('ing_' + ing.id), {
        fontFamily: THEME.fontFamily, fontSize: 15, color: THEME.colors.text,
        align: 'center', wordWrap: { width: tileW - 8 }
      }).setOrigin(0.5, 0);

      const cont = this.add.container(x, y, [g, icon, t]);
      cont.ingredientId = ing.id;   // по нему обучение находит нужную плитку
      cont.setSize(tileW, tileH);
      cont.setInteractive({ useHandCursor: true });
      cont.on('pointerover', () => cont.setScale(1.05));
      cont.on('pointerout', () => cont.setScale(1));
      cont.on('pointerup', () => onTap(ing));
      Input.register(this, cont, () => onTap(ing), { layer: null });
      this.workZone.add(cont);
      this.toppingButtons.push(cont);
    });
  }

  // Обновить подпись этапа/подсказку; при смене этапа — пересобрать контролы.
  updateStageUI() {
    const p = this.activePizza;
    if (!p || !this.stageLabel) return;
    let label = '', hint = '';
    switch (p.stage) {
      case STAGES.DOUGH:
        label = i18n.t('stageDough');
        hint = i18n.t('stageDoughHint', { n: Math.max(0, p.doughRollsNeeded - p.doughRolls) });
        break;
      // Строка «Тапни по пицце: Томатный соус» — это тоже подсказка: она называет ответ
      // словами. С выключенными подсказками остаётся только название этапа, а ЧТО класть,
      // игрок читает в облачке над гостем — оно не гаснет никогда.
      case STAGES.SAUCE:
        label = i18n.t('stageSauce');
        hint = this.hintsOn() ? i18n.t('tapHint') + ': ' + i18n.t('ing_' + p.recipe.sauce) : i18n.t('hintOffCheckOrder');
        break;
      case STAGES.CHEESE:
        label = i18n.t('stageCheese');
        hint = this.hintsOn() ? i18n.t('tapHint') + ': ' + i18n.t('ing_' + p.recipe.cheese) : i18n.t('hintOffCheckOrder');
        break;
      case STAGES.TOPPINGS:
        label = i18n.t('stageToppings');
        if (!p.recipe.toppings.length) hint = i18n.t('toOven');
        else if (!this.hintsOn()) hint = i18n.t('hintOffCheckOrder');
        else hint = i18n.t('tapHint') + ': ' + p.recipe.toppings.map((t) => i18n.t('ing_' + t)).join(', ');
        break;
      case STAGES.OVEN:
        if (!p.inOven) { label = i18n.t('stageOven'); hint = ''; }
        else {
          const st = ovenState(p, this.cookSeconds());
          if (st.phase === 'ready') { label = i18n.t('ovenReady'); hint = i18n.t('takeOut'); }
          else if (st.phase === 'burning') { label = i18n.t('ovenBurning'); hint = i18n.t('takeOut'); }
          else { label = i18n.t('ovenCooking'); hint = ''; }
        }
        break;
      case STAGES.DONE:
        label = p.ovenResult === OvenResult.DONE ? i18n.t('stageDone')
          : (p.ovenResult === OvenResult.BURNT ? i18n.t('ovenBurnt') : i18n.t('ovenRaw'));
        hint = i18n.t('serve');
        break;
    }
    this.stageLabel.setText(label);
    this.stageHint.setText(hint);
    this.updateStageProgress(p);

    // Пересобираем контролы при смене этапа/фазы печи/готовности.
    const phase = p.inOven ? ovenState(p, this.cookSeconds()).phase : null;
    if (this._lastStage !== p.stage || this._lastOvenPhase !== phase || this._lastFinished !== p.finished) {
      this._lastStage = p.stage;
      this._lastOvenPhase = phase;
      this._lastFinished = p.finished;
      this.refreshWorkZoneControlsOnly();
      // Миниатюра активной заготовки должна идти в ногу с большой пиццей, иначе игрок
      // видит на столе состояние, которого уже нет.
      this.drawPrepSlots();
    }
  }

  // Полоса этапов: пройденные с галочкой, текущий в кольце, будущие приглушены.
  // Раньше здесь была строка эмодзи — она рендерилась случайными глифами.
  updateStageProgress(p) {
    if (!this.stageProgress) return;
    const order = [STAGES.DOUGH, STAGES.SAUCE, STAGES.CHEESE, STAGES.TOPPINGS, STAGES.OVEN];
    // Ключ состояния: пересобираем иконки только когда картинка реально меняется,
    // а не каждый кадр (иконки — контейнеры с графикой, их пересоздание не бесплатно).
    const key = p.finished ? 'done' : p.stage;
    if (this._stageProgressKey === key) return;
    this._stageProgressKey = key;

    this.stageProgress.removeAll(true);
    const size = 30;
    const gap = 16;
    const total = order.length * size + (order.length - 1) * gap;
    order.forEach((s, i) => {
      const passed = order.indexOf(p.stage) > i || p.finished;
      const state = p.finished ? 'past' : (s === p.stage ? 'current' : (passed ? 'past' : 'future'));
      const x = -total / 2 + size / 2 + i * (size + gap);
      this.stageProgress.add(drawStageIcon(this, x, 0, size, s, state));
    });
  }

  // Пересобрать только кнопки этапа, не трогая пиццу/подпись.
  refreshWorkZoneControlsOnly() {
    const keep = new Set([this.pizzaBoard, this.pizzaGraphics, this.stageLabel, this.stageHint, this.stageProgress, this.stagePlate]);
    // Первые 3 ребёнка workZone — board, pizzaGraphics, stageLabel; stageHint 4-й. Доску оставляем.
    const children = [...this.workZone.list];
    children.forEach((c) => {
      // board (graphics без текста) оставляем — он первый. keep покрывает pizza/label/hint.
      if (!keep.has(c)) this.workZone.remove(c, true);
    });
    this.toppingButtons = [];
    const { width } = this.scale;
    this.buildStageUI(this.L.pizzaX, this.L.pizzaY, this.L.pizzaR, width);
  }

  // ── ВЫДАЧА ─────────────────────────────────────────────────────────────
  // Выдать конкретную пиццу конкретному гостю. Раньше метод работал только с «активной»
  // парой, но с печью-парковкой готовая пицца уже НЕ активна: она ждёт в слоте, пока игрок
  // собирает следующую.
  serveEntry(cust, p) {
    if (!p || !cust || !p.finished) return;
    // Гость уже ушёл — отдавать некому. Раньше пицца молча «выдавалась» призраку: игрок
    // получал деньги, а гость считался И потерянным, И обслуженным одновременно.
    // С заморозкой терпения это почти невозможно, но защита остаётся: молчаливое
    // двойное начисление хуже честного «заказ пропал».
    if (cust.lost) {
      this.combo = 0;
      this.showBanner(i18n.t('orderGone'), THEME.colors.dangerText);
      return;
    }

    // burnt/raw пицца = принудительно неточная.
    let check = checkPizza(pizzaAsServed(p), cust.recipe);
    if (p.ovenResult === OvenResult.BURNT || p.ovenResult === OvenResult.RAW) {
      check = { ...check, accuracy: Math.min(check.accuracy, 0.3), exact: false };
    }

    const serveMs = Date.now() - cust.spawnAt;
    const tipBonus = upgradeEffect('tipBonus', upgradeLevel(this.progress, 'tipBonus'));
    // Серия точных заказов идёт в тот же множитель чаевых, что и апгрейд: игроку не надо
    // держать в голове две отдельные системы, он просто видит, что за аккуратность платят.
    const rew = serveReward(cust, { serveMs, tipUpgradeBonus: tipBonus + this.comboBonus(), check });

    // Надбавка за игру без подсказок. Считается ПОСЛЕ награды и меняет только монеты:
    // точность, серия и звёзды от режима не зависят, иначе одно решение игрока начало бы
    // тянуть за собой всю систему оценок.
    if (!this.hintsOn()) rew.coins = Math.round(rew.coins * (1 + ECONOMY.noHintsBonus));

    this.dayCoins += rew.coins;
    this.dayTips += rew.tip;
    this.dayServed += 1;
    this.progress.coins += rew.coins;

    // Серия: считается ПОСЛЕ награды, чтобы текущая выдача оплачивалась по прежнему
    // множителю, а не по будущему — иначе первая точная пицца уже давала бы бонус за серию.
    const st = this.progress.stats;
    st.servedTotal += 1;
    if (p.ovenResult === OvenResult.BURNT) st.burntTotal += 1;
    // Ананас тому, кто его не просил — заслуга-шутка. Проверяем по факту нанесения.
    const served = pizzaAsServed(p);
    const gotPineapple = served && ((Array.isArray(served.toppings) && served.toppings.includes('pineapple'))
      || (served.toppings && typeof served.toppings.has === 'function' && served.toppings.has('pineapple')));
    if (gotPineapple && !cust.recipe.toppings.includes('pineapple')) st.pineappleTroll += 1;
    // Капо, обслуженный быстрее 15 секунд.
    if (cust.patron && cust.patron.id === 'capo' && serveMs < 15000) st.fastCapo += 1;
    if (cust.donOrder && rew.exact) st.donOrdersOk += 1;

    if (rew.exact) {
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      st.bestCombo = Math.max(st.bestCombo, this.combo);
      if (this.combo >= ECONOMY.combo.minStreak) Analytics.event(EVENTS.COMBO_REACHED, { streak: this.combo });
    } else {
      this.combo = 0;
    }

    // Заказ Дона: точная и вовремя — взнос в дань, иначе минус. Влияет на дань, а не на
    // кошелёк: это обязательство перед семьёй, а не выручка.
    if (cust.donOrder) {
      const ok = rew.exact;
      this.dayCoins += ok ? ECONOMY.donOrder.bonus : -ECONOMY.donOrder.penalty;
      Analytics.event(EVENTS.DON_ORDER_RESULT, { ok });
      this.showBanner(ok ? i18n.t('donOrderOk') : i18n.t('donOrderFail'),
        ok ? THEME.colors.successText : THEME.colors.dangerText);
    }

    // Аналитика.
    Analytics.event(EVENTS.PIZZA_SERVED, { accuracy: Math.round(rew.accuracy * 100), exact: rew.exact, speed: Math.round(rew.speed * 100) / 100 });
    if (p.ovenResult === OvenResult.BURNT || p.ovenResult === OvenResult.RAW) {
      Analytics.event(EVENTS.PIZZA_SPOILED, { result: p.ovenResult });
    }

    // Убираем клиента из очереди. Место на столе освобождаем ТОЛЬКО если пицца ещё там:
    // из печи она выдаётся уже после release в parkInOven, и второго освобождения быть
    // не должно — иначе снесли бы чужую заготовку с того же индекса.
    cust.inWork = false;
    this.queue = this.queue.filter((c) => c !== cust);
    const slot = indexOfCustomer(this.prep, cust);
    if (slot >= 0) { release(this.prep, slot); this._lastStage = null; }
    this.focusOccupied();

    // JUICE: всплывающий «+N монет» с оценкой качества. Игрок видит, сколько заработал и
    // насколько хорошо собрал — это и обратная связь, и ощущение награды (иначе подача
    // «молча» выглядит как «что-то произошло, непонятно что»).
    // Звук выдачи по КАЧЕСТВУ, а не по факту: игрок жаловался, что «брак» пролетает
    // незамеченным. Ухом ошибка слышна сразу, даже если глаз в это время на очереди.
    if (rew.accuracy >= 0.99 && p.ovenResult === OvenResult.DONE) { Audio.serveGood(); Audio.coin(); }
    else Audio.serveBad();

    this.showServeFeedback(rew, this.spoilReason(p, check));

    this.refreshQueueView();
    this.refreshWorkZone();
    this.drawPrepSlots();
    this.updateHud();
    this.updateSaveBtnVisibility();
    Save.update({ coins: this.progress.coins });

    // QoL: если стол опустел совсем, мягко открываем следующий ожидающий заказ (через
    // паузу, чтобы игрок успел прочитать pop-up награды). Условие именно «стол ПУСТ», а не
    // «нет активной пиццы»: игра не должна занимать второе место стола за игрока — выбор
    // «брать ли ещё один заказ» и есть та глубина, ради которой стол заводили.
    const next = this.queue.find((c) => !c.served && !this.baking.some((b) => b.cust === c));
    if (next) {
      this.time.delayedCall(650, () => {
        if (!this.ended && this.prepUsed() === 0 && this.queue.includes(next)) this.selectCustomer(next);
      });
    }
  }

  // Множитель чаевых от серии. Ниже minStreak серии ещё нет.
  comboBonus() {
    if (this.combo < ECONOMY.combo.minStreak) return 0;
    return Math.min(ECONOMY.combo.max, (this.combo - ECONOMY.combo.minStreak + 1) * ECONOMY.combo.step);
  }

  // Короткое сообщение поверх сцены: событие произошло, игрок должен его заметить.
  showBanner(text, color) {
    const { width } = this.scale;
    const t = this.add.text(width / 2, this.L.counterY + 60, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color,
      fontStyle: 'bold', align: 'center', stroke: '#2c1810', strokeThickness: 6,
      wordWrap: { width: width - 60 }
    }).setOrigin(0.5).setDepth(220);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1800, ease: 'Cubic.out',
      onComplete: () => t.destroy() });
  }

  // ПОЧЕМУ брак. Без этого игрок видит «Брак» и не понимает, что сделал не так — жалоба
  // 2026-08-11: «пишется брак, а я вроде всё правильно кладу». Сначала называем самую
  // грубую причину (печь), потом состав.
  spoilReason(pizza, check) {
    if (pizza.ovenResult === OvenResult.BURNT) return i18n.t('whyBurnt');
    if (pizza.ovenResult === OvenResult.RAW) return i18n.t('whyRaw');
    if (check.missing && check.missing.length) {
      return i18n.t('whyMissing', { what: check.missing.map((id) => i18n.t('ing_' + id)).join(', ') });
    }
    if (check.extra && check.extra.length) {
      return i18n.t('whyExtra', { what: check.extra.map((id) => i18n.t('ing_' + id)).join(', ') });
    }
    return null;
  }

  // Всплывающая оценка подачи: «+N», качество, причина брака; подъём и затухание.
  showServeFeedback(rew, reason) {
    const { width, height } = this.scale;
    const cx = width / 2;
    // Всплывашка стартует НАД ПИЦЦЕЙ и уходит вверх. Раньше она начиналась на 0.42
    // высоты — ровно там, где подписи этапа, и текст читался поверх текста.
    const cy = height * 0.55;
    const quality = rew.accuracy >= 0.99 ? i18n.t('great')
      : rew.accuracy >= 0.6 ? i18n.t('good') : i18n.t('bad');
    const qColor = rew.accuracy >= 0.99 ? THEME.colors.accentText
      : rew.accuracy >= 0.6 ? THEME.colors.successText : THEME.colors.dangerText;
    const lines = ['+' + rew.coins, quality];
    if (reason) lines.push(reason);
    const pop = this.add.text(cx, cy, lines, {
      fontFamily: THEME.fontFamily,
      // С причиной текст длиннее — берём размер поменьше, иначе он не влезает в ширину.
      fontSize: reason ? THEME.fontSize.small : THEME.fontSize.big,
      color: qColor, fontStyle: 'bold', align: 'center',
      stroke: '#000000', strokeThickness: 6, lineSpacing: 3
    }).setOrigin(0.5).setDepth(200);
    // 1900 мс вместо 1100: игрок жаловался, что текст улетает раньше, чем его прочтёшь,
    // и брак замечался, только если специально присматриваться. Этого хватало для короткой
    // строки «+N, отлично», но с причиной брака («Сгорела!») читать нужно втрое больше слов —
    // повторная жалоба 13.08: «пиццы все горелые были, я даже не видела». Причина держится
    // на месте ПЕРЕД тем, как улететь (delay), а не просто летит дольше: неподвижный текст
    // читается быстрее убегающего той же общей длительности.
    this.tweens.add({
      targets: pop, y: cy - 130, alpha: 0,
      delay: reason ? 1000 : 0, duration: 1900, ease: 'Cubic.out',
      onComplete: () => pop.destroy()
    });
    // Лёгкая пульсация HUD монет — обратная связь, что кошелёк вырос.
    if (this.hud.coins) {
      this.tweens.add({ targets: this.hud.coins, scale: 1.25, duration: 120, yoyo: true });
    }
  }

  // ── РЕКЛАМА: мгновенная готовка / спасение очереди ─────────────────────
  //
  // Обе точки — ВОЗНАГРАЖДАЕМЫЙ ролик (`Ads.showRewarded` → `ysdk.adv.showRewardedVideo`),
  // а не полноэкранная. Проверено не только по коду: на живом черновике 13.08 подменили
  // ОБА метода SDK и нажали кнопку — сработал ровно `showRewardedVideo`.
  //
  // МОЛЧАНИЕ ПРИ НЕУДАЧЕ БЫЛО ДЫРОЙ. Если площадка закрыла ролик без награды (не досмотрел,
  // нет подходящего ролика, ошибка показа), не происходило РОВНО НИЧЕГО: игрок посмотрел
  // рекламу и не получил ни награды, ни объяснения — со стороны это неотличимо от «мне
  // показали обычную рекламу просто так». Теперь игра честно говорит, что награды не будет.
  instantCookAd(pizza) {
    if (!pizza || !pizza.inOven || pizza.finished) return;
    this.usedRewardThisShift = true;
    let ok = false;
    Ads.showRewarded({
      onRewarded: () => {
        ok = true;
        instantCook(pizza);
        Analytics.event(EVENTS.INSTANT_COOK);
        this.drawOvenSlots();
      },
      onClose: () => { if (!ok && !this.ended) this.showBanner(i18n.t('adNoReward'), THEME.colors.dangerText); }
    });
  }

  saveCustomersAd() {
    this.usedRewardThisShift = true;
    let ok = false;
    Ads.showRewarded({
      onRewarded: () => {
        ok = true;
        this.queue.forEach((c) => addPatience(c, PATIENCE_BOOST_SECONDS));
        Analytics.event(EVENTS.REWARD_SAVE_CUSTOMERS);
        this.refreshQueueView();
      },
      onClose: () => { if (!ok && !this.ended) this.showBanner(i18n.t('adNoReward'), THEME.colors.dangerText); }
    });
  }

  updateSaveBtnVisibility() {
    this.saveBtn.setVisible(this.queue.length > 0 && !this.ended);
  }

  // ── UPDATE: тик дня ────────────────────────────────────────────────────
  update(time, delta) {
    if (this.ended || !this.ready) return;   // ready ставится в конце create (async)
    const dt = delta / 1000;

    // Таймер дня.
    this.dayTimeLeft -= dt;
    if (this.dayTimeLeft <= 0) { this.dayTimeLeft = 0; this.updateHud(); this.endDay(); return; }

    // Спавн клиентов.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnCustomer();
      this.spawnTimer = this.spawnIntervalNow();
    }

    // Тик терпения очереди. ВО ВРЕМЯ ОБУЧЕНИЯ терпение стоит: иначе игра наказывает за то,
    // что человек читает подсказку — на смоук-тесте 2026-08-12 первый же гость ушёл
    // «к конкурентам» прямо под надписью «Тапни по гостю». Обучение длится секунд
    // пятнадцать и снимается действиями игрока, так что застрять в этой паузе нельзя;
    // таймер смены при этом идёт как обычно.
    const dtQueue = this.tutorial ? 0 : dt;
    let lost = [];
    this.queue.forEach((c) => {
      const res = tickPatience(c, dtQueue);
      if (res.lost && !c.served) lost.push(c);
      if (c._view) c._view.refresh();
    });
    if (lost.length) {
      Audio.guestLost();
      lost.forEach((c) => {
        this.dayLost += 1;
        this.combo = 0;                       // ушедший гость рвёт серию так же, как брак
        this.rivals += ECONOMY.rivals.perLost;
        Analytics.event(EVENTS.CUSTOMER_LOST);
      });
      this.queue = this.queue.filter((q) => !lost.includes(q));

      // Конкуренты через дорогу: шкала заполнилась — уводят первого в очереди.
      // Это и напряжение, и смысл кнопки «+30с терпения всем» за рекламу.
      if (this.rivals >= ECONOMY.rivals.capacity) {
        this.rivals = 0;
        const stolen = this.queue.find((c) => c !== this.activeCustomer && !c.served && !c.inWork);
        if (stolen) {
          this.queue = this.queue.filter((c) => c !== stolen);
          this.dayLost += 1;
          Analytics.event(EVENTS.RIVALS_STOLE);
          this.showBanner(i18n.t('rivalsStole'), THEME.colors.dangerText);
        }
      }
      this.refreshQueueView();
      this.updateSaveBtnVisibility();
    }

    // Тик ВСЕХ печей. Перерисовываем слоты только при смене фазы: слоты — это графика,
    // пересобирать её каждый кадр незачем.
    if (this.baking.length) {
      let phaseChanged = false;
      this.baking.forEach((b) => {
        tickOven(b.pizza, dt, this.cookSeconds());
        const phase = ovenState(b.pizza, this.cookSeconds(), this.ovenWindowSeconds()).phase;
        if (b._phase !== phase) {
          b._phase = phase;
          phaseChanged = true;
          // Звук печи — не украшение: в схеме с парковкой игрок в этот момент собирает
          // следующую пиццу и на печь не смотрит. Ухом он узнаёт раньше, чем глазом.
          if (phase === 'ready') Audio.ovenReady();
          else if (phase === 'burning') Audio.ovenBurning();
        }
      });
      if (phaseChanged) this.drawOvenSlots();
      // Устье печи светится по самой «срочной» фазе: горит важнее, чем готово.
      const phases = this.baking.map((b) => b._phase);
      const worst = phases.includes('burning') ? 'burning'
        : phases.includes('ready') ? 'ready' : 'cooking';
      if (this.oven) this.oven.setGlow(worst);
    } else if (this.oven) {
      this.oven.setGlow('idle');
    }

    this.updateHud();

    // Межстраничной рекламы ВНУТРИ смены нет намеренно. Прежний код с порогом 150 с при
    // длине смены 90 с не срабатывал никогда (счётчик обнулялся вместе со сценой) — то есть
    // был мёртвым. Возвращать его не стали: реклама посреди активной готовки — прерывание в
    // худшем месте, а показ между сменами уже даёт интервал около трёх минут, что попадает
    // в рекомендованные 120–240 с.
  }

  // ── КОНЕЦ ДНЯ ──────────────────────────────────────────────────────────
  endDay() {
    if (this.ended) return;
    this.ended = true;
    this.closeTutorial();   // иначе подсказка обучения висит поверх экрана итога
    YA.gameplayStop();

    const score = this.dayCoins;
    // Звёзды — по выручке относительно цели смены (дань района / число смен), потери
    // работают как потолок. Доля обслуженных больше не годится: с ограниченной очередью
    // гости не уходят, доля всегда равна единице и три звезды выдавались всегда.
    const goal = this.shiftGoal;
    const stars = shiftStars({ coins: score, lost: this.dayLost, target: goal, thresholds: ECONOMY.starTargets });
    this.progress.bestScore = Math.max(this.progress.bestScore, score);
    this.progress.bestDay = Math.max(this.progress.bestDay, this.day);

    // Смена закрывается через кампанию: она сама решает, идём дальше, открываем район
    // или переигрываем (дань не собрана / на босс-смене ушёл гость). До вызова снимаем
    // снимок состояния — DayEnd показывает, ЧТО было целью, а не то, что стало после.
    const districtBefore = currentDistrict(this.campaign);
    const wasBoss = this.bossShift;
    const result = completeShift(this.campaign, { coinsEarned: score, lost: this.dayLost });
    const tribute = tributeState(this.campaign);

    // Статистика смены — до выдачи достижений, иначе заслуга за эту же смену не выдастся.
    const st = this.progress.stats;
    // «Никто не ушёл» требует, чтобы кто-то ПРИШЁЛ и был обслужен: смена, где игрок не
    // сделал ничего, тоже заканчивается с нулём потерянных, и заслуга выдавалась за
    // бездействие — то есть за пустую смену капали монеты (красная команда 12.08).
    if (this.dayLost === 0 && this.dayServed > 0) st.cleanShifts += 1;
    if (stars === 3 && !this.usedRewardThisShift) st.cleanNoAdShifts += 1;
    if (result.outcome === 'nextDistrict' || result.outcome === 'campaignDone') st.districtsDone += 1;
    if (this.campaign.done) st.nightShifts += 1;
    if (upgradeLevel(this.progress, 'oven2') > 0) st.oven2Bought = 1;

    const unlocked = claimUnlocks(this.progress);
    unlocked.forEach((a) => {
      Analytics.event(EVENTS.ACHIEVEMENT_UNLOCKED, { id: a.id });
      Platform.achievements.unlock(a.id);
    });

    Analytics.event(EVENTS.SHIFT_REVENUE, { coins: score });
    Analytics.event(EVENTS.DAY_COMPLETE, {
      day: this.day, stars, served: this.dayServed, lost: this.dayLost, outcome: result.outcome
    });
    if (result.outcome !== 'retryShift') Analytics.event(EVENTS.PROGRESS_REACHED, { day: this.day, stars });
    if (result.outcome === 'retryShift') Analytics.event(EVENTS.DAY_FAILED, { day: this.day });

    // Сохраняем перед переходом.
    Save.update({
      campaign: this.campaign, coins: this.progress.coins, upgrades: this.progress.upgrades,
      bestScore: this.progress.bestScore, bestDay: this.progress.bestDay,
      stats: this.progress.stats, achievements: this.progress.achievements
    });

    // Переход на экран конца смены (несёт результаты через registry).
    this.scene.launch('DayEnd', {
      day: this.day, coins: score, tips: this.dayTips, served: this.dayServed,
      lost: this.dayLost, stars, progress: this.progress,
      outcome: result.outcome, wasBoss, goal: goal,
      districtId: districtBefore ? districtBefore.id : null,
      tributeHave: tribute.have, tributeNeed: tribute.need,
      unlocked, wasTutorial: this.isTutorialShift
    });
    this.scene.pause();
  }

  // ── ВЫХОД В МЕНЮ ───────────────────────────────────────────────────────
  async exitToMenu() {
    this.closeTutorial();   // иначе затемнение обучения остаётся поверх меню
    // Смена останавливается ДО отсчёта рекламы: иначе три секунды отсчёта продолжали бы
    // жечь таймер дня и терпение гостей за спиной у затемнения.
    this.ended = true;
    YA.gameplayStop();
    Analytics.event(EVENTS.SESSION_END, { day: this.day, coins: this.progress.coins });
    Save.update({
      campaign: this.campaign, coins: this.progress.coins, upgrades: this.progress.upgrades,
      bestScore: this.progress.bestScore, bestDay: this.progress.bestDay
    });
    await Save.flush();
    this.scene.stop('DayEnd');
    // ВЫХОД В МЕНЮ — ТОЖЕ ЛОГИЧЕСКИЙ ПЕРЕХОД, и он монетизируется. Без этого игрок, который
    // бросает смену на середине, не приносит вообще ничего: единственный автоматический показ
    // был на конце смены, а до него такой игрок не доходит.
    showInterstitial(this, () => this.scene.start('Menu'));
  }

  cleanup() {
    // Сцена снимается — ничего висящего не оставляем (подписки на bus здесь не ставили).
  }
}
