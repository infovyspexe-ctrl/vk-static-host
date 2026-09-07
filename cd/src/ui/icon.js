// Иконки после slice_icons.py обрезаны ПО СОДЕРЖИМОМУ (правило ASSETGEN.md — резать по
// пикселям предмета, а не вслепую по клетке сетки), поэтому у них произвольные, НЕ КВАДРАТНЫЕ
// пропорции. Проверено на живых файлах: upg_speed.png 80×160, upg_damage.png 151×57.
// setDisplaySize(box, box) растягивает такую иконку неравномерно по X и Y — молния на карточке
// «Скорость» выходила сплющенной вбок, а не «пережатой JPEG», как это читается на глаз.
//
// fitIcon вписывает иконку в квадрат box×box БЕЗ искажения (как CSS object-fit: contain),
// сохраняя исходные пропорции и центрируя иконку по её origin (по умолчанию 0.5, 0.5).
export function fitIcon(image, box) {
  const scale = Math.min(box / image.width, box / image.height);
  image.setScale(scale);
  return image;
}
