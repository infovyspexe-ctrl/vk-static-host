// ТЕМА. Весь внешний вид в одном месте (CONVENTIONS.md, раздел 2): цвета, шрифты,
// размеры. В коде отрисовки цвета и шрифты не хардкодятся — только THEME.
// Стиль: деревенская кладовая — дерево, тепло, янтарь.
export const THEME = {
  colors: {
    pageBg: '#2c1f14',      // фон страницы за канвасом
    bg: '#3b2a1d',          // фон игрового экрана
    barrelInner: '#4a3423', // внутренность крынки
    wood: '#6b4a2f',        // стенки крынки
    woodDark: '#523823',    // тень дерева
    woodLight: '#8a6540',   // блик дерева
    text: '#fff3e0',        // основной текст
    textDim: '#c9ab8c',     // вторичный текст
    accent: '#e8963f',      // янтарный акцент (шкала, кнопки)
    good: '#8fbf5f',        // хорошее / успех
    danger: '#d94452',      // линия смерти, опасность
    overlay: 'rgba(20, 12, 6, 0.78)',  // затемнение оверлеев
    panel: '#54391f',       // фон панелей
    panelBorder: '#8a6540',
    buttonBg: '#e8963f',
    buttonText: '#2c1f14',
    buttonAlt: '#6b4a2f',   // второстепенная кнопка
    buttonAltText: '#fff3e0',
    jarGlass: 'rgba(210, 230, 235, 0.35)',
    outline: 'rgba(30, 18, 8, 0.55)', // обводка плодов
    // Градиенты (пары верх → низ)
    bgTop: '#4a3322',
    bgBottom: '#221509',
    barrelInnerTop: '#553d28',
    barrelInnerBottom: '#3a2817',
    woodTop: '#7d5836',
    woodBottom: '#5a3d24',
    panelTop: '#5f4326',
    panelBottom: '#452e19',
    buttonTop: '#f4ae59',
    buttonBottom: '#d97f26',
    buttonAltTop: '#7a563a',
    buttonAltBottom: '#5a3d26',
    glassShine: 'rgba(255,255,255,0.28)',
    textShadow: 'rgba(20, 10, 4, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.45)' // тень панелей и плодов
  },
  fontFamily: '"Segoe UI", system-ui, sans-serif',
  fontSize: {           // для DOM-оверлея паузы
    big: 'bold 48px'
  },
  // Шрифты укрупнены под аудиторию 45+: мелкий текст — первый барьер.
  font: {               // для канваса: и размер, и начертание
    score: 'bold 46px',
    sub: '28px',
    label: '22px',
    title: 'bold 52px',
    button: 'bold 30px',
    toast: 'bold 32px',
    hint: '30px',
    pantryName: '26px',
    pantryCount: 'bold 28px'
  },
  radius: { panel: 28, button: 18 }
};
