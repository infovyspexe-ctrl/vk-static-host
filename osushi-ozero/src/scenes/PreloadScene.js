// Preload: грузит ассеты, рисует полосу загрузки, сообщает площадке о готовности.
// Вид через THEME, тексты через i18n — как и везде в игре.
import { Platform } from '../platform/index.js';
import { initSafeStorage } from '../core/safe-storage.js';
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

    // Декор дна (art-src/picks.json — связь с библиотекой листов).
    for (const k of ['anchor', 'amphora', 'fishbone', 'wheel', 'minecart', 'crystals', 'column', 'bottle', 'boot']) {
      this.load.image('decor_' + k, 'assets/decor/' + k + '.png');
    }
    // Вёдра для магазина.
    for (const k of ['wood', 'plastic', 'metal', 'magnet', 'toxic', 'golden']) {
      this.load.image('bucket_' + k, 'assets/buckets/' + k + '.png');
    }
    // Акула (флэт под стиль мира, art-src/picks.json).
    // Слив НЕ грузится картинкой: он рисуется процедурно в createDrain().
    // Текстура 'drain' грузилась, нигде не использовалась и давала 404 в консоли.
    this.load.image('shark_calm', 'assets/shark_calm.png');
    this.load.image('shark_bite', 'assets/shark_bite.png');
    // Фоновая музыка (Suno, art-src/music — оба варианта, в игре track_1 в 96k) ЗДЕСЬ НЕ ГРУЗИТСЯ.
    // Она весит 1,58 МБ при 3,4 МБ всей загрузки — почти половина, — а нужна только
    // в GameScene, через две сцены. В предзагрузке она задерживала показ меню на ~1 с
    // (замер 2026-07-19: до первого ввода 2,7 с при норме 2-3, RETENTION.md §10).
    // Грузится фоном из MenuScene, пока игрок смотрит на меню.
  }

  async create() {
    // Безопасное хранилище — ДО чтения сейва: на iOS в iframe площадки прямой
    // localStorage ломается, а на нём держатся и чекпойнт партии, и флаги аналитики.
    initSafeStorage(Platform.safeStorage());
    // Читаем сейв ЗДЕСЬ, один раз за сессию. Без этого Platform.cache пуст на момент
    // сборки меню, и вернувшийся игрок видел «Играть» вместо «Продолжить», а его
    // достижения показывались как 0/12. GameScene переиспользует Platform.cache
    // (`Platform.cache || await Platform.save.load()`), так что лишнего обращения к облаку нет.
    await Platform.save.load();
    Platform.ready();      // сообщить площадке, что игра готова к показу
    this.scene.start('Menu');
  }
}
