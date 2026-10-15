// ИКОНКИ, НАРИСОВАННЫЕ КОДОМ.
//
// Почему не эмодзи: они НЕ рендерятся предсказуемо. Живой прогон 2026-08-09 показал в HUD
// квадраты-тофу вместо монеты и часов, а полоса этапов выводилась случайными глифами
// шрифта-фолбэка. На Android, iOS и Windows наборы эмодзи разные, часть символов
// отсутствует вовсе — подбором эмодзи это не лечится, только отказом от них.
//
// Модуль знает только про THEME и INGREDIENTS. Про сцены, кампанию и правила игры — нет.
// Каждая функция возвращает объект Phaser, который вызывающий сам кладёт в контейнер и
// сам уничтожает.
//
// Размер везде задаётся как ДИАМЕТР описанного круга (size), чтобы иконки одного size
// смотрелись одинаково крупными независимо от формы.
import { THEME } from '../ui/theme.js';
import { INGREDIENTS } from '../data/balance.js';

// ── Монета ────────────────────────────────────────────────────────────────
// Круг сырного цвета с тёмным ободом и внутренним кольцом — читается как монета
// даже при size 18 px.
export function drawCoinIcon(scene, x, y, size) {
  const r = size / 2;
  const g = scene.add.graphics();
  g.fillStyle(THEME.colors.accent, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.16), 0x8a6d0b, 1);
  g.strokeCircle(x, y, r * 0.92);
  g.strokeCircle(x, y, r * 0.55);
  return g;
}

// ── Часы ──────────────────────────────────────────────────────────────────
export function drawClockIcon(scene, x, y, size) {
  const r = size / 2;
  const g = scene.add.graphics();
  const line = Math.max(1, r * 0.16);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(x, y, r);
  g.lineStyle(line, 0x3a2418, 1);
  g.strokeCircle(x, y, r * 0.94);
  // Стрелки: короткая вверх, длинная вправо.
  g.lineStyle(line, 0x3a2418, 1);
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x, y - r * 0.55);
  g.strokePath();
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x + r * 0.42, y);
  g.strokePath();
  return g;
}

// ── Звезда оценки дня ─────────────────────────────────────────────────────
// filled=false рисует только контур («не заработанная» звезда).
export function drawStar(scene, x, y, size, filled) {
  const R = size / 2;
  const rIn = R * 0.45;
  const g = scene.add.graphics();
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? R : rIn;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  if (filled) {
    g.fillStyle(THEME.colors.accent, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
    g.closePath();
    g.fillPath();
  }
  g.lineStyle(Math.max(2, R * 0.14), filled ? 0x8a6d0b : THEME.colors.neutral, 1);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
  g.closePath();
  g.strokePath();
  return g;
}

// ── Стрелка вверх ─────────────────────────────────────────────────────────
// «Смотри наверх, в очередь» на пустой рабочей зоне. Символ ⬆ здесь выводился тофу.
export function drawArrowUp(scene, x, y, size, color) {
  const g = scene.add.graphics();
  const r = size / 2;
  g.fillStyle(color ?? THEME.colors.accent, 1);
  g.fillTriangle(x, y - r, x - r * 0.8, y + r * 0.1, x + r * 0.8, y + r * 0.1);
  g.fillRect(x - r * 0.28, y, r * 0.56, r * 0.9);
  return g;
}

// ── Иконка ингредиента ────────────────────────────────────────────────────
// База — круг цвета ингредиента из data/balance.js, поверх — отличительная метка,
// чтобы два похожих по цвету ингредиента (моцарелла и сыр, ветчина и креветка)
// различались без подписи.
export function drawIngredientIcon(scene, x, y, size, ingredientId) {
  // Если ассет загружен — берём его. Рисованный вариант ниже остаётся ЗАПАСНЫМ путём:
  // отсутствие файла не должно ронять игру, и на нём же игра работала до появления арта.
  const key = 'ing_' + ingredientId;
  if (scene.textures && scene.textures.exists(key)) {
    return scene.add.image(x, y, key).setDisplaySize(size, size);
  }

  const ing = INGREDIENTS[ingredientId];
  const r = size / 2;
  const g = scene.add.graphics();
  if (!ing) return g;                       // неизвестный id — пустая иконка, не падаем

  const dark = 0x2c1810;
  g.fillStyle(ing.color, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.14), dark, 0.45);
  g.strokeCircle(x, y, r);

  const dot = (dx, dy, rr, color, alpha = 1) => {
    g.fillStyle(color, alpha);
    g.fillCircle(x + dx * r, y + dy * r, rr * r);
  };

  switch (ingredientId) {
    case 'tomatoSauce':                     // капли соуса
      dot(-0.25, -0.2, 0.16, 0xffffff, 0.35);
      dot(0.28, 0.18, 0.12, 0xffffff, 0.25);
      break;
    case 'bbqSauce':                        // тёмный соус, светлый развод
      dot(0, -0.1, 0.3, 0xffffff, 0.18);
      break;
    case 'cheese':                          // дырки в сыре
      dot(-0.28, -0.15, 0.15, dark, 0.5);
      dot(0.22, 0.05, 0.12, dark, 0.5);
      dot(-0.05, 0.32, 0.1, dark, 0.5);
      break;
    case 'mozzarella':                      // мягкий шар с бликом
      dot(-0.22, -0.25, 0.18, 0xffffff, 0.85);
      break;
    case 'pepperoni':                       // крапинки жира
      dot(-0.22, -0.18, 0.13, 0x7b1f14, 1);
      dot(0.24, -0.05, 0.11, 0x7b1f14, 1);
      dot(0.02, 0.28, 0.12, 0x7b1f14, 1);
      break;
    case 'mushroom': {                      // шляпка и ножка
      g.fillStyle(0xf3e3cd, 1);
      g.fillRect(x - r * 0.16, y - r * 0.05, r * 0.32, r * 0.62);
      g.fillStyle(0x8a6a4a, 1);
      g.slice(x, y, r * 0.72, Math.PI, 0, false);
      g.fillPath();
      break;
    }
    case 'olive':                           // кольцо оливки
      g.fillStyle(0xf6d365, 1);
      g.fillCircle(x, y, r * 0.34);
      break;
    case 'pepper':                          // полоски перца
      g.fillStyle(0x1e8449, 1);
      g.fillRect(x - r * 0.55, y - r * 0.12, r * 1.1, r * 0.16);
      g.fillRect(x - r * 0.4, y + r * 0.22, r * 0.8, r * 0.14);
      break;
    case 'ham':                             // прожилки ветчины
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(x - r * 0.5, y - r * 0.28, r * 1.0, r * 0.12);
      g.fillRect(x - r * 0.35, y + r * 0.16, r * 0.7, r * 0.1);
      break;
    case 'pineapple':                       // сетка ананаса
      g.lineStyle(Math.max(1, r * 0.12), 0xb9860b, 0.9);
      g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.6); g.lineTo(x + r * 0.6, y + r * 0.6); g.strokePath();
      g.beginPath(); g.moveTo(x + r * 0.6, y - r * 0.6); g.lineTo(x - r * 0.6, y + r * 0.6); g.strokePath();
      break;
    case 'shrimp':                          // хвост креветки дугой
      g.lineStyle(Math.max(2, r * 0.26), 0xd9534f, 1);
      g.slice(x, y, r * 0.55, Math.PI * 0.15, Math.PI * 1.25, false);
      g.strokePath();
      break;
    default:
      break;
  }
  return g;
}

// ── Иконки этапов сборки ──────────────────────────────────────────────────
// stageId: dough | sauce | cheese | toppings | oven
// state:   past (пройден) | current (сейчас) | future (впереди)
export function drawStageIcon(scene, x, y, size, stageId, state) {
  const cont = scene.add.container(x, y);
  const r = size / 2;
  const g = scene.add.graphics();
  const alpha = state === 'future' ? 0.35 : 1;

  // Подложка: у текущего этапа — заметное кольцо акцентом, чтобы взгляд цеплялся.
  if (state === 'current') {
    g.fillStyle(THEME.colors.accent, 0.22);
    g.fillCircle(0, 0, r * 1.35);
    g.lineStyle(Math.max(2, r * 0.18), THEME.colors.accent, 1);
    g.strokeCircle(0, 0, r * 1.35);
  }

  switch (stageId) {
    case 'dough':
      g.fillStyle(THEME.colors.dough, alpha);
      g.fillCircle(0, 0, r);
      g.lineStyle(Math.max(1, r * 0.16), 0xc9a36a, alpha);
      g.strokeCircle(0, 0, r);
      break;
    case 'sauce':
      g.fillStyle(INGREDIENTS.tomatoSauce.color, alpha);
      g.fillCircle(0, 0, r);
      break;
    case 'cheese':
      g.fillStyle(INGREDIENTS.cheese.color, alpha);
      g.fillCircle(0, 0, r);
      g.fillStyle(0x2c1810, alpha * 0.45);
      g.fillCircle(-r * 0.3, -r * 0.15, r * 0.16);
      g.fillCircle(r * 0.22, r * 0.12, r * 0.13);
      break;
    case 'toppings':
      g.fillStyle(THEME.colors.dough, alpha * 0.7);
      g.fillCircle(0, 0, r);
      g.fillStyle(INGREDIENTS.pepperoni.color, alpha);
      g.fillCircle(-r * 0.32, -r * 0.2, r * 0.24);
      g.fillCircle(r * 0.28, -r * 0.05, r * 0.2);
      g.fillCircle(-r * 0.05, r * 0.34, r * 0.22);
      break;
    case 'oven':                            // арка печи с устьем
      g.fillStyle(THEME.colors.panelLight, alpha);
      g.slice(0, r * 0.35, r, Math.PI, 0, false);
      g.fillPath();
      g.fillRect(-r, r * 0.15, r * 2, r * 0.35);
      g.fillStyle(THEME.colors.danger, alpha);
      g.slice(0, r * 0.35, r * 0.55, Math.PI, 0, false);
      g.fillPath();
      break;
    default:
      break;
  }
  cont.add(g);

  // Пройденный этап помечаем галочкой — так видно, сколько уже сделано.
  if (state === 'past') {
    const tick = scene.add.graphics();
    tick.lineStyle(Math.max(2, r * 0.3), THEME.colors.success, 1);
    tick.beginPath();
    tick.moveTo(-r * 0.45, r * 0.05);
    tick.lineTo(-r * 0.1, r * 0.45);
    tick.lineTo(r * 0.55, -r * 0.45);
    tick.strokePath();
    cont.add(tick);
  }
  return cont;
}
