// MapScene: карта города между районами. Показывает, где игрок, что пройдено, что дальше
// и сколько дани собрано. Открывается только на переходе района или после финала кампании —
// между обычными сменами она была бы лишним кликом.
//
// Вид — через THEME, тексты — через i18n, состояние — из meta/campaign.js. Своей логики
// прохождения здесь нет: сцена только рисует то, что уже решила кампания.
import { THEME } from '../ui/theme.js';
import { createButton } from '../ui/Button.js';
import { i18n } from '../i18n/strings.js';
import { Input } from '../core/input.js';
import { Save } from '../yandex/save.js';
import { mergeProgress } from '../meta/progress.js';
import { DISTRICTS } from '../data/districts.js';
import { tributeState, currentDistrict } from '../meta/campaign.js';
import { drawCoinIcon } from '../render/icons.js';

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  async create() {
    const { width, height } = this.scale;
    Input.setup(this);

    const bg = this.add.graphics();
    bg.fillGradientStyle(THEME.colors.bgTopHex, THEME.colors.bgTopHex, THEME.colors.bgHex, THEME.colors.bgHex, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);

    this.progress = mergeProgress((await Save.load()) || null);
    const campaign = this.progress.campaign;

    this.add.text(width / 2, height * 0.09, i18n.t('mapTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.big,
      color: THEME.colors.accentText, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Кошелёк — чтобы игрок видел, с чем идёт в следующий район.
    drawCoinIcon(this, width / 2 - 40, height * 0.145, 26);
    this.add.text(width / 2 - 22, height * 0.145, String(this.progress.coins), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText
    }).setOrigin(0, 0.5);

    // Четыре точки районов на вертикальной дороге: портрет, поэтому вертикаль.
    const top = height * 0.24;
    const step = height * 0.135;
    const cx = width * 0.28;

    const road = this.add.graphics();
    road.lineStyle(10, THEME.colors.panelLight, 1);
    road.beginPath();
    road.moveTo(cx, top);
    road.lineTo(cx, top + step * (DISTRICTS.length - 1));
    road.strokePath();

    DISTRICTS.forEach((d, i) => {
      const y = top + step * i;
      // Три состояния: пройден, текущий, закрыт. Читаются цветом и подписью.
      const passed = campaign.done || i < campaign.district;
      const active = !campaign.done && i === campaign.district;

      const dot = this.add.graphics();
      const fill = passed ? THEME.colors.success : active ? THEME.colors.accent : THEME.colors.neutral;
      dot.fillStyle(fill, passed || active ? 1 : 0.5);
      dot.fillCircle(cx, y, 22);
      dot.lineStyle(4, 0x2c1810, 0.6);
      dot.strokeCircle(cx, y, 22);
      if (active) {
        // Текущий район пульсирует — взгляд находит его без чтения.
        const ring = this.add.graphics();
        ring.lineStyle(4, THEME.colors.accent, 1);
        ring.strokeCircle(cx, y, 34);
        this.tweens.add({ targets: ring, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
      }

      const nameColor = passed ? THEME.colors.successText
        : active ? THEME.colors.accentText : THEME.colors.neutralText;
      this.add.text(cx + 46, y - 12, i18n.t('district_' + d.id), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small,
        color: nameColor, fontStyle: active ? 'bold' : 'normal'
      }).setOrigin(0, 0.5);

      const sub = passed ? i18n.t('districtCleared')
        : active ? i18n.t('shiftOf', { n: campaign.shift + 1, of: d.shifts })
          : i18n.t('districtLocked');
      this.add.text(cx + 46, y + 14, sub, {
        fontFamily: THEME.fontFamily, fontSize: 17, color: THEME.colors.text
      }).setOrigin(0, 0.5).setAlpha(passed || active ? 0.9 : 0.45);
    });

    // Дань текущего района — полосой под картой.
    const tr = tributeState(campaign);
    const d = currentDistrict(campaign);
    if (d && tr.need > 0) {
      const y = height * 0.78;
      this.add.text(width / 2, y, i18n.t('tributeTitle') + ': '
        + i18n.t('tributeProgress', { have: tr.have, need: tr.need }), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.accentText
      }).setOrigin(0.5);
      const barW = width - 120;
      const bar = this.add.graphics();
      bar.fillStyle(0x000000, 0.35);
      bar.fillRoundedRect(width / 2 - barW / 2, y + 22, barW, 20, 10);
      bar.fillStyle(tr.met ? THEME.colors.success : THEME.colors.accent, 1);
      bar.fillRoundedRect(width / 2 - barW / 2, y + 22, barW * tr.frac, 20, 10);
    } else {
      this.add.text(width / 2, height * 0.79, i18n.t('campaignDoneHint'), {
        fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.text,
        align: 'center', wordWrap: { width: width - 80 }
      }).setOrigin(0.5);
    }

    createButton(this, width / 2, height - 90, i18n.t('toWork'), () => this.scene.start('Game'),
      { color: THEME.colors.primary, fontSize: THEME.fontSize.normal });

    // Предложение играть без подсказок — ОДИН раз, после первого взятого района.
    // Галка в настройках осталась бы мёртвой: казуальная аудитория туда не заходит,
    // а выбор, о котором игрок не знает, выбором не является.
    if (!this.progress.hintsAsked && (campaign.done || campaign.district > 0)) {
      this.askHints(width, height);
    }
  }

  // Панель с двумя РАВНОПРАВНЫМИ кнопками. Отказ ничем не наказывается и не переспрашивается:
  // предложение, от которого нельзя отказаться, — это не предложение.
  askHints(width, height) {
    const layer = this.add.container(0, 0).setDepth(100);
    Input.openLayer(this, 'hints');

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.78);
    dim.fillRect(0, 0, width, height);
    layer.add(dim);
    const block = this.add.zone(width / 2, height / 2, width, height).setInteractive();
    block.on('pointerup', () => {});
    layer.add(block);

    const pw = width - 60, ph = 300;
    const px = width / 2, top = height / 2 - ph / 2;
    const panel = this.add.graphics();
    panel.fillStyle(THEME.colors.panel, 1);
    panel.fillRoundedRect(px - pw / 2, top, pw, ph, 22);
    panel.lineStyle(3, THEME.colors.accent, 0.6);
    panel.strokeRoundedRect(px - pw / 2, top, pw, ph, 22);
    layer.add(panel);

    layer.add(this.add.text(px, top + 48, i18n.t('hintsTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal,
      color: THEME.colors.accentText, fontStyle: 'bold', align: 'center',
      wordWrap: { width: pw - 50 }
    }).setOrigin(0.5));

    layer.add(this.add.text(px, top + 120, i18n.t('hintsBody'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.tiny, color: THEME.colors.text,
      align: 'center', lineSpacing: 4, wordWrap: { width: pw - 50 }
    }).setOrigin(0.5));

    const close = (hintsOn) => {
      this.progress.hintsOn = hintsOn;
      this.progress.hintsAsked = true;
      Save.update({ hintsOn, hintsAsked: true });
      Input.closeLayer(this, 'hints');
      layer.destroy();
    };

    layer.add(createButton(this, px, top + ph - 108, i18n.t('hintsOffBtn'), () => close(false),
      { color: THEME.colors.accent, textColor: THEME.colors.textDark, fontSize: THEME.fontSize.small, layer: 'hints' }));
    // Обе кнопки ЗАЛИВНЫЕ и одного размера. Приглушённый «оставить» читался бы как
    // «правильный ответ — отказаться от подсказок», а это давление, а не выбор.
    layer.add(createButton(this, px, top + ph - 44, i18n.t('hintsKeepBtn'), () => close(true),
      { color: THEME.colors.primary, fontSize: THEME.fontSize.small, layer: 'hints' }));
  }
}
