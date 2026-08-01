// Локализация. ВСЕ тексты интерфейса берём через i18n.t('ключ'),
// в сценах не хардкодим строки. Язык берётся из Яндекса, по умолчанию русский.
// Локальная проверка перевода: ?lang=en в адресе.
//
// Тексты КАРТОЧЕК живут не здесь, а в src/data/content.js (это данные, их сотни).
// Здесь — только обвязка интерфейса.
const STRINGS = {
  ru: {
    title: 'РЕШАЛА',
    subtitle: 'Тюремная комедия',
    loading: 'Загрузка...',
    paused: 'Пауза',
    resume: 'Продолжить',
    quitConfirm: 'Выйти в меню? Прогресс текущего забега не сохранится.',
    soundOn: 'Звук: вкл',
    soundOff: 'Звук: выкл',
    soundBtn: 'Звук',           // короткая подпись под иконкой (состояние показывает сама иконка)

    // меню
    modeEndless: 'СРОК',
    modeEndlessHint: 'Продержись как можно дольше',
    modeCampaign: 'ПОБЕГ',
    modeCampaignHint: 'Сбеги с зоны',
    howto: 'Как играть',
    leaderboardBtn: 'Рекорды',
    achBtn: 'Достижения',
    back: 'Назад',

    // достижения (удержание)
    achTitle: 'Достижения',
    achProgress: 'Открыто {n} из {m}',
    achUnlocked: 'Достижение',

    // таблица рекордов
    leaderboardTitle: 'Таблица рекордов',
    leaderboardEmpty: 'Пока никто не отметился. Стань первым!',
    leaderboardOffline: 'Таблица рекордов доступна на Яндекс Играх',
    lbDays: '{n} дн.',
    lbYou: 'ты',
    lbAnon: 'Аноним',

    // как играть
    howtoTitle: 'Как играть',
    // Без эмодзи: 🪜 нет в Arial и в шрифтах части устройств — игрок видел пустой квадрат.
    howtoText: 'Каждый день выпадает карточка. Свайпни ВЛЕВО или ВПРАВО (или ←/→) — это твоё решение. Подозрение и авторитет держи посередине: смертельны и ноль, и потолок. Здоровью опасен только ноль. В «Побеге» история идёт главами, и каждая кончается попыткой побега: сорвалась — пробуешь в следующей. Набери шкалу побега или дойди до последней главы — и ты на воле.',

    // объяснение шкал при первом запуске (жалоба: непонятно, почему 100 здоровья — норма,
    // а 100 подозрения — смерть; игрок воспринимал все три одинаково)
    tutTitle: 'Три шкалы',
    tutSuspicion: 'Подозрение охраны. Ноль — стал пустым местом, потолок — вычислили и взяли в оборот. Смертельны ОБА края.',
    tutRespect: 'Авторитет у своих. Ноль — никто не заступится, потолок — ты угроза и для начальства. Опасны ОБА края.',
    tutHealth: 'Здоровье. Опасен только ноль. Полная шкала — это хорошо.',
    tutHint: 'Первые две держи посередине. Забег кончается, когда любая из них упёрлась в край.',
    tutOk: 'Понятно',

    // шкалы
    mSuspicion: 'Подозрение',
    mRespect: 'Авторитет',
    mHealth: 'Здоровье',
    mEscape: 'Побег',

    // игра
    day: 'День {n}',
    blockLabel: 'Глава {n}',       // блочный сюжет: номер главы рядом с днём
    best: 'Рекорд: {n}',
    dragHint: 'Тяни карту или нажми на выбор',
    replyNext: 'Дальше',

    go: 'Поехали',

    // итоги
    over: 'Забег окончен',
    daysSurvived: 'Ты продержался {n} дн.',
    newRecord: 'Новый рекорд!',
    again: 'Ещё раз',
    toMenu: 'В меню',
    freedomTitle: 'ПОБЕГ УДАЛСЯ!',
    freedomText: 'Ты вырвался за забор — и растворился в ночи. Свобода пахнет мокрой травой и удачей!',
    caughtTitle: 'Поймали!',

    // вторая попытка побега за рекламу
    retryTitle: 'Сорвалось',
    retryBody: 'Посмотри короткий ролик — и попробуешь сбежать ещё раз в этой же главе.',
    retryWatch: 'Ещё попытка ▶',
    retrySkip: 'Дальше',

    // коллекция
    collectionBtn: 'Коллекция {n}/{m}',
    collectionTitle: 'Коллекция',
    charLocked: 'Не встречен',
    charSeenHint: 'Встреть ещё {n}×, чтобы узнать',
    metCount: 'Встреч: {n}',
    tapToView: 'Нажми на персонажа',

    // мини-игра
    mgStart: 'Начать',
    mgWin: 'Победа!',
    mgLose: 'Провал!',
    mgLoseReason: 'Жизни кончились!',
    mgLives: 'Жизни',
    mgIntroHow: 'Жми кнопки ◄ ► внизу (или ←/→) — веди героя под нужное. Стоять на месте нельзя: {n} жизней, потеряешь все — проигрыш.',
    mgNext: 'Дальше',
    mgTapHint: 'Кнопки ◄ ► внизу или клавиши ←/→',
    tbTapHint: 'Тап / Пробел — зафиксировать',
    sgTapHint: 'Следи за кружками, потом выбери',
  },
  en: {
    title: 'RESHALA',
    subtitle: 'A prison comedy',
    loading: 'Loading...',
    paused: 'Paused',
    resume: 'Resume',
    quitConfirm: 'Quit to menu? Progress of the current run will not be saved.',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    soundBtn: 'Sound',

    modeEndless: 'THE TIME',
    modeEndlessHint: 'Survive as long as you can',
    modeCampaign: 'THE ESCAPE',
    modeCampaignHint: 'Break out of prison',
    howto: 'How to play',
    leaderboardBtn: 'Leaderboard',
    achBtn: 'Achievements',
    back: 'Back',

    achTitle: 'Achievements',
    achProgress: 'Unlocked {n} of {m}',
    achUnlocked: 'Achievement',

    // leaderboard
    leaderboardTitle: 'Leaderboard',
    leaderboardEmpty: 'No scores yet. Be the first!',
    leaderboardOffline: 'Leaderboard is available on Yandex Games',
    lbDays: '{n} d',
    lbYou: 'you',
    lbAnon: 'Anonymous',

    howtoTitle: 'How to play',
    howtoText: 'Each day you get a card. Swipe LEFT or RIGHT (or ←/→) to decide. Keep suspicion and respect mid-range: both zero and full are fatal. For health only zero is deadly. In "The Escape" the story runs in chapters, and each one ends with an escape attempt: if it fails, you try again in the next. Fill the escape meter or reach the final chapter — and you are out.',

    tutTitle: 'Three meters',
    tutSuspicion: 'Guard suspicion. Zero means you are a nobody, full means they have made you. BOTH edges end the run.',
    tutRespect: 'Respect. Zero means nobody backs you, full makes you a threat to the bosses too. BOTH edges end the run.',
    tutHealth: 'Health. Only zero is deadly. A full bar is good.',
    tutHint: 'Keep the first two near the middle. The run ends when either hits an edge.',
    tutOk: 'Got it',

    mSuspicion: 'Suspicion',
    mRespect: 'Respect',
    mHealth: 'Health',
    mEscape: 'Escape',

    day: 'Day {n}',
    blockLabel: 'Chapter {n}',
    best: 'Best: {n}',
    dragHint: 'Drag the card or tap a choice',
    replyNext: 'Next',

    go: "Let's go",

    over: 'Run over',
    daysSurvived: 'You lasted {n} days',
    newRecord: 'New record!',
    again: 'Again',
    toMenu: 'Menu',
    freedomTitle: 'YOU ESCAPED!',
    freedomText: 'You slipped past the fence and melted into the night. Freedom smells like wet grass and dumb luck!',
    caughtTitle: 'Caught!',

    retryTitle: 'Botched it',
    retryBody: 'Watch a short video and try the escape again in this same chapter.',
    retryWatch: 'Try again ▶',
    retrySkip: 'Move on',

    // collection
    collectionBtn: 'Collection {n}/{m}',
    collectionTitle: 'Collection',
    charLocked: 'Not met yet',
    charSeenHint: 'Meet {n}× more to learn',
    metCount: 'Met: {n}',
    tapToView: 'Tap a character',

    // mini-game
    mgStart: 'Start',
    mgWin: 'You win!',
    mgLose: 'You lose!',
    mgLoseReason: 'Out of lives!',
    mgLives: 'Lives',
    mgIntroHow: 'Use the ◄ ► buttons below (or ←/→) to steer the hero onto the good stuff. Don\'t just stand still: {n} lives, lose them all and you lose.',
    mgNext: 'Continue',
    mgTapHint: 'The ◄ ► buttons below, or arrow keys ←/→',
    tbTapHint: 'Tap / Space to lock',
    sgTapHint: 'Watch the cups, then pick',
  },
};

export const i18n = {
  lang: 'ru',

  init(lang) { if (lang && STRINGS[lang]) this.lang = lang; },

  // Взять из словаря текущего языка часть контента вида { ru, en }.
  pick(obj) { if (!obj) return ''; return obj[this.lang] ?? obj.ru ?? ''; },

  // t('day', { n: 5 }) подставит {n}. Нет ключа — падаем на ru, потом на сам ключ.
  t(key, params) {
    const table = STRINGS[this.lang] || STRINGS.ru;
    let s = table[key] ?? STRINGS.ru[key] ?? key;
    if (params) {
      for (const p in params) s = s.split('{' + p + '}').join(String(params[p]));
    }
    return s;
  },
};
