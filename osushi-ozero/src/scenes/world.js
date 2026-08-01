// КОД-АРТ РАЗРЕЗА ОЗЕРА: статичные слои мира (небо, порода зон, декор, дно)
// и динамический слой воды. Всё флэтом через Phaser Graphics, без ассетов.
// Вода — полупрозрачный прямоугольник на всю ширину от поверхности до дна
// котлована: всё, что ниже уровня, автоматически выглядит «под водой».
import { THEME } from '../ui/theme.js';
import { ZONES } from '../data/balance.js';
import {
  BASE_W, SURFACE_Y, LAKE_BOTTOM_Y, WORLD_H, PX_PER_M,
  yFromDepth, zoneTopDepth, wallLeft, wallRight, wallLeftAtY, wallRightAtY
} from './layout.js';

// Рисует статичный мир один раз при создании сцены.
// zones — зоны активного озера (обычное или болото): палитра по z.id.
export function drawWorld(scene, zones = ZONES) {
  const g = scene.add.graphics().setDepth(0);
  const W = THEME.world;
  const isSwamp = zones !== ZONES;

  // Небо двумя полосами + солнце.
  g.fillStyle(W.sky, 1).fillRect(0, 0, BASE_W, SURFACE_Y * 0.55);
  g.fillStyle(W.skyDeep, 1).fillRect(0, SURFACE_Y * 0.55, BASE_W, SURFACE_Y * 0.45);
  g.fillStyle(W.sun, 1).fillCircle(BASE_W - 130, 110, 56);

  // Порода по зонам: левая и правая стенки котлована ступенями.
  // Текстура кодом: страты, крапинки, трещины — стенки перестают быть «бумагой».
  let seed = 12345; // детерминированный рандом: мир одинаков от запуска к запуску
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  zones.forEach((z, i) => {
    const yTop = yFromDepth(zoneTopDepth(i));
    const h = z.depth * PX_PER_M;
    const rock = W.zones[z.id].rock;
    const wl = wallLeft(i), wr = wallRight(i);
    g.fillStyle(rock, 1);
    g.fillRect(0, yTop, wl, h);                  // левая стенка
    g.fillRect(wr, yTop, BASE_W - wr, h);        // правая стенка
    // Страты: горизонтальные слои чуть темнее.
    g.fillStyle(0x000000, 0.07);
    for (let m = 1.2; m < z.depth; m += 2.4) {
      const y = yTop + m * PX_PER_M;
      g.fillRect(0, y, wl, 5);
      g.fillRect(wr, y, BASE_W - wr, 5);
    }
    // Крапинки: тёмные и светлые камешки.
    for (let k = 0; k < 26; k++) {
      const left = rnd() < 0.5;
      const x = left ? rnd() * (wl - 10) : wr + 6 + rnd() * (BASE_W - wr - 12);
      const y = yTop + 8 + rnd() * (h - 16);
      g.fillStyle(rnd() < 0.5 ? 0x000000 : 0xffffff, 0.09);
      g.fillCircle(x, y, 2 + rnd() * 3.5);
    }
    // Трещины: короткие тёмные зигзаги.
    g.lineStyle(3, 0x000000, 0.14);
    for (let k = 0; k < 3; k++) {
      const left = rnd() < 0.5;
      let x = left ? 12 + rnd() * (wl - 40) : wr + 12 + rnd() * (BASE_W - wr - 40);
      let y = yTop + 12 + rnd() * (h - 70);
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 3; s++) {
        x += (rnd() - 0.5) * 26; y += 14 + rnd() * 16;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    // Насечки-ступени на левой стенке (по ним «ходит» игрок).
    g.fillStyle(0x000000, 0.12);
    for (let m = 0; m < z.depth; m += 2) {
      g.fillRect(wl - 26, yTop + m * PX_PER_M, 26, 4);
    }
  });

  // Дно и порода под ним.
  const bottomRock = W.zones[zones[zones.length - 1].id].rock;
  g.fillStyle(bottomRock, 1).fillRect(0, LAKE_BOTTOM_Y, BASE_W, WORLD_H - LAKE_BOTTOM_Y);
  g.fillStyle(0x000000, 0.25).fillRect(0, LAKE_BOTTOM_Y, BASE_W, 10);

  // Берег сверху: трава и пара ёлок слева, песок и лагерь героя справа.
  g.fillStyle(W.zones[zones[0].id].deco, 1).fillRect(0, SURFACE_Y - 14, wallLeft(0), 14);
  drawTree(g, 40, SURFACE_Y - 14, W.zones[zones[0].id].deco);
  drawTree(g, 92, SURFACE_Y - 14, W.zones[zones[0].id].deco);
  g.fillStyle(W.zones[zones[0].id].rock, 1).fillRect(wallRight(0), SURFACE_Y - 10, BASE_W - wallRight(0), 10);
  // Палатка героя — правый берег, ближе к краю (левее — место под костёр).
  const tx = wallRight(0) + 70, ty = SURFACE_Y - 10;
  g.fillStyle(0xef6c00, 1).fillTriangle(tx - 26, ty, tx + 26, ty, tx, ty - 40);
  g.fillStyle(0xbf5000, 1).fillTriangle(tx + 5, ty, tx + 26, ty, tx + 15, ty - 22);
  g.fillStyle(0x3e2723, 0.9).fillTriangle(tx - 7, ty, tx + 7, ty, tx, ty - 17);

  if (isSwamp) drawSwampDeco(g);
  else drawZoneDeco(g);
  return g;
}

// Декор болота: камыши у берега, коряги на стенках, изба на своей полке.
function drawSwampDeco(g) {
  const W = THEME.world;
  // камыши у кромки
  g.fillStyle(W.zones.reeds.deco, 1);
  for (const x of [wallLeft(0) - 20, wallLeft(0) - 34, wallRight(0) + 16]) {
    g.fillRect(x, SURFACE_Y - 44, 4, 34);
    g.fillStyle(0x6d4c41, 1).fillRoundedRect(x - 3, SURFACE_Y - 52, 10, 16, 5);
    g.fillStyle(W.zones.reeds.deco, 1);
  }
  // коряги: кривые ветки на стенках зон 2-4
  g.lineStyle(7, 0x5d4037, 1);
  for (const [zi, m] of [[2, 24], [3, 36], [4, 47]]) {
    const y = yFromDepth(m);
    const x = zi % 2 ? wallLeft(zi) : wallRight(zi);
    const dir = zi % 2 ? 1 : -1;
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + dir * 34, y - 18); g.lineTo(x + dir * 58, y - 8);
    g.strokePath();
    g.beginPath(); g.moveTo(x + dir * 30, y - 16); g.lineTo(x + dir * 44, y - 34); g.strokePath();
  }
  // затонувшая изба (зона 6): сруб с треугольной крышей
  {
    const base = yFromDepth(58);
    const x = wallRight(5) - 120;
    g.fillStyle(0x6d4c41, 1).fillRect(x, base - 54, 96, 54);
    g.fillStyle(0x5d4037, 1);
    for (let k = 0; k < 4; k++) g.fillRect(x, base - 54 + k * 14, 96, 4);
    g.fillStyle(0x4e342e, 1).fillTriangle(x - 12, base - 54, x + 108, base - 54, x + 48, base - 92);
    g.fillStyle(0x263238, 0.8).fillRect(x + 36, base - 34, 22, 34); // дверь
  }
}

function drawTree(g, x, groundY, color) {
  g.fillStyle(0x6d4c41, 1).fillRect(x - 4, groundY - 22, 8, 22);
  g.fillStyle(color, 1);
  g.fillTriangle(x - 26, groundY - 18, x + 26, groundY - 18, x, groundY - 66);
  g.fillTriangle(x - 20, groundY - 44, x + 20, groundY - 44, x, groundY - 86);
}

// Декор зон: простые силуэты у стенок, чтобы каждая глубина читалась своей.
function drawZoneDeco(g) {
  const W = THEME.world;

  // Затонувшая лодка (зона 2): корпус у правой стенки.
  {
    const y = yFromDepth(15);
    const x = wallRight(1) - 150;
    g.fillStyle(W.zones.boat.deco, 1);
    g.fillTriangle(x, y, x + 150, y, x + 120, y + 46);
    g.fillTriangle(x, y, x + 40, y, x + 20, y + 40);
    g.fillRect(x + 66, y - 52, 8, 52); // мачта
  }

  // Пещеры (зона 3): сталактиты от «потолка» зоны на стенках.
  {
    const yTop = yFromDepth(zoneTopDepth(2));
    g.fillStyle(W.zones.caves.deco, 1);
    for (const x of [wallLeft(2) + 26, wallLeft(2) + 78, wallRight(2) - 40, wallRight(2) - 96]) {
      g.fillTriangle(x - 14, yTop, x + 14, yTop, x, yTop + 58);
    }
  }

  // Шахта (зона 4): деревянные крепи на правой стенке.
  {
    const x = wallRight(3) + 6;
    g.fillStyle(W.zones.mine.deco, 1);
    for (let k = 0; k < 3; k++) {
      const y = yFromDepth(zoneTopDepth(3) + 2 + k * 3);
      g.fillRect(x, y, 60, 8);
      g.fillRect(x + 4, y, 8, 3 * PX_PER_M);
      g.fillRect(x + 48, y, 8, 3 * PX_PER_M);
    }
  }

  // Лавовый разлом (зона 5): трещины на обеих стенках.
  {
    g.fillStyle(W.zones.lava.deco, 1);
    const yTop = yFromDepth(zoneTopDepth(4));
    for (let k = 0; k < 4; k++) {
      const y = yTop + 30 + k * 50;
      g.fillRect(wallLeft(4) - 30, y, 30, 6);
      g.fillRect(wallRight(4), y + 20, 34, 6);
    }
  }

  // Затерянный город (зона 6): колонны на дне своей полки правой стенки.
  {
    const base = yFromDepth(zoneTopDepth(6));
    g.fillStyle(W.zones.city.deco, 1);
    for (const x of [wallRight(5) - 40, wallRight(5) - 92, wallRight(5) - 144]) {
      g.fillRect(x, base - 120, 22, 120);
      g.fillRect(x - 6, base - 132, 34, 12);
    }
  }
}

// Динамический слой воды: перерисовывается при изменении уровня.
// Градиент глубины (внизу темнее), косые лучи света от поверхности, рябь.
export class WaterLayer {
  constructor(scene, zones = ZONES, swamp = false) {
    this.g = scene.add.graphics().setDepth(5);
    this.zones = zones;
    const W = THEME.world;
    this.tint = swamp ? W.swampWaterTint : W.waterTint;
    this.line = swamp ? W.swampWaterLine : W.waterLine;
    this.t = 0;
  }

  // surfaceY — текущий y поверхности; dt для лёгкой ряби.
  draw(surfaceY, dt) {
    this.t += dt;
    const W = THEME.world;
    const g = this.g;
    g.clear();
    // Мокрый след: тёмная полоса на стенках там, где вода уже была, —
    // главное визуальное доказательство, что озеро мелеет.
    if (surfaceY > SURFACE_Y + 4) {
      this.zones.forEach((z, i) => {
        const zTop = yFromDepth(zoneTopDepth(i));
        const zBot = zTop + z.depth * PX_PER_M;
        const y0 = Math.max(zTop, SURFACE_Y);
        const y1 = Math.min(zBot, surfaceY);
        if (y1 <= y0) return;
        g.fillStyle(0x14283d, 0.20);
        g.fillRect(0, y0, wallLeft(i), y1 - y0);
        g.fillRect(wallRight(i), y0, BASE_W - wallRight(i), y1 - y0);
      });
      // Свежая кромка у самой воды — темнее.
      const wlNow = wallLeftAtY(surfaceY), wrNow = wallRightAtY(surfaceY);
      g.fillStyle(0x14283d, 0.3);
      g.fillRect(0, surfaceY - 8, wlNow, 8);
      g.fillRect(wrNow, surfaceY - 8, BASE_W - wrNow, 8);
    }
    if (surfaceY >= LAKE_BOTTOM_Y - 1) return; // осушено
    // База + полосы затемнения: чем глубже под поверхностью, тем темнее.
    g.fillStyle(this.tint, W.waterAlpha);
    g.fillRect(0, surfaceY, BASE_W, LAKE_BOTTOM_Y - surfaceY);
    const DARK_STEPS = [[300, 0.10], [650, 0.13], [1000, 0.17], [1350, 0.22]];
    for (const [off, alpha] of DARK_STEPS) {
      const y = surfaceY + off;
      if (y >= LAKE_BOTTOM_Y) break;
      g.fillStyle(0x061a30, alpha);
      g.fillRect(0, y, BASE_W, LAKE_BOTTOM_Y - y);
    }
    // Косые лучи света: покачиваются, тают с глубиной.
    const rayLen = Math.min(560, LAKE_BOTTOM_Y - surfaceY);
    for (let i = 0; i < 4; i++) {
      const baseX = 90 + i * 170 + Math.sin(this.t * 0.5 + i * 1.7) * 26;
      const w = 34 + i * 8;
      g.fillStyle(this.line, 0.055);
      g.fillTriangle(baseX, surfaceY, baseX + w, surfaceY, baseX + w * 2.4, surfaceY + rayLen);
      g.fillTriangle(baseX, surfaceY, baseX + w * 1.4, surfaceY + rayLen, baseX + w * 2.4, surfaceY + rayLen);
    }
    // Линия поверхности с лёгкой рябью и светлой пеной у стенок.
    g.lineStyle(4, this.line, 0.9);
    g.beginPath();
    const amp = 3;
    for (let x = 0; x <= BASE_W; x += 24) {
      const y = surfaceY + Math.sin(x * 0.05 + this.t * 2.2) * amp;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }
}

// Атмосфера зон: рыбки в толще, пульс лавы, споры города, свет в Бездне.
// Дешёвые объекты, обновляются раз в кадр из GameScene.
export class AmbienceLayer {
  constructor(scene, zones = ZONES) {
    this.scene = scene;
    const W = THEME.world;
    const has = (id) => zones.some(z => z.id === id);

    // Рыбки-силуэты: плавают в толще воды на своих глубинах.
    this.fish = [];
    for (let i = 0; i < 6; i++) {
      const depth = 8 + i * 10 + Math.random() * 6; // метры
      const g = scene.add.graphics().setDepth(4.4);
      const size = 10 + Math.random() * 8;
      g.fillStyle(0x0d2b4a, 0.55);
      g.fillEllipse(0, 0, size * 2.2, size);
      g.fillTriangle(-size * 1.1, 0, -size * 1.9, -size * 0.6, -size * 1.9, size * 0.6);
      this.fish.push({
        g, y: yFromDepth(depth),
        x: 200 + Math.random() * 300,
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: 18 + Math.random() * 26,
        wob: Math.random() * 6.28
      });
    }

    // Пульс лавы: свечение поверх трещин зоны 5 (только обычное озеро).
    this.lavaGlow = null;
    if (has('lava')) {
      this.lavaGlow = scene.add.graphics().setDepth(4.2);
      const lavaTop = yFromDepth(zoneTopDepth(4));
      this.lavaGlow.fillStyle(W.zones.lava.deco, 0.16);
      for (let k = 0; k < 4; k++) {
        const y = lavaTop + 30 + k * 50;
        // Свечение сидит ГЛУБЖЕ в стене (меньше выпирает в игровое поле), чтобы
        // читаться как фон трещин, а не как объект: игрок принимал его за
        // интерактивную шкалу и пытался кликнуть (2026-07-21).
        this.lavaGlow.fillCircle(wallLeft(4) - 34, y + 3, 26);
        this.lavaGlow.fillCircle(wallRight(4) + 36, y + 23, 26);
      }
    }

    // Споры затерянного города / гнилушки чёрной топи: всплывающие светлячки.
    this.spores = [];
    if (has('city') || has('blackbog')) {
      const sporeColor = has('city') ? W.zones.city.deco : W.zones.blackbog.deco;
      const top = yFromDepth(zoneTopDepth(5));
      for (let i = 0; i < 8; i++) {
        const c = scene.add.circle(
          wallLeft(5) + 30 + Math.random() * (wallRight(5) - wallLeft(5) - 60),
          top + Math.random() * 200 + 10,
          2 + Math.random() * 2, sporeColor, 0.5
        ).setDepth(4.3);
        this.spores.push({ c, baseY: c.y, ph: Math.random() * 6.28 });
      }
    }

    // Светлячки болота: жёлтые огоньки над поверхностью воды.
    this.fireflies = [];
    if (has('bog')) {
      for (let i = 0; i < 7; i++) {
        const c = scene.add.circle(0, 0, 2.5, 0xfff176, 0.8).setDepth(5.6);
        this.fireflies.push({ c, x: 160 + Math.random() * 420, ph: Math.random() * 6.28, r: 20 + Math.random() * 26 });
      }
    }

    // Свет вокруг игрока в Бездне (тьму даёт градиент воды, свет — аддитивный круг).
    this.playerLight = scene.add.circle(0, 0, 130, 0xbfe6ff, 0.10)
      .setDepth(5.5).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);

    // Облака: медленно плывут над озером.
    this.clouds = [];
    for (let i = 0; i < 3; i++) {
      const g2 = scene.add.graphics().setDepth(0.5);
      g2.fillStyle(0xffffff, 0.85);
      const s = 0.7 + i * 0.25;
      g2.fillEllipse(0, 0, 110 * s, 34 * s);
      g2.fillEllipse(38 * s, -12 * s, 70 * s, 30 * s);
      g2.fillEllipse(-42 * s, -8 * s, 64 * s, 26 * s);
      g2.x = 120 + i * 240;
      g2.y = 70 + i * 55;
      this.clouds.push({ g: g2, speed: 5 + i * 3 });
    }

    // Птицы: две «галочки» кружат над озером.
    this.birds = [];
    for (let i = 0; i < 2; i++) {
      const b = scene.add.graphics().setDepth(0.6);
      b.lineStyle(3, 0x37474f, 0.8);
      b.beginPath(); b.moveTo(-8, 0); b.lineTo(0, -5); b.lineTo(8, 0); b.strokePath();
      this.birds.push({ g: b, ph: i * 2.6, r: 80 + i * 40, cx: 320 + i * 140, cy: 130 + i * 40 });
    }

    // Костёр на левом берегу, между ёлок: пламя мерцает, дым идёт вверх.
    // Костёр — рядом с палаткой на правом берегу (НЕ на левом: там слив и ёлки).
    this.fireX = wallRight(0) + 22;
    this.fireY = SURFACE_Y - 10;
    const logs = scene.add.graphics().setDepth(1);
    logs.fillStyle(0x5d4037, 1);
    logs.fillRect(this.fireX - 12, this.fireY - 4, 24, 5);
    this.flame = scene.add.graphics().setDepth(1.1);
    this.smokeT = 0;
    this.scene2 = scene;

    this.t = 0;
  }

  // surfaceY — уровень воды; px/py — позиция игрока; abyss — игрок в тёмных зонах.
  update(dt, surfaceY, px, py) {
    this.t += dt;
    for (const f of this.fish) {
      const visible = f.y > surfaceY + 40 && f.y < LAKE_BOTTOM_Y - 10;
      f.g.setVisible(visible);
      if (!visible) continue;
      f.x += f.dir * f.speed * dt;
      const minX = wallLeftAtY(f.y) + 40, maxX = wallRightAtY(f.y) - 40;
      if (f.x < minX) { f.x = minX; f.dir = 1; }
      if (f.x > maxX) { f.x = maxX; f.dir = -1; }
      f.g.x = f.x;
      f.g.y = f.y + Math.sin(this.t * 1.3 + f.wob) * 5;
      f.g.scaleX = f.dir;
    }
    // Мягкое дыхание, а не мигание: узкий диапазон 0.24..0.46 читается как
    // тлеющая лава-фон, а не как пульсирующий индикатор (было 0.2..1.0).
    if (this.lavaGlow) this.lavaGlow.alpha = 0.35 + Math.sin(this.t * 1.3) * 0.11;
    for (const f of this.fireflies) {
      f.c.x = f.x + Math.cos(this.t * 0.6 + f.ph) * f.r;
      f.c.y = surfaceY - 26 - Math.abs(Math.sin(this.t * 0.8 + f.ph)) * 30;
      f.c.alpha = 0.35 + (Math.sin(this.t * 2.4 + f.ph) + 1) * 0.3;
    }
    for (const s of this.spores) {
      s.c.y = s.baseY + Math.sin(this.t * 0.7 + s.ph) * 18;
      s.c.alpha = 0.3 + (Math.sin(this.t * 1.1 + s.ph) + 1) * 0.2;
    }
    const dark = py > yFromDepth(zoneTopDepth(5)); // город и глубже
    this.playerLight.setVisible(dark);
    if (dark) { this.playerLight.x = px; this.playerLight.y = py - 30; }

    // Облака дрейфуют и заворачиваются.
    for (const c of this.clouds) {
      c.g.x += c.speed * dt;
      if (c.g.x > BASE_W + 130) c.g.x = -130;
    }
    // Птицы кружат.
    for (const b of this.birds) {
      const a = this.t * 0.35 + b.ph;
      b.g.x = b.cx + Math.cos(a) * b.r;
      b.g.y = b.cy + Math.sin(a * 1.3) * 18;
      b.g.scaleX = Math.cos(a) > 0 ? 1 : -1;
    }
    // Пламя костра мерцает, изредка отпускает дымок.
    const f = this.flame;
    f.clear();
    const fl = 1 + Math.sin(this.t * 9) * 0.18 + Math.sin(this.t * 23) * 0.08;
    f.fillStyle(0xff7043, 0.95);
    f.fillTriangle(this.fireX - 9, this.fireY - 3, this.fireX + 9, this.fireY - 3, this.fireX, this.fireY - 26 * fl);
    f.fillStyle(0xffd54f, 0.95);
    f.fillTriangle(this.fireX - 5, this.fireY - 3, this.fireX + 5, this.fireY - 3, this.fireX, this.fireY - 15 * fl);
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.8 + Math.random() * 0.6;
      const s = this.scene2.add.circle(this.fireX + 2, this.fireY - 30, 5, 0xcfd8dc, 0.5).setDepth(1.05);
      this.scene2.tweens.add({
        targets: s, y: s.y - 60 - Math.random() * 30, x: s.x + 14 + Math.random() * 12,
        scale: 2.2, alpha: 0, duration: 2400, onComplete: () => s.destroy()
      });
    }
  }
}
