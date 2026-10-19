// Preload: грузит ассеты, рисует полосу загрузки, сообщает площадке о готовности.
// Вид через THEME, тексты через i18n — как и везде в игре.
import { YA } from '../yandex/sdk.js';
import { Save } from '../yandex/save.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';

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

    // Сюда добавляй ассеты игры:
    // this.load.image('key', 'assets/key.png');
  }

  async create() {
    await Save.init();     // подготовить игрока для сохранений
    YA.loadingReady();     // сообщить Яндексу, что игра готова к показу
    this.scene.start('Menu');
  }
}
