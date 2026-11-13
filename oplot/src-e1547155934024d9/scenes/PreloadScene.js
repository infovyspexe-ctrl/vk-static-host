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
    this.load.image('mission-targets','assets/art/notebook/mission-targets.png');
    this.load.image('notebook-workshop','assets/art/notebook/workshop.png');
    this.load.image('notebook-watchtower','assets/art/notebook/watchtower.png');

    for (const id of ['archer','crossbowman','ranger','shooter','gunner','buckshot','cannon','howitzer','mortar','rocket','volley','shaped','grenadier','wideBlast','denseBlast','wood','brick','iron','gold','shield']) {
      const file = id === 'gunner' ? 'gunner-volley' : id;
      this.load.image(`notebook-${id}`, `assets/art/notebook/${file}.png`);
    }
  }

  async create() {
    const targets=this.textures.get('mission-targets');
    this.textures.get('notebook-workshop').add('trimmed',0,50,159,1675,558);
    this.textures.get('notebook-watchtower').add('trimmed',0,157,8,573,1753);
    // Bounds measured from alpha, not an assumed equal grid; soles share the baseline.
    targets.add('engineer',0,346,82,360,756);
    targets.add('signalPost',0,930,26,774,810);
    await Save.init();     // подготовить игрока для сохранений
    YA.loadingReady();     // сообщить Яндексу, что игра готова к показу
    this.scene.start('Menu');
  }
}
