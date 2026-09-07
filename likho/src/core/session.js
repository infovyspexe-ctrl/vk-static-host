// СЕССИЯ — связка «сохранённый прогресс ↔ текущий поход ↔ текущий бой».
//
// Зачем отдельный модуль: сцен девять, и каждая должна знать, где лежит поход. Если бы
// они передавали его друг другу параметрами, любой новый экран между ними рвал бы цепочку
// (а он появляется — реклама, оверлей, возврат в меню). Здесь одна точка правды.
//
// Второе назначение — сохранение посреди похода. Поход живёт 40–60 минут, и мысль «сейчас
// закрою вкладку, вернусь вечером» обязана работать: иначе игра теряет ровно тех игроков,
// на которых рассчитана. Поэтому снимок пишется на КАЖДОМ переходе (узел, конец боя,
// покупка), а не в конце похода.
import { createRun, restoreRun } from '../mechanics/deckrun/run.js';
import { createCombat } from '../mechanics/deckrun/combat.js';
import { CATALOG } from '../data/catalog.js';
import { ACTS } from '../data/acts.js';
import { BALANCE } from '../data/balance.js';
import { Progress } from '../meta/progress.js';
import { Analytics } from './analytics.js';
import { EVENTS } from '../data/analytics-events.js';

export const Session = {
  run: null,
  combat: null,
  combatTier: null,
  hpAtCombatStart: 0,

  // ---- Поход ---------------------------------------------------------------
  startRun(heroId) {
    const meta = Progress.runMeta();
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    this.run = createRun({
      catalog: CATALOG, acts: ACTS, hero: heroId, seed, balance: BALANCE,
      meta: { bonusHp: meta.bonusHp, bonusGold: meta.bonusGold, extraCardChoice: meta.extraCardChoice },
    });
    // «Отчий оберег» с Алтаря выдаётся из ГСЧ забега, а не выбирается заранее: так он
    // не повторяется из похода в поход и остаётся частью расклада, а не константой.
    if (meta.altarRelic) this.run.addRelic(this.run.rollRelic('common'));
    this.combat = null;
    Progress.bump('runsStarted');
    Analytics.event(EVENTS.GAME_START);
    Analytics.event(EVENTS.RUN_START, { hero: heroId });
    this.saveRun();
    return this.run;
  },

  hasSavedRun() {
    return !!(Progress.data.run && !Progress.data.run.over);
  },

  resumeRun() {
    const snap = Progress.data.run;
    if (!snap) return null;
    this.run = restoreRun({ catalog: CATALOG, acts: ACTS, balance: BALANCE, snap });
    const cs = Progress.data.combat;
    if (cs && this.run.state.pending && this.run.state.pending.kind === 'combat') {
      this.combat = this.buildCombat(this.run.state.pending);
      this.combat.restore(cs);
      this.combatTier = this.run.state.pending.tier;
      this.hpAtCombatStart = cs.hpAtStart ?? this.run.state.hp;
    }
    return this.run;
  },

  saveRun() {
    if (!this.run) return;
    Progress.put({
      run: this.run.snapshot(),
      combat: this.combat && !this.combat.state.over
        ? { ...this.combat.snapshot(), hpAtStart: this.hpAtCombatStart }
        : null,
    });
  },

  endRun() {
    this.run = null;
    this.combat = null;
    Progress.put({ run: null, combat: null });
  },

  // ---- Бой -----------------------------------------------------------------
  buildCombat(pending) {
    return createCombat({
      catalog: CATALOG,
      player: {
        hp: this.run.state.hp,
        maxHp: this.run.state.maxHp,
        maxEnergy: BALANCE.MAX_ENERGY,
        handSize: BALANCE.HAND_SIZE,
        relics: this.run.state.relics,
      },
      enemies: pending.enemies,
      deck: this.run.state.deck,
      seed: (this.run.state.seed + this.run.state.stats.floors * 7717) >>> 0,
    });
  },

  startCombat(pending) {
    this.combat = this.buildCombat(pending);
    this.combatTier = pending.tier;
    this.hpAtCombatStart = this.run.state.hp;
    this.combat.start();
    this.saveRun();
    return this.combat;
  },

  // Здоровье переносится из боя в поход, статусы — нет: наговоры живут один бой.
  finishCombat(win) {
    const hp = this.combat ? this.combat.state.player.hp : this.run.state.hp;
    const reward = this.run.finishCombat(win, hp, this.combatTier);
    this.combat = null;
    this.saveRun();
    return reward;
  },
};
