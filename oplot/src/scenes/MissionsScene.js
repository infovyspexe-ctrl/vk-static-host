import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Save } from '../yandex/save.js';
import { missionState, startMission, restartMission } from '../core/missions.js';
import { toSave } from '../core/progress.js';
import { missionDraft } from '../core/missionDrafts.js';
import { MISSIONS, missionFor } from '../data/missions.js';
import { MISSION_CHAPTERS } from '../data/missionChapters.js';
import { currentMission, chapterProgress, chapterJump } from '../core/missionNavigation.js';
import { UNITS } from '../data/units.js';
import { BLOCKS } from '../data/blocks.js';
import { addWorldBackdrop } from '../ui/gameArt.js';

export class MissionsScene extends Phaser.Scene {
  constructor(){super('Missions');}
  init(data){this.selection=data?.selection;this.requestRestart=Boolean(data?.confirmRestart);this.sys.settings.data={};}
  async create(){
    this.restartDialog=null;
    Input.setup(this);addWorldBackdrop(this,{shade:.3});
    const data=await Save.load();if(!this.sys.isActive())return;
    this.saved=data?.missions??{};this.meta=missionState(this.saved);
    const requested=this.selection??currentMission(this.saved);
    this.index=missionFor(requested)?requested:currentMission(this.saved);
    const {width:w,height:h}=this.scale;
    const text=(y,key,size='26px')=>this.add.text(w/2,h*y,i18n.t(key),{fontFamily:THEME.fontFamily,fontSize:size,color:THEME.colors.text,align:'center',wordWrap:{width:w*.78}}).setOrigin(.5);
    text(.12,'mode.missions','40px');text(.21,'mission.separate','21px');
    this.chapterText=text(.275,'','20px');this.chapterText.setWordWrapWidth(w*.68);
    const chapterButton={fontSize:'20px',paddingX:20,paddingY:10,color:THEME.colors.neutral};
    this.chapterPrev=createButton(this,w*.10,h*.275,'«',()=>{this.index=chapterJump(this.index,-1,this.saved);this.refresh();},chapterButton);
    this.chapterNext=createButton(this,w*.90,h*.275,'»',()=>{this.index=chapterJump(this.index,1,this.saved);this.refresh();},chapterButton);
    this.heading=text(.34,'','30px');this.description=text(.46,'','25px');this.status=text(.60,'','22px');
    this.previous=createButton(this,w*.23,h*.73,'←',()=>{this.index=Math.max(1,this.index-1);this.refresh();});
    this.start=createButton(this,w*.5,h*.73,i18n.t('mission.start'),()=>{
      if(this.index>this.meta.unlocked)return;
      const p=startMission(this.index,{units:UNITS,blocks:BLOCKS},this.saved);
      this.scene.start('Build',{progress:p});
    },{fontSize:'25px'});
    this.next=createButton(this,w*.77,h*.73,'→',()=>{this.index=Math.min(MISSIONS.length,this.index+1);this.refresh();});
    this.current=createButton(this,w*.22,h*.88,i18n.t('chapter.current'),()=>{this.index=currentMission(this.saved);this.refresh();},{fontSize:'22px',color:THEME.colors.neutral});
    this.restart=createButton(this,w*.54,h*.88,i18n.t('mission.restart'),()=>this.confirmRestart(),{fontSize:'22px',color:THEME.colors.neutral});
    createButton(this,w*.82,h*.88,i18n.t('menu.back'),()=>this.scene.start('Menu'),{fontSize:'22px',color:THEME.colors.neutral});
    this.refresh();
    if(this.requestRestart)this.confirmRestart();
  }
  refresh(){
    const m=missionFor(this.index),locked=m.id>this.meta.unlocked;
    const chapter=chapterProgress(this.index,this.saved);
    this.chapterText.setText(i18n.t('chapter.summary',{n:chapter.index+1,chapters:MISSION_CHAPTERS.length,name:i18n.t('chapter.'+chapter.id),done:chapter.done,total:chapter.total}));
    for(const [button,enabled] of [[this.chapterPrev,chapter.index>0],[this.chapterNext,chapter.index<MISSION_CHAPTERS.length-1],[this.previous,this.index>1],[this.next,this.index<MISSIONS.length],[this.current,this.index!==currentMission(this.saved)]]){
      button.setAlpha(enabled?1:.4);button.input.enabled=enabled;
    }
    this.description.setFontSize(25);
    this.heading.setText(i18n.t('mission.number',{n:m.id,total:MISSIONS.length})+' · '+i18n.t('mission.name.'+m.id));
    this.description.setText(i18n.t('mission.rule.'+m.kind,{gold:m.budget,waves:1+(m.waves?.length??0),height:m.maxHeight})+
      (m.targets&&['waves','strike','ruins','supply','demolition'].includes(m.kind)?'\n'+i18n.t(['ruins','supply','demolition'].includes(m.kind)?'wave.protectShort':'wave.protect'):'')+
      (m.maxUnits?'\n'+i18n.t('mission.cap.unit',{max:m.maxUnits}):'')+
      (m.maxBlocks?'\n'+i18n.t('mission.cap.block',{max:m.maxBlocks}):'')+
      (Number.isFinite(m.maxLosses)?'\n'+i18n.t('mission.lossCap',{max:m.maxLosses}):'')+
      (m.timeLimit?'\n'+i18n.t('mission.deadline',{n:m.timeLimit}):'')+
      (m.waves&&m.kind!=='waves'?'\n'+i18n.t('mission.waveCount',{n:1+m.waves.length}):'')+
      (m.kind==='strike'&&m.maxHeight?'\n'+i18n.t('mission.ceiling',{height:m.maxHeight}):'')+
      (m.allowed&&m.kind!=='arsenal'?'\n'+i18n.t('wave.arsenal',{units:m.allowed.map(id=>i18n.t('unit.'+id)).join(', ')}):'')+
      (m.platformHoles&&m.kind!=='gap'?'\n'+i18n.t('mission.gapShort'):''));
    for(let size=23;this.description.height>this.scale.height*.18&&size>=17;size-=2)this.description.setFontSize(size);
    const draft=missionDraft(this.saved,m.id);
    this.restart.setVisible(!locked&&Boolean(draft));
    this.status.setText(!locked&&draft?i18n.t('mission.draft',{gold:draft.gold}):i18n.t(locked?'mission.locked':this.meta.completed.includes(m.id)?'mission.completed':'mission.available'));
    this.start.setAlpha(locked?.4:1);this.start.input.enabled=!locked;
    this.start.setLabel(i18n.t(draft?'mission.resume':'mission.start'));
  }
  confirmRestart(){
    const id=this.index;
    if(this.restartDialog||id>this.meta.unlocked||!missionDraft(this.saved,id))return;
    const {width:w,height:h}=this.scale;
    Input.openLayer(this,'mission-restart');
    const cover=this.add.rectangle(w/2,h/2,w,h,0x171410,.72).setDepth(100).setInteractive();
    const panel=this.add.rectangle(w/2,h/2,820,330,THEME.colors.panel).setStrokeStyle(3,THEME.colors.neutral).setDepth(101);
    const title=this.add.text(w/2,h/2-115,i18n.t('mission.restartTitle',{n:id}),{fontFamily:THEME.fontFamily,fontSize:'30px',color:THEME.colors.text}).setOrigin(.5).setDepth(102);
    const message=this.add.text(w/2,h/2-25,i18n.t('mission.restartWarning',{gold:missionFor(id).budget}),{fontFamily:THEME.fontFamily,fontSize:'22px',color:THEME.colors.text,align:'center',wordWrap:{width:740},lineSpacing:5}).setOrigin(.5).setDepth(102);
    const close=()=>{
      this.input.keyboard?.off('keydown-ESC',close);
      Input.closeLayer(this,'mission-restart');
      this.restartDialog?.forEach(o=>o.destroy());this.restartDialog=null;
    };
    const cancel=createButton(this,w/2-195,h/2+110,i18n.t('menu.cancel'),close,{fontSize:'23px',color:THEME.colors.neutral}).setDepth(102);
    const confirm=createButton(this,w/2+175,h/2+110,i18n.t('mission.restart'),()=>{
      if(!this.restartDialog)return;
      const progress=restartMission(id,{units:UNITS,blocks:BLOCKS},this.saved);
      Save.update(toSave(progress));Save.flush();
      close();this.scene.start('Build',{progress});
    },{fontSize:'23px',color:THEME.colors.danger}).setDepth(102);
    this.restartDialog=[cover,panel,title,message,cancel,confirm];
    this.input.keyboard?.on('keydown-ESC',close);
    this.events.once('shutdown',()=>this.input.keyboard?.off('keydown-ESC',close));
  }
}
