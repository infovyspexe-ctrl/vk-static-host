// Экран победы: телефон найден. Показывает время, литры, предлагает
// «Новое озеро» (лёгкий престиж: доход ×2, вода и жетоны заново).
import { THEME } from './theme.js';
import { createButton } from './Button.js';
import { createPanel } from './Panel.js';
import { i18n } from '../i18n/strings.js';

export class VictoryOverlay {
  // api: { onPrestige(), onKeepPlaying(), getStats(): { seconds, litersTotal, nextMult } }
  constructor(scene, api) {
    this.scene = scene;
    this.api = api;
    this.root = null;
  }

  open() {
    if (this.root) return;
    const s = this.scene;
    const { width, height } = s.scale;
    this.root = s.add.container(0, 0).setDepth(300).setScrollFactor(0);

    const bg = s.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setInteractive();
    this.root.add(bg);
    this.root.add(createPanel(s, width / 2, height / 2, width - 80, 560));

    const st = this.api.getStats();
    const min = Math.floor(st.seconds / 60);
    const sec = Math.floor(st.seconds % 60);

    // Телефон крупным планом: цель достигнута.
    const px = width / 2, py = height / 2 - 320;
    const glow = s.add.circle(px, py, 92, 0x9be7ff, 0.3);
    this.root.add(glow);
    s.tweens.add({ targets: glow, scale: 1.35, alpha: 0.12, duration: 800, yoyo: true, repeat: -1 });
    this.root.add(s.add.rectangle(px, py, 92, 160, 0x263238).setStrokeStyle(5, 0x9be7ff));
    this.root.add(s.add.rectangle(px, py - 4, 74, 122, 0x9be7ff, 0.95));
    // довольная рожица на экране
    const face = s.add.graphics();
    face.fillStyle(0x263238, 1).fillCircle(px - 16, py - 24, 6).fillCircle(px + 16, py - 24, 6);
    face.lineStyle(6, 0x263238, 1).beginPath();
    face.arc(px, py - 4, 26, 0.25 * Math.PI, 0.75 * Math.PI);
    face.strokePath();
    this.root.add(face);

    // Конфетти сверху.
    for (let i = 0; i < 40; i++) {
      const colors = [0xffd54f, 0x4dd0e1, 0x81c784, 0xff8a65, 0xba68c8];
      const r = s.add.rectangle(Math.random() * width, -30 - Math.random() * 320,
        10, 16, colors[i % colors.length]).setDepth(301).setAngle(Math.random() * 360);
      this.root.add(r);
      s.tweens.add({
        targets: r, y: height + 40, angle: r.angle + 360 + Math.random() * 540,
        x: r.x + (Math.random() - 0.5) * 160,
        duration: 2600 + Math.random() * 2200, delay: Math.random() * 800,
        repeat: -1
      });
    }

    this.root.add(s.add.text(width / 2, height / 2 - 200, i18n.t('victoryTitle'), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.title, color: '#ffd54f', fontStyle: 'bold'
    }).setOrigin(0.5));
    this.root.add(s.add.text(width / 2, height / 2 - 110, i18n.t('victoryText', { min, sec }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.normal, color: THEME.colors.text
    }).setOrigin(0.5));
    this.root.add(s.add.text(width / 2, height / 2 - 50, i18n.t('victoryLiters', { l: Math.floor(st.litersTotal) }), {
      fontFamily: THEME.fontFamily, fontSize: THEME.fontSize.small, color: THEME.colors.textDim
    }).setOrigin(0.5));

    // Два пути престижа: это же озеро заново или ДРУГОЕ (озеро <-> болото).
    const otherLake = st.lakeId === 'swamp' ? 'lake' : 'swamp';
    const otherLabel = st.lakeId === 'swamp' ? 'prestigeLakeBtn' : 'prestigeSwampBtn';
    const b1 = createButton(s, width / 2, height / 2 + 50, i18n.t(otherLabel, { m: st.nextMult }),
      () => { this.close(); this.api.onPrestige(otherLake); },
      { color: THEME.colors.accent, fontSize: THEME.fontSize.small });
    this.root.add(b1);

    const b1b = createButton(s, width / 2, height / 2 + 140, i18n.t('prestigeBtn', { m: st.nextMult }),
      () => { this.close(); this.api.onPrestige(st.lakeId); },
      { color: THEME.colors.primary, fontSize: THEME.fontSize.small });
    this.root.add(b1b);

    const b2 = createButton(s, width / 2, height / 2 + 226, i18n.t('keepPlaying'),
      () => { this.close(); this.api.onKeepPlaying(); },
      { color: THEME.colors.neutral, textColor: THEME.colors.text, fontSize: THEME.fontSize.small });
    this.root.add(b2);

    this.root.iterate((c) => { if (c.setScrollFactor) c.setScrollFactor(0); });

    // Хит-тест ввода идёт по scrollFactor детей, не контейнера (см. SkillTreeOverlay).
    this.root.iterate((c) => { if (c.setScrollFactor) c.setScrollFactor(0); });
  }

  close() {
    if (!this.root) return;
    this.root.destroy(true);
    this.root = null;
  }

  get visible() { return !!this.root; }
}
