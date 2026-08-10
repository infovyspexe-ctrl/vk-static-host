// ЕДИНЫЙ ИСТОЧНИК ВНЕШНЕГО ВИДА.
// Меняешь значения здесь, и весь интерфейс игры меняется разом.
// В сценах НЕЛЬЗЯ хардкодить цвета, шрифты и размеры, только брать отсюда.
export const THEME = {
  colors: {
    bg: '#161225',          // фон — холодная тёмная изнанка мира
    panel: 0x241b3a,        // фон панелей — тёмный фиолетовый
    primary: 0xd97b2b,      // основная кнопка — тёплый очажный огонь (контраст холоду)
    primaryText: '#1d1330',
    accent: 0xf2c14e,       // акцентная кнопка — золотой (реклама, награда, искры)
    neutral: 0x4a3f66,      // второстепенная кнопка — приглушённый фиолет
    danger: 0xb0413e,       // урон/опасность (HP-бар, предупреждения)
    safe: 0x5fa777,         // лечение/успех
    text: '#f4ead9',        // тёплый пергаментный текст на тёмном фоне
    textDim: '#b8aecb',
    overlay: 'rgba(10, 6, 20, 0.6)' // затемнение оверлея паузы (css-строка)
  },
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: { title: '56px', big: '44px', normal: '32px', small: '24px' },
  radius: 16,
  button: { paddingX: 34, paddingY: 18 },

  // Тон подземелья по ярусу глубины (1..3) — тонирует плитки пола/стен в GameScene.
  dungeonTier: {
    1: { floor: 0x2b2144, wall: 0x171029, accent: 0x4a3f66 },
    2: { floor: 0x2a1b30, wall: 0x160f1f, accent: 0x5a2f4a },
    3: { floor: 0x1f1a2e, wall: 0x0f0c1a, accent: 0x3f2f5a }
  }
};

// Числовые цвета THEME.colors (panel/primary/accent/neutral/danger/safe) — это заливки для
// Phaser Graphics/Rectangle (fillStyle ждёт number). Текстовый стиль Phaser.Text ждёт CSS-
// строку ('#rrggbb') и молча проглатывает number (текст остаётся не того цвета, без ошибки
// в консоли) — ловилось живым плейтестом на счётчике духа. Для текста конвертировать этой
// функцией: color: toCss(THEME.colors.accent).
export function toCss(num) { return '#' + num.toString(16).padStart(6, '0'); }
