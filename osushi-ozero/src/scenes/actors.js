// АКТЁРЫ мира: игрок с ведром, слив, акула, сундук, телефон. Код-арт флэтом.
// Только внешний вид и мелкие анимации; поведение — в GameScene.
import { THEME } from '../ui/theme.js';

// Цвета вёдер по id из data/balance.js BUCKETS.
export const BUCKET_COLORS = {
  wood: 0x8d6e63, plastic: 0x42a5f5, metal: 0x90a4ae,
  magnet: 0xef5350, toxic: 0x9ccc65, golden: 0xffd54f
};

// ШАПКИ код-артом: рисуются ПОВЕРХ головы героя (голову не заменяют —
// урок «Восхождения»). g — Graphics, (cx, cy) — центр головы, bob — присед.
// Все шапки читаемы при ширине головы 26 px.
export function drawHat(g, id, cx, cy) {
  const top = cy - 12; // верх головы
  switch (id) {
    case 'panama':
      g.fillStyle(0x827717, 1).fillEllipse(cx, top + 3, 40, 10);
      g.fillStyle(0x9e9d24, 1).fillRoundedRect(cx - 11, top - 9, 22, 12, 4);
      break;
    case 'hardhat':
      g.fillStyle(0xfbc02d, 1);
      g.beginPath(); g.arc(cx, top + 2, 14, Math.PI, 0); g.fillPath();
      g.fillRect(cx - 17, top + 1, 34, 4);
      g.fillStyle(0xf9a825, 1).fillRect(cx - 3, top - 12, 6, 6);
      break;
    case 'ushanka':
      g.fillStyle(0x795548, 1);
      g.beginPath(); g.arc(cx, top + 2, 13, Math.PI, 0); g.fillPath();
      g.fillRect(cx - 15, top + 1, 6, 16); g.fillRect(cx + 9, top + 1, 6, 16); // уши
      g.fillStyle(0xa1887f, 1).fillRect(cx - 13, top + 1, 26, 4);
      break;
    case 'cowboy':
      g.fillStyle(0x8d6e63, 1).fillEllipse(cx, top + 3, 44, 9);
      g.fillStyle(0x795548, 1).fillRoundedRect(cx - 10, top - 10, 20, 13, 5);
      g.fillStyle(0x5d4037, 1).fillRect(cx - 10, top - 1, 20, 3);
      break;
    case 'tophat':
      g.fillStyle(0x263238, 1).fillEllipse(cx, top + 3, 38, 8);
      g.fillStyle(0x37474f, 1).fillRect(cx - 9, top - 20, 18, 23);
      g.fillStyle(0xb71c1c, 1).fillRect(cx - 9, top - 2, 18, 4);
      break;
    case 'viking':
      g.fillStyle(0x90a4ae, 1);
      g.beginPath(); g.arc(cx, top + 3, 13, Math.PI, 0); g.fillPath();
      g.fillStyle(0xeceff1, 1);
      g.fillTriangle(cx - 12, top, cx - 20, top - 14, cx - 8, top - 4);
      g.fillTriangle(cx + 12, top, cx + 20, top - 14, cx + 8, top - 4);
      break;
    case 'diver':
      g.fillStyle(0xb0bec5, 0.55).fillCircle(cx, cy - 1, 17);   // купол
      g.lineStyle(3, 0x78909c, 1).strokeCircle(cx, cy - 1, 17);
      g.fillStyle(0x78909c, 1).fillRect(cx - 6, top - 8, 12, 5); // клапан
      break;
    case 'crown':
      g.fillStyle(0xffd54f, 1);
      g.fillRect(cx - 12, top - 6, 24, 9);
      g.fillTriangle(cx - 12, top - 6, cx - 8, top - 15, cx - 4, top - 6);
      g.fillTriangle(cx - 4, top - 6, cx, top - 16, cx + 4, top - 6);
      g.fillTriangle(cx + 4, top - 6, cx + 8, top - 15, cx + 12, top - 6);
      g.fillStyle(0xe53935, 1).fillCircle(cx, top - 1, 2.5);
      break;
    case 'halo':
      g.lineStyle(4, 0xfff176, 0.95).strokeEllipse(cx, top - 12, 30, 9);
      break;
    default: // 'cap' — родная кепка
      g.fillStyle(0x455a64, 1).fillRect(cx - 13, top, 26, 7);
      g.fillStyle(0x455a64, 1).fillRect(cx + 6, top + 3, 12, 4);
  }
}

// Игрок: фигурка с ведром. Методы: setBucketColor, setFill(0..1),
// setWalking(bool), setLean(рад — наклон при черпании/выливании), setHat(id).
export function createPlayer(scene) {
  const c = scene.add.container(0, 0).setDepth(6);

  const g = scene.add.graphics();
  c.add(g);
  c.bodyG = g;

  // Ведро отдельным графиком, чтобы наклонять и красить.
  const bucket = scene.add.graphics();
  bucket.x = 26; bucket.y = -18;
  c.add(bucket);
  c.bucketG = bucket;

  // Полоска наполнения над головой.
  const barBg = scene.add.rectangle(0, -86, 64, 10, THEME.colors.panelDark).setOrigin(0.5);
  const bar = scene.add.rectangle(-31, -86, 2, 8, THEME.world.waterLine).setOrigin(0, 0.5);
  c.add(barBg); c.add(bar);
  c.fillBar = bar; c.fillBarBg = barBg;

  c.bucketColor = BUCKET_COLORS.wood;
  c.fillPct = 0;
  c.hatId = 'cap';
  c.setHat = (id) => { c.hatId = id || 'cap'; c.redraw(); };

  c.redraw = () => {
    g.clear();
    // Ноги: настоящий шаг — бёдра расходятся, ступни отрываются от земли.
    const swing = c.legPhase; // -1..1
    g.fillStyle(0x37474f, 1);
    // задняя нога
    g.fillTriangle(-12, -24, -2, -24, -6 - swing * 9, 0 - Math.max(0, -swing) * 4);
    g.fillRect(-10 - swing * 9, -4 - Math.max(0, -swing) * 4, 10, 5); // ступня
    // передняя нога
    g.fillStyle(0x455a64, 1);
    g.fillTriangle(2, -24, 12, -24, 8 + swing * 9, 0 - Math.max(0, swing) * 4);
    g.fillRect(2 + swing * 9, -4 - Math.max(0, swing) * 4, 10, 5);
    // тело-курточка, слегка приседает в шаге
    const bob = Math.abs(swing) * 2;
    g.fillStyle(0xff8f00, 1).fillRoundedRect(-18, -56 + bob, 36, 38 - bob, 8);
    // голова
    g.fillStyle(0xffcc80, 1).fillCircle(0, -66 + bob, 13);
    // лицо: глаз и улыбка (смотрит вправо, к воде)
    g.fillStyle(0x37474f, 1).fillCircle(6, -66 + bob, 2.4);
    g.fillStyle(0x37474f, 1).fillRect(3, -59 + bob, 7, 2);
    // шапка поверх головы (косметика, drawHat)
    drawHat(g, c.hatId, 0, -66 + bob);
    // рука к ведру: провисает под грузом
    const sag = c.fillPct * 5;
    g.fillStyle(0xff8f00, 1);
    g.fillTriangle(8, -50 + bob, 8, -42 + bob, 26, -44 + sag);

    const b = c.bucketG;
    b.y = -18 + sag;
    b.clear();
    b.fillStyle(c.bucketColor, 1);
    b.fillTriangle(-13, -12, 13, -12, 9, 12);
    b.fillTriangle(-13, -12, -9, 12, 9, 12);
    b.lineStyle(3, 0x37474f, 1).lineBetween(-13, -12, 13, -12);
    // вода в ведре
    if (c.fillPct > 0.05) {
      b.fillStyle(THEME.world.waterTint, 0.9);
      const w = 22 * (0.6 + 0.4 * c.fillPct);
      b.fillRect(-w / 2, -11, w, 5 + 6 * c.fillPct);
    }
  };

  c.legPhase = 0;
  c.setBucketColor = (color) => { c.bucketColor = color; c.redraw(); };
  // Разворот: 1 — вправо (к воде), -1 — влево (к сливу). Ведро и наклон
  // зеркалятся вместе с контейнером.
  c.facing = 1;
  c.setFacing = (f) => {
    if (c.facing === f) return;
    c.facing = f;
    c.scaleX = f;
  };
  c.setFill = (pct) => {
    c.fillPct = pct;
    c.fillBar.width = Math.max(2, 62 * pct);
    const show = pct > 0.01;
    c.fillBar.visible = show; c.fillBarBg.visible = show;
    c.redraw();
  };
  c.setLean = (rad) => { c.bodyG.rotation = rad; c.bucketG.rotation = rad * 1.6; };

  c.walkT = 0;
  c.stepWalk = (dt, walking) => {
    if (walking) {
      // Полный ведро — шаг тяжелее и медленнее (читаемость груза).
      c.walkT += dt * (10 - c.fillPct * 3);
      c.legPhase = Math.sin(c.walkT);
    } else c.legPhase = 0;
    c.redraw();
  };

  c.setFill(0);
  c.redraw();
  return c;
}

// Слив: жёлтая станция с воронкой, экраном и трубой в землю. Код-арт:
// сгенерированный вариант выглядел «кубком» и парил — забракован (в стоке).
// Низ спрайта на y=0 — ставится точно на землю.
export function createDrain(scene, x, y) {
  const c = scene.add.container(x, y).setDepth(4);
  const g = scene.add.graphics();
  const accent = THEME.colors.accent;
  // плита-основание на земле
  g.fillStyle(0x455a64, 1).fillRect(-36, -8, 82, 8);
  // корпус
  g.fillStyle(accent, 1).fillRoundedRect(-26, -74, 52, 66, 7);
  g.fillStyle(0x000000, 0.16).fillRect(-26, -22, 52, 14); // тень низа корпуса
  // экранчик с «уровнем воды»
  g.fillStyle(0x263238, 1).fillRoundedRect(-18, -68, 36, 16, 4);
  g.fillStyle(0x4dd0e1, 0.9).fillRect(-14, -62, 28, 6);
  // болты
  g.fillStyle(0x8d6e00, 1);
  g.fillCircle(-20, -14, 2.5); g.fillCircle(20, -14, 2.5);
  // приёмный раструб СБОКУ, на высоте ведра игрока (льют в него, не вверх)
  g.fillStyle(accent, 1);
  g.beginPath();
  g.moveTo(24, -52); g.lineTo(50, -62); g.lineTo(50, -22); g.lineTo(24, -32);
  g.closePath(); g.fillPath();
  g.fillStyle(0xc99700, 1);
  g.beginPath();
  g.moveTo(48, -64); g.lineTo(56, -64); g.lineTo(56, -20); g.lineTo(48, -20);
  g.closePath(); g.fillPath();                          // обод раструба
  g.fillStyle(0x000000, 0.25).fillRect(50, -58, 5, 34); // темнота жерла
  c.add(g);
  // стрелка-подсветка активного слива
  const arrow = scene.add.triangle(0, -100, 0, 18, 22, -12, -22, -12, THEME.colors.accent).setOrigin(0.5);
  c.add(arrow);
  scene.tweens.add({ targets: arrow, y: -112, duration: 500, yoyo: true, repeat: -1 });
  c.arrow = arrow;
  c.setActive2 = (v) => { arrow.setVisible(v); };
  return c;
}

// Акула: сгенерированный спрайт с двумя позами (плывёт/кусает), фолбэк — код.
export function createShark(scene) {
  const c = scene.add.container(0, 0).setDepth(4.5);
  const hasArt = scene.textures.exists('shark_calm');
  if (hasArt) {
    const img = scene.add.image(0, 4, 'shark_calm');
    img.setScale(128 / img.width);
    c.add(img);
    c.gfx = img;
    c.setBiting = (v) => {
      const key = v && scene.textures.exists('shark_bite') ? 'shark_bite' : 'shark_calm';
      if (img.texture.key !== key) {
        img.setTexture(key);
        img.setScale(128 / img.width);
      }
    };
  } else {
    const g = scene.add.graphics();
    g.fillStyle(0x546e7a, 1);
    g.fillEllipse(0, 10, 110, 34);
    g.fillTriangle(-52, 10, -84, -6, -84, 26);   // хвост
    g.fillTriangle(-6, -6, 30, -6, 16, -34);     // плавник
    g.fillStyle(0xffffff, 1).fillCircle(38, 4, 4); // глаз
    c.add(g);
    c.gfx = g;
    c.setBiting = () => {};
  }
  const warn = scene.add.text(0, -64, '!', {
    fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: '#ff5252', fontStyle: 'bold'
  }).setOrigin(0.5).setVisible(false);
  c.add(warn);
  c.warn = warn;
  c.setDir = (d) => { c.gfx.scaleX = Math.abs(c.gfx.scaleX) * (d >= 0 ? 1 : -1); };
  return c;
}

// Сокровище на стенке: сундук кодом или сгенерированный предмет (texKey).
// setExposed включает блеск, интерактивность решает GameScene.
export function createChest(scene, x, y, texKey = null) {
  const c = scene.add.container(x, y).setDepth(3);
  if (texKey && scene.textures.exists(texKey)) {
    const img = scene.add.image(0, 0, texKey);
    img.setScale(66 / Math.max(img.width, img.height));
    c.add(img);
  } else {
    const g = scene.add.graphics();
    g.fillStyle(0x795548, 1).fillRoundedRect(-22, -16, 44, 32, 6);
    g.fillStyle(0x5d4037, 1).fillRect(-22, -4, 44, 4);
    g.fillStyle(THEME.world.tokens, 1).fillRect(-4, -8, 8, 12);
    c.add(g);
  }
  const glow = scene.add.circle(0, 0, 34, THEME.world.gems, 0.25).setVisible(false);
  c.addAt(glow, 0);
  c.glow = glow;
  c.exposed = false;
  c.setExposed = (v) => {
    if (c.exposed === v) return;
    c.exposed = v;
    glow.setVisible(v);
    c.setAlpha(v ? 1 : 0.85);
    if (v) scene.tweens.add({ targets: glow, scale: 1.25, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
  };
  return c;
}

// Телефон на дне: светится с первой секунды — игрок всегда видит цель.
export function createPhone(scene, x, y) {
  const c = scene.add.container(x, y).setDepth(3);
  const glow = scene.add.circle(0, 0, 42, THEME.world.phoneGlow, 0.35);
  const body = scene.add.rectangle(0, 0, 22, 38, 0x263238).setStrokeStyle(2, THEME.world.phoneGlow);
  const screen = scene.add.rectangle(0, -2, 16, 26, THEME.world.phoneGlow, 0.9);
  c.add(glow); c.add(body); c.add(screen);
  scene.tweens.add({ targets: glow, scale: 1.4, alpha: 0.12, duration: 900, yoyo: true, repeat: -1 });
  return c;
}
