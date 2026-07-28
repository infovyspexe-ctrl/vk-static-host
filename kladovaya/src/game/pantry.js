// КЛАДОВАЯ — мета-прогресс игры (RETENTION.md, раздел 4): коллекция закатанных
// банок живёт между партиями. 14 рецептов (2 ветки × 7 рангов), новый рецепт —
// событие и плашка. Модуль держит только состояние; сохранением занимается
// game.js через слой платформы, отрисовкой — render.js.
export const Pantry = {
  counts: {},     // 'fruit_3' -> сколько банок закатано
  recipes: {},    // 'fruit_3' -> 1, рецепт открыт
  collection: {}, // id коллекционной банки -> сколько раз собрана

  load(saved) {
    this.counts = (saved && saved.pantry) || {};
    this.recipes = (saved && saved.recipes) || {};
    this.collection = (saved && saved.collection) || {};
  },

  key(branch, rank) { return branch + '_' + rank; },

  // Закатать банку. Возвращает true, если рецепт открыт впервые.
  add(branch, rank) {
    const key = this.key(branch, rank);
    this.counts[key] = (this.counts[key] || 0) + 1;
    const isNew = !this.recipes[key];
    if (isNew) this.recipes[key] = 1;
    return isNew;
  },

  count(branch, rank) { return this.counts[this.key(branch, rank)] || 0; },
  discovered(branch, rank) { return !!this.recipes[this.key(branch, rank)]; },

  // Списать банку (сборка заказа). Рецепт остаётся открытым.
  consume(branch, rank) {
    const key = this.key(branch, rank);
    if (!this.counts[key]) return false;
    this.counts[key]--;
    return true;
  },

  // Коллекционная банка собрана. Возвращает true, если впервые.
  addCollection(id) {
    const isNew = !this.collection[id];
    this.collection[id] = (this.collection[id] || 0) + 1;
    return isNew;
  },

  collectionCount(id) { return this.collection[id] || 0; },
  collectionsOpened() { return Object.keys(this.collection).length; },

  // Списать одну коллекционную банку (обмен на ярмарке).
  consumeCollection(id) {
    if (!this.collection[id]) return false;
    this.collection[id]--;
    if (!this.collection[id]) delete this.collection[id];
    return true;
  },

  totalJars() {
    let n = 0;
    for (const k in this.counts) n += this.counts[k];
    return n;
  },

  recipesOpened() { return Object.keys(this.recipes).length; }
};
