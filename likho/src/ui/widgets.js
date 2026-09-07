// Мелкие общие элементы интерфейса: панель с обводкой, полоса здоровья, значок наговора,
// строка ресурса. Всё берёт цвета из THEME — своих цветов виджеты не изобретают.
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { statusName } from './cardText.js';

// Панель с обводкой. Возвращает graphics — его можно класть в контейнер.
export function panel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  const r = opts.radius ?? THEME.radius;
  g.fillStyle(opts.fill ?? THEME.colors.panel, opts.alpha ?? 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  if (opts.stroke !== false) {
    g.lineStyle(opts.lineWidth ?? 2, opts.stroke ?? THEME.colors.stroke, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
  }
  return g;
}

// Полоса здоровья с числом. Возвращает объект с методом set(hp, maxHp, block).
export function hpBar(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  const label = scene.add.text(x, y, '', {
    fontFamily: THEME.fontUi, fontSize: opts.fontSize || THEME.fontSize.tiny, color: THEME.colors.text,
  }).setOrigin(0.5);
  label.setStroke(THEME.textStroke.color, 4);

  const shield = scene.add.text(x - w / 2 - 6, y, '', {
    fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.infoText, fontStyle: 'bold',
  }).setOrigin(1, 0.5);
  shield.setStroke(THEME.textStroke.color, 4);

  function set(hp, maxHp, block) {
    const p = Math.max(0, Math.min(1, maxHp ? hp / maxHp : 0));
    g.clear();
    g.fillStyle(THEME.colors.panelDark, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    if (p > 0) {
      g.fillStyle(p > 0.3 ? THEME.colors.success : THEME.colors.danger, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, Math.max(h, w * p), h, h / 2);
    }
    g.lineStyle(2, THEME.colors.stroke, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    label.setText(hp + ' / ' + maxHp);
    shield.setText(block > 0 ? '🛡' + block : '');
  }

  return { set, g, label, shield, destroy: () => { g.destroy(); label.destroy(); shield.destroy(); } };
}

// Ряд значков наговоров под сущностью. `set(statuses)` перерисовывает.
const STATUS_COLOR = {
  vuln: THEME.colors.dangerText, weak: THEME.colors.neutralText, frail: THEME.colors.neutralText,
  poison: THEME.colors.poisonText, str: THEME.colors.accentText, dex: THEME.colors.infoText,
  thorns: THEME.colors.accentText, regen: THEME.colors.successText, barrier: THEME.colors.infoText,
  guard: THEME.colors.infoText, venom: THEME.colors.poisonText, energyUp: THEME.colors.accentText,
  extraDraw: THEME.colors.infoText, stun: THEME.colors.accentText,
};
export const STATUS_SIGN = {
  vuln: '▽', weak: '↓', frail: '✂', poison: '☠', str: '⚔', dex: '◇',
  thorns: '✳', regen: '✚', barrier: '⌂', guard: '▣', venom: '≈',
  energyUp: '⚡', extraDraw: '👁', stun: '✖',
};

export function statusRow(scene, x, y, opts = {}) {
  const items = [];
  const size = opts.fontSize || THEME.fontSize.tiny;

  function set(statuses) {
    items.forEach((t) => t.destroy());
    items.length = 0;
    const keys = Object.keys(statuses || {}).filter((k) => statuses[k]);
    const step = 46;
    const total = keys.length * step;
    keys.forEach((k, i) => {
      const t = scene.add.text(x - total / 2 + i * step + step / 2, y,
        (STATUS_SIGN[k] || '•') + statuses[k], {
          fontFamily: THEME.fontUi, fontSize: size, color: STATUS_COLOR[k] || THEME.colors.text,
        }).setOrigin(0.5);
      t.setStroke(THEME.textStroke.color, 4);
      t.setInteractive({ useHandCursor: true });
      // Подсказка по тапу: игрок обязан иметь способ узнать, что значит значок, не выходя
      // из боя. Без этого «▽3» — шум, и половина тактики жанра проходит мимо игрока.
      t.on('pointerup', () => opts.onTap && opts.onTap(k, statuses[k]));
      items.push(t);
    });
  }

  return { set, destroy: () => items.forEach((t) => t.destroy()) };
}

// Всплывающее число (урон, лечение, броня) — короткая анимация вверх.
export function popNumber(scene, x, y, text, color) {
  const t = scene.add.text(x, y, text, {
    fontFamily: THEME.fontUi, fontSize: THEME.fontSize.big, color: color || THEME.colors.text, fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(500);
  t.setStroke(THEME.textStroke.color, 6);
  scene.tweens.add({
    targets: t, y: y - 70, alpha: 0, duration: 850, ease: 'Cubic.Out',
    onComplete: () => t.destroy(),
  });
  return t;
}

// Короткое сообщение по центру экрана (ошибка, подсказка). `opts.wrap` — ширина
// переноса строк, `opts.delay` — сколько сообщение висит до затухания (мс).
export function toast(scene, message, opts = {}) {
  const { width, height } = scene.scale;
  const t = scene.add.text(width / 2, height * 0.42, message, {
    fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text,
    backgroundColor: '#00000099', padding: { x: 18, y: 10 }, align: 'center',
    wordWrap: { width: opts.wrap || 600 },
  }).setOrigin(0.5).setDepth(900);
  scene.tweens.add({ targets: t, alpha: 0, delay: opts.delay ?? 900, duration: 400, onComplete: () => t.destroy() });
}

// Имя + число + что наговор МЕХАНИЧЕСКИ делает (st_<key>_desc). Дольше висит
// и шире переносится, чем обычный тост — это не ошибка, а объяснение по запросу.
export function statusHint(scene, key, value) {
  const desc = i18n.t('st_' + key + '_desc');
  const text = statusName(key) + ' ' + value + (desc ? ' — ' + desc : '');
  toast(scene, text, { wrap: 560, delay: 2600 });
}

// Строка «значок + число» для шапки (золото, память, здоровье).
export function chip(scene, x, y, sign, color) {
  const t = scene.add.text(x, y, sign, {
    fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: color || THEME.colors.text,
  }).setOrigin(0, 0.5);
  t.setStroke(THEME.textStroke.color, 4);
  t.setValue = (v) => t.setText(sign + ' ' + v);
  return t;
}

// Подпись-заголовок экрана в общем стиле.
export function heading(scene, x, y, text, opts = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: THEME.fontFamily,
    fontSize: opts.fontSize || THEME.fontSize.big,
    color: opts.color || THEME.colors.text,
    fontStyle: 'bold', align: 'center', wordWrap: { width: opts.wrap || 640 },
  }).setOrigin(0.5);
  t.setStroke(THEME.textStroke.color, THEME.textStroke.thickness);
  return t;
}

export function bodyText(scene, x, y, text, opts = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: THEME.fontFamily,
    fontSize: opts.fontSize || THEME.fontSize.small,
    color: opts.color || THEME.colors.textDim,
    align: opts.align || 'center', wordWrap: { width: opts.wrap || 620 },
    lineSpacing: 6,
  }).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
  return t;
}

export function actLabel(act) {
  return i18n.t('actLabel', { n: act, name: i18n.t('actName' + act) });
}
