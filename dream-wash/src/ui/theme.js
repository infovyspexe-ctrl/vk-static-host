// ЕДИНЫЙ ИСТОЧНИК ВНЕШНЕГО ВИДА.
// Меняешь значения здесь, и весь интерфейс игры меняется разом.
// В сценах НЕЛЬЗЯ хардкодить цвета, шрифты и размеры, только брать отсюда.
export const THEME = {
  colors: {
    bg: '#1d2b3a',        // фон (css-строка)
    panel: 0x22384a,      // фон панелей (число для graphics)
    primary: 0x4caf50,    // основная кнопка
    primaryText: '#1d2b3a',
    accent: 0xffb300,     // акцентная кнопка (реклама, награда)
    accentText: '#ffb300', // текстовая версия accent — для add.text/floatText, не для заливки кнопок
    neutral: 0x455a64,    // второстепенная кнопка
    text: '#ffffff',
    textDim: '#9fb0c0',   // второстепенный текст (описания в магазине)
    gold: '#ffd54f',      // «полезное» — тосты наград, монеты (RETENTION.md: цвет как язык)
    danger: '#ef5350',    // заблокированное/недоступное
    overlay: 'rgba(0, 0, 0, 0.55)' // затемнение оверлея паузы (css-строка)
  },
  fontFamily: 'Arial, sans-serif',
  fontSize: { title: '56px', big: '48px', normal: '36px', small: '28px', tiny: '22px' },
  radius: 16,
  button: { paddingX: 34, paddingY: 18 }
};
