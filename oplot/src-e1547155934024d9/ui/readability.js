// Minimum is measured in CSS pixels after FIT, not in the 1280x720 design grid.
export function readableFont(size, width, height) {
  const requested = Number.parseFloat(size) || 16;
  const w = Math.max(width, height), h = Math.min(width, height);
  const scale = Math.min(w / 1280, h / 720);
  return Math.max(requested, Math.ceil(15 / Math.max(.15, scale)));
}

export function installReadableText(scene) {
  if (scene.add._oplotReadable) return;
  scene.add._oplotReadable = true;
  const texts = new Map();
  const font = size => readableFont(size, window.innerWidth, window.innerHeight);
  const original = scene.add.text.bind(scene.add);
  scene.add.text = (x, y, text, style = {}) => {
    const object = original(x, y, text, {...style, fontSize:font(style.fontSize)});
    const setFontSize = object.setFontSize.bind(object);
    texts.set(object, style.fontSize);
    object.once('destroy', () => texts.delete(object));
    object.setFontSize = size => { texts.set(object, size); return setFontSize(font(size)); };
    object.refreshReadableFont = () => { setFontSize(font(texts.get(object))); object.emit('readability'); };
    return object;
  };
  scene.scale.on('resize', () => { for (const object of texts.keys()) object.refreshReadableFont(); });
}
