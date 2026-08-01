// ГЕОМЕТРИЯ МИРА: разрез озера в пикселях. Один источник координат
// для отрисовки (world.js) и геймплея (GameScene). Метры -> пиксели.
import { ZONES } from '../data/balance.js';

export const BASE_W = 720;
export const BASE_H = 1280;

export const PX_PER_M = 22;          // масштаб: 1 метр глубины = 22 пикселя
export const SURFACE_Y = 380;        // y поверхности полного озера
export const BOTTOM_PAD = 260;       // порода под дном

export const TOTAL_DEPTH = ZONES.reduce((s, z) => s + z.depth, 0);
export const LAKE_BOTTOM_Y = SURFACE_Y + TOTAL_DEPTH * PX_PER_M;
export const WORLD_H = LAKE_BOTTOM_Y + BOTTOM_PAD;

export function yFromDepth(m) { return SURFACE_Y + m * PX_PER_M; }
export function depthFromY(y) { return (y - SURFACE_Y) / PX_PER_M; }

// Верхняя глубина зоны i (в метрах).
export function zoneTopDepth(i) {
  let acc = 0;
  for (let k = 0; k < i; k++) acc += ZONES[k].depth;
  return acc;
}

export function zoneIndexAtDepth(d) {
  let acc = 0;
  for (let i = 0; i < ZONES.length; i++) {
    acc += ZONES[i].depth;
    if (d < acc - 1e-9) return i;
  }
  return ZONES.length - 1;
}

// Стенки котлована: озеро сужается с глубиной (ступень на зону).
// Пологая воронка: ступень 15 px на сторону (была 26), чтобы дно не превращалось
// в щель. Ширина поля по зонам 0..6: 492 → 312 (было 492 → 180). Всё привязано
// к этим функциям (игрок, акула, сундуки, сливы, рыбка), поэтому меняем ТОЛЬКО их —
// остальное переезжает само, размеры объектов и механика не трогаются.
export function wallLeft(zoneIndex) { return 132 + zoneIndex * 15; }
export function wallRight(zoneIndex) { return BASE_W - 96 - zoneIndex * 15; }

export function wallLeftAtY(y) {
  if (y <= SURFACE_Y) return wallLeft(0);
  return wallLeft(zoneIndexAtDepth(Math.min(depthFromY(y), TOTAL_DEPTH - 0.01)));
}

export function wallRightAtY(y) {
  if (y <= SURFACE_Y) return wallRight(0);
  return wallRight(zoneIndexAtDepth(Math.min(depthFromY(y), TOTAL_DEPTH - 0.01)));
}

// Сливы-чекпоинты стоят на уступах этих зон (не каждой — беготня часть игры).
export const DRAIN_ZONES = [0, 2, 4, 6];

// Позиция слива зоны z: НА земле уступа (низ спрайта = y, ничего не парит).
export function drainPos(zoneIndex) {
  const y = zoneIndex === 0 ? SURFACE_Y - 14 : yFromDepth(zoneTopDepth(zoneIndex)) - 4;
  return { x: wallLeft(zoneIndex) - 52, y };
}

// Активный слив для текущего уровня воды: самый глубокий уже ОТКРЫТЫЙ
// (вода дошла до его зоны) чекпоинт не ниже поверхности.
export function activeDrainZone(surfaceZoneIndex) {
  let best = 0;
  for (const z of DRAIN_ZONES) { if (z <= surfaceZoneIndex) best = z; }
  return best;
}
