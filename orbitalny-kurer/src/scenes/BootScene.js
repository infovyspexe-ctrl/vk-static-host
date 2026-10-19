// Boot: минимальная стартовая сцена. Сразу переходит в загрузку.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() { this.scene.start('Preload'); }
}
