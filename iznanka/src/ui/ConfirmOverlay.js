// Универсальный диалог подтверждения (да/нет) поверх сцены. Первое применение — выход из
// подземелья кнопкой ✕: жалоба живого плейтеста — игрок закрыл этаж не глядя, потерял дух и
// не понял, что случилось. Теперь перед выходом спрашиваем и явно называем цену.
import { THEME } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';

export class ConfirmOverlay {
  constructor(scene) {
    this.scene = scene;
    this._navItems = [];
    Input.openLayer(scene, 'confirm');
    this.build();
    Input.closeLayer(scene, 'confirm');
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
    this.root = s.add.container(0, 0).setDepth(400).setScrollFactor(0);

    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x0a0714, 0.85).setInteractive();
    this.root.add(bg);

    // Раскладка сверху вниз с фиксированными зазорами, а не «всё вокруг центра» — старая
    // версия считала кнопки от центра панели ФИКСИРОВАННЫМ отступом, а высоту панели отдельным
    // числом, они разъехались, и вторая кнопка вылезала за нижний край панели (жалоба
    // «хреново выглядит окно»: без рамки это читалось как обрезанный, случайно сверстанный диалог).
    const boxW = width - 80;
    const boxTop = height * 0.32;
    const titleY = boxTop + 42;
    const msgY = titleY + 46;
    const btn1Y = msgY + 92;
    const btn2Y = btn1Y + 64;
    const boxBottom = btn2Y + 46;
    const boxH = boxBottom - boxTop;
    const boxCenterY = (boxTop + boxBottom) / 2;

    const panel = createPanel(s, width / 2, boxCenterY, boxW, boxH);
    this.root.add(panel);
    // Тонкая рамка поверх заливки — без неё панель (THEME.colors.panel) слишком близка по тону
    // к затемнению фона (0x0a0714) и диалог визуально «не отделяется» от игры под ним.
    const border = s.add.graphics();
    border.lineStyle(2, THEME.dungeonTier[1].accent, 1);
    border.strokeRoundedRect(width / 2 - boxW / 2, boxCenterY - boxH / 2, boxW, boxH, THEME.radius);
    this.root.add(border);

    this.title = s.add.text(width / 2, titleY, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add(this.title);

    this.message = s.add.text(width / 2, msgY, '', {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim,
      align: 'center', wordWrap: { width: boxW - 60 }
    }).setOrigin(0.5, 0);
    this.root.add(this.message);

    this.confirmBtn = this.btn(width / 2, btn1Y, '', () => this.confirm(),
      { color: THEME.colors.danger, fontSize: THEME.fontSize.small });
    this.root.add(this.confirmBtn);
    this.cancelBtn = this.btn(width / 2, btn2Y, '', () => this.cancel(),
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(this.cancelBtn);
  }

  // api: { title, message, confirmLabel, cancelLabel, onConfirm, onCancel? }
  open(api) {
    this.api = api;
    this.title.setText(api.title || '');
    this.message.setText(api.message || '');
    this.confirmBtn.setLabel(api.confirmLabel || i18n.t('confirmYes'));
    this.cancelBtn.setLabel(api.cancelLabel || i18n.t('confirmNo'));

    this.root.setVisible(true);
    Input.openLayer(this.scene, 'confirm');
    for (const it of this._navItems) Input.register(this.scene, it.obj, it.onSelect, {});
  }

  close() {
    Input.closeLayer(this.scene, 'confirm');
    this.root.setVisible(false);
  }

  get visible() { return this.root.visible; }

  confirm() {
    const api = this.api;
    this.close();
    if (api && api.onConfirm) api.onConfirm();
  }

  cancel() {
    const api = this.api;
    this.close();
    if (api && api.onCancel) api.onCancel();
  }
}
