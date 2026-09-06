// Game: мойка машин. Тап + авто-бригада чистят текущую машину, за домытую — монеты.
// Апгрейды, достижения и престиж — в ShopOverlay. Вся арифметика — в mechanics/carwash.js,
// сцена только рисует и решает, что и когда сохранять/показывать.
//
// Сознательно БЕЗ ежедневного бонуса и оффлайн-дохода (были и убраны 2026-08-23, решение
// владельца): в короткой idle-сессии (~10 мин) бесплатные деньги «просто за вход» и «за то,
// что не играл» сокращают, а не продлевают игру — игроку сразу нечего покупать. Оставлены
// только бонусы, требующие реальной игры (недельный трек, VIP-заказы, коллекция).
import { YA } from '../yandex/sdk.js';
import { Ads } from '../yandex/ads.js';
import { Platform } from '../platform/index.js';
import { Save } from '../yandex/save.js';
import { Leaderboard } from '../yandex/leaderboard.js';
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { createPanel } from '../ui/Panel.js';
import { i18n } from '../i18n/strings.js';
import { fmt } from '../ui/format.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { TIERS, TIER_WEIGHTS, PLAYER_BASE, UPGRADES, TIPS, ECONOMY, QUESTS, BADGES, LOCATIONS, WEEKLY, VIP, BAYS, BAY_LAYOUT } from '../data/balance.js';
import { getIsoWeekKey, newlyReachedMilestones } from '../core/weekly.js';
import { createCarWash } from '../mechanics/carwash/carwash.js';
import { ShopOverlay } from '../ui/ShopOverlay.js';
import { showAdCountdown } from '../ui/adCountdown.js';

// state.collection[tierId] = массив bool по индексу варианта окраски (см. TIERS.variants).
function defaultCollection() {
  const c = {};
  for (const t of TIERS) c[t.id] = (t.variants || ['']).map(() => false);
  return c;
}

function defaultState() {
  return {
    coins: 0, gems: 0, reputation: 0,
    levels: { sponge: 0, crew: 0, turbo: 0, speed: 0 },
    washedTotal: 0, earnedTotal: 0, tapsTotal: 0,
    badges: [], quest: null,
    prestigeCount: 0,
    collection: defaultCollection(),
    // Недельный трек: weekKey — ISO-неделя последнего обновления (см. core/weekly.js),
    // weeklyWashed — машин вымыто за ЭТУ неделю, weeklyClaimed — какие этапы уже награждены.
    weekKey: '', weeklyWashed: 0, weeklyClaimed: WEEKLY.milestones.map(() => false),
    // Постов мойки: у новых игроков и старых сейвов без поля — BAYS.startCount (Object.assign
    // в create() берёт это значение, если в загруженном сейве ключа нет). НЕ сбрасывается
    // престижем — как collection/badges, а не как levels.
    baysOwned: BAYS.startCount
  };
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  async create() {
    // Найдено красной командой 05.08: Phaser переиспользует ОДИН экземпляр сцены между
    // рестартами (Menu → Играть → Menu → Играть снова), а create() асинхронный (await
    // Save.load() ниже) — в окне между стартом сцены и концом этой функции update() уже
    // может вызываться Phaser'ом, а this.state/this.bays/this.questText ещё держат
    // значения ПРЕДЫДУЩЕЙ сессии (в т.ч. уже уничтоженные GameObject'ы вроде questText) —
    // update() их использовал и падал (Cannot read properties of null/undefined). Флаг
    // ready — единственный точный сигнал «создание сцены реально завершилось», в отличие
    // от проверки state/bays, которые остаются truthy от старой сессии всю дорогу до
    // синхронного пересоздания ниже.
    this.ready = false;
    this.engine = createCarWash({
      tiers: TIERS, tierWeights: TIER_WEIGHTS, playerBase: PLAYER_BASE, upgrades: UPGRADES, vip: VIP,
      reputationIncomePerStar: ECONOMY.reputationIncomePerStar, boostMult: ECONOMY.boostMult
    });

    Input.setup(this);
    Analytics.event(EVENTS.GAME_START);

    const loaded = await Save.load();
    this.state = Object.assign(defaultState(), loaded || {});
    this.state.levels = Object.assign({ sponge: 0, crew: 0, turbo: 0, speed: 0 }, this.state.levels || {});
    // Санитайз baysOwned (находка финального ревью 2026-08-01): localStorage правится игроком
    // напрямую, испорченное/руками вписанное значение 0/NaN/огромное давало бы либо немой
    // софтлок (bayLayout() строит ноль постов, машины не спавнятся, ошибки нет), либо сотни
    // лишних игровых объектов. Phaser.Math.Clamp сам NaN не лечит (Math.min/max с NaN даёт
    // NaN обратно) — Number.isFinite-проверка ПЕРЕД clamp обязательна, иначе битый сейв
    // проходит мимо защиты.
    this.state.baysOwned = Phaser.Math.Clamp(
      Number.isFinite(this.state.baysOwned) ? this.state.baysOwned : BAYS.startCount,
      BAYS.startCount, BAYS.maxCount
    );
    this.state.badges = this.state.badges || [];
    // Слияние по тирам на случай старого сейва без коллекции (или если TIERS.variants
    // когда-нибудь изменится длиной) — не теряем уже отмеченное, дополняем недостающее.
    const loadedCollection = this.state.collection || {};
    this.state.collection = defaultCollection();
    for (const t of TIERS) {
      const have = loadedCollection[t.id];
      if (Array.isArray(have)) {
        for (let i = 0; i < this.state.collection[t.id].length; i++) {
          if (have[i]) this.state.collection[t.id][i] = true;
        }
      }
    }
    // Санитайз старых сейвов: до фикса carValue() монеты копились дробными (репутация/
    // турбо-множители без округления), в квестах вылезал float-мусор. Округляем один раз
    // при загрузке, чтобы старый прогресс не тащил накопленную дробь дальше.
    this.state.coins = Math.floor(this.state.coins);
    this.state.gems = Math.floor(this.state.gems);
    if (this.state.quest) this.state.quest.progress = Math.floor(this.state.quest.progress);

    this.checkWeekRollover();

    this.boostUntil = 0;   // реальное время (Date.now()) — буст идёт и во время показа рекламы
    this.adTimer = 0;
    this.adArmed = false;
    // Найдено красной командой 05.08: Phaser переиспользует ОДИН и тот же экземпляр сцены
    // между рестартами (Menu → Играть → Menu → Играть снова), свойства на `this` не
    // обнуляются сами. buildBackground() ниже смотрит на this.bg, чтобы решить —
    // переиспользовать существующий фон (нужно для смены локации ВНУТРИ сессии на
    // престиже, см. doPrestige()) или создать новый. Без явного сброса на втором «Играть»
    // this.bg указывал на УЖЕ УНИЧТОЖЕННЫЙ Image из прошлой сессии — setTexture() на нём
    // падал (Cannot read properties of null (reading 'cut')), краш на каждом повторном
    // входе в игру. Обнуляем здесь — единственная точка входа в create() сцены.
    this.bg = null;

    this.buildBackground();
    this.buildBays();
    this.buildHud();
    this.buildQuestBanner();
    this.buildShopButton();

    this.shop = new ShopOverlay(this, this.shopApi());
    this.shop.onClose = () => this.maybeShowAd();

    if (!this.state.quest) this.newQuest();
    for (let i = 0; i < this.bays.length; i++) this.spawnCar(i);
    this.refreshHud();

    Ads.showBanner(); // sticky-баннер — доход за время сессии, а не только за interstitial (RELEASE-CHECKLIST C6М)
    this.persist();
    // Найдено параллельным аудитом 05.08: раньше звался в самом начале create() —
    // до await Save.load(), до this.ready. SDK репортовал «геймплей начался» до того, как
    // сцена реально стала играбельной. Перенесено сюда — рядом с this.ready, когда сцена
    // ДЕЙСТВИТЕЛЬНО готова.
    YA.gameplayStart();
    this.ready = true; // см. комментарий в начале create() — теперь update() может работать
  }

  // ---- Постройка сцены --------------------------------------------------------
  buildBackground() {
    const { width, height } = this.scale;
    // Точка = косметика: локация по числу престижей, дальше последней в списке не идём
    // (LOCATIONS.length-1 — «навсегда» верхняя граница, решение пользователя 2026-07-31:
    // сначала косметическая прогрессия, полноценный менеджмент сети — отдельный этап).
    const loc = this.currentLocation();
    if (this.bg) { this.bg.setTexture(loc.bg).setDisplaySize(width, height); this.repositionBays(loc); return; }
    this.bg = this.add.image(width / 2, height / 2, loc.bg).setDisplaySize(width, height).setDepth(0);
  }

  // Смена локации (престиж) двигает весь кластер КАЖДОГО поста («машина + подсказка/
  // полоса грязи/VIP-бейдж/кнопка мгновенной мойки») на новый carY — иначе кластеры
  // остаются там, где были при buildBays(), и не совпадают с полом новой локации.
  // X постов не трогаем — только Y, общий для всех постов на локации.
  repositionBays(loc) {
    if (!this.bays || !this.bays.length) return;
    // Портал теперь есть у ВСЕХ ТРЁХ локаций (bay_portal, garage_door_portal,
    // showroom_podium) — «портал → портал другой локации» тоже смена, не только
    // «портал → без портала».
    // Сравниваем текстуру текущего портала с loc.portal (не просто truthy-проверку, как
    // было раньше, когда портал был только у bay): не совпадает — старый под снос, новый
    // (если задан у loc) строится заново с актуальными portalFloorY/шириной для ЭТОЙ
    // локации. Проверка НЕЗАВИСИМА от раннего возврата по carY ниже — иначе смена портала
    // без смены carY (гипотетически) пропустила бы пересборку.
    const { slotW } = this.bayLayout();
    for (const bay of this.bays) {
      const currentKey = bay.portal ? bay.portal.texture.key : null;
      if (currentKey !== (loc.portal || null)) {
        if (bay.portal) { bay.portal.destroy(); bay.portal = null; }
        if (loc.portal) {
          const portalFrac = loc.widthOverrideByBays?.[this.state.baysOwned]?.portal ?? BAY_LAYOUT.portalWidthFrac;
          bay.portal = this.add.image(bay.x, loc.portalFloorY, loc.portal).setOrigin(0.5, 1).setDepth(9);
          bay.portal.setScale(slotW * portalFrac / bay.portal.width);
        }
      }
    }
    if (this.carY === loc.carY) return;
    const dy = loc.carY - this.carY;
    this.carY = loc.carY;
    for (const bay of this.bays) {
      for (const obj of [bay.carClean, bay.carDirty, bay.tapZone, bay.tapHint, bay.vipText, bay.vipBg, bay.dirtBarBg, bay.dirtBar, bay.instantBtn]) {
        obj.y += dy;
      }
    }
  }

  // Высота машины — своя для локации (см. LOCATIONS.carY в balance.js): полы у фонов
  // нарисованы на разной высоте кадра, один общий carY давал машину, парящую над полом
  // одних локаций и влезающую в декор других.
  currentLocation() {
    return LOCATIONS[Math.min(this.state.prestigeCount, LOCATIONS.length - 1)];
  }

  // ---- Посты мойки ---------------------------------------------------------------
  // X-раскладка постов по числу открытых (BAY_LAYOUT — доли от ширины слота, не абсолютные
  // px, чтобы одна формула работала и на 2, и на 3 поста). Y один на все посты локации —
  // им управляет repositionBays()/currentLocation().carY, не эта функция.
  bayLayout() {
    const { width } = this.scale;
    const n = this.state.baysOwned;
    const slotW = width / n;
    const positions = [];
    for (let i = 0; i < n; i++) positions.push(slotW * i + slotW / 2);
    return { positions, slotW };
  }

  buildBays() {
    const loc = this.currentLocation();
    this.carY = loc.carY;
    const { positions, slotW } = this.bayLayout();
    this.bays = positions.map((x) => this.buildBay(x, slotW, loc));
    for (let i = 0; i < this.bays.length; i++) this.updateInstantBtn(i);
  }

  buildBay(x, slotW, loc) {
    // Портал — отдельный переиспользуемый спрайт (loc.portal), НЕ встроен в фон: так
    // масштаб под slotW равномерный (как у машины, fitCarSprite), а не растяжение фона в
    // узкую высокую кляксу (см. спека 2026-08-01-dream-wash-bays-visual-fix-design.md).
    // Есть у всех трёх локаций (bay — арка мойки, garage — дверь гаражного бокса,
    // showroom — подиум с лампой, все ревизия 3) — depth=9, НИЖЕ
    // машины (10/11), машина стоит «в» портале, не поверх него силуэтом. setOrigin(0.5,1) —
    // нижний край спрайта садится ровно на loc.portalFloorY, линию пола заднего фона.
    // widthOverrideByBays — сколько машин на текущей локации, для garage при 3 постах
    // дверь бокса уже BAY_LAYOUT.portalWidthFrac (машина при том же override крупнее, см.
    // fitCarSprite) — см. комментарий у LOCATIONS в balance.js.
    let portal = null;
    if (loc.portal) {
      const portalFrac = loc.widthOverrideByBays?.[this.state.baysOwned]?.portal ?? BAY_LAYOUT.portalWidthFrac;
      portal = this.add.image(x, loc.portalFloorY, loc.portal).setOrigin(0.5, 1).setDepth(9);
      portal.setScale(slotW * portalFrac / portal.width);
    }

    const carClean = this.add.image(x, this.carY, 'car_clean_econo').setDepth(10);
    // Слой «грязи» — ТА ЖЕ текстура машины с тёмным тинтом, альфа = доля оставшейся
    // грязи. Гарантированно совпадает силуэтом с чистым слоем (это один и тот же
    // спрайт), поэтому отдельный арт для «грязной» версии не нужен.
    const carDirty = this.add.image(x, this.carY, 'car_clean_econo').setTint(0x5c4033).setDepth(11);

    // Input.makeSelectable уже вешает и pointerup (мышь/тач), и клавиатурный фокус
    // (Enter/Space) на один onSelect — свой pointerdown вешать НЕЛЬЗЯ, иначе тап
    // сработает дважды (pointerdown + pointerup от одного нажатия), и грязь/монеты
    // спишутся/начислятся вдвойне.
    const zoneW = Math.max(120, slotW * BAY_LAYOUT.zoneWidthFrac), zoneH = 420;
    const tapZone = this.add.rectangle(x, this.carY, zoneW, zoneH, 0x000000, 0).setDepth(12);
    Input.makeSelectable(tapZone, () => this.onTap(this.bays.indexOf(bay)), { layer: null });

    const tapHint = this.add.text(x, this.carY + 225, i18n.t('tapHint'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text
    }).setOrigin(0.5).setDepth(13);

    // Плашка «особого заказа» (VIP) — золотая подложка + текст. Раньше был голый текст,
    // терялся в интерфейсе (жалоба игрока на живом плейтесте 2026-08-01: «непонятно, что
    // это VIP, кроме как через десятки тапов»). Ширина подложки под текст считается в
    // setVipBadge() — заранее неизвестна, текст меняется (цифры обратного отсчёта, локаль).
    const vipBg = this.add.rectangle(x, this.carY - 170, 10, 34, THEME.colors.accent).setDepth(12).setVisible(false);
    const vipText = this.add.text(x, this.carY - 170, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.primaryText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(13).setVisible(false);

    const barW = Math.max(80, slotW * BAY_LAYOUT.barWidthFrac), barY = this.carY + 300;
    const dirtBarBg = this.add.rectangle(x, barY, barW, 26, THEME.colors.panel).setDepth(13);
    const dirtBar = this.add.rectangle(x - barW / 2, barY, barW, 20, THEME.colors.primary).setOrigin(0, 0.5).setDepth(14);

    // Гемы раньше было некуда тратить (жалоба игрока) — мгновенная мойка текущей машины
    // за гемы, та же награда, что и обычным тапаньем (см. useInstantFinish).
    const instantBtn = createButton(this, x, this.carY + 345, '', () => this.useInstantFinish(this.bays.indexOf(bay)),
      { color: THEME.colors.accent, fontSize: THEME.fontSize.tiny });

    const bay = {
      x, carClean, carDirty, tapZone, tapHint, vipText, vipBg, dirtBarBg, dirtBar, dirtBarW: barW,
      carScale: 1, instantBtn, portal,
      vipStreak: 0, // машин подряд без VIP-заказа НА ЭТОМ посту; эфемерно, не в сейве
      vipPulse: null, // активный tween пульса подложки, пока на посту VIP; см. setVipBadge()
      car: null
    };
    return bay;
  }

  // Машины разных тиров — разной ширины в исходном арте (251-381px). Масштабируем под
  // целевую ширину поста (BAY_LAYOUT.carWidthFrac * slotW), иначе более широкие тиры
  // (лимузин, суперкар) вылезали бы за пост при 3 открытых постах. carClean/carDirty —
  // одна и та же текстура, масштаб общий (см. buildBay). widthOverrideByBays — точечная
  // правка под конкретную локацию+число постов (garage на 3 постах, ревизия 3 — машины
  // увеличены по прямой просьбе игрока, не трогая bay/showroom), см. LOCATIONS.
  fitCarSprite(bay) {
    const { slotW } = this.bayLayout();
    const loc = this.currentLocation();
    const carFrac = loc.widthOverrideByBays?.[this.state.baysOwned]?.car ?? BAY_LAYOUT.carWidthFrac;
    const target = slotW * carFrac;
    bay.carScale = target / bay.carClean.width;
    bay.carClean.setScale(bay.carScale);
    bay.carDirty.setScale(bay.carScale);
  }

  updateInstantBtn(i) {
    const bay = this.bays[i];
    bay.instantBtn.setLabel(i18n.t('instantFinishBtn', { n: ECONOMY.instantFinishCost }));
    bay.instantBtn.setAlpha(this.state.gems >= ECONOMY.instantFinishCost ? 1 : 0.5);
    // Защитный зажим ширины (находка финального ревью 2026-08-01): при 3 постах RU-подпись
    // «Домыть сразу: N ◆» оказалась ШИРЕ слота (259px против 240px) — соседние кнопки визуально
    // сливались и перехватывали чужой тап. Укоротили тексты (см. i18n), но зажим оставляем как
    // защиту от будущего локале/шрифта/лейбла, который снова не влезет. setScale(1) СНАЧАЛА —
    // иначе повторные вызовы (гемы поменялись) накапливали бы уменьшение поверх уменьшения.
    bay.instantBtn.setScale(1);
    const { slotW } = this.bayLayout();
    const maxW = slotW * 0.9;
    if (bay.instantBtn.width > maxW) {
      bay.instantBtn.setScale(maxW / bay.instantBtn.width);
    }
  }

  useInstantFinish(i) {
    const bay = this.bays[i];
    if (!bay.car || this.state.gems < ECONOMY.instantFinishCost) return;
    this.state.gems -= ECONOMY.instantFinishCost;
    if (bay.car.isVip) bay.car.vipForcedSuccess = true;
    this.finishCar(i);
    this.updateInstantBtn(i);
  }

  buildHud() {
    const { width } = this.scale;
    this.backBtn = createButton(this, 60, 54, '‹', () => this.exitToMenu(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.normal });

    // Иконки валют — картинкой, не текстовым символом: жалоба игрока «непонятно, что за
    // жёлтый кругляшок» на живом плейтесте. currencyIcon — общий хелпер ниже.
    this.coinsIcon = this.currencyIcon(175, 54, 'icon_coin');
    this.coinsText = this.add.text(200, 54, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.gold
    }).setOrigin(0, 0.5);
    this.gemsIcon = this.currencyIcon(375, 54, 'icon_gem');
    this.gemsText = this.add.text(400, 54, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: '#4dd0e1'
    }).setOrigin(0, 0.5);

    // Текстовые метки, не эмодзи: цветные emoji (динамик, монета и т.п.) непредсказуемо
    // рендерятся в Canvas 2D в зависимости от системных шрифтов площадки — поймано на
    // смоук-тесте (монета рисовалась «тофу»-квадратом). Безопасны только простые
    // Unicode-символы из базовой плоскости (◆, ★, ●) и обычный текст через i18n.
    const soundLabel = () => (this.sound.mute ? i18n.t('soundOff') : i18n.t('soundOn'));
    this.soundBtn = createButton(this, width - 90, 54, soundLabel(), () => {
      this.sound.mute = !this.sound.mute;
      this.soundBtn.setLabel(soundLabel());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });

    this.repText = this.add.text(width / 2, 90, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: '#ffe082'
    }).setOrigin(0.5);
  }

  buildQuestBanner() {
    const { width } = this.scale;
    createPanel(this, width / 2, 150, width - 80, 60);
    this.questText = this.add.text(width / 2, 150, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
      align: 'center', wordWrap: { width: width - 120 }
    }).setOrigin(0.5);
  }

  buildShopButton() {
    const { width, height } = this.scale;
    this.shopBtn = createButton(this, width / 2, height - 70, i18n.t('shopBtn'), () => this.openShop(),
      { fontSize: THEME.fontSize.normal });
    // Значок-точка: «в магазине есть что-то новое» (новая точка/3-й пост), без слов и без
    // блокировки — см. hasLocationNews(). Метка кнопки статична, поэтому фиксированное
    // смещение от центра по уже посчитанной ширине/высоте контейнера безопасно.
    this.shopBtnDot = this.add.circle(
      this.shopBtn.x + this.shopBtn.width / 2 - 6, this.shopBtn.y - this.shopBtn.height / 2 + 6,
      9, 0xff5252
    ).setStrokeStyle(2, 0xffffff).setDepth(this.shopBtn.depth + 1).setVisible(false);
  }

  openShop() {
    this.shop.open();
    Analytics.event(EVENTS.SHOP_OPENED);
    Analytics.first(EVENTS.FIRST_UPGRADE);
  }

  // ---- Машина -----------------------------------------------------------------
  spawnCar(i) {
    const bay = this.bays[i];
    const c = this.engine.spawnCar(this.state.washedTotal, Math.random);
    bay.car = c;
    const tierId = TIERS[c.tierIndex].id;
    const key = 'car_clean_' + tierId + c.variant;
    bay.carClean.setTexture(key).setAlpha(1).setVisible(true);
    bay.carDirty.setTexture(key).setAlpha(1).setVisible(true); // тинт задан один раз в buildBay
    this.fitCarSprite(bay);
    this.updateDirtBar(i);

    // Особый заказ (VIP): независимый от тира бросок, с защитой от засухи и от повтора
    // подряд, СВОЙ pity-счётчик НА ЭТОТ ПОСТ (см. спека
    // 2026-08-01-dream-wash-parallel-bays-design.md — покупка поста не должна незаметно
    // утраивать общий шанс на VIP на всю игру).
    if (this.engine.shouldSpawnVip(bay.vipStreak, Math.random)) {
      bay.vipStreak = 0;
      c.isVip = true;
      c.vipForcedSuccess = false;
      c.vipRemain = this.engine.vipTimeLimit(c.dirtMax, this.state.levels.sponge);
      this.setVipBadge(bay, true, i18n.t('vipBadge', { n: Math.ceil(c.vipRemain) }));
    } else {
      bay.vipStreak++;
      c.isVip = false;
      this.setVipBadge(bay, false);
    }
  }

  onTap(i) {
    const bay = this.bays[i];
    if (!bay.car || bay.car.dirt <= 0) return;
    const { finished } = this.engine.applyTap(bay.car, this.state.levels.sponge);
    this.state.tapsTotal++;
    this.questProgress('tap', 1);
    Analytics.first(EVENTS.FIRST_TAP);
    bay.tapHint.setVisible(false);

    if (Math.random() < TIPS.chance) {
      const tip = Phaser.Math.Between(TIPS.min, TIPS.max);
      this.state.coins += tip;
      this.floatText(bay.x, '+' + tip + ' ●', THEME.colors.gold, false);
    }

    this.updateDirtBar(i);
    // Пульс — от carScale поста, НЕ от 1.0: машины теперь масштабированы под ширину
    // слота (fitCarSprite), голый setScale(1) после пульса вернул бы натуральный размер
    // спрайта вместо подогнанного под пост.
    bay.carClean.setScale(bay.carScale * 1.04); bay.carDirty.setScale(bay.carScale * 1.04);
    this.time.delayedCall(80, () => { bay.carClean.setScale(bay.carScale); bay.carDirty.setScale(bay.carScale); });

    if (finished) this.finishCar(i);
    this.persist();
    this.refreshHud();
  }

  updateDirtBar(i) {
    const bay = this.bays[i];
    const frac = bay.car ? Phaser.Math.Clamp(bay.car.dirt / bay.car.dirtMax, 0, 1) : 0;
    bay.carDirty.setAlpha(frac);
    bay.dirtBar.width = bay.dirtBarW * (1 - frac);
  }

  // Подсветка VIP-заказа: золотая подложка под vipText + пульс масштаба, пока заказ активен
  // на посту. Подложка меряется по фактически отрисованному тексту (bay.vipText.width/height
  // ПОСЛЕ setText) — переживает смену языка и цифр обратного отсчёта без ручной подгонки
  // константы. Вызывается каждый кадр во время отсчёта (update()) — дёшево, обычные
  // присваивания свойств, тот же приём, что у updateDirtBar().
  setVipBadge(bay, visible, text) {
    if (visible) bay.vipText.setText(text);
    bay.vipText.setVisible(visible);
    if (visible) {
      bay.vipBg.setSize(bay.vipText.width + 24, bay.vipText.height + 12);
      bay.vipBg.setVisible(true);
      if (!bay.vipPulse) {
        // Зажим ширины под слот поста (находка финального ревью 2026-08-01 — тот же класс
        // бага, что updateInstantBtn(), но пульс здесь задаёт АБСОЛЮТНЫЙ scale:1.12, поэтому
        // зажимать нужно БАЗОВЫЙ масштаб и пульсировать ОТНОСИТЕЛЬНО него: если бы зажали
        // как в updateInstantBtn (голым setScale ниже 1), первый же тик пульса перезаписал
        // бы зажатое значение обратно на плоский 1.12. Считаем зажим ЗДЕСЬ, в момент
        // создания твина — это момент, когда счётчик (и текст) в САМОМ ШИРОКОМ состоянии
        // (отсчёт идёт вниз, цифр меньше не станет), дальше текст только сужается — зажатый
        // раз базовый масштаб остаётся безопасным до конца этого VIP-заказа.
        const { slotW } = this.bayLayout();
        const maxW = slotW * 0.92; // запас от края слота/экрана — тот же дух, что 0.9 у updateInstantBtn
        const peakW = bay.vipBg.width * 1.12; // ширина плашки на пике пульса
        const baseScale = peakW > maxW ? maxW / peakW : 1;
        bay.vipBg.setScale(baseScale);
        bay.vipText.setScale(baseScale);
        bay.vipPulse = this.tweens.add({
          targets: [bay.vipBg, bay.vipText], scale: baseScale * 1.12, duration: 420,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }
    } else {
      bay.vipBg.setVisible(false);
      if (bay.vipPulse) { bay.vipPulse.stop(); bay.vipPulse = null; }
      bay.vipBg.setScale(1); bay.vipText.setScale(1);
    }
  }

  update(time, delta) {
    if (!this.ready) return; // ещё грузимся (async create) — см. комментарий в create()
    const dt = delta / 1000;

    for (let i = 0; i < this.bays.length; i++) {
      const bay = this.bays[i];
      if (bay.car && bay.car.dirt > 0) {
        const { finished } = this.engine.applyAuto(bay.car, this.state.levels.crew, dt);
        if (finished) this.finishCar(i);
        else this.updateDirtBar(i);
      }

      if (bay.car && bay.car.isVip) {
        if (!Input.hasLayer(this)) bay.car.vipRemain -= dt;
        const remain = Math.ceil(bay.car.vipRemain);
        this.setVipBadge(bay, remain > 0, remain > 0 ? i18n.t('vipBadge', { n: remain }) : undefined);
        if (remain <= 0) {
          // Дедлайн истёк (находка финального ревью 2026-08-01): applyAuto() в carwash.js
          // пропускает car.isVip===true НАВСЕГДА, без этого сброса пост встаёт намертво —
          // бригада никогда больше не тронет эту машину, домыть можно только тапами/гемами
          // вручную. Снимаем isVip, чтобы бригада и тапы домывали машину как обычную дальше.
          // vipFailed переживает сброс isVip и держит для finishCar() факт «это был
          // провалившийся VIP-заказ» — иначе аналитика VIP_ORDER_DONE молча перестала бы
          // фиксировать провалы истёкших заказов.
          bay.car.isVip = false;
          bay.car.vipFailed = true;
        }
      }
    }

    if (!this.adArmed) {
      this.adTimer += dt;
      if (this.adTimer >= ECONOMY.adInterval) this.adArmed = true;
    }

    this.updateQuestBanner();
  }

  finishCar(i) {
    const bay = this.bays[i];
    const car = bay.car;
    bay.car = null;
    const boostActive = Date.now() < this.boostUntil;
    let coins = this.engine.carValue(car.tierIndex, this.state.levels.turbo, this.state.reputation, boostActive);
    // VIP-заказ: успех — либо уложились в дедлайн, либо домыли кнопкой «Домыть сразу»
    // (useInstantFinish взводит vipForcedSuccess). Провал — молча, без штрафа, машина
    // просто обычная (см. спека 2026-07-31-dream-wash-vip-orders-design.md). car.isVip
    // может быть уже false здесь — update() сбрасывает его при истёкшем дедлайне (находка
    // финального ревью 2026-08-01, см. комментарий там), тогда vipSuccess корректно даёт
    // false (истёкший VIP не может задним числом стать успехом).
    const vipSuccess = car.isVip && (car.vipForcedSuccess || car.vipRemain > 0);
    let vipGems = 0;
    if (vipSuccess) {
      coins = Math.round(coins * VIP.coinMult);
      if (Math.random() < VIP.gemChance) vipGems = Phaser.Math.Between(VIP.gemMin, VIP.gemMax);
      this.state.gems += vipGems;
    }
    this.state.coins += coins;
    this.state.earnedTotal += coins;
    this.state.washedTotal++;
    const tierId = TIERS[car.tierIndex].id;
    this.state.collection[tierId][car.variantIndex] = true; // отметка в коллекции цветов
    Analytics.event(EVENTS.CAR_WASHED, { tier: tierId });
    // car.vipFailed (см. update()) покрывает случай, когда isVip уже сброшен истёкшим
    // дедлайном ДО того, как машину домыли — без него аналитика молча теряла бы провалы.
    if (car.isVip || car.vipFailed) Analytics.event(EVENTS.VIP_ORDER_DONE, { success: vipSuccess ? 'yes' : 'no' });
    this.questProgress('wash', 1);
    this.questProgress('earn', coins);
    if (vipSuccess) {
      this.floatText(bay.x, i18n.t('vipSuccess', { reward: fmt(coins) + ' ●' + (vipGems ? ('  +' + vipGems + ' ◆') : '') }), THEME.colors.accentText, true);
    } else {
      this.floatText(bay.x, '+' + fmt(coins) + ' ●', THEME.colors.gold, true);
    }
    this.setVipBadge(bay, false);
    // Ролловер недели проверяем ЗДЕСЬ тоже, не только в create(): сессия, оставленная
    // открытой через границу недели (авто-бригада моет без тапов — обычное дело в этом
    // жанре), иначе продолжала бы копить в счётчик уже прошедшей недели до перезагрузки
    // страницы. Дёшево — сравнение строк, безопасно звать на каждой машине.
    this.checkWeekRollover();
    this.state.weeklyWashed++;
    this.checkWeeklyMilestones();
    this.checkTierUnlock();
    this.checkPrestigeUnlock();
    this.checkBadges(); // ПОСЛЕ checkWeeklyMilestones — чтобы weekly_track_done мог сработать в тот же вызов
    this.maybeShowAd();

    this.tweens.add({
      targets: [bay.carClean, bay.carDirty], alpha: 0, duration: 220,
      onComplete: () => {
        const delayMs = this.engine.nextCarDelay(this.state.levels.speed) * 1000;
        this.time.delayedCall(delayMs, () => {
          this.spawnCar(i);
          bay.carClean.setAlpha(0);
          this.tweens.add({ targets: bay.carClean, alpha: 1, duration: 220 });
        });
      }
    });

    this.persist();
    this.refreshHud();
  }

  checkTierUnlock() {
    const t = TIERS.find((tier) => tier.unlockAt === this.state.washedTotal);
    if (t) {
      Analytics.event(EVENTS.TIER_UNLOCKED, { tier: t.id });
      this.toast(i18n.t('tierUnlocked'));
    }
  }

  // Разовый ненавязчивый тост в момент, когда открывается «Новая точка» — до этого фикса
  // (жалоба на живом плейтесте: «пару минут поиграл и бросил, непонятно что дальше делать»)
  // единственным намёком была 5-я из пяти вкладок магазина без внешнего указателя. Точное
  // сравнение (не >=) — как в checkTierUnlock — гарантирует срабатывание ровно один раз:
  // washedTotal лидерборд-счётчик, никогда не убывает и не сбрасывается престижем.
  checkPrestigeUnlock() {
    if (this.state.washedTotal === ECONOMY.prestigeUnlockWashed) {
      this.toast(i18n.t('prestigeUnlockedToast'));
    }
  }

  // Точка (престиж) и покупка 3-го поста лежат на скрытой вкладке магазина — значок-точка
  // на кнопке «Апгрейды» и на самой вкладке (см. ShopOverlay.refresh) подсвечивает, что там
  // появилось что-то новое, без блокирующей подсказки (RETENTION.md: до 30% отвала).
  hasLocationNews() {
    return this.canPrestige() || (this.state.baysOwned < BAYS.maxCount && this.state.gems >= BAYS.thirdBayCost);
  }

  // ---- Задания ------------------------------------------------------------------
  newQuest() {
    const type = Phaser.Utils.Array.GetRandom(QUESTS.types);
    this.state.quest = { id: type.id, target: type.count, progress: 0, deadline: Date.now() + type.timeLimit * 1000, reward: type };
    this.persist();
  }

  questProgress(kind, amount) {
    const q = this.state.quest;
    if (!q || q.id !== kind) return;
    q.progress += amount;
    if (q.progress >= q.target) this.completeQuest();
  }

  completeQuest() {
    const q = this.state.quest;
    const coins = q.reward.coins || 0;
    const gems = q.reward.gems || 0;
    this.state.coins += coins;
    this.state.gems += gems;
    Analytics.event(EVENTS.QUEST_DONE, { id: q.id });
    this.toast(i18n.t('questDone', { r: coins ? ('+' + coins + ' ●') : ('+' + gems + ' ◆') }));
    this.state.quest = null;
    this.time.delayedCall(QUESTS.pauseSeconds * 1000, () => this.newQuest());
    this.persist(); this.refreshHud();
  }

  updateQuestBanner() {
    const q = this.state.quest;
    if (!q) { this.questText.setText(''); return; }
    if (Date.now() > q.deadline) {
      this.state.quest = null;
      this.time.delayedCall(500, () => this.newQuest());
      this.questText.setText('');
      return;
    }
    const label = q.id === 'wash' ? i18n.t('questWash', { n: q.target })
      : q.id === 'tap' ? i18n.t('questTap', { n: q.target })
      : i18n.t('questEarn', { n: q.target });
    const left = Math.max(0, Math.ceil((q.deadline - Date.now()) / 1000));
    // Math.floor: q.progress копится из монет (дробные множители — репутация, турбо), без
    // округления в UI лезет float-мусор вида «52.799999999999997» (поймано пользователем).
    const shown = Math.floor(Math.min(q.progress, q.target));
    this.questText.setText(label + '  ' + shown + '/' + q.target + '  (' + left + 's)');
  }

  // ---- Достижения -----------------------------------------------------------------
  checkBadges() {
    for (const b of BADGES) {
      if (!this.state.badges.includes(b.id) && b.check(this.state)) {
        this.state.badges.push(b.id);
        this.state.gems += b.gems;
        Analytics.event(EVENTS.BADGE_EARNED, { id: b.id });
        this.toast(i18n.t('badge_' + b.id) + '  +' + b.gems + ' ◆');
      }
    }
  }

  // ---- Недельный трек --------------------------------------------------------------
  // Сравнение ISO-ключа недели — если сменилась (реальный переход ИЛИ первый запуск с
  // weekKey='' по умолчанию), обнуляем счётчик и отметки этапов. Разово, идемпотентно —
  // безопасно звать чаще, чем реально нужно.
  checkWeekRollover() {
    const key = getIsoWeekKey(new Date());
    // Доп. защита: если WEEKLY.milestones когда-нибудь изменит длину балансом, у вернувшегося
    // посреди недели игрока останется старый (короче/длиннее) weeklyClaimed — тогда
    // weekly_track_done's .every(Boolean) может ложно пройти на обрезанном массиве. Сброс
    // по длине не ждёт смены недели.
    const lengthMismatch = this.state.weeklyClaimed.length !== WEEKLY.milestones.length;
    if (this.state.weekKey !== key || lengthMismatch) {
      this.state.weekKey = key;
      this.state.weeklyWashed = 0;
      this.state.weeklyClaimed = WEEKLY.milestones.map(() => false);
    }
  }

  checkWeeklyMilestones() {
    const reached = newlyReachedMilestones(this.state.weeklyWashed, WEEKLY.goal, WEEKLY.milestones, this.state.weeklyClaimed);
    for (const i of reached) {
      this.state.weeklyClaimed[i] = true;
      const m = WEEKLY.milestones[i];
      this.state.coins += m.coins;
      this.state.gems += m.gems;
      Analytics.event(EVENTS.WEEKLY_MILESTONE, { pct: m.pct });
      this.toast(i18n.t('weeklyMilestoneReward', { pct: m.pct })
        + (m.coins ? ('  +' + m.coins + ' ●') : '') + (m.gems ? ('  +' + m.gems + ' ◆') : ''));
    }
  }

  // ---- Реклама ------------------------------------------------------------------
  // Полноэкранная показывается ТОЛЬКО в логической паузе (машина только что домыта,
  // очередь ждёт следующую) — таймер лишь взводит показ (YANDEX-SDK.md, антипример
  // «голый таймер»). В открытом магазине не показываем: это активное взаимодействие
  // с UI, а не пауза геймплея. Сам показ — ЧЕРЕЗ обратный отсчёт (showAdCountdown):
  // таймер, честно дождавшийся паузы, но показывающий рекламу мгновенно и без
  // предупреждения, для игрока неотличим от голого таймера — это и была находка
  // 2026-08-03 (см. library/game-template/TEMPLATE-VERSION.md v17).
  //
  // VK ИСКЛЮЧЕНИЕ: периодический показ по таймеру на VK запрещён правилами площадки
  // (interstitial только на реальных переходах между экранами, RELEASE-CHECKLIST.md
  // блок H1) — на Яндексе то же самое разрешено СХЕМОЙ «таймер взводит + пауза с
  // отсчётом» (YANDEX-SDK.md), но VK эту лазейку прямо закрывает отдельным правилом.
  // На VK доход несёт sticky-баннер (Ads.showBanner() в create()) + rewarded; полноэкранная
  // на VK показывается на переходах — doPrestige() (смена локации) и exitToMenu() (выход
  // в меню, тоже переход) — оба нижние вызовы обёрнуты в showAdCountdown() ровно по этой
  // причине (см. комментарий у doPrestige и находку красной команды 05.08).
  maybeShowAd() {
    if (Platform.name === 'vk') return;
    if (!this.adArmed) return;
    if (this.shop.visible) return;
    // Не показываем рекламу, пока на ЛЮБОМ посту активен VIP-заказ: у него живой обратный
    // отсчёт (реальное время), и разрыв рекламой читался бы как показ «в короткой игре в
    // реальном времени» — прямая претензия п. 4.4 (отказ «Пицца-Мафии», 2026-08). adArmed
    // НЕ сбрасываем: показ откладывается до ближайшей домытой машины без активного VIP.
    if (this.bays.some(b => b.car && b.car.isVip)) return;
    this.adArmed = false;
    this.adTimer = 0;
    showAdCountdown(this, () => Ads.showFullscreen({}));
  }

  watchAdBoost() {
    Ads.showRewarded({
      onRewarded: () => {
        this.boostUntil = Date.now() + ECONOMY.boostSeconds * 1000;
        Analytics.event(EVENTS.REWARD_AD_SHOWN, { place: 'boost' });
        this.shop.refresh();
      }
    });
  }

  watchAdGems() {
    Ads.showRewarded({
      onRewarded: () => {
        this.state.gems += ECONOMY.rewardAdGems;
        Analytics.event(EVENTS.REWARD_AD_SHOWN, { place: 'shop_gems' });
        this.persist(); this.refreshHud(); this.shop.refresh();
      }
    });
  }

  // ---- Престиж --------------------------------------------------------------------
  canPrestige() { return this.state.washedTotal >= ECONOMY.prestigeUnlockWashed; }

  doPrestige() {
    if (!this.canPrestige()) return;
    this.state.coins = 0;
    this.state.levels = { sponge: 0, crew: 0, turbo: 0, speed: 0 };
    this.state.reputation++;
    this.state.prestigeCount++;
    Analytics.event(EVENTS.PRESTIGE_DONE, { count: this.state.prestigeCount });
    Analytics.first(EVENTS.FIRST_PRESTIGE);
    this.checkBadges();
    this.buildBackground(); // на первой «новой точке» меняется фон на гараж
    this.persist(); this.refreshHud();
    // VK: полноэкранная реклама разрешена только на реальных переходах (RELEASE-CHECKLIST.md
    // блок H1) — престиж меняет локацию, это и есть переход. На Яндексе не дублируем: там
    // доход уже идёт периодическим показом с отсчётом (см. maybeShowAd()).
    // Найдено параллельным аудитом 05.08: этот вызов был точным близнецом бага, уже
    // исправленного в exitToMenu() — синхронно с тапом по кнопке престижа, без отсчёта
    // (тот же фрод-риск, см. комментарий в showAdCountdown()). Обёрнуто тем же паттерном.
    if (Platform.name === 'vk') showAdCountdown(this, () => Ads.showFullscreen({}));
  }

  // ---- Покупка поста мойки ---------------------------------------------------------
  buyBay() {
    if (this.state.baysOwned >= BAYS.maxCount || this.state.gems < BAYS.thirdBayCost) return;
    this.state.gems -= BAYS.thirdBayCost;
    this.state.baysOwned++;
    Analytics.event(EVENTS.BAY_BOUGHT, { count: this.state.baysOwned });
    this.relayoutBays();
    this.checkBadges();
    this.persist(); this.refreshHud();
  }

  // Пересчитывает раскладку постов под новое число открытых. НЕ пытаемся аккуратно
  // подвинуть/растянуть уже существующие объекты на месте (риск: hit-area тап-зоны не
  // следует за resize геометрии без явного пересоздания interactive) — это происходит
  // МАКСИМУМ один раз за игру (покупка единственного покупного, 3-го поста), поэтому
  // просто разбираем старые посты и строим все заново под новую раскладку. Текущий прогресс
  // мойки на уже открытых постах при этом теряется — сознательная мелкая цена редкого
  // разового события, не стоит усложнять ради неё код.
  relayoutBays() {
    for (const bay of this.bays) {
      this.setVipBadge(bay, false); // остановить пульс ПЕРЕД уничтожением — иначе repeat:-1
                                     // tween продолжает бежать на destroy()-нутых объектах
      // bay.portal может быть null (локация без портала) — обычные поля всегда заданы,
      // отдельной проверки на них не нужно, но общий guard дешевле частного случая.
      for (const obj of [bay.carClean, bay.carDirty, bay.tapZone, bay.tapHint, bay.vipText, bay.vipBg, bay.dirtBarBg, bay.dirtBar, bay.instantBtn, bay.portal]) {
        if (obj) obj.destroy();
      }
    }
    this.buildBays();
    for (let i = 0; i < this.bays.length; i++) this.spawnCar(i);
  }

  // ---- Магазин: API для ShopOverlay ------------------------------------------------
  shopApi() {
    const self = this;
    return {
      getCoins: () => self.state.coins,
      getGems: () => self.state.gems,
      getReputation: () => self.state.reputation,
      getWashedTotal: () => self.state.washedTotal,
      getLevels: () => self.state.levels,
      getUpgradeCost: (id) => self.engine.upgradeCost(id, self.state.levels[id]),
      getUpgradeEffectNext: (id) => {
        const lv = self.state.levels[id];
        if (id === 'sponge') return Math.round(UPGRADES.sponge.effectPer * 10) / 10;
        if (id === 'turbo') return Math.round(UPGRADES.turbo.effectPer * 100);
        if (id === 'crew') return lv + 1;
        return 0;
      },
      onBuyUpgrade: (id) => {
        const cost = self.engine.upgradeCost(id, self.state.levels[id]);
        if (self.state.coins < cost) return;
        self.state.coins -= cost;
        self.state.levels[id]++;
        Analytics.event(EVENTS.UPGRADE_BOUGHT, { id, level: self.state.levels[id] });
        self.persist(); self.refreshHud();
      },
      getBadges: () => self.state.badges,
      prestigeUnlockAt: ECONOMY.prestigeUnlockWashed,
      reputationIncomePerStar: ECONOMY.reputationIncomePerStar,
      canPrestige: () => self.canPrestige(),
      onPrestige: () => self.doPrestige(),
      onWatchAdGems: () => self.watchAdGems(),
      onWatchAdBoost: () => self.watchAdBoost(),
      boostRemainingSec: () => Math.max(0, (self.boostUntil - Date.now()) / 1000),
      rewardAdGems: ECONOMY.rewardAdGems,

      // Коллекция цветов машин.
      getCollection: () => self.state.collection,
      isTierUnlocked: (tierIndex) => self.state.washedTotal >= TIERS[tierIndex].unlockAt,
      skinCost: ECONOMY.skinCost,
      onBuySkin: (tierId) => self.buySkin(tierId),

      // Недельный трек.
      getWeeklyWashed: () => self.state.weeklyWashed,
      getWeeklyClaimed: () => self.state.weeklyClaimed,

      // Посты мойки.
      getBaysOwned: () => self.state.baysOwned,
      bayMaxCount: BAYS.maxCount,
      thirdBayCost: BAYS.thirdBayCost,
      onBuyBay: () => self.buyBay()
    };
  }

  // Купить конкретный недостающий цвет напрямую за гемы — не нужно ждать, пока он выпадет
  // случайно (жалоба игрока: «всегда один и тот же зелёный хетчбэк»). Берёт САМЫЙ ДЕШЁВЫЙ
  // недостающий вариант тира (первый по индексу), цена растёт с каждой покупкой в тире.
  buySkin(tierId) {
    const arr = this.state.collection[tierId];
    const missingIndex = arr.findIndex((got) => !got);
    if (missingIndex < 0) return; // уже всё собрано
    const owned = arr.filter(Boolean).length;
    const cost = ECONOMY.skinCost + owned * 4; // 8, 12, 16... — последний в тире дороже первого
    if (this.state.gems < cost) return;
    this.state.gems -= cost;
    arr[missingIndex] = true;
    this.checkBadges();
    this.persist(); this.refreshHud();
  }

  // ---- HUD helpers --------------------------------------------------------------
  // Иконка валюты фиксированного размера (картинкой), рядом ставится текст с числом.
  currencyIcon(x, y, key) {
    const icon = this.add.image(x, y, key);
    icon.setScale(34 / Math.max(icon.width, icon.height));
    return icon;
  }

  refreshHud() {
    this.coinsText.setText(fmt(this.state.coins));
    this.gemsText.setText(fmt(this.state.gems));
    this.repText.setText(this.state.reputation > 0 ? ('★ x' + this.state.reputation) : '');
    for (let i = 0; i < this.bays.length; i++) this.updateInstantBtn(i);
    if (this.shopBtnDot) this.shopBtnDot.setVisible(this.hasLocationNews());
    if (this.shop && this.shop.visible) this.shop.refresh();
  }

  floatText(x, text, color, big) {
    const t = this.add.text(x, this.carY - 60, text, {
      fontFamily: THEME.fontFamily, fontSize: big ? THEME.fontSize.big : THEME.fontSize.small, color
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // Несколько тостов подряд (например открытие тира и достижение за тот же вымытый
  // автомобиль) раньше рисовались друг на друге в одной точке — нечитаемая каша (поймано
  // на живой игре). Складываем в очередь, следующий стартует после ухода предыдущего.
  toast(text) {
    if (!this._toastQueue) this._toastQueue = [];
    this._toastQueue.push(text);
    if (!this._toastActive) this.playNextToast();
  }

  playNextToast() {
    const text = this._toastQueue.shift();
    if (text === undefined) { this._toastActive = false; return; }
    this._toastActive = true;
    const { width } = this.scale;
    // Баннер квеста (buildQuestBanner) занимает y:120-180. Тост стартовал на y=220 и
    // всплывал до y=170 — заканчивал движение ВНУТРИ баннера, полупрозрачным «призраком»
    // текста поверх него (поймано красной командой 2026-08-23 прямо в кадре промо-видео:
    // под «Вымой 5 машин…» читался остаток «Все хэтчбеки собраны»). Подняты обе точки так,
    // чтобы весь путь тоста оставался НИЖЕ баннера с запасом (низ баннера 180, тост
    // держится в 200-260).
    const t = this.add.text(width / 2, 260, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.gold, align: 'center'
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({
      targets: t, y: t.y - 60, alpha: 0, duration: 1500, delay: 700,
      onComplete: () => { t.destroy(); this.playNextToast(); }
    });
  }

  showModal({ title, body, buttons }) {
    const { width, height } = this.scale;
    const root = this.add.container(0, 0).setDepth(400);
    const bgRect = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setInteractive();
    const panel = createPanel(this, width / 2, height / 2, width - 100, 380);
    const t = this.add.text(width / 2, height / 2 - 130, title, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5);
    const b = this.add.text(width / 2, height / 2 - 30, body, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      align: 'center', wordWrap: { width: width - 160 }
    }).setOrigin(0.5);
    root.add([bgRect, panel, t, b]);

    Input.openLayer(this, 'modal');
    let y = height / 2 + 90;
    for (const btn of buttons) {
      const bt = createButton(this, width / 2, y, btn.label, () => {
        Input.closeLayer(this, 'modal');
        root.destroy();
        if (btn.onClick) btn.onClick();
      }, btn.opts || {});
      root.add(bt);
      y += 90;
    }
  }

  // ---- Сохранение / выход -----------------------------------------------------------
  persist(extra) {
    Save.update(Object.assign({
      coins: this.state.coins, gems: this.state.gems, reputation: this.state.reputation,
      levels: this.state.levels, washedTotal: this.state.washedTotal, earnedTotal: this.state.earnedTotal,
      tapsTotal: this.state.tapsTotal, badges: this.state.badges, quest: this.state.quest,
      prestigeCount: this.state.prestigeCount,
      collection: this.state.collection, // БАГ: раньше не сохранялся вообще, коллекция цветов терялась при перезагрузке
      weekKey: this.state.weekKey, weeklyWashed: this.state.weeklyWashed, weeklyClaimed: this.state.weeklyClaimed,
      baysOwned: this.state.baysOwned
    }, extra || {}));
  }

  async exitToMenu() {
    YA.gameplayStop();
    Analytics.event(EVENTS.SESSION_END, { earned: Math.floor(this.state.earnedTotal) });
    this.persist();
    await Save.flush();
    // Имя 'earned' (без 'Total') — техназвание лидерборда в консоли Яндекса молча
    // обрезает всё после «_» при сохранении (earned_total сохранился как earned),
    // и оно неизменяемо после создания. Правим код под факт консоли, см. NOTES.md.
    Leaderboard.setScore('earned', Math.floor(this.state.earnedTotal));
    // Не на каждой домытой машине (это спамило бы SDK лидербордов) — раз за сессию, как и
    // earned выше. Лидерборд создаётся в консоли ЗАРАНЕЕ вручную (RELEASE-CHECKLIST).
    // Разнесено на 1.1с от вызова выше (найдено красной командой 05.08): SDK Яндекса
    // ограничивает setScore одним запросом в секунду ГЛОБАЛЬНО на игрока (не на лидерборд),
    // синхронные вызовы подряд — второй молча не долетал (WARNING «no more than once per
    // second», washWeekly фактически никогда не обновлялся при выходе через кнопку).
    setTimeout(() => Leaderboard.setScore('washWeekly', this.state.weeklyWashed), 1100);
    Ads.hideBanner();
    // Найдено красной командой 05.08: раньше здесь стоял голый showFullscreen() —
    // срабатывал СИНХРОННО в том же тике, что и клик по кнопке «‹» (риск поймать
    // случайный повторный тап уже по рекламе — тот самый антипаттерн, для которого и
    // сделан adCountdown.js, см. его собственный комментарий: «выход в меню» назван
    // прямо), и мог показаться на самом первом выходе игрока через пару секунд после
    // старта (запрет C6/YANDEX-MODERATION — реклама не до конца обучения). Гейт по
    // tapsTotal===0 — если игрок ещё ни разу не тапнул машину, это либо самый первый
    // визит, либо выход без начала игры: рекламу не показываем вовсе.
    if (this.state.tapsTotal > 0) {
      showAdCountdown(this, () => Ads.showFullscreen({ onClose: () => this.scene.start('Menu') }));
    } else {
      this.scene.start('Menu');
    }
  }
}
