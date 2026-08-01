// ТЕМЫ мини-игры (данные-шкурки для одной механики lane-runner). Это ДАННЫЕ, не UI-строки.
// Что значат светлая/тёмная/знак-карта, эмодзи-плейсхолдеры, цвета, тексты, числа баланса.
// Награда за победу/провал живёт на event-карте (rewardWin/rewardLose), не здесь.

export const MINIGAMES = {
  brawl: {
    key: 'brawl',
    name: { ru: 'Драка', en: 'Brawl' },
    goalLabel: { ru: 'Вырубить бугая', en: 'Down the bully' },
    // Правила называют словами то, что нарисовано в icons ниже, и не используют эмодзи:
    // текст и экран обязаны совпадать, а эмодзи вдобавок есть не на всех устройствах.
    rules: {
      ru: 'Лови звёзды — бей бугая. Уходи от кулаков, иначе получишь. Щит держит один удар.',
      en: 'Grab the stars to hit the bully. Dodge the fists or you take it. The shield holds one hit.',
    },
    icons: { player: 'art_hero', goal: 'art_boss', dark: 'art_respect', light: 'art_star', sign: 'art_shield' },
    colors: { dark: 0x6d4c41, light: 0xffb300, sign: 0x42a5f5, goal: 0xef5350 },
    tuning: { playerHP: 5, goalHits: 12, startTick: 850, minTick: 560 },
  },
  dash: {
    key: 'dash',
    name: { ru: 'Рывок через двор', en: 'Yard Dash' },
    goalLabel: { ru: 'Добежать до ворот', en: 'Reach the gate' },
    rules: {
      ru: 'Лови рывки — рвись к воротам. Беги от прожектора. Дымовуха прикроет один раз.',
      en: 'Grab the dashes to reach the gate. Flee the spotlight. The smoke covers you once.',
    },
    icons: { player: 'art_hero', goal: 'art_gate', dark: 'art_spotlight', light: 'art_dash', sign: 'art_smoke' },
    colors: { dark: 0x455a64, light: 0x66bb6a, sign: 0x90a4ae, goal: 0x42a5f5 },
    tuning: { playerHP: 5, goalHits: 12, startTick: 830, minTick: 540 },
  },
  kitchen: {
    key: 'kitchen',
    name: { ru: 'Шухер на кухне', en: 'Kitchen Scramble' },
    goalLabel: { ru: 'Набрать пайку', en: 'Grab the grub' },
    rules: {
      ru: 'Хватай окорочка — набирай пайку. Уходи от фуражек. Щит прикроет один раз.',
      en: 'Grab the drumsticks to stock up. Slip past the guard caps. The shield covers you once.',
    },
    icons: { player: 'art_hero', goal: 'art_pot', dark: 'art_guardcap', light: 'art_drumstick', sign: 'art_shield' },
    colors: { dark: 0x455a64, light: 0xef6c00, sign: 0x42a5f5, goal: 0x26a69a },
    tuning: { playerHP: 5, goalHits: 12, startTick: 830, minTick: 540 },
  },
};
