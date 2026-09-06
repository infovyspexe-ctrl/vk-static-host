// Недельный трек: ISO-неделя + определение впервые пройденных этапов (25/50/75/100%).
// Чистая арифметика без Phaser (как mechanics/carwash/carwash.js) — сцена только вызывает
// и решает, что показать/сохранить. Тестируется напрямую: core/weekly.test.js.

// ISO 8601: неделя начинается с понедельника, неделя №1 — та, что содержит первый четверг
// года (значит 29-31 декабря иногда относятся к W01 СЛЕДУЮЩЕГО года, а конец года иногда
// доходит до W53 — оба случая проверены тестом на конкретных датах).
export function getIsoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // воскресенье=0 -> 7, чтобы понедельник был днём 1
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // четверг этой недели
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

// Индексы этапов, впервые пройденных ПРИ ТЕКУЩЕМ weeklyWashed и ещё не отмеченных в claimed
// (bool[], тот же порядок, что milestones). Не мутирует claimed — решает вызывающий.
export function newlyReachedMilestones(weeklyWashed, goal, milestones, claimed) {
  const reached = [];
  milestones.forEach((m, i) => {
    const threshold = Math.ceil(goal * m.pct / 100);
    if (weeklyWashed >= threshold && !claimed[i]) reached.push(i);
  });
  return reached;
}
