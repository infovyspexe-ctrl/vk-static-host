// Проигрывание боя. Исход считает ядро, сцена только показывает.
import { YA } from '../yandex/sdk.js';
import { completeVictory, toSave } from '../core/progress.js';
import { Save } from '../yandex/save.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { battleBase } from '../core/battleBase.js';
import { createBattle, step, outcomeOf, casualtiesOf } from '../mechanics/siegebattle/battle.js';
import { enemyTables } from '../core/enemyForLevel.js';
import { completeMission } from '../core/missions.js';
import { missionWaveOptions } from '../core/missionWaves.js';
import { OBJECTIVES } from '../data/missions.js';
import { unitsOf } from '../mechanics/siegebattle/targeting.js';
import { createLayout, cellToScreen } from '../ui/gridLayout.js';
import { layout } from '../ui/layout.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { BLOCKS } from '../data/blocks.js';
import { UNITS, UNIT_FORMS, formFor } from '../data/units.js';
import { FIELD } from '../data/field.js';
import { unitPose } from '../ui/unitMotion.js';
import { projectileScreenPoint } from '../ui/projectilePath.js';
import { buildUnitTable } from '../mechanics/unitupgrade/forge.js';
import { buildBlockTable } from '../mechanics/blockupgrade/fortify.js';
import { CombatSounds } from '../core/combatSounds.js';
import { addWorldBackdrop, addEmberParticles, drawGround, drawFieldHeraldry, syncFortressSprites, ART_COLORS } from '../ui/gameArt.js';

const CATALOG_COLORS = {
  unit: THEME.colors.primary,
  shield: THEME.colors.accent,
  block: THEME.colors.neutral,
};

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.progress = data.progress;
    this.enemyBase = data.enemyBase;
    this.levelSpec = data.level;
  }

  create() {
    const { width, height } = this.scale;
    const { landscape } = layout(this);
    YA.gameplayStart(); // активный геймплей — честный сигнал площадке
    addWorldBackdrop(this, { shade: 0.28 });
    addEmberParticles(this);

    this.battleTitle=this.add.text(width / 2, height * 0.05, i18n.t('battle.title'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5);

    // Те же доли, что в BuildScene (НЕ произвольные — держат сетку в одном месте
    // и одного размера между сценами, иначе при переходе «Постройка → Бой» поле
    // визуально прыгает: под панель здесь ничего не рисуется, но место остаётся
    // зарезервированным ради непрерывности, а не по ошибке).
    const fieldTopShare = landscape ? 0.14 : 0.12;
    const fieldBottomShare = landscape ? 0.58 : 0.62;
    this.layout = createLayout({
      screenWidth: width, screenHeight: height,
      playerWidth: this.progress.width, gap: FIELD.gap,
      fieldTop: Math.round(height * fieldTopShare), fieldBottom: Math.round(height * fieldBottomShare),
    });

    const playerUnitTable = {...buildUnitTable(UNITS, this.progress.unitLevels, formFor),...OBJECTIVES};
    const playerBlockTable = buildBlockTable(BLOCKS, this.progress.blockLevels);
    const foes=enemyTables(this.levelSpec);
    this.playerBase = battleBase(this.progress.base, playerUnitTable, playerBlockTable);
    this.enemyBase = battleBase(this.enemyBase, foes.units, foes.blocks);
    this.initialUnits = { player: unitsOf(this.playerBase).filter(c=>!c.locked).length, enemy: unitsOf(this.enemyBase).length };
    this.battle = createBattle({
      playerBase: this.playerBase,
      enemyBase: this.enemyBase,
      layout: { playerWidth: this.progress.width, gap: FIELD.gap },
      playerUnitTable,
      enemyUnitTable: foes.units,
      protectedKeys:(this.progress.mission?.targets??[]).map(([x,y])=>`${x},${y}`),
      blockTable: BLOCKS,
      ...missionWaveOptions(this.progress,this.levelSpec),
    });
    this.initialUnits.enemy+=this.battle.reinforcements.reduce((sum,w)=>sum+unitsOf(w.enemyBase).length,0);
    this.conditionsText=this.add.text(width/2,height*.105,'',{fontFamily:THEME.fontFamily,fontSize:'22px',color:THEME.colors.text}).setOrigin(.5);

    this.cellsLayer = this.add.graphics();
    this.artSprites = new Map();
    this.effectsLayer = this.add.graphics();
    this.targetMarkers=this.add.graphics().setDepth(22);
    this.drawStrikeTargets();
    this.finished = false;
    this.acc = 0;

    // Платформы под обеими базами, как в редакторе: глазу есть за что цепляться.
    const s = this.layout.cellSize;
    const a = cellToScreen(this.layout, 'player', 0, 1).sx - s / 2;
    const b = cellToScreen(this.layout, 'enemy', 0, 1).sx - s / 2;
    const g = this.add.graphics();
    drawGround(g, a - s / 2, this.layout.groundY, this.progress.width * s + s, s * 0.35, 'player',this.playerBase);
    drawGround(g, b - s / 2, this.layout.groundY, this.progress.width * s + s, s * 0.35, 'enemy');
    drawFieldHeraldry(g, this.layout, this.progress.width);
    this.redraw();
    this.motionTime = 0;
    this.unitMotions = new Map();
    this.registerMotions('player');this.registerMotions('enemy');this.refreshWaveTitle();

    this.events.once('shutdown', () => YA.gameplayStop());
  }

  registerMotions(side){
    const base=side==='player'?this.playerBase:this.enemyBase;
    const table=side==='player'?this.battle.playerUnitTable:this.battle.enemyUnitTable;
    const s=this.layout.cellSize;
    for(const id of this.unitMotions.keys())if(id.startsWith(side+':'))this.unitMotions.delete(id);
      for (const [key, cell] of base.cells) {
        if (cell.kind !== 'unit' || cell.locked) continue;
        const id = `${side}:${key}`, sprite = this.artSprites.get(id);
        const floor = this.layout.groundY-(cell.y-1)*s;
        // Keep the same raster and scale; rotate about the soles, never its centre.
        sprite.setOrigin(.5, 1).setY(floor);
        this.unitMotions.set(id, { typeId:cell.typeId, side, x:sprite.x, floor,
          period:table[cell.typeId].cooldown, phase:cell.x*1.73+cell.y*2.31+(side==='enemy'?1.2:0),
          firedAt:-Infinity, hitAt:-Infinity });
      }
  }

  refreshWaveTitle(){
    const parts=[];
    if(Number.isFinite(this.battle.maxLosses))parts.push(i18n.t('mission.lossCount',{n:casualtiesOf(this.battle),max:this.battle.maxLosses}));
    if(this.progress.mission?.timeLimit)parts.push(i18n.t('mission.clock',{n:Math.max(0,this.battle.timeLimit-this.battle.elapsed).toFixed(1)}));
    this.conditionsText.setText(parts.join(' · '));
    if(this.battle.destroyKeys.length){
      const left=this.battle.destroyKeys.filter(key=>this.enemyBase.cells.has(key)).length;
      this.battleTitle.setText(i18n.t('strike.battle',{left,total:this.battle.destroyKeys.length}));return;
    }
    if(this.battle.waveCount<2)return;
    const waiting=this.battle.waveRemaining!==null;
    this.battleTitle.setText(i18n.t(waiting?'wave.incoming':'wave.battle',{
      n:this.battle.waveIndex+(waiting?2:1),total:this.battle.waveCount,seconds:Math.ceil(Math.max(0,(this.battle.waveRemaining??0)-1e-9)),
    }));
  }

  drawStrikeTargets(){
    const g=this.targetMarkers;g.clear();
    for(const key of this.battle.destroyKeys){
      if(!this.enemyBase.cells.has(key))continue;
      const [x,y]=key.split(',').map(Number),{sx,sy}=cellToScreen(this.layout,'enemy',x,y);
      g.lineStyle(3,THEME.colors.danger,.9);g.strokeCircle(sx,sy,this.layout.cellSize*.62);
    }
  }

  update(time, delta) {
    this.motionTime += delta / 1000;
    this.animateTroops();
    if (this.finished) return;

    // Шаг ядра фиксированный: 0.1 с. Кадры браузера плавают, поэтому
    // накапливаем время и делаем столько шагов, сколько накопилось. Иначе бой
    // на слабом телефоне пойдёт медленнее, чем на десктопе, и это будет ДРУГОЙ
    // бой — детерминизм ядра держится на фиксированном шаге.
    this.acc += delta / 1000;
    while (this.acc >= 0.1 && !this.finished) {
      const { events } = step(this.battle, Math.min(0.1,this.battle.timeLimit-this.battle.elapsed));
      this.acc -= 0.1;
      this.playEvents(events);
      this.refreshWaveTitle();
      this.drawStrikeTargets();
      this.checkEnd();
    }
  }

  animateTroops() {
    for (const [id, motion] of this.unitMotions ?? []) {
      const sprite = this.artSprites.get(id);
      if (!sprite?.scene) { this.unitMotions.delete(id); continue; }
      const pose = unitPose({ ...motion, time:this.motionTime, active:!this.finished });
      sprite.setPosition(motion.x+pose.x*this.layout.cellSize, motion.floor).setRotation(pose.angle);
    }
  }

  checkEnd() {
    const mine = unitsOf(this.playerBase).filter(c=>!c.locked).length;
    const theirs = unitsOf(this.enemyBase).length;
    const outcome=outcomeOf(this.battle);
    if (!outcome && this.battle.elapsed < this.battle.timeLimit-1e-9) return;

    this.finished = true;
    const won = outcome === 'win';
    const timeout = !outcome;
    const level = this.progress.level;
    if (won) {
      if (this.progress.mode==='missions'?completeMission(this.progress):completeVictory(this.progress, { level, reward: this.levelSpec.reward, bonus: this.levelSpec.bonus }))
      {
        Analytics.event(EVENTS.LEVEL_WIN, { level, mode: this.progress.mode || 'endless' });
        Analytics.completed(this.progress, level);
      }
      Save.update(toSave(this.progress));
      Save.flush();
    }
    this.time.delayedCall(700, () => this.scene.start('Result', {
      progress: this.progress, won, timeout, reward: this.levelSpec.reward,
      bonus: this.levelSpec.bonus, level,
      report: { seconds: Number(this.battle.elapsed.toFixed(1)), playerLeft: mine, enemyLeft: theirs,
        casualties:casualtiesOf(this.battle),casualtiesExceeded:casualtiesOf(this.battle)>this.battle.maxLosses,
        wavesCleared:this.battle.waveIndex+(theirs===0?1:0),waveCount:this.battle.waveCount,
        strikeTotal:this.battle.destroyKeys.length,strikeDone:this.battle.destroyKeys.filter(key=>!this.enemyBase.cells.has(key)).length,
        targetLost:this.battle.protectedKeys.some(key=>!this.playerBase.cells.has(key)),
        playerStart: this.initialUnits.player, enemyStart: this.initialUnits.enemy },
    }));
  }

  // Косметика событий. СТРОГАЯ ГРАНИЦА: всё, что делается здесь, не влияет на
  // исход. Удали этот метод целиком — бой кончится ровно так же. Случайность
  // (импульсы обломков) допустима именно поэтому; берём её через Phaser.Math.RND,
  // а не Math.random, чтобы не разводить привычки.
  playEvents(events) {
    for (const e of events) {
      const waveIndex=this.battle.waveIndex;
      if(e.type==='wave-start'){
        this.enemyBase=this.battle.enemyBase;
        for(const [id,sprite] of this.artSprites)if(id.startsWith('enemy:')){sprite.destroy();this.artSprites.delete(id);}
        syncFortressSprites(this,this.artSprites,'enemy',this.enemyBase,this.layout,1);
        this.registerMotions('enemy');
        CombatSounds.collapse();
        continue;
      }
      if (e.type === 'shot') {
        const motion = this.unitMotions.get(`${e.side}:${e.from}`);
        if (motion) {
          // Duplicate burst events replace one impulse rather than multiplying it.
          motion.firedAt = this.motionTime;
        }
        this.launchProjectile(e.trajectory, e.side);
        this.shotAccent(e.trajectory.kind, projectileScreenPoint(e.trajectory,this.layout,0), e.side);
        CombatSounds.shot(e.trajectory.kind);
      } else if (e.type === 'impact') {
        this.impactEffect(e.trajectory.kind, projectileScreenPoint(e.trajectory,this.layout,1), e.side);
        CombatSounds.impact(e.trajectory.kind, e.hits?.[0]?.typeId);
        for (const hit of e.hits ?? []) {
          const hitMotion = this.unitMotions.get(`${e.targetSide}:${hit.key}`);
          if (hitMotion) hitMotion.hitAt = this.motionTime;
        }
      } else if (e.type === 'destroyed') {
        const [x, y] = e.key.split(',').map(Number);
        this.artSprites.get(`${e.side}:${e.key}`)?.destroy();
        this.artSprites.delete(`${e.side}:${e.key}`);
        this.spawnDebris(e.side, x, y, e.typeId, 'destroyed');
      } else if (e.type === 'collapsed') {
        CombatSounds.collapse();
        this.time.delayedCall(80, () => {
          if(e.side==='enemy'&&waveIndex!==this.battle.waveIndex)return;
          for (const key of e.keys) {
            const [x, y] = key.split(',').map(Number);
            const sprite = this.artSprites.get(`${e.side}:${key}`);
            const typeId = sprite?.texture?.key==='mission-targets'?sprite.frame.name:sprite?.texture?.key?.replace('notebook-', '');
            sprite?.destroy(); this.artSprites.delete(`${e.side}:${key}`);
            this.spawnDebris(e.side, x, y, typeId, 'collapsed');
          }
        });
      } else if (e.type === 'reflected') {
        const [x, y] = e.key.split(',').map(Number);
        const { sx, sy } = cellToScreen(this.layout, e.side, x, y);
        const flash = this.add.circle(sx, sy - this.layout.cellSize / 2, 6, THEME.colors.accent);
        this.tweens.add({
          targets: flash, scale: 2.2, alpha: 0, duration: 350,
          onComplete: () => flash.destroy(),
        });
      }
    }
  }

  launchProjectile(path, side) {
    const kind=path.kind,from=projectileScreenPoint(path,this.layout,0),to=projectileScreenPoint(path,this.layout,1);
    const duration=path.duration*path.endT;
    const p = this.add.container(from.sx, from.sy).setDepth(30);
    const g = this.add.graphics(); p.add(g);
    if (kind === 'bullet') { g.fillStyle(0x302722, 1); g.fillCircle(0, 0, 1.35); g.lineStyle(1, 0xb9822e, .6); g.lineBetween(-4,0,-1.5,0); }
    else if (kind === 'arrow') { g.lineStyle(1.5, 0x4b3428, 1); g.lineBetween(-7,0,7,0); g.fillStyle(0x302722,1); g.fillTriangle(9,0,5,-2.5,5,2.5); }
    else if (kind === 'rocket') { g.fillStyle(0xb44639,1); g.fillTriangle(9,0,4,-3,4,3); g.fillStyle(0x50463e,1); g.fillRect(-5,-2.5,9,5); g.fillStyle(0xe0912f,.9); g.fillTriangle(-5,-2.5,-11,0,-5,2.5); }
    else { const r = kind === 'bomb' ? 4.5 : 4; g.fillStyle(kind === 'bomb' ? 0x302722 : 0x4f5557,1); g.fillCircle(0,0,r); g.lineStyle(1,0xd1a33d,.75); g.strokeCircle(0,0,r); }
    this.tweens.addCounter({ from:0,to:1,duration,ease:'Linear',
      onUpdate: tw => {const point=projectileScreenPoint(path,this.layout,tw.getValue());p.setPosition(point.sx,point.sy);if(kind==='arrow'||kind==='rocket')p.rotation=point.angle;},
      onComplete:()=>p.destroy()
    });
    return duration;
  }

  shotAccent(kind, from, side) {
    if (kind === 'arrow' || kind === 'bomb') return;
    const s=this.layout.cellSize, dir=side==='enemy'?-1:1;
    const flash=this.add.graphics().setPosition(from.sx,from.sy).setDepth(31);
    flash.fillStyle(0xe7b44f,.9).fillTriangle(0,-s*.035,dir*s*.14,0,0,s*.035);
    this.tweens.add({ targets:flash, alpha:0, duration:85, onComplete:()=>flash.destroy() });
    for (let i=0;i<3;i++) {
      const smoke=this.add.circle(from.sx+dir*i*s*.045,from.sy,s*(.025+i*.009),0x766f62,.35).setDepth(29);
      this.tweens.add({ targets:smoke, x:smoke.x+dir*s*(.12+i*.04), y:smoke.y-s*(.12+i*.05),
        alpha:0,duration:220+i*70,onComplete:()=>smoke.destroy() });
    }
  }

  impactEffect(kind, to, side) {
    const color = side === 'player' ? ART_COLORS.player : ART_COLORS.enemy;
    const s = this.layout.cellSize;
    const radius = kind === 'bullet' ? s*.07 : kind === 'arrow' ? s*.1 : kind === 'bomb' ? s*.32 : s*.25;
    const ring=this.add.circle(to.sx,to.sy,radius,color,.22).setStrokeStyle(Math.max(1,s*.025),0x302722,.72).setDepth(31);
    this.tweens.add({targets:ring,scale:1.45,alpha:0,duration:180,onComplete:()=>ring.destroy()});
    if (kind === 'bullet' || kind === 'arrow') return;
    for(let i=0;i<5;i++){
      const a=(Math.PI*2*i)/5, spark=this.add.circle(to.sx,to.sy,Math.max(1,s*.035),kind==='rocket'?0xd85a35:0x4b3b31,1).setDepth(32);
      const spread = Phaser.Math.FloatBetween(s*.2,s*.48);
      this.tweens.add({targets:spark,x:to.sx+Math.cos(a)*spread,y:to.sy+Math.sin(a)*spread*.75,alpha:0,duration:240,onComplete:()=>spark.destroy()});
    }
  }

  // Визуальная смерть остаётся ЛОКАЛЬНОЙ. Раньше целая клетка становилась свободным
  // Matter-телом с сильным импульсом, поэтому люди и блоки перелетали через арену в
  // сторону стрелявшего. Попадание теперь гасит объект на месте, а потеря опоры
  // роняет его строго вниз внутри собственной крепости.
  spawnDebris(side, x, y, typeId = 'wood', mode = 'destroyed') {
    // Group cells are removed together. Animate the one complete building once.
    const original=this.progress.base.cells.get(`${x},${y}`);
    if(side==='player'&&original?.objectId){
      if(original.objectId!==`${x},${y}`)return;
      const s=this.layout.cellSize,w=original.objectWidth,h=original.objectHeight;
      const bottom=this.layout.groundY-(y-1)*s;
      const image=this.add.image(this.layout.playerOriginX+(x+w/2)*s,bottom,`notebook-${original.typeId}`,'trimmed')
        .setOrigin(.5,1).setDisplaySize(w*s,h*s).setDepth(18);
      this.tweens.add({targets:image,y:mode==='collapsed'?this.layout.groundY:bottom+s*.08,alpha:0,duration:400,onComplete:()=>image.destroy()});
      return;
    }
    const { sx, sy } = cellToScreen(this.layout, side, x, y);
    const s = this.layout.cellSize;
    const isUnit = Boolean(UNITS[typeId] || UNIT_FORMS[typeId]);
    const displayScale = isUnit ? 1.08 : 1.04;
    const alignedY = isUnit ? this.layout.groundY-(y-1)*s-(s*displayScale)/2 : sy;
    const objective=OBJECTIVES[typeId];
    const image = this.add.image(sx, alignedY, objective?'mission-targets':`notebook-${typeId || 'wood'}`,objective?typeId:undefined)
        .setDisplaySize(s*displayScale, s*displayScale).setFlipX(side === 'enemy' && isUnit).setDepth(18);
    if(objective)image.setDisplaySize(s*image.frame.width/image.frame.height,s);
    if (mode === 'destroyed') {
      const mark = this.add.circle(sx, sy, s*.34, 0xb44639, .18).setStrokeStyle(2, 0xb44639, .75).setDepth(19);
      this.tweens.add({ targets: mark, scale: 1.35, alpha: 0, duration: 220, onComplete: () => mark.destroy() });
      this.tweens.add({ targets: image, alpha: 0, y: alignedY + s*.05, duration: 220, onComplete: () => image.destroy() });
      return;
    }
    const floorY = this.layout.groundY - s/2;
    const fallY = Math.max(sy, floorY);
    this.tweens.add({
      targets: image, y: fallY, x: sx + Phaser.Math.Between(-3, 3), rotation: Phaser.Math.FloatBetween(-.1, .1),
      duration: Math.max(180, Math.min(520, 150 + (fallY-sy)*2.2)), ease: 'Quad.easeIn',
      onComplete: () => this.tweens.add({ targets: image, alpha: 0, duration: 180, delay: 80, onComplete: () => image.destroy() }),
    });
  }

  redraw() {
    const g = this.cellsLayer;
    g.clear();
    const s = this.layout.cellSize;

    for (const [side, base, alpha] of [
      ['player', this.playerBase, 1],
      ['enemy', this.enemyBase, 1],
    ]) {
      for (const cell of base.cells.values()) {
        const { sx, sy } = cellToScreen(this.layout, side, cell.x, cell.y);
      }
      syncFortressSprites(this, this.artSprites, side, base, this.layout, alpha);
    }
  }
}
