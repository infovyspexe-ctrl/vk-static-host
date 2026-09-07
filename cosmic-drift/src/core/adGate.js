// ПОЛИТИКА ПОКАЗОВ РЕКЛАМЫ. Одно место на всю игру: сцены только спрашивают «можно?».
//
// Модуль замкнутый: не знает ни про Phaser, ни про площадку, ни про сцены. Сегодняшняя дата
// приходит СТРОКОЙ 'YYYY-MM-DD' снаружи — так тесты детерминированы и не зависят от часового
// пояса (приём взят из games/pizza-mafia/src/meta/daily.js).
//
// Состояние живёт в meta сейва: init() принимает прочитанное, state() отдаёт на запись.
import { REWARD_LIMITS, INTERSTITIAL_ARM_SEC, INTERSTITIAL_MIN_RUNS } from '../data/ads.js';

let _adDay = '';        // дата текущего бакета
let _maxSeenDay = '';   // самая поздняя виденная дата — защита от перевода часов назад
let _adCounts = {};     // { ключ: сколько показов истрачено сегодня }
let _runs = 0;          // сколько партий игрок ЗАВЕРШИЛ за всё время
let _armSec = 0;        // накопленное игровое время до взвода
let _armed = false;
let _onChange = null;   // «состояние изменилось, сохрани» — сохранением занимается вызывающий

export const AdGate = {
  // state — объект из сейва (может быть пустым или битым), today — 'YYYY-MM-DD'.
  // onChange — колбэк «запиши state() в сейв». Нужен потому, что суточные лимиты обязаны
  // переживать ПЕРЕЗАГРУЗКУ СТРАНИЦЫ: без него потраченная попытка сохранялась только на
  // конце партии, и F5 посреди забега возвращал игроку свежий бакет наград.
  // Сам модуль про сохранения не знает — он замкнутый, площадка и Save остаются снаружи.
  init({ state = {}, today = '', onChange = null } = {}) {
    _onChange = typeof onChange === 'function' ? onChange : null;
    const s = (state && typeof state === 'object') ? state : {};
    _runs = Number.isFinite(s.runs) ? s.runs : 0;
    _adCounts = (s.adCounts && typeof s.adCounts === 'object') ? { ...s.adCounts } : {};
    _adDay = typeof s.adDay === 'string' ? s.adDay : '';
    _maxSeenDay = typeof s.maxSeenDay === 'string' ? s.maxSeenDay : _adDay;
    _armSec = 0;
    _armed = false;

    if (!today) return;
    // Бакет обновляем, только если дата ДВИНУЛАСЬ ВПЕРЁД. Иначе перевод системных часов на
    // вчера выдавал бы свежую пачку показов каждый раз.
    if (today > _maxSeenDay) {
      _maxSeenDay = today;
      _adDay = today;
      _adCounts = {};
    } else if (!_adDay) {
      _adDay = _maxSeenDay || today;
    }
  },

  // Копит игровое время. Взвод != показ: показывает сцена, и только в логической паузе.
  armTimer(dt) {
    if (_armed) return;
    const step = (typeof dt === 'number' && isFinite(dt) && dt > 0) ? dt : 0;
    _armSec += step;
    if (_armSec >= INTERSTITIAL_ARM_SEC) _armed = true;
  },

  isArmed() { return _armed && _runs >= INTERSTITIAL_MIN_RUNS; },

  // Вызывать ПОСЛЕ показа: сбрасываем и флаг, и накопленное время.
  disarm() { _armed = false; _armSec = 0; },

  noteRunFinished() { _runs += 1; this._flush(); },

  canReward(key) {
    const limit = REWARD_LIMITS[key];
    if (!limit) return false; // незнакомый ключ = опечатка, а не безлимит
    return (_adCounts[key] || 0) < limit;
  },

  spendReward(key) {
    if (!REWARD_LIMITS[key]) return;
    _adCounts[key] = (_adCounts[key] || 0) + 1;
    this._flush();
  },

  state() {
    return { adDay: _adDay, maxSeenDay: _maxSeenDay, adCounts: { ..._adCounts }, runs: _runs };
  },

  // Сообщить наружу, что состояние пора записать. Ошибка в чужом колбэке не должна
  // ронять показ рекламы, поэтому глушим её здесь.
  _flush() {
    if (!_onChange) return;
    try { _onChange(this.state()); } catch (e) { console.warn('[adGate] onChange упал', e); }
  }
};
