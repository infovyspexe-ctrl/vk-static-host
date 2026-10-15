// Preload: грузит ассеты, рисует полосу загрузки, сообщает площадке о готовности.
// Вид через THEME, тексты через i18n — как и везде в игре.
import { YA } from '../yandex/sdk.js';
import { Save } from '../yandex/save.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { DISTRICTS } from '../data/districts.js';
import { INGREDIENTS } from '../data/balance.js';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width, height } = this.scale;
    const barW = width * 0.6;

    this.add.text(width / 2, height / 2 - 50, i18n.t('loading'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, height / 2, barW, 30, THEME.colors.panel);
    const bar = this.add.rectangle(width / 2 - barW / 2, height / 2, 4, 24, THEME.colors.primary).setOrigin(0, 0.5);

    this.load.on('progress', (p) => { bar.width = 4 + (barW - 8) * p; });

    // ── АССЕТЫ ИГРЫ ──────────────────────────────────────────────────────
    // Всё грузится здесь, одним пакетом: суммарно около 2 МБ, что заметно ниже
    // идеала методики площадок (<8 МБ до первого кадра). Дробить загрузку по районам
    // смысла нет — выигрыш был бы в сотнях килобайт, а кода и риска добавилось бы.
    //
    // Отсутствие любого файла НЕ должно ронять игру: во всех местах отрисовки стоит
    // проверка textures.exists() и запасной путь на примитивах.
    DISTRICTS.forEach((d) => this.load.image(d.bg, 'assets/bg/' + d.bg + '.jpg'));

    // Гости: ключ cust_<id>. guest2 — второй безымянный, для разнообразия очереди.
    ['mario', 'lucia', 'gino', 'sofia', 'marco', 'elena', 'don', 'guest', 'guest2']
      .forEach((id) => this.load.image('cust_' + id, 'assets/customers/' + id + '.png'));

    // Ингредиенты: ключ ing_<id>, совпадает с id из data/balance.js.
    Object.keys(INGREDIENTS).forEach((id) => this.load.image('ing_' + id, 'assets/ing/' + id + '.png'));

    this.load.image('obj_oven', 'assets/objects/oven.png');
    this.load.image('obj_envelope', 'assets/objects/envelope.png');
  }

  async create() {
    await Save.init();     // подготовить игрока для сохранений
    YA.loadingReady();     // сообщить Яндексу, что игра готова к показу
    this.scene.start('Menu');
  }
}
