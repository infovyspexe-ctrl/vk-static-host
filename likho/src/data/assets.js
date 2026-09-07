// СПИСОК АССЕТОВ, КОТОРЫЕ РЕАЛЬНО ЛЕЖАТ В assets/.
//
// Зачем список, а не «грузим всё по шаблону имени»: Phaser на отсутствующий файл шлёт
// запрос и получает 404 — в консоли появляется ошибка, а чистая консоль это требование
// смоук-теста (PLAYTEST.md) и признак «игра не сломана» для модератора. Пока картинки нет,
// её просто нет в списке, и интерфейс рисует заглушку (см. CardView / CombatScene).
//
// Порядок работы: сгенерировал и нарезал арт → дописал ключ сюда. Файл ведётся руками
// намеренно: он же служит описью того, что уже сделано.
export const IMAGES = [
  ['bg_menu', 'assets/bg/menu.jpg'],
  ['bg_act1', 'assets/bg/act1.jpg'],
  ['bg_act2', 'assets/bg/act2.jpg'],
  ['bg_act3', 'assets/bg/act3.jpg'],
  ['bg_rest', 'assets/bg/rest.jpg'],
  ['hero_ratnik', 'assets/heroes/ratnik.png'],
  ['hero_vedunya', 'assets/heroes/vedunya.png'],
  ['hero_oboroten', 'assets/heroes/oboroten.png'],
];

// Враги: ключ 'enemy_<art>' → assets/enemies/<art>.png
export const ENEMY_ART = [
  'blud', 'bolotnik', 'durman', 'glaz', 'kikimora', 'kostyak',
  'kostyanoy_volk', 'leshiy', 'likho', 'moroka', 'nav', 'ogonek',
  'omutnitsa', 'penek', 'petukh', 'piyavka', 'poludnitsa', 'shatun',
  'toplyak', 'tumannik', 'upyr', 'utoplennik', 'vedma', 'vodyanoy',
  'volchok', 'voron', 'zhaba',
];

// Обереги: ключ 'relic_<art>' → assets/relics/<art>.png
export const RELIC_ART = [
  'alatyr', 'burnaya_krov', 'chasha', 'cherep', 'glaz_likha', 'grosh',
  'klubok', 'kolokolchik', 'kostyanoy_amulet', 'krest', 'lapot', 'lunnyy_amulet',
  'nauznaya_nit', 'pero', 'perunov_kamen', 'pyatak', 'rog', 'ryabina',
  'serdtse_medvedya', 'serebro', 'sklyanka', 'solonka', 'trava', 'vereteno',
  'zerkaltse', 'zub_volka', 'zvezda',
];

// Карты: ключ 'card_<id>' → assets/cards/<id>.png
export const CARD_ART = [
  'beshenstvo', 'bessmertie', 'bogatyrskiy_klich', 'chernaya_kniga', 'chuyanie', 'dvoinoy',
  'gnev_zemli', 'gniloe_dykhanie', 'kogti', 'kostyanoy_serp', 'krepost', 'krovavaya_zhatva',
  'krovnyy_dolg', 'kruzhenie', 'linka', 'mor', 'morok', 'natisk',
  'natisk_volny', 'naveti', 'nesokrushimost', 'nyukh', 'oberech', 'okrik',
  'oskal', 'otrava', 'perekat', 'perevyazka', 'podmena', 'podnozhka',
  'polnaya_luna', 'polyn', 'porcha', 'posledniy_dovod', 'probitie', 'pryzhok',
  'razmakh', 'razryv', 'rezkiy_vdokh', 'rogatina', 'rvanina', 'sglaz',
  'shchit_i_mech', 'shepot', 'shipy_obereg', 'shkura', 'staynyy_zov', 'stena',
  'stoykost', 'strakh', 'sudnyy_chas', 'svinchatka', 'taran', 'tishina',
  'travlya', 'tyazhest', 'udar', 'ukhod', 'vikhr', 'vorozhba',
  'vtoroe_serdtse', 'zagovor_krovi', 'zagovor_lovkosti', 'zagovor_sily', 'zapal', 'zaslon',
  'zhelezny_kulak', 'zhertva', 'zov_sudby', 'zveriny_golod',
];

// Встречи: ключ 'ev_<art>' → assets/events/<art>.jpg
export const EVENT_ART = [];

export function allImages() {
  return IMAGES
    .concat(ENEMY_ART.map((a) => ['enemy_' + a, 'assets/enemies/' + a + '.png']))
    .concat(RELIC_ART.map((a) => ['relic_' + a, 'assets/relics/' + a + '.png']))
    .concat(CARD_ART.map((a) => ['card_' + a, 'assets/cards/' + a + '.png']))
    .concat(EVENT_ART.map((a) => ['ev_' + a, 'assets/events/' + a + '.jpg']));
}
