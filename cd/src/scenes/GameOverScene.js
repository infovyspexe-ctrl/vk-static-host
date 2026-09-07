// GameOver: оверлей поверх Game-сцены, ДВА последовательных шага (не один общий экран).
//
// Шаг 1 «оживить или закончить» — только если оживление вообще доступно (data.canRevive):
// заголовок + кнопки «Оживить (реклама)» / «Закончить забег», без статистики и без ×2.
// Раньше «Оживить» стояла на одном экране рядом с «Кристаллы ×2 (реклама)», и игрок мог
// перепутать — досмотреть ×2-рекламу и удивиться, что забег всё равно кончился (жалоба
// игрока 2026-08-22): выбор «оживить / кристаллы» должен быть ДО, а не ВМЕСТЕ со статистикой,
// иначе неочевидно, что это взаимоисключающие пути.
// Шаг 2 «итог забега» — если оживления не было (!canRevive) ИЛИ игрок нажал «Закончить
// забег»: очки/волна/кристаллы/рекорд, кнопка «Кристаллы ×2 (реклама)», прогресс Лаборатории,
// «Заново»/«В меню». «Оживить» здесь уже нет — выбор сделан на шаге 1.
//
// Запускается через scene.launch('GameOver', { score, wave, crystals, best, isNewBest,
//   canRevive, onRetry, onRevive, onMenu, onDoubleCrystals }).
// Камеру НЕ трогаем — живём поверх Game. Жирный overlay, который закрывает игру.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { createButton } from '../ui/Button.js';
import { Ads } from '../yandex/ads.js';
import { AdGate } from '../core/adGate.js';
import { showAdCountdown } from '../ui/adCountdown.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { Save } from '../yandex/save.js';
import { META_UPGRADES, metaCost } from '../data/meta.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data) {
    this.data = data;
    this._leaving = false; // сцена перезапускается через launch — флаг сбрасываем явно
    const { width, height } = this.scale;

    // Затемнение поверх.
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(0);

    const panelW = width - 60;
    const panelH = height * 0.7;
    const cx = width / 2, cy = height / 2;
    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);
    panel.lineStyle(3, THEME.colors.danger, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, THEME.radius);

    // Клавиатура в этом оверлее: Enter = «Заново», Esc = «В меню».
    Input.setup(this);

    // Экран смерти — спокойный экран, баннер здесь уместен (в бою он скрыт).
    Ads.showBanner();

    const y0 = cy - panelH / 2 + 50;
    this.add.text(cx, y0, i18n.t('gameOver'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
      color: THEME.colors.dangerText, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2).setStroke(THEME.textStroke.color, 5);

    // Геометрия нужна обоим шагам — сохраняем на инстансе, а не передаём аргументами.
    this._cx = cx; this._cy = cy; this._panelW = panelW; this._panelH = panelH; this._y0 = y0;

    const LAYER = 'gameover';
    this._LAYER = LAYER;
    Input.openLayer(this, LAYER);

    // Шаг 1 — только если оживление реально доступно (иначе выбирать не из чего, сразу
    // показываем итог, как раньше).
    if (data.canRevive) this._showReviveChoice();
    else this._showStats();
  }

  // ── Шаг 1: «Оживить или закончить забег» — ДО статистики и ДО кнопки ×2. ──
  _showReviveChoice() {
    const { _cx: cx } = this;
    let by = this._y0 + 130;
    const revive = createButton(this, cx, by, i18n.t('revive'), () => {
      revive.destroy(); end.destroy();
      this._close(this._LAYER);
      this.data.onRevive();
    }, { color: THEME.colors.accent }).setDepth(2);
    by += 90;
    const end = createButton(this, cx, by, i18n.t('goEndRun'), () => {
      revive.destroy(); end.destroy();
      this._showStats();
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text }).setDepth(2);
  }

  // ── Шаг 2: итог забега. Выбор «оживить» уже сделан (или был недоступен) — здесь его нет. ──
  _showStats() {
    const { _cx: cx, _cy: cy, _panelW: panelW, _panelH: panelH, _y0: y0, data } = this;

    // РАСКЛАДКА КУРСОРОМ, а не фиксированными оффсетами от y0. Строк на этом экране
    // несколько (кристаллы, рекорд, кнопка ×2, прогресс Лаборатории), и жёсткие «y0 + 150»
    // начали претендовать на одну и ту же высоту — две подписи налезали друг на друга.
    // Курсор двигается вниз ровно на высоту добавленного, поэтому новая строка ничего не ломает.
    let ty = y0 + 90;
    const line = (text, style, gap) => {
      const o = this.add.text(cx, ty, text, {
        fontFamily: THEME.fontFamily, align: 'center', wordWrap: { width: panelW - 60 }, ...style
      }).setOrigin(0.5).setDepth(2);
      ty += gap;
      return o;
    };

    line(i18n.t('goScore', { n: data.score }),
      { fontSize: THEME.fontSize.normal, color: THEME.colors.text }, 50);

    line(i18n.t('goWave', { n: data.wave }),
      { fontSize: THEME.fontSize.small, color: THEME.colors.textDim }, 50);

    this.crystalsTxt = line(i18n.t('goCrystals', { n: data.crystals }),
      { fontSize: THEME.fontSize.small, color: THEME.colors.xpText, fontStyle: 'bold' }, 46)
      .setStroke(THEME.textStroke.color, 3);

    if (data.isNewBest) {
      const best = line(i18n.t('goBest'),
        { fontSize: THEME.fontSize.normal, color: THEME.colors.accentText, fontStyle: 'bold' }, 48)
        .setStroke(THEME.textStroke.color, 4);
      this.tweens.add({ targets: best, scale: 1.1, duration: 500, yoyo: true, repeat: -1 });
    }

    const LAYER = this._LAYER;
    let by = cy + panelH / 2 - 200;

    // ×2 за просмотр — самая конверсионная точка жанра: игрок уже видит цифру, которую
    // удваивает. Кнопку не рисуем, если суточный лимит выбран или ролика нет в наличии
    // (на VK показывать кнопку награды без предзагрузки — нарушение п.5.1.5.3).
    if (data.crystals > 0 && AdGate.canReward('x2crystals')) {
      const x2y = ty + 8; // позиция занимается СРАЗУ, до ответа hasRewarded — иначе
      ty += 56;           // строка прогресса Лаборатории уехала бы на её место
      Ads.hasRewarded().then((ready) => {
        if (!ready || !this.scene.isActive() || this._leaving) return;
        const x2 = createButton(this, cx, x2y, i18n.t('goDouble'), () => {
          x2.disableInteractive();
          Analytics.event(EVENTS.AD_REWARD_SHOWN, { point: 'x2crystals' });
          let paid = false;
          Ads.showRewarded({
            onRewarded: () => {
              paid = true;
              AdGate.spendReward('x2crystals');
              data.onDoubleCrystals(data.crystals);
              this.crystalsTxt.setText(i18n.t('goDoubled', { n: data.crystals * 2 }));
              x2.destroy();
            },
            onClose: () => {
              if (paid) return;
              Analytics.event(EVENTS.AD_REWARD_DECLINED, { point: 'x2crystals' });
              if (x2.active) x2.setInteractive({ useHandCursor: true });
            }
          });
        }, { color: THEME.colors.accent, layer: LAYER, paddingX: 22, paddingY: 10,
             fontSize: THEME.fontSize.small });
        x2.setDepth(2);
      });
    }

    // Связка забега с Лабораторией: игрок должен видеть, ЗАЧЕМ ему кристаллы, иначе экран
    // смерти — тупик с голыми цифрами. Ближайшая цель — самое дешёвое доступное улучшение.
    const meta = (Save.cache && Save.cache.meta) || {};
    const have = meta.crystals || 0;
    let cheapest = null;
    for (const def of META_UPGRADES) {
      const lvl = (meta.upgrades && meta.upgrades[def.id]) || 0;
      if (lvl >= def.maxLevel) continue;
      const cost = metaCost(def, lvl);
      if (!cheapest || cost < cheapest.cost) cheapest = { def, cost };
    }
    if (cheapest) {
      const left = cheapest.cost - have;
      line(left > 0
        ? i18n.t('goToNext', { n: left, name: i18n.t(cheapest.def.name) })
        : i18n.t('goLabReady'), {
        fontSize: THEME.fontSize.tiny,
        color: left > 0 ? THEME.colors.textDim : THEME.colors.successText
      }, 40);
    }

    // «Оживить» сюда не попадает — выбор уже сделан на шаге 1 (или был недоступен вовсе).
    if (!data.canRevive) {
      this.add.text(cx, by + 20, i18n.t('goNoRevive'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim
      }).setOrigin(0.5).setDepth(2);
      by += 90;
    }

    // «Заново» и «В меню» — это логическая пауза, единственное место, где мы вообще
    // показываем полноэкранную рекламу (и только если гейт взведён).
    createButton(this, cx, by, i18n.t('retry'), () => {
      this._close(LAYER);
      this._gatedInterstitial(() => data.onRetry());
    }).setDepth(2);
    by += 90;
    createButton(this, cx, by, i18n.t('toMenu'), () => {
      this._close(LAYER);
      this._gatedInterstitial(() => data.onMenu());
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text }).setDepth(2);

    // Enter -> retry, Esc -> menu (поверх фокус-навигации). Только на этом шаге: на шаге 1
    // единственные осмысленные действия — «Оживить»/«Закончить забег», у них нет удобной
    // Enter/Esc-семантики, поэтому там управление только тапом/кликом.
    this.input.keyboard.on('keydown-ENTER', () => { this._close(LAYER); this._gatedInterstitial(() => data.onRetry()); });
    this.input.keyboard.on('keydown-ESC', () => { this._close(LAYER); this._gatedInterstitial(() => data.onMenu()); });
  }

  // Полноэкранная реклама ТОЛЬКО в логической паузе и только если гейт взведён.
  // Отсчёт обязателен: он предупреждает игрока и служит антифрод-буфером — без него
  // showFullscreen, вызванный в том же тике, что и тап игрока, рискует поймать второй,
  // случайный тап прямо по открывшейся рекламе (YANDEX-MODERATION.md, «реклама в момент
  // активного взаимодействия»).
  _gatedInterstitial(onDone) {
    // Сцена живёт ещё 3 секунды отсчёта, поэтому второй Enter/Esc за это время дошёл бы
    // сюда снова и перезапустил партию дважды. Уходим ровно один раз.
    if (this._leaving) return;
    this._leaving = true;
    if (!AdGate.isArmed()) { onDone(); return; }
    AdGate.disarm();
    Analytics.event(EVENTS.AD_INTERSTITIAL_SHOWN);
    Analytics.event(EVENTS.INTERSTITIAL_AD_SHOWN, { place: 'game_over' });
    // 2 секунды — ровно, как требует п.4.4 (не 3): передавать явно необязательно (дефолт
    // модуля тоже 2), но оставляем аргумент, чтобы точка была видна при аудите рекламы.
    showAdCountdown(this, () => Ads.showFullscreen({ onClose: onDone }), 2);
  }

  // Сцену здесь НЕ останавливаем: поверх неё ещё рисуется отсчёт перед рекламой.
  // Остановка происходит в GameScene — и onRetry, и onMenu зовут scene.stop('GameOver')
  // сами, так что сцена гарантированно закрывается.
  _close(layer) {
    Input.closeLayer(this, layer);
  }
}
