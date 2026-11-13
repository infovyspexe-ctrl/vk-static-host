// Раскладка редактора в игровых пикселях 1280×720.
// Шрифты считаются так же, как readableFont после FIT: на телефоне они крупнее,
// и прежние доли высоты сажали подпись противника на кнопку «Обзор».
import { readableFont } from './readability.js';

export const PHONE_CELL_CSS = 52;

function intersects(a, b) {
  return a.x < b.x + b.w - 0.5 && a.x + a.w > b.x + 0.5 && a.y < b.y + b.h - 0.5 && a.y + a.h > b.y + 0.5;
}

export function boxesOverlap(boxes) {
  const keys = Object.keys(boxes);
  const hits = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (intersects(boxes[keys[i]], boxes[keys[j]])) hits.push(keys[i] + '+' + keys[j]);
    }
  }
  return hits;
}

export function controlWidth(label, fontPx, padX = 14) {
  return Math.ceil(String(label).length * fontPx * 0.58 + padX * 2);
}

// После создания кнопок их реальная ширина может разойтись с оценкой.
// Раздвигаем центры, не выталкивая край за экран.
export function spreadCenters(width, items, gap = 8) {
  const row = items.map(item => ({ ...item })).sort((a, b) => a.x - b.x);
  for (let i = 1; i < row.length; i++) {
    const min = row[i - 1].x + row[i - 1].w / 2 + gap + row[i].w / 2;
    if (row[i].x < min) row[i].x = min;
  }
  const edges = () => ({
    left: row[0].x - row[0].w / 2,
    right: row[row.length - 1].x + row[row.length - 1].w / 2,
  });
  let box = edges();
  if (box.right > width - gap) {
    const shift = box.right - (width - gap);
    for (const item of row) item.x -= shift;
  }
  box = edges();
  if (box.left < gap) {
    const shift = Math.min(gap - box.left, Math.max(0, width - gap - box.right));
    for (const item of row) item.x += shift;
  }
  return row;
}

export function closeZoom(cellSize, cssScale) {
  return Math.max(1.2, PHONE_CELL_CSS / (Math.max(1, cellSize) * Math.max(cssScale, 0.15)));
}

export function editorLayout({
  gameWidth = 1280,
  gameHeight = 720,
  viewWidth,
  viewHeight,
  labels,
}) {
  const cssScale = Math.min(viewWidth / gameWidth, viewHeight / gameHeight);
  const font = px => readableFont(px, viewWidth, viewHeight);
  const line = px => font(px) * 1.25;
  const plateW = Math.min(400, gameWidth * 0.32);
  const plateH = Math.max(96, line(28) + line(36) + 16);
  const plate = { x: (gameWidth - plateW) / 2, y: 8, w: plateW, h: plateH };
  const buttonH = line(20) + 18;
  const zoneLeft = plate.x + plate.w + 10;
  const zoneRight = gameWidth - 10;
  const helpW = controlWidth(labels.help, font(20));
  const overviewW = controlWidth(labels.overview, font(20));
  let help;
  let overview;
  let rowH = plateH;
  if (helpW + overviewW + 8 <= zoneRight - zoneLeft) {
    const y = plate.y + (plateH - buttonH) / 2;
    help = { x: zoneLeft, y, w: helpW, h: buttonH };
    overview = { x: zoneLeft + helpW + 8, y, w: overviewW, h: buttonH };
  } else {
    const w = Math.min(zoneRight - zoneLeft, Math.max(helpW, overviewW));
    const x = zoneRight - w;
    help = { x, y: plate.y, w, h: buttonH };
    overview = { x, y: plate.y + buttonH + 6, w, h: buttonH };
    rowH = Math.max(plateH, buttonH * 2 + 6);
  }
  const intel = { x: 12, y: plate.y + 4, w: Math.max(80, plate.x - 24), h: rowH - 8 };
  const fieldTop = plate.y + rowH + 10;
  const icon = Math.min(gameWidth / 10 - 22, Math.max(68, 44 / Math.max(cssScale, 0.2)));
  const priceH = line(22);
  const ctrlH = Math.min(72, Math.max(line(22) + 16, 34 / Math.max(cssScale, 0.2)));
  const paletteH = icon + priceH + ctrlH + 28;
  const panelTop = gameHeight - paletteH;
  const rowCenter = panelTop + 10 + icon / 2;
  const priceTop = rowCenter + icon / 2 + 4;
  const ctrlY = gameHeight - 8 - ctrlH / 2;
  const fieldBottom = panelTop;
  return {
    cssScale,
    closeByDefault: cssScale < 0.92,
    fieldTop,
    fieldBottom,
    panelTop,
    rows: (fieldBottom - fieldTop) * cssScale / PHONE_CELL_CSS,
    iconCss: icon * cssScale,
    plate,
    intel,
    help,
    overview,
    palette: {
      icon,
      colW: gameWidth / 10,
      rowCenter,
      priceTop,
      ctrlY,
      ctrlH,
      hitW: gameWidth / 10 - 8,
      hitH: icon + priceH + 6,
    },
    overlaps: boxesOverlap({ intel, plate, help, overview }),
  };
}

// Экран победы: инструкция обучения не должна входить в карты награды.
export function resultStack({ width, height, instructionH, titleH, rewardH, top = 108 }) {
  let cardW = Math.min(width * 0.26, height * 0.34);
  for (let attempt = 0; attempt < 8; attempt++) {
    const cardH = cardW * 1.15;
    const exchangeY = height - 22;
    const cardBottomLimit = exchangeY - 36;
    const cardsY = cardBottomLimit - cardH / 2;
    const instructionY = cardsY - cardH / 2 - 14 - instructionH / 2;
    const rewardY = instructionY - instructionH / 2 - 10 - rewardH / 2;
    const titleY = rewardY - rewardH / 2 - 8 - titleH / 2;
    const fits = titleY - titleH / 2 >= top && cardsY - cardH / 2 > instructionY + instructionH / 2;
    if (fits) return { cardW, cardsY, instructionY, rewardY, titleY, exchangeY };
    cardW *= 0.9;
  }
  return { cardW, cardsY: height * 0.66, instructionY: height * 0.4, rewardY: height * 0.28, titleY: height * 0.16, exchangeY: height - 22 };
}
