// ЕДИНЫЙ ИСТОЧНИК ВНЕШНЕГО ВИДА.
// Меняешь значения здесь, и весь интерфейс игры меняется разом.
// В сценах НЕЛЬЗЯ хардкодить цвета, шрифты и размеры, только брать отсюда.
export const THEME = {
  colors: {
    bg: '#2b3f57',        // фон страницы/сцены (css-строка)
    panel: 0x22384a,      // фон панелей (число для graphics)
    panelDark: 0x18293a,  // фон строк списка, подложки HUD
    primary: 0x4caf50,    // основная кнопка
    primaryText: '#1d2b3a',
    accent: 0xffb300,     // акцент (реклама, награда, слив)
    danger: 0xe53935,     // опасность (акула, недоступно)
    neutral: 0x455a64,    // второстепенная кнопка
    text: '#ffffff',
    textDim: '#9fb4c8',
    overlay: 'rgba(0, 0, 0, 0.55)' // затемнение оверлея паузы (css-строка)
  },

  // Палитра мира (разрез озера). Ключи зон = id из data/balance.js ZONES.
  world: {
    sky: 0x8ecff2,
    skyDeep: 0x5ba9d8,
    sun: 0xfff3b0,
    waterTint: 0x2f7fd0,   // полупрозрачный слой воды поверх мира
    waterAlpha: 0.42,
    waterLine: 0xbfe6ff,   // светлая линия поверхности
    tokens: 0xffd54f,      // цвет жетона (монеты)
    gems: 0x4dd0e1,        // цвет гема
    phoneGlow: 0x9be7ff,
    // Вода болота — зелёная и мутная.
    swampWaterTint: 0x3d7a4a,
    swampWaterLine: 0xc8e6a0,
    zones: {
      shore: { rock: 0x8d6e4a, deco: 0x5d9c59 },  // песок и трава
      boat:  { rock: 0x7a5c3e, deco: 0x8a4a2f },  // дерево лодки
      caves: { rock: 0x5c5670, deco: 0x8f86ad },  // сталактиты
      mine:  { rock: 0x4e4438, deco: 0xa8895c },  // балки шахты
      lava:  { rock: 0x4a2f2b, deco: 0xff7043 },  // трещины лавы
      city:  { rock: 0x3f4a56, deco: 0xc9d4c5 },  // колонны города
      abyss: { rock: 0x1d2333, deco: 0x40527a },  // тьма бездны
      // болото
      reeds:    { rock: 0x6d7a45, deco: 0x8bc34a }, // камыши
      bog:      { rock: 0x5d6b3c, deco: 0x7a8b52 }, // топь
      roots:    { rock: 0x4e4a30, deco: 0x8d6e63 }, // коряги
      peat:     { rock: 0x453b28, deco: 0x6d4c41 }, // торфяник
      gas:      { rock: 0x39422c, deco: 0xaed581 }, // газовые ямы
      izba:     { rock: 0x33392b, deco: 0xa1887f }, // затонувшая изба
      blackbog: { rock: 0x1c2318, deco: 0x4a5d3a }  // чёрная топь
    }
  },

  fontFamily: 'Arial, sans-serif',
  fontSize: { title: '56px', big: '48px', normal: '36px', small: '28px', tiny: '22px' },
  radius: 16,
  button: { paddingX: 34, paddingY: 18 }
};
