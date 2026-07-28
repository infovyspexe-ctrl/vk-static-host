// ЗАГРУЗЧИК АРТА. Все картинки опциональны: пока файл не загрузился (или его
// нет вовсе), рендер рисует кодовую версию — игра играбельна с первого кадра,
// арт «доезжает» фоном (RETENTION.md: играбельность раньше полной загрузки).
export const Assets = {
  _images: {},

  init() {
    this._load('bg', 'assets/bg.jpg');
    for (const branch of ['fruit', 'veg']) {
      for (let rank = 0; rank < 7; rank++) {
        this._load(branch + '_' + rank, 'assets/fruits/' + branch + '_' + rank + '.png');
      }
    }
  },

  _load(key, url) {
    const img = new Image();
    img.onload = () => { this._images[key] = img; };
    img.onerror = () => {}; // нет файла — молча остаёмся на кодовой графике
    img.src = url;
  },

  // Готовое изображение или null (ещё грузится / отсутствует).
  img(key) { return this._images[key] || null; }
};
