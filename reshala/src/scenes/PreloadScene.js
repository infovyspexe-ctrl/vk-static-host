// Preload: грузит ассеты, рисует полосу загрузки, сообщает площадке о готовности.
// Вид через THEME, тексты через i18n — как и везде в игре.
import { YA } from '../yandex/sdk.js';
import { Save } from '../yandex/save.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { CONTENT } from '../data/content.js';
import { UI_ICONS } from '../data/ui-icons.js';
import { bus } from '../core/events.js';

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

    // Фоны: JPEG, а не PNG — они непрозрачные, альфа им не нужна, а PNG весил в 10 раз больше
    // (2.6 МБ против 233 КБ на три фона) и держал игрока на экране загрузки.
    this.load.image('bg_menu', 'assets/art/bg_menu.jpg');
    this.load.image('bg_cellblock', 'assets/art/bg_cellblock.jpg');
    this.load.image('bg_yard', 'assets/art/bg_yard.jpg');
    this.load.image('bg_night', 'assets/art/bg_night.jpg');
    // Фоны локаций блочного сюжета (спека 2026-07-18): сцена ставит фон под place карты.
    // +454 КБ к старту — если старт станет узким местом, эти шесть можно догружать фоном
    // из меню, как сделано с музыкой (см. Audio.lazyLoad).
    for (const p of ['canteen', 'corridor', 'library', 'medbay', 'laundry', 'workshop']) {
      this.load.image('bg_' + p, 'assets/art/bg_' + p + '.jpg');
    }
    // портреты персонажей (ключ portrait_<who>)
    for (const c of CONTENT.characters) this.load.image('portrait_' + c.key, 'assets/art/portraits/' + c.key + '.png');
    // все иконки (ключ art_<name>): шкалы + предметы мини-игр
    const ICONS = [
      'suspicion', 'respect', 'health', 'escape',            // шкалы
      'boss', 'gate', 'pot', 'dash', 'guardcap', 'hero',     // lane-runner
      'star', 'spotlight', 'drumstick', 'shield', 'smoke',   // lane-runner
      'padlock', 'saw', 'pinch',                             // тайминг-бар
      'mug', 'bread', 'key', 'coin', 'pow', 'keys', 'whistle', // напёрстки / прочее
    ];
    for (const name of ICONS) this.load.image('art_' + name, 'assets/art/icons/' + name + '.png');
    // иконки интерфейса (ключ ui_<name>)
    for (const name of UI_ICONS) this.load.image('ui_' + name, 'assets/art/icons/ui/ui_' + name + '.png');

    // Музыку здесь НЕ грузим: браузер всё равно не даст ей играть до жеста игрока, так что
    // 4.4 МБ в старте — это чистое ожидание на экране загрузки. Треки догружаются фоном
    // из MenuScene (Audio.lazyLoad), пока игрок читает меню.
  }

  async create() {
    await Save.init();     // подготовить игрока для сохранений
    // Прогресс читаем ОДИН раз здесь, дальше сцены берут готовый Save.cache синхронно.
    // На Яндексе player.getData() — сетевой запрос: если его ждать в create() игровой
    // сцены, то при перезапуске сцены доехавший «хвост» прошлого create() достраивает
    // ВТОРОЙ комплект объектов поверх живого (задвоенный HUD, замерший на стартовых
    // значениях). Ожидание убрано из create() — гонки нет по построению.
    await Save.load();
    YA.loadingReady();     // сообщить Яндексу, что игра готова к показу

    // DEV-запуск одной сцены для теста, ТОЛЬКО когда включён черновой флаг (draft) в URL.
    // Пример для окорочек: к адресу игры добавить  &scene=MiniGame&theme=kitchen
    // Мини-игра зациклена: закончилась — стартует снова, чтобы гонять её подряд.
    // В бою мертво: боевой билд идёт без чернового флага, и ветка не срабатывает.
    const params = new URLSearchParams(location.search);
    if (params.get('draft') && params.get('scene')) {
      const key = params.get('scene');
      const data = { theme: params.get('theme') || undefined, mode: 'endless' };
      bus.on('minigame:done', () => this.time.delayedCall(500, () => this.scene.start(key, data)));
      this.scene.start(key, data);
      return;
    }

    this.scene.start('Menu');
  }
}
