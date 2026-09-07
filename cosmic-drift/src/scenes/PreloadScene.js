// Preload: грузит ассеты, рисует полосу загрузки, сообщает площадке о готовности.
// Вид через THEME, тексты через i18n.
import { YA } from '../yandex/sdk.js';
import { Save } from '../yandex/save.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { AdGate } from '../core/adGate.js';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width, height } = this.scale;
    const barW = width * 0.6;

    this.add.text(width / 2, height / 2 - 50, i18n.t('loading'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, height / 2, barW, 30, THEME.colors.panel).setStrokeStyle(2, THEME.colors.panelBorder);
    const bar = this.add.rectangle(width / 2 - barW / 2, height / 2, 4, 24, THEME.colors.primary).setOrigin(0, 0.5);

    this.load.on('progress', (p) => { bar.width = 4 + (barW - 8) * p; });

    // ── Ассеты игры ──
    this.load.image('bg_tile', 'assets/bg_tile.png'); // тайловый бесшовный фон (бесконечный мир)
    this.load.image('bg', 'assets/bg_space.png');      // статичный фон для меню
    this.load.image('logo', 'assets/logo.png');
    this.load.image('player', 'assets/player.png');
    this.load.image('xp', 'assets/xp_crystal.png');

    // Враги (ключи совпадают с texture в data/enemies.js).
    const enemies = ['fighter', 'jelly', 'crab', 'dart', 'bat', 'hex', 'butterfly', 'saucer', 'serpent'];
    for (const e of enemies) this.load.image('enemy_' + e, 'assets/enemies/enemy_' + e + '.png');

    // Иконки апгрейдов (ключи совпадают с icon в data/upgrades.js и data/meta.js).
    const upgIcons = ['damage', 'firerate', 'speed', 'maxhp', 'multishot', 'pierce', 'armor',
      'bulletspeed', 'range', 'regen', 'heal', 'pickup', 'xpgain', 'fullheal',
      // Новые иконки эффектов (докуплены/переиспользованы — см. picks.json):
      'chain', 'drone', 'explode', 'homing', 'crit', 'thorns', 'slow', 'bulletsize'];
    for (const u of upgIcons) this.load.image('upg_' + u, 'assets/upgrades/upg_' + u + '.png');
  }

  async create() {
    await Save.init();     // подготовить площадку для сохранений (no-op, как в шаблоне)
    await Save.load();     // загрузить прогресс в Save.cache — к моменту Menu кэш готов

    // Политика показов рекламы поднимается из meta. Дату модуль получает СТРОКОЙ: про
    // часовые пояса он не знает, за формат отвечает вызывающий (локальная дата, не UTC —
    // иначе у игрока восточнее Гринвича «новый день» наступал бы посреди вечера).
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    AdGate.init({
      state: (Save.cache && Save.cache.meta) || {},
      today,
      // Суточные лимиты обязаны переживать F5: без немедленной записи потраченная попытка
      // сохранялась бы только на конце партии, и перезагрузка возвращала свежий бакет.
      // Save.update дебаунсит и склеивает частые вызовы — лишних запросов в облако не будет.
      onChange: (state) => {
        const meta = (Save.cache && Save.cache.meta) || {};
        Save.update({ meta: Object.assign(meta, state) });
      }
    });

    YA.loadingReady();     // сообщить Яндексу, что игра готова к показу
    this.scene.start('Menu');
  }
}
