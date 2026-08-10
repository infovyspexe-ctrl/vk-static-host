// Preload: грузит ассеты, рисует полосу загрузки, сообщает площадке о готовности.
// Вид через THEME, тексты через i18n — как и везде в игре.
import { YA } from '../yandex/sdk.js';
import { Save } from '../yandex/save.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { HEROES } from '../data/heroes.js';
import { MONSTERS, BOSSES } from '../data/monsters.js';
import { RELICS } from '../data/relics.js';

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

    // Фоны
    this.load.image('bg_hub', 'assets/bg/hub.jpg');
    this.load.image('bg_dungeon_1', 'assets/bg/dungeon_t1.jpg');
    this.load.image('bg_dungeon_2', 'assets/bg/dungeon_t2.jpg');
    this.load.image('bg_dungeon_3', 'assets/bg/dungeon_t3.jpg');

    // Герои, монстры, боссы, реликвии, декор подземелья — ключи берём ИЗ ДАННЫХ
    // (поле icon в src/data/*.js), а не дублируем список руками: разъехавшийся
    // руками список уже один раз стоил битых текстур на алтаре (см. NOTES.md).
    const iconKeys = [
      ...Object.values(HEROES).map((h) => h.icon),
      ...Object.values(MONSTERS).map((m) => m.icon),
      ...Object.values(BOSSES).map((b) => b.icon),
      ...RELICS.map((r) => r.icon),
      'prop_chest', 'prop_stairs', 'prop_torch', 'prop_altar',
      'currency_spirit', 'currency_sparks'
    ];
    for (const key of iconKeys) this.load.image(key, 'assets/icons/' + key + '.png');
  }

  async create() {
    await Save.init();     // подготовить игрока для сохранений
    YA.loadingReady();     // сообщить Яндексу, что игра готова к показу
    this.scene.start('Menu');
  }
}
