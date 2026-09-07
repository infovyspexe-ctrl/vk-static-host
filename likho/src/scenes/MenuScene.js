// ГЛАВНОЕ МЕНЮ. Отсюда видно всё, ради чего игрок возвращается: незаконченный поход,
// дар дня, алтарь памяти и зарубки.
//
// «Продолжить поход» стоит первым и появляется только когда есть что продолжать: поход
// длиной в час без возможности прерваться не играют вовсе.
import { THEME } from '../ui/theme.js';
import { i18n } from '../i18n/strings.js';
import { createButton } from '../ui/Button.js';
import { heading, bodyText, panel, toast } from '../ui/widgets.js';
import { openOverlay, scrollArea } from '../ui/Overlay.js';
import { Input } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Sounds, unlockAudioOnce } from '../core/sounds.js';
import { Session } from '../core/session.js';
import { Progress } from '../meta/progress.js';
import { dailyState, claimDaily, todayKey } from '../meta/dailyBonus.js';
import { DAILY_REWARDS } from '../data/ads.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { isUnlocked, progressOf } from '../meta/achievements.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { Ads } from '../yandex/ads.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;
    Input.setup(this);
    unlockAudioOnce(this);

    if (this.textures.exists('bg_menu')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_menu');
      const k = Math.max(width / bg.width, height / bg.height);
      bg.setScale(k);
      // Затемнение ровно настолько, чтобы читались надписи. Фон — половина настроения
      // игры, глушить его в ноль незачем: проверено скриншотом, при 0.4 картина исчезала.
      this.add.rectangle(width / 2, height / 2, width, height, 0x08050c, 0.22);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.bgNum);
    }

    heading(this, width / 2, 190, i18n.t('title'), { fontSize: THEME.fontSize.title });
    bodyText(this, width / 2, 254, i18n.t('subtitle'));

    this.add.text(width - 24, 30, '✦ ' + Progress.data.memory, {
      fontFamily: THEME.fontUi, fontSize: THEME.fontSize.small, color: THEME.colors.accentText,
    }).setOrigin(1, 0.5);

    let y = height * 0.42;
    const step = 92;

    if (Session.hasSavedRun()) {
      createButton(this, width / 2, y, i18n.t('continueRun'), () => {
        Session.resumeRun();
        const p = Session.run.state.pending;
        // Возврат ровно туда, где игрок вышел: посреди боя — в бой, на выборе — в тот экран.
        //
        // 'reward' и 'treasure' раньше сюда не попадали вообще — падали в `else` и уезжали
        // на карту. Для схрона это было терпимо (золото/оберег уже начислены в create()),
        // а для боевой награды — нет: `availableNodes()` для узла, из которого ещё не вышли
        // (pending всё ещё 'reward'), пуст, И победа не считается «завершённой» —
        // на карте не открывается вообще НИ ОДИН узел, дальше играть нельзя никак.
        // Нашёл живой игрок: закрыл вкладку на экране выбора карты за босса, вернулся —
        // карта горит «пройдено», но некликабельна, вниз-вверх крутится, дальше пути нет.
        // tier для боевой награды не хранился в pending — берём из state.node.type
        // (он всегда актуален: enterNode пишет его при входе в узел и не трогает потом).
        if (Session.combat && !Session.combat.state.over) Input.goTo(this, 'Combat');
        else if (p && p.kind === 'rest') Input.goTo(this, 'Rest');
        else if (p && p.kind === 'shop') Input.goTo(this, 'Shop');
        else if (p && p.kind === 'event') Input.goTo(this, 'Event');
        else if (p && p.kind === 'treasure') Input.goTo(this, 'Reward', { treasure: p });
        else if (p && p.kind === 'reward') {
          const node = Session.run.state.node;
          const tier = node && (node.type === 'boss' || node.type === 'elite') ? node.type : 'combat';
          Input.goTo(this, 'Reward', { reward: p.reward, tier });
        } else Input.goTo(this, 'Map');
      }, { color: THEME.colors.primary });
      y += step;
    }

    createButton(this, width / 2, y, i18n.t(Session.hasSavedRun() ? 'newRun' : 'play'), () => {
      if (Session.hasSavedRun()) this.confirmNewRun();
      else Input.goTo(this, 'Heroes');
    }, { color: Session.hasSavedRun() ? THEME.colors.neutral : THEME.colors.primary,
         textColor: Session.hasSavedRun() ? THEME.colors.text : THEME.colors.primaryText });
    y += step;

    createButton(this, width / 2, y, i18n.t('altar'), () => {
      Analytics.first(EVENTS.ALTAR_FIRST_USE);
      Analytics.event(EVENTS.ALTAR_OPENED);
      Input.goTo(this, 'Altar');
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text });
    y += step;

    createButton(this, width / 2, y, i18n.t('achievements'), () => this.showAchievements(), {
      color: THEME.colors.neutral, textColor: THEME.colors.text,
    });
    y += step;

    createButton(this, width / 2, y, i18n.t('howto'), () => this.showHowto(), {
      color: THEME.colors.neutral, textColor: THEME.colors.text,
    });

    const label = () => (Audio.muted ? i18n.t('soundOff') : i18n.t('soundOn'));
    const soundBtn = createButton(this, width / 2, height - 70, label(), () => {
      Audio.toggleMute();
      soundBtn.setLabel(label());
      Progress.put({ muted: Audio.muted });
    }, { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });

    // Sticky-баннер живёт в меню и на карте: в бою он занял бы место, нужное руке карт.
    Ads.showBanner();

    this.time.delayedCall(350, () => this.maybeDaily());
    // На совсем свежем сейве оба таймера срабатывают в одну сессию (дар дня ещё не забран
    // И обучалка ещё не видена) — раньше показывались ОДНОВРЕМЕННО, два оверлея друг на
    // друге (найдено живым прогоном 24.08: два экрана внахлёст сразу после первого захода).
    // Обучалка ждёт, пока экран освободится, вместо жёсткого фиксированного таймера.
    if (!Progress.data.seenHowto) this.time.delayedCall(700, () => this.showHowtoWhenFree());
  }

  showHowtoWhenFree() {
    if (Input.hasLayer(this)) { this.time.delayedCall(300, () => this.showHowtoWhenFree()); return; }
    this.showHowto();
  }

  confirmNewRun() {
    const { width, height } = this.scale;
    openOverlay(this, {
      title: i18n.t('newRun'),
      height: 380,
      build: (api) => {
        api.add(bodyText(this, width / 2, height / 2 - 20, i18n.t('confirmNewRun'), {
          wrap: width - 140, color: THEME.colors.text,
        }));
        api.button(width / 2, height / 2 + 60, i18n.t('yes'), () => {
          Progress.put({ run: null, combat: null });
          api.close();
          Input.goTo(this, 'Heroes');
        }, { color: THEME.colors.danger, textColor: THEME.colors.text });
      },
      closeLabel: i18n.t('no'),
    });
  }

  // ---- Дар дня -------------------------------------------------------------
  maybeDaily() {
    const today = todayKey(new Date());
    const st = dailyState(Progress.data.daily, today, DAILY_REWARDS);
    if (!st.available) return;
    const { width, height } = this.scale;
    openOverlay(this, {
      title: i18n.t('dailyTitle'),
      height: 470,
      build: (api) => {
        api.add(bodyText(this, width / 2, height / 2 - 50, i18n.t('dailyStreak', { n: st.nextStreak }), {
          color: THEME.colors.text, fontSize: THEME.fontSize.normal,
        }));
        api.add(bodyText(this, width / 2, height / 2 + 6, i18n.t('dailyGot', { n: st.reward }), {
          color: THEME.colors.accentText, fontSize: THEME.fontSize.normal,
        }));
        api.button(width / 2, height / 2 + 84, i18n.t('dailyClaim'), () => {
          const got = claimDaily(Progress.data.daily, today, DAILY_REWARDS);
          if (got) {
            Progress.put({ daily: Progress.data.daily, memory: Progress.data.memory + got.reward });
            Sounds.coin();
            Analytics.event(EVENTS.DAILY_CLAIMED, { streak: got.streak });
            Progress.flush();
          }
          api.close();
          this.scene.restart();
        }, { color: THEME.colors.accent, textColor: THEME.colors.primaryText });
      },
    });
  }

  // ---- Зарубки -------------------------------------------------------------
  showAchievements() {
    const { width } = this.scale;
    const ROW = 92;
    openOverlay(this, {
      title: i18n.t('achievements'),
      build: (api) => {
        const areaTop = api.top + 78;
        const areaH = api.boxH - 150;
        const area = scrollArea(this, api, width / 2, areaTop + areaH / 2, width - 70, areaH);
        ACHIEVEMENTS.forEach((a, i) => {
          const y = areaTop + 28 + i * ROW;
          const done = isUnlocked(a.id);
          area.content.add(this.add.text(50, y, (done ? '✔ ' : '◻ ') + i18n.t('ach_' + a.id), {
            fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small,
            color: done ? THEME.colors.successText : THEME.colors.text,
          }).setOrigin(0, 0.5));
          area.content.add(this.add.text(50, y + 30, i18n.t('ach_' + a.id + '_t')
            + '  (' + Math.round(progressOf(a) * 100) + '%)', {
            fontFamily: THEME.fontUi, fontSize: THEME.fontSize.tiny, color: THEME.colors.textDim,
            wordWrap: { width: width - 140 },
          }).setOrigin(0, 0.5));
        });
        area.setContentHeight(ACHIEVEMENTS.length * ROW + 40);
      },
    });
  }

  // ---- Обучение ------------------------------------------------------------
  showHowto() {
    const { width, height } = this.scale;
    Analytics.event(EVENTS.HOWTO_OPENED);
    Progress.put({ seenHowto: true });
    openOverlay(this, {
      title: i18n.t('howto'),
      height: 700,
      build: (api) => {
        // 5-й пункт добавлен, когда игрок разобрал «Натиск волны» построчно и уткнулся
        // в то, что игра нигде не объясняет: Уязвимость/Слабость живут до конца ЭТОГО
        // хода, значит порядок карт — часть тактики, а не мелочь. Общее правило одно на
        // весь пул карт с этими наговорами, поэтому здесь, а не в тексте каждой карты.
        [1, 2, 3, 4, 5].forEach((n, i) => {
          api.add(bodyText(this, width / 2, height / 2 - 230 + i * 88, i18n.t('howto_' + n), {
            wrap: width - 130, color: THEME.colors.text, fontSize: THEME.fontSize.small,
          }));
        });
      },
    });
  }
}
