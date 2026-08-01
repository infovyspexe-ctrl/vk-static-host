// Флейвор концовок забега (данные, двуязычные). Ключ — `${meter}_${edge}`.
// Тон комедийный, без жести — карцер это смешная тёмная комнатка, «слёг» = отлёживается.

export const END_REASONS = {
  suspicion_max: {
    ru: 'Перебор! Охрана взяла тебя с поличным. Карцер и режим строгого молчания.',
    en: 'Too much! The guards caught you red-handed. Solitary and total silence.',
  },
  suspicion_min: {
    ru: 'Ты стал тише воды. Кум решил: раз такой незаметный — точно что-то мутит. В карцер для профилактики.',
    en: 'You went dead quiet. The warden figured someone that invisible must be up to something. Solitary, just in case.',
  },
  respect_max: {
    ru: 'Ты стал слишком крутым. Смотрящий увидел угрозу — и тебя по-тихому «попросили» с зоны игроков.',
    en: 'You got too big. The Boss saw a threat and quietly pushed you out of the game.',
  },
  respect_min: {
    ru: 'Авторитет на нуле. Тебя затравили и объявили тёмную — забег окончен.',
    en: 'Zero respect. They ganged up on you — the run is over.',
  },
  health_min: {
    ru: 'Силы кончились. Ты слёг на нары и выбыл из игры.',
    en: 'Out of strength. You collapsed on the bunk and dropped out.',
  },
};

// Универсальный текст, если причина не нашлась.
export const END_FALLBACK = {
  ru: 'Забег окончен.',
  en: 'Run over.',
};

// Кампания: поймали до побега.
export const CAUGHT = {
  ru: 'Тебя раскусили за шаг до свободы. Побег сорвался.',
  en: 'They saw through you one step from freedom. The escape failed.',
};
