// КОЛОНКА ЗАГОТОВОК: что лежит на столе, кроме той пиццы, что сейчас в руках.
//
// Стоит СЛЕВА, симметрично слотам печи справа: слева от доски пиццы свободна полоса
// шириной примерно четверть экрана (доска кончается на 0.46·w − r − 26 ≈ 0.235·w),
// и до этой задачи она пустовала.
//
// Что видит игрок на каждом месте: маленькую пиццу ровно в том же виде, что и большую
// (те же слои — тесто, соус, сыр, топпинги), плюс иконку текущего этапа. Активное место
// обведено акцентом. Пустое — тонкий контур: игрок должен видеть, что место ЕСТЬ, иначе
// апгрейд «третье место» окажется незаметным.
//
// Сцена только зовёт drawPrepColumn и складывает результат в контейнер; правил игры
// модуль не знает.
import { THEME } from '../ui/theme.js';
import { drawPizzaInto } from './pizza.js';
import { drawStageIcon } from './icons.js';

// Геометрия колонки. Считается по вьюпорту, чтобы раскладка не зависела от 720×1280.
//
// Промежуток между местами НЕ декоративный: значок этапа висит снизу-справа от кружка, и
// при тесном шаге он наезжал на соседнее место — на скриншоте два места читались как одна
// клякса. Шаг подобран так, чтобы значок помещался в промежуток целиком.
export function prepColumnLayout(width, height, count) {
  const size = Math.min(72, width * 0.10);
  const gap = size * 0.35;
  const total = count * size + (count - 1) * gap;
  return {
    size,
    gap,
    total,
    x: width * 0.105,
    y0: height * 0.60 - total / 2 + size / 2   // центр колонки — на высоте пиццы
  };
}

// entries — массив мест стола (entry | null), в порядке слотов.
// onTap(index) вызывается тапом по ЗАНЯТОМУ месту.
// snapshotOf(pizza) — функция снимка пиццы (сцена передаёт pizzaSnapshot, чтобы модуль
// не тянул за собой mechanics/kitchen).
export function drawPrepColumn(scene, entries, activeIndex, opts) {
  const { width, height } = scene.scale;
  const { snapshotOf, onTap } = opts;
  const L = prepColumnLayout(width, height, entries.length);
  const cont = scene.add.container(0, 0);

  // Подложка под всю колонку: без неё кружки висели в воздухе поверх фона-картинки и
  // читались как случайный мусор, а не как рабочий стол.
  const board = scene.add.graphics();
  const bw = L.size + 22;
  const bh = L.total + 22;
  board.fillStyle(THEME.colors.panel, 0.55);
  board.fillRoundedRect(L.x - bw / 2, L.y0 - L.size / 2 - 11, bw, bh, 16);
  cont.add(board);

  entries.forEach((entry, i) => {
    const x = L.x;
    const y = L.y0 + i * (L.size + L.gap);
    const r = L.size / 2;

    const g = scene.add.graphics();
    if (!entry) {
      // Пустое место: контур и ничего больше.
      g.lineStyle(3, THEME.colors.panelLight, 0.75);
      g.strokeCircle(x, y, r);
      cont.add(g);
      return;
    }

    // Подложка-доска под мини-пиццу — иначе тесто теряется на фоне-картинке.
    g.fillStyle(THEME.colors.panel, 0.9);
    g.fillCircle(x, y, r + 4);
    cont.add(g);

    const pg = scene.add.graphics();
    drawPizzaInto(pg, snapshotOf(entry.pizza), { x, y, r: r - 5 });
    cont.add(pg);

    // Обводка: активное место — акцентом и толще, остальные — тонким контуром.
    const ring = scene.add.graphics();
    const active = i === activeIndex;
    ring.lineStyle(active ? 5 : 3, active ? THEME.colors.accent : THEME.colors.panelLight, 1);
    ring.strokeCircle(x, y, r + 4);
    cont.add(ring);

    // Значок этапа снизу-справа: по нему видно, на чём заготовка стоит, не открывая её.
    const st = entry.pizza.inOven ? 'oven' : entry.pizza.stage;
    // Состояние 'plain', а не 'current'/'past': кольцо акцентом уже занято под «активное
    // место», а галочка означала бы «этап пройден» и врала бы про состояние заготовки.
    cont.add(drawStageIcon(scene, x + r * 0.72, y + r * 0.72, r * 0.62, st, 'plain'));

    // Тап по занятому месту переключает работу. Зона больше кружка: попасть пальцем
    // по 60 px на телефоне тяжело.
    const zone = scene.add.zone(x, y, L.size + 16, L.size + 16).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => onTap(i));
    cont.add(zone);
    zone._prepIndex = i;    // по нему обучение и тесты находят нужное место
  });

  return cont;
}
