// Редактор базы. Сцена НИЧЕГО не вычисляет: раскладку даёт gridLayout,
// правила и деньги — progress, крепость врага — levelProvider (авторские уровни или
// генерация).
import { THEME } from '../ui/theme.js';
import { layout } from '../ui/layout.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Save } from '../yandex/save.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { createLayout, cellToScreen, screenToCell } from '../ui/gridLayout.js';
import { bonusCount, createProgress, tryPlace, tryErase, toSave, fromSave } from '../core/progress.js';
import { createBase, cellAt } from '../mechanics/gridbuild/base.js';
import { applyBlueprint } from '../mechanics/gridbuild/blueprint.js';
import { unitsOf } from '../mechanics/siegebattle/targeting.js';
import { BLOCKS } from '../data/blocks.js';
import { enemyIntel } from '../core/enemyIntel.js';
import { missionReady, missionBuildIssue, objectiveFloors, fixedBlockStatus } from '../core/missions.js';
import { missionLimits, placementLimit } from '../core/missionLimits.js';
import { missionEnemySpecs } from '../core/missionWaves.js';
import { tutorialStep, tutorialTarget, advanceTutorial } from '../core/tutorial.js';
import { tutorialGuide } from '../ui/tutorialGuide.js';
import { UNITS, UNIT_FORMS, currentFormId } from '../data/units.js';
import { FIELD, widthForLevel } from '../data/field.js';
import { isArsenalUnlocked, unlockLevel } from '../data/arsenal.js';
import { gridStroke } from '../ui/gridStroke.js';
import { CombatSounds } from '../core/combatSounds.js';
import { addWorldBackdrop, drawPaletteIcon, drawGround, drawFieldHeraldry, syncFortressSprites } from '../ui/gameArt.js';

// catalog.units должен покрывать не только 5 базовых юнитов, но и все 10 превращённых
// форм: после chooseBranch/payPerekovka (Task 4) или размещения из палитры по текущей
// форме (Step 6 ниже) клетка базы получает typeId формы, а place()/erase() в
// mechanics/gridbuild/base.js читают catalog.units[typeId].cost/.hp безусловно, без
// фолбэка на базовый id. Превращение не меняет стоимость найма и запас прочности —
// только «форму» (тип урона/пробитие/сплэш), поэтому cost/hp у формы КОПИРУЮТСЯ у её
// baseId (найдено при ревью Задачи 4: без этого стирание/повторная постановка
// превращённого юнита падает с TypeError).
const UNITS_WITH_FORMS = { ...UNITS };
for (const form of Object.values(UNIT_FORMS)) {
  UNITS_WITH_FORMS[form.id] = { ...UNITS[form.baseId], id: form.id };
}
const CATALOG = { blocks: BLOCKS, units: UNITS_WITH_FORMS };

// Порядок предметов в палитре: верхний ряд юниты, нижний блоки.
const PALETTE_UNITS = ['archer', 'shooter', 'cannon', 'rocket', 'grenadier'];
const PALETTE_BLOCKS = ['wood', 'brick', 'iron', 'gold', 'shield'];

export class BuildScene extends Phaser.Scene {
  constructor() { super('Build'); }

  init(data) {
    this.guide = null;
    this.progress = data?.progress ?? null;
    // Phaser retains settings.data when a later start omits its data argument.
    // Consume this handoff once; never reuse a previous mission on a menu entry.
    this.sys.settings.data = {};
    this.selected = { kind: 'unit', typeId: 'archer' };
    this.eraseMode = false;
    this.wavePreviewIndex=0;
  }

  async create() {
    const { width, height } = this.scale;
    // L.landscape — единственное, что берём из общего layout(): грид и панель
    // остаются верхней/нижней полосой в ОБЕИХ ориентациях (не боковой колонкой
    // по умолчанию layout.js) — жанру нужна вся ширина под две армии, а не
    // урезанная под боковой HUD. См. комментарий у fieldTop/fieldBottom ниже.
    this.L = layout(this);
    Input.setup(this);
    addWorldBackdrop(this, { shade: 0.38 });

    // Из меню приходим без прогресса: грузим сейв или заводим новую партию.
    if (!this.progress) {
      const data = await Save.load();
      this.progress = (data && typeof data.gold === 'number')
        ? fromSave(data, CATALOG)
        : createProgress({ startGold: FIELD.startGold, width: widthForLevel(1), catalog: CATALOG });
    }

    Analytics.begin(this.progress);
    if (this.progress.pendingReward) {
      this.scene.start('Result', { progress: this.progress, won: true, resumed: true, ...this.progress.pendingReward });
      return;
    }

    // init() выставляет дефолтный выбор палитры ('archer') до того, как this.progress
    // вообще известен (сейв ещё не загружен) — поэтому резолв ТЕКУЩЕЙ формы возможен
    // только здесь. Без этого игрок, вернувшийся в BuildScene после превращения archer
    // (chooseBranch/payPerekovka, Task 4) и тапнувший по клетке БЕЗ клика по палитре,
    // ставит клетку со старым typeId 'archer' — а buildUnitTable (Task 8) больше не
    // кладёт ключ 'archer' в playerUnitTable, только id формы, так что в бою
    // `table[typeId]` возвращает undefined и следующая же строка кидает TypeError
    // (найдено в ревью Задачи 8).
    this.selected = { kind: 'unit', typeId: this.progress.mission?.allowed?.[0]??currentFormId(this.progress.unitLevels, 'archer') };

    Analytics.event(EVENTS.LEVEL_START, { level: this.progress.level, mode: this.progress.mode || 'endless' });

    // Доли высоты верхней/нижней полосы РАЗНЫЕ для альбома и портрета — это
    // не косметика. Альбом даёт 720 px высоты вместо 1280, поэтому те же доли
    // сажали бы панель на палитру: подобрано и проверено живым замером в браузере
    // (см. NOTES.md, «Оплот: переход на альбом»), не взято на глаз.
    const fieldTopShare = this.L.landscape ? 0.15 : 0.12;
    const fieldBottomShare = this.L.landscape ? 0.72 : 0.62;
    this.layout = createLayout({
      screenWidth: width, screenHeight: height,
      playerWidth: this.progress.width, gap: FIELD.gap,
      fieldTop: Math.round(height * fieldTopShare), fieldBottom: Math.round(height * fieldBottomShare),
    });

    this.enemyBase = createBase({ width: this.progress.width, catalog: CATALOG });
    this.waveSpecs=missionEnemySpecs(this.progress,CATALOG);
    const spec = this.waveSpecs[0];
    this.levelSpec = spec; // нужен ниже для заголовка и для передачи в бой
    applyBlueprint(this.enemyBase, spec.cells);
    this.firstEnemyBase=this.enemyBase;

    this.cellsLayer = this.add.graphics();
    this.artSprites = new Map();
    this.fixedMarkers = this.add.graphics().setDepth(6);
    this.gridLayer = this.add.graphics();
    this.drawGrid();
    this.redraw();

    // Призрак выбранного предмета под курсором: игрок видит, куда встанет клетка.
    this.ghost = this.add.rectangle(0, 0, this.layout.cellSize - 2, this.layout.cellSize - 2)
     .setStrokeStyle(2, THEME.colors.accent).setAlpha(0.6).setVisible(false);

    this.input.on('pointerdown', (p) => this.onTap(p));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', () => { this.dragLast = null; });

    this.buildUi();

    // Смерть сцены (в бой, в меню) — прогресс сразу в сейв: модерация требует
    // сохранять по ходу, а не только на выходе (грабля из шаблона, v2).
    this.events.once('shutdown', () => { Save.update(toSave(this.progress)); Save.flush(); });
  }

  // ── Нижняя панель: палитра, золото, стирание, «В бой» ──────────────────────

  buildUi() {
    const { width, height } = this.scale;
    const s = this.layout.cellSize;
    const landscape = this.L.landscape;
    const intel = enemyIntel(this.levelSpec.cells);
    this.limitText=this.add.text(width*.02,height*.18,'',{fontFamily:THEME.fontFamily,fontSize:'18px',color:THEME.colors.text,wordWrap:{width:width*.34},lineSpacing:3});
    if(this.progress.mode==='missions')this.add.text(width*.02,height*.025,
      i18n.t('mission.name.'+this.progress.level)+'\n'+i18n.t('mission.build.'+this.progress.mission.kind,{height:this.progress.mission.maxHeight})+
      (this.progress.mission.targets&&['waves','strike','ruins','supply','demolition'].includes(this.progress.mission.kind)?'\n'+i18n.t('wave.protectShort'):''),{
        fontFamily:THEME.fontFamily,fontSize:'18px',color:THEME.colors.text,wordWrap:{width:width*.34},lineSpacing:4,
      });
    else if(this.levelSpec.briefing)this.add.text(width*.02,height*.025,
      i18n.t('briefing.'+this.levelSpec.briefing),{
        fontFamily:THEME.fontFamily,fontSize:'18px',color:THEME.colors.text,
        wordWrap:{width:width*.34},lineSpacing:4,
      });
    else if(this.levelSpec.style)this.add.text(width*.02,height*.025,
      i18n.t('fort.'+this.levelSpec.style)+'\n'+(this.levelSpec.endurance>1?i18n.t('fort.sustained'):i18n.t('fort.strength',{n:this.levelSpec.strength.toFixed(2)}))+
      (this.levelSpec.tactics?'\n'+i18n.t('tactic.'+this.levelSpec.tactics.id):''),{
        fontFamily:THEME.fontFamily,fontSize:'19px',color:THEME.colors.text,wordWrap:{width:width*.34},
      });
    this.intelText=this.add.text(width * .66, height * .022,
      i18n.t('intel.' + intel.type, { n: intel.count }) + '\n' + i18n.t('intel.tip.' + intel.type), {
        fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.text,
        wordWrap: { width: width * .32 }, lineSpacing: 5,
      });
    if(this.waveSpecs.length>1){
      this.wavePreviewBtn=createButton(this,width*.81,height*.17,'',()=>this.previewWave(),{
        fontSize:'18px',paddingX:10,paddingY:7,color:THEME.colors.neutral,
      });
      this.wavePreviewBtn.setLabel(i18n.t('wave.preview',{n:1,total:this.waveSpecs.length}));
    }

    // Шапка: уровень и золото, оба должны влезть НАД сеткой (fieldTop). В альбоме
    // полоса ниже (16% от 720 ≈ 115px) плотнее портретной (12% от 1280 ≈ 154px),
    // поэтому текст сажаем ближе друг к другу.
    this.titleText = this.add.text(width / 2, height * (landscape ? 0.045 : 0.03), '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5);
    const headerPlate = this.add.graphics().setDepth(this.titleText.depth - 1);
    headerPlate.fillStyle(0xe5d8ba, .9);
    headerPlate.fillRoundedRect(width*.38, height*.008, width*.24, height*(landscape ? .125 : .11), 18);
    headerPlate.lineStyle(3, 0x302722, .55);
    headerPlate.strokeRoundedRect(width*.38, height*.008, width*.24, height*(landscape ? .125 : .11), 18);
    this.goldText = this.add.text(width / 2, height * (landscape ? 0.102 : 0.08), '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.accentText,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.goldText.setStroke(THEME.textStroke.color, THEME.textStroke.thickness);

    // Фон панели: от платформы до низа экрана. Палитра НИЧЕГО не рисует выше groundY.
    const panelTop = this.layout.groundY + s * 0.35;
    const bg = this.add.graphics();
    bg.fillStyle(THEME.colors.panel, 0.6);
    bg.fillRect(0, panelTop, width, height - panelTop);
    // Тап ниже этой линии — не тап по клетке (см. paletteHit).
    this.uiRect = { top: this.layout.groundY + s * 0.35 };

    // Палитра. В портрете — два ряда по пять (много свободной высоты, мало ширины).
    // В альбоме — ОДИН ряд из десяти: два ряда там физически не влезают без
    // наложения (замерено живым прогоном: при 34px иконке и 31px цене каждый ряд
    // требует ~87px, а под панель остаётся только ~187px — вторая строка налезала
    // на кнопки на 23px). Альбом даёт взамен избыток ширины (10 колонок по ~128px
    // вместо 5 по ~256px), одного ряда достаточно и он ощутимо просторнее портрета.
    // Подобрано и проверено измерением в браузере, см. NOTES.md.
    const iconSize = landscape ? Math.min(s * 1.08, 42) : s * 1.12;
    const colW = landscape ? width / 10 : width / 5;
    this.paletteItems = [];
    const rows = landscape
      ? [[height * 0.79, 'unit', PALETTE_UNITS, UNITS, 0], [height * 0.79, 'block', PALETTE_BLOCKS, BLOCKS, 5]]
      : [[height * 0.73, 'unit', PALETTE_UNITS, UNITS, 0], [height * 0.86, 'block', PALETTE_BLOCKS, BLOCKS, 0]];
    for (const [rowY, kind, ids, table, colOffset] of rows) {
      ids.forEach((baseTypeId, i) => {
        // Палитра ставит и показывает ТЕКУЩУЮ форму юнита (после chooseBranch/
        // payPerekovka), а не всегда базовый id — иначе после превращения игрок мог
        // бы наштамповать себе устаревших не-превращённых юнитов из палитры.
        const typeId = kind === 'unit' ? currentFormId(this.progress.unitLevels, baseTypeId) : baseTypeId;
        const cx = colW * (i + colOffset) + colW / 2;
        const icon = drawPaletteIcon(this, cx, rowY, iconSize, kind, typeId);
        icon.setData('paletteSize', iconSize);
        const price = this.add.text(cx, rowY + iconSize / 2 + 22, '', {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.neutralText,
        }).setOrigin(0.5, 0);
        icon.on('pointerdown', (p) => this.pickItem(kind, typeId, p));
        // Цена всегда по базовому id: стоимость найма прокачкой/превращением не меняется.
        this.paletteItems.push({ kind, typeId, baseTypeId, icon, price, cost: table[baseTypeId].cost });
      });
    }

    // Управление: стирание слева, «В бой» справа. Высоту кнопок МЕРИМ, а не
    // прикидываем: container.height — реальная высота с паддингами и шрифтом.
    const controlsY = landscape ? height * 0.945 : height - 56;
    createButton(this, width * .94, controlsY, i18n.t('menu.back'), () => {
      this.scene.start('Menu');
    }, { fontSize:'19px',paddingX:12,paddingY:10,color:THEME.colors.neutral });
    this.blueprintBtn = createButton(this, width * 0.10, controlsY, i18n.t(this.progress.mode==='missions'?'mission.restart':'blueprint.title'), () => {
      if(this.progress.mode==='missions'){
        this.scene.start('Missions',{selection:this.progress.level,confirmRestart:true});
        return;
      }
      if (tutorialStep(this.progress) !== 'done') return;
      this.scene.start('Blueprint', { progress: this.progress });
    }, { color: THEME.colors.neutral, textColor: THEME.colors.primaryText, fontSize: '22px', paddingX: 18, paddingY: 10 });
    this.eraseBtn = createButton(this, width * 0.32, controlsY, i18n.t('build.erase'), () => {
      if (tutorialStep(this.progress) !== 'done') return;
      this.eraseMode = !this.eraseMode;
      this.eraseBtn.setBgColor(this.eraseMode ? THEME.colors.danger : THEME.colors.neutral);
    }, { color: THEME.colors.neutral, textColor: THEME.colors.primaryText, fontSize: '24px', paddingX: 24, paddingY: 10 });

    this.upgradeBtn = createButton(this, width * 0.55, controlsY, i18n.t('build.upgrade'), () => {
      if(this.progress.mode==='missions')return;
      if (!['upgrade', 'done'].includes(tutorialStep(this.progress))) return;
      this.scene.start('Upgrade', { progress: this.progress });
    }, { color: THEME.colors.neutral, textColor: THEME.colors.primaryText, fontSize: '24px', paddingX: 24, paddingY: 10 });

    this.battleBtn = createButton(this, width * 0.82, controlsY, i18n.t('build.battle'), () => {
      if (!['battle', 'done'].includes(tutorialStep(this.progress))) return;
      if (unitsOf(this.progress.base).filter(c=>!c.locked).length === 0) { this.flashBattleLocked(); return; }
      const issue=missionBuildIssue(this.progress);
      if(issue){this.flashReason(issue,{x:width/2,y:height*.45});return;}
      Analytics.first(EVENTS.FIRST_BATTLE, { level: this.progress.level, mode: this.progress.mode || 'endless' });
      this.scene.start('Battle', {
        progress: this.progress,
        enemyBase: this.firstEnemyBase,
        level: this.levelSpec,
      });
    }, { fontSize: '26px', paddingX: 28, paddingY: 11 });
    // По замеру: кнопка не должна вылезать за низ экрана.
    const lowest = Math.max(
      this.eraseBtn.y + this.eraseBtn.height / 2,
      this.upgradeBtn.y + this.upgradeBtn.height / 2,
      this.battleBtn.y + this.battleBtn.height / 2,
    );
    if (lowest > height) {
      const shift = lowest - height;
      this.eraseBtn.y -= shift; this.upgradeBtn.y -= shift; this.battleBtn.y -= shift;
    }

    this.refreshGold();
  }

  typeColor(kind, typeId) {
    if (kind === 'block') return typeId === 'shield' ? THEME.colors.accent : THEME.colors.neutral;
    // Юнит: ветка A — оттенок primary, ветка B — success, база (ещё не превращён) — как раньше.
    const branchOf = Object.values(UNIT_FORMS).find(f => f.id === typeId)?.branch;
    if (branchOf === 'A') return THEME.colors.primary;
    if (branchOf === 'B') return THEME.colors.success;
    return typeId === 'archer' ? THEME.colors.primary : THEME.colors.success;
  }

  previewWave(){
    this.wavePreviewIndex=(this.wavePreviewIndex+1)%this.waveSpecs.length;
    const spec=this.waveSpecs[this.wavePreviewIndex];
    this.enemyBase=createBase({width:this.progress.width,catalog:CATALOG});applyBlueprint(this.enemyBase,spec.cells);
    const intel=enemyIntel(spec.cells);
    this.intelText.setText(i18n.t('intel.'+intel.type,{n:intel.count})+'\n'+i18n.t('intel.tip.'+intel.type));
    this.wavePreviewBtn.setLabel(i18n.t('wave.preview',{n:this.wavePreviewIndex+1,total:this.waveSpecs.length}));
    this.redraw();
  }

  pickItem(kind, typeId, pointer) {
    if (tutorialStep(this.progress) !== 'done') return;
    if(kind==='unit'&&this.progress.mission?.allowed&&!this.progress.mission.allowed.includes(typeId))return;
    const item = this.paletteItems.find(i => i.kind === kind && i.typeId === typeId);
    if (!isArsenalUnlocked(this.progress, kind, typeId)) {
      this.flashReason('arsenal-locked', {x:pointer.x,y:this.uiRect.top-10}, unlockLevel(kind,typeId)); return;
    }
    if (bonusCount(this.progress, kind, typeId) === 0 && item.cost > this.progress.gold) { this.flashReason('no-gold', pointer); return; }
    this.eraseMode = false;
    this.eraseBtn.setBgColor(THEME.colors.neutral);
    this.selected = { kind, typeId };
    this.refreshGold();
  }

  refreshGold() {
    this.limitText.setText(Object.entries(missionLimits(this.progress)).filter(([,c])=>Number.isFinite(c.limit)).map(([kind,c])=>i18n.t('mission.count.'+kind,{n:c.used,max:c.limit})).join('\n'));
    const conditions=[];
    if(Number.isFinite(this.progress.mission?.maxLosses))conditions.push(i18n.t('mission.lossCap',{max:this.progress.mission.maxLosses}));
    if(this.progress.mission?.timeLimit)conditions.push(i18n.t('mission.deadline',{n:this.progress.mission.timeLimit}));
    if(conditions.length)this.limitText.setText([this.limitText.text,...conditions].filter(Boolean).join('\n'));
    this.goldText.setText(i18n.t('build.gold', { n: this.progress.gold }));
    const titleKey = this.progress.mode==='missions'?'mission.title':this.levelSpec?.boss ? 'build.titleBoss' : 'build.title';
    this.titleText.setText(i18n.t(titleKey, { n: this.progress.level }));
    this.titleText.setColor(this.levelSpec?.boss ? THEME.colors.dangerText : THEME.colors.text);

    const hasUnits = unitsOf(this.progress.base).some(c=>!c.locked)&&missionReady(this.progress);
    this.battleBtn.setBgColor(hasUnits ? THEME.colors.primary : THEME.colors.neutral);

    for (const item of this.paletteItems) {
      const free = bonusCount(this.progress, item.kind, item.typeId);
      const unlocked = isArsenalUnlocked(this.progress,item.kind,item.typeId);
      const affordable = unlocked&&!placementLimit(this.progress,item.kind)&&(free > 0 || item.cost <= this.progress.gold);
      item.icon.setAlpha(affordable ? 1 : 0.45);
      item.price.setColor(affordable ? THEME.colors.neutralText : THEME.colors.dangerText);
      item.price.setText(!unlocked ? i18n.t('build.unlockAt',{n:unlockLevel(item.kind,item.typeId)})
        : free > 0 ? i18n.t('build.freeCount', { n: free }) : String(item.cost));
      const picked = this.selected.kind === item.kind && this.selected.typeId === item.typeId && !this.eraseMode;
      const baseSize = item.icon.getData('paletteSize');
      item.icon.setDisplaySize(baseSize * (picked ? 1.1 : 1), baseSize * (picked ? 1.1 : 1));
    }
    this.refreshTutorial();
    if(this.progress.mode==='missions'){
      this.upgradeBtn.setVisible(false);this.upgradeBtn.input.enabled=false;
      for(const item of this.paletteItems)if(item.kind==='unit'&&this.progress.mission.allowed&&!this.progress.mission.allowed.includes(item.typeId)){
        item.icon.setAlpha(.2);item.price.setText('—');
      }
    }
  }

  refreshTutorial() {
    this.guide?.destroy(); this.guide = null;
    const step = tutorialStep(this.progress), target = tutorialTarget(this.progress);
    const done = step === 'done';
    this.blueprintBtn.setVisible(done); this.eraseBtn.setVisible(done);
    this.upgradeBtn.setVisible(done || step === 'upgrade');
    this.battleBtn.setVisible(done || step === 'battle');
    for (const item of this.paletteItems) {
      const visible = done || (target && item.kind === target.kind && item.typeId === target.typeId);
      item.icon.setVisible(Boolean(visible)); item.price.setVisible(Boolean(visible));
    }
    if (done) return;
    this.eraseMode = false;
    if (target) this.selected = { kind: target.kind, typeId: target.typeId };
    this.guide = tutorialGuide(this, step, () => {
      this.progress.tutorial = 'done';
      Save.update(toSave(this.progress)); Save.flush(); this.refreshGold();
    });
    if (target) {
      const { sx, sy } = cellToScreen(this.layout, 'player', target.x, target.y);
      this.guide.highlight(sx, sy, this.layout.cellSize, this.layout.cellSize);
    } else {
      const btn = step === 'upgrade' ? this.upgradeBtn : this.battleBtn;
      this.guide.highlight(btn.x, btn.y, btn.width, btn.height);
    }
  }

  // Кнопка «В бой» без юнитов не молчит: молчаливый неработающий тап игрок
  // читает как сломанную игру.
  flashBattleLocked() {
    const t = this.add.text(this.battleBtn.x, this.battleBtn.y - this.battleBtn.height / 2 - 30,
      i18n.t('build.needUnit'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.dangerText,
      }).setOrigin(0.5);
    t.setStroke(THEME.textStroke.color, THEME.textStroke.thickness);
    this.tweens.add({ targets: t, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  drawGrid() {
    const g = this.gridLayer;
    const s = this.layout.cellSize;
    const a = cellToScreen(this.layout, 'player', 0, 1).sx - s / 2; // левый край своей базы
    const b = cellToScreen(this.layout, 'enemy', 0, 1).sx - s / 2;  // левой край базы врага
    if(this.progress.mission?.maxHeight){
      const ceiling=this.layout.groundY-this.progress.mission.maxHeight*s;
      g.fillStyle(THEME.colors.danger,.06);g.fillRect(a,this.layout.groundY-s*11,this.progress.width*s,Math.max(0,ceiling-(this.layout.groundY-s*11)));
      g.lineStyle(2,THEME.colors.danger,.75);g.lineBetween(a,ceiling,a+this.progress.width*s,ceiling);
      this.add.text(a+5,ceiling-24,i18n.t('mission.ceiling',{height:this.progress.mission.maxHeight}),{fontFamily:THEME.fontFamily,fontSize:'16px',color:THEME.colors.dangerText});
    }

    // Платформы основания под обеими базами: ряд y = 0, всегда на месте.
    drawGround(g, a - s / 2, this.layout.groundY, this.progress.width * s + s, s * 0.35, 'player',this.progress.base);
    drawGround(g, b - s / 2, this.layout.groundY, this.progress.width * s + s, s * 0.35, 'enemy');
    drawFieldHeraldry(g, this.layout, this.progress.width);

    // Тонкая сетка по всей своей платформе: игрок должен видеть, куда можно ставить.
    g.lineStyle(1, THEME.colors.panel, 0.5);
    for (let x = 0; x <= this.progress.width; x++) {
      const left = a + x * s;
      g.lineBetween(left, this.layout.groundY - s * 10, left, this.layout.groundY);
    }
    for (let y = 1; y <= 11; y++) {
      const top = cellToScreen(this.layout, 'player', 0, y).sy - s / 2;
      g.lineBetween(a, top, a + this.progress.width * s, top);
    }
  }

  cellColor(cell) {
    if (cell.kind === 'unit') return THEME.colors.primary;
    return cell.typeId === 'shield' ? THEME.colors.accent : THEME.colors.neutral;
  }

  redraw() {
    const g = this.cellsLayer;
    g.clear();
    this.fixedMarkers.clear();
    for(const cell of fixedBlockStatus(this.progress)){
      const {sx,sy}=cellToScreen(this.layout,'player',cell.x,cell.y),s=this.layout.cellSize;
      this.fixedMarkers.lineStyle(3,cell.ready?THEME.colors.accent:THEME.colors.danger,1);
      this.fixedMarkers.strokeRect(sx-s*.42,sy-s*.42,s*.18,s*.18);
    }
    for(const [x,y] of [...(this.progress.mission?.destroy??[]),...(this.progress.mission?.destroyBlocks??[])]){
      const {sx,sy}=cellToScreen(this.layout,'enemy',x,y);
      g.lineStyle(3,THEME.colors.danger,1);g.strokeCircle(sx,sy,this.layout.cellSize*.62);
    }
    if(this.progress.mode!=='missions')for(const [x,y] of this.levelSpec.weakPoints??[]){
      const {sx,sy}=cellToScreen(this.layout,'enemy',x,y),s=this.layout.cellSize;
      this.fixedMarkers.lineStyle(2,THEME.colors.accent,.9);
      this.fixedMarkers.strokeCircle(sx,sy,s*.34);
      this.fixedMarkers.lineBetween(sx-s*.18,sy,sx+s*.18,sy);
    }
    const s = this.layout.cellSize;

    for (const [side, base, alpha] of [
      ['player', this.progress.base, 1],
      ['enemy', this.enemyBase, 0.45],   // враг показан бледнее: это превью, а не поле боя
    ]) {
      for (const cell of base.cells.values()) {
        const { sx, sy } = cellToScreen(this.layout, side, cell.x, cell.y);
        if(cell.locked && (!cell.objectId||cell.objectId===`${cell.x},${cell.y}`)){
          const w=cell.objectWidth??1,h=cell.objectHeight??1;
          g.lineStyle(2,THEME.colors.primary,.9);g.strokeRoundedRect(sx-s*.5,sy+s*.5-h*s,w*s,h*s,3);
        }
      }
      syncFortressSprites(this, this.artSprites, side, base, this.layout, alpha);
    }
    for(const floor of objectiveFloors(this.progress)){
      const {sx,sy}=cellToScreen(this.layout,'player',floor.x,floor.y);
      g.lineStyle(4,floor.ready?THEME.colors.primary:THEME.colors.danger,1);
      g.lineBetween(sx-s*.43,sy+s*.5+3,sx+s*.43,sy+s*.5+3);
    }
  }

  onMove(pointer) {
    const cell = screenToCell(this.layout, 'player', pointer.x, pointer.y);
    if (!cell || this.paletteHit(pointer)) { this.dragLast = null; this.ghost.setVisible(false); return; }
    if (pointer.isDown && this.dragLast && tutorialStep(this.progress) === 'done') {
      let changed = false;
      // Revisit unsupported cells as a stroke grows toward its support. A bridge
      // or vertical column should paint in either drag direction.
      let pending = gridStroke(this.dragLast, cell).filter(next =>
        this.eraseMode || !this.progress.base.cells.has(`${next.x},${next.y}`));
      while (pending.length) {
        const retry = [];
        let grew = false;
        for (const next of pending) {
          if (this.paintCell(next, pointer, true)) { changed = true; grew = true; }
          else if (!this.eraseMode && !this.progress.base.cells.has(`${next.x},${next.y}`)) retry.push(next);
        }
        if (!grew) break;
        pending = retry;
      }
      if (changed) {
        this.redraw();
        this.refreshGold?.();
        CombatSounds.build(this.eraseMode ? 'erase' : 'place');
        Save.update(toSave(this.progress));
      }
      this.dragLast = cell;
    }
    const target = tutorialTarget(this.progress);
    if (tutorialStep(this.progress) !== 'done' && (!target || target.x !== cell.x || target.y !== cell.y)) {
      this.ghost.setVisible(false); return;
    }
    const { sx, sy } = cellToScreen(this.layout, 'player', cell.x, cell.y);
    this.ghost.setPosition(sx, sy);
    this.ghost.setStrokeStyle(2, this.eraseMode || cell.y>(this.progress.mission?.maxHeight??Infinity) ? THEME.colors.danger : THEME.colors.accent);
    this.ghost.setVisible(true);
  }

  // Палитра и кнопки перекрывают поле снизу: тап по ним — не тап по клетке.
  paletteHit(pointer) {
    return this.uiRect && pointer.y >= this.uiRect.top;
  }

  onTap(pointer) {
    this.dragLast = null;
    if (this.paletteHit(pointer)) return;
    const cell = screenToCell(this.layout, 'player', pointer.x, pointer.y);
    if (!cell) return;
    this.dragLast = cell;
    this.paintCell(cell, pointer);
  }

  paintCell(cell, pointer, batch = false) {

    const step = tutorialStep(this.progress), target = tutorialTarget(this.progress);
    if (step !== 'done' && (!target || cell.x !== target.x || cell.y !== target.y)) return false;

    if (this.eraseMode) {
      const r = tryErase(this.progress, cell.x, cell.y);
      if (r.ok) Analytics.event(EVENTS.ERASE_USED);
      else if(r.reason && !batch)this.flashReason(r.reason,pointer);
      if (!batch) {
        this.redraw();
        this.refreshGold?.();
        if (r.ok) { CombatSounds.build('erase'); Save.update(toSave(this.progress)); }
      }
      return r.ok;
    }

    const r = tryPlace(this.progress, cell.x, cell.y, this.selected.kind, this.selected.typeId);
    if (!r.ok) { if (!batch) this.flashReason(r.reason, pointer); return false; }
    if (target) advanceTutorial(this.progress, step);
    if (target) { Save.update(toSave(this.progress)); Save.flush(); }
    Analytics.first(EVENTS.FIRST_PLACE, { kind: this.selected.kind, type: this.selected.typeId });
    if (!batch) {
      this.redraw();
      this.refreshGold?.();
      CombatSounds.build('place');
      Save.update(toSave(this.progress));
    }
    return true;
  }

  // Отказ обязан быть виден. Молчаливый неработающий тап игрок читает как
  // сломанную игру — это ровно тот случай, когда «ничего не произошло» хуже ошибки.
  flashReason(reason, pointer, unlockAt = null) {
    const key = reason === 'no-gold' ? 'build.noGold'
      : reason === 'no-support' ? 'build.needSupport' : reason==='arsenal-locked'?'build.locked':reason==='mission-support'?'mission.needSupport':reason==='mission-rule'?'mission.restricted':reason==='mission-height'?'mission.ceiling':reason==='mission-fixed'?'mission.fixed':reason==='mission-ruins'?'mission.repairNeeded':reason==='mission-unit-limit'?'mission.unitLimit':reason==='mission-block-limit'?'mission.blockLimit':null;
    if (!key) return;
    const t = this.add.text(pointer.x, pointer.y - 20, i18n.t(key,{height:this.progress.mission?.maxHeight,n:unlockAt}), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.dangerText,
    }).setOrigin(0.5);
    t.x=Phaser.Math.Clamp(t.x,t.width/2+12,this.scale.width-t.width/2-12);
    t.setStroke(THEME.textStroke.color, THEME.textStroke.thickness);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }
}
