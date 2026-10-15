// Menu: главное меню пиццерии. Весь вид через THEME и базовую кнопку, тексты через i18n.
// Показывает название, рекорд/день (из сейва), кнопку «Играть» и mute.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Audio } from '../core/audio.js';
import { Input } from '../core/input.js';
import { Save } from '../yandex/save.js';
import { Ads } from '../yandex/ads.js';
import { Platform } from '../platform/index.js';
import { mergeProgress } from '../meta/progress.js';
import { DISTRICTS } from '../data/districts.js';
import { dailyState, claimDaily, todayKey } from '../meta/daily.js';
import { drawCoinIcon } from '../render/icons.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';

// Выстроить кнопки в ряд по ИЗМЕРЕННОЙ ширине (после createButton), а не по фиксированным
// центрам: у createButton фон подгоняется под текст, и разные по длине подписи при равных
// центрах дают неровный на глаз ряд (см. комментарий у вызова в create()).
function layoutRow(buttons, centerX, gap) {
  const total = buttons.reduce((s, b) => s + b.width, 0) + gap * (buttons.length - 1);
  let x = centerX - total / 2;
  buttons.forEach((b) => { b.setX(x + b.width / 2); x += b.width + gap; });
}

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  async create() {
    const { width, height } = this.scale;
    Input.setup(this);

    // Прогресс (для показа рекорда/дня и восстановления mute).
    const saved = await Save.load();
    this.progress = mergeProgress(saved || null);
    Object.keys(this.progress.achievements || {}).forEach((id) => Platform.achievements.unlock(id));
    if (this.progress.muted && !Audio.muted) Audio.toggleMute();

    // Sticky-баннер включён в фоне (доход за время сессии).
    Ads.showBanner();

    // Фон. ПЕРВЫЙ РАЙОН («Порт») уже нарисован художником и грузится ВСЕГДА (PreloadScene
    // грузит фон каждого района сразу, не по прогрессу) — меню рисовало вместо него плоский
    // градиент, хотя готовая картинка лежит рядом. Жалоба игрока 14.08: «максимально дешёвый
    // фон, просто тупо коричневый». Плоский градиент — только запасной путь, если ассет
    // почему-то не загрузился (тот же приём, что в GameScene.drawBackground).
    if (this.textures.exists('bg_porto')) {
      const img = this.add.image(width / 2, height / 2, 'bg_porto');
      const scale = Math.max(width / img.width, height / img.height);
      img.setScale(scale).setDepth(-10);
      // Тёмный градиент СВЕРХУ картинки — не под текстом, а поверх фона: заголовок и кнопки
      // должны читаться на любом фрагменте иллюстрации, а не только на тех местах, где под
      // ними случайно оказался тёмный угол зала.
      const dim = this.add.graphics().setDepth(-9);
      dim.fillGradientStyle(0x140a06, 0x140a06, 0x140a06, 0x140a06, 0.55, 0.55, 0.92, 0.92);
      dim.fillRect(0, 0, width, height);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(THEME.colors.bgTopHex, THEME.colors.bgTopHex, THEME.colors.bgHex, THEME.colors.bgHex, 1);
      bg.fillRect(0, 0, width, height);
      bg.setDepth(-10);
    }

    // Декоративная «пицца»-эмблема под заголовком: мягкое тёплое свечение позади + тень
    // под пиццей — плоский кружок читался как значок, а не как аппетитная картинка.
    const cx = width / 2;
    const cy = height * 0.19;
    const r = Math.min(width, height) * 0.1;
    // Свечение — кольцами убывающей альфы, а не fillGradientStyle: на fillCircle её
    // поведение не проверялось, кольца дают предсказуемый мягкий ореол в любом Phaser.
    const glow = this.add.graphics().setDepth(-1);
    for (let i = 5; i >= 1; i--) {
      glow.fillStyle(THEME.colors.accent, 0.05).fillCircle(cx, cy, r * (1.3 + i * 0.22));
    }
    const pizza = this.add.graphics();
    pizza.fillStyle(0x000000, 0.3).fillEllipse(cx, cy + r * 0.92, r * 1.5, r * 0.35);
    pizza.fillStyle(THEME.colors.dough, 1).fillCircle(cx, cy, r);
    pizza.fillStyle(THEME.colors.sauce, 0.9).fillCircle(cx, cy, r * 0.82);
    pizza.fillStyle(0xfaf0ca, 0.5).fillCircle(cx, cy, r * 0.7);
    pizza.fillStyle(THEME.colors.primary, 1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      pizza.fillCircle(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45, r * 0.13);
      pizza.fillStyle(0xffffff, 0.25);
      pizza.fillCircle(cx + Math.cos(a) * r * 0.45 - r * 0.03, cy + Math.sin(a) * r * 0.45 - r * 0.03, r * 0.05);
      pizza.fillStyle(THEME.colors.primary, 1);
    }
    pizza.lineStyle(3, 0xd9a86c, 0.6).strokeCircle(cx, cy, r * 0.98);

    // Заголовок.
    this.add.text(width / 2, height * 0.34, i18n.t('title'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Рекорд и где игрок в кампании. Поля day в прогрессе больше нет — его место заняла
    // кампания (район + смена), см. meta/progress.js.
    const c = this.progress.campaign;
    const where = c.done
      ? i18n.t('nightShift', { n: c.endlessDay + 1 })
      : i18n.t('district_' + DISTRICTS[c.district].id) + ' · ' + i18n.t('shiftOf', { n: c.shift + 1, of: DISTRICTS[c.district].shifts });
    this.add.text(width / 2, height * 0.42,
      i18n.t('bestScore') + ': ' + this.progress.bestScore + '   ·   ' + where,
      { fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text }
    ).setOrigin(0.5);

    // Играть / Продолжить. Пункт B3 чек-листа требует, чтобы МЕНЮ ВИДЕЛО СЕЙВ: игрок должен
    // с первого взгляда понимать, что его прогресс на месте, а не гадать, не начнётся ли всё
    // заново (на «Осуши озеро» сейв писался, но меню его не читало — и это выглядело как
    // потеря прогресса). Номер района и смены подписан строкой ниже, здесь — глагол.
    const начат = c.done || c.district > 0 || c.shift > 0 || this.progress.bestScore > 0;
    // Кнопка «Играть» крупнее прочих НАМЕРЕННО: это единственное действие, ради которого
    // игрок открыл меню, остальное — вспомогательное. Игрок жаловался, что она терялась
    // среди одинаковых по весу кнопок (жалоба 13.08).
    createButton(this, width / 2, height * 0.53, i18n.t(начат ? 'continue' : 'play'),
      () => this.scene.start('Game'),
      { color: THEME.colors.primary, fontSize: THEME.fontSize.big });

    // Заслуги и таблица — два входа в мету. Раньше лидерборд писался молча и игрок его
    // не видел вообще, то есть механика удержания существовала только на бумаге.
    //
    // ЦЕНТРЫ КНОПОК СТАВИТЬ РОВНО ПО ±105 НЕЛЬЗЯ: createButton считает ширину фона ПО
    // ТЕКСТУ («Заслуги» и «Таблица» разной длины), и при равных центрах у более короткой
    // кнопки остаётся больше воздуха с одной стороны — ряд выглядит перекошенным при
    // одинаковых на глаз отступах слева и справа. Игрок так и написал: «как-то криво
    // находится» (жалоба 13.08). Правильно — выравнивать по ИЗМЕРЕННОЙ ширине кнопок,
    // а не по их центрам.
    const achBtn = createButton(this, 0, height * 0.635, i18n.t('achTitle'),
      () => this.scene.start('Achievements'),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });
    const lbBtn = createButton(this, 0, height * 0.635, i18n.t('leaderboardTitle'),
      () => this.scene.start('Leaderboard'),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });
    layoutRow([achBtn, lbBtn], width / 2, 20);

    // Mute.
    const label = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    const soundBtn = createButton(this, 0, height * 0.73, label(), () => {
      Audio.toggleMute();
      this.progress.muted = Audio.muted;
      soundBtn.setLabel(label());
      Save.update({ muted: this.progress.muted });
      layoutRow([soundBtn, hintsBtn], width / 2, 20);   // текст сменился — ширина тоже
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });

    // Подсказки. Дублирует предложение, которое игра делает один раз после первого района:
    // передумать должно быть можно, а искать настройку в другом месте — не надо.
    const hLabel = () => (this.progress.hintsOn === false ? i18n.t('hintsOffLabel') : i18n.t('hintsOnLabel'));
    const hintsBtn = createButton(this, 0, height * 0.73, hLabel(), () => {
      this.progress.hintsOn = this.progress.hintsOn === false;
      // Нажал сам — значит, уже знает о режиме: переспрашивать после района незачем.
      this.progress.hintsAsked = true;
      hintsBtn.setLabel(hLabel());
      Save.update({ hintsOn: this.progress.hintsOn, hintsAsked: true });
      layoutRow([soundBtn, hintsBtn], width / 2, 20);
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny });
    layoutRow([soundBtn, hintsBtn], width / 2, 20);

    this.showDailyEnvelope();
  }

  // ЕЖЕДНЕВНЫЙ КОНВЕРТ. Показывается поверх меню, если сегодня ещё не забирали.
  // Обычная кнопка «Забрать» есть ВСЕГДА: реклама не должна быть единственным способом
  // получить награду — это и требование площадки, и просто нечестно.
  showDailyEnvelope() {
    const { width, height } = this.scale;
    const daily = this.progress.daily;
    const st = dailyState(daily, todayKey(new Date()));
    if (!st.available) return;
    // НЕ НА ПЕРВОМ ЗАПУСКЕ. Первым экраном совсем нового игрока была модалка с наградой и
    // кнопкой «Удвоить за ролик» — то есть человек видел предложение посмотреть рекламу
    // раньше, чем саму игру (аудит 12.08; RETENTION: до геймплея не больше одного клика).
    // Конверт ждёт, пока игрок сыграет первую смену, и достаётся ему при возвращении в меню.
    if (!this.progress.tutorialDone) return;

    const layer = this.add.container(0, 0).setDepth(300);
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.72);
    dim.fillRect(0, 0, width, height);
    layer.add(dim);

    // ЗАТЕМНЕНИЕ ОБЯЗАНО ЛОВИТЬ КЛИКИ, а само по себе `graphics` их пропускает: сквозь
    // модалку конверта можно было уйти в «Заслуги» или «Таблицу», а стрелки смешивали
    // фокус кнопок панели с кнопками меню под ней (красная команда 12.08).
    // `openLayer` уводит клавиатурный фокус в отдельный слой — как это уже сделано на карте.
    const block = this.add.zone(width / 2, height / 2, width, height).setInteractive();
    block.on('pointerup', () => {});   // клик по затемнению просто гасится
    layer.add(block);
    Input.openLayer(this, 'daily');

    const pw = width - 90;
    const ph = height * 0.265;
    const px = width / 2;
    const py = height * 0.45;
    const panel = this.add.graphics();
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 20);
    panel.lineStyle(4, THEME.colors.accent, 0.9);
    panel.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 20);
    layer.add(panel);

    layer.add(this.add.text(px, py - ph / 2 + 46, i18n.t('dailyTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
      color: THEME.colors.accentText, fontStyle: 'bold',
      align: 'center', wordWrap: { width: pw - 40 }
    }).setOrigin(0.5));

    layer.add(this.add.text(px, py - ph / 2 + 92, i18n.t('dailyStreak', { n: st.nextStreak }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text
    }).setOrigin(0.5));

    layer.add(drawCoinIcon(this, px - 46, py - ph / 2 + 148, 42));
    layer.add(this.add.text(px - 18, py - ph / 2 + 148, String(st.reward), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
      color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0, 0.5));

    const give = (amount, doubled) => {
      claimDaily(daily, todayKey(new Date()));
      this.progress.coins += amount;
      Analytics.event(EVENTS.DAILY_BONUS, { streak: daily.streak, doubled });
      Save.update({ coins: this.progress.coins, daily });
      // ПОДТВЕРЖДЕНИЕ ОБЯЗАНО БЫТЬ ВИДНО. Раньше окно молча пропадало в scene.restart() —
      // игрок жаловался 14.08: посмотрел рекламу, тут же закрыл её (без явного таймера
      // ролика — реклама на площадке без предзаполнения и правда иногда идёт статикой,
      // разобрано 13.08), вернулся в меню и не смог понять, дали ли ему монеты и
      // удвоились ли они. Кнопки убираем, панель на месте с явной суммой ещё секунду
      // с лишним — и только потом закрываем и обновляем меню.
      take.destroy(); dbl.destroy();
      const given = this.add.text(px, py + ph / 2 - 54, i18n.t('dailyGiven', { n: amount }) + (doubled ? ' ×2' : ''), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
        color: THEME.colors.successText, fontStyle: 'bold'
      }).setOrigin(0.5);
      layer.add(given);
      this.time.delayedCall(1500, () => {
        Input.closeLayer(this, 'daily');
        layer.destroy();
        this.scene.restart();      // перерисовать рекорд и монеты
      });
    };

    const take = createButton(this, px - 95, py + ph / 2 - 54, i18n.t('dailyTake'),
      () => give(st.reward, false),
      { color: THEME.colors.success, textColor: THEME.colors.textDark, fontSize: THEME.fontSize.small });
    layer.add(take);

    const dbl = createButton(this, px + 95, py + ph / 2 - 54, i18n.t('dailyDouble'), () => {
      // Реклама не показалась — награда всё равно выдаётся одинарной, а не пропадает.
      //
      // ФЛАГ ОБЯЗАТЕЛЕН. Площадка умеет позвать onRewarded, а следом onClose(false) из
      // обработчика ошибки — тогда награда начислялась ДВАЖДЫ за один просмотр (монеты
      // прибавляются, а claimDaily идемпотентен и повтор не ловит). Найдено красной
      // командой 12.08.
      let выдано = false;
      const once = (amount, doubled) => { if (выдано) return; выдано = true; give(amount, doubled); };
      Ads.showRewarded({
        onRewarded: () => once(st.reward * 2, true),
        onClose: (rewarded) => { if (!rewarded) once(st.reward, false); }
      });
    }, { color: THEME.colors.accent, textColor: THEME.colors.textDark, fontSize: THEME.fontSize.small });
    layer.add(dbl);
  }
}
