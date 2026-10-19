// Локализация. ВСЕ тексты интерфейса берём через i18n.t('ключ'),
// в сценах не хардкодим строки. Язык берётся из Яндекса, по умолчанию русский.
// Локальная проверка перевода: ?lang=en в адресе.
//
// Подстановка параметров: строка 'Волна {n}' + i18n.t('wave', { n: 5 }) -> 'Волна 5'.
// Не собирай фразы конкатенацией ('Волна ' + n): в другом языке порядок слов другой,
// и перевод рассыпется. Вся фраза целиком живёт в словаре, меняются только подстановки.
const STRINGS = {
  ru: {
    title: 'НАЗВАНИЕ ИГРЫ',
    play: 'Играть',
    loading: 'Загрузка...',
    paused: 'Пауза',
    score: 'Счёт',
    tap: 'Тапай: +1',
    reward: 'Реклама: +10',
    toMenu: 'В меню',
    soundOn: 'Звук: вкл',
    soundOff: 'Звук: выкл',
    adCountdown: 'Реклама через {n}…'
  },
  en: {
    title: 'GAME TITLE',
    play: 'Play',
    loading: 'Loading...',
    paused: 'Paused',
    score: 'Score',
    tap: 'Tap: +1',
    reward: 'Ad: +10',
    toMenu: 'Menu',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    adCountdown: 'Ad in {n}…'
  }
};

export const i18n = {
  lang: 'ru',

  // Нормализуем к 2-буквенному коду: площадка может вернуть 'en-US', а таблица ждёт 'en'.
  // Незнакомый язык оставляет русский (STRINGS[code] не найдётся).
  // п.8.2.3 Требований Яндекса: язык, которого в игре НЕТ, уводим на АНГЛИЙСКИЙ
  // (международный дефолт), а не на русский — модерация проверяет ?lang=tr / ?lang=zh
  // (отказы «Осуши озеро» 559414 и 2026-08-20). Русский — только при явном 'ru'.
  // Пустой код (нет данных о языке) оставляет дефолт 'ru'.
  init(lang) {
    const code = String(lang || '').slice(0, 2).toLowerCase();
    if (STRINGS[code]) this.lang = code;
    else if (code) this.lang = 'en';
  },

  // t('score') -> 'Счёт'. t('wave', { n: 5 }) подставит {n} в строку.
  // Ключ, которого нет в текущем языке, падает на русский, потом на сам ключ.
  t(key, params) {
    const table = STRINGS[this.lang] || STRINGS.ru;
    let s = table[key] ?? STRINGS.ru[key] ?? key;
    if (params) {
      for (const p in params) s = s.split('{' + p + '}').join(String(params[p]));
    }
    return s;
  }
};
