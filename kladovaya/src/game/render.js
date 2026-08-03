// ОТРИСОВКА. Канвас 720×1280, масштабирование FIT с центрированием (без
// деформации — требование модерации), DPR до 2. Все цвета и шрифты — из THEME,
// все тексты — через i18n. Кнопки оверлеев вписываются в LAYOUT, чтобы ввод
// сверялся с реально нарисованным.
import { CONFIG } from '../data/config.js';
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { LAYOUT } from '../ui/layout.js';
import { Physics } from './physics.js';
import { Game } from './game.js';
import { Pantry } from './pantry.js';
import { Audio } from '../core/audio.js';
import { COLLECTIONS, SEASON_BONUS } from '../data/collections.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { Assets } from './assets.js';

const C = THEME.colors;

function font(kind) { return THEME.font[kind] + ' ' + THEME.fontFamily; }

export const Render = {
  canvas: null,
  ctx: null,
  _scale: 1,
  _bg: null,        // кэш фона (градиент + виньетка), рисуется один раз
  _sprites: {},     // кэш спрайтов плодов: 'fruit_3' -> offscreen canvas

  // Вертикальный градиент-заливка
  vgrad(x, y, h, top, bottom, ctx = this.ctx) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    return g;
  },

  // Текст с мягкой тенью — читается на любом фоне
  text(str, x, y, { font: f, color, align = 'left', baseline = 'alphabetic' } = {}) {
    const ctx = this.ctx;
    if (f) ctx.font = f;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = C.textShadow;
    ctx.fillText(str, x + 2, y + 3);
    ctx.fillStyle = color || C.text;
    ctx.fillText(str, x, y);
    ctx.textBaseline = 'alphabetic';
  },

  // Панель с градиентом, рамкой и внешней тенью
  panelRect(x, y, w, h, r, { top = C.panelTop, bottom = C.panelBottom, shadow = true } = {}) {
    const ctx = this.ctx;
    ctx.save();
    if (shadow) {
      ctx.shadowColor = C.shadow;
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 8;
    }
    this.rr(x, y, w, h, r);
    ctx.fillStyle = this.vgrad(x, y, h, top, bottom);
    ctx.fill();
    ctx.restore();
    this.rr(x, y, w, h, r);
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Светлая кромка сверху
    this.rr(x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 3));
    ctx.strokeStyle = 'rgba(255, 235, 200, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const scale = Math.min(window.innerWidth / CONFIG.W, window.innerHeight / CONFIG.H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._scale = scale;
    this.canvas.style.width = CONFIG.W * scale + 'px';
    this.canvas.style.height = CONFIG.H * scale + 'px';
    this.canvas.width = Math.round(CONFIG.W * scale * dpr);
    this.canvas.height = Math.round(CONFIG.H * scale * dpr);
    this.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  },

  // Клиентские координаты -> логические 720×1280.
  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * CONFIG.W,
      y: (clientY - rect.top) / rect.height * CONFIG.H
    };
  },

  rr(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // Виньетка отдельным прозрачным слоем — ложится и на арт-фон, и на кодовый.
  _vinCache: null,
  drawVignette() {
    if (!this._vinCache) {
      const off = document.createElement('canvas');
      off.width = CONFIG.W;
      off.height = CONFIG.H;
      const o = off.getContext('2d');
      const vin = o.createRadialGradient(CONFIG.W / 2, CONFIG.H / 2, CONFIG.H * 0.35,
        CONFIG.W / 2, CONFIG.H / 2, CONFIG.H * 0.75);
      vin.addColorStop(0, 'rgba(0,0,0,0)');
      vin.addColorStop(1, 'rgba(0,0,0,0.34)');
      o.fillStyle = vin;
      o.fillRect(0, 0, CONFIG.W, CONFIG.H);
      this._vinCache = off;
    }
    this.ctx.drawImage(this._vinCache, 0, 0);
  },

  // Фон: сгенерированный арт погреба (assets/bg.jpg), пока грузится — тёплый
  // градиент кодом. Поверх обоих — виньетка и лёгкое затемнение зоны HUD,
  // чтобы текст читался на пёстрых полках.
  drawBackground() {
    const art = Assets.img('bg');
    if (art) {
      this.ctx.drawImage(art, 0, 0, CONFIG.W, CONFIG.H);
      // Затемнение зоны HUD сверху и пояса подвеса над крынкой: пёстрые полки
      // не должны спорить с текстом и летящим плодом.
      const hudShade = this.vgrad(0, 0, 240, 'rgba(20,10,4,0.5)', 'rgba(20,10,4,0)');
      this.ctx.fillStyle = hudShade;
      this.ctx.fillRect(0, 0, CONFIG.W, 240);
      const dropShade = this.vgrad(0, 230, CONFIG.WALL_TOP_Y - 230,
        'rgba(20,10,4,0.05)', 'rgba(20,10,4,0.45)');
      this.ctx.fillStyle = dropShade;
      this.ctx.fillRect(0, 230, CONFIG.W, CONFIG.WALL_TOP_Y - 230);
      this.drawVignette();
      return;
    }
    if (!this._bg) {
      const off = document.createElement('canvas');
      off.width = CONFIG.W;
      off.height = CONFIG.H;
      const o = off.getContext('2d');
      o.fillStyle = this.vgrad(0, 0, CONFIG.H, C.bgTop, C.bgBottom, o);
      o.fillRect(0, 0, CONFIG.W, CONFIG.H);
      // Тёплый свет над крынкой
      const light = o.createRadialGradient(CONFIG.W / 2, 500, 80, CONFIG.W / 2, 500, 620);
      light.addColorStop(0, 'rgba(255, 200, 120, 0.10)');
      light.addColorStop(1, 'rgba(255, 200, 120, 0)');
      o.fillStyle = light;
      o.fillRect(0, 0, CONFIG.W, CONFIG.H);
      // Виньетка
      const vin = o.createRadialGradient(CONFIG.W / 2, CONFIG.H / 2, CONFIG.H * 0.35,
        CONFIG.W / 2, CONFIG.H / 2, CONFIG.H * 0.75);
      vin.addColorStop(0, 'rgba(0,0,0,0)');
      vin.addColorStop(1, 'rgba(0,0,0,0.34)');
      o.fillStyle = vin;
      o.fillRect(0, 0, CONFIG.W, CONFIG.H);
      this._bg = off;
    }
    this.ctx.drawImage(this._bg, 0, 0);
  },

  draw() {
    this.drawBackground();
    this.drawBarrel();
    this.drawEvolutionRails();
    this.drawDeathLine();
    this.drawFruits();
    this.drawCurrent();
    if (Game.captureMode) this.drawCaptureHint();
    this.drawHud();
    this.drawFloaters();
    if (Game.tutorialActive && Game.state === 'playing' && !Game.pantryOpen) this.drawTutorial();
    this.drawToast();

    // Отладка контуров физики: ?debug=shapes в адресе
    if (this._debugShapes === undefined) {
      this._debugShapes = new URLSearchParams(location.search).get('debug') === 'shapes';
    }
    if (this._debugShapes) this.drawColliders();

    // Оверлеи. Список кнопок пересобирается каждый кадр: нет оверлея — нет кнопок.
    LAYOUT.overlayButtons = [];
    if (Game.pantryOpen) this.drawPantry();
    else if (Game.state === 'over') this.drawGameOver();
  },

  // ---- Сцена ----------------------------------------------------------------

  drawBarrel() {
    const ctx = this.ctx;
    const top = CONFIG.WALL_TOP_Y, floor = CONFIG.FLOOR_Y;
    const iw = CONFIG.INNER_RIGHT - CONFIG.INNER_LEFT;

    // Тень всей крынки на фоне — отделяет её от арт-задника
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 30;
    this.rr(CONFIG.INNER_LEFT - CONFIG.WALL_T, top - 14,
      iw + CONFIG.WALL_T * 2, floor - top + 14 + CONFIG.WALL_T, 10);
    ctx.fillStyle = C.woodDark;
    ctx.fill();
    ctx.restore();

    // Внутренность: градиент вглубь + тени от стенок
    ctx.fillStyle = this.vgrad(0, top, floor - top, C.barrelInnerTop, C.barrelInnerBottom);
    ctx.fillRect(CONFIG.INNER_LEFT, top, iw, floor - top);
    for (const [x0, x1] of [[CONFIG.INNER_LEFT, CONFIG.INNER_LEFT + 46],
                            [CONFIG.INNER_RIGHT, CONFIG.INNER_RIGHT - 46]]) {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.28)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(x0, x1), top, 46, floor - top);
    }
    // Тень на дне
    const fg = ctx.createLinearGradient(0, floor - 60, 0, floor);
    fg.addColorStop(0, 'rgba(0,0,0,0)');
    fg.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = fg;
    ctx.fillRect(CONFIG.INNER_LEFT, floor - 60, iw, 60);

    // Стенки: дерево с горизонтальным градиентом и швами досок
    const wallH = floor - top + 14 + CONFIG.WALL_T;
    for (const side of ['l', 'r']) {
      const wx = side === 'l' ? CONFIG.INNER_LEFT - CONFIG.WALL_T : CONFIG.INNER_RIGHT;
      const g = ctx.createLinearGradient(wx, 0, wx + CONFIG.WALL_T, 0);
      if (side === 'l') {
        g.addColorStop(0, C.woodTop); g.addColorStop(1, C.woodBottom);
      } else {
        g.addColorStop(0, C.woodBottom); g.addColorStop(1, C.woodTop);
      }
      this.rr(wx, top - 14, CONFIG.WALL_T, wallH, 10);
      ctx.fillStyle = g;
      ctx.fill();
      // Швы досок
      ctx.strokeStyle = 'rgba(30, 18, 8, 0.35)';
      ctx.lineWidth = 2;
      for (let y = top + 120; y < floor - 40; y += 160) {
        ctx.beginPath();
        ctx.moveTo(wx + 6, y);
        ctx.lineTo(wx + CONFIG.WALL_T - 6, y + 8);
        ctx.stroke();
      }
      // Светлая кромка сверху стенки
      this.rr(wx, top - 14, CONFIG.WALL_T, 10, 5);
      ctx.fillStyle = C.woodLight;
      ctx.fill();
    }

    // Пол: доски с градиентом
    const fx = CONFIG.INNER_LEFT - CONFIG.WALL_T / 2;
    const fw = iw + CONFIG.WALL_T;
    ctx.fillStyle = this.vgrad(0, floor, CONFIG.WALL_T, C.woodTop, C.woodBottom);
    ctx.fillRect(fx, floor, fw, CONFIG.WALL_T);
    ctx.strokeStyle = 'rgba(30, 18, 8, 0.35)';
    ctx.lineWidth = 2;
    for (let x = fx + 90; x < fx + fw - 30; x += 110) {
      ctx.beginPath();
      ctx.moveTo(x, floor + 6);
      ctx.lineTo(x + 6, floor + CONFIG.WALL_T - 6);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 235, 200, 0.14)';
    ctx.fillRect(fx, floor, fw, 4);
  },

  // Линейка слияний на стенках крынки: фрукты слева, овощи справа, снизу
  // вверх от мелкого к крупному. Новичку сразу видно, что во что растёт.
  drawEvolutionRails() {
    const ctx = this.ctx;
    const y0 = CONFIG.FLOOR_Y - 40, step = 118;
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let rank = 0; rank < 7; rank++) {
      const y = y0 - rank * step;
      const size = 22 + rank * 2.5;
      this.drawFruitIcon('fruit', rank, CONFIG.INNER_LEFT - CONFIG.WALL_T / 2, y, size);
      this.drawFruitIcon('veg', rank, CONFIG.INNER_RIGHT + CONFIG.WALL_T / 2, y, size);
      if (rank < 6) {
        ctx.font = 'bold 14px ' + THEME.fontFamily;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 235, 200, 0.45)';
        ctx.fillText('▲', CONFIG.INNER_LEFT - CONFIG.WALL_T / 2, y - step / 2 + 4);
        ctx.fillText('▲', CONFIG.INNER_RIGHT + CONFIG.WALL_T / 2, y - step / 2 + 4);
      }
    }
    ctx.restore();
  },

  drawDeathLine() {
    const ctx = this.ctx;
    const flashing = Game.dangerTimer > 0;
    // Мягкое раннее предупреждение: куча подобралась к линии — линия теплеет
    // заранее, без паники. Красная пульсация — только когда таймер уже идёт.
    let warn = false;
    if (!flashing) {
      const now = performance.now();
      for (const b of Physics.fruits()) {
        if (b.bounds.min.y < CONFIG.DEATH_Y + 180 && b.speed < 1.5 &&
            now - b.plugin.fruit.bornAt > CONFIG.DEATH_MIN_AGE_MS) { warn = true; break; }
      }
    }
    const alpha = flashing ? 0.5 + 0.5 * Math.abs(Math.sin(performance.now() / 120))
      : warn ? 0.45 : 0.28;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = flashing ? C.danger : warn ? C.accent : C.danger;
    ctx.lineWidth = flashing ? 5 : warn ? 4 : 3;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(CONFIG.INNER_LEFT, CONFIG.DEATH_Y);
    ctx.lineTo(CONFIG.INNER_RIGHT, CONFIG.DEATH_Y);
    ctx.stroke();
    ctx.restore();
  },

  // Спрайт плода рисуется один раз в offscreen (с суперсемплингом ×2) и дальше
  // только копируется — дешевле на мобильных и позволяет богатый вид:
  // радиальный градиент объёма, тёмная кромка, глянец, эмодзи с тенью.
  sprite(branch, rank) {
    // Вариант «арт» (сгенерированный спрайт) или «код» (круг + эмодзи, пока
    // арт не загрузился). Ключи разные: когда картинка доедет, соберётся
    // арт-вариант, старый кодовый останется невостребованным в кэше.
    const art = Assets.img(branch + '_' + rank);
    const key = branch + '_' + rank + (art ? '_a' : '_c');
    if (this._sprites[key]) return this._sprites[key];
    const f = CONFIG.FRUITS[branch][rank];

    if (art) {
      const SS = 2;
      const r = f.radius * SS;
      const pad = 4 * SS;
      const size = (r + pad) * 2;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d');
      const cx = size / 2, cy = size / 2;
      // Арт вписывается в круг физики по большей стороне. ВАЖНО: спрайты
      // обязаны быть КРУГЛЫМИ по силуэту (правило в NOTES) — вытянутый арт
      // оставляет невидимые края коллайдера, и соседний плод «висит в
      // воздухе». Подложку-шар пробовали — забраковано игроком (арт тонет).
      const k = (r * 2 * 1.05) / Math.max(art.width, art.height);
      const w = art.width * k, h = art.height * k;
      o.drawImage(art, cx - w / 2, cy - h / 2, w, h);
      this._sprites[key] = { canvas: off, size, ss: SS };
      return this._sprites[key];
    }

    const SS = 2;
    const r = f.radius * SS;
    const pad = Math.ceil(r * 0.14) + 2 * SS;
    const size = (r + pad) * 2;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const o = off.getContext('2d');
    const cx = size / 2, cy = size / 2;

    // Объём: светлое пятно сверху-слева -> базовый цвет -> тёмный край
    const g = o.createRadialGradient(cx - r * 0.32, cy - r * 0.36, r * 0.1, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.50)');
    g.addColorStop(0.25, f.color);
    g.addColorStop(0.82, f.color);
    g.addColorStop(1, 'rgba(0,0,0,0.30)');
    o.beginPath();
    o.arc(cx, cy, r, 0, Math.PI * 2);
    o.fillStyle = f.color;
    o.fill();
    o.fillStyle = g;
    o.fill();
    o.lineWidth = Math.max(2 * SS, r * 0.055);
    o.strokeStyle = C.outline;
    o.stroke();
    // Глянцевый серп
    o.beginPath();
    o.arc(cx - r * 0.26, cy - r * 0.30, r * 0.58, Math.PI * 0.95, Math.PI * 1.55);
    o.strokeStyle = 'rgba(255,255,255,0.4)';
    o.lineCap = 'round';
    o.lineWidth = r * 0.13;
    o.stroke();
    // Эмодзи с мягкой тенью
    o.font = Math.floor(r * 1.25) + 'px serif';
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.shadowColor = 'rgba(20,10,4,0.35)';
    o.shadowBlur = r * 0.12;
    o.shadowOffsetY = r * 0.06;
    o.fillText(f.emoji, cx, cy + r * 0.05);
    this._sprites[key] = { canvas: off, size, ss: SS };
    return this._sprites[key];
  },

  // dx/dy — смещение центра спрайта от центроида тела (полигонная физика).
  drawFruitBody(x, y, angle, branch, rank, scale = 1, dx = 0, dy = 0) {
    const ctx = this.ctx;
    const sp = this.sprite(branch, rank);
    const d = (sp.size / sp.ss) * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(sp.canvas, -d / 2 + dx * scale, -d / 2 + dy * scale, d, d);
    ctx.restore();
  },

  // Маленькая иконка плода для HUD и списков (превью, заказ, полки).
  drawFruitIcon(branch, rank, cx, cy, sizePx) {
    const sp = this.sprite(branch, rank);
    this.ctx.drawImage(sp.canvas, cx - sizePx / 2, cy - sizePx / 2, sizePx, sizePx);
  },

  drawFruits() {
    const now = performance.now();
    for (const body of Physics.fruits()) {
      const fr = body.plugin.fruit;
      // Появление: масштаб 0.4 -> 1 за 120 мс
      const age = now - fr.spawnAt;
      const scale = age < 120 ? 0.4 + 0.6 * (age / 120) : 1;
      this.drawFruitBody(body.position.x, body.position.y, body.angle, fr.branch, fr.rank,
        scale, fr.artDx || 0, fr.artDy || 0);
      if (Game.captureMode) {
        const ctx = this.ctx;
        const r = CONFIG.FRUITS[fr.branch][fr.rank].radius;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,' +
          (0.35 + 0.3 * Math.abs(Math.sin(now / 200))) + ')';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  },

  drawCurrent() {
    if (Game.state !== 'playing' || !Game.current || Game.captureMode) return;
    const ctx = this.ctx;
    const { branch, rank, x } = Game.current;
    if (Game.canDrop) {
      // Пунктирная направляющая до дна; при прицеливании — заметно ярче,
      // чтобы было видно из-под пальца.
      ctx.save();
      ctx.globalAlpha = Game._aiming ? 0.4 : 0.18;
      ctx.strokeStyle = C.text;
      ctx.lineWidth = Game._aiming ? 4 : 2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(x, CONFIG.DROP_Y);
      ctx.lineTo(x, CONFIG.FLOOR_Y);
      ctx.stroke();
      ctx.restore();
    }
    const bob = Math.sin(performance.now() / 350) * 4;
    this.ctx.globalAlpha = Game.canDrop ? 1 : 0.5;
    this.drawFruitBody(x, CONFIG.DROP_Y + bob, 0, branch, rank);
    this.ctx.globalAlpha = 1;
  },

  // Контуры физических тел поверх плодов (?debug=shapes) — сверка «вид = физика».
  drawColliders() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
    ctx.lineWidth = 2;
    for (const body of Physics.fruits()) {
      const parts = body.parts.length > 1 ? body.parts.slice(1) : body.parts;
      for (const part of parts) {
        ctx.beginPath();
        part.vertices.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawCaptureHint() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(232, 150, 63, 0.08)';
    ctx.fillRect(CONFIG.INNER_LEFT, CONFIG.WALL_TOP_Y,
      CONFIG.INNER_RIGHT - CONFIG.INNER_LEFT, CONFIG.FLOOR_Y - CONFIG.WALL_TOP_Y);
    ctx.font = font('hint');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.accent;
    ctx.fillText(i18n.t('jarPick'), CONFIG.W / 2, 330);
  },

  // ---- HUD ------------------------------------------------------------------

  drawHud() {
    const ctx = this.ctx;
    ctx.textBaseline = 'alphabetic';
    // Очки и рекорд
    this.text(String(Game.score), 24, 64, { font: font('score'), color: C.text });
    this.text(i18n.t('best') + ': ' + Game.best, 24, 102,
      { font: font('sub'), color: C.textDim });

    // Следующий плод
    const np = LAYOUT.nextPreview;
    this.text(i18n.t('next'), np.x, np.y - 46,
      { font: font('label'), color: C.textDim, align: 'center' });
    const npGrad = ctx.createRadialGradient(np.x - 8, np.y - 10, 4, np.x, np.y, 34);
    npGrad.addColorStop(0, C.barrelInnerTop);
    npGrad.addColorStop(1, C.barrelInnerBottom);
    ctx.beginPath();
    ctx.arc(np.x, np.y, 34, 0, Math.PI * 2);
    ctx.fillStyle = npGrad;
    ctx.fill();
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (Game.next) {
      this.drawFruitIcon(Game.next.branch, Game.next.rank, np.x, np.y + 1, 54);
    }

    this.drawJarGauge();
    this.drawRoundButton(LAYOUT.sound, Audio.enabled ? 'sound' : 'soundOff');
    this.drawRoundButton(LAYOUT.pantryBtn, 'pantry');
    // Ярмарка готова — кладовая зовёт: пульсирующее кольцо вокруг кнопки
    if (Game.fairReady()) {
      const ctx = this.ctx;
      const b = LAYOUT.pantryBtn;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2,
        b.w / 2 + 5 + Math.abs(Math.sin(performance.now() / 250)) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    this.drawOrderBoard();
    this.drawDailyBadge();
    this.drawHandHint();
  },

  // «Банка дня»: закатка этого плода даёт ×2 очков.
  drawDailyBadge() {
    if (!Game.dailySpecial) return;
    const ctx = this.ctx;
    const r = LAYOUT.daily;
    this.rr(r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = this.vgrad(r.x, r.y, r.h, C.panelTop, C.panelBottom);
    ctx.fill();
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = font('label');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.textDim;
    ctx.fillText(i18n.t('dailySpecial') + ':', r.x + 12, r.y + r.h / 2 + 1);
    const tw = ctx.measureText(i18n.t('dailySpecial') + ':').width;
    this.drawFruitIcon(Game.dailySpecial.branch, Game.dailySpecial.rank,
      r.x + tw + 34, r.y + r.h / 2, 34);
    ctx.font = 'bold 22px ' + THEME.fontFamily;
    ctx.fillStyle = C.good;
    ctx.fillText('×2', r.x + tw + 56, r.y + r.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  },

  // Доска заказа: три банки-компонента, есть/нет, свечение при готовности.
  drawOrderBoard() {
    const ctx = this.ctx;
    const r = LAYOUT.order;
    const ready = Game.orderReady();
    const now = performance.now();

    ctx.save();
    if (ready) {
      ctx.shadowColor = C.accent;
      ctx.shadowBlur = 14 + Math.abs(Math.sin(now / 250)) * 8;
    } else {
      ctx.shadowColor = C.shadow;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }
    this.rr(r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = this.vgrad(r.x, r.y, r.h, C.panelTop, C.panelBottom);
    ctx.fill();
    ctx.restore();
    this.rr(r.x, r.y, r.w, r.h, 14);
    ctx.strokeStyle = ready ? C.accent : C.panelBorder;
    ctx.lineWidth = ready ? 3 : 2;
    ctx.stroke();

    ctx.font = font('label');
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? C.accent : C.textDim;
    ctx.fillText(ready ? i18n.t('orderCollect') : i18n.t('order'), r.x + 12, r.y + 26);

    if (!Game.order) return;
    Game.order.components.forEach(([branch, rank], i) => {
      const cx = r.x + 40 + i * 64, cy = r.y + 60;
      const have = (Pantry.counts[branch + '_' + rank] || 0) > 0;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fillStyle = C.barrelInner;
      ctx.fill();
      ctx.strokeStyle = have ? C.good : C.panelBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = have ? 1 : 0.45;
      this.drawFruitIcon(branch, rank, cx, cy + 1, 42);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (have) {
        ctx.font = 'bold 18px ' + THEME.fontFamily;
        ctx.fillStyle = C.good;
        ctx.fillText('✓', cx + 18, cy - 18);
      }
      ctx.textBaseline = 'alphabetic';
    });
  },

  // Рука-подсказка: готовую банку (или готовый заказ) легко не заметить.
  drawHandHint() {
    if (Game.state !== 'playing' || Game.captureMode) return;
    let x, y;
    if (Game.jarReady) {
      x = LAYOUT.jar.x + LAYOUT.jar.w / 2;
      y = LAYOUT.jar.y + LAYOUT.jar.h + 46;
    } else if (Game.orderReady()) {
      x = LAYOUT.order.x + LAYOUT.order.w / 2;
      y = LAYOUT.order.y + LAYOUT.order.h + 46;
    } else if (Game.fairReady()) {
      x = LAYOUT.pantryBtn.x + LAYOUT.pantryBtn.w / 2;
      y = LAYOUT.pantryBtn.y + LAYOUT.pantryBtn.h + 40;
    } else return;
    const ctx = this.ctx;
    const bob = Math.abs(Math.sin(performance.now() / 280)) * 14;
    ctx.font = '46px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', x, y + 14 - bob);
    ctx.textBaseline = 'alphabetic';
  },

  // icon: 'sound' | 'soundOff' | 'pantry' — векторные пути, не эмодзи (см. drawButtonIcon).
  drawRoundButton(rect, icon) {
    const ctx = this.ctx;
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const r = rect.w / 2;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r);
    g.addColorStop(0, C.buttonAltTop);
    g.addColorStop(1, C.buttonAltBottom);
    ctx.save();
    ctx.shadowColor = C.shadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    this.drawButtonIcon(icon, cx, cy, r);
  },

  // Векторные иконки вместо эмодзи для круглых кнопок. Canvas fillText с цветным эмодзи
  // ненадёжен в некоторых WebView площадок — на iOS (VK Mini Apps) отрисовывался сплошным
  // силуэтом/пропадал вовсе (отказ модерации VK 2026-07-29: «не подгружаются изображения
  // кнопок»). Простые пути одинаковы на любом движке, без зависимости от эмодзи-шрифта.
  drawButtonIcon(icon, cx, cy, r) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = C.text;
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    if (icon === 'sound' || icon === 'soundOff') {
      // Динамик: коробка + расширяющийся раструб.
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.22);
      ctx.lineTo(cx - r * 0.18, cy - r * 0.22);
      ctx.lineTo(cx + r * 0.15, cy - r * 0.5);
      ctx.lineTo(cx + r * 0.15, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.18, cy + r * 0.22);
      ctx.lineTo(cx - r * 0.5, cy + r * 0.22);
      ctx.closePath();
      ctx.fill();
      if (icon === 'sound') {
        ctx.beginPath();
        ctx.arc(cx + r * 0.2, cy, r * 0.34, -Math.PI / 3.4, Math.PI / 3.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + r * 0.2, cy, r * 0.56, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.2, cy - r * 0.32);
        ctx.lineTo(cx + r * 0.62, cy + r * 0.32);
        ctx.moveTo(cx + r * 0.62, cy - r * 0.32);
        ctx.lineTo(cx + r * 0.2, cy + r * 0.32);
        ctx.stroke();
      }
    } else if (icon === 'pantry') {
      // Мини-банка: тот же силуэт, что и крынка на игровом поле — узнаваемо, без эмодзи.
      const w = r * 0.62, h = r * 0.82, lidH = r * 0.24, top = cy - h / 2, radius = 4;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, top + lidH);
      ctx.lineTo(cx + w / 2, top + lidH);
      ctx.lineTo(cx + w / 2, top + h - radius);
      ctx.quadraticCurveTo(cx + w / 2, top + h, cx + w / 2 - radius, top + h);
      ctx.lineTo(cx - w / 2 + radius, top + h);
      ctx.quadraticCurveTo(cx - w / 2, top + h, cx - w / 2, top + h - radius);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.accent;
      ctx.fillRect(cx - w / 2 - 2, top, w + 4, lidH);
    }
    ctx.restore();
  },

  drawJarGauge() {
    const ctx = this.ctx;
    const r = LAYOUT.jar;
    const cx = r.x + r.w / 2;
    const now = performance.now();
    const pulse = Game.jarReady ? 1 + 0.05 * Math.sin(now / 180) : 1;

    ctx.save();
    ctx.translate(cx, r.y + r.h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-cx, -(r.y + r.h / 2));

    // Свечение готовой банки
    if (Game.jarReady) {
      ctx.shadowColor = C.accent;
      ctx.shadowBlur = 22;
    }
    // Стекло с лёгким градиентом
    const gx = r.x + 12, gw = r.w - 24, gy = r.y + 26, gh = r.h - 32;
    this.rr(gx, gy, gw, gh, 12);
    const glass = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    glass.addColorStop(0, 'rgba(210, 230, 235, 0.42)');
    glass.addColorStop(0.5, 'rgba(210, 230, 235, 0.22)');
    glass.addColorStop(1, 'rgba(210, 230, 235, 0.38)');
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.shadowBlur = 0;
    // «Варенье» снизу вверх, с мениском и градиентом
    const level = Math.min(1, Game.gauge / CONFIG.GAUGE_MAX);
    if (level > 0) {
      const fh = (gh - 8) * level;
      const fy = gy + gh - 4 - fh;
      this.rr(gx + 4, fy, gw - 8, fh, 8);
      ctx.fillStyle = this.vgrad(0, fy, fh, '#f2b45c', '#cf7a1e');
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 240, 210, 0.35)';
      ctx.fillRect(gx + 6, fy, gw - 12, 3);
    }
    this.rr(gx, gy, gw, gh, 12);
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Вертикальный блик на стекле
    ctx.fillStyle = C.glassShine;
    this.rr(gx + 6, gy + 8, 7, gh - 16, 4);
    ctx.fill();
    // Крышка с градиентом
    this.rr(gx - 4, r.y + 12, gw + 8, 16, 6);
    ctx.fillStyle = this.vgrad(0, r.y + 12, 16, C.woodLight, C.woodBottom);
    ctx.fill();
    ctx.restore();
  },

  // ---- Эффекты --------------------------------------------------------------

  drawFloaters() {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.font = font('toast');
    ctx.textAlign = 'center';
    for (const f of Game.floaters) {
      const t = (now - f.born) / 1000;
      ctx.globalAlpha = 1 - t;
      const y = f.y - t * 60;
      ctx.fillStyle = C.textShadow;
      ctx.fillText(f.text, f.x + 2, y + 3);
      ctx.fillStyle = C.good;
      ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;
  },

  drawToast() {
    if (!Game.toast) return;
    const ctx = this.ctx;
    ctx.font = font('hint');
    const w = ctx.measureText(Game.toast.text).width + 60;
    const x = (CONFIG.W - w) / 2, y = 250, h = 62;
    ctx.save();
    ctx.shadowColor = C.shadow;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    this.rr(x, y, w, h, 16);
    ctx.fillStyle = this.vgrad(x, y, h, C.panelTop, C.panelBottom);
    ctx.fill();
    ctx.restore();
    this.rr(x, y, w, h, 16);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    this.text(Game.toast.text, CONFIG.W / 2, y + h / 2 + 1,
      { font: font('hint'), color: C.text, align: 'center', baseline: 'middle' });
  },

  drawTutorial() {
    const ctx = this.ctx;
    const bob = Math.sin(performance.now() / 300) * 10;
    ctx.textAlign = 'center';
    ctx.font = '64px serif';
    ctx.fillText('👆', CONFIG.W / 2, 600 + bob);
    ctx.font = font('hint');
    ctx.fillStyle = C.text;
    ctx.fillText(i18n.t('tutorial1'), CONFIG.W / 2, 680);
    ctx.fillText(i18n.t('tutorial2'), CONFIG.W / 2, 720);
  },

  // ---- Оверлеи --------------------------------------------------------------

  drawButton(id, x, y, w, h, text, { alt = false, sub = null } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = C.shadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    this.rr(x, y, w, h, THEME.radius.button);
    ctx.fillStyle = alt
      ? this.vgrad(x, y, h, C.buttonAltTop, C.buttonAltBottom)
      : this.vgrad(x, y, h, C.buttonTop, C.buttonBottom);
    ctx.fill();
    ctx.restore();
    this.rr(x, y, w, h, THEME.radius.button);
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Светлая кромка сверху — кнопка «выпуклая»
    ctx.fillStyle = 'rgba(255, 245, 220, 0.28)';
    this.rr(x + 4, y + 3, w - 8, 5, 3);
    ctx.fill();
    ctx.font = font('button');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = alt ? C.buttonAltText : C.buttonText;
    ctx.fillText(text, x + w / 2, y + h / 2 - (sub ? 10 : 0) + 2);
    if (sub) {
      ctx.font = font('label');
      ctx.fillText(sub, x + w / 2, y + h / 2 + 20);
    }
    ctx.textBaseline = 'alphabetic';
    LAYOUT.overlayButtons.push({ id, x, y, w, h });
  },

  drawGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = C.overlay;
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);

    const showRescue = !Game.rescueUsed;
    // Строка «банки + рецепты» на одной строке шириной панели (520px) не проходит:
    // с длинными переводами (или когда закрыто и то, и другое) текст вылезал за панель
    // — отказ модерации VK 2026-07-29 («Текст выходит за границы окна»), поймано на
    // партии, где закрылось сразу несколько рецептов (в наших коротких смоук-тестах
    // recipesThisGame почти всегда был 0, поэтому вторая половина строки не рисовалась
    // и баг не всплывал). Рецепты — отдельной строкой, а не склейкой через пробелы.
    const hasRecipes = Game.recipesThisGame > 0;
    const ph = (showRescue ? 590 : 490) + (hasRecipes ? 24 : 0);
    const px = 100, pw = 520, py = (CONFIG.H - ph) / 2 - 60;
    this.panelRect(px, py, pw, ph, THEME.radius.panel);

    this.text(i18n.t('gameOver'), CONFIG.W / 2, py + 64,
      { font: font('button'), color: C.text, align: 'center' });
    this.text(i18n.t('yourScore', { n: Game.score }), CONFIG.W / 2, py + 140,
      { font: font('score'), color: C.accent, align: 'center' });
    this.text(Game.newBest ? i18n.t('newBest') : i18n.t('bestScore', { n: Game.best }),
      CONFIG.W / 2, py + 186,
      { font: font('sub'), color: Game.newBest ? C.good : C.textDim, align: 'center' });
    // Итог «что я приобрела», а не «я проиграла»: банки и новые рецепты партии.
    this.text('🏺 ' + i18n.t('overJars', { n: Game.jarsThisGame }), CONFIG.W / 2, py + 228,
      { font: font('sub'), color: C.good, align: 'center' });
    if (hasRecipes) {
      this.text('✨ ' + i18n.t('overRecipes', { n: Game.recipesThisGame }), CONFIG.W / 2, py + 260,
        { font: font('sub'), color: C.good, align: 'center' });
    }
    ctx.textAlign = 'center';

    let by = py + (hasRecipes ? 304 : 280);
    if (showRescue) {
      this.drawButton('rescue', px + 60, by, pw - 120, 88,
        '📺 ' + i18n.t('rescueBtn'), { sub: i18n.t('rescueHint') });
      by += 108;
    }
    this.drawButton('restart', px + 60, by, pw - 120, 76, i18n.t('restart'));
    by += 96;
    this.drawButton('pantry', px + 60, by, pw - 120, 76, '🏺 ' + i18n.t('pantry'), { alt: true });
  },

  drawPantry() {
    const ctx = this.ctx;
    ctx.fillStyle = C.overlay;
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);

    const { x: px, y: py, w: pw, h: ph } = LAYOUT.pantryPanel;
    this.panelRect(px, py, pw, ph, THEME.radius.panel);

    this.text('🏺 ' + i18n.t('pantry'), CONFIG.W / 2, py + 66,
      { font: font('title'), color: C.text, align: 'center' });
    this.text(i18n.t('jarsTotal', { n: Pantry.totalJars() }), CONFIG.W / 2, py + 108,
      { font: font('sub'), color: C.textDim, align: 'center' });
    ctx.textAlign = 'center';

    // Вкладки: Кладовая | Коллекция | Награды
    const tab = Game.pantryTab;
    const tw = (pw - 100) / 3;
    this.drawButton('tabPantry', px + 30, py + 132, tw, 56,
      i18n.t('tabPantry'), { alt: tab !== 'pantry' });
    this.drawButton('tabCollection', px + 50 + tw, py + 132, tw, 56,
      i18n.t('tabCollection'), { alt: tab !== 'collection' });
    this.drawButton('tabAwards', px + 70 + tw * 2, py + 132, tw, 56,
      i18n.t('tabAwards'), { alt: tab !== 'awards' });

    if (tab === 'pantry') this.drawPantryShelves(px, py, pw);
    else if (tab === 'collection') this.drawCollectionTab(px, py, pw);
    else this.drawAwardsTab(px, py, pw);

    this.drawButton('pantryClose', (CONFIG.W - 280) / 2, py + ph - 84, 280, 64, i18n.t('close'));

    // Карточка рецепта — поверх всего, закрывается любым тапом.
    if (Game.recipeCard) this.drawRecipeCard(Game.recipeCard);
  },

  // Вкладка наград: 12 достижений, открытые — тёплым цветом.
  drawAwardsTab(px, py, pw) {
    const ctx = this.ctx;
    ACHIEVEMENTS.forEach((a, i) => {
      const y = py + 252 + i * 56;
      const got = !!Game.ach[a.id];
      ctx.font = '30px serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = got ? 1 : 0.35;
      ctx.fillText(got ? '🏅' : '🔒', px + 40, y);
      ctx.globalAlpha = 1;
      ctx.font = font('pantryName');
      ctx.fillStyle = got ? C.text : C.textDim;
      ctx.fillText(i18n.t('ach_' + a.id), px + 95, y - 12);
      ctx.font = font('label');
      ctx.fillStyle = C.textDim;
      ctx.fillText(i18n.t('ach_' + a.id + '_d'), px + 95, y + 18);
      ctx.textBaseline = 'alphabetic';
    });
    ctx.textAlign = 'center';
  },

  // Карточка рецепта: название, состав, настоящий короткий рецепт.
  drawRecipeCard(id) {
    const ctx = this.ctx;
    ctx.fillStyle = C.overlay;
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
    const pw = 560, ph = 500, px = (CONFIG.W - pw) / 2, py = (CONFIG.H - ph) / 2;
    this.panelRect(px, py, pw, ph, THEME.radius.panel);

    this.text('📖 ' + i18n.t('recipeTitle'), CONFIG.W / 2, py + 62,
      { font: font('sub'), color: C.textDim, align: 'center' });
    this.text(i18n.t('col_' + id), CONFIG.W / 2, py + 116,
      { font: font('button'), color: C.accent, align: 'center' });

    const col = COLLECTIONS.find((c) => c.id === id);
    if (col) {
      col.components.forEach(([branch, rank], i) => {
        this.drawFruitIcon(branch, rank, CONFIG.W / 2 + (i - 1) * 90, py + 180, 60);
      });
    }

    // Текст рецепта с переносом по словам
    const words = i18n.t('rec_' + id).split(' ');
    ctx.font = font('pantryName');
    ctx.textAlign = 'center';
    ctx.fillStyle = C.text;
    const maxW = pw - 90;
    let line = '', ly = py + 268;
    for (const w of words) {
      const probe = line ? line + ' ' + w : w;
      if (ctx.measureText(probe).width > maxW) {
        ctx.fillText(line, CONFIG.W / 2, ly);
        line = w;
        ly += 38;
      } else line = probe;
    }
    if (line) ctx.fillText(line, CONFIG.W / 2, ly);

    this.text(i18n.t('close'), CONFIG.W / 2, py + ph - 40,
      { font: font('label'), color: C.textDim, align: 'center' });
  },

  drawPantryShelves(px, py, pw) {
    const ctx = this.ctx;
    // Две полки: варенья слева, соленья справа
    const cols = [
      { branch: 'fruit', cx: px + pw * 0.27, label: i18n.t('fruitShelf') },
      { branch: 'veg', cx: px + pw * 0.75, label: i18n.t('vegShelf') }
    ];
    ctx.font = font('button');
    ctx.textAlign = 'center';
    for (const col of cols) {
      ctx.fillStyle = C.accent;
      ctx.fillText(col.label, col.cx, py + 240);
    }
    const rowY0 = py + 262, rowH = 86;
    for (const col of cols) {
      for (let rank = 0; rank < 7; rank++) {
        const y = rowY0 + rank * rowH;
        const found = Pantry.discovered(col.branch, rank);
        const f = CONFIG.FRUITS[col.branch][rank];
        // Полка
        ctx.strokeStyle = C.woodDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(col.cx - 140, y + rowH - 18);
        ctx.lineTo(col.cx + 140, y + rowH - 18);
        ctx.stroke();
        // Банка
        ctx.textBaseline = 'middle';
        if (found) {
          ctx.globalAlpha = 1;
          this.drawFruitIcon(col.branch, rank, col.cx - 105, y + 34, 56);
        } else {
          ctx.globalAlpha = 0.35;
          ctx.font = '44px serif';
          ctx.fillStyle = C.textDim;
          ctx.fillText('❔', col.cx - 105, y + 34);
        }
        // Название и счёт
        ctx.textBaseline = 'alphabetic';
        ctx.font = font('pantryName');
        ctx.textAlign = 'left';
        ctx.fillStyle = found ? C.text : C.textDim;
        const name = found ? i18n.t('jar_' + col.branch + '_' + rank) : i18n.t('unknownRecipe');
        ctx.fillText(name, col.cx - 70, y + 28);
        if (found) {
          ctx.font = font('pantryCount');
          ctx.fillStyle = C.accent;
          ctx.fillText('× ' + Pantry.count(col.branch, rank), col.cx - 70, y + 60);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
      }
    }
  },

  // Вкладка коллекции: активный заказ с составом и наградой, ниже — полка
  // собранных коллекционных банок.
  drawCollectionTab(px, py, pw) {
    const ctx = this.ctx;
    const order = Game.order;
    const cx = CONFIG.W / 2;

    if (order) {
      ctx.font = font('button');
      ctx.textAlign = 'center';
      ctx.fillStyle = C.accent;
      ctx.fillText(i18n.t('order') + ': ' + i18n.t('col_' + order.id), cx, py + 240);

      order.components.forEach(([branch, rank], i) => {
        const y = py + 270 + i * 56;
        const have = (Pantry.counts[branch + '_' + rank] || 0) > 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = have ? 1 : 0.5;
        this.drawFruitIcon(branch, rank, px + 105, y, 46);
        ctx.globalAlpha = 1;
        ctx.font = font('pantryName');
        ctx.fillStyle = have ? C.text : C.textDim;
        ctx.fillText(i18n.t('jar_' + branch + '_' + rank), px + 145, y + 2);
        ctx.font = font('pantryCount');
        ctx.textAlign = 'right';
        ctx.fillStyle = have ? C.good : C.danger;
        ctx.fillText(have ? '✓' : '—', px + pw - 80, y + 2);
        ctx.textBaseline = 'alphabetic';
      });

      ctx.font = font('sub');
      ctx.textAlign = 'center';
      ctx.fillStyle = C.textDim;
      ctx.fillText(i18n.t('orderBonus', { n: order.bonus }), cx, py + 456);

      if (Game.orderReady() && Game.state === 'playing') {
        this.drawButton('orderCollect', cx - 150, py + 480, 300, 62, i18n.t('orderCollect'));
      } else {
        ctx.font = font('label');
        ctx.fillStyle = C.textDim;
        ctx.fillText(i18n.t('orderHint'), cx, py + 512);
      }
    }

    // Ярмарка: все коллекции собраны — большая кнопка обмена
    if (Game.fairReady() && Game.state === 'playing') {
      this.drawButton('fairCollect', cx - 190, py + 544, 380, 52,
        i18n.t('fairBtn', { n: SEASON_BONUS }));
    }

    // Полка собранных коллекций (+ счётчик закрытых сезонов)
    ctx.font = font('button');
    ctx.textAlign = 'center';
    ctx.fillStyle = C.accent;
    ctx.fillText(i18n.t('collectionShelf') +
      (Game.seasons ? '  ·  ' + i18n.t('seasonsCount', { n: Game.seasons }) : ''),
      cx, py + 630);
    COLLECTIONS.forEach((c, i) => {
      const colX = i % 2 === 0 ? px + 40 : px + pw / 2 + 20;
      const y = py + 660 + Math.floor(i / 2) * 48;
      const n = Pantry.collectionCount(c.id);
      const opened = n > 0 || Game.seasons > 0; // после ярмарки рецепты остаются в альбоме
      ctx.font = font('label');
      ctx.textAlign = 'left';
      ctx.fillStyle = opened ? C.text : C.textDim;
      ctx.fillText(opened ? i18n.t('col_' + c.id) : i18n.t('unknownRecipe'), colX, y);
      if (opened) {
        // 📖 — у коллекции есть карточка рецепта, ряд нажимается
        ctx.fillText('📖', colX + pw / 2 - 105, y);
        ctx.font = 'bold 20px ' + THEME.fontFamily;
        ctx.textAlign = 'right';
        ctx.fillStyle = C.accent;
        ctx.fillText('× ' + n, colX + pw / 2 - 50, y);
        LAYOUT.overlayButtons.push({ id: 'col_' + c.id, x: colX - 8, y: y - 26, w: pw / 2 - 60, h: 40 });
      }
    });
    ctx.textAlign = 'center';
  }
};
