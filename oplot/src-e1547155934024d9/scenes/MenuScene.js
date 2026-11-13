// Menu: главное меню. Весь вид через THEME и базовую кнопку, тексты через i18n.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { Save } from '../yandex/save.js';
import { toSave, fromSave, grantAdvertisedGold } from '../core/progress.js';
import { newCampaign, campaignCatalog } from '../core/newCampaign.js';
import { Platform } from '../platform/index.js';
import { Monetization } from '../platform/monetization.js';
import { textDialog } from '../ui/textDialog.js';
import { addWorldBackdrop, addEmberParticles } from '../ui/gameArt.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(data) {
    Analytics.end('menu');
    this.restartDialog = null;
    this.resetting = false;
    const { width, height } = this.scale;
    Input.setup(this); // клавиатура: стрелки двигают фокус по кнопкам, Enter выбирает

    addWorldBackdrop(this, { shade: 0.22 });
    addEmberParticles(this);
    this.mountAdOffer();

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

    createButton(this, width / 2, height * 0.43, i18n.t('mode.endless'), () => {
      this.scene.start('Build', { progress: null });
    });

    createButton(this,width/2,height*.56,i18n.t('mode.missions'),()=>this.scene.start('Missions',{}),{fontSize:'27px'});
    createButton(this,width/2,height*.69,i18n.t('menu.learn'),()=>{
      const progress = newCampaign();
      progress.practice = true;
      this.scene.start('Build', {progress});
    }, {fontSize:'27px'});
    // Демонстрация единого звука: одна кнопка mute гасит весь звук игры.
    const label = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    const soundBtn = createButton(this, width * .22, height * 0.87, label(), () => {
      Audio.toggleMute();
      soundBtn.setLabel(label());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.primaryText });
    createButton(this, width * .75, height * .87, i18n.t('menu.restart'), () => this.confirmRestart(), {
      fontSize: '23px', paddingY: 10, color: THEME.colors.neutral, textColor: THEME.colors.primaryText,
    });
    if (data?.lessonComplete) textDialog(this, i18n.t('tutorial.complete'));
    this.sys.settings.data = {};
  }

  mountAdOffer() {
    const { width } = this.scale;
    if (Platform.name !== 'vk') {
      const about = createButton(this, width * .78, 48, i18n.t('ads.about'), () => textDialog(this, i18n.t('ads.info')),
        { fontSize: '22px', paddingX: 14, paddingY: 8, color: THEME.colors.neutral });
      about.x = width - 16 - about.width / 2;
      return;
    }
    // Подпись видна сразу: модератор находит монетизацию, не дожидаясь ролика.
    // Кнопка просмотра появляется только после CheckNativeAds.
    const status = this.add.text(width - 16, 12, i18n.t('ads.menuPending'), {
      fontFamily: THEME.fontFamily, fontSize: '20px', color: THEME.colors.text,
      align: 'right', wordWrap: { width: 360 },
    }).setOrigin(1, 0);
    const show = async () => {
      if (this.adButton || !this.sys.isActive() || !Monetization.enabled()) return;
      if (!(await Monetization.ready('reward')) || this.adButton || !this.sys.isActive()) return;
      status.setVisible(false);
      this.adButton = createButton(this, width - 180, 46, i18n.t('ads.menuOffer'), () => this.claimMenuGold(), {
        fontSize: '22px', paddingX: 14, paddingY: 10, color: THEME.colors.accent, textColor: THEME.colors.text,
      });
      this.adButton.x = width - 16 - this.adButton.width / 2;
    };
    show();
    this.time.addEvent({ delay: 8000, loop: true, callback: show });
  }

  async claimMenuGold() {
    if (this.adPending || !this.adButton) return;
    this.adPending = true;
    this.adButton.setLabel(i18n.t('ads.wait'));
    try {
      const data = await Save.load();
      if (!this.sys.isActive()) return;
      if (Platform._loadFailed || Platform.readOnly) {
        this.adButton.setLabel(i18n.t('ads.unavailable'));
        return;
      }
      const progress = data && typeof data.gold === 'number' ? fromSave(data, campaignCatalog()) : newCampaign();
      const result = await Monetization.show('reward', 'menu_purse', () => grantAdvertisedGold(progress));
      if (!this.sys.isActive()) return;
      if (result?.rewarded) {
        Save.update(toSave(progress));
        await Save.flush();
        this.adButton.setLabel(i18n.t('ads.menuDone', { n: progress.gold }));
      } else this.adButton.setLabel(i18n.t(result?.saveFailed ? 'ads.saveFailed' : 'ads.unavailable'));
    } finally { this.adPending = false; }
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
