// Menu: главное меню. Фон и логотип — тот же арт-стиль, что и в игре (не голый флэт-цвет,
// жалоба игрока на живом плейтесте «дизайн меню очень базовый»). Вид через THEME и базовую
// кнопку, тексты через i18n.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this); // клавиатура: стрелки двигают фокус по кнопкам, Enter выбирает

    this.add.image(width / 2, height / 2, 'bg_bay').setDisplaySize(width, height).setDepth(0);
    // Затемнение поверх фона — иначе текст и кнопки теряются на светлом небе мойки.
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1b2a, 0.55).setDepth(1);

    this.add.image(width / 2, height * 0.24, 'logo').setDisplaySize(190, 190).setDepth(2);

    this.add.text(width / 2, height * 0.42, i18n.t('title'), {
      fontFamily: THEME.fontFamily,
      fontSize: THEME.fontSize.title,
      color: THEME.colors.text,
      fontStyle: 'bold',
      stroke: '#0d1b2a', strokeThickness: 6
    }).setOrigin(0.5).setDepth(2);

    createButton(this, width / 2, height * 0.58, i18n.t('play'), () => this.scene.start('Game')).setDepth(2);

    // Демонстрация единого звука: одна кнопка mute гасит весь звук игры.
    const label = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    const soundBtn = createButton(this, width / 2, height * 0.70, label(), () => {
      Audio.toggleMute();
      soundBtn.setLabel(label());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text });
    soundBtn.setDepth(2);
  }
}
