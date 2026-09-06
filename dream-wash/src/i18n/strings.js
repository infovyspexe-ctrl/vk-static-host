// Локализация. ВСЕ тексты интерфейса берём через i18n.t('ключ'),
// в сценах не хардкодим строки. Язык берётся из площадки, по умолчанию русский.
// Локальная проверка перевода: ?lang=en в адресе.
//
// Подстановка параметров: строка 'Волна {n}' + i18n.t('wave', { n: 5 }) -> 'Волна 5'.
// Не собирай фразы конкатенацией: в другом языке порядок слов другой, перевод рассыпется.
const STRINGS = {
  ru: {
    title: 'Мойка Мечты',
    play: 'Играть',
    loading: 'Загрузка...',
    paused: 'Пауза',
    toMenu: 'В меню',
    soundOn: 'Звук: вкл',
    soundOff: 'Звук: выкл',
    adCountdown: 'Реклама через {n}…',

    tapHint: 'Тапай машину!',
    questWash: 'Вымой {n} машин',
    questTap: 'Сделай {n} тапов',
    questEarn: 'Заработай {n} монет',
    questDone: 'Задание выполнено! +{r}',
    tierUnlocked: 'Открыт новый класс машин!',
    // Разовый ненавязчивый тост (не модалка — RETENTION.md прямо предупреждает про блокирующие
    // подсказки, до 30% отвала): игрок не находил самостоятельно, что можно открыть новую точку
    // и купить третий пост — обе фичи спрятаны на 5-й вкладке магазина без внешнего намёка.
    prestigeUnlockedToast: 'Открыта новая точка! Загляни в «Апгрейды»',
    // Укорочено (находка финального ревью 2026-08-01): исходный текст «★ VIP — мой сам! {n}с»
    // рендерился ~299px при 28px bold Arial — при 3 постах слот 240px шире, чем текст выдерживает
    // даже без пика пульса (1.12x), плашка вылезала за пост и за левый край экрана. Замеряно
    // живым canvas.measureText в браузере (см. отчёт фикса), не оценкой на глаз.
    vipBadge: 'VIP: сам! {n}с',
    vipSuccess: 'VIP! +{reward}',

    shopBtn: 'Апгрейды',
    tabUpgrades: 'Апгрейды',
    tabAchievements: 'Награды',
    tabCollection: 'Машины',
    tabDaily: 'Точка',
    tabWeekly: 'Неделя',
    close: 'Закрыть',
    level: 'Ур. {n}',
    buyFor: 'Купить: {n} ●',
    instantFinishBtn: 'Домыть: {n} ◆',

    car_econo: 'Хэтчбек',
    car_sedan: 'Седан',
    car_suv: 'Внедорожник',
    car_sport: 'Спорткар',
    car_limo: 'Лимузин',
    car_super: 'Суперкар',
    car_cabrio: 'Кабриолет',
    car_retro: 'Ретро-родстер',
    car_hyper: 'Гиперкар',
    collectionProgress: '{n}/{m} собрано',
    collectionDone: 'Все цвета собраны!',
    collectionLocked: 'Откроется на {n}-й машине',
    collectionBuyBtn: 'Купить цвет: {n} ◆',
    buyBayBtn: 'Новый пост мойки: {n} ◆',
    weeklyHeader: 'Недельный трек: {n}/{m} машин',
    weeklyMilestone: 'Этап {pct}%',
    weeklyDone: 'Получено',
    weeklyLeft: 'Осталось {n}',
    weeklyMilestoneReward: 'Этап {pct}% пройден!',

    upg_sponge: 'Тряпка',
    upg_sponge_desc: '+{n} грязи за тап',
    upg_crew: 'Бригада',
    upg_crew_desc: 'В бригаде: {n} (моют без тапов)',
    upg_turbo: 'Пенная пушка',
    upg_turbo_desc: '+{n}% монет за машину',
    upg_speed: 'Манёвр',
    upg_speed_desc: 'машины выезжают быстрее',

    adBoostBtn: 'Реклама: x2 доход на 3 мин',
    adBoostActive: 'x2 доход: {sec} с',
    adGemsBtn: 'Реклама: +{n} гемов',

    prestigeTitle: 'Новая точка',
    prestigeDesc: 'Сбросить монеты и апгрейды, получить +{p}% дохода навсегда ({rep} ★ сейчас)',
    prestigeBtn: 'Открыть новую точку',
    prestigeLocked: 'Открыть новую точку: вымой ещё {n} машин',

    badge_first_wash: 'Первая машина',
    badge_wash_50: '50 машин',
    badge_wash_500: '500 машин',
    badge_wash_5000: '5000 машин',
    badge_tier_sedan: 'Открыт седан',
    badge_tier_sport: 'Открыт спорткар',
    badge_tier_super: 'Открыт суперкар',
    badge_taps_1000: '1000 тапов',
    badge_rich_10000: '10 000 монет заработано',
    badge_rich_100000: '100 000 монет заработано',
    badge_first_prestige: 'Первая новая точка',
    badge_collection_econo: 'Все хэтчбеки собраны',
    badge_collection_sedan: 'Все седаны собраны',
    badge_collection_suv: 'Все внедорожники собраны',
    badge_collection_all: 'Полная коллекция машин',
    badge_tier_cabrio: 'Открыт кабриолет',
    badge_tier_retro: 'Открыт ретро-родстер',
    badge_tier_hyper: 'Открыт гиперкар',
    badge_weekly_track_done: 'Недельный трек пройден'
  },
  en: {
    title: 'Dream Car Wash',
    play: 'Play',
    loading: 'Loading...',
    paused: 'Paused',
    toMenu: 'Menu',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    adCountdown: 'Ad in {n}…',

    tapHint: 'Tap the car!',
    questWash: 'Wash {n} cars',
    questTap: 'Tap {n} times',
    questEarn: 'Earn {n} coins',
    questDone: 'Quest done! +{r}',
    tierUnlocked: 'New car class unlocked!',
    prestigeUnlockedToast: 'New location unlocked! Check "Upgrades"',
    // Shortened (finding of the 2026-08-01 final review): the original "★ VIP — wash it
    // yourself! {n}s" rendered ~396px at 28px bold Arial — wider than even the 2-bay default
    // slot (360px) and badly overflowed the 3-bay slot (240px). Measured live via
    // canvas.measureText in the browser (see fix report), not eyeballed.
    vipBadge: 'VIP: tap! {n}s',
    vipSuccess: 'VIP! +{reward}',

    shopBtn: 'Upgrades',
    tabUpgrades: 'Upgrades',
    tabAchievements: 'Awards',
    tabCollection: 'Cars',
    tabDaily: 'Location',
    tabWeekly: 'Weekly',
    close: 'Close',
    level: 'Lvl {n}',
    buyFor: 'Buy: {n} ●',
    instantFinishBtn: 'Finish: {n} ◆',

    car_econo: 'Hatchback',
    car_sedan: 'Sedan',
    car_suv: 'SUV',
    car_sport: 'Sports car',
    car_limo: 'Limo',
    car_super: 'Supercar',
    car_cabrio: 'Convertible',
    car_retro: 'Retro roadster',
    car_hyper: 'Hypercar',
    collectionProgress: '{n}/{m} collected',
    collectionDone: 'All colors collected!',
    collectionLocked: 'Unlocks at car #{n}',
    collectionBuyBtn: 'Buy color: {n} ◆',
    buyBayBtn: 'New wash bay: {n} ◆',
    weeklyHeader: 'Weekly track: {n}/{m} cars',
    weeklyMilestone: 'Milestone {pct}%',
    weeklyDone: 'Claimed',
    weeklyLeft: '{n} left',
    weeklyMilestoneReward: 'Milestone {pct}% reached!',

    upg_sponge: 'Sponge',
    upg_sponge_desc: '+{n} dirt per tap',
    upg_crew: 'Crew',
    upg_crew_desc: 'Crew size: {n} (wash without taps)',
    upg_turbo: 'Foam cannon',
    upg_turbo_desc: '+{n}% coins per car',
    upg_speed: 'Quick turnaround',
    upg_speed_desc: 'cars arrive faster',

    adBoostBtn: 'Ad: x2 income for 3 min',
    adBoostActive: 'x2 income: {sec}s',
    adGemsBtn: 'Ad: +{n} gems',

    prestigeTitle: 'New Location',
    prestigeDesc: 'Reset coins and upgrades, gain +{p}% income forever ({rep} ★ now)',
    prestigeBtn: 'Open new location',
    prestigeLocked: 'Open new location: wash {n} more cars',

    badge_first_wash: 'First car',
    badge_wash_50: '50 cars',
    badge_wash_500: '500 cars',
    badge_wash_5000: '5000 cars',
    badge_tier_sedan: 'Sedan unlocked',
    badge_tier_sport: 'Sports car unlocked',
    badge_tier_super: 'Supercar unlocked',
    badge_taps_1000: '1000 taps',
    badge_rich_10000: '10,000 coins earned',
    badge_rich_100000: '100,000 coins earned',
    badge_first_prestige: 'First new location',
    badge_collection_econo: 'All hatchbacks collected',
    badge_collection_sedan: 'All sedans collected',
    badge_collection_suv: 'All SUVs collected',
    badge_collection_all: 'Full car collection',
    badge_tier_cabrio: 'Convertible unlocked',
    badge_tier_retro: 'Retro roadster unlocked',
    badge_tier_hyper: 'Hypercar unlocked',
    badge_weekly_track_done: 'Weekly track completed'
  }
};

export const i18n = {
  lang: 'ru',

  // Нормализуем к 2-буквенному коду: площадка может вернуть 'en-US', а таблица ждёт 'en'.
  // п.8.2.3 Требований Яндекса: язык, которого в игре НЕТ, уводим на АНГЛИЙСКИЙ
  // (международный дефолт), а не молча оставляем русский — модерация проверяет
  // ?lang=tr / ?lang=zh (отказы «Осуши озеро» и «Рубеж»). Русский — только при явном
  // 'ru'. Пустой код (нет данных о языке) оставляет дефолт 'ru'. Из
  // library/game-template v35 — перенесено в dream-wash только сейчас (2026-08-23).
  init(lang) {
    const code = String(lang || '').slice(0, 2).toLowerCase();
    if (STRINGS[code]) this.lang = code;
    else if (code) this.lang = 'en';
  },

  // t('level', { n: 3 }) -> 'Ур. 3'. Ключ, которого нет в текущем языке, падает на русский,
  // потом на сам ключ.
  t(key, params) {
    const table = STRINGS[this.lang] || STRINGS.ru;
    let s = table[key] ?? STRINGS.ru[key] ?? key;
    if (params) {
      for (const p in params) s = s.split('{' + p + '}').join(String(params[p]));
    }
    return s;
  }
};
