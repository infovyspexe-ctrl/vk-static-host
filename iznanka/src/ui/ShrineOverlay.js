// Алтарь Изнанки: драфт реликвии (1 из 3) после зачистки этажа. Показывается ПОВЕРХ
// GameScene, не отдельная сцена — состояние забега (run.js state) не переживает смену сцены.
import { THEME, toCss } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { RELICS_BY_ID } from '../data/relics.js';
import { BALANCE } from '../data/balance.js';
import { Input } from '../core/input.js';
import { createCurrencyLabel } from './currencyLabel.js';

export class ShrineOverlay {
  constructor(scene) {
    this.scene = scene;
    this._navItems = [];
    Input.openLayer(scene, 'shrine');
    this.build();
    Input.closeLayer(scene, 'shrine');
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

    this.title = s.add.text(width / 2, height * 0.11, i18n.t('shrineTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big, color: toCss(THEME.colors.accent), fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add(this.title);
    this.subtitle = s.add.text(width / 2, height * 0.155, i18n.t('shrineSubtitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim
    }).setOrigin(0.5);
    this.root.add(this.subtitle);

    // Дух и здоровье прямо на алтаре — жалоба живого плейтеста: жмёшь «Подлечиться» и не
    // видно, случилось что-то или нет (духа на алтаре не показывалось вообще).
    const statsY = height * 0.20;
    this.spiritLabel = createCurrencyLabel(s, width / 2 - 20, statsY, 'currency_spirit',
      { align: 'right', fontSize: THEME.fontSize.small, iconSize: 22 });
    this.root.add(this.spiritLabel.icon);
    this.root.add(this.spiritLabel.text);
    this.hpText = s.add.text(width / 2 + 20, statsY, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: toCss(THEME.colors.safe), fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.root.add(this.hpText);

    // cardH/gap/отступы текста увеличены против исходных 150/168 — жалоба живого плейтеста:
    // «Дальше» наезжала на описание, когда оно переносилось на 2 строки (длинные тексты вроде
    // компаса или «Редкая. Спасает от смерти...» не влезали в одну строку при старой высоте).
    const cardW = width - 90, cardH = 190;
    const startY = height * 0.29;
    const gap = 210;
    const textLeft = width / 2 - cardW / 2 + 108;
    this.cards = [0, 1, 2].map((i) => {
      const y = startY + i * gap;
      const panel = createPanel(s, width / 2, y, cardW, cardH);
      this.root.add(panel);
      const icon = s.add.image(width / 2 - cardW / 2 + 55, y, '__DEFAULT');
      this.root.add(icon);
      const name = s.add.text(textLeft, y - 62, '', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text, fontStyle: 'bold'
      });
      this.root.add(name);
      const desc = s.add.text(textLeft, y - 26, '', {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
        wordWrap: { width: cardW - 130 }
      });
      this.root.add(desc);
      const pickBtn = this.btn(width / 2, y + 66, '', () => this.pick(i), { fontSize: THEME.fontSize.small });
      this.root.add(pickBtn);
      return { panel, icon, name, desc, pickBtn };
    });

    const bottomY = startY + 3 * gap + 6;
    this.rerollBtn = this.btn(width / 2 - 150, bottomY, '', () => this.reroll(false),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.rerollBtn);
    this.rerollAdBtn = this.btn(width / 2 + 150, bottomY, i18n.t('rerollAdButton'), () => this.reroll(true),
      { color: THEME.colors.accent, fontSize: THEME.fontSize.small });
    this.root.add(this.rerollAdBtn);

    // Второе применение духа на алтаре, помимо переброса — иначе дух копится без дела
    // (вопрос игрока «а мы его можем как-то использовать?»).
    this.healBtn = this.btn(width / 2, bottomY + 66, '', () => this.heal(),
      { color: THEME.colors.safe, fontSize: THEME.fontSize.small });
    this.root.add(this.healBtn);
  }

  // api: { getState(), onPick(relicId), onRerollFree(), onRerollAd() }
  open(api) {
    this.api = api;
    // Гасим ДО ответа площадки, а не после: иначе кнопка «за рекламу» успевала мелькнуть
    // видимой на каждом алтаре, даже когда ролика нет (H2, находка красной команды 11.08).
    // Включит обратно GameScene.openShrine, когда придёт ответ VKWebAppCheckNativeAds.
    this.setAdRerollAvailable(false);
    // Запоминаем «до» без анимации отклика — пульс духа/здоровья должен сработать только
    // на РЕАЛЬНОЕ изменение (после Подлечиться/Переброса), не при первом открытии алтаря.
    const state = api.getState();
    this._lastSpirit = state.spirit;
    this._lastHp = state.player.hp;
    this.root.setVisible(true);
    Input.openLayer(this.scene, 'shrine');
    for (const it of this._navItems) Input.register(this.scene, it.obj, it.onSelect, {});
    this.refresh();
  }

  close() {
    Input.closeLayer(this.scene, 'shrine');
    this.root.setVisible(false);
  }

  get visible() { return this.root.visible; }

  refresh() {
    if (!this.root.visible) return;
    const state = this.api.getState();

    this.spiritLabel.setValue(state.spirit);
    this.hpText.setText(i18n.t('hpLabel') + ': ' + state.player.hp + '/' + state.player.maxHp);
    // Заметный пульс — доказательство, что нажатие подействовало (жалоба «жму и не знаю,
    // есть эффект или нет»): дух уменьшился -> подсветить дух, HP выросло -> подсветить HP.
    if (state.spirit < this._lastSpirit) this.pulse(this.spiritLabel.text, toCss(THEME.colors.danger));
    if (state.player.hp > this._lastHp) this.pulse(this.hpText, toCss(THEME.colors.accent));
    this._lastSpirit = state.spirit;
    this._lastHp = state.player.hp;

    state.shrineOptions.forEach((relicId, i) => {
      const relic = RELICS_BY_ID[relicId];
      const card = this.cards[i];
      card.name.setText(i18n.t('relic_' + relic.id) + (relic.rare ? ' ✦' : ''));
      card.desc.setText(i18n.t('relic_' + relic.id + '_desc'));
      card.icon.setTexture(relic.icon);
      card.icon.setScale(76 / Math.max(card.icon.width, card.icon.height));
      card.pickBtn.setLabel(i18n.t('continueButton'));
    });
    const cost = BALANCE.spirit.rerollCost;
    const freeCharges = state.player.freeRerollCharges;
    this.rerollBtn.setLabel(freeCharges > 0 ? i18n.t('rerollButton', { cost: 0 }) : i18n.t('rerollButton', { cost }));
    this.rerollBtn.setAlpha(freeCharges > 0 || state.spirit >= cost ? 1 : 0.55);

    const healCost = BALANCE.spirit.healCost;
    const fullHp = state.player.hp >= state.player.maxHp;
    this.healBtn.setLabel(fullHp ? i18n.t('shrineHealFull') : i18n.t('shrineHealButton', { cost: healCost }));
    this.healBtn.setAlpha(!fullHp && state.spirit >= healCost ? 1 : 0.55);
  }

  pulse(textObj, flashColor) {
    const original = textObj.style.color;
    textObj.setColor(flashColor);
    this.scene.tweens.add({
      targets: textObj, scale: 1.3, duration: 130, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => textObj.setColor(original)
    });
  }

  pick(i) {
    if (!this.api) return;
    const state = this.api.getState();
    const relicId = state.shrineOptions[i];
    this.api.onPick(relicId);
  }

  // Показать/убрать переброс «за рекламу». Кнопка награды показывается только когда ролик
  // реально предзагружен — требование VK Mini Apps (VKWebAppCheckNativeAds, H2 в
  // RELEASE-CHECKLIST.md). Проверка асинхронная, поэтому кнопка гасится вдогонку.
  // На площадках без такого API (Яндекс) остаётся видимой всегда — поведение не менялось.
  setAdRerollAvailable(ok) {
    this._adOk = !!ok;
    this.rerollAdBtn.setVisible(this._adOk);
    if (this.rerollAdBtn.input) this.rerollAdBtn.input.enabled = this._adOk;
    // Свободный переброс встаёт по центру, когда рекламного соседа нет, — иначе строка
    // выглядит поломанной (кнопка слева от пустоты).
    this.rerollBtn.x = this._adOk ? this.scene.scale.width / 2 - 150 : this.scene.scale.width / 2;
  }

  reroll(viaAd) {
    if (!this.api) return;
    if (viaAd) { if (this._adOk === false) return; this.api.onRerollAd(); }
    else this.api.onRerollFree();
  }

  heal() {
    if (!this.api) return;
    this.api.onHeal();
  }
}
