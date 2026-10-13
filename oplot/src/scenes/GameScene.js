// Game: демо-геймплей. Показывает счёт, версионные сохранения, обе рекламы,
// лидерборд, шину событий и подключение клавиатуры.
import { YA } from '../yandex/sdk.js';
import { Ads } from '../yandex/ads.js';
import { Save } from '../yandex/save.js';
import { Leaderboard } from '../yandex/leaderboard.js';
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { BALANCE } from '../data/balance.js';
import { bus } from '../core/events.js';
import { Input } from '../core/input.js';
import { Analytics } from '../core/analytics.js';
import { EVENTS } from '../data/analytics-events.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  async create() {
    const { width, height } = this.scale;
    this.score = 0;

    YA.gameplayStart();  // начался активный геймплей
    Input.setup(this);   // клавиатура для десктопа и ТВ
    Analytics.event(EVENTS.GAME_START); // точка контроля: партия началась

    // загрузить прогресс (с миграцией версий внутри Save)
    const data = await Save.load();
    if (data && typeof data.score === 'number') this.score = data.score;

    this.scoreText = this.add.text(width / 2, 80, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: THEME.colors.text
    }).setOrigin(0.5);
    this.updateScore();

    // Развязка через шину: награда прилетает событием, счёт его слушает и применяет.
    // Так механика начисления не привязана к конкретной кнопке.
    // Save.update пишет прогресс по ходу игры (частые вызовы склеиваются в одну запись).
    // Модерация требует, чтобы прогресс сохранялся сразу, а не только на выходе.
    const onReward = (amount) => { this.score += amount; this.updateScore(); Save.update({ score: this.score }); };
    bus.on('reward:add', onReward);
    this.events.once('shutdown', () => bus.off('reward:add', onReward));

    // тап по полю: +1 (через шину)
    const zone = this.add.rectangle(width / 2, height * 0.42, width * 0.8, height * 0.28, THEME.colors.panel)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.42, i18n.t('tap'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text
    }).setOrigin(0.5);
    zone.on('pointerup', () => bus.emit('reward:add', BALANCE.tapReward));

    // вознаграждаемая реклама: +10 (через шину)
    createButton(this, width / 2, height * 0.66, i18n.t('reward'), () => {
      Ads.showRewarded({ onRewarded: () => bus.emit('reward:add', BALANCE.adReward) });
    }, { color: THEME.colors.accent });

    // выход в меню: сохранить, лидерборд, полноэкранная реклама
    createButton(this, width / 2, height * 0.80, i18n.t('toMenu'), () => this.exitToMenu(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text });
  }

  updateScore() { this.scoreText.setText(i18n.t('score') + ': ' + this.score); }

  async exitToMenu() {
    YA.gameplayStop();
    Analytics.event(EVENTS.SESSION_END, { score: this.score }); // точка контроля: с каким счётом вышли
    await Save.save({ score: this.score });
    await Leaderboard.setScore('score', this.score); // лидерборд 'score' создать в консоли
    Ads.showFullscreen({ onClose: () => this.scene.start('Menu') });
  }
}
