// Итог уровня: победа/поражение, начисление награды, выбор карты, сохранение.
import { THEME } from '../ui/theme.js';
import { layout } from '../ui/layout.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Save } from '../yandex/save.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { completeVictory, claimReward, rewardGoldValue, toSave } from '../core/progress.js';
import { tutorialStep } from '../core/tutorial.js';
import { startMission } from '../core/missions.js';
import { MISSIONS } from '../data/missions.js';
import { addWorldBackdrop, addEmberParticles } from '../ui/gameArt.js';
import { unlockedAtLevel } from '../data/arsenal.js';
import { CombatSounds } from '../core/combatSounds.js';
import { setupResultAds, continueAfterResult } from '../ui/resultAds.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) {
    this.progress = data.progress;
    this.won = data.won;
    this.timeout = data.timeout;
    this.rewardSpec = data; // { won, timeout, reward, bonus, level }
    this.report = data.report;
  }

  create() {
    const { width, height } = this.scale;
    const { landscape } = layout(this);
    Input.setup(this);
    CombatSounds.result(this.won);
    addWorldBackdrop(this, { shade: this.won ? 0.3 : 0.58 });
    if (this.won) addEmberParticles(this);
    createButton(this, 85, 42, i18n.t('menu.back'), () => {
      if (this.adPending) return;
      Save.update(toSave(this.progress)); Save.flush();
      this.scene.start('Menu');
    }, { fontSize: '23px', color: THEME.colors.neutral });
    if(this.progress.mode==='missions'){this.missionResult();return;}

    // В альбоме высота вдвое меньше портретной (720 против 1280) при той же
    // ширине — те же доли текста, что и в портрете, сажали бы карты друг на
    // друга (карта считает размер от ширины, а ширина в альбоме огромная).
    // Доли ниже теснее по вертикали именно поэтому, не проверка на глаз —
    // измерено живым прогоном, см. NOTES.md, «Оплот: переход на альбом».
    const titleY = height * (landscape ? 0.14 : 0.2);
    const rewardY = height * (landscape ? 0.26 : 0.3);
    const pickY = height * (landscape ? 0.40 : 0.42);
    const cardsY = height * (landscape ? 0.66 : 0.58);
    const retryY = height * (landscape ? 0.6 : 0.6);

    const titleKey = this.won ? 'result.win' : 'result.loss';
    const title = this.add.text(width / 2, titleY, i18n.t(titleKey), {
      fontFamily: THEME.fontFamily,
      fontSize: THEME.fontSize.title,
      color: this.won ? THEME.colors.successText : THEME.colors.dangerText,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    title.setStroke(THEME.textStroke.color, THEME.textStroke.thickness);

    if (this.won) {
      // Начисление и уровень — сразу и сразу в сейв: игрок может закрыть вкладку,
      // не выбрав карту, и потерять победу нельзя.
      const newlyCompleted = completeVictory(this.progress, this.rewardSpec);
      if (!this.progress.pendingReward) { this.scene.start('Build', { progress: this.progress }); return; }
      this.rewardSpec = { ...this.rewardSpec, ...this.progress.pendingReward };
      if (newlyCompleted) { Analytics.event(EVENTS.LEVEL_WIN, { level: this.rewardSpec.level, mode: 'endless' }); Analytics.completed(this.progress, this.rewardSpec.level); }
      Save.update(toSave(this.progress));
      Save.flush();

      const reward = this.add.text(width / 2, rewardY,
        i18n.t('result.reward', { n: this.rewardSpec.reward * (this.progress.pendingReward.doubled ? 2 : 1) }), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
          color: THEME.colors.accentText, fontStyle: 'bold',
        }).setOrigin(0.5);
      reward.setStroke(THEME.textStroke.color, THEME.textStroke.thickness);
      this.rewardLabel = reward;

      const unlocked = newlyCompleted ? unlockedAtLevel(this.progress.level) : [];
      if (unlocked.length) this.add.text(width / 2, height * (landscape ? .335 : .36),
        i18n.t('result.unlocked',{items:unlocked.map(item=>i18n.t(`${item.kind}.${item.typeId}`)).join(', ')}),{
          fontFamily:THEME.fontFamily,fontSize:'20px',color:THEME.colors.successText,
        }).setOrigin(.5);

      this.add.text(width / 2, pickY, i18n.t(tutorialStep(this.progress) === 'reward' ? 'tutorial.reward' : this.rewardSpec.resumed ? 'result.resumeReward' : 'result.pickCard'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      }).setOrigin(0.5);

      this.buildCards(cardsY, landscape);
      if (!this.rewardSpec.bonus.length) createButton(this, width / 2, retryY, i18n.t('result.continue'), () => this.pickCard(-1));
    } else {
      Analytics.event(EVENTS.LEVEL_LOSS, { level: this.rewardSpec.level, mode: this.progress.mode || 'endless' });
      // Ничья по времени — поражение по правилам, но помечаем отдельно:
      // в аналитике это признак ошибки баланса.
      if (this.timeout) Analytics.event(EVENTS.BATTLE_TIMEOUT, { level: this.rewardSpec.level, mode: this.progress.mode || 'endless' });

      const message = this.timeout ? 'result.timeoutReason' : 'result.lossReason';
      this.add.text(width / 2, height * .28, i18n.t(message), {
        fontFamily: THEME.fontFamily, fontSize: '26px', color: THEME.colors.text,
        align: 'center', wordWrap: { width: width * .8 },
      }).setOrigin(.5);
      if (this.report) this.add.text(width / 2, height * .38, i18n.t('result.report', {
        seconds: this.report.seconds, left: this.report.enemyLeft, total: this.report.enemyStart,
      }), { fontFamily: THEME.fontFamily, fontSize: '23px', color: THEME.colors.neutralText }).setOrigin(.5);
      this.add.text(width / 2, height * .48, i18n.t('result.restored'), {
        fontFamily: THEME.fontFamily, fontSize: '23px', color: THEME.colors.successText,
      }).setOrigin(.5);
      createButton(this, width * .35, height * .66, i18n.t('result.retry'), () => {
        if (this.adPending) return;
        this.scene.start('Build', { progress: this.progress });
      }, { fontSize: '25px' });
      createButton(this, width * .68, height * .66, i18n.t('build.upgrade'), () => {
        if (this.adPending) return;
        this.scene.start('Upgrade', { progress: this.progress });
      }, { fontSize: '25px' });
    }
    setupResultAds(this);
  }

  // Три карты награды. Ценник обязателен и виден сразу: в референсе он мелкий
  missionResult(){
    if (!this.won) Analytics.event(EVENTS.LEVEL_LOSS, { level: this.progress.level, mode: 'missions' });
    const {width:w,height:h}=this.scale;
    const finale=this.won&&this.progress.level===MISSIONS.length;
    this.add.text(w/2,h*.24,i18n.t(finale?'mission.finale':this.won?'mission.win':'result.loss'),{fontFamily:THEME.fontFamily,fontSize:'42px',color:this.won?THEME.colors.successText:THEME.colors.dangerText}).setOrigin(.5);
    this.add.text(w/2,h*.4,i18n.t(finale?'mission.finaleText':this.won?'mission.unlocked':this.timeout?'result.timeoutReason':this.report?.casualtiesExceeded?'mission.lossFailure':this.report?.targetLost?'mission.targetLost':'result.lossReason',{n:MISSIONS.length}),{
      fontFamily:THEME.fontFamily,fontSize:'25px',color:THEME.colors.text,align:'center',wordWrap:{width:w*.8},
    }).setOrigin(.5);
    const details=[];
    if(this.report?.waveCount>1||this.report?.strikeTotal)details.push(i18n.t(this.report.strikeTotal?'strike.report':'wave.report',{
      n:this.report.strikeTotal?this.report.strikeDone:this.report.wavesCleared,total:this.report.strikeTotal||this.report.waveCount,
    }));
    if(this.report&&Number.isFinite(this.progress.mission?.maxLosses))details.push(i18n.t('mission.lossCount',{n:this.report.casualties,max:this.progress.mission.maxLosses}));
    if(this.report&&this.progress.mission?.timeLimit)details.push(i18n.t('mission.elapsed',{n:this.report.seconds,max:this.progress.mission.timeLimit}));
    if(details.length)this.add.text(w/2,h*.52,details.join(' · '),{fontFamily:THEME.fontFamily,fontSize:'22px',color:THEME.colors.text,align:'center',wordWrap:{width:w*.86}}).setOrigin(.5);
    if(!this.won)createButton(this,w*.35,h*.64,i18n.t('result.retry'),()=>this.scene.start('Build',{progress:this.progress}),{fontSize:'25px'});
    else if(this.progress.level<MISSIONS.length)createButton(this,w*.35,h*.64,i18n.t('result.continue'),()=>{
      const p=startMission(this.progress.level+1,this.progress.catalog,toSave(this.progress).missions);
      this.scene.start('Build',{progress:p});
    },{fontSize:'25px'});
    else createButton(this,w*.32,h*.64,i18n.t('mode.endless'),()=>this.scene.start('Build',{progress:null}),{fontSize:'25px'});
    createButton(this,w*.68,h*.64,i18n.t('mode.missions'),()=>this.scene.start('Missions',{selection:this.progress.level}),{fontSize:'25px'});
  }

  // и спрятан внизу, владелец нашёл его на седьмой минуте игры.
  //
  // Размер карты берём МЕНЬШИМ из двух бюджетов — по ширине и по высоте — а не
  // только от ширины. В альбоме ширина огромная (1280), и карта по одной только
  // ширине вышла бы крупнее, чем позволяет вдвое меньшая высота (720 против
  // 1280), и наехала бы на текст награды сверху.
  buildCards(cy, landscape) {
    const { width, height } = this.scale;
    const bonus = this.rewardSpec.bonus ?? [];
    const cardW = Math.min(width * 0.28, height * (landscape ? 0.42 : 0.9));
    const gap = width * 0.04;

    bonus.forEach((item, i) => {
      const cx = width / 2 + (i - (bonus.length - 1) / 2) * (cardW + gap);
      const cost = this.progress.catalog[item.kind === 'unit' ? 'units' : 'blocks'][item.typeId].cost;
      const value = cost * item.count;

      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(THEME.colors.panel, 1);
      bg.fillRoundedRect(-cardW / 2, -cardW / 2, cardW, cardW * 1.15, THEME.radius);
      const icon = this.add.image(0, -cardW * 0.22, `notebook-${item.typeId}`).setDisplaySize(cardW*.48, cardW*.48);
      const label = this.add.text(0, cardW * 0.06,
        i18n.t('build.cardCount', { n: item.count, name: i18n.t(`${item.kind}.${item.typeId}`) }), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small,
          color: THEME.colors.text, align: 'center', wordWrap: { width: cardW * 0.9 },
        }).setOrigin(0.5, 0);
      const price = this.add.text(0, cardW * 0.42, i18n.t('result.freeCount', { n: item.count }), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
        color: THEME.colors.accentText, fontStyle: 'bold',
      }).setOrigin(0.5);
      card.add([bg, icon, label, price]);
      card.setSize(cardW, cardW * 1.15);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setScale(1.04));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerup', () => this.pickCard(i, value));

      // Клавиатура: карты в кольце фокуса, Enter выбирает (требование B6).
      Input.register(this, card, () => this.pickCard(i, value));
      const gold=rewardGoldValue(this.progress,i);
      if(gold)createButton(this,cx,height*.963,i18n.t('reward.exchange',{n:gold}),()=>this.pickCard(i,gold,true),{
        fontSize:'18px',paddingX:12,paddingY:7,color:THEME.colors.neutral,
      });
    });
  }

  pickCard(index, value, asGold=false) {
    if (this.adPending) return;
    const result = claimReward(this.progress, index, asGold);
    if (!result.ok) return;
    const item = result.item;
    if (item) Analytics.event(EVENTS.REWARD_PICKED, {
      level: this.rewardSpec.level, kind: asGold?'gold':item.kind, type: item.typeId, value,
    });
    Save.update(toSave(this.progress));
    Save.flush();

    continueAfterResult(this, () => this.scene.start('Build', { progress: this.progress }));
  }
}
