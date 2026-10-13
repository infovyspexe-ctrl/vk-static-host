// Menu: главное меню. Весь вид через THEME и базовую кнопку, тексты через i18n.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { Save } from '../yandex/save.js';
import { toSave } from '../core/progress.js';
import { newCampaign } from '../core/newCampaign.js';
import { addWorldBackdrop, addEmberParticles } from '../ui/gameArt.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    Analytics.end('menu');
    this.restartDialog = null;
    this.resetting = false;
    const { width, height } = this.scale;
    Input.setup(this); // клавиатура: стрелки двигают фокус по кнопкам, Enter выбирает

    addWorldBackdrop(this, { shade: 0.22 });
    addEmberParticles(this);

    const crest = this.add.graphics();
    crest.fillStyle(0xe1d3b4,.9); crest.fillRoundedRect(width/2-170,height*.19,340,92,12);
    crest.lineStyle(5,0x302722,.9); crest.strokeRoundedRect(width/2-170,height*.19,340,92,12);
    crest.lineStyle(2,0xb44639,.75); crest.lineBetween(width/2-145,height*.31,width/2+145,height*.31);

    this.add.text(width / 2, height * 0.28, i18n.t('title'), {
      fontFamily: THEME.fontFamily,
      fontSize: THEME.fontSize.title,
      color: THEME.colors.text,
      fontStyle: 'bold'
    }).setOrigin(0.5).setStroke(THEME.textStroke.color, 8).setDepth(2);

    createButton(this, width / 2, height * 0.46, i18n.t('mode.endless'), () => {
      this.scene.start('Build', { progress: null });
    });

    createButton(this,width/2,height*.59,i18n.t('mode.missions'),()=>this.scene.start('Missions',{}),{fontSize:'27px'});
    // Демонстрация единого звука: одна кнопка mute гасит весь звук игры.
    const label = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    const soundBtn = createButton(this, width / 2, height * 0.73, label(), () => {
      Audio.toggleMute();
      soundBtn.setLabel(label());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.primaryText });
    createButton(this, width / 2, height * .87, i18n.t('menu.restart'), () => this.confirmRestart(), {
      fontSize: '23px', paddingY: 10, color: THEME.colors.neutral, textColor: THEME.colors.primaryText,
    });
  }

  confirmRestart() {
    if (this.restartDialog || this.resetting) return;
    const { width, height } = this.scale;
    Input.openLayer(this, 'restart');
    const cover = this.add.rectangle(width/2, height/2, width, height, 0x171410, .72)
      .setDepth(100).setInteractive();
    const panel = this.add.rectangle(width/2, height/2, 740, 320, THEME.colors.panel)
      .setStrokeStyle(3, THEME.colors.neutral).setDepth(101);
    const title = this.add.text(width/2, height/2-115, i18n.t('menu.restartTitle'), {
      fontFamily:THEME.fontFamily, fontSize:'30px', color:THEME.colors.text,
    }).setOrigin(.5).setDepth(102);
    const message = this.add.text(width/2, height/2-30, i18n.t('menu.restartWarning'), {
      fontFamily:THEME.fontFamily, fontSize:'22px', color:THEME.colors.text,
      align:'center',wordWrap:{width:670},lineSpacing:5,
    }).setOrigin(.5).setDepth(102);
    const close = () => {
      if (this.resetting) return;
      this.input.keyboard?.off('keydown-ESC',close);
      Input.closeLayer(this,'restart');
      this.restartDialog?.forEach(o=>o.destroy()); this.restartDialog=null;
    };
    // Cancel is first in keyboard focus; Enter alone never confirms deletion.
    const cancel = createButton(this,width/2-180,height/2+105,i18n.t('menu.cancel'),close,
      {fontSize:'23px',color:THEME.colors.neutral}).setDepth(102);
    const confirm = createButton(this,width/2+160,height/2+105,i18n.t('menu.restart'),async()=>{
      if (this.resetting) return;
      this.resetting=true;
      try {
        // Load first so the partial update preserves sound/platform settings.
        await Save.load();
        const progress=newCampaign();
        Save.update(toSave(progress)); Save.flush();
        this.scene.start('Build',{progress});
      } catch {
        this.resetting=false; message.setText(i18n.t('menu.restartError'));
      }
    },{fontSize:'23px',color:THEME.colors.danger}).setDepth(102);
    this.restartDialog=[cover,panel,title,message,cancel,confirm];
    this.input.keyboard?.on('keydown-ESC',close);
    this.events.once('shutdown',()=>this.input.keyboard?.off('keydown-ESC',close));
  }
}
