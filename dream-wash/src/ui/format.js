// Компактный формат больших чисел для HUD и магазина: 12400 -> "12.4K".
// Общий хелпер, чтобы не дублировать в GameScene.js и ShopOverlay.js.
export function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(n < 10000000 ? 1 : 0) + 'M';
}
