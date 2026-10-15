// A cross-origin VK desktop shell may keep its iframe wider than the browser.
// Observe the fixed HTML viewport, not the canvas whose size we change, to avoid
// feedback. IntersectionObserver clips through ancestor frames without parent DOM access.
export function setupVisibleViewport(game, platform, win = window) {
  if (platform !== 'vk' || win === win.parent || !win.IntersectionObserver) return () => {};
  const doc = win.document, host = doc.getElementById('game');
  if (!host) return () => {};
  const previous = host.getAttribute('style');
  let last = '';
  const observer = new win.IntersectionObserver(entries => {
    const rect = entries[0]?.intersectionRect;
    // A hidden tab/frame must retain its last usable layout.
    if (!rect || rect.width < 1 || rect.height < 1) return;
    const width = Math.min(win.innerWidth, rect.width);
    const height = Math.min(win.innerHeight, rect.height);
    const left = Math.max(0, rect.x), top = Math.max(0, rect.y);
    const key = [left, top, width, height].join(':');
    if (key === last) return;
    last = key;
    Object.assign(host.style, { position: 'absolute', left: left + 'px', top: top + 'px',
      width: width + 'px', height: height + 'px' });
    game.scale.getParentBounds();
    game.scale.refresh();
  }, { threshold: Array.from({ length: 1001 }, (_, i) => i / 1000) });
  const observe = () => {
    // A full frame can change size while its intersection ratio stays exactly 1.
    observer.disconnect();
    observer.observe(doc.documentElement);
  };
  observe();
  win.addEventListener('resize', observe);
  win.addEventListener('orientationchange', observe);
  win.visualViewport?.addEventListener('resize', observe);
  const cleanup = () => {
    observer.disconnect();
    win.removeEventListener('resize', observe);
    win.removeEventListener('orientationchange', observe);
    win.visualViewport?.removeEventListener('resize', observe);
    if (previous === null) host.removeAttribute('style');
    else host.setAttribute('style', previous);
  };
  game.events.once('destroy', cleanup);
  return cleanup;
}
