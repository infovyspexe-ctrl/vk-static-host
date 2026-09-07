// БОЙ. Сцена только рисует и принимает нажатия — весь расчёт в `mechanics/deckrun/combat.js`.
// Правило, которое здесь легко нарушить и дорого чинить: сцена НИКОГДА не считает урон
// сама и не меняет состояние напрямую. Любое изменение — через движок, потом перерисовка.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { createCardView, CARD_W } from '../ui/CardView.js';
import { panel, hpBar, statusRow, popNumber, toast, statusHint, heading, STATUS_SIGN } from '../ui/widgets.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { Progress } from '../meta/progress.js';
import { AdGate } from '../core/ads.js';
import { Ads } from '../yandex/ads.js';
import { Platform } from '../platform/index.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { CATALOG } from '../data/catalog.js';
import { BALANCE } from '../data/balance.js';
import { openRelicViewer } from '../ui/RelicViewer.js';

const HAND_Y = 1120;
const ENEMY_Y = 330;

export class CombatScene extends Phaser.Scene {
  constructor() { super('Combat'); }

  create(data) {
    const { width, height } = this.scale;
    Input.setup(this);
    this.selected = -1;
    this.busy = false;
    this.dead = false;
    this.revived = false;

    this.combat = Session.combat;
    this.run = Session.run;
    if (!this.combat) { this.scene.start('Map'); return; }

    // Фон урочища. Если генерация ещё не доехала — заливка цветом темы: пустой чёрный
    // экран читается как «игра сломалась», а не как оформление.
    const bgKey = 'bg_act' + this.run.state.act;
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      const k = Math.max(width / bg.width, height / bg.height);
      bg.setScale(k).setAlpha(0.55).setTint(0x8899bb);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);
    }
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0710, 0.35);

    this.buildHud();
    this.buildEnemies();
    this.buildPlayer();
    this.buildControls();
    this.renderAll();

    Platform.gameplayStart();
    this.events.on('shutdown', () => Platform.gameplayStop());
  }

  // ---- Шапка ---------------------------------------------------------------
  buildHud() {
    const { width } = this.scale;
    panel(this, width / 2, 44, width - 24, 76, { fill: THEME.colors.panelDark, alpha: 0.9 });
    this.turnText = this.add.text(24, 44, '', {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
    }).setOrigin(0, 0.5);
    // Обереги в шапке — СЧЁТЧИКОМ, а не списком имён: к середине похода их пять-семь,
    // и строка имён наезжала на номер хода (поймано витринным скриншотом). Список
    // открывается тапом — в бою он нужен часто, чтобы вспомнить, что уже работает.
    this.relicText = this.add.text(width - 24, 44, '', {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
    }).setOrigin(1, 0.5);
    Input.makeSelectable(this.relicText, () => openRelicViewer(this, this.combat.state.player.relics));
  }

  // ---- Враги ---------------------------------------------------------------
  buildEnemies() {
    const { width } = this.scale;
    const list = this.combat.state.enemies;
    this.enemyViews = list.map((e, i) => {
      const step = width / (list.length + 1);
      const x = step * (i + 1);
      const def = CATALOG.enemies[e.defId];
      const view = { enemy: e, x };

      const artKey = 'enemy_' + def.art;
      if (this.textures.exists(artKey)) {
        const img = this.add.image(x, ENEMY_Y, artKey);
        const maxW = Math.min(step - 16, 260);
        const k = Math.min(maxW / img.width, 230 / img.height);
        img.setScale(k);
        view.sprite = img;
      } else {
        view.sprite = this.add.circle(x, ENEMY_Y, 62, THEME.colors.panelLight)
          .setStrokeStyle(3, THEME.colors.stroke);
      }

      view.name = this.add.text(x, ENEMY_Y + 105, i18n.t('enemy_' + e.defId), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
      }).setOrigin(0.5);
      view.name.setStroke(THEME.textStroke.color, 4);

      view.hp = hpBar(this, x, ENEMY_Y + 140, Math.min(step - 30, 210), 22);
      view.statuses = statusRow(this, x, ENEMY_Y + 172, { onTap: (k, v) => statusHint(this, k, v) });

      view.intent = this.add.text(x, ENEMY_Y - 132, '', {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
        align: 'center', wordWrap: { width: step - 20 },
      }).setOrigin(0.5);
      view.intent.setStroke(THEME.textStroke.color, 5);

      // Цель выбирается тапом по врагу. Область нажатия — сам спрайт: тапать по крохотной
      // полоске здоровья на телефоне невозможно.
      view.sprite.setInteractive({ useHandCursor: true });
      view.sprite.on('pointerup', () => this.onEnemyTap(i));
      return view;
    });
  }

  // ---- Игрок ---------------------------------------------------------------
  buildPlayer() {
    const { width } = this.scale;
    const y = 660;
    panel(this, width / 2, y + 10, width - 24, 190, { fill: THEME.colors.panel, alpha: 0.85 });

    const heroKey = 'hero_' + this.run.state.hero;
    if (this.textures.exists(heroKey)) {
      const img = this.add.image(112, y, heroKey);
      img.setScale(Math.min(150 / img.width, 150 / img.height));
    } else {
      this.add.circle(112, y, 58, THEME.colors.panelLight).setStrokeStyle(3, THEME.colors.stroke);
    }

    this.playerHp = hpBar(this, 420, y - 24, 460, 30, { fontSize: THEME.fontSize.small });
    this.playerStatuses = statusRow(this, 420, y + 34, { onTap: (k, v) => statusHint(this, k, v) });
  }

  // ---- Управление ----------------------------------------------------------
  buildControls() {
    const { width } = this.scale;
    const y = 880;

    // Энергия — крупный круг: это самый спрашиваемый показатель в бою, он не должен
    // теряться среди цифр.
    this.energyRing = this.add.graphics();
    this.energyText = this.add.text(86, y, '', {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.big, color: THEME.colors.gold, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.endBtn = createButton(this, width - 150, y, i18n.t('endTurn'), () => this.onEndTurn(), {
      color: THEME.colors.primary, fontSize: THEME.fontSize.small,
    });

    this.drawText = this.add.text(30, 1252, '', {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
    }).setOrigin(0, 0.5);
    this.discardText = this.add.text(width - 30, 1252, '', {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
    }).setOrigin(1, 0.5);

    this.hint = this.add.text(width / 2, 960, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
    }).setOrigin(0.5);

    this.handLayer = this.add.container(0, 0);
  }

  // ---- Перерисовка ---------------------------------------------------------
  renderAll() {
    const s = this.combat.state;
    this.turnText.setText(i18n.t('turnN', { n: s.turn }));
    this.relicText.setText('✦ ' + s.player.relics.length);

    this.playerHp.set(s.player.hp, s.player.maxHp, s.player.block);
    this.playerStatuses.set(s.player.statuses);

    for (const v of this.enemyViews) {
      const e = v.enemy;
      const alive = e.hp > 0;
      v.sprite.setVisible(alive);
      v.name.setVisible(alive);
      v.intent.setVisible(alive);
      v.hp.g.setVisible(alive); v.hp.label.setVisible(alive); v.hp.shield.setVisible(alive);
      // Скрытый интерактив продолжает ловить клики (мина Phaser, CONVENTIONS §2):
      // по мёртвому врагу можно было бы «выбрать цель» вслепую.
      if (alive) v.sprite.setInteractive({ useHandCursor: true }); else v.sprite.disableInteractive();
      if (!alive) { v.statuses.set({}); continue; }
      v.hp.set(e.hp, e.maxHp, e.block);
      v.statuses.set(e.statuses);
      v.intent.setText(this.intentText(e.intent));
    }

    this.renderEnergy();
    this.drawText.setText(i18n.t('drawPile') + ': ' + s.draw.length);
    this.discardText.setText(i18n.t('discardPile') + ': ' + s.discard.length);
    this.renderHand();
  }

  intentText(intent) {
    if (!intent) return '';
    switch (intent.kind) {
      case 'attack':
      case 'attackDebuff':
        return intent.times > 1
          ? i18n.t('intentAttackTimes', { t: intent.times, v: intent.damage })
          : i18n.t('intentAttack', { v: intent.damage });
      case 'defend': return i18n.t('intentDefend');
      case 'buff': return i18n.t('intentBuff');
      case 'debuff': return i18n.t('intentDebuff');
      default: return i18n.t('intentSpecial');
    }
  }

  renderEnergy() {
    const s = this.combat.state;
    const y = 880;
    this.energyRing.clear();
    this.energyRing.fillStyle(THEME.colors.panelDark, 1);
    this.energyRing.fillCircle(86, y, 46);
    this.energyRing.lineStyle(4, THEME.colors.accent, 1);
    this.energyRing.strokeCircle(86, y, 46);
    this.energyText.setText(s.player.energy + '/' + (s.player.maxEnergy + (s.player.statuses.energyUp || 0)));
  }

  renderHand() {
    this.handLayer.removeAll(true);
    const s = this.combat.state;
    const { width } = this.scale;
    const n = s.hand.length;
    if (!n) return;

    // Веером карты не раскладываем: на 720 px повёрнутые карты перекрывают друг другу
    // текст, а описание в делибилдере читают каждый ход. Ряд со сжатием шага честнее.
    const scale = n > 6 ? 0.82 : 0.95;
    const cw = CARD_W * scale;
    const maxSpan = width - 40;
    const step = Math.min(cw + 8, n > 1 ? (maxSpan - cw) / (n - 1) : 0);
    const totalW = cw + step * (n - 1);
    const startX = (width - totalW) / 2 + cw / 2;

    s.hand.forEach((card, i) => {
      const def = this.combat.cardDef(card);
      const raised = this.selected === i;
      const v = createCardView(this, startX + step * i, HAND_Y - (raised ? 46 : 0), card.id, def, {
        scale, upgraded: card.upgraded,
      });
      v.setDim(!this.combat.canPlay(i));
      v.setInteractive({ useHandCursor: true });
      v.on('pointerup', () => this.onCardTap(i));
      this.handLayer.add(v);
    });
  }

  // ---- Ввод ----------------------------------------------------------------
  onCardTap(i) {
    if (this.busy || this.combat.state.over) return;
    const card = this.combat.state.hand[i];
    if (!card) return;
    const def = this.combat.cardDef(card);

    if (!this.combat.canPlay(i)) {
      toast(this, def.unplayable ? i18n.t('fx_unplayable') : i18n.t('noEnergy'));
      return;
    }
    Sounds.cardPick();

    const alive = this.combat.state.enemies.filter((e) => e.hp > 0);
    const needsTarget = def.target === 'enemy' && alive.length > 1;
    if (!needsTarget) { this.play(i, this.combat.state.enemies.findIndex((e) => e.hp > 0)); return; }

    // Второй тап по уже выбранной карте снимает выбор — иначе игрок, передумав, залипает
    // в режиме выбора цели и не понимает, как выйти.
    this.selected = this.selected === i ? -1 : i;
    this.hint.setText(this.selected >= 0 ? i18n.t('pickTarget') : '');
    this.renderHand();
  }

  onEnemyTap(idx) {
    if (this.busy || this.selected < 0) return;
    if (this.combat.state.enemies[idx].hp <= 0) return;
    this.play(this.selected, idx);
  }

  play(handIndex, targetIndex) {
    this.selected = -1;
    this.hint.setText('');
    const before = this.snapshotHp();
    if (!this.combat.playCard(handIndex, targetIndex)) return;
    Sounds.cardPlay();
    this.showEvents(this.combat.state.events, before);
    this.renderAll();
    Session.saveRun();
    this.checkOver();
  }

  onEndTurn() {
    if (this.busy || this.combat.state.over) return;
    this.busy = true;
    this.selected = -1;
    this.hint.setText('');
    const before = this.snapshotHp();
    this.combat.endTurn();
    this.showEvents(this.combat.state.events, before);
    this.renderAll();
    Session.saveRun();
    this.busy = false;
    this.checkOver();
  }

  snapshotHp() {
    return {
      player: this.combat.state.player.hp,
      enemies: this.combat.state.enemies.map((e) => e.hp),
    };
  }

  // Всплывающие числа рисуем по ЖУРНАЛУ движка, а не по разнице состояний: разница
  // склеивает три удара в одно число, и игрок не видит, что карта била трижды.
  showEvents(events, before) {
    let hurt = false;
    for (const ev of events) {
      const view = this.viewFor(ev.target);
      const x = view ? view.x : 420;
      const y = view ? view.y : 640;
      switch (ev.type) {
        case 'damage': {
          // Значок ПРЯМО на числе урона — тот же ▽/↓, что висит над целью/собой: игрок
          // должен увидеть момент, когда «Урон 6» на карте стало «-9», а не поверить на
          // слово тексту карты. Без этого «когда сработает полуторный урон» не видно вообще.
          const mark = ev.vulnHit ? ' ' + STATUS_SIGN.vuln : (ev.weakHit ? ' ' + STATUS_SIGN.weak : '');
          if (ev.hpLoss > 0) popNumber(this, x, y, '-' + ev.hpLoss + mark, THEME.colors.dangerText);
          else popNumber(this, x, y, '0', THEME.colors.infoText);
          if (ev.target === this.combat.state.player) hurt = true;
          Sounds.attack();
          // Подсказка ОДИН РАЗ ЗА ВСЮ ИГРУ, ровно в момент, когда наговор реально изменил
          // число — не текст в меню заранее (howto его не спасает, там же плюс ко всему
          // ещё и не читают, разработчик — не исключение). Раскладывается позже всплывающего
          // числа: одновременный текст в центре экрана и цифра над персонажем конкурируют
          // за внимание, отдельный кадр — уже нет.
          if ((ev.vulnHit || ev.weakHit) && !Progress.data.seenVulnTip) {
            Progress.put({ seenVulnTip: true });
            this.time.delayedCall(500, () => {
              toast(this, i18n.t(ev.vulnHit ? 'tip_vuln_hit' : 'tip_weak_hit'), { wrap: 560, delay: 3200 });
            });
          }
          break;
        }
        case 'block': Sounds.block(); break;
        case 'heal': popNumber(this, x, y, '+' + ev.value, THEME.colors.successText); Sounds.heal(); break;
        case 'poison': popNumber(this, x, y, '-' + ev.value, THEME.colors.poisonText); Sounds.poison(); break;
        case 'loseHp': popNumber(this, x, y, '-' + ev.value, THEME.colors.dangerText); break;
        case 'thorns': popNumber(this, x, y, '-' + ev.value, THEME.colors.accentText); break;
        case 'kill': Sounds.kill(); break;
        // Сгорел остаток брони в начале хода. Объясняем ОДИН раз за всю игру и только когда
        // сгорело заметно (≥5) — иначе на 1-2 остатка подсказка шумит. Тот же приём, что для
        // Уязвимости/Слабости: учим в момент срабатывания, а не текстом в меню, который не читают.
        case 'blockBurn':
          if (ev.value >= 5 && !Progress.data.seenBlockTip) {
            Progress.put({ seenBlockTip: true });
            this.time.delayedCall(500, () => toast(this, i18n.t('tip_block_burn'), { wrap: 560, delay: 3600 }));
          }
          break;
        default: break;
      }
      if (ev.type === 'damage' && ev.value >= 60) Progress.bump('maxHit', ev.value, 'max');
    }
    if (hurt) { Sounds.hurt(); this.cameras.main.shake(120, 0.006); }
  }

  viewFor(target) {
    if (!target) return null;
    if (target === this.combat.state.player) return { x: 420, y: 620 };
    const v = this.enemyViews.find((e) => e.enemy === target);
    return v ? { x: v.x, y: ENEMY_Y } : null;
  }

  // ---- Итог боя ------------------------------------------------------------
  checkOver() {
    if (!this.combat.state.over || this.dead) return;
    if (this.combat.state.result === 'win') { this.onWin(); return; }
    this.onLose();
  }

  onWin() {
    this.dead = true;
    Sounds.win();
    Progress.bump('combatsWon');
    if (Session.combatTier === 'elite') Progress.bump('elitesCleared');
    if (Session.combatTier === 'boss') Progress.bump('bossesKilled');
    if (this.combat.state.player.hp >= Session.hpAtCombatStart) Progress.bump('noHitWins');
    Progress.bump('maxDeck', this.run.state.deck.length, 'max');
    Progress.bump('maxRelics', this.run.state.relics.length, 'max');

    const tier = Session.combatTier;
    if (tier === 'boss') {
      Analytics.event(EVENTS.BOSS_KILLED, { boss: this.combat.state.enemies[0].defId });
    }
    const reward = Session.finishCombat(true);
    this.time.delayedCall(650, () => Input.goTo(this, 'Reward', { reward, tier }));
  }

  onLose() {
    this.dead = true;
    Sounds.lose();
    this.showDeathOverlay();
  }

  // «Второе дыхание» — вознаграждаемая реклама вместо конца похода. Кнопку рисуем
  // ТОЛЬКО если реклама реально предзагружена (Platform.ads.hasRewarded) и суточный
  // лимит не выбран: кнопка, которая ничего не делает, хуже её отсутствия.
  showDeathOverlay() {
    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setDepth(800);
    layer.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive());
    layer.add(heading(this, width / 2, height * 0.34, i18n.t('combatLose')));
    Input.openLayer(this, 'death');

    const finish = () => {
      Input.closeLayer(this, 'death');
      Session.finishCombat(false);
      Input.goTo(this, 'Result');
    };

    const canRevive = !this.revived && AdGate.canReward('secondWind');
    if (canRevive) {
      Ads.hasRewarded().then((has) => {
        if (!has || this.dead === false) { return; }
        // Число — из data/balance.js, не «на глаз» в тексте кнопки: игрок жаловался, что
        // не знает, сколько реально вернётся здоровья, пока не нажмёт.
        const healAmount = Math.max(1, Math.floor(this.combat.state.player.maxHp * BALANCE.SECOND_WIND_HP_PCT));
        const btn = createButton(this, width / 2, height * 0.5, i18n.t('fleeAd', { n: healAmount }), () => {
          AdGate.spendReward('secondWind');
          Analytics.event(EVENTS.AD_REWARD_SHOWN, { place: 'secondWind' });
          Ads.showRewarded({
            onRewarded: () => {
              this.revived = true;
              this.dead = false;
              const st = this.combat.state;
              st.over = false; st.result = null;
              st.player.hp = healAmount;
              st.player.block = 0;
              // Смерть всегда наступает СРЕДИ хода врагов (endTurn уже сбросил руку игрока
              // до их атак), поэтому голое «ожить» оставляло 0 карт и 0 Пыла — единственным
              // действием было тут же жать «Конец хода» и тут же огрести ещё раз, без единого
              // шанса защититься. Игрок специально указал на это: «второе дыхание, чтобы меня
              // просто убили». startPlayerTurn даёт настоящий ход — руку, Пыл, дозор, свежие
              // намерения врагов — как после обычной смены раунда.
              this.combat.startPlayerTurn();
              // Та же причина, что в RewardScene (4890384): onRewarded площадка зовёт ДО
              // onClose, сцена ещё на паузе от game:pause. renderAll()→renderHand() создаёт
              // новые кликабельные карты — на паузе это и раньше ломало клики. Ждём resume.
              const finishRevive = () => {
                layer.destroy();
                Input.closeLayer(this, 'death');
                this.renderAll();
                Session.saveRun();
              };
              if (this.sys.isActive()) finishRevive();
              else this.sys.events.once('resume', finishRevive);
            },
            onClose: (rewarded, opened) => { if (!rewarded && !opened) toast(this, i18n.t('noEnergy')); },
          });
        }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText, layer: 'death' });
        layer.add(btn);
      });
    }

    layer.add(createButton(this, width / 2, height * 0.62, i18n.t('toMenu'), finish, {
      color: THEME.colors.neutral, textColor: THEME.colors.text, layer: 'death',
    }));
  }

  update(time, delta) {
    AdGate.armTimer(delta / 1000);
  }
}
