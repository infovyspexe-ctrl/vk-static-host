// ВИД КАРТЫ. Одна функция на всю игру: рука в бою, награда, магазин, просмотр колоды.
// Отдельные «красивые» карточки в каждой сцене — путь к тому, что улучшенная карта в
// награде выглядит иначе, чем в руке, и игрок не узнаёт её.
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { cardEssence, cardKeywords } from './cardText.js';
import { openCardDetail } from './CardDetail.js';

const W = THEME.card.w;
const H = THEME.card.h;

// def — уже разрешённый вид карты (cardView из движка), т.е. с учётом улучшения.
export function createCardView(scene, x, y, id, def, opts = {}) {
  const c = scene.add.container(x, y);
  const scale = opts.scale ?? 1;

  const bg = scene.add.graphics();
  const typeColor = THEME.card[def.type] || THEME.card.skill;
  const rarityColor = THEME.card.rarity[def.rarity] || THEME.card.rarity.common;

  bg.fillStyle(typeColor, 1);
  bg.fillRoundedRect(-W / 2, -H / 2, W, H, 12);
  bg.fillStyle(THEME.colors.panelDark, 0.85);
  bg.fillRoundedRect(-W / 2 + 6, -H / 2 + 40, W - 12, H - 46, 8);
  bg.lineStyle(3, rarityColor, 1);
  bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 12);
  c.add(bg);

  // Картинка карты. Если генерация ещё не доехала — вместо дыры показываем знак типа:
  // пустое место читается как «игра сломалась», знак — как оформление.
  //
  // artBottom запоминаем: описание ниже не имеет права начинаться выше этой границы,
  // иначе длинный текст ложится поверх иллюстрации (см. maxDescH ниже). Высота картинки
  // не константа — «k» берёт ограничивающее измерение, у высоких/широких исходников
  // высота получается меньше H*0.5, поэтому считаем по факту, а не на глаз.
  const artKey = 'card_' + id;
  let artBottom;
  let img = null;
  if (scene.textures.exists(artKey)) {
    img = scene.add.image(0, -14, artKey);
    const k = Math.min((W - 18) / img.width, (H * 0.5) / img.height);
    img.setScale(k);
    c.add(img);
    artBottom = img.y + img.displayHeight / 2;
  } else {
    const sign = def.type === 'attack' ? '⚔' : (def.type === 'power' ? '✦' : (def.type === 'curse' ? '☠' : '◈'));
    const signTxt = scene.add.text(0, -16, sign, {
      fontFamily: THEME.fontUi, fontSize: '52px', color: '#ffffff44',
    }).setOrigin(0.5);
    c.add(signTxt);
    artBottom = signTxt.y + signTxt.height / 2;
  }

  // Название. Начало координат — ВЕРХ строки, а не центр: двухстрочное имя
  // («Заговор ловкости») при центрировании вылезало за верхнюю кромку карты
  // и перечёркивало кружок стоимости. Смещение вправо освобождает место под кружок.
  const name = scene.add.text(16, -H / 2 + 5, i18n.t('card_' + id), {
    fontFamily: THEME.fontFamily, fontSize: '18px', color: THEME.colors.text,
    fontStyle: 'bold', align: 'center', wordWrap: { width: W - 62 },
    lineSpacing: -2,
  }).setOrigin(0.5, 0);
  // Имя обязано уместиться в ШАПКУ (полоса до -H/2+40, где начинается тёмная подложка под
  // арт). Длинное имя раньше уезжало на две строки, и вторая ложилась поверх картинки.
  // Ужимаем кегль ПО ЗАМЕРУ, пока имя (в т.ч. в две строки) не влезет в высоту шапки —
  // а не на глаз одной ступенькой (карт восемь десятков, глазами не проверить).
  const headerBudget = 40 - 5 - 2; // высота шапки минус верхний и нижний зазор
  let nameFs = 18;
  while (name.height > headerBudget && nameFs > 12) { nameFs -= 1; name.setFontSize(nameFs); }
  name.setStroke(THEME.textStroke.color, 4);
  c.add(name);

  // Стоимость — единственный кружок на карте, поэтому не спутать ни с чем.
  if (!def.unplayable) {
    const cost = scene.add.graphics();
    cost.fillStyle(THEME.colors.panelDark, 1);
    cost.fillCircle(-W / 2 + 18, -H / 2 + 18, 17);
    cost.lineStyle(2, THEME.colors.accent, 1);
    cost.strokeCircle(-W / 2 + 18, -H / 2 + 18, 17);
    c.add(cost);
    const costTxt = scene.add.text(-W / 2 + 18, -H / 2 + 18, String(def.cost), {
      fontFamily: THEME.fontUi, fontSize: '22px', color: THEME.colors.gold, fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(costTxt);
  }

  // Описание — из эффектов, не из отдельного текста.
  //
  // Якорь СНИЗУ (origin.y=1), а не по центру: текст растёт вверх, к картинке, а не
  // норовит вылезти за нижний край карты. wordWrap уже с честным отступом от рамки
  // (раньше было W-20 — 5px на сторону, текст утыкался в бортик) и useAdvancedWrap,
  // чтобы длинное слово само переносилось, а не выпирало за границу переноса.
  // СУТЬ, а не полный текст: расшифровки терминов («броня не сгорает») уехали под значок «?»
  // (см. cardKeywords/CardDetail). За счёт короткого текста держим КРУПНЫЙ шрифт — ровно то,
  // ради чего затевался редизайн: карту должно быть видно, а не вчитываться в мелочь.
  // Когда на карте есть термины, внизу появится значок «?». Резервируем под него нижнюю
  // полосу: поднимаем нижний край описания на высоту значка, иначе последняя строка текста
  // и кружок «?» дерутся за один и тот же угол (ровно та коллизия, которую просили не допустить).
  const hasHelp = cardKeywords(def).length > 0;
  const descBottomY = H / 2 - 8 - (hasHelp ? 24 : 0);
  const desc = scene.add.text(0, descBottomY, cardEssence(def), {
    fontFamily: THEME.fontUi, fontSize: '20px', color: THEME.colors.text,
    align: 'center', wordWrap: { width: W - 28, useAdvancedWrap: true }, lineSpacing: 2,
  }).setOrigin(0.5, 1);
  c.add(desc);
  // Расшифровки наговоров в скобках заметно удлинили текст — у карты с двумя-тремя
  // статусами (например «Натиск волны») описание в 17px наезжало на картинку и на
  // рамку. Ужимаем кегль по факту замера высоты — тот же приём, что чуть выше для
  // имени карты, только с нижним порогом вместо одной ступени.
  //
  // ПЕРВАЯ ВЕРСИЯ ЭТОГО ФИКСА СЧИТАЛА ПОРОГ НА ГЛАЗ (H-76) И НЕ СРАБАТЫВАЛА: игрок
  // прислал скриншот, где на «Натиск волны» текст всё равно лез на картинку. Причина —
  // измерял не то: `desc.height` сравнивался с константой, не с реальным нижним краем
  // картинки (`artBottom` рос от карты к карте вместе с пропорциями исходника). Порог
  // должен быть «сколько места МЕЖДУ низом картинки и низом карты», а не доля от H.
  let maxDescH = Math.max(40, descBottomY - artBottom);
  let descFs = 20;
  while (desc.height > maxDescH && descFs > 15) {
    descFs -= 1;
    desc.setFontSize(descFs);
  }
  // Даже на полу кегля не влезло — у карт с двумя-тремя наговорами разом («Богатырский
  // клич», «Подмена») текста физически больше, чем поместится 11px строкой. Дальше
  // ужимать шрифт нельзя, он станет нечитаемым — вместо этого подрезаем и поднимаем
  // картинку ровно настолько, чтобы освободить нужное место.
  if (desc.height > maxDescH && img) {
    const deficit = desc.height - maxDescH;
    const shrinkPx = Math.min(deficit, img.displayHeight - 40);
    if (shrinkPx > 0) {
      const ratio = (img.displayHeight - shrinkPx) / img.displayHeight;
      img.y -= shrinkPx / 2;
      img.setScale(img.scaleX * ratio, img.scaleY * ratio);
      artBottom = img.y + img.displayHeight / 2;
      maxDescH = Math.max(40, descBottomY - artBottom);
    }
  }

  // Отметка улучшения: игрок обязан отличать наточенную карту от обычной в руке,
  // не открывая описание.
  if (opts.upgraded) {
    const mark = scene.add.text(W / 2 - 14, -H / 2 + 18, '✦', {
      fontFamily: THEME.fontUi, fontSize: '24px', color: THEME.colors.gold,
    }).setOrigin(0.5);
    c.add(mark);
  }

  // Значок «?» — только на картах с терминами (у «Урон 6» расшифровывать нечего). Стоит в
  // нижнем-левом углу, в зарезервированной полосе (см. descBottomY), чтобы не задевать текст.
  // Своя кликабельная область ПОВЕРХ карты: в бою тап по ней открывает подробность и НЕ
  // разыгрывает карту (Phaser topOnly отдаёт клик верхнему объекту; на всякий случай гасим
  // всплытие событием). По остальной карте тап работает как раньше.
  if (hasHelp) {
    const hx = -W / 2 + 18, hy = H / 2 - 17;
    const help = scene.add.circle(hx, hy, 13, THEME.colors.panelDark, 0.92).setStrokeStyle(2, THEME.colors.accent);
    const q = scene.add.text(hx, hy + 1, '?', {
      fontFamily: THEME.fontUi, fontSize: '18px', color: THEME.colors.gold, fontStyle: 'bold',
    }).setOrigin(0.5);
    help.setInteractive({ useHandCursor: true });
    help.on('pointerup', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      openCardDetail(scene, id, def);
    });
    c.add(help); c.add(q);
    c.helpBadge = help; // ссылка на случай, если сцене нужно знать про значок
  }

  c.setSize(W, H);
  c.setScale(scale);
  c.cardId = id;
  c.cardDef = def;

  // Затемнение недоступной карты (не хватает силы / не по карману).
  c.setDim = (dim) => {
    c.setAlpha(dim ? 0.45 : 1);
  };

  return c;
}

export const CARD_W = W;
export const CARD_H = H;
