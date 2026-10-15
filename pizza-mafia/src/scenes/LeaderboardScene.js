// LeaderboardScene: таблица рекордов. Открывается из меню.
//
// Показываем СОСЕДЕЙ по таблице, а не топ-10. Причина из RETENTION.md: в общем топе висят
// оторвавшиеся лидеры, догонять их бессмысленно, и таблица превращается в мебель. Соседи
// мотивируют середняка — а середняк это почти вся аудитория.
//
// ЧЕСТНОЕ ОГРАНИЧЕНИЕ: суточного сброса тут нет и не будет. Ни Яндекс, ни GamePush
// периодического сброса не дают, а свой сервер мы не поднимаем. Поэтому подписываем
// «за всё время» прямо на экране: обещать сброс, которого нет, хуже, чем не обещать.
// Роль «догони себя вчерашнего» выполняет ежедневный конверт со стриком.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Platform } from '../platform/index.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';
import { drawCoinIcon } from '../render/icons.js';

const LEADERBOARD = 'score';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  async create() {
    const { width, height } = this.scale;
    Input.setup(this);

    const bg = this.add.graphics();
    bg.fillGradientStyle(THEME.colors.bgTopHex, THEME.colors.bgTopHex, THEME.colors.bgHex, THEME.colors.bgHex, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);

    this.add.text(width / 2, height * 0.075, i18n.t('leaderboardTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
      color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.125, i18n.t('leaderboardAllTime'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text
    }).setOrigin(0.5).setAlpha(0.7);

    // Кнопка «назад» рисуется СРАЗУ, до запроса: если сеть тупит или SDK не отвечает,
    // игрок не должен застрять на пустом экране без выхода.
    createButton(this, width / 2, height - 70, i18n.t('back'), () => this.scene.start('Menu'),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });

    Analytics.event(EVENTS.LEADERBOARD_OPENED);

    // ТАБЛИЦА ЧИТАЕТСЯ ЧЕРЕЗ getTop, а не через несуществующий getAround. Прежний вызов
    // `Platform.leaderboard.getAround(...)` не существовал НИ В ОДНОЙ версии слоя: метод
    // падал, ошибку глотал catch, и экран рекордов ВСЕГДА показывал «Пока пусто» — даже
    // после сыгранных смен. Найдено смоук-тестом 12.08.
    //
    // `getTop` у адаптера Яндекса зовёт getEntries с `includeUser: true`, то есть строка
    // игрока приходит вместе с верхушкой — это и есть «соседи по таблице».
    let entries = [];
    let me = null;
    try {
      entries = await Platform.leaderboard.getTop(LEADERBOARD, 10);
      me = await Platform.leaderboard.getPlayerEntry(LEADERBOARD);
    } catch (e) { entries = []; }
    if (!this.scene.isActive()) return;   // игрок успел уйти назад, пока ждали ответ

    // Имя игрока — по нему подсвечиваем его строку. Раньше `_myName` не задавалось нигде,
    // и пометка «(ты)» не показывалась в принципе.
    this._myName = (me && me.player && (me.player.publicName || me.player.name)) || null;

    // Игрок не попал в верхушку — дописываем его строку отдельно, иначе он не видит себя.
    if (me && !entries.some((e) => e && e.player && this._myName
      && (e.player.publicName || e.player.name) === this._myName)) {
      entries = entries.concat([me]);
    }

    if (!entries.length) {
      this.add.text(width / 2, height * 0.4, i18n.t('leaderboardEmpty'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
        align: 'center', wordWrap: { width: width - 100 }
      }).setOrigin(0.5).setAlpha(0.8);
      return;
    }

    const rowH = 74;
    const top = height * 0.19;
    entries.slice(0, 11).forEach((e, i) => {
      const y = top + i * rowH + rowH / 2;
      const mine = !!(e.player && e.player.scopePermissions !== undefined && e._isMe) || !!e.isMe;
      // Разные площадки помечают «мою» строку по-разному; надёжнее сравнить по имени,
      // которое SDK возвращает и в записи игрока.
      const name = (e.player && (e.player.publicName || e.player.name)) || i18n.t('cust_guest');
      const isMe = mine || (this._myName && name === this._myName);

      const row = this.add.graphics();
      row.fillStyle(isMe ? THEME.colors.accent : THEME.colors.panelLight, isMe ? 0.35 : 0.5);
      row.fillRoundedRect(24, y - rowH / 2 + 4, width - 48, rowH - 8, 12);
      if (isMe) {
        row.lineStyle(3, THEME.colors.accent, 1);
        row.strokeRoundedRect(24, y - rowH / 2 + 4, width - 48, rowH - 8, 12);
      }

      this.add.text(56, y, String(e.rank ?? i + 1), {
        fontFamily: THEME.fontFamily, fontSize: 26,
        color: isMe ? THEME.colors.accentText : THEME.colors.text, fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      this.add.text(130, y, name + (isMe ? ' (' + i18n.t('leaderboardYou') + ')' : ''), {
        fontFamily: THEME.fontFamily, fontSize: 22, color: THEME.colors.text,
        wordWrap: { width: width - 300 }
      }).setOrigin(0, 0.5);

      drawCoinIcon(this, width - 130, y, 24);
      this.add.text(width - 112, y, String(e.score ?? 0), {
        fontFamily: THEME.fontFamily, fontSize: 24, color: THEME.colors.accentText, fontStyle: 'bold'
      }).setOrigin(0, 0.5);
    });
  }
}
