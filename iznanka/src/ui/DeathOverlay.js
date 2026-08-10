// Итог забега: показывается и на смерть, и на ручной выход из подземелья (одно и то же
// «сдался/погиб» с точки зрения награды — искры начисляются всегда, YANDEX-MODERATION.md).
import { THEME, toCss } from './theme.js';
import { createButton } from './Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';

export class DeathOverlay {
  constructor(scene) {
    this.scene = scene;
    this._navItems = [];
    Input.openLayer(scene, 'death');
    this.build();
    Input.closeLayer(scene, 'death');
    this.root.setVisible(false);
  }

  btn(x, y, label, onClick, opts) {
    const b = createButton(this.scene, x, y, label, onClick, opts);
    this._navItems.push({ obj: b, onSelect: onClick });
    return b;
  }

  build() {
    const s = this.scene;
    const { width, height } = s.scale;
    this.root = s.add.container(0, 0).setDepth(300).setScrollFactor(0);

    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x0a0714, 1).setInteractive();
    this.root.add(bg);

    this.title = s.add.text(width / 2, height * 0.32, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: toCss(THEME.colors.danger),
      fontStyle: 'bold', align: 'center', wordWrap: { width: width - 100 }
    }).setOrigin(0.5);
    this.root.add(this.title);

    this.floorText = s.add.text(width / 2, height * 0.42, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text
    }).setOrigin(0.5);
    this.root.add(this.floorText);

    this.sparksText = s.add.text(width / 2, height * 0.48, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: toCss(THEME.colors.accent)
    }).setOrigin(0.5);
    this.root.add(this.sparksText);

    this.reviveBtn = this.btn(width / 2, height * 0.6, i18n.t('reviveButton'), () => this.revive(),
      { color: THEME.colors.safe, fontSize: THEME.fontSize.small });
    this.root.add(this.reviveBtn);

    this.backBtn = this.btn(width / 2, height * 0.7, i18n.t('backToHub'), () => this.back(),
      { color: THEME.colors.primary, fontSize: THEME.fontSize.normal });
    this.root.add(this.backBtn);
  }

  // api: { floor, sparksEarned, canRevive, onRevive(), onBack() }
  open(api) {
    this.api = api;
    this.title.setText(i18n.t('deathTitle'));
    this.floorText.setText(i18n.t('deathFloor', { n: api.floor }));
    this.sparksText.setText(i18n.t('deathSparksEarned', { n: api.sparksEarned }));
    // Сначала гасим (реклама ещё не подтверждена площадкой), потом GameScene.openDeath
    // включит, если ролик есть и лимит суток не израсходован — H2, красная команда 11.08.
    this.setReviveAvailable(false);
    this._canReviveByRules = !!api.canRevive;

    this.root.setVisible(true);
    Input.openLayer(this.scene, 'death');
    for (const it of this._navItems) {
      if (it.obj === this.reviveBtn && !api.canRevive) continue;
      Input.register(this.scene, it.obj, it.onSelect, {});
    }
  }

  close() {
    Input.closeLayer(this.scene, 'death');
    this.root.setVisible(false);
  }

  get visible() { return this.root.visible; }

  // Показать/убрать кнопку «за рекламу». Отдельный метод, а не только поле api.canRevive:
  // правила VK Mini Apps требуют показывать кнопку награды ТОЛЬКО когда ролик реально
  // предзагружен (VKWebAppCheckNativeAds, п. H2 RELEASE-CHECKLIST). Проверка асинхронная,
  // а экран смерти открывается сразу — поэтому кнопка гасится вдогонку, когда придёт ответ.
  // В кольцо фокуса скрытая кнопка не попадает: Input._reachable отсеивает невидимое.
  setReviveAvailable(ok) {
    this._reviveOk = !!ok;
    this.reviveBtn.setVisible(this._reviveOk);
    if (this.reviveBtn.input) this.reviveBtn.input.enabled = this._reviveOk;
    this.backBtn.y = this._reviveOk ? this.scene.scale.height * 0.7 : this.scene.scale.height * 0.6;
  }

  revive() { if (this.api && this.api.canRevive && this._reviveOk) this.api.onRevive(); }
  back() { if (this.api) this.api.onBack(); }
}
