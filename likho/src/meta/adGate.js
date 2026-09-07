// ПОЛИТИКА ПОКАЗОВ РЕКЛАМЫ. Одно место на всю игру: сцены только спрашивают «можно?».
//
// Зачем в library: написана дважды (cosmic-drift, likho), модуль замкнут и покрыт тестами —
// по «правилу двух» дальше копии начнут расходиться, а цена расхождения тут — деньги и
// замечания модерации.
//
// Держит две РАЗНЫЕ политики, которые часто путают:
//   1) ВЗВОД интерстишла игровым временем (`armTimer`) — отдельно от ПОКАЗА. Показывает
//      сцена и только в логической паузе: голый показ по таймеру Яндекс прямо называет
//      антипримером (YANDEX-SDK.md).
//   2) СУТОЧНЫЕ БАКЕТЫ вознаграждаемой (`canReward`/`spendReward`) по ключам точек.
//      Незнакомый ключ → false: опечатка в сцене не должна давать безлимит.
//
// Замкнутый: ни Phaser, ни площадки, ни Save. Сегодняшняя дата приходит СТРОКОЙ
// 'YYYY-MM-DD' снаружи — тесты детерминированы и не зависят от часового пояса.
export function createAdGate(config = {}) {
  const REWARD_LIMITS = config.rewardLimits || {};
  const ARM_SEC = config.armSec ?? 150;
  const MIN_RUNS = config.minRuns ?? 1;

  let _adDay = '';
  let _maxSeenDay = '';
  let _adCounts = {};
  let _runs = 0;
  let _armSec = 0;
  let _armed = false;
  let _onChange = null;

  const gate = {
    // state — объект из сейва (может быть пустым или битым), today — 'YYYY-MM-DD'.
    // onChange — «запиши state() в сейв». Нужен потому, что суточные лимиты обязаны
    // переживать ПЕРЕЗАГРУЗКУ: без него потраченная попытка сохранялась только в конце
    // партии, и F5 возвращал игроку свежий бакет наград (найдено на cosmic-drift).
    init({ state = {}, today = '', onChange = null } = {}) {
      _onChange = typeof onChange === 'function' ? onChange : null;
      const s = (state && typeof state === 'object') ? state : {};
      _runs = Number.isFinite(s.runs) ? s.runs : 0;
      _adCounts = (s.adCounts && typeof s.adCounts === 'object') ? { ...s.adCounts } : {};
      _adDay = typeof s.adDay === 'string' ? s.adDay : '';
      _maxSeenDay = typeof s.maxSeenDay === 'string' ? s.maxSeenDay : _adDay;
      _armSec = 0;
      _armed = false;

      if (!today) return gate;
      // Бакет обновляем, только если дата ДВИНУЛАСЬ ВПЕРЁД. Иначе перевод системных часов
      // на вчера выдавал бы свежую пачку показов каждый раз.
      if (today > _maxSeenDay) {
        _maxSeenDay = today;
        _adDay = today;
        _adCounts = {};
      } else if (!_adDay) {
        _adDay = _maxSeenDay || today;
      }
      return gate;
    },

    // Копит игровое время. Взвод != показ.
    armTimer(dt) {
      if (_armed) return;
      const step = (typeof dt === 'number' && isFinite(dt) && dt > 0) ? dt : 0;
      _armSec += step;
      if (_armSec >= ARM_SEC) _armed = true;
    },

    isArmed() { return _armed && _runs >= MIN_RUNS; },

    // Вызывать ПОСЛЕ показа: сбрасываем и флаг, и накопленное время.
    disarm() { _armed = false; _armSec = 0; },

    noteRunFinished() { _runs += 1; gate._flush(); },
    runsFinished() { return _runs; },

    canReward(key) {
      const limit = REWARD_LIMITS[key];
      if (!limit) return false;
      return (_adCounts[key] || 0) < limit;
    },

    rewardLeft(key) {
      const limit = REWARD_LIMITS[key];
      if (!limit) return 0;
      return Math.max(0, limit - (_adCounts[key] || 0));
    },

    spendReward(key) {
      if (!REWARD_LIMITS[key]) return;
      _adCounts[key] = (_adCounts[key] || 0) + 1;
      gate._flush();
    },

    state() {
      return { adDay: _adDay, maxSeenDay: _maxSeenDay, adCounts: { ..._adCounts }, runs: _runs };
    },

    // Ошибка в чужом колбэке не должна ронять показ рекламы — глушим её здесь.
    _flush() {
      if (!_onChange) return;
      try { _onChange(gate.state()); } catch (e) { console.warn('[adGate] onChange упал', e); }
    },
  };

  return gate;
}
