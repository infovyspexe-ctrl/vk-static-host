// Preload: грузит ассеты, рисует полосу загрузки, сообщает площадке о готовности.
// Вид через THEME, тексты через i18n — как и везде в игре.
import { YA } from '../yandex/sdk.js';
import { Save } from '../yandex/save.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { TIERS, LOCATIONS } from '../data/balance.js';

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

    for (const loc of LOCATIONS) this.load.image(loc.bg, 'assets/' + loc.bg + '.jpg');
    // bg_bay — исходная цельная сцена, больше не входит в LOCATIONS (её место занял
    // bay_backdrop), но её ключ по-прежнему нужен MenuScene для заставки меню.
    this.load.image('bg_bay', 'assets/bg_bay.jpg');
    for (const loc of LOCATIONS) if (loc.portal) this.load.image(loc.portal, 'assets/' + loc.portal + '.png');
    this.load.image('logo', 'assets/logo.png');
    // Только ЧИСТЫЕ машины: «грязный» слой — та же текстура с коричневым тинтом
    // поверх (GameScene.buildCarArea), гарантированно совпадает силуэтом и не
    // требует второй AI-генерации с риском несовпадения позы/масштаба между
    // независимо сгенерированными «чистым» и «грязным» листами.
    // Косметические варианты окраски (TIERS.variants) грузятся все — какой выпадет,
    // решает carwash.js при спавне.
    for (const t of TIERS) {
      for (const v of (t.variants || [''])) {
        this.load.image('car_clean_' + t.id + v, 'assets/cars/clean_' + t.id + v + '.png');
      }
    }
    for (const key of ['sponge', 'crew', 'turbo', 'speed', 'trophy', 'star', 'lock', 'coin', 'gem']) {
      this.load.image('icon_' + key, 'assets/icons/' + key + '.png');
    }
  }

  async create() {
    await Save.init();     // подготовить игрока для сохранений
    YA.loadingReady();     // сообщить Яндексу, что игра готова к показу
    this.scene.start('Menu');
  }
}
