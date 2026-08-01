// ТЕМЫ мини-игры «тайминг-бар» (шкурки для движка timingbar). Это ДАННЫЕ, не UI-строки.
// Награда за победу/провал — на event-карте (rewardWin/rewardLose), не здесь.

export const TIMINGBARS = {
  lockpick: {
    key: 'lockpick',
    name: { ru: 'Взлом замка', en: 'Lockpicking' },
    goalLabel: { ru: 'Открыть замок', en: 'Pop the lock' },
    rules: {
      ru: 'Останови бегунок в зелёной зоне. Попади нужное число раз — замок открыт. Мимо — минус попытка.',
      en: 'Stop the slider in the green zone. Land enough hits to pop the lock. Miss = lost try.',
    },
    iconKey: 'art_padlock',
    colors: { bar: 0x37474f, zone: 0x66bb6a, marker: 0xffd54f },
    tuning: { rounds: 3, lives: 3, baseZone: 0.26, minZone: 0.12, zoneShrink: 0.05, speed: 0.85, speedGrow: 0.12 },
  },
  sawbars: {
    key: 'sawbars',
    name: { ru: 'Перепилить решётку', en: 'Saw the Bars' },
    goalLabel: { ru: 'Перепилить прут', en: 'Cut the bar' },
    rules: {
      ru: 'Пили в такт — фиксируй в зелёной зоне. Собьёшься — начинай сначала прут.',
      en: 'Saw in rhythm — lock in the green zone. Slip and the bar holds.',
    },
    iconKey: 'art_saw',
    colors: { bar: 0x455a64, zone: 0x66bb6a, marker: 0xffb300 },
    tuning: { rounds: 4, lives: 3, baseZone: 0.24, minZone: 0.10, zoneShrink: 0.05, speed: 0.95, speedGrow: 0.13 },
  },
  pickpocket: {
    key: 'pickpocket',
    name: { ru: 'Карманка', en: 'Pickpocket' },
    goalLabel: { ru: 'Вытащить незаметно', en: 'Lift it clean' },
    rules: {
      ru: 'Дёрни в нужный момент — фиксируй в зелёной зоне. Промах — заметят.',
      en: 'Snatch at the right moment — lock in the green zone. Miss and you\'re spotted.',
    },
    iconKey: 'art_pinch',
    colors: { bar: 0x4e342e, zone: 0x66bb6a, marker: 0xffd54f },
    tuning: { rounds: 3, lives: 2, baseZone: 0.22, minZone: 0.10, zoneShrink: 0.04, speed: 1.0, speedGrow: 0.14 },
  },
};
