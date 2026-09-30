// Preload: грузит арт, рисует полосу загрузки, поднимает прогресс и сообщает площадке
// о готовности. Список ассетов — в `data/assets.js` (там же объяснено, почему списком).
import { YA } from '../yandex/sdk.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { Progress } from '../meta/progress.js';
import { syncAchievements } from '../meta/achievements.js';
import { initAdGate } from '../core/ads.js';
import { Audio } from '../core/audio.js';
import { Analytics } from '../core/analytics.js';
import { Platform } from '../platform/index.js';
import { GAME_ID } from '../yandex/save.js';
import { allImages } from '../data/assets.js';

const METRICA_ID = 111640176;
const VK_METRICA_ID = 113225182;

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width, height } = this.scale;
    const barW = width * 0.6;

    this.add.text(width / 2, height / 2 - 60, i18n.t('loading'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, height / 2, barW, 26, THEME.colors.panel);
    const bar = this.add.rectangle(width / 2 - barW / 2, height / 2, 4, 20, THEME.colors.accent).setOrigin(0, 0.5);
    this.load.on('progress', (p) => { bar.width = 4 + (barW - 8) * p; });

    for (const [key, path] of allImages()) this.load.image(key, path);
  }

  async create() {
    // На iOS bridge теряет ответы при нескольких одновременных запросах. Облачный сейв
    // читаем первым и только после его ответа запускаем стартовые события аналитики.
    await Progress.load();
    Analytics.init(Platform.isVk ? VK_METRICA_ID : METRICA_ID, GAME_ID, {
      platform: Platform.isVk ? 'vk' : 'yandex',
      bridge: Platform.isVk ? window.vkBridge : null,
    });
    syncAchievements();
    initAdGate();
    Audio.setMuted(!!Progress.data.muted);
    YA.loadingReady();     // сообщить площадке, что игра готова к показу
    this.scene.start('Menu');
  }
}
