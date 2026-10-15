// ОТРИСОВКА ГОСТЯ В ОЧЕРЕДИ.
//
// Раньше гость был карточкой с текстом «Имя — Рецепт» и составом словами. Живой прогон
// 2026-08-09 показал, почему так нельзя: строка «Гость — Пепперони» вдвое шире карточки
// (161 игровых единиц), переноса не было, и подписи соседних гостей налезали друг на друга.
// Плюс текстом состав читать долго — а в тайм-менеджменте решение принимается за полсекунды.
//
// Теперь гость — фигура у стойки: облачко заказа ИКОНКАМИ над головой, настроение на лице,
// полоска терпения под ногами. Имя короткое и с переносом, за границу карточки не выходит.
//
// Модуль знает про THEME, i18n и иконки. Про кампанию, очередь и правила игры — нет:
// принимает объект клиента из mechanics/orders и колбэк тапа.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { PATIENCE } from '../data/balance.js';
import { patienceFraction } from '../mechanics/orders/orders.js';
import { drawIngredientIcon } from './icons.js';

// Настроение по доле оставшегося терпения. Пороги берутся из PATIENCE.warnFraction,
// а не пишутся числом здесь: сдвинули баланс — лицо поехало вместе с ним.
export function moodFor(frac) {
  if (frac <= PATIENCE.warnFraction / 2) return 'angry';
  if (frac <= PATIENCE.warnFraction) return 'worried';
  return 'calm';
}

// Устойчивый цвет одежды по имени персонажа: один гость всегда одного цвета,
// соседи в очереди различаются.
function colorFor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return THEME.customerColors[h % THEME.customerColors.length];
}

// Состав заказа как плоский список id ингредиентов: соус, сыр, топпинги.
function orderIcons(recipe) {
  return [recipe.sauce, recipe.cheese, ...recipe.toppings].filter(Boolean);
}

// Фигура гостя: голова, туловище, шляпа. Рисуется в ЛОКАЛЬНЫХ координатах контейнера.
function drawFigure(scene, cont, w, bodyTop, bodyH, cloth, hat) {
  const g = scene.add.graphics();
  const headR = Math.min(w * 0.19, bodyH * 0.3);
  const headY = bodyTop + headR;

  // Туловище — трапеция от плеч к низу.
  const shoulderY = headY + headR * 1.05;
  const halfTop = w * 0.22;
  const halfBottom = w * 0.32;
  const bottomY = bodyTop + bodyH;
  g.fillStyle(cloth, 1);
  g.beginPath();
  g.moveTo(-halfTop, shoulderY);
  g.lineTo(halfTop, shoulderY);
  g.lineTo(halfBottom, bottomY);
  g.lineTo(-halfBottom, bottomY);
  g.closePath();
  g.fillPath();

  // Воротник-«галстук» — деталь, которая делает силуэт узнаваемо «мафиозным».
  g.fillStyle(0xfff7e6, 1);
  g.fillTriangle(-halfTop * 0.42, shoulderY, halfTop * 0.42, shoulderY, 0, shoulderY + headR * 0.95);

  // Голова.
  g.fillStyle(THEME.colors.skin, 1);
  g.fillCircle(0, headY, headR);
  g.fillStyle(THEME.colors.skinShade, 0.35);
  g.fillCircle(headR * 0.42, headY + headR * 0.18, headR * 0.5);

  // Шляпа-котелок: не у всех, иначе очередь выглядит одинаковой.
  if (hat) {
    g.fillStyle(0x2c1810, 1);
    g.fillRect(-headR * 1.25, headY - headR * 0.86, headR * 2.5, headR * 0.2);
    g.slice(0, headY - headR * 0.8, headR * 0.85, Math.PI, 0, false);
    g.fillPath();
  }
  cont.add(g);
  return { headY, headR };
}

// Лицо: перерисовывается при смене настроения.
function drawFace(scene, headY, headR, mood) {
  const g = scene.add.graphics();
  const eyeY = headY - headR * 0.12;
  const eyeDx = headR * 0.38;
  g.fillStyle(0x2c1810, 1);

  if (mood === 'angry') {
    // Брови домиком и открытый рот — «закипает».
    g.fillCircle(-eyeDx, eyeY, headR * 0.13);
    g.fillCircle(eyeDx, eyeY, headR * 0.13);
    g.lineStyle(Math.max(2, headR * 0.13), 0x2c1810, 1);
    g.beginPath(); g.moveTo(-eyeDx * 1.5, eyeY - headR * 0.42); g.lineTo(-eyeDx * 0.5, eyeY - headR * 0.2); g.strokePath();
    g.beginPath(); g.moveTo(eyeDx * 1.5, eyeY - headR * 0.42); g.lineTo(eyeDx * 0.5, eyeY - headR * 0.2); g.strokePath();
    g.fillStyle(0x7b1f14, 1);
    g.fillCircle(0, headY + headR * 0.42, headR * 0.22);
  } else if (mood === 'worried') {
    g.fillCircle(-eyeDx, eyeY, headR * 0.12);
    g.fillCircle(eyeDx, eyeY, headR * 0.12);
    g.lineStyle(Math.max(2, headR * 0.12), 0x2c1810, 1);
    g.slice(0, headY + headR * 0.75, headR * 0.36, Math.PI * 1.15, Math.PI * 1.85, false);
    g.strokePath();
  } else {
    g.fillCircle(-eyeDx, eyeY, headR * 0.12);
    g.fillCircle(eyeDx, eyeY, headR * 0.12);
    g.lineStyle(Math.max(2, headR * 0.12), 0x2c1810, 1);
    g.slice(0, headY + headR * 0.1, headR * 0.42, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
  }
  return g;
}

// Облачко заказа: иконки ингредиентов сеткой, максимум 3 в ряд.
function drawBubble(scene, cont, w, topY, ids) {
  const perRow = Math.min(3, ids.length);
  const rows = Math.ceil(ids.length / 3);
  const icon = Math.min(w * 0.24, 30);
  const gap = icon * 0.28;
  const padX = icon * 0.42;
  const padY = icon * 0.36;
  const bw = perRow * icon + (perRow - 1) * gap + padX * 2;
  const bh = rows * icon + (rows - 1) * gap + padY * 2;
  const by = topY + bh / 2;

  const g = scene.add.graphics();
  g.fillStyle(THEME.colors.bubble, 1);
  g.fillRoundedRect(-bw / 2, by - bh / 2, bw, bh, 10);
  g.lineStyle(2, THEME.colors.bubbleEdge, 0.55);
  g.strokeRoundedRect(-bw / 2, by - bh / 2, bw, bh, 10);
  // Хвостик облачка вниз, к голове.
  g.fillStyle(THEME.colors.bubble, 1);
  g.fillTriangle(-icon * 0.28, by + bh / 2 - 1, icon * 0.28, by + bh / 2 - 1, 0, by + bh / 2 + icon * 0.42);
  cont.add(g);

  ids.forEach((id, i) => {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const inRow = Math.min(3, ids.length - r * 3);
    const rowW = inRow * icon + (inRow - 1) * gap;
    const x = -rowW / 2 + icon / 2 + c * (icon + gap);
    const y = by - bh / 2 + padY + icon / 2 + r * (icon + gap);
    cont.add(drawIngredientIcon(scene, x, y, icon, id));
  });
  return by + bh / 2 + icon * 0.42;   // нижняя точка облачка вместе с хвостиком
}

// ── Публичная точка: вид гостя ────────────────────────────────────────────
// Возвращает контейнер с методом refresh() — перерисовать терпение и настроение.
// Контейнер стоит в (x, y), дети живут в локальных координатах: это принципиально,
// иначе hit-area не совпадает с картинкой (грабля, уже ловленная на кнопках, см. NOTES).
export function createCustomerView(scene, customer, x, y, w, h, opts = {}) {
  const cont = scene.add.container(x, y);
  const isActive = !!opts.active;
  // Безымянный гость рисуется ОДНИМ ИЗ ДВУХ спрайтов. Второй (`guest2`) грузился с самого
  // начала «для разнообразия очереди», но нигде не выбирался — и очередь из безымянных
  // гостей выглядела как один и тот же человек, скопированный пять раз (аудит 12.08).
  // Выбор закрепляется ЗА ГОСТЕМ при первой отрисовке: иначе лицо менялось бы на каждой
  // перерисовке очереди, а она пересобирается на каждое действие игрока.
  // Лицо выбирается ЧЕРЕДОВАНИЕМ, а не монеткой: при случайном выборе три безымянных
  // гостя подряд запросто получают одно лицо (видно на кадре для магазина 12.08), и
  // очередь снова выглядит как один человек в пяти экземплярах. Счётчик живёт на сцене,
  // потому что «соседи по очереди» — это свойство сцены, а не отдельного гостя.
  if (!customer.customer && !customer._face) {
    scene._faceTurn = ((scene._faceTurn || 0) + 1) % 2;
    customer._face = scene._faceTurn ? 'guest2' : 'guest';
  }
  // КЛЮЧ СПРАЙТА И КЛЮЧ ИМЕНИ — РАЗНЫЕ. Спрайтов у безымянного гостя два (guest/guest2),
  // а имя у него одно: «Гость». Пока ключ был общим, на карточке второго лица печаталось
  // `cust_guest2` — i18n не находил такой строки и возвращал сам ключ (поймано на кадре
  // для магазина 12.08). Локализация про лица знать не обязана.
  const key = customer.customer ? customer.customer.id : (customer._face || 'guest');
  const nameKey = 'cust_' + (customer.customer ? customer.customer.id : 'guest');

  // Подложка. На фоне-картинке сплошная плашка под каждым гостем выглядит инородно —
  // гость должен СТОЯТЬ в зале, а не сидеть в коробке. Поэтому непрозрачная подложка
  // только у АКТИВНОГО (её задача — показать, кого собираем), у остальных лишь лёгкая
  // тень под ногами. Без арта (запасной путь) плашка нужна всем, иначе фигуры сливаются
  // с градиентом.
  const bg = scene.add.graphics();
  const hasArt = scene.textures && scene.textures.exists('cust_' + key);
  if (isActive) {
    bg.fillStyle(THEME.colors.panelLight, hasArt ? 0.55 : 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.lineStyle(3, THEME.colors.accent, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  } else if (!hasArt) {
    bg.fillStyle(THEME.colors.panel, 0.55);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  } else {
    bg.fillStyle(0x000000, 0.22);
    bg.fillEllipse(0, h / 2 - 30, w * 0.7, 18);
  }
  cont.add(bg);

  // Облачко заказа сверху, фигура под ним.
  const bubbleBottom = drawBubble(scene, cont, w, -h / 2 + 6, orderIcons(customer.recipe));
  const bodyTop = bubbleBottom + 2;
  const bodyH = h / 2 - 34 - bodyTop;
  // Спрайт гостя, если он загружен; иначе прежняя рисованная фигура. Ассеты не обязаны
  // быть на месте — игра должна работать и без них (так она и жила до появления арта).
  const spriteKey = 'cust_' + key;
  const hasSprite = scene.textures && scene.textures.exists(spriteKey);
  let headY, headR, face = null, moodMark = null;
  let lastMood = 'calm';

  if (hasSprite) {
    const availH = Math.max(h * 0.30, h / 2 - 52 - bodyTop);   // -52: место под имя и полоску
    const img = scene.add.image(0, bodyTop + availH / 2, spriteKey);
    const scale = Math.min((w - 10) / img.width, availH / img.height);
    img.setScale(scale);
    cont.add(img);
    headY = bodyTop + availH * 0.3;
    headR = img.displayWidth * 0.22;
  } else {
    const f = drawFigure(
      scene, cont, w, bodyTop, Math.max(bodyH, h * 0.28),
      colorFor(key), !!customer.customer   // шляпа — у постоянных гостей, у случайных нет
    );
    headY = f.headY;
    headR = f.headR;
    face = drawFace(scene, headY, headR, 'calm');
    cont.add(face);
  }

  // Имя: короткое, с переносом и ограничением по ширине — за карточку не вылезет.
  // Под ним тёмная подложка: без неё светлый текст ложится прямо на цветную одежду
  // и читается плохо (видно на скриншоте первой версии).
  const name = scene.add.text(0, h / 2 - 32, i18n.t(nameKey), {
    fontFamily: THEME.fontFamily, fontSize: 16, color: THEME.colors.text,
    align: 'center', wordWrap: { width: w - 12 }
  }).setOrigin(0.5, 1);
  const namePlate = scene.add.graphics();
  namePlate.fillStyle(0x2c1810, 0.72);
  namePlate.fillRoundedRect(-w / 2 + 4, h / 2 - 34 - name.height, w - 8, name.height + 6, 6);
  cont.add(namePlate);
  cont.add(name);

  // Полоска терпения под именем.
  const barW = w - 18;
  const bar = scene.add.graphics();
  cont.add(bar);

  cont.refresh = () => {
    const { frac, warn } = patienceFraction(customer);
    bar.clear();
    bar.fillStyle(0x000000, 0.35);
    bar.fillRoundedRect(-barW / 2, h / 2 - 24, barW, 10, 5);
    // Заказ в работе — полоска ЗОЛОТАЯ и не двигается. Без этого замерший таймер выглядел
    // бы как ещё один глюк: игрок должен видеть, что гость больше не уходит, потому что
    // его пиццу уже делают.
    const barColor = customer.inWork ? THEME.colors.accent
      : (warn ? THEME.colors.danger : THEME.colors.success);
    bar.fillStyle(barColor, 1);
    bar.fillRoundedRect(-barW / 2, h / 2 - 24, Math.max(0, barW * frac), 10, 5);

    const mood = customer.inWork ? 'calm' : moodFor(frac);   // заказ делают — гость спокоен
    if (mood !== lastMood) {
      lastMood = mood;
      if (face) {
        // Рисованная фигура — меняем само лицо.
        face.destroy();
        face = drawFace(scene, headY, headR, mood);
        cont.add(face);
      } else {
        // Спрайт нарисован с одним выражением, поэтому настроение показываем ЗНАЧКОМ
        // у головы: капля пота на тревоге, восклицание на злости. Это дешевле трёх
        // листов персонажей и не зависит от того, совпали ли позы между листами.
        if (moodMark) { moodMark.destroy(); moodMark = null; }
        if (mood !== 'calm') {
          const g = scene.add.graphics();
          const mx = w * 0.3;
          const my = headY - headR * 0.5;
          const angry = mood === 'angry';
          g.fillStyle(angry ? THEME.colors.danger : THEME.colors.accent, 1);
          g.fillCircle(mx, my, 13);
          g.lineStyle(3, 0x2c1810, 0.6);
          g.strokeCircle(mx, my, 13);
          g.fillStyle(0xffffff, 1);
          g.fillRect(mx - 2, my - 7, 4, angry ? 8 : 6);
          g.fillCircle(mx, my + 6, 2.4);
          moodMark = g;
          cont.add(g);
        }
      }
    }
  };
  cont.refresh();

  // Заказ этого гостя уже печётся: выбрать его нельзя, и это должно быть ВИДНО —
  // иначе игрок тапает по единственному гостю в очереди и не понимает, почему тихо.
  if (opts.baking) {
    const mark = scene.add.graphics();
    mark.fillStyle(0x000000, 0.45);
    mark.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    cont.add(mark);
    const label = scene.add.text(0, 0, i18n.t('inOven'), {
      fontFamily: THEME.fontFamily, fontSize: 15, color: THEME.colors.accentText,
      align: 'center', fontStyle: 'bold', wordWrap: { width: w - 12 }
    }).setOrigin(0.5);
    cont.add(label);
  }

  cont.setSize(w, h);
  if (opts.onTap) {
    cont.setInteractive({ useHandCursor: true });
    cont.on('pointerup', () => opts.onTap());
  }
  return cont;
}
