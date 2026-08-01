// МОДЕЛЬ ОЗЕРА (замкнутый модуль): литры <-> глубина <-> зоны.
// Не знает ничего про Phaser и конкретную игру: на вход конфиг зон,
// наружу чистые числа. Кандидат в library по правилу трёх.
//
// Конфиг: zones = [{ depth: м, litersPerMeter: л/м, mult: число }, ...]
// Вода выливается литрами (drain), уровень считается в метрах от поверхности.

export class LakeModel {
  constructor(zones) {
    this.zones = zones;
    this.totalDepth = zones.reduce((s, z) => s + z.depth, 0);
    this.totalLiters = zones.reduce((s, z) => s + z.depth * z.litersPerMeter, 0);
    this.drained = 0; // вылито литров текущего озера
  }

  // Вылить литры. Возвращает сколько реально вылилось (у дна меньше).
  drain(liters) {
    const real = Math.min(liters, this.totalLiters - this.drained);
    this.drained += real;
    return real;
  }

  get empty() { return this.drained >= this.totalLiters - 1e-6; }

  // Текущая глубина уровня воды в метрах от исходной поверхности (0 = полное озеро).
  depth() {
    let left = this.drained;
    let depth = 0;
    for (const z of this.zones) {
      const zoneLiters = z.depth * z.litersPerMeter;
      if (left >= zoneLiters) { left -= zoneLiters; depth += z.depth; }
      else return depth + left / z.litersPerMeter;
    }
    return this.totalDepth;
  }

  // Индекс зоны, в которой сейчас уровень воды (её и черпаем).
  zoneIndex() {
    const d = this.depth();
    let acc = 0;
    for (let i = 0; i < this.zones.length; i++) {
      acc += this.zones[i].depth;
      if (d < acc - 1e-9) return i;
    }
    return this.zones.length - 1;
  }

  zone() { return this.zones[this.zoneIndex()]; }

  // Верхняя глубина зоны i (м) — где начинается её «потолок».
  zoneTopDepth(i) {
    let acc = 0;
    for (let k = 0; k < i; k++) acc += this.zones[k].depth;
    return acc;
  }
}
