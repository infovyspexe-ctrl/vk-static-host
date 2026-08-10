// Забег по Изнанке. Сцена только рисует состояние из src/mechanics/dungeon/run.js —
// сама не считает урон, не генерирует этажи, не решает исход боя.
import { YA } from '../yandex/sdk.js';
import { Platform } from '../platform/index.js';
import { THEME, toCss } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { HEROES } from '../data/heroes.js';
import { MONSTERS, BOSSES } from '../data/monsters.js';
import { BALANCE } from '../data/balance.js';
import {
  createRun, movePlayer, useSkill, waitPlayer, chooseRelic, rerollShrine, healAtShrine, computeRunReward
} from '../mechanics/dungeon/run.js';
import {
  loadProgress, computeMetaMods, recordRunEnd, canUseRevive, markReviveUsed,
  grantAchievement, recordDailyResult
} from '../meta/progress.js';
import { saveRun, clearRun, resumeRun } from '../meta/runSave.js';
import { ShrineOverlay } from '../ui/ShrineOverlay.js';
import { DeathOverlay } from '../ui/DeathOverlay.js';
import { ConfirmOverlay } from '../ui/ConfirmOverlay.js';
import { RelicsOverlay } from '../ui/RelicsOverlay.js';
import { createCurrencyLabel } from '../ui/currencyLabel.js';
import { showAdCountdown } from '../ui/adCountdown.js';

const TILE = 64;
const COLS = BALANCE.dungeon.cols;
const GRID_TOP = 188;
const GRID_LEFT = (720 - COLS * TILE) / 2;

// Кулдаун между interstitial — на уровне МОДУЛЯ, не сцены (реальный баг, найден живым
// тестом 05.08: this.lastAdAt на экземпляре сцены обнулялся при каждом новом забеге —
// смерть -> новый забег создаёт новый GameScene -> кулдаун сброшен, хотя реальных
// BALANCE.ads.interstitialMinGapSec секунд не прошло. Итог: наш клиентский лимит не
// срабатывал, и вместо него рекламу резал уже платформенный анти-спам Яндекса
// ("Fullscreen ad skipped: too frequent requests") — ролик молча пропадал, хоть игра
// и не ломалась (onError в адаптере честно зовёт onClose(false)).
// Засеяно временем ЗАГРУЗКИ, а не нулём. С нулём первый показ разрешён сразу: игрок,
// вернувшийся в незаконченный забег (resumeRun) и вышедший в деревню, ловил межстраничную
// через несколько секунд после запуска приложения — прямое «не при запуске» п.5.1.5.1 VK
// (находка красной команды 11.08).
let lastAdAt = Date.now();

function monsterDefOf(id) { return MONSTERS[id] || BOSSES[id]; }

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.heroId = data.heroId || 'bogatyr';
    this.seed = data.seed != null ? data.seed : Math.floor(Math.random() * 0xffffffff);
    this.isDaily = !!data.isDaily;
  }

  async create() {
    // Input.setup даёт стрелкам роль фокус-навигации по кнопкам (шаблонное поведение,
    // CONVENTIONS.md §9) — в подземелье стрелками ходит игрок, поэтому движение вешаем
    // на WASD отдельно, а не переопределяем UP/DOWN/LEFT/RIGHT. Мобильный игрок всё равно
    // использует D-pad на экране (основной способ, RETENTION.md: «играется одной рукой»).
    Input.setup(this);
    const kb = this.input.keyboard;
    kb.on('keydown-W', () => this.onMove(0, -1));
    kb.on('keydown-S', () => this.onMove(0, 1));
    kb.on('keydown-A', () => this.onMove(-1, 0));
    kb.on('keydown-D', () => this.onMove(1, 0));
    // Стрелки ТОЖЕ двигают героя (красная команда 05.08: карточка обеих локалей обещает
    // «двигайся стрелками», а двигал только WASD — десктопный игрок жал стрелки впустую,
    // нарушение п.2.2 «полное описание управления»). Фокус-навигация Input.setup при
    // открытом оверлее по-прежнему работает: onMove сам игнорирует не-'playing' статусы
    // и открытый диалог выхода, конфликтов нет.
    kb.on('keydown-UP', () => this.onMove(0, -1));
    kb.on('keydown-DOWN', () => this.onMove(0, 1));
    kb.on('keydown-LEFT', () => this.onMove(-1, 0));
    kb.on('keydown-RIGHT', () => this.onMove(1, 0));
    YA.gameplayStart();
    // Sticky-баннер снят: D-pad/скиллы/«Ждать» стоят вплотную к нижнему краю (см. buildControls),
    // баннер снизу экрана перекрыл бы их. Возвращается в HubScene.create().
    Platform.ads.hideBanner();

    this.progress = await loadProgress();
    const mods = computeMetaMods(this.progress);
    // Продолжить незавершённый забег, если он есть (F5/закрытие вкладки посреди
    // подземелья больше не стирает прогресс — см. src/meta/runSave.js). Сохранённый
    // забег главнее того, что передали через init(data): если он ещё не завершён
    // (finishRun ещё не вызывался), значит игрок либо вернулся сюда после перезагрузки,
    // либо нажал «В Изнанку» повторно, не закрыв прежний спуск явно.
    const resumed = resumeRun();
    this.state = resumed || createRun(this.heroId, this.seed, mods);
    if (resumed) this.heroId = resumed.heroId;
    this.lastDir = { x: 0, y: 1 };
    this._lastActionAt = 0; // антидребезг: не даёт одному тапу/двойному событию сработать дважды

    Analytics.event(EVENTS.GAME_START, { hero: this.heroId, daily: this.isDaily });

    this.bgImage = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg_dungeon_1')
      .setDisplaySize(this.scale.width, this.scale.height).setAlpha(0.8);
    this.gridLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.buildHud();
    this.buildControls();

    this.shrine = new ShrineOverlay(this);
    this.death = new DeathOverlay(this);
    this.confirmExit = new ConfirmOverlay(this);
    this.relics = new RelicsOverlay(this);

    this.drawGrid();
    this.render();
    this.maybeShowHint('hintMove');
    // hintSkill была объявлена в i18n, но нигде не вызывалась — назначение кнопки скилла
    // никогда не объяснялось в самой игре (находка аудита 04.08, 8.2.2). Задержка, чтобы
    // не перекрыть первый тост hintMove (тот гаснет через 3200мс, см. maybeShowHint).
    this.time.delayedCall(3600, () => this.maybeShowHint('hintSkill'));
  }

  // ---- построение статичного UI -------------------------------------------------
  buildHud() {
    const w = this.scale.width;
    // Три строки сверху вниз: (1) этаж/дух — чистый текст; (2) полоса HP — приоритетнее
    // кнопок, сразу под текстом; (3) кнопки (реликвии/компас/✕) — под полосой HP.
    // Координаты подобраны НЕ на глаз, а по реальным меркам объектов (Phaser Container.height
    // = высота текста + paddingY*2 = 18*2 = 36 из THEME.button — визуально куда выше, чем
    // казалось на глаз): предыдущая раскладка легла на глазок и в двух местах реально
    // накладывалась (кнопка «Реликвии» перекрывала текст этажа снизу, ✕ перекрывал счётчик
    // духа) — обе накладки подтверждены измерением `getBounds`/`width`/`height` в браузере,
    // не просто скриншотом.
    this.floorText = this.add.text(20, 24, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text, fontStyle: 'bold'
    });
    // Дух — валюта ЗАБЕГА (сгорает при выходе), своя холодная иконка, не путать с искрами.
    this.spiritLabel = createCurrencyLabel(this, w - 20, 38, 'currency_spirit',
      { align: 'right', fontSize: THEME.fontSize.normal, iconSize: 26 });

    // Полоса HP — сразу под строкой этаж/дух (нижний край текста ~61px), с запасом.
    this.hpBarBg = this.add.rectangle(w / 2, 87, w - 40, 24, THEME.colors.panel).setOrigin(0.5);
    this.hpBarFill = this.add.rectangle(30, 87, w - 44, 18, THEME.colors.safe).setOrigin(0, 0.5);
    this.hpText = this.add.text(w / 2, 87, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text
    }).setOrigin(0.5);

    // Кнопки — под полосой HP (нижний край бара ~99px), с запасом. «Реликвии» растёт от
    // ЗАКРЕПЛЁННОГО ЛЕВОГО края (не от центра) — не может задеть что-либо слева от x=20 при
    // любой длине текста (счётчик реликвий двузначный, переводы разной длины).
    const btnRowY = 142;
    this.relicsBtn = createButton(this, 20, btnRowY, i18n.t('relicsButton', { n: 0 }), () => this.openRelics(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: '18px' });
    this.relicsBtn.x = 20 + this.relicsBtn.width / 2;

    // Символ ✕, не пауза: кнопка сразу завершает забег и уводит в деревню (искры
    // начисляются честно, как за обычный конец — см. pauseToMenu). Реальной паузы
    // с возобновлением у забега нет, подписывать кнопку «II» было бы обманом ожиданий.
    this.pauseBtn = createButton(this, w - 46, btnRowY, '✕', () => this.pauseToMenu(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });

    // Стрелка-компас к лестнице УБРАНА (была у «Клубка»): указывала на объект, который и так
    // безусловно нарисован на поле (`drawGrid()` рисует лестницу каждый этаж независимо от
    // реликвий) — чистый шум в HUD без единого бита новой информации (справедливая жалоба
    // игрока: «зачем путать информацией, которая не нужна»). Реальный эффект «Клубка» теперь
    // только гарантированный второй сундук — см. `run.js#loadFloor`.

    // Подсказка — всплывающий тост ПОВЕРХ поля (высокий depth), а не часть верхней шапки:
    // с кнопкой «Реликвии»/полосой HP там больше не осталось места без наложений (жалоба
    // плейтеста на скриншот с наехавшей друг на друга разметкой). Полупрозрачная подложка —
    // подсказка не мешает читать то, что под ней, но и не сливается с полем.
    this.hintBg = this.add.rectangle(w / 2, GRID_TOP + 34, w - 40, 56, 0x0a0714, 0.82)
      .setDepth(80).setAlpha(0);
    this.hintText = this.add.text(w / 2, GRID_TOP + 34, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
      align: 'center', wordWrap: { width: w - 70 }
    }).setOrigin(0.5).setDepth(81).setAlpha(0);
  }

  buildControls() {
    // Кнопки чуть уменьшены (свой fontSize вместо неявного THEME.fontSize.normal у d-pad,
    // и на пункт мельче у скиллов/ожидания) — освобождает запас по высоте для игрового поля
    // без утраты нажимаемости (высота кнопки = текст + paddingY*2, всё ещё крупная цель).
    const dpadCx = 150, dpadCy = 1140;
    const dpadOffset = 74;
    const dpadOpts = { fontSize: '22px' };
    this.dpad = {
      up: createButton(this, dpadCx, dpadCy - dpadOffset, '▲', () => this.onMove(0, -1), dpadOpts),
      down: createButton(this, dpadCx, dpadCy + dpadOffset, '▼', () => this.onMove(0, 1), dpadOpts),
      left: createButton(this, dpadCx - dpadOffset, dpadCy, '◀', () => this.onMove(-1, 0), dpadOpts),
      right: createButton(this, dpadCx + dpadOffset, dpadCy, '▶', () => this.onMove(1, 0), dpadOpts)
    };

    const heroDef = HEROES[this.heroId];
    this.skillBtns = heroDef.skills.map((skill, i) =>
      createButton(this, 560, 1052 + i * 88, i18n.t('skill_' + skill.id), () => this.onSkill(i),
        { color: THEME.colors.primary, fontSize: '20px' })
    );

    // y=1220, а не 1240: при 1240 нижний край кнопки (высота = текст + paddingY*2 ≈ 62)
    // приходился на 1271 из 1280 — девять пикселей до кромки канваса. На мобильном клиенте
    // это ~4 CSS px, и кнопка вплотную к жест-бару/кромке фрейма (п.3.2.2 VK про safe zone,
    // находка красной команды 11.08). Замер: 1220 → низ 1251, зазор до соседней кнопки
    // умения сверху 18 px (п.3.3.2 «кнопки на комфортном расстоянии»).
    this.waitBtn = createButton(this, 560, 1220, i18n.t('waitButton'), () => this.onWait(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: '20px' });
  }

  // ---- рендер подземелья ---------------------------------------------------------
  drawGrid() {
    this.gridLayer.removeAll(true);
    const tier = this.tierColorsForFloor(this.state.floor);
    const g = this.add.graphics();
    for (let y = 0; y < this.state.floorState.rows; y++) {
      for (let x = 0; x < this.state.floorState.cols; x++) {
        const isFloor = this.state.floorState.grid[y][x] === 1;
        g.fillStyle(isFloor ? tier.floor : tier.wall, isFloor ? 0.82 : 0.94);
        const px = GRID_LEFT + x * TILE, py = GRID_TOP + y * TILE;
        g.fillRoundedRect(px + 2, py + 2, TILE - 4, TILE - 4, 6);
      }
    }
    this.gridLayer.add(g);

    const tierIdx = this.state.floor <= 5 ? 1 : this.state.floor <= 10 ? 2 : 3;
    this.bgImage.setTexture('bg_dungeon_' + tierIdx);

    const st = this.state.floorState.stairs;
    const stairs = this.add.image(this.tileX(st.x), this.tileY(st.y), 'prop_stairs');
    stairs.setScale((TILE - 10) / Math.max(stairs.width, stairs.height));
    this.gridLayer.add(stairs);
    // Лестница заперта, пока живы враги (run.js#movePlayer, решение 05.08) — показываем
    // это сразу: затемнена и полупрозрачна, открывается в updateStairsLock() при зачистке.
    // Условие нужно и здесь (не только «на старте этажа всегда > 0»): resumeRun() может
    // восстановить этаж, уже зачищенный, но не покинутый.
    this.stairsSprite = stairs;
    this.updateStairsLock(false);
  }

  // withFeedback=true — при переходе «заперта → открыта» показать тост и пульс лестницы;
  // false — молча синхронизировать вид (отрисовка этажа/восстановление забега).
  updateStairsLock(withFeedback) {
    if (!this.stairsSprite || !this.stairsSprite.active) return;
    const locked = this.state.floorState.enemies.length > 0;
    if (locked) {
      this.stairsSprite.setTint(0x555577).setAlpha(0.75);
    } else {
      const wasLocked = this.stairsSprite.tintTopLeft !== 0xffffff;
      this.stairsSprite.clearTint();
      this.stairsSprite.setAlpha(1);
      if (withFeedback && wasLocked) {
        const st = this.state.floorState.stairs;
        this.floatText(st, i18n.t('stairsOpen'), THEME.colors.safe);
        this.tweens.add({ targets: this.stairsSprite, scale: this.stairsSprite.scale * 1.25, duration: 160, yoyo: true });
      }
    }
  }

  tierColorsForFloor(floor) {
    const idx = floor <= 5 ? 1 : floor <= 10 ? 2 : 3;
    return THEME.dungeonTier[idx];
  }

  tileX(gx) { return GRID_LEFT + gx * TILE + TILE / 2; }
  tileY(gy) { return GRID_TOP + gy * TILE + TILE / 2; }

  render() {
    const p = this.state.player;
    this.floorText.setText(i18n.t('floorLabel', { n: this.state.floor }));
    this.spiritLabel.setValue(this.state.spirit);

    const hpPct = Math.max(0, p.hp / p.maxHp);
    this.hpBarFill.width = (this.scale.width - 44) * hpPct;
    this.hpBarFill.fillColor = hpPct > 0.35 ? THEME.colors.safe : THEME.colors.danger;
    this.hpText.setText(p.hp + ' / ' + p.maxHp);

    const heroDef = HEROES[this.heroId];
    this.skillBtns.forEach((btn, i) => {
      const cd = p.skillCd[i];
      btn.setLabel(i18n.t('skill_' + heroDef.skills[i].id) + (cd > 0 ? ' (' + cd + ')' : ''));
      btn.setAlpha(cd > 0 ? 0.5 : 1);
    });

    this.relicsBtn.setLabel(i18n.t('relicsButton', { n: this.state.relics.length }));
    this.relicsBtn.x = 20 + this.relicsBtn.width / 2; // левый край всегда на x=20 (см. buildHud)

    this.entityLayer.removeAll(true);
    this.enemySprites = new Map();
    for (const chest of this.state.floorState.chests) {
      const img = this.add.image(this.tileX(chest.x), this.tileY(chest.y), 'prop_chest');
      img.setScale((TILE - 20) / Math.max(img.width, img.height));
      this.entityLayer.add(img);
    }

    // Дальнобойные враги (ranged/pull) не подходят сами, пока держат прямую линию видимости —
    // без объяснения это читается как «противник заблокирован, к нему не подойти» (жалоба
    // плейтеста). Подсказка один раз за забег, при первом появлении такого врага в кадре.
    if (this.state.floorState.enemies.some((e) => {
      const b = monsterDefOf(e.monsterId).behavior;
      return b === 'ranged' || b === 'pull';
    })) this.maybeShowHint('hintRanged');

    for (const enemy of this.state.floorState.enemies) {
      const def = monsterDefOf(enemy.monsterId);
      const size = enemy.isBoss ? TILE - 6 : TILE - 18;
      const img = this.add.image(this.tileX(enemy.x), this.tileY(enemy.y), def.icon);
      img.setScale(size / Math.max(img.width, img.height));
      this.entityLayer.add(img);
      this.enemySprites.set(enemy.id, img);
      if (enemy.hp < enemy.maxHp) {
        const w = enemy.isBoss ? 48 : 34;
        const barY = this.tileY(enemy.y) - (enemy.isBoss ? 36 : 28);
        const bg = this.add.rectangle(this.tileX(enemy.x), barY, w, 6, THEME.colors.panel);
        const pct = Math.max(0, enemy.hp / enemy.maxHp);
        const fill = this.add.rectangle(this.tileX(enemy.x) - w / 2, barY, w * pct, 6, THEME.colors.danger).setOrigin(0, 0.5);
        this.entityLayer.add(bg); this.entityLayer.add(fill);
      }
    }

    const heroImg = this.add.image(this.tileX(p.x), this.tileY(p.y), 'hero_' + this.heroId);
    heroImg.setScale((TILE - 12) / Math.max(heroImg.width, heroImg.height));
    this.entityLayer.add(heroImg);
    this.playerSprite = heroImg;

    if (this.state.status === 'shrine' && !this.shrine.visible) this.openShrine();
    if (this.state.status === 'dead' && !this.death.visible) this.openDeath();
  }

  openRelics() {
    this.relics.open(this.state.relics);
  }

  maybeShowHint(key) {
    const flagKey = 'hint_' + key;
    if (this[flagKey]) return;
    this[flagKey] = true;
    this.hintText.setText(i18n.t(key)).setAlpha(1);
    this.hintBg.setAlpha(0.82);
    Analytics.event(EVENTS.TUTORIAL_HINT_SHOWN, { hintId: key });
    this.time.delayedCall(3200, () => { this.hintText.setAlpha(0); this.hintBg.setAlpha(0); });
  }

  // ---- действия игрока ------------------------------------------------------------
  // Антидребезг: живой плейтест поймал реальный баг — одно нажатие кнопки иногда
  // порождало 2-3 хода подряд (герой перепрыгивал клетку, враг умирал и на его место
  // тут же вставал следующий). Похоже на повторный pointerup/тач-эмуляцию на мобильном —
  // отдельные UI-кнопки такого не ловили (Button.js один обработчик), поэтому лечим на
  // уровне действия: игнорируем повторный вызов раньше чем через 180 мс после предыдущего.
  guardInput() {
    const now = this.time.now;
    if (now - this._lastActionAt < 180) return false;
    this._lastActionAt = now;
    return true;
  }

  onMove(dx, dy) {
    if (this.state.status !== 'playing' || !this.guardInput()) return;
    // Диалог выхода открыт при status==='playing' — стрелки (теперь двигающие героя, см.
    // create) без этой защиты ходили бы «за спиной» диалога, пока враги отвечают.
    if (this.confirmExit && this.confirmExit.visible) return;
    this.lastDir = { x: dx, y: dy };
    const events = movePlayer(this.state, dx, dy);
    this.handleEvents(events);
    this.render();
    this.playFeedback(events);
    saveRun(this.state);
  }

  onSkill(i) {
    if (this.state.status !== 'playing' || !this.guardInput()) return;
    const events = useSkill(this.state, i, { dir: this.lastDir });
    this.handleEvents(events);
    this.render();
    this.playFeedback(events);
    saveRun(this.state);
  }

  onWait() {
    if (this.state.status !== 'playing' || !this.guardInput()) return;
    const events = waitPlayer(this.state);
    this.handleEvents(events);
    this.render();
    this.playFeedback(events);
    saveRun(this.state);
  }

  // ---- визуальный отклик боя -------------------------------------------------------
  // render() каждый раз пересобирает спрайты с нуля (проще и надёжнее для пошаговой сетки,
  // чем диффить сцену), поэтому анимация идёт ПОСЛЕ него, поверх уже готовых новых спрайтов
  // (this.playerSprite / this.enemySprites, обновлены в конце render()) — плейтест жаловался
  // «непонятно что происходит», без этого бой был мгновенной подменой картинки.
  playFeedback(events) {
    for (const ev of events) {
      if ((ev.type === 'playerAttack' || ev.type === 'skillUsed') && !ev.missed && !ev.blocked && ev.dmg > 0) {
        const tile = { x: ev.x, y: ev.y };
        this.lungeSprite(this.playerSprite, tile);
        const enemySprite = ev.targetId ? this.enemySprites.get(ev.targetId) : null;
        if (enemySprite) this.flashSprite(enemySprite, 0xff5555);
        this.floatText(tile, '-' + ev.dmg, THEME.colors.accent);
      }
      if (ev.type === 'enemyDied') {
        this.poof({ x: ev.x, y: ev.y });
        // Последний враг пал — лестница открывается с явным откликом (тост + пульс),
        // иначе смена вида запертой лестницы прошла бы незамеченной.
        this.updateStairsLock(true);
      }
      // Стук в запертую лестницу: почему нельзя вниз — прямо на лестнице, с числом врагов.
      if (ev.type === 'stairsLocked') {
        const st = this.state.floorState.stairs;
        this.floatText(st, i18n.t('stairsLocked', { n: ev.remaining }), THEME.colors.danger);
        if (this.stairsSprite && this.stairsSprite.active) {
          const s = this.stairsSprite;
          this.tweens.add({ targets: s, x: s.x + 4, duration: 45, yoyo: true, repeat: 3 });
        }
      }
      // Корни лешего: игрок должен ЯВНО видеть, что произошло и почему пропущен ход
      // (требование владельца: «чтобы не думал, что это просто баг»).
      if (ev.type === 'root') {
        this.flashSprite(this.playerSprite, 0x55aa44);
        this.floatText({ x: this.state.player.x, y: this.state.player.y }, i18n.t('rootedByLeshy'), THEME.colors.danger);
        const leshySprite = this.enemySprites.get(ev.id);
        if (leshySprite) this.flashSprite(leshySprite, 0x55aa44);
      }
      // Стан полуночницы и сам факт пропуска хода — та же проблема ясности, что у корней:
      // до 05.08 ход просто «съедался» без единого пикселя объяснения.
      if (ev.type === 'stun') {
        this.floatText({ x: this.state.player.x, y: this.state.player.y }, i18n.t('stunnedByEnemy'), THEME.colors.danger);
      }
      if (ev.type === 'stunnedSkip') {
        this.floatText({ x: this.state.player.x, y: this.state.player.y }, i18n.t('stunnedSkip'), THEME.colors.neutral);
      }
      if (ev.type === 'attack') {
        // Враг бьёт игрока — жалоба плейтеста «сделать чтобы они меня тоже били, а то
        // непонятно что происходит»: враг дёргается в сторону игрока независимо от исхода
        // (в т.ч. промаха/блока — видно, что он вообще атаковал), урон отмечаем отдельно.
        const enemySprite = this.enemySprites.get(ev.id);
        if (enemySprite) this.lungeSprite(enemySprite, { x: this.state.player.x, y: this.state.player.y });
        if (!ev.missed && !ev.blocked && ev.dmg > 0) {
          this.flashSprite(this.playerSprite, 0xff5555);
          this.cameras.main.shake(120, 0.006);
          this.floatText({ x: this.state.player.x, y: this.state.player.y }, '-' + ev.dmg, THEME.colors.danger);
        }
      }
      if (ev.type === 'chestOpened') {
        this.floatText({ x: this.state.player.x, y: this.state.player.y }, '+' + ev.spirit + ' ✦', THEME.colors.accent);
      }
      if (ev.type === 'skillUsed' && ev.healed) {
        this.flashSprite(this.playerSprite, 0x66ff99);
        this.floatText({ x: this.state.player.x, y: this.state.player.y }, '+' + ev.healed, THEME.colors.safe);
      }
      // Автовоскрешение реликвией «Печать Морены» — раньше не имело НИКАКОГО отклика на
      // экране: HP молча становилось 1, и следующий же удар в той же фазе врагов добивал
      // по-настоящему, до того как игрок вообще понимал, что реликвия сработала (жалоба
      // «взял что-то, что должно было дать жизни, но на следующем этаже просто умер»).
      if (ev.type === 'revived') this.showRevived();
      // Молчаливый провал скилла без цели («удар вообще не нажимался» — жалоба игрока): раньше
      // useSkill просто возвращал пустой массив событий — снаружи выглядело как залипшая
      // кнопка, хотя причина была «нет врага строго по вертикали/горизонтали». Тот же плавающий
      // текст, что и для урона, только серым и над игроком — коротко объясняет, что кнопка
      // сработала, просто ударить было некого.
      if (ev.type === 'skillNoTarget') {
        // floatText(color) ждёт ЧИСЛО (сама зовёт toCss внутри) — THEME.colors.textDim это
        // CSS-строка для обычного Phaser.Text, здесь нужен числовой цвет вроде остальных.
        this.floatText({ x: this.state.player.x, y: this.state.player.y }, i18n.t('noTarget'), THEME.colors.neutral);
      }
    }
  }

  showRevived() {
    this.cameras.main.flash(260, 242, 193, 78); // цвет THEME.colors.accent
    const t = this.add.text(this.scale.width / 2, this.scale.height * 0.38, i18n.t('relicRevived'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: toCss(THEME.colors.accent),
      fontStyle: 'bold', align: 'center', wordWrap: { width: this.scale.width - 100 }
    }).setOrigin(0.5).setDepth(90).setScale(0.6).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 500, onComplete: () => t.destroy() })
    });
  }

  lungeSprite(sprite, targetTile) {
    if (!sprite) return;
    const startX = sprite.x, startY = sprite.y;
    const midX = startX + (this.tileX(targetTile.x) - startX) * 0.35;
    const midY = startY + (this.tileY(targetTile.y) - startY) * 0.35;
    this.tweens.add({ targets: sprite, x: midX, y: midY, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  flashSprite(sprite, color) {
    if (!sprite || !sprite.active) return;
    sprite.setTint(color);
    this.time.delayedCall(160, () => { if (sprite && sprite.active) sprite.clearTint(); });
  }

  // color — числовой THEME.colors.* (как fillStyle), конвертируется в CSS здесь же.
  floatText(tile, text, color) {
    const t = this.add.text(this.tileX(tile.x), this.tileY(tile.y) - 22, text, {
      fontFamily: THEME.fontFamily, fontSize: '22px', color: toCss(color), fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 550, onComplete: () => t.destroy() });
  }

  poof(tile) {
    const t = this.add.text(this.tileX(tile.x), this.tileY(tile.y), '✦', {
      fontFamily: THEME.fontFamily, fontSize: '30px', color: toCss(THEME.colors.accent)
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, scale: 2.2, alpha: 0, duration: 400, onComplete: () => t.destroy() });
  }

  handleEvents(events) {
    for (const ev of events) {
      // hintAttack была объявлена в i18n, но нигде не вызывалась — механика «шаг в
      // сторону врага бьёт его» никогда не объяснялась в самой игре (находка аудита
      // 04.08, 8.2.2), несмотря на то что она сформулирована в тексте карточки магазина.
      if (ev.type === 'playerAttack') this.maybeShowHint('hintAttack');
      if (ev.type === 'floorCleared') {
        Analytics.event(EVENTS.FLOOR_REACHED, { floor: this.state.floor });
        if (ev.noHit) grantAchievement(this.progress, 'no_hit_floor');
        this.maybeInterstitial();
      }
      if (ev.type === 'bossKilled') Analytics.event(EVENTS.BOSS_KILLED, { bossId: ev.monsterId, floor: ev.floor });
      if (ev.type === 'died') Analytics.event(EVENTS.PLAYER_DIED, { floor: ev.floor });
      if (ev.type === 'floorStarted') this.drawGrid();
    }
  }

  // onDone (опционально) — вызывается ПОСЛЕ закрытия рекламы, а не сразу после запуска.
  // Раньше finishRun() звал toHub() синхронно сразу за maybeInterstitial() — переход в
  // деревню происходил ДО того, как реклама успевала открыться/закрыться, и её onClose
  // (platform/index.js) выполнял Platform.gameplayStart() уже когда игрок был в хабе, а не
  // в забеге (найдено при аудите 04.08). Если реклама не показывается вообще (early return
  // ниже) — onDone зовётся немедленно, иначе только из onClose.
  //
  // showAdCountdown ПЕРЕД показом — не только про «голый таймер» (сюда он и так не
  // подпадает, реклама уже висит на логической паузе), а про буфер против фрод-клика:
  // раньше showFullscreen вызывался СИНХРОННО в том же тике, что и pointerup по D-pad,
  // которым игрок как раз встал на лестницу — повторный тап (обычное дело в пошаговой
  // игре, где по кнопке барабанят) прилетал уже в открывшуюся рекламу. Затемнение
  // отсчёта интерактивно (setInteractive в adCountdown.js) и глотает такие тапы.
  maybeInterstitial(onDone) {
    if (this.state.floor <= 1) { if (onDone) onDone(); return; } // не на обучающем этаже
    const now = Date.now();
    if (now - lastAdAt < BALANCE.ads.interstitialMinGapSec * 1000) { if (onDone) onDone(); return; }
    // Сначала спрашиваем площадку, есть ли ролик, и только потом крутим отсчёт: иначе
    // игрок получал три секунды затемнения с надписью «Реклама через 3…» и пустоту, когда
    // реклама не налилась. И кулдаун (lastAdAt) взводим только на РЕАЛЬНЫЙ показ — иначе
    // несостоявшаяся попытка съедала следующие 2.5 минуты (находки красной команды 11.08).
    Platform.ads.interstitialAvailable().then((ok) => {
      if (!ok) { if (onDone) onDone(); return; }
      lastAdAt = Date.now();
      showAdCountdown(this, () => {
        Analytics.event(EVENTS.AD_INTERSTITIAL_SHOWN);
        Platform.ads.showFullscreen({ onClose: () => { if (onDone) onDone(); } });
      });
    });
  }

  // ---- алтарь -----------------------------------------------------------------
  openShrine() {
    // Алтарь = «уровень пройден»: GameplayAPI.stop, пока игрок выбирает оберег (п.1.19.3
    // требует СТРОГОГО соответствия моментам из раздела «Геймплей» — находка красной
    // команды 05.08: оверлеи держали геймплей «активным» минутами). start — при выборе.
    YA.gameplayStop();
    this.shrine.open({
      getState: () => this.state,
      onPick: (relicId) => {
        Analytics.event(EVENTS.RELIC_CHOSEN, { relicId, floor: this.state.floor });
        chooseRelic(this.state, relicId);
        this.shrine.close();
        YA.gameplayStart(); // следующий этаж начался — геймплей снова активен
        this.drawGrid();
        this.maybeShowHint('hintRelic');
        this.render();
        saveRun(this.state);
      },
      onRerollFree: () => { if (rerollShrine(this.state, { free: false }).ok) { this.shrine.refresh(); saveRun(this.state); } },
      onRerollAd: () => {
        Analytics.event(EVENTS.AD_REWARDED_SHOWN, { placement: 'reroll' });
        Platform.ads.showRewarded({ onRewarded: () => { rerollShrine(this.state, { free: true }); this.shrine.refresh(); saveRun(this.state); } });
      },
      onHeal: () => { if (healAtShrine(this.state).ok) { this.shrine.refresh(); saveRun(this.state); } }
    });
    // Кнопка «за рекламу» — только при реально предзагруженном ролике (H2, правила VK).
    // Вдогонку, а не до открытия алтаря: ждать ответ моста перед показом экрана нельзя,
    // он может и не прийти.
    Platform.ads.rewardedAvailable().then((ok) => {
      if (this.shrine.visible) this.shrine.setAdRerollAvailable(ok);
    });
  }

  // ---- смерть / итог ------------------------------------------------------------
  openDeath() {
    // Экран смерти = «проигрыш»: GameplayAPI.stop (п.1.19.3, см. openShrine). start —
    // только если игрок ожил рекламным «Вторым дыханием»; выход в деревню start не зовёт
    // (toHub и так завершает геймплей своим stop — парность сохраняется: stop дважды
    // подряд SDK трактует идемпотентно, а вот «активный геймплей» на экране смерти — нет).
    YA.gameplayStop();
    const sparksEarned = computeRunReward(this.state);
    this._sparksEarned = sparksEarned; // не начисляем дважды, если revive потом снова умрёт
    this._recorded = false;
    this.death.open({
      floor: this.state.floor,
      sparksEarned,
      canRevive: canUseRevive(this.progress),
      onRevive: () => {
        Analytics.event(EVENTS.AD_REWARDED_SHOWN, { placement: 'revive' });
        Platform.ads.showRewarded({
          onRewarded: () => {
            markReviveUsed(this.progress);
            this.state.status = 'playing';
            // 50% maxHp, не 1 HP (BALANCE.combat.reviveHpPct, та же логика, что у Печати
            // Морены): игрок посмотрел рекламу — и умирал от следующего же удара, потому
            // что оживал с одним хитом в окружении врагов. Худший вид обмана за просмотр.
            this.state.player.hp = Math.max(1, Math.round(this.state.player.maxHp * BALANCE.combat.reviveHpPct));
            this.death.close();
            YA.gameplayStart(); // ожил — геймплей снова активен (парный к stop в openDeath)
            this.render();
            saveRun(this.state);
          }
        });
      },
      onBack: () => this.finishRun(sparksEarned)
    });
    // Кнопка «Второе дыхание» открывается ТОЛЬКО когда сошлось двое: правила игры (бонус
    // раз в сутки) и реальная предзагрузка ролика у площадки (H2, правила VK). Оверлей
    // открылся с погашенной кнопкой — включаем, когда придёт ответ.
    if (canUseRevive(this.progress)) {
      Platform.ads.rewardedAvailable().then((ok) => {
        if (this.death.visible && ok) this.death.setReviveAvailable(true);
      });
    }
  }

  finishRun(sparksEarned) {
    if (this._recorded) { this.toHub(); return; }
    this._recorded = true;
    const stats = {
      floor: this.state.floor,
      sparksEarned,
      relicsPicked: this.state.lifetimeCounters.relicsPicked,
      spiritCollected: this.state.lifetimeCounters.spiritCollected,
      bossesKilled: this.state.lifetimeCounters.bossesKilled,
      enemiesKilled: this.state.lifetimeCounters.enemiesKilled,
      heroId: this.heroId
    };
    recordRunEnd(this.progress, stats);
    if (this.isDaily) recordDailyResult(this.progress, this.state.floor);
    Analytics.event(EVENTS.SESSION_END, { floor: this.state.floor, sparksEarned });
    clearRun(); // забег официально завершён — сейв «продолжить» больше не актуален
    this.maybeInterstitial(() => this.toHub());
  }

  toHub() {
    YA.gameplayStop();
    Platform.save.flush();
    this.scene.start('Hub');
  }

  // Кнопка ✕ — досрочный выход в деревню. Жалоба живого плейтеста: закрыл этаж не глядя,
  // дух сгорел, было непонятно, что вообще произошло. Теперь сначала спрашиваем и называем
  // цену честно (искры начисляются как за обычный конец — YANDEX-MODERATION.md: награда
  // честная, не зависит от рекламы), выйти можно только подтвердив.
  pauseToMenu() {
    if (this.state.status !== 'playing') return; // не поверх алтаря/экрана смерти
    YA.gameplayStop(); // «вызов меню» — п.1.19.3; start при отмене, при выходе стоп и так
    const sparksEarned = computeRunReward(this.state);
    this.confirmExit.open({
      title: i18n.t('exitConfirmTitle'),
      message: i18n.t('exitConfirmMsg', { spirit: this.state.spirit, sparks: sparksEarned }),
      onConfirm: () => this.finishRun(sparksEarned),
      onCancel: () => YA.gameplayStart()
    });
  }
}
