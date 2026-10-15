// DayEndScene: итог смены поверх приостановленной GameScene.
//
// Было простынёй на весь экран: звёзды, статистика, магазин апгрейдов и кнопка «дальше» —
// всё сразу, каждые полторы минуты. У игр с высоким рейтингом сессия наоборот бесшовная, а
// прерывания и меню — места, где игрок уходит (RETENTION.md). Поэтому теперь это ПЛАШКА:
// вердикт, звёзды, дань, выданные заслуги и один тап «дальше». Магазин уехал за кнопку.
//
// Данные приходят через this.scene.launch('DayEnd', {...}) из GameScene.endDay. Кампания
// к этому моменту УЖЕ продвинута — здесь её повторно не считают, иначе смена шагнула бы дважды.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { UPGRADES, upgradeCost, ECONOMY } from '../data/balance.js';
import { Input } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Ads } from '../yandex/ads.js';
import { showInterstitial } from '../ui/interstitial.js';
import { Save } from '../yandex/save.js';
import { Leaderboard } from '../yandex/leaderboard.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { canBuyUpgrade, buyUpgrade, upgradeLevel } from '../meta/progress.js';
import { drawStar, drawCoinIcon } from '../render/icons.js';
import { unlockedRecipeIds, resolveBossShift, currentDistrict } from '../meta/campaign.js';

export class DayEndScene extends Phaser.Scene {
  constructor() { super('DayEnd'); }

  create(data) {
    const { width, height } = this.scale;
    this.data_in = data;
    this.progress = data.progress;
    this.revenueDoubled = false;
    this.outcome = data.outcome;
    this.shopLayer = null;

    Input.setup(this);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.72);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(0);

    // Плашка ПО СОДЕРЖИМОМУ: заслуг может быть ноль, а может три, и при фиксированной
    // высоте в середине зияет пустота. Считаем заранее, потом рисуем фон.
    const verdictPre = this.verdictText();
    const whyPre = data.goal > 0 ? this.starsWhy() : '';
    const unlockedPre = data.unlocked || [];
    const pw = width - 56;
    const ph = 42 + 40
      + (verdictPre.hint ? 34 : 0)
      + 52
      + (whyPre ? (whyPre.includes('\n') ? 48 : 26) : 0)   // «за что звёзды», иногда в две строки
      + (data.tributeNeed > 0 ? 58 : 0)
      + (data.outcome === 'nextDistrict' ? 26 : 0)   // строка «новый рецепт»
      + Math.min(3, unlockedPre.length) * 24
      + (unlockedPre.length > 3 ? 22 : 0)
      + 52      // две строки статистики
      + 150;    // блок кнопок
    const px = width / 2;
    const top = Math.max(height * 0.12, (height - ph) / 2);

    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(px - pw / 2, top, pw, ph, 22);
    panel.lineStyle(3, THEME.colors.accent, 0.6);
    panel.strokeRoundedRect(px - pw / 2, top, pw, ph, 22);

    let y = top + 42;

    const verdict = verdictPre;
    this.add.text(px, y, verdict.title, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: verdict.color,
      fontStyle: 'bold', align: 'center', wordWrap: { width: pw - 40 }
    }).setOrigin(0.5).setDepth(2);
    y += 40;

    if (verdict.hint) {
      this.add.text(px, y, verdict.hint, {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
        align: 'center', wordWrap: { width: pw - 40 }
      }).setOrigin(0.5).setDepth(2).setAlpha(0.85);
      y += 34;
    }

    for (let i = 0; i < 3; i++) drawStar(this, px + (i - 1) * 54, y + 10, 46, i < data.stars).setDepth(2);
    y += 52;

    // ЗА ЧТО столько звёзд. Молчаливая оценка не учит: игрок должен видеть, что мерили
    // выручку относительно цели смены, и что ушедший гость закрывает третью звезду.
    if (whyPre) {
      const why = whyPre;
      this.add.text(px, y, why, {
        fontFamily: THEME.fontFamily, fontSize: 16, color: THEME.colors.text,
        align: 'center', lineSpacing: 3, wordWrap: { width: pw - 40 }
      }).setOrigin(0.5, 0).setDepth(2).setAlpha(0.9);
      y += why.includes('\n') ? 48 : 26;
    }

    // Дань — главный счётчик кампании. В бесконечном режиме её нет.
    if (data.tributeNeed > 0) {
      this.tributeLabel = this.add.text(px, y, '', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.accentText
      }).setOrigin(0.5).setDepth(2);
      y += 24;
      this.tributeBar = this.add.graphics().setDepth(2);
      this.tributeBarY = y;
      this.tributeBarW = pw - 80;
      y += 34;
      this.drawTribute();
    }

    // ЧТО ОТКРЫЛ НОВЫЙ РАЙОН. Строка `newRecipe` лежала в локализации без единого вызова:
    // рецепты открывались молча, и игрок узнавал о них, только столкнувшись с незнакомым
    // заказом. Открытый контент — это награда, и она должна быть названа (аудит 12.08).
    if (this.outcome === 'nextDistrict') {
      const d = currentDistrict(this.progress.campaign);
      if (d && d.recipes && d.recipes.length) {
        this.add.text(px, y, i18n.t('newRecipe', { name: d.recipes.map((r) => i18n.t('pizza_' + r)).join(', ') }), {
          fontFamily: THEME.fontFamily, fontSize: 18, color: THEME.colors.accentText,
          align: 'center', wordWrap: { width: pw - 40 }
        }).setOrigin(0.5).setDepth(2);
        y += 26;
      }
    }

    // Выданные заслуги: молча выданная награда не работает как награда.
    const unlocked = unlockedPre;
    unlocked.slice(0, 3).forEach((a) => {
      this.add.text(px, y, i18n.t('achGot', { name: i18n.t('ach_' + a.id) }) + '  +' + a.reward, {
        fontFamily: THEME.fontFamily, fontSize: 18, color: THEME.colors.successText,
        align: 'center', wordWrap: { width: pw - 40 }
      }).setOrigin(0.5).setDepth(2);
      y += 24;
    });
    if (unlocked.length > 3) {
      this.add.text(px, y, i18n.t('achMore', { n: unlocked.length - 3 }), {
        fontFamily: THEME.fontFamily, fontSize: 16, color: THEME.colors.successText
      }).setOrigin(0.5).setDepth(2);
      y += 22;
    }

    this.statsText = this.add.text(px, y, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
      align: 'center', lineSpacing: 4
    }).setOrigin(0.5, 0).setDepth(2);
    this.updateStats();

    // Кнопки: удвоение, магазин, дальше.
    const btnY = top + ph - 48;
    this.doubleBtn = createButton(this, px, btnY - 64, i18n.t('doubleRevenue'),
      () => this.doubleRevenue(),
      { color: THEME.colors.accent, textColor: THEME.colors.textDark, fontSize: THEME.fontSize.small });
    this.doubleBtn.setDepth(2);

    createButton(this, px - 92, btnY, i18n.t('shopButton'), () => this.openShop(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.tiny }).setDepth(2);

    const toMap = this.outcome === 'nextDistrict' || this.outcome === 'campaignDone';
    createButton(this, px + 92, btnY, toMap ? i18n.t('toMap') : i18n.t('nextShort'),
      () => this.nextDay(),
      { color: THEME.colors.success, textColor: THEME.colors.textDark, fontSize: THEME.fontSize.tiny }).setDepth(2);

    // Итог слышен раньше, чем прочитан: отсрочка Дона звучит иначе, чем взятый район.
    if (this.outcome === 'retryShift') Audio.shiftFail(); else Audio.shiftWin();

    Analytics.event(EVENTS.SHOP_OPENED, { day: data.day });
  }

  drawTribute() {
    if (!this.tributeBar) return;
    const px = this.scale.width / 2;
    const have = this.data_in.tributeHave;
    const need = this.data_in.tributeNeed;
    const frac = Math.max(0, Math.min(1, have / need));
    // СОБРАННУЮ ДАНЬ НЕ ПОКАЗЫВАЕМ ДРОБЬЮ. «3475 из 2600» читалось как бред: цель уже
    // перевыполнена, а игру всё равно как будто просят собрать (замечание владельца).
    // Дань проверяется только на последней смене района — об этом и надо сказать.
    this.tributeLabel.setText(frac >= 1
      ? i18n.t('tributeReady')
      : i18n.t('tributeTitle') + ': ' + i18n.t('tributeProgress', { have, need }));
    this.tributeBar.clear();
    this.tributeBar.fillStyle(0x000000, 0.35);
    this.tributeBar.fillRoundedRect(px - this.tributeBarW / 2, this.tributeBarY, this.tributeBarW, 16, 8);
    this.tributeBar.fillStyle(frac >= 1 ? THEME.colors.success : THEME.colors.accent, 1);
    this.tributeBar.fillRoundedRect(px - this.tributeBarW / 2, this.tributeBarY, this.tributeBarW * frac, 16, 8);
  }

  // Почему звёзд столько: выручка против цели смены, плюс главная причина потолка —
  // ушедшие гости. Строка короткая: это подпись под звёздами, а не отчёт.
  // ЗА ЧТО СТОЛЬКО ЗВЁЗД. Строка всегда называет СЛЕДУЮЩИЙ порог и то, сколько до него
  // не хватило: «выручка 945 из 520» ничего не объясняла — игрок видел число БОЛЬШЕ цели
  // и две звезды рядом (замечание владельца 2026-08-12).
  //
  // Выручка берётся БЕЗ удвоения за рекламу, даже если ролик уже посмотрен: звёзды —
  // оценка работы, и купить её нельзя, они и посчитаны до этого экрана. Удвоение идёт в
  // кошелёк и в дань, это видно ниже.
  starsWhy() {
    const d = this.data_in;
    const t = ECONOMY.starTargets;
    const needThree = Math.round(d.goal * t.three);
    const needTwo = Math.round(d.goal * t.two);

    if (d.stars >= 3) return i18n.t('goalMet', { need: needThree });

    // ПОТЕРИ СИЛЬНЕЕ ВЫРУЧКИ: с ними оценка упирается в потолок независимо от заработка.
    // Поэтому сначала называем их, и только если дело не в них — говорим про порог.
    // Иначе выходило «До трёх звёзд: 900 из 780» — порог перекрыт, а звезды нет, и строка
    // читается как ошибка в игре.
    if (d.lost >= 3) return i18n.t('starsManyLost', { n: d.lost });
    if (d.lost > 0 && d.coins >= needThree) return i18n.t('starsLostCap');

    const short = d.stars === 2
      ? i18n.t('toThreeStars', { have: d.coins, need: needThree })
      : i18n.t('toTwoStars', { have: d.coins, need: needTwo });
    return d.lost > 0 ? short + '\n' + i18n.t('starsLostCap') : short;
  }

  // Что показать в шапке: продвинулись, взяли район, прошли кампанию или переигрываем.
  verdictText() {
    const d = this.data_in;
    if (this.outcome === 'campaignDone') {
      return { title: i18n.t('campaignDone'), hint: i18n.t('campaignDoneHint'), color: THEME.colors.accentText };
    }
    if (this.outcome === 'nextDistrict') {
      return { title: i18n.t('districtCleared'), hint: null, color: THEME.colors.successText };
    }
    if (this.outcome === 'retryShift') {
      // Причин отсрочки две, и они читаются по-разному: не собрал дань или потерял гостя
      // на заказе Дона. Без объяснения игрок не поймёт, что делать иначе.
      const why = d.lost > 0 && d.wasBoss ? i18n.t('donDelayLost') : i18n.t('donDelayWhy');
      return { title: i18n.t('donDelay'), hint: why, color: THEME.colors.dangerText };
    }
    return { title: i18n.t('dayEnd', { n: d.day }), hint: null, color: THEME.colors.accentText };
  }

  // ДВЕ строки вместо трёх, и каждое число подписано так, чтобы не спорить с соседним.
  // Было четыре числа про деньги (выручка, заработано, чаевые, монеты), из которых
  // непонятно, что во что входит: чаевые стояли рядом с заработком и читались как
  // прибавка сверху, хотя они УЖЕ внутри. Кошелёк назывался «монеты» и выглядел ещё
  // одним итогом смены, хотя это остаток на счету.
  updateStats() {
    const d = this.data_in;
    const earned = this.revenueDoubled ? d.coins * 2 : d.coins;
    this.statsText.setText([
      i18n.t('earnedShift') + ': ' + earned + '   ' + i18n.t('tipsIncluded', { n: d.tips }),
      i18n.t('served') + ': ' + d.served + '   ' + i18n.t('lost') + ': ' + d.lost
        + '   ' + i18n.t('wallet') + ': ' + this.progress.coins
    ]);
  }

  // «×2 ко ВСЕЙ выручке смены» вместо прежнего «×2 к чаевым»: чаевые — около трети выдачи,
  // поэтому старая кнопка стоила дёшево и жалась редко.
  doubleRevenue() {
    if (this.revenueDoubled) return;
    // Ролик закрылся без награды — сказать об этом вслух. Молчание читается как «показали
    // обычную рекламу и ничего не дали» (см. комментарий в GameScene.instantCookAd).
    Ads.showRewarded({
      onClose: () => { if (!this.revenueDoubled) this.flashText(i18n.t('adNoReward')); },
      onRewarded: () => {
        this.revenueDoubled = true;
        const extra = this.data_in.coins;
        this.progress.coins += extra;
        const campaign = this.progress.campaign;

        // Удвоение идёт И в дань, иначе игрок увидит рост кошелька, но не прогресса.
        if (this.data_in.tributeNeed > 0) {
          campaign.tribute += extra;
          this.data_in.tributeHave += extra;
          this.drawTribute();

          // ЛОВУШКА ПОРЯДКА: completeShift отработал ДО этого экрана, поэтому исход уже
          // посчитан по недоудвоенной выручке. Без пересчёта игрок смотрел бы рекламу,
          // видел собранную дань — и всё равно шёл переигрывать смену. Это выглядит как
          // обман за просмотр ролика. Пересчитываем ТОЛЬКО случай «не хватило денег»:
          // условие «ни одного ушедшего гостя» реклама отменять не должна.
          if (this.outcome === 'retryShift' && this.data_in.wasBoss && this.data_in.lost === 0) {
            const again = resolveBossShift(campaign, 0);
            if (again.outcome !== 'retryShift') {
              Analytics.event(EVENTS.REWARD_DOUBLE_REVENUE, { extra, savedBossShift: true });
              Save.update({ coins: this.progress.coins, campaign });
              this.data_in.outcome = again.outcome;
              this.scene.restart(this.data_in);   // перерисовать вердикт и кнопку «дальше»
              return;
            }
          }
        }

        Analytics.event(EVENTS.REWARD_DOUBLE_REVENUE, { extra, savedBossShift: false });
        this.doubleBtn.setVisible(false);
        this.updateStats();
        Save.update({ coins: this.progress.coins, campaign });
      }
    });
  }

  // Магазин апгрейдов — по кнопке, а не поверх каждого итога.
  openShop() {
    if (this.shopLayer) { this.shopLayer.destroy(); this.shopLayer = null; return; }
    const { width, height } = this.scale;
    this.shopLayer = this.add.container(0, 0).setDepth(50);

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.8);
    dim.fillRect(0, 0, width, height);
    this.shopLayer.add(dim);

    this.shopLayer.add(this.add.text(width / 2, height * 0.16, i18n.t('shopTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
      color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5));

    this.shopRows = this.add.container(width / 2, height * 0.29);
    this.shopLayer.add(this.shopRows);
    this.drawShop();

    this.shopLayer.add(createButton(this, width / 2, height * 0.72, i18n.t('close'),
      () => { this.shopLayer.destroy(); this.shopLayer = null; },
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small }));
  }

  drawShop() {
    this.shopRows.removeAll(true);
    const ids = Object.keys(UPGRADES);
    const rowH = 78;
    ids.forEach((id, i) => {
      const u = UPGRADES[id];
      const lvl = upgradeLevel(this.progress, id);
      const maxed = lvl >= u.maxLevel;
      const cost = upgradeCost(id, lvl);
      const y = i * rowH;

      const g = this.add.graphics();
      g.fillStyle(THEME.colors.panelLight, 0.7);
      g.fillRoundedRect(-300, y - 32, 600, 64, 12);
      this.shopRows.add(g);

      this.shopRows.add(this.add.text(-286, y - 14, i18n.t(u.label) + '  ' + i18n.t('upgLevel', { n: lvl }), {
        fontFamily: THEME.fontFamily, fontSize: 21, color: THEME.colors.text, fontStyle: 'bold'
      }).setOrigin(0, 0.5));
      this.shopRows.add(this.add.text(-286, y + 13, i18n.t(u.label + '_desc'), {
        fontFamily: THEME.fontFamily, fontSize: 16, color: THEME.colors.text
      }).setOrigin(0, 0.5).setAlpha(0.85));

      if (maxed) {
        this.shopRows.add(this.add.text(250, y, i18n.t('maxed'), {
          fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.neutralText
        }).setOrigin(0.5));
      } else {
        // Кнопка создаётся в (0,0) и позиционируется относительно контейнера: иначе
        // hit-area не совпадает с визуалом (грабля, уже ловленная на ингредиентах).
        const btn = createButton(this, 0, 0, String(cost), () => this.tryBuy(id), {
          color: this.progress.coins >= cost ? THEME.colors.primary : THEME.colors.neutral,
          textColor: THEME.colors.primaryText, fontSize: THEME.fontSize.tiny
        });
        btn.setPosition(250, y);
        this.shopRows.add(btn);
        this.shopRows.add(drawCoinIcon(this, 250 - btn.width / 2 - 16, y, 22));
      }
    });
  }

  // Короткое всплывающее сообщение поверх всего (в том числе поверх магазина).
  flashText(text) {
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height * 0.62, text, {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.dangerText,
      fontStyle: 'bold', align: 'center', stroke: '#2c1810', strokeThickness: 6
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 1400, ease: 'Cubic.out',
      onComplete: () => t.destroy() });
  }

  tryBuy(id) {
    const u = UPGRADES[id];
    const check = canBuyUpgrade(this.progress, u, upgradeCost);
    if (!check.ok) {
      if (check.reason === 'poor') {
        Analytics.event(EVENTS.UPGRADE_BOUGHT, { id, failed: true });
        // МОЛЧАЛИВЫЙ ОТКАЗ = сломанная кнопка с точки зрения игрока: он жмёт «купить»,
        // ничего не происходит, и он не знает почему. Строка `notEnough` лежала в
        // локализации и не использовалась вовсе (красная команда 12.08).
        this.flashText(i18n.t('notEnough'));
      }
      return;
    }
    buyUpgrade(this.progress, u, upgradeCost);
    if (id === 'oven2') this.progress.stats.oven2Bought = 1;
    Analytics.event(EVENTS.UPGRADE_BOUGHT, { id, level: upgradeLevel(this.progress, id) });
    this.drawShop();
    this.updateStats();
    Save.update({
      coins: this.progress.coins, upgrades: this.progress.upgrades, stats: this.progress.stats
    });
  }

  async nextDay() {
    try { await Leaderboard.setScore('score', this.progress.bestScore); } catch (e) {}

    const campaign = this.progress.campaign;
    const { RECIPES } = await import('../data/balance.js');
    const openNow = new Set(unlockedRecipeIds(campaign));
    RECIPES.filter((rc) => openNow.has(rc.id) && !this.progress.recipesSeen[rc.id]).forEach((rc) => {
      this.progress.recipesSeen[rc.id] = 1;
      Analytics.event(EVENTS.RECIPE_UNLOCKED, { id: rc.id });
    });
    Analytics.event(EVENTS.NEW_DAY, { n: campaign.shift + 1, district: campaign.district });

    // ОБЛАЧНОЕ СОХРАНЕНИЕ НЕ ИМЕЕТ ПРАВА СОРВАТЬ ПЕРЕХОД. Без catch отказ сети валит весь
    // nextDay() исключением, и игрок остаётся на экране итога навсегда — ни следующей смены,
    // ни рекламы. Локальное зеркало сейва при этом всё равно записано.
    await Save.save({
      campaign, coins: this.progress.coins, upgrades: this.progress.upgrades,
      bestScore: this.progress.bestScore, bestDay: this.progress.bestDay,
      recipesSeen: this.progress.recipesSeen, muted: this.progress.muted,
      tutorialDone: this.progress.tutorialDone, achievements: this.progress.achievements,
      daily: this.progress.daily, stats: this.progress.stats,
      // hintsOn/hintsAsked ОБЯЗАТЕЛЬНЫ здесь: Save.save() пишет ПОЛНОЙ заменой, а не
      // слиянием. Без этих двух полей выбор «играть без подсказок» молча откатывался
      // после каждой смены, и предложение в конце района всплывало снова — при том что
      // игра сама объявляет переспрашивание навязчивостью. Найдено красной командой 12.08.
      hintsOn: this.progress.hintsOn, hintsAsked: this.progress.hintsAsked
    }).catch((e) => console.warn('[итог смены] сейв не ушёл в облако:', e));

    const toMap = this.outcome === 'nextDistrict' || this.outcome === 'campaignDone';
    const go = () => {
      this.scene.stop('Game');
      this.scene.start(toMap ? 'Map' : 'Game');
    };

    // ПОСЛЕ ОБУЧАЮЩЕЙ СМЕНЫ РЕКЛАМЫ НЕТ. Правило площадки и замеренный кейс: ролик на
    // входе даёт уход больше 90% на первой секунде. Первая межстраничная — только после
    // того, как игрок понял, во что играет.
    if (this.data_in.wasTutorial) { go(); return; }
    // Через showInterstitial, а не напрямую: там отсчёт «Реклама через 3…» и общий с
    // выходом в меню интервал, чтобы два перехода подряд не дали две рекламы встык.
    showInterstitial(this, go);
  }
}
