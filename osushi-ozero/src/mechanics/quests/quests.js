// ЗАДАНИЯ (замкнутый модуль): одно активное задание, ротация по кругу
// с паузой после выполнения. Про игру не знает: конфиг и колбэки снаружи.
//
// cfg: { pauseSeconds, types: [...] } (см. data/balance.js QUESTS)
// api: {
//   zoneLiters(): литры/метр текущей зоны (для скейла целей),
//   zoneMult(): множитель зоны (для награды жетонами),
//   onReward({ tokens, gems }), onDone(questId)
// }
// События от игры: pouredLiters(l), bucketNoBite(), streakReset(), chestCollected().

export class QuestSystem {
  constructor(cfg, api, rnd = Math.random) {
    this.cfg = cfg;
    this.api = api;
    this.rnd = rnd;
    this.quest = null;     // { type, target, progress, timeLeft, reward: {tokens?, gems?} }
    this.pauseT = 1.5;     // первая выдача почти сразу
    this.typeIdx = Math.floor(rnd() * cfg.types.length);
  }

  next() {
    const t = this.cfg.types[this.typeIdx % this.cfg.types.length];
    this.typeIdx++;
    if (t.id === 'pour') {
      const target = Math.round(this.api.zoneLiters() * t.zoneLitersMult / 10) * 10;
      this.quest = {
        type: 'pour', target, progress: 0, timeLeft: t.timeLimit,
        reward: { tokens: Math.round(target * t.rewardMult * this.api.zoneMult()) }
      };
    } else if (t.id === 'buckets') {
      this.quest = { type: 'buckets', target: t.count, progress: 0, reward: { gems: t.gems } };
    } else {
      // У «собери сокровище» ТОЖЕ есть таймаут, хотя игрок ни в чём не виноват.
      // Причина: сундуки расставлены по ГЛУБИНЕ, а время на метр растёт от зоны
      // к зоне в 130 раз. В 1-й зоне между сундуками ~1,3 минуты, в 7-й — ~42.
      // Задание одно активное, так что без таймаута очередь заданий вставала бы
      // на сорок минут, и один из трёх циклов наград умирал именно там, где
      // игроку скучнее всего. По истечении задание перевыдаётся (ротация идёт дальше).
      this.quest = {
        type: 'chest', target: t.count, progress: 0,
        timeLeft: t.timeLimit || null,
        reward: { gems: t.gems }
      };
    }
  }

  update(dt) {
    if (!this.quest) {
      this.pauseT -= dt;
      if (this.pauseT <= 0) this.next();
      return;
    }
    // Таймаут есть у любого задания, где он задан в конфиге (pour, chest).
    if (this.quest.timeLeft !== null && this.quest.timeLeft !== undefined) {
      this.quest.timeLeft -= dt;
      if (this.quest.timeLeft <= 0) {
        // не успел — цель перевыдаётся заново после паузы
        this.quest = null;
        this.pauseT = this.cfg.pauseSeconds * 0.4;
      }
    }
  }

  _progress(kind, amount) {
    const q = this.quest;
    if (!q || q.type !== kind) return;
    q.progress += amount;
    if (q.progress >= q.target - 1e-9) {
      this.api.onReward(q.reward);
      this.api.onDone(q.type);
      this.quest = null;
      this.pauseT = this.cfg.pauseSeconds;
    }
  }

  pouredLiters(l) { this._progress('pour', l); }
  bucketNoBite() { this._progress('buckets', 1); }
  chestCollected() { this._progress('chest', 1); }

  // Укус акулы сбрасывает серию «вёдра без укуса».
  streakReset() {
    if (this.quest && this.quest.type === 'buckets') this.quest.progress = 0;
  }
}
