// СТОЛ ЗАГОТОВОК: несколько пицц в работе одновременно.
//
// Зачем отдельным модулем: связка «гость — пицца — печь» уже дважды ломалась, и оба раза
// это ловил игрок, а не тесты. Управление местами вынесено из сцены в чистые функции,
// чтобы его можно было проверить без браузера.
//
// entry — это пара { cust, pizza }. Модуль не знает, что внутри: ни про Phaser, ни про
// правила игры. Единственное, о чём он осведомлён, — что у пары есть поле cust, по которому
// её ищут (сцена спрашивает «этот гость уже на столе?»).

export function createPrepTable(size) {
  return { slots: new Array(Math.max(1, size | 0)).fill(null) };
}

export function entryAt(table, index) {
  return table.slots[index] || null;
}

export function usedCount(table) {
  return table.slots.filter(Boolean).length;
}

export function isFull(table) {
  return table.slots.every(Boolean);
}

// Занять первое свободное место. −1 = мест нет; вызывающий обязан сообщить игроку,
// а не терять заказ молча.
//
// Тот же гость дважды на стол не кладётся: два места на одного — это две пиццы, из
// которых вторая гарантированно уйдёт в никуда. Сцена и так спрашивает indexOfCustomer
// заранее, но подстраховка стоит одну строку, а стоимость ошибки — зависший заказ.
export function assign(table, entry) {
  if (entry && entry.cust && indexOfCustomer(table, entry.cust) >= 0) return -1;
  const i = table.slots.findIndex((s) => !s);
  if (i < 0) return -1;
  table.slots[i] = entry;
  return i;
}

export function release(table, index) {
  const e = table.slots[index];
  if (!e) return null;
  table.slots[index] = null;
  return e;
}

export function indexOfCustomer(table, cust) {
  return table.slots.findIndex((s) => s && s.cust === cust);
}

// Изменить число мест (апгрейд стола). Сужать ниже числа занятых мест НЕЛЬЗЯ:
// выброшенная заготовка — это зависший гость, которого некому обслужить.
// Ниже одного места стол не сжимается вообще: стол на ноль мест означает «работать
// негде», то есть смену, в которой заказ нельзя взять никогда.
export function resize(table, size) {
  const target = Math.max(1, size | 0);
  if (target >= table.slots.length) {
    while (table.slots.length < target) table.slots.push(null);
    return;
  }
  if (target < usedCount(table)) return;
  table.slots.length = target;
}
