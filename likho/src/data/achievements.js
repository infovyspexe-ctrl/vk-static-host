// ЗАРУБКИ (достижения). Условие — это ПАРА «имя счётчика + порог», а не функция.
// Приём взят из games/pizza-mafia: таблица остаётся чистыми данными по конвенциям,
// а тест сверяет, что каждый счётчик РЕАЛЬНО существует в progress.stats. Опечатка в
// имени иначе молча делает зарубку невыдаваемой — сравнение с undefined даёт false.
export const ACHIEVEMENTS = [
  { id: 'first_blood', stat: 'combatsWon', need: 1, memory: 10 },
  { id: 'boss1', stat: 'bossesKilled', need: 1, memory: 25 },
  { id: 'boss2', stat: 'bossesKilled', need: 2, memory: 40 },
  { id: 'boss3', stat: 'bossesKilled', need: 3, memory: 80 },
  { id: 'elite5', stat: 'elitesCleared', need: 5, memory: 30 },
  { id: 'deck30', stat: 'maxDeck', need: 30, memory: 25 },
  { id: 'relics10', stat: 'maxRelics', need: 10, memory: 35 },
  { id: 'nohit', stat: 'noHitWins', need: 1, memory: 20 },
  { id: 'bigHit', stat: 'maxHit', need: 60, memory: 25 },
  { id: 'rich', stat: 'maxGold', need: 400, memory: 20 },
  { id: 'runs10', stat: 'runsStarted', need: 10, memory: 30 },
  { id: 'allHeroes', stat: 'heroesUnlocked', need: 3, memory: 50 },
];
