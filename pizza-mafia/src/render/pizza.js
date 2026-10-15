// ОТРИСОВКА ПИЦЦЫ И ПЕЧИ.
//
// Вынесено из GameScene: сцена уже была 838 строк и совмещала состояние дня, отрисовку,
// ввод, рекламу и сохранение. Здесь только «как это выглядит», без знания правил игры.
//
// drawPizzaInto пишет в ПЕРЕДАННЫЙ graphics и ничего не создаёт — так сцена может
// перерисовывать пиццу каждый кадр, не плодя объекты.
import { THEME } from '../ui/theme.js';
import { INGREDIENTS, OVEN } from '../data/balance.js';
import { OvenResult } from '../mechanics/kitchen/kitchen.js';

// Дуга кольца прогресса. Phaser в Graphics не даёт arc с обводкой напрямую,
// поэтому набираем её отрезками.
function strokeArc(g, x, y, r, from, to, steps = 48) {
  if (to <= from) return;
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

// snap — результат pizzaSnapshot(); ovenSt — результат ovenState() или null.
export function drawPizzaInto(g, snap, { x, y, r, ovenSt, cookSeconds, windowSeconds }) {
  g.clear();
  if (!snap) return;

  // Тесто.
  g.fillStyle(THEME.colors.dough, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(4, 0xc9a36a, 1);
  g.strokeCircle(x, y, r);

  if (snap.sauce) {
    g.fillStyle(INGREDIENTS[snap.sauce].color, 0.9);
    g.fillCircle(x, y, r * 0.82);
  }
  if (snap.cheese) {
    g.fillStyle(INGREDIENTS[snap.cheese].color, 0.55);
    g.fillCircle(x, y, r * 0.78);
  }

  // Топпинги — россыпь точек по кольцу, свой узор на каждый вид.
  snap.toppings.forEach((tid, i) => {
    const ing = INGREDIENTS[tid];
    if (!ing) return;
    const n = snap.toppings.length;
    const ang = (i / Math.max(1, n)) * Math.PI * 2;
    const rr = r * 0.55;
    const dotR = r * 0.13;
    for (let k = 0; k < 5; k++) {
      const a = ang + k * 1.3;
      const px = x + Math.cos(a) * rr * (0.5 + 0.5 * ((k % 3) / 3));
      const py = y + Math.sin(a) * rr * (0.5 + 0.5 * ((k % 3) / 3));
      g.fillStyle(ing.color, 1);
      g.fillCircle(px, py, dotR);
      g.lineStyle(Math.max(1, dotR * 0.22), 0x2c1810, 0.35);
      g.strokeCircle(px, py, dotR);
    }
  });

  // В печи: оттенок фазы + кольцевой таймер готовности вокруг пиццы.
  if (snap.inOven && !snap.finished && ovenSt) {
    if (ovenSt.phase === 'ready') { g.fillStyle(0xffe08a, 0.25); g.fillCircle(x, y, r); }
    else if (ovenSt.phase === 'burning') { g.fillStyle(0x000000, 0.35); g.fillCircle(x, y, r); }

    const cook = Math.max(0.1, cookSeconds);
    const total = 1 + (windowSeconds ?? OVEN.windowSeconds) / cook;   // готовка + окно «ещё можно достать»
    const frac = Math.min(1, snap.cookProgress / total);
    const color = ovenSt.phase === 'ready' ? THEME.colors.success
      : ovenSt.phase === 'burning' ? THEME.colors.danger : THEME.colors.accent;
    const a0 = -Math.PI / 2;

    g.lineStyle(7, 0x000000, 0.28);
    strokeArc(g, x, y, r + 12, a0, a0 + Math.PI * 2);
    g.lineStyle(7, color, 1);
    strokeArc(g, x, y, r + 12, a0, a0 + Math.PI * 2 * frac);
  } else if (snap.ovenResult === OvenResult.BURNT) {
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(x, y, r);
  }
}

// ── Печь ──────────────────────────────────────────────────────────────────
// Раньше печи на экране не было вообще, хотя этап печи — кульминация сборки:
// игрок ждал готовности, глядя в пустоту. Возвращает контейнер с setGlow(phase),
// phase ∈ idle | cooking | ready | burning.
export function drawOven(scene, x, y, w, h) {
  const cont = scene.add.container(x, y);

  // Спрайт печи, если он загружен. Свечение фазы рисуем ПОВЕРХ спрайта полупрозрачной
  // заливкой устья: так один ассет обслуживает все четыре состояния.
  if (scene.textures && scene.textures.exists('obj_oven')) {
    const img = scene.add.image(0, 0, 'obj_oven').setDisplaySize(w, h);
    cont.add(img);
    const glow = scene.add.graphics();
    cont.add(glow);
    cont.setGlow = (phase) => {
      glow.clear();
      const color = phase === 'ready' ? THEME.colors.success
        : phase === 'burning' ? THEME.colors.danger
          : phase === 'cooking' ? 0xe67e22 : null;
      if (!color) return;
      glow.fillStyle(color, 0.55);
      glow.slice(0, h * 0.06, w * 0.24, Math.PI, 0, false);
      glow.fillPath();
      glow.fillRect(-w * 0.24, h * 0.06, w * 0.48, h * 0.14);
    };
    cont.setGlow('idle');
    return cont;
  }

  const body = scene.add.graphics();
  body.fillStyle(THEME.colors.panel, 1);
  body.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  body.lineStyle(4, 0x2c1810, 0.6);
  body.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  // Кирпичная кладка — две линии шва, чтобы блок не читался как просто прямоугольник.
  body.lineStyle(2, 0x2c1810, 0.25);
  body.beginPath(); body.moveTo(-w / 2 + 8, -h / 2 + 16); body.lineTo(w / 2 - 8, -h / 2 + 16); body.strokePath();
  body.beginPath(); body.moveTo(-w / 2 + 8, h / 2 - 14); body.lineTo(w / 2 - 8, h / 2 - 14); body.strokePath();
  cont.add(body);

  // Устье — арка, которая и светится.
  const mouth = scene.add.graphics();
  cont.add(mouth);

  const mouthR = w * 0.32;
  const mouthY = h * 0.12;
  const paint = (color, alpha) => {
    mouth.clear();
    mouth.fillStyle(0x1a0f08, 1);
    mouth.slice(0, mouthY, mouthR, Math.PI, 0, false);
    mouth.fillPath();
    mouth.fillRect(-mouthR, mouthY, mouthR * 2, h * 0.16);
    mouth.fillStyle(color, alpha);
    mouth.slice(0, mouthY, mouthR * 0.82, Math.PI, 0, false);
    mouth.fillPath();
    mouth.fillRect(-mouthR * 0.82, mouthY, mouthR * 1.64, h * 0.13);
  };

  cont.setGlow = (phase) => {
    if (phase === 'ready') paint(THEME.colors.success, 0.95);
    else if (phase === 'burning') paint(THEME.colors.danger, 0.95);
    else if (phase === 'cooking') paint(0xe67e22, 0.85);
    else paint(0x000000, 0.0);
  };
  cont.setGlow('idle');
  return cont;
}
