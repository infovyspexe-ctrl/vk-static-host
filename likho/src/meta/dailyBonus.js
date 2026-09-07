// ЕЖЕДНЕВНЫЙ БОНУС СО СТРИКОМ — механика возврата «на второй день» без бэкенда.
//
// Зачем это в library: написана трижды независимо (pizza-mafia, cosmic-drift, likho),
// каждый раз одинаково. Второй день игрока решает судьбу игры на площадке (RETENTION.md),
// поэтому механика нужна каждой игре, и расхождение копий дороже абстракции.
//
// ЗАМКНУТЫЙ МОДУЛЬ: «сегодня» приходит СТРОКОЙ снаружи, таблица наград — конфигом.
// Ни Phaser, ни i18n, ни сохранений здесь нет. Благодаря этому тесты детерминированы,
// а сцена не зависит от часового пояса игрока.
//
// Серверного времени у нас нет, дата локальная. Поэтому храним maxSeenDate: если игрок
// отвёл часы назад, бонус не выдаём и серию НЕ рвём. От упорного мошенничества это не
// защищает (перевод часов вперёд всё ещё «работает»), но убирает бесплатное фермерство
// одним кликом и стоит десяток строк.
//
// Формат состояния (лежит в сейве игры): { lastBonusDate, streak, maxSeenDate }.

// 'YYYY-MM-DD' по ЛОКАЛЬНОЙ дате игрока. Не UTC: иначе у половины часовых поясов «день
// бонуса» не совпадёт с их календарём и серия будет рваться на ровном месте.
export function todayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Предыдущий календарный день. Считаем через Date, а не арифметикой над строкой:
// так границы месяца, года и високосного февраля обрабатываются сами.
export function prevKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return todayKey(dt);
}

// Что с бонусом сегодня. Ничего не мутирует — годится и для показа, и для проверки.
// rewards — массив наград по дням серии, циклится.
export function dailyState(daily, todayStr, rewards) {
  const d = daily || {};
  const streak = d.streak || 0;
  const tampered = !!d.maxSeenDate && todayStr < d.maxSeenDate;
  if (tampered) return { available: false, nextStreak: streak, reward: 0, tampered: true };
  if (d.lastBonusDate === todayStr) {
    return { available: false, nextStreak: streak, reward: 0, tampered: false };
  }
  const continues = d.lastBonusDate === prevKey(todayStr);
  const nextStreak = continues ? streak + 1 : 1;
  const reward = rewards[(nextStreak - 1) % rewards.length];
  return { available: true, nextStreak, reward, tampered: false };
}

// Забрать бонус. МУТИРУЕТ daily. null — забирать нечего (уже брал сегодня или часы назад).
export function claimDaily(daily, todayStr, rewards) {
  const st = dailyState(daily, todayStr, rewards);
  if (!st.available) return null;
  daily.streak = st.nextStreak;
  daily.lastBonusDate = todayStr;
  if (!daily.maxSeenDate || todayStr > daily.maxSeenDate) daily.maxSeenDate = todayStr;
  return { reward: st.reward, streak: daily.streak };
}
