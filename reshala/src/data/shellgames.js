// ТЕМЫ мини-игры «напёрстки» (шкурки для движка shellgame). Это ДАННЫЕ, не UI-строки.
// Награда за победу/провал — на event-карте (rewardWin/rewardLose), не здесь.

export const SHELLGAMES = {
  bread: {
    key: 'bread',
    name: { ru: 'Напёрстки: сухарь', en: 'Shells: bread' },
    goalLabel: { ru: 'Найти сухарь', en: 'Find the bread' },
    rules: {
      ru: 'Следи, под какой кружкой сухарь. Перемешали — выбери верную. Ошибся — минус попытка.',
      en: 'Watch which cup hides the bread. After the shuffle, pick right. Miss = lost try.',
    },
    itemKey: 'art_bread',
    colors: { cup: 0x8d6e63 },
    tuning: { cups: 3, rounds: 3, lives: 3, swapsBase: 5, swapsGrow: 2, swapMs: 180, revealMs: 620 },
  },
  key: {
    key: 'key',
    name: { ru: 'Напёрстки: ключ', en: 'Shells: key' },
    goalLabel: { ru: 'Найти ключ', en: 'Find the key' },
    rules: {
      ru: 'Под одной кружкой — ключ от двери. Проследи за перемешиванием и выбери верную.',
      en: 'One cup hides a door key. Track the shuffle and pick the right one.',
    },
    itemKey: 'art_key',
    colors: { cup: 0x607d8b },
    tuning: { cups: 3, rounds: 3, lives: 3, swapsBase: 6, swapsGrow: 2, swapMs: 170, revealMs: 600 },
  },
  chip: {
    key: 'chip',
    name: { ru: 'Напёрстки: жетон', en: 'Shells: token' },
    goalLabel: { ru: 'Найти жетон', en: 'Find the token' },
    rules: {
      ru: 'Ставка — жетон. Следи за кружками и выбери, под какой он.',
      en: 'The stake is a token. Watch the cups and pick where it hides.',
    },
    itemKey: 'art_coin',
    colors: { cup: 0x6d4c41 },
    tuning: { cups: 3, rounds: 3, lives: 2, swapsBase: 5, swapsGrow: 3, swapMs: 165, revealMs: 600 },
  },
};
