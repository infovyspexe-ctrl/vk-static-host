// Menu: титульный экран. Кнопка «Играть» ведёт в деревню (Hub), не сразу в забег —
// выбор героя и прокачка живут там.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Platform } from '../platform/index.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    // Sticky-баннер — пассивный доход, идёт весь сеанс на спокойных экранах (меню/деревня).
    // В подземелье (GameScene) низ экрана занят D-pad/скиллами вплотную к краю — там баннер
    // скрывается (GameScene.create), чтобы не наложиться на управление.
    Platform.ads.showBanner();

    this.add.image(width / 2, height / 2, 'bg_hub').setDisplaySize(width, height).setAlpha(0.7);
    this.add.rectangle(width / 2, height * 0.32, width, 180, 0x0a0714, 0.45);

    this.add.text(width / 2, height * 0.32, i18n.t('title'), {
      fontFamily: THEME.fontFamily,
      fontSize: THEME.fontSize.title,
      color: THEME.colors.text,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    createButton(this, width / 2, height * 0.52, i18n.t('play'), () => this.scene.start('Hub'));
    // Кнопка «Звук» убрана — см. комментарий в HubScene.create() (нет звуковых ассетов
    // вообще, тумблер без слышимого эффекта — находка аудита 04.08, п.6.7).
  }
}
