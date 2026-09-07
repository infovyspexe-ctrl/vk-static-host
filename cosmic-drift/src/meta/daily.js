// ЕЖЕДНЕВНЫЙ КОНВЕРТ ОТ ДОНА: серия заходов по дням.
//
// Зачем вообще: до этого у игры не было НИ ОДНОЙ причины вернуться завтра. Закрыл вкладку —
// и всё. Растущая по серии награда — самый дешёвый и самый проверенный способ вернуть
// игрока на второй день, а второй день решает судьбу игры на площадке.
//
// Модуль чистый: «сегодня» приходит строкой снаружи, поэтому тесты не зависят от системных
// часов, а сцена — от часового пояса игрока. Ни Phaser, ни i18n здесь нет.
//
// Серверного времени у нас нет, дата локальная. Поэтому храним maxSeenDate: если игрок
// отвёл часы назад, конверт не выдаём и серию НЕ трогаем. От упорного мошенничества это не
// защищает (перевод часов вперёд на день всё ещё «работает»), но убирает бесплатное
// фермерство наград одним кликом, и стоит десяток строк.
import { DAILY_BONUS } from '../data/balance.js';

// 'YYYY-MM-DD' по ЛОКАЛЬНОЙ дате игрока. Не UTC: иначе у половины часовых поясов «день
// конверта» не совпадёт с их календарём и серия будет рваться на ровном месте.
export function todayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Предыдущий календарный день для ключа. Считаем через Date, а не арифметикой над строкой:
// так границы месяца, года и високосного февраля обрабатываются сами.
function prevKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return todayKey(dt);
}

// Что с конвертом сегодня. Ничего не мутирует — годится и для показа, и для проверки.
export function dailyState(daily, todayStr) {
  const tampered = !!daily.maxSeenDate && todayStr < daily.maxSeenDate;
  if (tampered) return { available: false, nextStreak: daily.streak, reward: 0, tampered: true };
  if (daily.lastBonusDate === todayStr) {
    return { available: false, nextStreak: daily.streak, reward: 0, tampered: false };
  }
  const continues = daily.lastBonusDate === prevKey(todayStr);
  const nextStreak = continues ? daily.streak + 1 : 1;
  const reward = DAILY_BONUS[(nextStreak - 1) % DAILY_BONUS.length];
  return { available: true, nextStreak, reward, tampered: false };
}

// Забрать конверт. МУТИРУЕТ daily. null — забирать нечего (уже брал сегодня или часы назад).
export function claimDaily(daily, todayStr) {
  const st = dailyState(daily, todayStr);
  if (!st.available) return null;
  daily.streak = st.nextStreak;
  daily.lastBonusDate = todayStr;
  if (!daily.maxSeenDate || todayStr > daily.maxSeenDate) daily.maxSeenDate = todayStr;
  return { reward: st.reward, streak: daily.streak };
}
