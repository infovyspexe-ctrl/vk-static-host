// НАГРАДА ПОСЛЕ БОЯ и содержимое схрона. Один экран на два случая: показывает добычу
// и, если есть выбор карты, даёт его сделать.
//
// Здесь же переход между урочищами: после хозяина урочища награда забирается, и только
// потом карта сменяется. Иначе игрок теряет добычу за босса при переходе — самая обидная
// потеря из возможных.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, bodyText, panel, toast } from '../ui/widgets.js';
import { createCardView, CARD_W, CARD_H } from '../ui/CardView.js';
import { cardView } from '../mechanics/deckrun/combat.js';
import { Input } from '../core/input.js';
import { Sounds } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { Progress } from '../meta/progress.js';
import { AdGate } from '../core/ads.js';
import { Ads } from '../yandex/ads.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { CATALOG } from '../data/catalog.js';
import { relicDescription } from '../ui/cardText.js';
import { claimUnlocks } from '../meta/achievements.js';

export class RewardScene extends Phaser.Scene {
  constructor() { super('Reward'); }

  create(data) {
    const { width, height } = this.scale;
    Input.setup(this);
    this.run = Session.run;
    this.tier = data && data.tier;
    this.picked = false;
    this.extraUsed = false;
    // ОБЯЗАТЕЛЬНО сбрасывать: Phaser переиспособляет ОДИН объект сцены на все награды похода,
    // а continue() при уходе ставит this.leaving = true. Без сброса здесь на ВТОРОЙ и каждой
    // следующей награде leaving остаётся true с прошлого раза, и continue() (`if (this.leaving)
    // return`) молча выходит, НЕ уводя на карту: карта берётся (picked=true), но экран замирает,
    // и выйти можно только F5 — новый объект сцены с leaving=undefined. Ровно тот баг, что игрок
    // ловил на каждом втором бою («первую награду взял, вторую не берётся, помогает перезагрузка»).
    this.leaving = false;

    // Номер визита. Phaser переиспользует ОДИН И ТОТ ЖЕ объект сцены на каждую награду
    // за поход (15-30+ раз за сессию), а этот экран запускает асинхронщину — проверку
    // Ads.hasRewarded() и колбэк onRewarded после просмотра ролика. На площадке эти
    // ответы небыстрые (SDK сам предупреждал в консоли о медленных вызовах), и промис,
    // запущенный ЭТИМ визитом, может дозреть уже НА СЛЕДУЮЩЕМ — тот же this.picked/
    // this.extraUsed к тому моменту уже сброшены свежим create() и НЕ отличают «было
    // на этом экране» от «было на прошлом», проверка молча проходит и рисует/чинит
    // чужую кнопку поверх уже другой награды. Найдено сравнением с независимой чистой
    // реализацией того же экрана (25.08): у неё ровно этот случай закрыт номером визита.
    // Каждый асинхронный колбэк сверяет свой захваченный visitId с текущим и, если они
    // разошлись, тихо ничего не делает — вместо действия в чужом, уже сменившемся контексте.
    this.visitId = (this.visitId || 0) + 1;
    const bootVisitId = this.visitId;
    // Гасим визит СРАЗУ на уходе со сцены, не дожидаясь next create() — иначе колбэк,
    // успевший прийти в окне между stop() и следующим start(), ещё считал бы себя текущим.
    this.events.once('shutdown', () => { if (this.visitId === bootVisitId) this.visitId++; });

    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);

    if (data && data.treasure) {
      this.reward = { gold: data.treasure.gold, relic: data.treasure.relic, cards: [] };
      this.title = i18n.t('treasureTitle');
    } else {
      this.reward = data.reward || { gold: 0, cards: [], relic: null };
      this.title = i18n.t('rewardTitle');
    }

    // Золото и оберег из схрона движок не начисляет — их выдаёт этот экран.
    //
    // Обнуляем в САМОМ data.treasure (это тот же объект, что лежит в state.pending, а не
    // копия): если игрок вернётся на этот экран второй раз (MenuScene теперь умеет
    // резюмировать 'treasure'/'reward' — раньше такой возврат заводил на карту с нулём
    // доступных узлов, тупик, найденный живым игроком 22.08), начисление не повторится.
    if (data && data.treasure) {
      if (this.reward.gold) { this.run.state.gold += this.reward.gold; data.treasure.gold = 0; }
      if (this.reward.relic) { this.run.addRelic(this.reward.relic); data.treasure.relic = null; }
      Session.saveRun();
    }
    Progress.bump('maxGold', this.run.state.gold, 'max');

    heading(this, width / 2, 110, this.title);
    this.buildLoot();
    this.buildCards();
    this.buildFooter();

    // Зарубки выдаём здесь: это первая спокойная точка после боя, и игрок видит их
    // отдельно от боевой суеты.
    const fresh = claimUnlocks();
    if (fresh.length) {
      Sounds.relic();
      this.time.delayedCall(400, () => toast(this, i18n.t('achUnlocked', { n: i18n.t('ach_' + fresh[0].id) })));
      fresh.forEach((a) => Analytics.event(EVENTS.ACHIEVEMENT, { id: a.id }));
    }
  }

  buildLoot() {
    const { width } = this.scale;
    let y = 180;
    // Возврат на схрон, где золото/оберег уже начислены прошлым заходом (см. create()) —
    // gold/relic обнулены НАРОЧНО, чтобы не выдать их повторно, но пустой экран с одной
    // кнопкой «Взять» выглядит как поломка, а не как «тут уже нечего брать». Дошёл ровно
    // так у живого игрока: перезапуск компьютера посреди схрона, «Продолжить забег» —
    // и пустой экран, «100% похоже на баг». Раз добыча всегда даёт золото > 0 с первого
    // раза, полностью пустой buildLoot означает именно это, а не новый пустой схрон.
    if (!this.reward.gold && !this.reward.heal && !this.reward.relic) {
      this.add.text(width / 2, y + 40, i18n.t('rewardClaimed'), {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
      }).setOrigin(0.5);
      this.lootBottom = y + 40;
      return;
    }
    if (this.reward.gold) {
      Sounds.coin();
      this.add.text(width / 2, y, i18n.t('goldGained', { n: this.reward.gold }), {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.normal, color: THEME.colors.gold,
      }).setOrigin(0.5);
      y += 54;
    }
    if (this.reward.heal) {
      this.add.text(width / 2, y, '+' + this.reward.heal + ' ' + i18n.t('hp'), {
        fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.successText,
      }).setOrigin(0.5);
      y += 46;
    }
    if (this.reward.relic) {
      Sounds.relic();
      const def = CATALOG.relics[this.reward.relic];
      panel(this, width / 2, y + 46, width - 60, 116, { fill: THEME.colors.panel });
      this.add.text(width / 2, y + 18, i18n.t('relicFound') + ': ' + i18n.t('relic_' + this.reward.relic), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
      }).setOrigin(0.5);
      bodyText(this, width / 2, y + 62, relicDescription(this.reward.relic, def), { wrap: width - 100 });
      // Оберег из награды за бой начисляется здесь; из схрона — уже начислен выше.
      // Защита от повторной выдачи при возврате на этот же экран (см. комментарий в
      // create()): проверка владения — на случай старого сейва, где оберег уже выдан,
      // но объект ещё не обнулён; обнуление — чтобы следующий заход не выдал снова.
      if (!this.run.state.relics.includes(this.reward.relic)) this.run.addRelic(this.reward.relic);
      this.reward.relic = null;
      Session.saveRun();
      y += 120;
    }
    this.lootBottom = y;
  }

  buildCards() {
    const { width } = this.scale;
    // Карты — в нижней трети, ближе к большому пальцу: экран награды это ровно тот
    // момент, когда игрок тянется к телефону одной рукой.
    this.cardsY = Math.max(this.lootBottom + 150, 700);
    if (!this.reward.cards || !this.reward.cards.length) return;

    this.add.text(width / 2, this.cardsY - 130, i18n.t('chooseCard'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
    }).setOrigin(0.5);

    this.cardLayer = this.add.container(0, 0);
    this.renderCards();
  }

  renderCards() {
    this.cardLayer.removeAll(true);
    const { width } = this.scale;
    const list = this.reward.cards;
    const scale = list.length > 3 ? 0.78 : 0.92;
    const cw = CARD_W * scale;
    const step = Math.min(cw + 14, (width - 40 - cw) / Math.max(1, list.length - 1));
    const totalW = cw + step * (list.length - 1);
    const startX = (width - totalW) / 2 + cw / 2;

    list.forEach((id, i) => {
      const def = cardView(CATALOG.cards[id], false);
      const v = createCardView(this, startX + step * i, this.cardsY, id, def, { scale });
      // Один вызов, не два: makeSelectable сам делает setInteractive и вешает pointerup,
      // плюс регистрирует карту в клавиатурной навигации. Двойная регистрация (было:
      // ручной setInteractive+pointerup ПЛЮС makeSelectable) заставляла pick(id) звать
      // ДВАЖДЫ на одном тапе — безобидно из-за guard'а `if (this.picked) return`, но
      // единственное место в игре с таким дублированием кода, расходящееся с образцом
      // (ShopScene/CombatScene/DeckViewer/MapScene — везде один вызов).
      Input.makeSelectable(v, () => this.pick(id));
      this.cardLayer.add(v);
    });
  }

  pick(id) {
    if (this.picked) return;
    this.picked = true;
    Sounds.cardPick();
    this.run.addCardToDeck(id, false);
    Progress.bump('maxDeck', this.run.state.deck.length, 'max');
    Session.saveRun();
    this.continue();
  }

  buildFooter() {
    const { width, height } = this.scale;
    const hasCards = this.reward.cards && this.reward.cards.length;
    // `isCurrent` из create() сюда не дотягивается — это отдельный метод, а не вложенная
    // функция, замыкание туда не достаёт. Ловим свой снимок visitId прямо здесь: buildFooter()
    // всегда зовётся синхронно из create() того же визита, так что на момент этой строки
    // this.visitId ещё точно «свежий».
    const visitId = this.visitId;
    const isCurrent = () => this.visitId === visitId;

    if (hasCards) {
      // «Ещё карта» за рекламу — честная награда: даёт выбор шире, а не силу даром.
      if (AdGate.canReward('extraCard')) {
        Ads.hasRewarded().then((has) => {
          // !isCurrent() — этот ответ пришёл на УЖЕ ДРУГОЙ визит того же переиспользуемого
          // объекта сцены (см. комментарий про visitId в create()). Без этой проверки
          // this.extraUsed/this.picked уже сброшены следующим create() и молчаливо пропускают
          // чужой ответ, как будто он про текущий экран.
          if (!has || this.extraUsed || this.picked || !isCurrent()) return;
          this.adBtn = createButton(this, width / 2, height - 210, i18n.t('adExtraCard'), () => {
            if (this.extraUsed || !isCurrent()) return;
            AdGate.spendReward('extraCard');
            Analytics.event(EVENTS.AD_REWARD_SHOWN, { place: 'extraCard' });
            Ads.showRewarded({
              onRewarded: () => {
                // Тот же визит-чек: ролик мог досмотреться уже после того, как игрок покинул
                // именно ЭТОТ экран награды (или его пересоздали под следующий бой).
                if (!isCurrent()) return;
                this.extraUsed = true;
                const extra = this.run.rollCardReward(this.tier || 'combat', 1);
                if (extra.length) this.reward.cards = this.reward.cards.concat(extra);
                // `onRewarded` площадка зовёт ДО `onClose` — сцена в этот момент ещё стоит
                // на паузе от game:pause (lifecycle.js). Пересоздавать карты (новые кликабельные
                // объекты через Input.makeSelectable) на неактивной сцене нельзя: игрок жаловался,
                // что после «Ещё карта за рекламу» переставали отвечать вообще ВСЕ карты и даже
                // «Пропустить» — похоже, регистрация ввода на паузе портит весь список хитов
                // сцены, не только новые объекты. Ждём реального resume перед перерисовкой.
                const finish = () => {
                  if (!isCurrent()) return; // resume мог случиться уже на другом визите
                  this.renderCards();
                  if (this.adBtn) this.adBtn.destroy();
                };
                if (this.sys.isActive()) finish();
                else this.sys.events.once('resume', finish);
              },
            });
          }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText, fontSize: THEME.fontSize.small });
        });
      }
      createButton(this, width / 2, height - 120, i18n.t('skip'), () => this.continue(), {
        color: THEME.colors.neutral, textColor: THEME.colors.text,
      });
    } else {
      createButton(this, width / 2, height - 120, i18n.t('take'), () => this.continue(), {
        color: THEME.colors.primary,
      });
    }
  }

  // Переход дальше. Хозяин урочища — единственный случай, когда карта сменяется.
  continue() {
    if (this.leaving) return;
    this.leaving = true;
    if (this.tier === 'boss') {
      Analytics.event(EVENTS.ACT_CLEARED, { act: this.run.state.act });
      // Открытие героев привязано к боссам: это самая заметная веха похода.
      if (this.run.state.act === 1) Progress.unlockHero('vedunya') && Analytics.event(EVENTS.HERO_UNLOCKED, { hero: 'vedunya' });
      if (this.run.state.act === 2) Progress.unlockHero('oboroten') && Analytics.event(EVENTS.HERO_UNLOCKED, { hero: 'oboroten' });
      const more = this.run.advanceAct();
      Session.saveRun();
      if (!more) { this.goTo('Result'); return; }
    } else {
      // advanceAct() у босса сам обнуляет pending; здесь — та же уборка для обычной
      // награды и схрона, плюс сейв: «Пропустить»/«Взять» до сих пор не сохраняли вовсе.
      this.run.clearPending();
      Session.saveRun();
    }
    this.goTo('Map');
  }

  // Живой игрок поймал повтор той же гонки в ДРУГОЙ цепочке переходов (не в этой сцене) —
  // единичная отсрочка здесь не спасала общую картину. Приём стал общим: Input.goTo
  // (core/input.js) проверяет и повторяет переход, а не просто сдвигает его на кадр.
  goTo(key) {
    Input.goTo(this, key);
  }
}
