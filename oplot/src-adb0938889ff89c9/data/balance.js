// БАЛАНС отдельно от логики. Все числа игры живут здесь, а не в коде сцен.
// Цифры можно крутить, не трогая механику. Большие таблицы удобно сначала
// посчитать в таблице (xlsx) и выгрузить сюда как готовые данные.
export const BALANCE = {
  tapReward: 1,
  adReward: 10

  // Пример таблицы для фермы:
  // crops: {
  //   apple:  { growSeconds: 30,  sellPrice: 5,  buySeed: 2 },
  //   pear:   { growSeconds: 60,  sellPrice: 12, buySeed: 5 },
  //   grape:  { growSeconds: 120, sellPrice: 30, buySeed: 12 }
  // }
};
