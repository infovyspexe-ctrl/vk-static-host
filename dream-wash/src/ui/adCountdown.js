// Короткий отсчёт перед полноэкранной рекламой (YANDEX-MODERATION.md, раздел «Реклама»:
// показ в ЛОГИЧЕСКОЙ ПАУЗЕ с обратным отсчётом, а не «голый таймер» — официальный
// антипример Яндекса). Затемнение + «Реклама через N…» (i18n.t('adCountdown')), по
// истечении — onDone() (вызывающий сам показывает рекламу). Самодостаточный оверлей,
// чистится сам. Из library/game-template (TEMPLATE-VERSION.md v17) — там же история
// находки: паттерн был реализован дважды независимо (osushi-ozero, skladen) до того,
// как попал в индекс, из-за чего третья игра (эта) написала таймер без отсчёта.
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';

// showAdCountdown(scene, onDone, seconds=2)
// seconds=2 не косметика: п.4.4 требований Яндекса требует РОВНО 2 секунды предупреждения
// (https://yandex.ru/dev/games/doc/ru/requirements/4/4 — «Длиться 2 секунды»), было 3.
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
