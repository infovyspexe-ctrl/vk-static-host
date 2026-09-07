// ЕДИНЫЙ ИСТОЧНИК ВНЕШНЕГО ВИДА. Космическая неоновая палитра Cosmic Drift.
// Меняешь значения здесь, и весь интерфейс меняется разом. В сценах НЕ хардкодить.
//
// ДВА ВИДА ЦВЕТА (не путать, грабля из шаблона):
//   ЧИСЛО (0x…)   — graphics.fillStyle/lineStyle, opts.color кнопки;
//   СТРОКА ('#…') — стиль ТЕКСТА (scene.add.text). Для акцентов есть строковые близнецы *Text.
export const THEME = {
  colors: {
    bg: '#05060f',            // глубокий космос (css-строка, фон html)
    bgGame: 0x05060f,         // фон канваса (число, для graphics)
    panel: 0x0e1730,          // тёмно-синие панели
    panelBorder: 0x2a3a66,
    primary: 0x38e8ff,        // неоновый циан — основная кнопка/акцент UI
    primaryText: '#05060f',   // текст на циан-кнопке — тёмный (контраст)
    accent: 0xffb300,         // янтарь — награды, реклама, золото
    accentText: '#ffb300',
    neutral: 0x2a3a66,        // второстепенная кнопка
    neutralText: '#9fb4d8',
    danger: 0xff3b6e,         // HP, урон, Game Over
    dangerText: '#ff3b6e',
    success: 0x43e97b,        // успех, лечение
    successText: '#43e97b',
    xp: 0xb388ff,             // фиолетовый — опыт/уровень
    xpText: '#b388ff',
    chestPanel: 0x2a1f0a,     // тёмное золото — фон окна сундука элиты/босса, отличить от уровня
    chestOverlay: 0x241200,   // тёплая тёмная подложка под окном сундука (не чёрная, как у уровня)
    text: '#eaf2ff',          // основной текст (почти белый с холодным оттенком)
    textDim: '#8aa0c8',
    overlay: 'rgba(2, 4, 12, 0.7)'
  },
  // Обводка текста поверх фона-картинки: тёмная обводка на ярких числах поверх космоса.
  textStroke: { color: '#02040a', thickness: 5 },
  fontFamily: 'Arial, sans-serif',
  fontSize: { title: '64px', big: '48px', normal: '32px', small: '24px', tiny: '18px' },
  radius: 18,
  button: { paddingX: 38, paddingY: 20 }
};
