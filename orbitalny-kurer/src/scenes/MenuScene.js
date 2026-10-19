// Menu: главное меню. Весь вид через THEME и базовую кнопку, тексты через i18n.
import { THEME } from '../ui/theme.js';
import { layout } from '../ui/layout.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    // Все координаты — из layout(): в альбоме кнопки встают рядом, а не столбиком.
    const L = layout(this);
    Input.setup(this); // клавиатура: стрелки двигают фокус по кнопкам, Enter выбирает

    this.add.text(L.stage.cx, L.stage.y + L.stage.h * (L.landscape ? 0.22 : 0.28), i18n.t('title'), {
      fontFamily: THEME.fontFamily,
      fontSize: THEME.fontSize.title,
      color: THEME.colors.text,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Центр группы кнопок: в альбоме чуть ниже середины, в портрете — по центру поля.
    const grp = { y: L.stage.y + L.stage.h * (L.landscape ? 0.62 : 0.5) };
    const play = L.slot(0, 2, grp);
    createButton(this, play.x, play.y, i18n.t('play'), () => this.scene.start('Game'));

    // Демонстрация единого звука: одна кнопка mute гасит весь звук игры.
    const label = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    const snd = L.slot(1, 2, grp);
    const soundBtn = createButton(this, snd.x, snd.y, label(), () => {
      Audio.toggleMute();
      soundBtn.setLabel(label());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text });
  }
}
