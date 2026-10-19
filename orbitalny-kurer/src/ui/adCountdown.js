// Короткий отсчёт перед полноэкранной рекламой (YANDEX-MODERATION.md, раздел «Реклама»:
// показ в ЛОГИЧЕСКОЙ ПАУЗЕ с обратным отсчётом, а не «голый таймер» — официальный
// антипример Яндекса). Затемнение + «Реклама через N…» (i18n.t('adCountdown'), см.
// i18n/strings.js), по истечении — onDone() (вызывающий сам показывает рекламу).
// Самодостаточный оверлей, чистится сам.
//
// Обязателен для рекламы, которую показывает ПЕРИОДИЧЕСКИЙ ТАЙМЕР во время непрерывного
// геймплея (idle/кликеры без уровней) — см. YANDEX-SDK.md, раздел «Реклама».
//
// РЕКЛАМА НА «ЕСТЕСТВЕННОМ ПЕРЕХОДЕ» (конец уровня/этажа, выход в меню) ТОЖЕ ЕГО ХОЧЕТ,
// хоть и не по причине «голого таймера» — уточнено после находки в «Изнанке» (04.08):
// showFullscreen(), вызванный СИНХРОННО в том же тике, что и tap/click игрока (тот самый,
// которым он и попал на переход — например шаг на лестницу), рискует поймать ВТОРОЙ,
// уже случайный тап туда же (обычное дело в пошаговых/кликер-играх, где по кнопке
// «барабанят») прямо по открывшейся рекламе — это и есть «реклама в момент активного
// взаимодействия» из YANDEX-MODERATION.md, риск фрод-клика. Интерактивное затемнение
// countdown глотает такие тапы. Короче: countdown нужен либо от «голого таймера», либо
// как антифрод-буфер между действием игрока и показом — используй его перед ЛЮБЫМ
// showFullscreen, если он может стартовать в том же кадре, что и клик игрока.
//
// Второе использование модуля (после games/skladen, где он жил как games/skladen/src/ui/
// adCountdown.js с захардкоженным русским текстом) — вынесено в library по «правилу двух»
// корневого CLAUDE.md: модуль уже был замкнутым, ждать третьего использования смысла не
// было. Здесь текст переведён на i18n (по образцу games/osushi-ozero, где та же логика
// жила инлайн в GameScene.js как beginAdCountdown()) — шаблон обязан поддерживать
// многоязычные игры, а Складень заявляет только русский.
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';

// showAdCountdown(scene, onDone, seconds=2)
// seconds=2, не 3: п.4.4 требований Яндекса — предупреждение обязано длиться РОВНО 2 секунды
// (https://yandex.ru/dev/games/doc/ru/requirements/4/4, «Длиться 2 секунды»). Было 3 (счёт
// 3…2…1…) с самого создания модуля (v17) — прямое основание реального отказа модерации
// «Мойки Мечты» 2026-08-23 (TEMPLATE-VERSION.md v37).
export function showAdCountdown(scene, onDone = () => {}, seconds = 2) {
  const W = scene.scale.width, H = scene.scale.height;
  const objs = [];
  let done = false, timer = null;
  const finish = () => {
    if (done) return; done = true;
    if (timer) timer.remove();
    objs.forEach(o => o.destroy());
    onDone();
  };
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(320).setInteractive();
  let left = seconds;
  const label = scene.add.text(W / 2, H / 2, i18n.t('adCountdown', { n: left }), {
    fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text,
  }).setOrigin(0.5).setDepth(321);
  objs.push(dim, label);
  timer = scene.time.addEvent({
    delay: 1000, repeat: seconds - 1,
    callback: () => {
      left -= 1;
      if (left > 0) label.setText(i18n.t('adCountdown', { n: left }));
      else finish();
    },
  });
}
