// КОНТЕНТ игры «Решала»: персонажи (с досье), карточки, маршруты. Это ДАННЫЕ (не UI-строки).
// Тексты двуязычные { ru, en }. Модель данных — в дизайн-доке, раздел 4.
//
// СГЕНЕРИРОВАНО мультиагентными воркфлоу (базовый набор + проход на разнообразие/маршрут/досье).
// Правки контента вносить здесь; структуру не менять (её читают reigns-движок, сцены и коллекция).

export const CONTENT = {
  "characters": [
    {
      "key": "sokamernik",
      "name": {
        "ru": "Сокамерник",
        "en": "Cellmate"
      },
      "emoji": "🧑‍🦲",
      "color": 6056896,
      "tagline": {
        "ru": "Есть гениальный план",
        "en": "Got a genius plan"
      },
      "bio": {
        "ru": "Твой сосед по шконке и вечный автор «безотказных» схем — от подкопа ложкой до побега в бачке с бельём. Сидит за то, что угнал школьный автобус покататься и вернул его с пустым баком. Верный до конца, только рядом с ним ты вечно влипаешь.",
        "en": "Your bunkmate and the tireless author of \"foolproof\" schemes — from digging out with a spoon to escaping in the laundry cart. He's in for joyriding the school bus and returning it with an empty tank. Loyal to the end, but he always drags you into trouble."
      }
    },
    {
      "key": "vertuhai",
      "name": {
        "ru": "Вертухай",
        "en": "Guard"
      },
      "emoji": "👮",
      "color": 4545124,
      "tagline": {
        "ru": "Не положено!",
        "en": "Against regulations!"
      },
      "bio": {
        "ru": "Охранник-солдафон, который выучил ровно одну фразу и лупит ею по любому поводу. Обожает свисток и звереет, когда в коридоре построились не по росту. За глаза его зовут «шлагбаум»: думает медленно и со скрипом.",
        "en": "A by-the-book guard who learned exactly one phrase and clubs everyone with it. He adores his whistle and loses it when the corridor line isn't sorted by height. Behind his back they call him \"the boom barrier\" — slow to think and creaky when he does."
      }
    },
    {
      "key": "kum",
      "name": {
        "ru": "Кум",
        "en": "Warden's man"
      },
      "emoji": "🕴️",
      "color": 7162945,
      "tagline": {
        "ru": "Давай просто поговорим",
        "en": "Let's just have a chat"
      },
      "bio": {
        "ru": "Оперативник в вечно застёгнутом пиджаке, который зовёт «на чаёк» и мягко предлагает рассказать, кто чем дышит. Улыбается так, что хочется сознаться даже в том, чего не делал. Своими руками не сделал ничего — ему даже чай заваривают другие.",
        "en": "An officer in a permanently buttoned jacket who invites you \"for a cup of tea\" and gently suggests you share who's been up to what. He smiles in a way that makes you want to confess to things you never did. He never lifts a finger himself — even his tea gets brewed by someone else."
      }
    },
    {
      "key": "povar",
      "name": {
        "ru": "Повар",
        "en": "Cook"
      },
      "emoji": "👨‍🍳",
      "color": 15690752,
      "tagline": {
        "ru": "Добавка по знакомству",
        "en": "Seconds for friends"
      },
      "bio": {
        "ru": "Хозяин баланды и главной валюты зоны — второй порции. Клянётся, что серое в супе это «мясо по-домашнему», и проверить никто не рискнул. Сидит за то, что на спор накормил весь городской рынок просроченным холодцом.",
        "en": "Lord of the gruel and of the prison's true currency — a second helping. He swears the grey lump in the soup is \"home-style meat,\" and nobody's dared to check. He's in for feeding the whole town market expired aspic on a bet."
      }
    },
    {
      "key": "avtoritet",
      "name": {
        "ru": "Старший",
        "en": "The Boss"
      },
      "emoji": "🧔",
      "color": 9315498,
      "tagline": {
        "ru": "Здесь решаю я",
        "en": "I call the shots here"
      },
      "bio": {
        "ru": "Главный на зоне, хотя вся власть держится на серьёзном лице и умении вовремя нахмуриться. Говорит редко, зато каждое слово потом три дня пересказывают шёпотом. Сидит за то, что организовал самую большую в районе очередь за бесплатными пельменями и устроил давку.",
        "en": "The top dog of the yard, though his whole authority rests on a serious face and knowing just when to frown. He speaks rarely, but every word gets whispered around for three days. He's inside for organizing the district's biggest free-dumpling queue and causing a stampede."
      }
    },
    {
      "key": "doktor",
      "name": {
        "ru": "Тюремный врач",
        "en": "Prison Doc"
      },
      "emoji": "🧑‍⚕️",
      "color": 2533018,
      "tagline": {
        "ru": "Таблетка от всего",
        "en": "One pill fits all"
      },
      "bio": {
        "ru": "Тюремный врач, который на любую жалобу выдаёт одну и ту же зелёную таблетку и совет «пей больше воды». Мастерски выписывает «освобождение от работ», если правильно попросить. Сидит за то, что лечил соседских котов важными справками и открыл подпольную поликлинику для хомяков.",
        "en": "The prison doctor who answers every complaint with the same green pill and \"drink more water.\" He's a genius at writing a \"day off work\" note if you ask nicely. He's in for treating the neighbors' cats with official paperwork and running an underground clinic for hamsters."
      }
    },
    {
      "key": "novichok",
      "name": {
        "ru": "Новенький",
        "en": "New fish"
      },
      "emoji": "🧒",
      "color": 8172354,
      "tagline": {
        "ru": "А так можно было?",
        "en": "Wait, that's allowed?"
      },
      "bio": {
        "ru": "Совсем зелёный новенький, который всего боится и ходит за тобой хвостом за советом. Путает карцер со столовой и здоровается с камерами наблюдения. Сидит за то, что случайно уехал на чужом самокате в соседний город и постеснялся вернуть.",
        "en": "A totally green new fish who's scared of everything and trails after you begging for advice. He mixes up solitary with the canteen and says hello to the security cameras. He's in for accidentally riding someone else's scooter to the next town and being too shy to bring it back."
      }
    },
    {
      "key": "bibliotekar",
      "name": {
        "ru": "Библиотекарь",
        "en": "Librarian"
      },
      "emoji": "👓",
      "color": 5533306,
      "tagline": {
        "ru": "Тише, идёт чтение",
        "en": "Quiet, I'm reading"
      },
      "bio": {
        "ru": "Тихий очкастый чудак, который знает про зону больше начальника — потому что всё вычитал в старых журналах. В его книгах между страниц припрятаны карты, ключи и рецепт хорошего компота. Сидит за то, что не сдал библиотечную книгу двенадцать лет и объявил себя её законным владельцем.",
        "en": "A quiet, bespectacled oddball who knows more about the prison than the warden — because he read it all in old magazines. His books hide maps, keys, and a recipe for excellent stewed fruit between the pages. He's in for keeping a library book twelve years overdue and declaring himself its rightful owner."
      }
    },
    {
      "key": "baklan",
      "name": {
        "ru": "Баклан",
        "en": "Loudmouth"
      },
      "emoji": "🐦",
      "color": 7901794,
      "tagline": {
        "ru": "Да я тебе щас!",
        "en": "Say that again!"
      },
      "bio": {
        "ru": "Крикливый задира, который лезет в бутылку по любому поводу и тут же прячется за твою спину. Шума от него на десятерых, толку на полкопейки. Сидит за то, что перекричал на рынке рекламный громкоговоритель и распугал всех покупателей.",
        "en": "A loudmouth bully who picks a fight over anything and instantly ducks behind your back. He makes noise enough for ten and delivers about half a cent's worth. He's in for out-shouting a market loudspeaker and scaring off every last customer."
      }
    },
    {
      "key": "starik",
      "name": {
        "ru": "Старик",
        "en": "Old-timer"
      },
      "emoji": "👴",
      "color": 9268835,
      "tagline": {
        "ru": "При мне такого не было",
        "en": "Not in my day"
      },
      "bio": {
        "ru": "Дед, который сидит дольше, чем стоят эти стены, и на всё отвечает историей «а вот раньше». Помнит, где скрипит каждая половица, но вечно забывает, зачем встал. Сидит за то, что сорок лет назад «одолжил» у соседа лестницу и всё никак не вернёт.",
        "en": "An old-timer who's been inside longer than these walls have stood and answers everything with a \"back in my day\" story. He knows which floorboard creaks but always forgets why he got up. He's in for \"borrowing\" his neighbor's ladder forty years ago and never quite returning it."
      }
    },
    {
      "key": "elektrik",
      "name": {
        "ru": "Электрик",
        "en": "Sparky"
      },
      "emoji": "💡",
      "color": 16498733,
      "tagline": {
        "ru": "Сейчас погаснет свет",
        "en": "Lights out in three, two…"
      },
      "bio": {
        "ru": "Мастер на все руки, который знает каждый провод в тюрьме и вырубает свет во всём крыле одним щелчком. Пахнет паяльником и уверяет, что «искрит — это не страшно». Сидит за то, что подключил весь подъезд к одной розетке ради гирлянды и оставил район без света под Новый год.",
        "en": "A jack-of-all-trades who knows every wire in the place and can kill the lights in a whole wing with one flick. He smells of a soldering iron and insists \"the sparks are totally safe.\" He's in for wiring his whole apartment block to one socket for fairy lights and blacking out the district on New Year's."
      }
    },
    {
      "key": "kot",
      "name": {
        "ru": "Тюремный кот",
        "en": "Prison Cat"
      },
      "emoji": "🐈",
      "color": 10395294,
      "tagline": {
        "ru": "Гуляет сам по себе",
        "en": "Answers to no one"
      },
      "bio": {
        "ru": "Полосатый хозяин двора, которого не смущают ни решётки, ни устав: ходит где хочет и спит прямо на посту у вертухая. Пролезает там, где человеку не пройти, и знает все дыры в заборе. «Сидит» за то, что регулярно ворует у повара сосиски и считает это законной пенсией.",
        "en": "The striped master of the yard, unbothered by bars or regulations — he goes where he pleases and naps right on the guard's post. He squeezes through gaps no human could and knows every hole in the fence. He's \"doing time\" for regularly swiping sausages from the cook and calling it his rightful pension."
      }
    },
    {
      "key": "prapor",
      "name": {
        "ru": "Прапор",
        "en": "Sergeant"
      },
      "emoji": "🎖️",
      "color": 6323595,
      "tagline": {
        "ru": "Всё по описи",
        "en": "Everything by the inventory"
      },
      "bio": {
        "ru": "Прапор-завхоз, у которого учтён каждый гвоздь, только половина склада давно «дома в хозяйстве». Гоняет всех строем и обожает пересчитывать швабры дважды в день. Сидит за то, что списал со склада пятьдесят одеял «на нужды роты» и обустроил ими дачу.",
        "en": "A quartermaster sergeant who has every nail accounted for — though half the storeroom has long since gone \"to his household.\" He marches everyone in formation and adores counting the mops twice a day. He's in for writing off fifty blankets \"for the unit's needs\" and furnishing his summer cottage with them."
      }
    }
  ],
  "//blockCards": "БЛОЧНЫЙ СЮЖЕТ (спека 2026-07-18). survival-карты с полем block:N. Один пул кормит оба режима. Пока авторится вертикальный срез: блок 1 (полный), блок 2 (тонкий). Эффекты только suspicion/respect/health — escape двигают ТОЛЬКО карты побега (escapeCards).",
  "blockCards": [
    {
      "id": "b1_01", "who": "sokamernik", "place": "cell", "block": 1,
      "text": { "ru": "«Новенький! Займём шконку у окна, пока не расхватали?» — толкает локтем сосед.", "en": "'Fresh meat! Let's grab the bunk by the window before it's gone,' your cellmate nudges you." },
      "left": { "text": { "ru": "Занимаем", "en": "Grab it" }, "effects": { "respect": 10, "suspicion": 8 }, "next": "b1_02", "reply": { "ru": "Кинули матрасы — теперь это наш угол. Наглость города берёт.", "en": "Mattresses down — this corner's ours now. Cheek wins the day." } },
      "right": { "text": { "ru": "Не наглею с ходу", "en": "Not on day one" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Сел скромно у двери. Зато никто косо не смотрит.", "en": "Sat quietly by the door. At least nobody's glaring." } }
    },
    {
      "id": "b1_02", "who": "sokamernik", "place": "cell", "block": 1,
      "text": { "ru": "Верхний ворчит: мол, шконка у окна вообще-то его. Продавишь?", "en": "The top-bunk guy grumbles the window bed is his, actually. Stand your ground?" },
      "left": { "text": { "ru": "Стою на своём", "en": "Hold your ground" }, "effects": { "respect": 10, "suspicion": 6 }, "reply": { "ru": "Поворчал и отстал. За место надо держаться сразу.", "en": "He grumbled and backed off. You claim your spot early." } },
      "right": { "text": { "ru": "Уступлю по-тихому", "en": "Give it up quietly" }, "effects": { "respect": -8, "health": 6 }, "reply": { "ru": "Перелёг вниз. Зато спишь спокойно, без разборок.", "en": "Moved to the lower bunk. But you sleep easy, no beef." } }
    },
    {
      "id": "b1_03", "who": "vertuhai", "place": "cell", "block": 1,
      "text": { "ru": "Вертухай на обходе тычет пальцем: «Почему пуговица расстёгнута?»", "en": "The guard jabs a finger on his round: 'Why's that button undone?'" },
      "left": { "text": { "ru": "Молча застёгиваю", "en": "Button up, no words" }, "effects": { "suspicion": -8, "respect": -6 }, "reply": { "ru": "Застегнулся, глаза в пол. Серая мышь — зато незаметная.", "en": "Buttoned up, eyes down. A grey mouse — but an invisible one." } },
      "right": { "text": { "ru": "«Это фасон такой»", "en": "'It's a style'" }, "effects": { "respect": 10, "suspicion": 10 }, "reply": { "ru": "Барак ржёт, вертухай багровеет и что-то строчит в блокнот.", "en": "The block cracks up, the guard goes red and scribbles in his notebook." } }
    },
    {
      "id": "b1_04", "who": "povar", "place": "canteen", "block": 1,
      "text": { "ru": "На раздаче компот сегодня один стакан на двоих с соседом. Как делим?", "en": "At the counter there's one cup of fruit punch to split with your neighbour. How?" },
      "left": { "text": { "ru": "Себе, я первый", "en": "Mine, I'm first" }, "effects": { "health": 8, "respect": -4 }, "reply": { "ru": "Выпил залпом. Вкусно, но сосед запомнил.", "en": "Downed it in one. Tasty — but your neighbour noticed." } },
      "right": { "text": { "ru": "Соседу", "en": "Let him have it" }, "effects": { "respect": 8, "health": -6 }, "reply": { "ru": "Уступил стакан. В горле сухо, зато уважают.", "en": "Handed the cup over. Throat's dry, but respect's up." } }
    },
    {
      "id": "b1_05", "who": "povar", "place": "canteen", "block": 1,
      "text": { "ru": "Повар подмигивает: «Добавки хочешь? Только потом не жалуйся».", "en": "The cook winks: 'Want seconds? Just don't complain later.'" },
      "left": { "text": { "ru": "Хочу!", "en": "Yes please!" }, "effects": { "health": 10, "suspicion": 6 }, "next": "b1_06", "reply": { "ru": "Навалил полную миску. Живём!", "en": "Piled your bowl high. Living the dream!" } },
      "right": { "text": { "ru": "Мне и так хватит", "en": "I've had enough" }, "effects": { "suspicion": -6, "respect": -4 }, "reply": { "ru": "Отказался. Скромно и незаметно — как обычно.", "en": "Passed. Modest and unnoticed — as usual." } }
    },
    {
      "id": "b1_06", "who": "povar", "place": "canteen", "block": 1,
      "text": { "ru": "За добавку повар кивает на гору котлов: «Помой — и мы в расчёте».", "en": "For the seconds the cook nods at a mountain of pots: 'Scrub these and we're square.'" },
      "left": { "text": { "ru": "Мою", "en": "Scrub them" }, "effects": { "respect": 6, "health": -6 }, "next": "b1_07", "reply": { "ru": "Руки в мыле по локоть, зато повар теперь свой.", "en": "Soapy to the elbows, but the cook's on your side now." } },
      "right": { "text": { "ru": "Не нанимался", "en": "Not my job" }, "effects": { "respect": -8, "suspicion": 6 }, "reply": { "ru": "Бросил тряпку. Повар обиделся и всё видел.", "en": "Dropped the rag. The cook's offended — and he saw it all." } }
    },
    {
      "id": "b1_07", "who": "povar", "place": "canteen", "block": 1,
      "text": { "ru": "Повар подобрел и мимо очереди суёт тебе горячий пирожок.", "en": "The cook's warmed up and slips you a hot pie past the queue." },
      "left": { "text": { "ru": "Спасибо, беру", "en": "Thanks, I'll take it" }, "effects": { "health": 12, "suspicion": 6 }, "reply": { "ru": "Умял в углу за секунду. Очередь завистливо сглотнула.", "en": "Wolfed it down in the corner. The queue swallowed enviously." } },
      "right": { "text": { "ru": "Раздай пацанам", "en": "Share it around" }, "effects": { "respect": 12, "health": -4 }, "reply": { "ru": "Разломил на всех. Сам голодный, зато свой в доску.", "en": "Broke it up for everyone. Hungry — but one of the guys now." } }
    },
    {
      "id": "b1_08", "who": "baklan", "place": "canteen", "block": 1,
      "text": { "ru": "Баклан клянчит твою пайку хлеба «в долг до вечера, зуб даю».", "en": "The mouthy kid begs your bread ration 'on loan till tonight, swear on it.'" },
      "left": { "text": { "ru": "Даю, свои же", "en": "Take it, we're mates" }, "effects": { "respect": 8, "health": -8 }, "reply": { "ru": "Отдал горбушку. Вечер покажет, вернёт ли.", "en": "Handed over the crust. Tonight we'll see if he pays up." } },
      "right": { "text": { "ru": "Самому мало", "en": "Barely enough for me" }, "effects": { "respect": -6, "health": 6 }, "reply": { "ru": "Съел сам. Баклан надулся, но брюхо важнее.", "en": "Ate it yourself. The kid sulked, but a full belly wins." } }
    },
    {
      "id": "b1_09", "who": "starik", "place": "cell", "block": 1,
      "text": { "ru": "Старик учит с нижней шконки: «На поверке смотри в пол и не отсвечивай».", "en": "From the lower bunk the old man teaches: 'At roll call, look at the floor and don't stand out.'" },
      "left": { "text": { "ru": "Слушаю деда", "en": "Heed the old man" }, "effects": { "suspicion": -10, "respect": -4 }, "reply": { "ru": "Простоял тише воды. Дед одобрительно крякнул.", "en": "Stood quiet as a mouse. The old man grunted his approval." } },
      "right": { "text": { "ru": "Сам разберусь", "en": "I'll figure it out" }, "effects": { "respect": 8, "suspicion": 8 }, "reply": { "ru": "Стоял гоголем. Вертухай сразу срисовал новенького.", "en": "Stood there strutting. The guard clocked the new guy at once." } }
    },
    {
      "id": "b1_10", "who": "novichok", "place": "cell", "block": 1,
      "text": { "ru": "Ещё зеленее тебя новичок трясётся у двери: «Покажешь, где тут что?»", "en": "A rookie even greener than you trembles by the door: 'Show me the ropes?'" },
      "left": { "text": { "ru": "Опекаю", "en": "Take him under your wing" }, "effects": { "respect": 8, "suspicion": 4 }, "next": "b1_11", "reply": { "ru": "Провёл экскурсию. Теперь ходит за тобой хвостиком.", "en": "Gave him the tour. Now he follows you like a puppy." } },
      "right": { "text": { "ru": "Не нянька", "en": "Not a babysitter" }, "effects": { "respect": -6, "suspicion": -4 }, "reply": { "ru": "Отмахнулся. Малой сник и поплёлся к старику.", "en": "Waved him off. The kid drooped and shuffled to the old man." } }
    },
    {
      "id": "b1_11", "who": "novichok", "place": "canteen", "block": 1,
      "text": { "ru": "Твой новичок влип: опрокинул бачок с кашей прямо на вертухая. Впишешься?", "en": "Your rookie's in trouble — tipped a vat of porridge onto the guard. Step in?" },
      "left": { "text": { "ru": "Прикрываю", "en": "Cover for him" }, "effects": { "respect": 12, "suspicion": 12 }, "reply": { "ru": "«Это я толкнул». Вертухай в каше, барак тебя зауважал.", "en": "'That was me.' The guard's in porridge, the block salutes you." } },
      "right": { "text": { "ru": "Моя хата с краю", "en": "Not my problem" }, "effects": { "respect": -10, "suspicion": -6 }, "reply": { "ru": "Отвернулся к стенке. Малой один отдувается, тебе стыдно.", "en": "Turned to the wall. The kid takes the heat alone; you feel low." } }
    },
    {
      "id": "b1_12", "who": "avtoritet", "place": "cell", "block": 1,
      "text": { "ru": "Старший по бараку меряет тебя взглядом: «Ну, новенький, себя показать умеешь?»", "en": "The block elder sizes you up: 'So, fresh one — can you carry yourself?'" },
      "left": { "text": { "ru": "Держусь ровно", "en": "Keep it steady" }, "effects": { "respect": 10, "suspicion": 4 }, "reply": { "ru": "Взгляд не отвёл, голос не дрогнул. «Годится», — кивнул он.", "en": "Held his gaze, voice steady. 'You'll do,' he nodded." } },
      "right": { "text": { "ru": "Мнусь и жмусь", "en": "Fidget and shrink" }, "effects": { "respect": -8, "health": 4 }, "reply": { "ru": "Промямлил что-то в пол. Записал тебя в тихони.", "en": "Mumbled at the floor. He filed you under 'pushover.'" } }
    },
    {
      "id": "b1_13", "who": "kum", "place": "cell", "block": 1,
      "text": { "ru": "Кум ласково манит: «Зайдёшь на чаёк? Просто поболтаем, по-человечески».", "en": "The warden's man beckons sweetly: 'Come for tea? Just a friendly chat.'" },
      "left": { "text": { "ru": "Иду, чего там", "en": "Sure, why not" }, "effects": { "suspicion": 12, "health": 6 }, "reply": { "ru": "Чай сладкий, вопросы липкие. Барак косится: ты откуда шёл?", "en": "Sweet tea, sticky questions. The block eyes you: where'd you come from?" } },
      "right": { "text": { "ru": "Занят, извините", "en": "Busy, sorry" }, "effects": { "suspicion": -8, "respect": 6 }, "reply": { "ru": "Вежливо слился. Свои одобрительно хмыкнули.", "en": "Politely slipped away. The lads hummed their approval." } }
    },
    {
      "id": "b1_14", "who": "vertuhai", "place": "canteen", "block": 1,
      "text": { "ru": "Вертухай устроил шмон и выудил у тебя из кармана лишнюю ложку.", "en": "The guard runs a shakedown and fishes an extra spoon from your pocket." },
      "left": { "text": { "ru": "«Это для супа!»", "en": "'It's for soup!'" }, "effects": { "suspicion": 8, "respect": 6 }, "reply": { "ru": "Наглость выручила: он хмыкнул, но ложку оставил.", "en": "Cheek saved you: he snorted but let the spoon slide." } },
      "right": { "text": { "ru": "Отдаю, виноват", "en": "Take it, my bad" }, "effects": { "suspicion": -10, "respect": -6 }, "reply": { "ru": "Сдал без спора. Подозрений ноль, но и ложки теперь нет.", "en": "Gave it up without a fuss. Zero suspicion — and zero spoon." } }
    },
    {
      "id": "b1_15", "who": "sokamernik", "place": "cell", "block": 1,
      "text": { "ru": "Сосед шепчет после отбоя: «Не спится. Потравим байки до утра?»", "en": "After lights-out your cellmate whispers: 'Can't sleep. Swap tall tales till dawn?'" },
      "left": { "text": { "ru": "Травим!", "en": "Let's swap!" }, "effects": { "respect": 8, "health": -8 }, "reply": { "ru": "Проржали полночи. Утром оба как варёные, но сдружились.", "en": "Laughed half the night. Wrecked by morning, but proper mates now." } },
      "right": { "text": { "ru": "Спать надо", "en": "Need to sleep" }, "effects": { "health": 10, "respect": -6 }, "reply": { "ru": "Отвернулся и уснул. Свежий, но занудный.", "en": "Rolled over and slept. Fresh — and a bit of a bore." } }
    },
    {
      "id": "b1_16", "who": "povar", "place": "canteen", "block": 1,
      "text": { "ru": "На раздаче шлёпнули пригоревшую кашу с угольком. Возмущаться?", "en": "They slap down burnt porridge with a lump of char in it. Kick up a fuss?" },
      "left": { "text": { "ru": "Требую нормальную", "en": "Demand a proper portion" }, "effects": { "respect": 8, "suspicion": 8 }, "reply": { "ru": "Постучал миской по стойке. Дали свежую, но повар надулся.", "en": "Banged your bowl on the counter. Got a fresh scoop, cook's sulking." } },
      "right": { "text": { "ru": "Ем что дали", "en": "Eat what's given" }, "effects": { "suspicion": -6, "health": -4 }, "reply": { "ru": "Съел с угольком. Невкусно, зато тихо.", "en": "Ate it, char and all. Grim, but quiet." } }
    },

    {
      "id": "b2_01", "who": "elektrik", "place": "corridor", "block": 2,
      "text": { "ru": "Электрик в коридоре шепчет: «Подержи провода — зато покажу, где главный рубильник».", "en": "In the corridor the electrician whispers: 'Hold these wires — I'll show you where the main switch is.'" },
      "left": { "text": { "ru": "Помогаю", "en": "Help him" }, "effects": { "respect": 8, "suspicion": 8 }, "reply": { "ru": "Подержал, не дёрнуло. Рубильник теперь знаешь — на будущее.", "en": "Held them, no shock. Now you know the switch — could come in handy." } },
      "right": { "text": { "ru": "Бьёт током, ну его", "en": "It bites, no thanks" }, "effects": { "health": 6, "respect": -6 }, "reply": { "ru": "Отошёл подальше. Цел, но электрик хмыкнул: трус.", "en": "Backed away. Unhurt, but the electrician scoffed: chicken." } }
    },
    {
      "id": "b2_02", "who": "prapor", "place": "corridor", "block": 2,
      "text": { "ru": "Прапор гоняет строем: «Стройсь по росту, живо! Кто тут самый умный?»", "en": "The sergeant drills the line: 'Sort by height, move it! Who's the smart one here?'" },
      "left": { "text": { "ru": "Строюсь молча", "en": "Fall in, quiet" }, "effects": { "suspicion": -8, "respect": -4 }, "reply": { "ru": "Встал куда велено. Прапор доволен, барак зевает.", "en": "Stood where told. The sergeant's pleased, the block yawns." } },
      "right": { "text": { "ru": "Шучу про его рост", "en": "Crack a joke on his height" }, "effects": { "respect": 10, "suspicion": 10 }, "reply": { "ru": "«А вам куда, товарищ прапор?» Барак лёг, прапор — нет.", "en": "'And where do YOU stand, sarge?' The block died laughing, he didn't." } }
    },
    {
      "id": "b2_03", "who": "kum", "place": "corridor", "block": 2,
      "text": { "ru": "Кум как бы невзначай: «Слыхал, кто вчера шумел в бараке ночью?»", "en": "The warden's man, all casual: 'Heard who was making noise in the block last night?'" },
      "left": { "text": { "ru": "Ничего не знаю", "en": "I know nothing" }, "effects": { "suspicion": -6, "respect": 6 }, "reply": { "ru": "«Спал как убитый». Кум вздохнул, свои кивнули.", "en": "'Slept like a log.' He sighed; the lads nodded." } },
      "right": { "text": { "ru": "«Может, и слыхал…»", "en": "'Maybe I did…'" }, "effects": { "suspicion": 14, "respect": -10 }, "reply": { "ru": "Кум расцвёл, а барак разом похолодел к тебе.", "en": "He beamed — and the block went cold on you in an instant." } }
    },
    {
      "id": "b2_04", "who": "vertuhai", "place": "corridor", "block": 2,
      "text": { "ru": "Вертухай обронил связку ключей и не заметил. Твой ход?", "en": "The guard dropped his keyring and didn't notice. Your move?" },
      "left": { "text": { "ru": "Разглядываю, какие", "en": "Study the keys" }, "effects": { "suspicion": 12, "respect": 10 }, "reply": { "ru": "Успел запомнить бородки, пока он не хватился. Рискованно, но полезно.", "en": "Memorised the notches before he missed them. Risky, but useful." } },
      "right": { "text": { "ru": "«Уронил!»", "en": "'You dropped these!'" }, "effects": { "suspicion": -12, "health": 4 }, "reply": { "ru": "Вернул ключи. Вертухай буркнул спасибо и запомнил тебя как честного.", "en": "Handed them back. The guard grunted thanks, marked you as honest." } }
    },
    {
      "id": "b2_05", "who": "sokamernik", "place": "cell", "block": 2,
      "text": { "ru": "Сосед нацарапал на стене распорядок обходов охраны. Учить наизусть?", "en": "Your cellmate scratched the guards' patrol schedule on the wall. Learn it by heart?" },
      "left": { "text": { "ru": "Зубрю", "en": "Memorise it" }, "effects": { "respect": 8, "suspicion": 6 }, "reply": { "ru": "Вызубрил до минуты. Когда-нибудь пригодится, ох пригодится.", "en": "Learned it to the minute. Someday this'll matter — oh, it will." } },
      "right": { "text": { "ru": "Сотру, спалимся", "en": "Wipe it, too risky" }, "effects": { "suspicion": -10, "respect": -6 }, "reply": { "ru": "Затёр ладонью. Сосед закатил глаза: перестраховщик.", "en": "Smeared it off. Your cellmate rolled his eyes: worrywart." } }
    },
    {
      "id": "b2_06", "who": "avtoritet", "place": "cell", "block": 2,
      "text": { "ru": "Старший по бараку: «Отнесёшь записку в соседний барак? Свои зачтутся».", "en": "The block elder: 'Run a note to the next block? The favour won't be forgotten.'" },
      "left": { "text": { "ru": "Отношу", "en": "Run it" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Смотался туда-обратно. Старший кивнул: «Свой парень».", "en": "There and back in a flash. The elder nodded: 'Solid kid.'" } },
      "right": { "text": { "ru": "Не бегаю на посылках", "en": "I'm no errand boy" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Отказал. Тихо, но старший теперь смотрит мимо тебя.", "en": "Turned it down. Quiet — but the elder looks right past you now." } }
    },
    {
      "id": "b2_07", "who": "elektrik", "place": "corridor", "block": 2,
      "text": { "ru": "Электрик: «Подержи фонарь, пока я ковыряюсь в щитке коридора».", "en": "The electrician: 'Hold the torch while I poke around the corridor panel.'" },
      "left": { "text": { "ru": "Держу", "en": "Hold it" }, "effects": { "respect": 6, "suspicion": 6 }, "next": "b2_08", "reply": { "ru": "Посветил. Щиток открылся — а внутри вся проводка коридора как на ладони.", "en": "Lit it up. The panel opened — the whole corridor's wiring laid bare." } },
      "right": { "text": { "ru": "Не лезу в это", "en": "I'm staying out" }, "effects": { "suspicion": -6, "respect": -4 }, "reply": { "ru": "Отошёл. Электрик поворчал и посветил себе телефоном.", "en": "Stepped back. He grumbled and used his own phone light." } }
    },
    {
      "id": "b2_08", "who": "elektrik", "place": "corridor", "block": 2,
      "text": { "ru": "Щиток нараспашку, видно, какой рубильник гасит свет в коридоре. Запоминать?", "en": "Panel wide open — you can see which switch kills the corridor lights. Remember it?" },
      "left": { "text": { "ru": "Черчу в памяти", "en": "Burn it into memory" }, "effects": { "respect": 8, "suspicion": 10 }, "reply": { "ru": "Запомнил рубильник намертво. Темнота — друг того, кто спешит к воле.", "en": "Locked that switch in your head. Darkness helps a man in a hurry." } },
      "right": { "text": { "ru": "Хватит, закрываю", "en": "Enough, shut it" }, "effects": { "suspicion": -8, "respect": -4 }, "reply": { "ru": "Захлопнул щиток. Меньше знаешь — крепче спишь.", "en": "Snapped the panel shut. Less you know, the better you sleep." } }
    },
    {
      "id": "b2_09", "who": "sokamernik", "place": "cell", "block": 2,
      "text": { "ru": "«Прикрой на поверке — скажешь, я в санчасти. Должок с меня.» — сосед натягивает одеяло до глаз.", "en": "'Cover for me at roll call — say I'm at the medic. I'll owe you.' Your cellmate pulls the blanket up to his eyes." },
      "left": { "text": { "ru": "Прикрываю", "en": "Cover him" }, "effects": { "respect": 10, "suspicion": 8 }, "next": "b2_10", "reply": { "ru": "Кивнул вертухаю уверенно. Сосед теперь твой должник.", "en": "Gave the guard a confident nod. Now he owes you one." } },
      "right": { "text": { "ru": "Не вру вертухаю", "en": "Won't lie to the guard" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Сдал как есть. Чисто, но сосед фыркнул: «Ну и друг».", "en": "Told it straight. Clean — but your cellmate huffed: 'Some friend.'" } }
    },
    {
      "id": "b2_10", "who": "vertuhai", "place": "corridor", "block": 2,
      "text": { "ru": "Вертухай ведёт пальцем по списку и стопорится: «Твой сосед. Где?» — глаза в упор.", "en": "The guard runs a finger down the list and stops: 'Your bunkmate. Where is he?' Eyes locked on you." },
      "left": { "text": { "ru": "Санчасть, зуб", "en": "Medic, a tooth" }, "effects": { "suspicion": 12, "respect": 8 }, "reply": { "ru": "«Зуб, говоришь…» — черкнул и пошёл дальше. Пронесло.", "en": "'A tooth, huh…' He scribbled and moved on. Dodged it." } },
      "right": { "text": { "ru": "Не знаю его дел", "en": "Not my business" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "«Не знаешь — не отвечаешь.» Логично, но сосед ждал большего.", "en": "'Don't know, don't cover.' Fair — but your bunkmate hoped for more." } }
    },
    {
      "id": "b2_11", "who": "prapor", "place": "corridor", "block": 2,
      "text": { "ru": "«Лишнее одеяло? Есть по описи, но всё меняется на что-то. Чем богат?» — прапор щёлкает ручкой.", "en": "'A spare blanket? It's in the ledger, but everything trades for something. What've you got?' The quartermaster clicks his pen." },
      "left": { "text": { "ru": "Меняю пайку сахара", "en": "Trade my sugar" }, "effects": { "respect": 10, "suspicion": 6 }, "next": "b2_12", "reply": { "ru": "Сахар ушёл, одеяло пришло. Прапор доволен, зубы целее.", "en": "Sugar out, blanket in. The quartermaster's happy, your teeth safer." } },
      "right": { "text": { "ru": "Обойдусь без", "en": "I'll manage" }, "effects": { "respect": -6, "health": -8 }, "reply": { "ru": "Гордо мёрзнешь на голой шконке. Принципы греют слабо.", "en": "You freeze proudly on a bare bunk. Principles make thin insulation." } }
    },
    {
      "id": "b2_12", "who": "prapor", "place": "corridor", "block": 2,
      "text": { "ru": "Наутро прапор ловит в коридоре: «То одеяло — оно как бы ничьё. Заметут — молчи, что от меня.»", "en": "Next morning the quartermaster catches you: 'That blanket — it's sort of nobody's. If they sweep it, you didn't get it from me.'" },
      "left": { "text": { "ru": "Молчу, договорились", "en": "My lips are sealed" }, "effects": { "respect": 8, "suspicion": 10 }, "reply": { "ru": "Пожал руку. Теперь у тебя тёплый союзник и холодный секрет.", "en": "Shook on it. Now you've got a warm ally and a cold secret." } },
      "right": { "text": { "ru": "Верну от греха", "en": "Give it back" }, "effects": { "respect": -8, "suspicion": -8 }, "reply": { "ru": "Вернул одеяло — спишь без, зато и без чужих тайн.", "en": "Handed the blanket back — sleeping cold, but nobody's secret is yours." } }
    },
    {
      "id": "b2_13", "who": "kum", "place": "corridor", "block": 2,
      "text": { "ru": "«Зайди, чаю налью. Просто поболтать, без протокола.» — кум придерживает дверь кабинета.", "en": "'Come in, I'll pour you tea. Just a chat, off the record.' The operative holds his office door open." },
      "left": { "text": { "ru": "Зайти на чай", "en": "Take the tea" }, "effects": { "respect": -6, "suspicion": 12 }, "next": "b2_14", "reply": { "ru": "Чай крепкий, вопросы мягкие. Пока только чай.", "en": "Strong tea, soft questions. So far, just tea." } },
      "right": { "text": { "ru": "Спешу, извините", "en": "In a hurry, sorry" }, "effects": { "respect": 8, "suspicion": -8 }, "reply": { "ru": "Проскользнул мимо. Кум улыбнулся: «Ну-ну, в другой раз».", "en": "Slipped past. The operative smiled: 'Suit yourself, another time.'" } }
    },
    {
      "id": "b2_14", "who": "kum", "place": "corridor", "block": 2,
      "text": { "ru": "Кум размешивает сахар: «Электрик ваш — рукастый. Часто у щитка возится, да? Так, для порядка.»", "en": "The operative stirs his sugar: 'That electrician of yours — handy fella. Always at the panel, isn't he? Just for the file.'" },
      "left": { "text": { "ru": "Да так, чинит", "en": "Just fixing things" }, "effects": { "respect": -8, "suspicion": 10 }, "next": "b2_15", "reply": { "ru": "Обронил мелочь — а кум записал. Мелочей у него не бывает.", "en": "Let a small thing slip — and he wrote it down. Nothing's small to him." } },
      "right": { "text": { "ru": "Не приглядывался", "en": "Never noticed" }, "effects": { "respect": 10, "suspicion": -6 }, "reply": { "ru": "«Ничего не видел.» Кум вздохнул: с тобой скучно. И хорошо.", "en": "'Saw nothing.' The operative sighed: you're no fun. Good." } }
    },
    {
      "id": "b2_15", "who": "avtoritet", "place": "cell", "block": 2,
      "text": { "ru": "В бараке косятся: «Долго ты у кума чаёвничал. Рассказывай, о чём пел.»", "en": "The barrack side-eyes you: 'Long tea with the operative. Go on, what tune did you sing?'" },
      "left": { "text": { "ru": "Ни о чём, отвязался", "en": "Nothing, shook him off" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Держишь лицо — верят через раз, но задирать перестали.", "en": "You hold a straight face — half believed, but they quit needling." } },
      "right": { "text": { "ru": "Выложить как было", "en": "Tell it straight" }, "effects": { "respect": -6, "suspicion": -10 }, "reply": { "ru": "Пересказал беседу дословно. Чисто, но «болтун» — тоже ярлык.", "en": "Recounted the chat word for word. Clean — but 'blabber' is a label too." } }
    },
    {
      "id": "b2_16", "who": "avtoritet", "place": "cell", "block": 2,
      "text": { "ru": "«Работёнка на доверие: подержи вот это у себя до вечера. Не спрашивай что.» — старший тянет свёрток.", "en": "'Little trust job: hold onto this till evening. Don't ask what.' The barrack boss holds out a bundle." },
      "left": { "text": { "ru": "Беру, раз просят", "en": "Take the bundle" }, "effects": { "respect": 12, "suspicion": 10 }, "next": "b2_17", "reply": { "ru": "Свёрток под матрас. Доверие растёт, спокойствие тает.", "en": "Bundle under the mattress. Trust grows, calm shrinks." } },
      "right": { "text": { "ru": "Без меня такое", "en": "Leave me out" }, "effects": { "respect": -10, "suspicion": -6 }, "reply": { "ru": "Отказал вежливо. Старший хмыкнул: «Осторожный. Запомним».", "en": "Declined politely. The boss grunted: 'Careful type. Noted.'" } }
    },
    {
      "id": "b2_17", "who": "vertuhai", "place": "cell", "block": 2,
      "text": { "ru": "Вечер, а по коридору топот: шмон! Свёрток под матрасом, вертухай уже в дверях.", "en": "Evening, and boots thunder down the corridor: a search! The bundle's under your mattress, the guard's in the doorway." },
      "left": { "text": { "ru": "Сунуть за трубу", "en": "Stash it behind the pipe" }, "effects": { "respect": 10, "suspicion": 12 }, "reply": { "ru": "Успел перепрятать за стояк — пронесло. Сердце стучало ещё час.", "en": "Stashed it behind the pipe in time — dodged it. Your heart pounded for an hour." } },
      "right": { "text": { "ru": "Сидеть смирно", "en": "Sit perfectly still" }, "effects": { "respect": -6, "suspicion": -8 }, "reply": { "ru": "Не дёрнулся — вертухай глянул мельком и ушёл. Свёрток цел, нервов нет.", "en": "Didn't flinch — the guard glanced and left. Bundle safe, nerves not." } }
    },
    {
      "id": "b2_18", "who": "starik", "place": "cell", "block": 2,
      "text": { "ru": "«Хочешь секрет? Ночной вертухай после ужина всегда дремлет у окна — минут десять коридор пустой.» — старик подмигивает.", "en": "'Want a secret? After supper the night guard always dozes off by the window — ten minutes the corridor's empty.' The old man winks." },
      "left": { "text": { "ru": "Запомнить накрепко", "en": "Memorize it" }, "effects": { "respect": 8, "suspicion": 10 }, "next": "b2_19", "reply": { "ru": "Спрятал в память. Такое знание дороже пайки.", "en": "Filed it away. That kind of knowledge beats a ration." } },
      "right": { "text": { "ru": "Мне это ни к чему", "en": "No use to me" }, "effects": { "respect": -6, "suspicion": -8 }, "reply": { "ru": "«Не надо так не надо.» Старик пожал плечами, секрет остался при нём.", "en": "'Suit yourself.' The old man shrugged, kept his secret." } }
    },
    {
      "id": "b2_19", "who": "starik", "place": "cell", "block": 2,
      "text": { "ru": "Старик тянет за рукав: «Только не проверяй сегодня — смена другая, злая. Дождись четверга.»", "en": "The old man tugs your sleeve: 'Just don't test it tonight — different shift, a mean one. Wait for Thursday.'" },
      "left": { "text": { "ru": "Послушать старика", "en": "Heed the old man" }, "effects": { "respect": 10, "suspicion": -8 }, "reply": { "ru": "Не полез. Позже узнал: ночью был шмон. Старик знает, что говорит.", "en": "Held back. Later heard there was a search that night. The old man knows." } },
      "right": { "text": { "ru": "Проверить сейчас", "en": "Test it now" }, "effects": { "respect": -6, "suspicion": 12 }, "reply": { "ru": "Высунулся — коридор полон. Юркнул назад, сердце в пятках. Урок усвоен.", "en": "Peeked out — corridor full. Ducked back, heart in your boots. Lesson learned." } }
    },
    {
      "id": "b2_20", "who": "vertuhai", "place": "cell", "block": 2,
      "text": { "ru": "Шмон. Вертухай вытряхивает тумбочку и достаёт ложку с приделанной длинню-у-щей ручкой. «Это ещё что?»", "en": "Search time. The guard empties your locker and pulls out a spoon with a looong handle taped on. 'And what's this?'" },
      "left": { "text": { "ru": "Чтоб до котла доставать", "en": "To reach the pot" }, "effects": { "respect": 10, "suspicion": 12 }, "reply": { "ru": "«Добавку из котла удобнее черпать.» Вертухай хмыкнул, но ложку унёс.", "en": "'Easier to scoop seconds from the pot.' The guard smirked but confiscated it anyway." } },
      "right": { "text": { "ru": "Не моё, нашёл", "en": "Not mine, found it" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Свалил на пол барака. Ложку унесли, репутацию слегка тоже.", "en": "Blamed the barrack floor. The spoon's gone, and a bit of your cred with it." } }
    },
    {
      "id": "b2_21", "who": "elektrik", "place": "cell", "block": 2,
      "text": { "ru": "«Лампа мигает — подержи патрон, я подкручу. Может тряхнуть, но чуть-чуть.» — электрик уже на табурете.", "en": "'Bulb's flickering — hold the socket while I twist. Might give a little zap.' The electrician's already on the stool." },
      "left": { "text": { "ru": "Держу патрон", "en": "Hold the socket" }, "effects": { "respect": 10, "health": -8 }, "reply": { "ru": "Тряхнуло-таки, палец онемел. Зато свет ровный и электрик твой друг.", "en": "It zapped, your finger went numb. But the light's steady and the electrician's your pal." } },
      "right": { "text": { "ru": "Сам держи", "en": "Hold it yourself" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Отошёл в сторонку. Электрик справился, но зыркнул: «Тоже мне помощник».", "en": "Stepped back. He managed alone, but shot you a look: 'Some helper.'" } }
    },
    {
      "id": "b2_22", "who": "kum", "place": "corridor", "block": 2,
      "text": { "ru": "Под дверью — записка без подписи: «Черкни, кто мутит с ключами, и будет тебе поблажка. К.»", "en": "A note slides under the door, unsigned: 'Jot down who's fiddling with keys and you'll get an easy ride. — Op.'" },
      "left": { "text": { "ru": "Порвать записку", "en": "Tear it up" }, "effects": { "respect": 12, "suspicion": -6 }, "reply": { "ru": "Разорвал в клочья. Стучать не твоё — в бараке это ценят.", "en": "Tore it to shreds. Snitching's not your style — the barrack respects that." } },
      "right": { "text": { "ru": "Спрятать на потом", "en": "Keep it for later" }, "effects": { "respect": -6, "suspicion": 10 }, "reply": { "ru": "Сунул под стельку. Не написал, но и не выбросил — осадок остался.", "en": "Tucked it in your insole. Didn't write, didn't toss it — leaves a residue." } }
    },
    {
      "id": "b2_23", "who": "sokamernik", "place": "cell", "block": 2,
      "text": { "ru": "«Слепим шахматы из хлебного мякиша? Вечера длинные, а так хоть турнир.» — сосед катает пешку.", "en": "'Wanna mold chess pieces from bread crumb? Evenings are long — at least we'd have a tournament.' Your cellmate rolls a pawn." },
      "left": { "text": { "ru": "Лепим фигуры", "en": "Mold the pieces" }, "effects": { "respect": 8, "suspicion": 6 }, "reply": { "ru": "К отбою готова целая армия. В бараке очередь на партию.", "en": "By lights-out there's a whole army. The barrack's queuing for a game." } },
      "right": { "text": { "ru": "Хлеб — это еда", "en": "Bread is food" }, "effects": { "respect": -6, "health": 8 }, "reply": { "ru": "Съел мякиш, а не изгадил. Желудок доволен, сосед — не очень.", "en": "Ate the crumb instead of wasting it. Your stomach's glad, your bunkmate less so." } }
    },
    {
      "id": "b2_24", "who": "starik", "place": "cell", "block": 2,
      "text": { "ru": "«При мне такого не было — молодёжь шконки не заправляет!» — старик тычет в твой смятый угол.", "en": "'In my day this never happened — youngsters don't even make their bunks!' The old man jabs at your rumpled corner." },
      "left": { "text": { "ru": "Заправить, как учит", "en": "Make it his way" }, "effects": { "respect": 10, "suspicion": -6 }, "next": "b2_30", "reply": { "ru": "Натянул одеяло по линейке. Старик крякнул одобрительно — редкость.", "en": "Pulled the blanket tight as a ruler. The old man grunted approval — a rare thing." } },
      "right": { "text": { "ru": "И так сойдёт", "en": "Good enough" }, "effects": { "respect": -8, "suspicion": 6 }, "reply": { "ru": "Махнул рукой. Старик бурчал до отбоя, барак посмеивался.", "en": "Waved it off. The old man muttered till lights-out, the barrack chuckled." } }
    },
    {
      "id": "b2_25", "who": "prapor", "place": "corridor", "block": 2,
      "text": { "ru": "«По описи табуреток двенадцать, а стоит одиннадцать. Твой барак брал последним. Где?» — прапор мрачен.", "en": "'Ledger says twelve stools, I count eleven. Your barrack signed last. Where is it?' The quartermaster scowls." },
      "left": { "text": { "ru": "Поищу, найду", "en": "I'll find it" }, "effects": { "respect": 10, "suspicion": 8 }, "next": "b2_29", "reply": { "ru": "Нашёл под шконкой соседа. Прапор доволен, сосед — обижен.", "en": "Found it under a bunkmate's bed. The quartermaster's pleased, the bunkmate's sore." } },
      "right": { "text": { "ru": "Не считал я их", "en": "Didn't count them" }, "effects": { "respect": -6, "suspicion": -8 }, "reply": { "ru": "Развёл руками. Прапор вздохнул и вписал недостачу. Пронесло тихо.", "en": "Shrugged it off. The quartermaster sighed and logged the shortfall. Quietly dodged." } }
    },
    {
      "id": "b2_26", "who": "avtoritet", "place": "cell", "block": 2,
      "text": { "ru": "«Слух пошёл: кто-то в бараке бегает к куму с докладами. Ты недавно у него был. Что скажешь?» — старший смотрит в упор.", "en": "'Word is someone in the barrack keeps running to the operative with reports. You were there lately. Well?' The boss stares you down." },
      "left": { "text": { "ru": "Клянусь, не я", "en": "Swear it's not me" }, "effects": { "respect": 10, "suspicion": 10 }, "reply": { "ru": "Держал взгляд твёрдо. Поверили — но приглядывать будут.", "en": "Held his gaze steady. Believed — but they'll be watching." } },
      "right": { "text": { "ru": "Ищите в другом", "en": "Look elsewhere" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Кивнул на дверь: мол, не по адресу. Уклончиво, зато шум улёгся.", "en": "Nodded at the door: wrong address. Evasive, but the noise died down." } }
    },
    {
      "id": "b2_27", "who": "vertuhai", "place": "corridor", "block": 2,
      "text": { "ru": "«Отбой был десять минут назад, а ты в коридоре. Куда намылился?» — вертухай перегородил проход.", "en": "'Lights-out was ten minutes ago and you're in the corridor. Where you off to?' The guard blocks the way." },
      "left": { "text": { "ru": "В умывальник, честно", "en": "Just the washroom" }, "effects": { "respect": 8, "suspicion": -8 }, "reply": { "ru": "«Руки помыть.» Вертухай махнул: «Живо назад.» Обошлось.", "en": "'Just washing up.' The guard waved: 'Back, quick.' No harm done." } },
      "right": { "text": { "ru": "Молча развернуться", "en": "Turn back silently" }, "effects": { "respect": -6, "suspicion": 10 }, "reply": { "ru": "Развернулся без слов — а молчание вертухай не любит. Взял на карандаш.", "en": "Turned without a word — and guards hate silence. He made a mental note." } }
    },
    {
      "id": "b2_28", "who": "sokamernik", "place": "cell", "block": 2,
      "text": { "ru": "Сосед шепчет под одеялом: «Не при новеньком с третьей шконки болтай — он к куму бегает.»", "en": "Your bunkmate whispers under the blanket: 'Don't talk near the new guy on bunk three — he runs to the operative.'" },
      "left": { "text": { "ru": "Спасибо, учту", "en": "Thanks, noted" }, "effects": { "respect": 10, "suspicion": 6 }, "reply": { "ru": "Кивнул и прикусил язык. Своих надо слушать.", "en": "Nodded and bit your tongue. You listen to your own." } },
      "right": { "text": { "ru": "Сам разберусь", "en": "I'll judge for myself" }, "effects": { "respect": -6, "suspicion": 8 }, "reply": { "ru": "Отмахнулся от совета. Наутро твоя болтовня дошла до кума. Ой.", "en": "Brushed the tip off. By morning your chatter reached the operative. Oops." } }
    },
    {
      "id": "b2_29", "who": "prapor", "place": "corridor", "block": 2,
      "text": { "ru": "«Ловко ты ту табуретку сыскал. Будешь при описи помогать? Только чур: за каждую недостачу теперь спрос с тебя.»", "en": "'Nicely done finding that stool. Want to help with the inventory? Fair warning: every shortfall's on you now.'" },
      "left": { "text": { "ru": "Соглашаюсь", "en": "I'm in" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Пожал руку — теперь ты при описи. Уважают, но каждый гвоздь считают с тебя.", "en": "Shook on it — you're on inventory now. Respected, but every nail's counted against you." } },
      "right": { "text": { "ru": "Не потяну", "en": "Not for me" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Отказался — прапор пожал плечами. Спокойнее, но в помощники записали другого.", "en": "Declined — the quartermaster shrugged. Quieter, but someone else got the badge." } }
    },
    {
      "id": "b2_30", "who": "starik", "place": "cell", "block": 2,
      "text": { "ru": "«Раз уважаешь старших — держи науку. Молодой у окна дерзит всему бараку. Осадишь его при мне?»", "en": "'Since you respect your elders, here's a lesson. The young loudmouth by the window's sassing the whole barrack. Put him in his place, with me watching?'" },
      "left": { "text": { "ru": "Осадить дерзкого", "en": "Put him in his place" }, "effects": { "respect": 12, "suspicion": 8 }, "reply": { "ru": "Пары слов хватило — молодой притих. Барак одобрил, но задиру ты нажил.", "en": "A couple words and the kid piped down. The barrack approved — but you've made a hothead an enemy." } },
      "right": { "text": { "ru": "Не моё дело", "en": "Not my quarrel" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Отошёл в сторону. Старик вздохнул: «Эх, молодёжь». Тихо, но не геройски.", "en": "Stepped aside. The old man sighed: 'Ah, youth.' Quiet, but no hero." } }
    },
    {
      "id": "b3_01", "who": "povar", "place": "canteen", "block": 3,
      "text": { "ru": "«Тебе с горкой навалить или как всем?» — повар завис черпаком над твоей миской.", "en": "'Heaping scoop for you, or same as everyone?' the cook hovers his ladle over your bowl." },
      "left": { "text": { "ru": "С горкой", "en": "Heap it up" }, "effects": { "respect": 8, "suspicion": 10 }, "next": "b3_02", "reply": { "ru": "Миска с верхом — очередь завистливо засопела. Хорошо жить по знакомству.", "en": "Bowl piled high — the line sighs with envy. Good to have friends." } },
      "right": { "text": { "ru": "Как всем", "en": "Same as all" }, "effects": { "respect": -6, "suspicion": -8 }, "reply": { "ru": "Взял ровно пайку. Скромно, зато повар кивнул как своему.", "en": "Took the plain ration. Modest, but the cook nodded like you're alright." } }
    },
    {
      "id": "b3_02", "who": "povar", "place": "canteen", "block": 3,
      "text": { "ru": "«За горку — вынесешь бак с очистками. По-честному, да?» — повар уже суёт тебе бак.", "en": "'For the heap — you haul the scraps bin. Fair's fair, right?' the cook already shoves the bin at you." },
      "left": { "text": { "ru": "Выношу бак", "en": "Haul it out" }, "effects": { "respect": 10, "suspicion": -6, "health": -4 }, "reply": { "ru": "Оттащил бак, спина хрустнула — зато повар теперь твой должник.", "en": "Lugged the bin, back cracked — but now the cook owes you one." } },
      "right": { "text": { "ru": "Не нанимался", "en": "Not my job" }, "effects": { "respect": -8, "health": 6 }, "reply": { "ru": "Отбрехался — руки чистые, силы целы, но завтра тебе снова «как всем». Жадность наказуема.", "en": "Wormed out of it — hands clean, strength saved, but tomorrow it's 'same as everyone' again. Greed backfires." } }
    },
    {
      "id": "b3_03", "who": "baklan", "place": "canteen", "block": 3,
      "text": { "ru": "Баклан пялится на твой кусок хлеба: «Лишний, что ли? Дай сюда.»", "en": "Baklan eyes your bread. 'Extra, is it? Hand it over.'" },
      "left": { "text": { "ru": "Не отдаю", "en": "Keep the bread" }, "effects": { "respect": 12, "suspicion": 8 }, "next": "b3_04", "reply": { "ru": "Хлеб остался у тебя. Баклан фыркнул, но кулаки в ход не пустил.", "en": "The bread stays yours. Baklan huffs, but keeps his fists down." } },
      "right": { "text": { "ru": "Забирай", "en": "Take it" }, "effects": { "respect": -10, "suspicion": -6 }, "reply": { "ru": "Отдал молча. Голодно, зато без шума на весь барак.", "en": "Handed it over quietly. Hungry, but no scene for the whole block." } }
    },
    {
      "id": "b3_04", "who": "baklan", "place": "canteen", "block": 3,
      "text": { "ru": "Баклан набычился и машет дружкам за соседний стол: «Идите гляньте на храброго.»", "en": "Baklan bristles and waves his mates over. 'Come look at the brave one.'" },
      "left": { "text": { "ru": "Стою на своём", "en": "Hold your ground" }, "effects": { "respect": 10, "suspicion": 6 }, "next": "b3_05", "reply": { "ru": "Не моргнул — дружки притормозили. С таким связываться дороже.", "en": "Didn't blink — the mates slow up. Not worth the trouble." } },
      "right": { "text": { "ru": "Свожу на шутку", "en": "Play it off" }, "effects": { "respect": -4, "suspicion": -8 }, "reply": { "ru": "Отшутился, все заржали — и баклан завял без публики.", "en": "Cracked a joke, everyone laughs — and Baklan deflates without an audience." } }
    },
    {
      "id": "b3_05", "who": "povar", "place": "canteen", "block": 3,
      "text": { "ru": "Повар грохнул черпаком по кастрюле: «Кто шумит у меня в столовке — тот моет посуду!»", "en": "The cook bangs his ladle on the pot. 'Whoever makes noise in my canteen — washes the dishes!'" },
      "left": { "text": { "ru": "Молча сажусь", "en": "Sit down quietly" }, "effects": { "respect": -6, "suspicion": -6 }, "reply": { "ru": "Сел и уткнулся в миску. Тихо — значит, целее.", "en": "Sat and buried your face in the bowl. Quiet keeps you whole." } },
      "right": { "text": { "ru": "Киваю на баклана", "en": "Point at Baklan" }, "effects": { "respect": 6, "suspicion": 10 }, "reply": { "ru": "Кивнул на зачинщика — баклан загремел тарелками. Но ябеду тут не забудут.", "en": "Pointed at the troublemaker — the kid clattered off with the dishes. But tattling is not forgotten here." } }
    },
    {
      "id": "b3_06", "who": "avtoritet", "place": "corridor", "block": 3,
      "text": { "ru": "Старший кивает на дверь подсобки: «Занеси туда мешок. Внутрь не заглядывай.»", "en": "The Boss nods at the storeroom door. 'Carry this sack in. Don't look inside.'" },
      "left": { "text": { "ru": "Заношу, не смотрю", "en": "Carry, don't peek" }, "effects": { "respect": 10, "suspicion": 6 }, "next": "b3_07", "reply": { "ru": "Занёс, поставил, вышел. Меньше знаешь — крепче спишь.", "en": "Carried it in, set it down, left. Less you know, better you sleep." } },
      "right": { "text": { "ru": "Отказываюсь", "en": "Refuse" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Мотнул головой. Старший хмыкнул: «Гордый.» Себе дороже.", "en": "Shook your head. The Boss smirks: 'Proud one.' Could cost you." } }
    },
    {
      "id": "b3_07", "who": "avtoritet", "place": "canteen", "block": 3,
      "text": { "ru": "В подсобке мешок звякнул — там явно не картошка. Заглянуть?", "en": "In the storeroom the sack clinks — that's not potatoes. Take a peek?" },
      "left": { "text": { "ru": "Заглядываю", "en": "Take a peek" }, "effects": { "respect": 6, "suspicion": 12 }, "reply": { "ru": "Внутри — банки сгущёнки. Целое богатство! Но чужой секрет теперь на тебе.", "en": "Inside — cans of condensed milk. A fortune! But now you carry someone's secret." } },
      "right": { "text": { "ru": "Не моё дело", "en": "None of my business" }, "effects": { "respect": -4, "suspicion": -8 }, "reply": { "ru": "Вышел не оборачиваясь. Старший уважает надёжных — но пацаны шепчутся: чего смелости не хватило?", "en": "Walked out without turning. The Boss respects reliable types — but the crew murmurs: no nerve, eh?" } }
    },
    {
      "id": "b3_08", "who": "novichok", "place": "canteen", "block": 3,
      "text": { "ru": "Новенький на раздаче трясётся: «Мне черпак доверили, а руки дрожат. Подстрахуешь?»", "en": "The Newbie's shaking behind the serving line. 'They trusted me with the ladle and my hands shake. Back me up?'" },
      "left": { "text": { "ru": "Помогаю", "en": "Help him out" }, "effects": { "respect": 10, "suspicion": 6 }, "next": "b3_09", "reply": { "ru": "Встал рядом, показал хват. Очередь довольна, новенький сияет.", "en": "Stood by him, showed the grip. The line's happy, the Newbie beams." } },
      "right": { "text": { "ru": "Сам разбирайся", "en": "Sort it yourself" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Прошёл мимо. Новенький расплескал суп — очередь загудела, но вертухай тебя даже не заметил.", "en": "Walked past. The Newbie slopped the soup — the line grumbled, but the guard never even clocked you." } }
    },
    {
      "id": "b3_09", "who": "novichok", "place": "canteen", "block": 3,
      "text": { "ru": "Новенький от радости навалил тебе двойную порцию — очередь заворчала.", "en": "Grateful, the Newbie heaps you a double portion — the line starts muttering." },
      "left": { "text": { "ru": "Беру и делюсь", "en": "Take, then share" }, "effects": { "respect": 8, "suspicion": 6 }, "reply": { "ru": "Взял, но отсыпал соседям. Двойная порция — двойной авторитет.", "en": "Took it, then shared it out. Double portion, double respect." } },
      "right": { "text": { "ru": "Возвращаю лишнее", "en": "Give the extra back" }, "effects": { "respect": -4, "suspicion": -8 }, "reply": { "ru": "Вернул горку в котёл. Скучно, зато очередь выдохнула.", "en": "Tipped the extra back in the pot. Boring, but the line relaxes." } }
    },
    {
      "id": "b3_10", "who": "kot", "place": "canteen", "block": 3,
      "text": { "ru": "Кот прошмыгнул на кухню и уселся у котла, будто он тут главный. Повар не видит.", "en": "The cat slips into the kitchen and sits by the cauldron like he owns it. The cook hasn't noticed." },
      "left": { "text": { "ru": "Выгоняю тихо", "en": "Shoo him out" }, "effects": { "respect": -4, "suspicion": -6 }, "reply": { "ru": "Подхватил кота под пузо, вынес за дверь. Он обиженно мяукнул.", "en": "Scooped the cat up and set him outside. He meows, offended." } },
      "right": { "text": { "ru": "Пусть сидит", "en": "Let him stay" }, "effects": { "respect": 6, "suspicion": 8 }, "next": "b3_11", "reply": { "ru": "Оставил кота при котле. Что может пойти не так? Многое.", "en": "Left the cat by the pot. What could go wrong? Plenty." } }
    },
    {
      "id": "b3_11", "who": "kot", "place": "canteen", "block": 3,
      "text": { "ru": "Кот цапнул кусок рыбы и смотрит на тебя: сдашь или прикроешь?", "en": "The cat snatches a chunk of fish and stares at you: rat him out or cover for him?" },
      "left": { "text": { "ru": "Прикрываю кота", "en": "Cover for him" }, "effects": { "respect": 8, "suspicion": 8 }, "next": "b3_12", "reply": { "ru": "Задвинул кота ногой под стол. Сообщник у тебя пушистый.", "en": "Nudged the cat under the table with your foot. Your accomplice is furry." } },
      "right": { "text": { "ru": "Зову повара", "en": "Call the cook" }, "effects": { "respect": -6, "suspicion": -8 }, "reply": { "ru": "Кивнул повару на воришку. Кот удрал, рыба спасена, совесть чиста.", "en": "Tipped the cook off. The cat bolts, the fish is saved, your conscience is clear." } }
    },
    {
      "id": "b3_12", "who": "kot", "place": "canteen", "block": 3,
      "text": { "ru": "Повар нашёл кота у котла: «Твой?» Кот трётся о твою ногу — вот предатель.", "en": "The cook finds the cat at the pot. 'Yours?' The cat rubs against your leg — traitor." },
      "left": { "text": { "ru": "Беру вину на себя", "en": "Take the blame" }, "effects": { "respect": 10, "health": -6 }, "reply": { "ru": "«Мой, недоглядел.» Драил котлы весь вечер, зато кот тебя теперь уважает.", "en": "'Mine, my bad.' Scrubbed pots all evening — but the cat respects you now." } },
      "right": { "text": { "ru": "Отрекаюсь от кота", "en": "Deny the cat" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "«Впервые вижу!» Кот оскорблённо ушёл. К тебе не придрались, но предал предателя — так себе слава.", "en": "'Never seen him!' The cat stalks off, insulted. Nobody pinned it on you, but you betrayed a traitor — poor look." } }
    },
    {
      "id": "b3_13", "who": "vertuhai", "place": "canteen", "block": 3,
      "text": { "ru": "Вертухай ведёт шмон на кухне: «Что в карманах? Пайку тыришь?»", "en": "The guard runs a shakedown in the kitchen. 'What's in the pockets? Swiping rations?'" },
      "left": { "text": { "ru": "Выворачиваю сам", "en": "Empty them myself" }, "effects": { "respect": -6, "suspicion": -10 }, "next": "b3_14", "reply": { "ru": "Вывернул карманы наружу — и тут из шва выпал комок. Вертухай замер.", "en": "Turned your pockets inside out — and a lump tumbles from a seam. The guard freezes." } },
      "right": { "text": { "ru": "Стою молча", "en": "Stand silent" }, "effects": { "respect": 8, "suspicion": 10 }, "reply": { "ru": "Не дёрнулся, смотришь в глаза. Вертухай прищурился: «Дерзкий.»", "en": "Didn't flinch, met his eyes. The guard narrows his. 'Cheeky.'" } }
    },
    {
      "id": "b3_14", "who": "vertuhai", "place": "canteen", "block": 3,
      "text": { "ru": "А в кармане и правда завалялся сухарь. Вертухай прищурился на комок.", "en": "And there really is a stale crust in your pocket. The guard squints at the lump." },
      "left": { "text": { "ru": "Признаюсь, смеюсь", "en": "Own up, laugh" }, "effects": { "respect": -4, "suspicion": -10 }, "reply": { "ru": "«Это на потом, гражданин начальник.» Вертухай хмыкнул и махнул рукой. Вышло чуток жалко, зато отстал.", "en": "'Saving it for later, boss.' The guard snorts and waves you on. Came off a bit sheepish, but he let it go." } },
      "right": { "text": { "ru": "Это не мой", "en": "Not mine" }, "effects": { "respect": 6, "suspicion": 12 }, "reply": { "ru": "«Понятия не имею, откуда.» Наглости хватило, но вертухай не поверил ни на грош.", "en": "'No idea how that got there.' Bold enough, but the guard doesn't buy a word of it." } }
    },
    {
      "id": "b3_15", "who": "starik", "place": "canteen", "block": 3,
      "text": { "ru": "Старик шепчет: «Знаю, как из пустой пайки сделать пир. Научить?»", "en": "The Old-Timer whispers: 'I know how to turn a bare ration into a feast. Want to learn?'" },
      "left": { "text": { "ru": "Учусь", "en": "Learn it" }, "effects": { "respect": 8, "suspicion": 4 }, "next": "b3_16", "reply": { "ru": "Слушаешь вполуха и запоминаешь. Старые рецепты на вес золота.", "en": "Listen close and memorize. Old recipes are worth their weight in gold." } },
      "right": { "text": { "ru": "Некогда мне", "en": "No time" }, "effects": { "respect": -6, "suspicion": -4 }, "reply": { "ru": "Отмахнулся. Старик пожал плечами: «Молодёжь, вечно спешит.»", "en": "Waved him off. The Old-Timer shrugs: 'Youth — always in a rush.'" } }
    },
    {
      "id": "b3_16", "who": "starik", "place": "canteen", "block": 3,
      "text": { "ru": "По рецепту старика на кухне запахло так, что сбежался весь барак.", "en": "Following the Old-Timer's recipe, the kitchen smells so good the whole block comes running." },
      "left": { "text": { "ru": "Кормлю всех", "en": "Feed everyone" }, "effects": { "respect": 12, "suspicion": 8 }, "reply": { "ru": "Раздал по ложке каждому — теперь ты в бараке кулинарная легенда.", "en": "Doled out a spoonful to each — now you're the block's culinary legend." } },
      "right": { "text": { "ru": "Прячу кастрюлю", "en": "Hide the pot" }, "effects": { "respect": -6, "health": 8 }, "reply": { "ru": "Затырил кастрюлю под шконку. Наелся один от пуза, но взгляды злые.", "en": "Stashed the pot under the bunk. Ate your fill alone, but the glares are sharp." } }
    },
    {
      "id": "b3_17", "who": "povar", "place": "canteen", "block": 3,
      "text": { "ru": "«Посуду кто моет? Доброволец есть?» — повар обводит зал черпаком.", "en": "'Who's on dish duty? Any volunteers?' the cook sweeps the room with his ladle." },
      "left": { "text": { "ru": "Вызываюсь", "en": "Volunteer" }, "effects": { "respect": 6, "suspicion": -8, "health": -4 }, "reply": { "ru": "Руки в мыле по локоть, зато повар теперь кивает как своему.", "en": "Suds up to the elbows — but now the cook nods to you like family." } },
      "right": { "text": { "ru": "Отвожу взгляд", "en": "Look away" }, "effects": { "respect": -6, "suspicion": -4 }, "reply": { "ru": "Уставился в потолок. Пронесло, но добавки теперь не жди.", "en": "Stared at the ceiling. Dodged it — but forget about seconds now." } }
    },
    {
      "id": "b3_18", "who": "baklan", "place": "canteen", "block": 3,
      "text": { "ru": "Баклан хвастает на весь стол: «Да я любого перееем! Спорим на добавку?»", "en": "Baklan brags to the whole table: 'I can out-eat anyone! Bet me a double portion?'" },
      "left": { "text": { "ru": "Принимаю спор", "en": "Take the bet" }, "effects": { "respect": 10, "suspicion": 8, "health": -4 }, "reply": { "ru": "Умял миску первым, баклан сдулся на третьей ложке. Живот трещит, но слава!", "en": "Cleaned your bowl first, Baklan gave up by spoon three. Belly aches, but glory!" } },
      "right": { "text": { "ru": "Не ведусь", "en": "Don't bite" }, "effects": { "respect": -6, "suspicion": -6 }, "reply": { "ru": "«Ешь сам, чемпион.» Скучно, зато без изжоги и позора.", "en": "'Eat it yourself, champ.' Boring, but no heartburn and no humiliation." } }
    },
    {
      "id": "b3_19", "who": "sokamernik", "place": "cell", "block": 3,
      "text": { "ru": "Сокамерник шуршит под шконкой сухарями: «Держим запас на чёрный день?»", "en": "Your cellmate rustles crusts under the bunk. 'Keep a stash for a rainy day?'" },
      "left": { "text": { "ru": "Держим запас", "en": "Keep the stash" }, "effects": { "respect": 6, "suspicion": 10 }, "reply": { "ru": "Сложили сухари в носок под матрас. Запас карман не тянет.", "en": "Piled the crusts in a sock under the mattress. A stash never hurts." } },
      "right": { "text": { "ru": "Съедим сейчас", "en": "Eat it now" }, "effects": { "respect": -6, "health": 8 }, "reply": { "ru": "Схрумкали всё разом. Живот доволен, но запасливым тебя теперь не назовёшь.", "en": "Crunched the lot on the spot. Belly happy, but nobody's calling you the provident type now." } }
    },
    {
      "id": "b3_20", "who": "avtoritet", "place": "canteen", "block": 3,
      "text": { "ru": "Старший подзывает: «Проследи, чтоб мою порцию не трогали. Головой отвечаешь.»", "en": "The Boss beckons you over. 'Make sure nobody touches my portion. You answer for it.'" },
      "left": { "text": { "ru": "Соглашаюсь", "en": "Agree" }, "effects": { "respect": 10, "suspicion": 6 }, "reply": { "ru": "Сел сторожить миску как на посту. Доверие старшего дорогого стоит.", "en": "Sat guarding the bowl like a sentry. The Boss's trust is worth a lot." } },
      "right": { "text": { "ru": "У меня своих дел хватает", "en": "Got my own stuff" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Отказался вежливо. Старший нахмурился — отказывать ему не принято.", "en": "Declined politely. The Boss frowns — you don't turn him down." } }
    },
    {
      "id": "b3_21", "who": "vertuhai", "place": "corridor", "block": 3,
      "text": { "ru": "Вертухай тащит ящик с хлебом на склад: «Помоги донести. Живо.»", "en": "The guard hauls a crate of bread to the store. 'Help me carry it. Quick.'" },
      "left": { "text": { "ru": "Помогаю", "en": "Help carry" }, "effects": { "respect": -6, "suspicion": -8, "health": -4 }, "reply": { "ru": "Дотащил ящик, спина ноет. Зато вертухай теперь смотрит мягче.", "en": "Lugged the crate, back aching. But the guard looks at you softer now." } },
      "right": { "text": { "ru": "Делаю вид, что занят", "en": "Look busy" }, "effects": { "respect": 6, "suspicion": 8 }, "reply": { "ru": "Уткнулся в швабру. Вертухай зыркнул: «Ловкий, гляжу.»", "en": "Buried yourself in a mop. The guard glares: 'Slippery one, aren't you.'" } }
    },
    {
      "id": "b3_22", "who": "novichok", "place": "canteen", "block": 3,
      "text": { "ru": "Новенький тычет в котёл: «А это вообще едят? Или им стены красят?»", "en": "The Newbie pokes at the cauldron. 'Do people actually eat this? Or paint walls with it?'" },
      "left": { "text": { "ru": "Разыгрываю его", "en": "Prank him" }, "effects": { "respect": 8, "suspicion": 4 }, "reply": { "ru": "«Это деликатес, ешь стоя и с поклоном.» Новенький поверил. Стол ржёт.", "en": "'It's a delicacy — eat it standing, with a bow.' He believed it. The table howls." } },
      "right": { "text": { "ru": "Объясняю по-доброму", "en": "Explain kindly" }, "effects": { "respect": -4, "suspicion": -6 }, "reply": { "ru": "«Каша как каша, ешь и не морщись.» Скучно, зато новенький выдохнул с облегчением.", "en": "'It's just porridge, eat up and don't grimace.' Dull of you, but the Newbie sighs with relief." } }
    },
    {
      "id": "b3_23", "who": "kot", "place": "canteen", "block": 3,
      "text": { "ru": "Кот приволок на раздачу дохлую мышь и гордо положил её у котла.", "en": "The cat drags a dead mouse to the serving line and proudly lays it by the cauldron." },
      "left": { "text": { "ru": "Хвалю, убираю", "en": "Praise, clean up" }, "effects": { "respect": 6, "health": -4 }, "reply": { "ru": "Почесал кота, мышь тихо в бак. Гадость, зато барак оценил, что не струсил.", "en": "Scratched the cat, mouse quietly in the bin. Gross, but the block noted you didn't flinch." } },
      "right": { "text": { "ru": "Спихиваю повару", "en": "Pass it to the cook" }, "effects": { "respect": -4, "suspicion": -6 }, "reply": { "ru": "Кивнул повару на «подарок» — тот, ворча, унёс мышь сам. Брезгливо, зато руки чистые.", "en": "Nodded the cook toward the 'gift' — grumbling, he hauled the mouse off himself. Squeamish, but your hands stay clean." } }
    },
    {
      "id": "b3_24", "who": "starik", "place": "cell", "block": 3,
      "text": { "ru": "Старик вздыхает: «При мне пайку делили на весах, по-честному. А теперь на глаз.»", "en": "The Old-Timer sighs: 'In my day rations were split on scales, fair. Now it's all eyeballed.'" },
      "left": { "text": { "ru": "Соглашаюсь, ворчу", "en": "Agree, grumble" }, "effects": { "respect": 6, "suspicion": 6 }, "reply": { "ru": "Покивал старику — тот доволен, что не один такой. Ворчать вдвоём веселей.", "en": "Nodded along — the Old-Timer's glad he's not alone. Grumbling's better in twos." } },
      "right": { "text": { "ru": "Время такое", "en": "Times change" }, "effects": { "respect": -6, "suspicion": -4 }, "reply": { "ru": "«Что было, то прошло, дед.» Старик насупился, но спорить не стал.", "en": "'What's gone is gone, gramps.' The Old-Timer sulks, but lets it drop." } }
    },
    {
      "id": "b3_25", "who": "povar", "place": "canteen", "block": 3,
      "text": { "ru": "Повар сунул тебе тёплый пирожок из-под полы: «Никому не говори, откуда.»", "en": "The cook slips you a warm pie from under the counter. 'Don't tell anyone where it's from.'" },
      "left": { "text": { "ru": "Беру молча", "en": "Take it quietly" }, "effects": { "respect": 6, "suspicion": 10 }, "reply": { "ru": "Пирожок за пазуху, рот на замок. Вкусно, но теперь ты повару должен.", "en": "Pie in your shirt, mouth shut. Tasty — but now you owe the cook." } },
      "right": { "text": { "ru": "Отказываюсь", "en": "Turn it down" }, "effects": { "respect": -8, "suspicion": -8 }, "reply": { "ru": "«Спасибо, не голоден.» Повар обиделся, зато совесть чиста.", "en": "'Thanks, not hungry.' The cook's offended, but your conscience is clean." } }
    },
    {
      "id": "b3_26", "who": "baklan", "place": "canteen", "block": 3,
      "text": { "ru": "Баклан облил стол компотом и тычет в тебя вертухаю: «Это он намусорил!»", "en": "Baklan spills the compote all over the table and points you out to the guard: 'He made the mess!'" },
      "left": { "text": { "ru": "Отпираюсь", "en": "Deny it" }, "effects": { "respect": 8, "suspicion": 10 }, "reply": { "ru": "«Я вообще у другого стола сидел!» Спор на повышенных, вертухай морщится.", "en": "'I was at the other table!' A loud back-and-forth, the guard winces." } },
      "right": { "text": { "ru": "Молча вытираю", "en": "Wipe it silently" }, "effects": { "respect": -6, "suspicion": -8 }, "reply": { "ru": "Взял тряпку, вытер лужу. Обидно, но вертухай отстал сразу.", "en": "Grabbed a rag, wiped the puddle. Unfair, but the guard let it go." } }
    },
    {
      "id": "b3_27", "who": "sokamernik", "place": "canteen", "block": 3,
      "text": { "ru": "Сокамерник шепчет: «На раздаче сахар недосыпают. Устроим ревизию?»", "en": "Your cellmate whispers: 'They're short-pouring the sugar at the line. Want to audit them?'" },
      "left": { "text": { "ru": "Устраиваем шум", "en": "Make a fuss" }, "effects": { "respect": 10, "suspicion": 12 }, "reply": { "ru": "Потребовали пересчёт при всех. Сахар вернули, но повар тебя запомнил.", "en": "Demanded a recount in front of everyone. Sugar restored — but the cook marked you." } },
      "right": { "text": { "ru": "Не лезем", "en": "Stay out of it" }, "effects": { "respect": -6, "suspicion": -6 }, "reply": { "ru": "«Пусть будет.» Сокамерник разочарован, зато с поваром мир.", "en": "'Let it slide.' Your cellmate's let down, but you're square with the cook." } }
    },
    {
      "id": "b3_28", "who": "kot", "place": "corridor", "block": 3,
      "text": { "ru": "Кот развалился поперёк прохода на кухню и не пускает тебя с подносом.", "en": "The cat sprawls across the kitchen doorway and won't let you through with your tray." },
      "left": { "text": { "ru": "Перешагиваю", "en": "Step over" }, "effects": { "respect": -4, "suspicion": -4 }, "reply": { "ru": "Аккуратно перешагнул. Кот проводил тебя ленивым взглядом победителя.", "en": "Stepped carefully over. The cat watches you go with a lazy winner's look." } },
      "right": { "text": { "ru": "Кормлю, чтоб ушёл", "en": "Feed him off" }, "effects": { "respect": 6, "suspicion": 6 }, "reply": { "ru": "Кинул коту кусочек — тот уступил дорогу. Взятка колбасой работает.", "en": "Tossed the cat a scrap — he yielded the path. A sausage bribe works wonders." } }
    },
    {
      "id": "b4_01", "who": "vertuhai", "place": "yard", "block": 4,
      "text": { "ru": "«Строимся на прогулку! Куртки застегнуть, ветер», — вертухай стучит папкой по перилам.", "en": "'Line up for yard time! Zip your jackets, it's windy,' the guard raps his folder on the railing." },
      "left": { "text": { "ru": "Застегнуться первым", "en": "Zip up first" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "Вертухай доволен, барак смотрит как на отличника.", "en": "The guard beams; the block looks at you like a teacher's pet." } },
      "right": { "text": { "ru": "Идти нараспашку", "en": "Walk it open" }, "effects": { "respect": 12, "health": -8 }, "reply": { "ru": "Выглядел героем ровно до первого порыва ветра.", "en": "Looked heroic right up until the first gust." } }
    },
    {
      "id": "b4_02", "who": "baklan", "place": "yard", "block": 4,
      "text": { "ru": "«Турник свободен. Сколько подтянешься, а?» — Баклан висит и болтает ногами.", "en": "'Bar's free. How many can you pull?' Baklan hangs there kicking his legs." },
      "left": { "text": { "ru": "Принять вызов", "en": "Take the bet" }, "effects": { "respect": 12, "health": -8 }, "next": "b4_03", "reply": { "ru": "Скинул куртку. Двор развернулся к турнику, как к телевизору.", "en": "Jacket off. The whole yard turns like it's TV night." } },
      "right": { "text": { "ru": "«Мне и так тепло»", "en": "'I'm warm already'" }, "effects": { "respect": -10, "suspicion": -6 }, "next": "b4_03", "reply": { "ru": "Сел на лавку с видом человека, который просто выше этого.", "en": "Sat on the bench looking above it all." } }
    },
    {
      "id": "b4_03", "who": "baklan", "place": "yard", "block": 4,
      "text": { "ru": "Баклан спрыгивает с турника и морщится: «Плечо потянул. Скажешь врачу, что я с лавки навернулся?»", "en": "Baklan drops off the bar wincing. 'Pulled my shoulder. Tell the doc I fell off a bench, yeah?'" },
      "left": { "text": { "ru": "Подыграть ему", "en": "Back up his story" }, "effects": { "respect": 12, "suspicion": 8 }, "reply": { "ru": "Врач выслушал версию про лавку и молча выписал мазь обоим.", "en": "The doctor heard the bench version and silently prescribed ointment for both of you." } },
      "right": { "text": { "ru": "«Скажу как было»", "en": "'I'll tell it straight'" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "Баклан обиделся до самого отбоя и растирал плечо демонстративно.", "en": "Baklan sulked till lights-out, rubbing his shoulder theatrically." } }
    },
    {
      "id": "b4_04", "who": "starik", "place": "yard", "block": 4,
      "text": { "ru": "«Круги наматываешь как заведённый. Со мной пойдёшь — медленно, зато до конца», — Старик шаркает вдоль стены.", "en": "'You're spinning laps like a windup toy. Walk with me — slow, but you'll finish,' the Old Man shuffles by the wall." },
      "left": { "text": { "ru": "Идти в его темпе", "en": "Match his pace" }, "effects": { "health": 10, "respect": -6 }, "reply": { "ru": "Три круга под истории про погоду. Дышится на удивление хорошо.", "en": "Three laps of weather stories. Breathing feels great, oddly." } },
      "right": { "text": { "ru": "Наматывать быстрее", "en": "Keep the pace up" }, "effects": { "health": -6, "respect": 10 }, "reply": { "ru": "Обогнал всех дважды. И дважды чуть не сложился у водостока.", "en": "Lapped everyone twice. Nearly folded by the drainpipe twice too." } }
    },
    {
      "id": "b4_05", "who": "sokamernik", "place": "yard", "block": 4,
      "text": { "ru": "«Дальний угол за баком — камера туда не достаёт. Проверим?» — сосед подмигивает.", "en": "'Far corner behind the bin — no camera reaches it. Shall we check?' your cellmate winks." },
      "left": { "text": { "ru": "Идём смотреть", "en": "Go look" }, "effects": { "respect": 10, "suspicion": 10 }, "next": "b4_06", "reply": { "ru": "Угол и правда слепой. И пахнет капустой.", "en": "The corner really is blind. And smells of cabbage." } },
      "right": { "text": { "ru": "Стоять на виду", "en": "Stay in plain view" }, "effects": { "suspicion": -12, "respect": -6 }, "next": "b4_06", "reply": { "ru": "Остался под фонарём. Сосед сходил один и вернулся довольным.", "en": "Stayed under the lamp. He went alone and came back smug." } }
    },
    {
      "id": "b4_06", "who": "sokamernik", "place": "yard", "block": 4,
      "text": { "ru": "Сосед подсаживается на лавку и разворачивает тряпицу с сухарями: «Возьмёшь половину на хранение?»", "en": "Your cellmate drops onto the bench and unwraps a rag full of rusks. 'Want to hold half of these?'" },
      "left": { "text": { "ru": "Беру половину", "en": "Take half" }, "effects": { "respect": 12, "suspicion": 10 }, "next": "b4_07", "reply": { "ru": "Сухари за пазухой. Хрустят при каждом шаге, зараза.", "en": "Rusks down your shirt. They crunch with every step, of course." } },
      "right": { "text": { "ru": "Пусть хранит сам", "en": "His stash, his job" }, "effects": { "suspicion": -10, "respect": -8 }, "next": "b4_07", "reply": { "ru": "Отказался. Он обиженно завернул тряпицу обратно.", "en": "Declined. He rewrapped the rag with a wounded sigh." } }
    },
    {
      "id": "b4_07", "who": "vertuhai", "place": "yard", "block": 4,
      "text": { "ru": "«Так, а что это у вас на лавке шуршит?» — вертухай уже идёт через двор.", "en": "'Right, what's that rustling on the bench?' The guard is already crossing the yard." },
      "left": { "text": { "ru": "Выйти навстречу", "en": "Step out to meet him" }, "effects": { "suspicion": -12, "respect": 6 }, "reply": { "ru": "Спросил его про погоду и увёл к воротам. Лавка уцелела.", "en": "Asked him about the weather and walked him off to the gate. The bench survived." } },
      "right": { "text": { "ru": "Отойти к турнику", "en": "Drift off to the bar" }, "effects": { "suspicion": 8, "health": 8 }, "reply": { "ru": "Ушёл незамеченным и размялся. Зато он теперь проверяет эту лавку каждый день.", "en": "Slipped away clean and got a workout. Now he checks that bench daily." } }
    },
    {
      "id": "b4_08", "who": "kot", "place": "yard", "block": 4,
      "text": { "ru": "Тюремный кот занял единственное солнечное место на лавке и делает вид, что он мебель.", "en": "The prison cat has claimed the only sunny spot on the bench and is pretending to be furniture." },
      "left": { "text": { "ru": "Сдвинуть кота", "en": "Nudge the cat" }, "effects": { "health": 10, "respect": -8 }, "reply": { "ru": "Кот ушёл с достоинством оскорблённого начальника. Солнце твоё.", "en": "The cat left like an offended manager. The sun is yours." } },
      "right": { "text": { "ru": "Сесть в тень", "en": "Sit in the shade" }, "effects": { "respect": 8, "health": -6 }, "reply": { "ru": "Двор оценил. Кот тоже, но виду не подал.", "en": "The yard approved. So did the cat, silently." } }
    },
    {
      "id": "b4_09", "who": "kot", "place": "yard", "block": 4,
      "text": { "ru": "Кот выкладывает у твоих ног блестящую пуговицу и садится ждать оценки.", "en": "The cat drops a shiny button at your feet and sits waiting for a review." },
      "left": { "text": { "ru": "Забрать пуговицу", "en": "Pocket the button" }, "effects": { "respect": 10, "suspicion": 8 }, "next": "b4_10", "reply": { "ru": "Пуговица в кармане. Кот выглядит как довольный поставщик.", "en": "Button in pocket. The cat looks like a pleased supplier." } },
      "right": { "text": { "ru": "Оставить на лавке", "en": "Leave it on the bench" }, "effects": { "suspicion": -10, "respect": -6 }, "next": "b4_10", "reply": { "ru": "Положил на видное место. Кот смотрит как на предателя.", "en": "Set it in plain sight. The cat stares like you betrayed him." } }
    },
    {
      "id": "b4_10", "who": "prapor", "place": "yard", "block": 4,
      "text": { "ru": "«У меня с кителя пуговица пропала. По описи, между прочим», — Прапор осматривает лавки.", "en": "'A button's missing off my tunic. It's on the inventory, mind you,' the Quartermaster scans the benches." },
      "left": { "text": { "ru": "Помочь искать", "en": "Help him look" }, "effects": { "suspicion": -10, "respect": -6 }, "reply": { "ru": "Нашли под лавкой. Прапор записал тебя в надёжные, двор — в скучные.", "en": "Found under the bench. He files you as reliable; the yard files you as boring." } },
      "right": { "text": { "ru": "«Кот у вас шустрый»", "en": "'Ask your cat'" }, "effects": { "respect": 12, "suspicion": 6 }, "reply": { "ru": "Прапор пять минут отчитывал кота. Двор рыдал от смеха.", "en": "He lectured the cat for five minutes. The yard wept laughing." } }
    },
    {
      "id": "b4_11", "who": "avtoritet", "place": "yard", "block": 4,
      "text": { "ru": "«Расписание такое: качалка сегодня за нашим бараком, лавки — за соседним. Ты где гуляешь?» — Старший чертит носком линию.", "en": "'Schedule says the gym's our block today, benches are the next block's. Where do you walk?' The elder draws a line with his toe." },
      "left": { "text": { "ru": "«У качалки»", "en": "'By the gym'" }, "effects": { "respect": 12, "health": -8 }, "reply": { "ru": "Приняли за своего. И сразу выдали железо потаскать.", "en": "Accepted instantly — and handed you the heavy stuff to carry." } },
      "right": { "text": { "ru": "«Гуляю везде»", "en": "'I walk everywhere'" }, "effects": { "suspicion": 10, "respect": 6 }, "reply": { "ru": "Оба барака кивнули и оба теперь присматривают за тобой.", "en": "Both blocks nodded. Both blocks now keep an eye on you." } }
    },
    {
      "id": "b4_12", "who": "avtoritet", "place": "yard", "block": 4,
      "text": { "ru": "«Пройдись со мной круг. Разговор есть», — Старший по бараку кивает на дорожку.", "en": "'Walk a lap with me. We should talk,' the block elder nods at the path." },
      "left": { "text": { "ru": "Пойти рядом", "en": "Walk beside him" }, "effects": { "respect": 12, "suspicion": 8 }, "next": "b4_13", "reply": { "ru": "Идёшь рядом. Весь двор считает шаги вместе с вами.", "en": "You walk beside him. The whole yard counts your steps." } },
      "right": { "text": { "ru": "«Я на разминке»", "en": "'I'm warming up'" }, "effects": { "respect": -10, "suspicion": -8 }, "next": "b4_13", "reply": { "ru": "Побежал трусцой. Он проводил тебя долгим взглядом.", "en": "You jogged off. He watched you go for a long moment." } }
    },
    {
      "id": "b4_13", "who": "avtoritet", "place": "yard", "block": 4,
      "text": { "ru": "«Мне нужен человек, который говорит правду, а не приятное. Возьмёшься?»", "en": "'I need someone who tells me the truth, not what's nice. You in?'" },
      "left": { "text": { "ru": "«Скажу как есть»", "en": "'I'll tell it straight'" }, "effects": { "respect": 14, "health": -8 }, "reply": { "ru": "Первая правда ему не понравилась. Вторая — тоже. Но слушал.", "en": "He hated the first truth. And the second. But he listened." } },
      "right": { "text": { "ru": "«Ищите другого»", "en": "'Find someone else'" }, "effects": { "suspicion": -10, "respect": -6 }, "reply": { "ru": "Пожал плечами: «Честно. Уже что-то». И ушёл на второй круг.", "en": "He shrugged. 'Honest, at least.' And went for another lap." } }
    },
    {
      "id": "b4_14", "who": "prapor", "place": "yard", "block": 4,
      "text": { "ru": "«Гантели выдаю под роспись. Одна штука, вес честный», — Прапор держит журнал наготове.", "en": "'Dumbbells issued by signature. One unit, weight certified,' the Quartermaster holds out the log." },
      "left": { "text": { "ru": "Расписаться", "en": "Sign for it" }, "effects": { "suspicion": -8, "health": 10 }, "reply": { "ru": "Гантель твоя на двадцать минут. Прапор засёк время по часам.", "en": "Yours for twenty minutes. He timed it to the second." } },
      "right": { "text": { "ru": "Обойтись без бумаг", "en": "Skip the paperwork" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Качался камнем от бордюра. Прапор смотрел с болью в глазах.", "en": "Lifted a curb stone instead. He watched in visible pain." } }
    },
    {
      "id": "b4_15", "who": "baklan", "place": "yard", "block": 4,
      "text": { "ru": "«Я сто раз отжимаюсь без остановки. Спроси любого!» — Баклан обводит двор рукой.", "en": "'I can do a hundred push-ups straight. Ask anyone!' Baklan sweeps his arm across the yard." },
      "left": { "text": { "ru": "«Покажи двадцать»", "en": "'Show me twenty'" }, "effects": { "respect": 12, "health": -6 }, "reply": { "ru": "На двенадцатом он вспомнил про больное плечо. Двор аплодировал.", "en": "At twelve he remembered a bad shoulder. The yard applauded." } },
      "right": { "text": { "ru": "«Верю на слово»", "en": "'I believe you'" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Он растрогался и весь круг рассказывал про режим питания.", "en": "He got emotional and lectured you on nutrition for a full lap." } }
    },
    {
      "id": "b4_16", "who": "vertuhai", "place": "yard", "block": 4,
      "text": { "ru": "Свисток. «Всем стоять на месте! Пересчитываю», — вертухай поднимает руку.", "en": "A whistle. 'Everyone freeze! Recount,' the guard raises a hand." },
      "left": { "text": { "ru": "Замереть столбом", "en": "Freeze solid" }, "effects": { "suspicion": -12, "health": -6 }, "reply": { "ru": "Стоял как памятник. Нога затекла до самого ужина.", "en": "Stood like a statue. Your leg went numb until dinner." } },
      "right": { "text": { "ru": "Дошагать до лавки", "en": "Finish the step" }, "effects": { "respect": 10, "suspicion": 10 }, "next": "b4_17", "reply": { "ru": "Успел сесть. Вертухай успел заметить.", "en": "Made it to the bench. He made it to noticing." } }
    },
    {
      "id": "b4_17", "who": "vertuhai", "place": "yard", "block": 4,
      "text": { "ru": "«Кто-то шевелился. Считаем заново», — вертухай смотрит прямо на тебя.", "en": "'Somebody moved. We recount,' the guard looks straight at you." },
      "left": { "text": { "ru": "Признаться", "en": "Own up" }, "effects": { "respect": 12, "health": -8 }, "reply": { "ru": "Двор простоял лишних пять минут, но зауважал.", "en": "The yard stood five extra minutes — and respected you for it." } },
      "right": { "text": { "ru": "Смотреть в небо", "en": "Study the sky" }, "effects": { "suspicion": 12, "respect": -6 }, "reply": { "ru": "Пересчитали дважды. Двор ворчал, вертухай запомнил лицо.", "en": "Counted twice. The yard grumbled, the guard memorized your face." } }
    },
    {
      "id": "b4_18", "who": "sokamernik", "place": "yard", "block": 4,
      "text": { "ru": "«Занял место у стены, там теплее. Пустить тебя или сам погуляешь?»", "en": "'Got the warm spot by the wall. Want in, or will you keep walking?'" },
      "left": { "text": { "ru": "Сесть вдвоём", "en": "Squeeze in" }, "effects": { "health": 10, "respect": -6 }, "reply": { "ru": "Тесно, зато тепло. Полдвора считает вас неразлучными.", "en": "Cramped but warm. Half the yard now calls you inseparable." } },
      "right": { "text": { "ru": "«Грейся сам»", "en": "'All yours'" }, "effects": { "respect": 8, "health": -8 }, "reply": { "ru": "Гулял на ветру и выглядел независимо. И мёрз независимо.", "en": "Walked in the wind looking independent. And froze independently." } }
    },
    {
      "id": "b4_19", "who": "starik", "place": "yard", "block": 4,
      "text": { "ru": "«Колено ноет — к вечеру дождь. Загоняй бельё с верёвки», — Старик щурится на небо.", "en": "'Knee's aching — rain by evening. Get the laundry off the line,' the Old Man squints at the sky." },
      "left": { "text": { "ru": "Снять бельё", "en": "Pull the laundry" }, "effects": { "respect": 10, "suspicion": 6 }, "reply": { "ru": "Дождь пошёл через час. Старик даже не обернулся: «Ну да».", "en": "Rain came in an hour. He didn't even turn. 'Told you.'" } },
      "right": { "text": { "ru": "«Небо-то чистое»", "en": "'Sky looks clear'" }, "effects": { "respect": -8, "health": -8 }, "reply": { "ru": "Небо было чистое ровно до момента, когда перестало.", "en": "The sky was clear right up until it wasn't." } }
    },
    {
      "id": "b4_20", "who": "prapor", "place": "yard", "block": 4,
      "text": { "ru": "«Привезли новую сетку для волейбола. Кто вешает — тот и отвечает», — Прапор трясёт свёртком.", "en": "'New volleyball net came in. Whoever hangs it, owns it,' the Quartermaster shakes the bundle." },
      "left": { "text": { "ru": "Взяться вешать", "en": "Hang it yourself" }, "effects": { "respect": 12, "suspicion": 8 }, "next": "b4_21", "reply": { "ru": "Полчаса с проволокой, зато двор смотрит как на инженера.", "en": "Half an hour of wire work — and the yard treats you like an engineer." } },
      "right": { "text": { "ru": "«Пусть вешает актив»", "en": "'Let the crew do it'" }, "effects": { "respect": -10, "suspicion": -6 }, "next": "b4_21", "reply": { "ru": "Сетку повесили криво. Зато не с тебя спрос.", "en": "They hung it crooked. But nobody's asking you." } }
    },
    {
      "id": "b4_21", "who": "baklan", "place": "yard", "block": 4,
      "text": { "ru": "Первый же удар — и мяч улетает за забор. «Ну и кто виноват?» — Баклан разводит руками.", "en": "First serve and the ball sails over the fence. 'So whose fault is that?' Baklan spreads his hands." },
      "left": { "text": { "ru": "Взять вину на себя", "en": "Take the blame" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Прапор выдал запасной мяч и записал твою фамилию отдельной строкой.", "en": "The Quartermaster handed over a spare ball and wrote your name on its own line." } },
      "right": { "text": { "ru": "Кивнуть на Баклана", "en": "Point at Baklan" }, "effects": { "respect": -10, "suspicion": -8 }, "reply": { "ru": "Он полчаса доказывал, что мяч сам виноват. Тебя никто не тронул.", "en": "He spent half an hour arguing the ball did it to itself. Nobody bothered you." } }
    },
    {
      "id": "b4_22", "who": "kot", "place": "yard", "block": 4,
      "text": { "ru": "Кот забрался на самый верх забора и орёт оттуда так, будто его уносит.", "en": "The cat has climbed to the top of the fence and yowls like he's being abducted." },
      "left": { "text": { "ru": "Звать вертухая", "en": "Call the guard" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "Кота сняли по инструкции. Двор считает, что ты испортил концерт.", "en": "Cat retrieved by protocol. The yard says you ruined the show." } },
      "right": { "text": { "ru": "Выманить пайкой", "en": "Lure him with bread" }, "effects": { "respect": 12, "suspicion": 8 }, "reply": { "ru": "Кот спустился за хлебом. И теперь ходит за тобой хвостом.", "en": "He came down for the bread. Now he follows you everywhere." } }
    },
    {
      "id": "b4_23", "who": "baklan", "place": "yard", "block": 4,
      "text": { "ru": "Баклан задевает тебя плечом на дорожке и оборачивается: «Ой, не заметил».", "en": "Baklan shoulders past you on the path and turns. 'Oops, didn't see you.'" },
      "left": { "text": { "ru": "Задеть в ответ", "en": "Shoulder him back" }, "effects": { "respect": 12, "health": -10 }, "reply": { "ru": "Он охнул и заулыбался. Плечо болит у обоих, уважение выросло.", "en": "He grunted and grinned. Both shoulders hurt; respect went up." } },
      "right": { "text": { "ru": "«Бывает, иди»", "en": "'Happens. Move along'" }, "effects": { "suspicion": -8, "respect": -8 }, "reply": { "ru": "Он победно ушёл. Ты сохранил плечо и потерял пару очков.", "en": "He strutted off. You kept your shoulder, lost a little standing." } }
    },
    {
      "id": "b4_24", "who": "sokamernik", "place": "yard", "block": 4,
      "text": { "ru": "«Сваляли мяч из носков, играем два на два. Ты в команде?» — сосед подкидывает комок.", "en": "'Rolled a ball out of socks, two on two. You in?' He tosses the lump up." },
      "left": { "text": { "ru": "Играть", "en": "Play" }, "effects": { "respect": 10, "health": -6 }, "reply": { "ru": "Забил головой. Носочный мяч распался прямо в воздухе.", "en": "Scored a header. The sock ball disintegrated mid-flight." } },
      "right": { "text": { "ru": "Быть судьёй", "en": "Referee instead" }, "effects": { "suspicion": -8, "respect": -8 }, "reply": { "ru": "Судил честно, и потому обе команды остались недовольны.", "en": "Judged fairly, so both teams left annoyed." } }
    },
    {
      "id": "b4_25", "who": "starik", "place": "yard", "block": 4,
      "text": { "ru": "«Двор раньше был вдвое больше, и клумба тут стояла», — Старик тычет палкой в асфальт.", "en": "'This yard used to be twice the size, with a flower bed right here,' the Old Man pokes the asphalt with his stick." },
      "left": { "text": { "ru": "Слушать до конца", "en": "Hear him out" }, "effects": { "respect": 8, "health": -6 }, "reply": { "ru": "История заняла всю прогулку. Зато он теперь тебе рад.", "en": "The story ate the whole walk. But now he lights up when he sees you." } },
      "right": { "text": { "ru": "«А клумба зачем?»", "en": "'Why a flower bed?'" }, "effects": { "respect": -6, "suspicion": 6 }, "next": "b4_26", "reply": { "ru": "Старик замолчал и молча повёл тебя к дальней лавке.", "en": "He went quiet and led you to the far bench without a word." } }
    },
    {
      "id": "b4_26", "who": "starik", "place": "yard", "block": 4,
      "text": { "ru": "На старой лавке карандашом написаны десятки имён. «Добавишь своё или постесняешься?»", "en": "Dozens of names are pencilled onto the old bench. 'Adding yours, or too shy?'" },
      "left": { "text": { "ru": "Вписать имя", "en": "Add your name" }, "effects": { "respect": 12, "suspicion": 10 }, "reply": { "ru": "Криво, зато в списке. Прапор потом два дня искал, кто испортил инвентарь.", "en": "Crooked, but you're on the list. The Quartermaster spent two days hunting the culprit." } },
      "right": { "text": { "ru": "Оставить как есть", "en": "Leave it be" }, "effects": { "suspicion": -10, "respect": -6 }, "reply": { "ru": "«Правильно, — кивнул Старик. — Лавка и без тебя исписана».", "en": "'Wise,' the Old Man nodded. 'Bench is full anyway.'" } }
    },
    {
      "id": "b4_27", "who": "vertuhai", "place": "corridor", "block": 4,
      "text": { "ru": "«Дождь. Прогулку сворачиваем на десять минут раньше», — вертухай гонит всех к дверям.", "en": "'Rain. Yard time ends ten minutes early,' the guard herds everyone to the doors." },
      "left": { "text": { "ru": "Просить десять минут", "en": "Ask for the ten" }, "effects": { "respect": 12, "suspicion": 8 }, "reply": { "ru": "Выторговал пять. Двор промок и был счастлив.", "en": "Haggled him down to five. The yard got soaked and loved it." } },
      "right": { "text": { "ru": "Первым в коридор", "en": "First inside" }, "effects": { "health": 10, "respect": -8 }, "reply": { "ru": "Сухой и тёплый. И один в коридоре — остальные домокали снаружи.", "en": "Dry and warm. And alone in the corridor while everyone else finished getting soaked." } }
    },
    {
      "id": "b4_28", "who": "avtoritet", "place": "cell", "block": 4,
      "text": { "ru": "«Двор после прогулки как помойка. Кто метёт завтра?» — Старший по бараку смотрит по кругу.", "en": "'The yard's a dump after walk time. Who sweeps tomorrow?' The block elder looks around the circle." },
      "left": { "text": { "ru": "Вызваться", "en": "Volunteer" }, "effects": { "respect": 10, "health": -8 }, "reply": { "ru": "Мёл час. Зато метла теперь официально твоя территория.", "en": "Swept for an hour. The broom is now officially your turf." } },
      "right": { "text": { "ru": "Предложить график", "en": "Propose a rota" }, "effects": { "respect": 6, "suspicion": 8 }, "reply": { "ru": "График приняли. Половина барака считает тебя занудой с бумажкой.", "en": "Rota approved. Half the block now calls you the man with the clipboard." } }
    },
    {
      "id": "b5_01", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«На что жалуемся?» — врач листает журнал, не поднимая глаз. Очередь за спиной сопит.", "en": "'What's the complaint?' The doc flips through his log without looking up. The line behind you wheezes." },
      "left": { "text": { "ru": "Жалуюсь на всё", "en": "Everything hurts" }, "effects": { "respect": 10, "suspicion": 9, "health": -6 }, "reply": { "ru": "Перечислил семь болезней. Доктор выписал одну таблетку и уважение к твоей фантазии.", "en": "You listed seven ailments. He prescribed one pill and grudging respect for your imagination." } },
      "right": { "text": { "ru": "Честно: устал", "en": "Honestly: tired" }, "effects": { "respect": -8, "suspicion": -7, "health": 8 }, "reply": { "ru": "Получил витаминку и совет выспаться. Очередь разочарованно выдохнула.", "en": "Got a vitamin and advice to sleep it off. The line sighed, disappointed." } }
    },
    {
      "id": "b5_02", "who": "sokamernik", "place": "cell", "block": 5,
      "text": { "ru": "«Есть гениальный план: трём градусник об одеяло — и ты в медблоке до пятницы».", "en": "'Genius plan: rub the thermometer on the blanket and you're in the infirmary till Friday.'" },
      "left": { "text": { "ru": "Трём градусник", "en": "Rub it" }, "effects": { "respect": 12, "suspicion": 10, "health": -6 }, "next": "b5_03", "reply": { "ru": "Сорок один и восемь. Даже сокамерник присвистнул: перестарались.", "en": "A hundred and seven degrees. Even your cellmate whistled: overdid it." } },
      "right": { "text": { "ru": "Пусть будет честно", "en": "Play it straight" }, "effects": { "respect": -9, "suspicion": -8, "health": 7 }, "reply": { "ru": "Тридцать шесть и шесть. Скучно, зато никто не смотрит на тебя как на артиста.", "en": "Perfectly normal. Boring, but nobody's eyeing you like a performer." } }
    },
    {
      "id": "b5_03", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "Доктор смотрит на градусник, потом на тебя. «С такой температурой люди уже светятся».", "en": "The doc looks at the thermometer, then at you. 'At that temperature people usually glow.'" },
      "left": { "text": { "ru": "Держу лицо", "en": "Hold the act" }, "effects": { "suspicion": 13, "respect": 11, "health": -7 }, "reply": { "ru": "Ты покашлял для убедительности. Он записал: «пациент упорный».", "en": "You coughed for effect. He wrote: 'patient is persistent.'" } },
      "right": { "text": { "ru": "Сдаюсь и смеюсь", "en": "Fess up, laughing" }, "effects": { "suspicion": -11, "respect": -6, "health": 9 }, "reply": { "ru": "Признался. Доктор налил чаю и сказал приходить, когда правда заболеешь.", "en": "You confessed. He poured you tea and said come back when you're actually sick." } }
    },
    {
      "id": "b5_04", "who": "vertuhai", "place": "corridor", "block": 5,
      "text": { "ru": "«Не положено!» — вертухай перегородил дверь медблока. — «Запись была утром, а ты кто такой?»", "en": "'Not allowed!' The guard blocks the infirmary door. 'Sign-up was this morning. Who are you?'" },
      "left": { "text": { "ru": "Ною громко", "en": "Groan loudly" }, "effects": { "respect": 9, "suspicion": 11, "health": 6 }, "reply": { "ru": "Стонал так, что пропустили лишь бы замолчал. Коридор аплодировал глазами.", "en": "You moaned till they let you in just to shut you up. The hallway applauded with its eyes." } },
      "right": { "text": { "ru": "Уйду, приду завтра", "en": "I'll come tomorrow" }, "effects": { "respect": -7, "suspicion": -9, "health": -8 }, "reply": { "ru": "Ушёл по правилам. Спина ныла всю ночь, зато вертухай кивнул как своему.", "en": "Left by the book. Your back ached all night, but the guard nodded like you're alright." } }
    },
    {
      "id": "b5_05", "who": "novichok", "place": "medbay", "block": 5,
      "text": { "ru": "«А так можно было?» — новенький увидел, как полбарака стоит в очереди «за таблеткой от всего».", "en": "'Wait, that's allowed?' The new guy spots half the block queued up for the cure-all pill." },
      "left": { "text": { "ru": "Ставлю его вперёд", "en": "Put him first" }, "effects": { "respect": 9, "suspicion": 8, "health": -7 }, "next": "b5_06", "reply": { "ru": "Пропустил вперёд. Очередь зашумела, новенький сиял как медаль.", "en": "You let him cut. The line grumbled; the kid beamed like a medal." } },
      "right": { "text": { "ru": "Стой как все", "en": "Wait your turn" }, "effects": { "respect": -7, "suspicion": -8, "health": 8 }, "next": "b5_06", "reply": { "ru": "Порядок есть порядок. Новенький обиделся ровно на четыре минуты.", "en": "Rules are rules. The kid sulked for exactly four minutes." } }
    },
    {
      "id": "b5_06", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«Таблетка от всего» кончилась. Доктор задумчиво трясёт пустую банку.", "en": "The cure-all pills are gone. The doc thoughtfully shakes the empty jar." },
      "left": { "text": { "ru": "Предлагаю замену", "en": "Suggest a swap" }, "effects": { "respect": 11, "suspicion": 9, "health": -6 }, "reply": { "ru": "Ты предложил раздавать аскорбинку под тем же именем. Доктор задумался опасно долго.", "en": "You suggested handing out vitamin C under the same name. He thought about it dangerously long." } },
      "right": { "text": { "ru": "Пусть скажет правду", "en": "Tell them straight" }, "effects": { "respect": -9, "suspicion": -8, "health": 7 }, "reply": { "ru": "Объявили честно. Половина очереди тут же выздоровела.", "en": "They announced it honestly. Half the line recovered instantly." } }
    },
    {
      "id": "b5_07", "who": "starik", "place": "medbay", "block": 5,
      "text": { "ru": "«При мне такого не было», — ворчит старик. — «Раньше лечили сном и кашей. И ничего, живой».", "en": "'Didn't have this in my day,' the old man grumbles. 'We were cured by sleep and porridge. Still here, aren't I.'" },
      "left": { "text": { "ru": "Слушаю с уважением", "en": "Listen respectfully" }, "effects": { "respect": 9, "suspicion": -6, "health": -6 }, "reply": { "ru": "Полчаса историй — и ты пропустил приём. Зато старик теперь за тебя горой.", "en": "Half an hour of stories and you missed your slot. But the old man's in your corner now." } },
      "right": { "text": { "ru": "Вежливо сбегаю", "en": "Politely slip away" }, "effects": { "respect": -7, "suspicion": 7, "health": 9 }, "reply": { "ru": "Успел к врачу. Старик до сих пор рассказывает конец истории стене.", "en": "Made it to the doc. The old man is still telling the ending to a wall." } }
    },
    {
      "id": "b5_08", "who": "kum", "place": "medbay", "block": 5,
      "text": { "ru": "«Давай просто поговорим», — кум сел рядом на кушетку. — «Кто у вас там косит? Просто интересно».", "en": "'Let's just talk,' the officer sits on the cot beside you. 'Who's faking in your block? Just curious.'" },
      "left": { "text": { "ru": "Молчу и кашляю", "en": "Cough, say nothing" }, "effects": { "respect": 12, "suspicion": 10, "health": -7 }, "reply": { "ru": "Кашлял, пока он не ушёл. Барак это оценил, горло — не очень.", "en": "You coughed till he left. The block appreciated it; your throat didn't." } },
      "right": { "text": { "ru": "Болтаю о погоде", "en": "Chat about weather" }, "effects": { "respect": -8, "suspicion": -9, "health": 6 }, "reply": { "ru": "Двадцать минут про дожди. Кум ушёл с пустым блокнотом и головной болью.", "en": "Twenty minutes about rain. He left with an empty notebook and a headache." } }
    },
    {
      "id": "b5_09", "who": "sokamernik", "place": "cell", "block": 5,
      "text": { "ru": "«Меняю справку об освобождении от работ на две пайки. Тебе надо?» — шепчет сосед.", "en": "'Trading a work-exemption slip for two rations. You in?' your cellmate whispers." },
      "left": { "text": { "ru": "Беру справку", "en": "Take the slip" }, "effects": { "respect": 11, "suspicion": 12, "health": -8 }, "next": "b5_10", "reply": { "ru": "Справка в кармане, живот пустой. Зато завтра можно лежать.", "en": "Slip in pocket, stomach empty. But tomorrow you get to lie down." } },
      "right": { "text": { "ru": "Оставлю пайку", "en": "Keep my food" }, "effects": { "respect": -9, "suspicion": -7, "health": 10 }, "reply": { "ru": "Поел нормально. Работать придётся, но ноги держат.", "en": "Ate properly. You'll be working, but at least your legs hold you up." } }
    },
    {
      "id": "b5_10", "who": "vertuhai", "place": "corridor", "block": 5,
      "text": { "ru": "Вертухай разглядывает справку на просвет. «А почему печать пахнет картошкой?»", "en": "The guard holds the slip up to the light. 'Why does this stamp smell like potato?'" },
      "left": { "text": { "ru": "Уверенно вру", "en": "Bluff hard" }, "effects": { "suspicion": 14, "respect": 12, "health": -6 }, "reply": { "ru": "Сказал, что в медблоке новый принтер. Он не поверил, но заржал и пропустил.", "en": "You said the infirmary got a new printer. He didn't buy it, but laughed and waved you through." } },
      "right": { "text": { "ru": "Забираю обратно", "en": "Take it back" }, "effects": { "suspicion": -12, "respect": -8, "health": -7 }, "reply": { "ru": "Забрал бумажку и ушёл работать. Спина болит, репутация цела.", "en": "Took the paper back and went off to work. Back aches, record clean." } }
    },
    {
      "id": "b5_11", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«У меня двенадцать симулянтов и один настоящий больной. Помоги угадать», — вздыхает врач.", "en": "'Twelve fakers and one genuinely sick man. Help me guess,' the doc sighs." },
      "left": { "text": { "ru": "Показываю на больного", "en": "Point out the sick one" }, "effects": { "health": 10, "respect": -10, "suspicion": 8 }, "reply": { "ru": "Угадал — парню помогли. Одиннадцать симулянтов смотрят на тебя с обидой.", "en": "Nailed it — the guy got help. Eleven fakers now glare at you." } },
      "right": { "text": { "ru": "Не моё дело", "en": "Not my call" }, "effects": { "respect": 9, "suspicion": -7, "health": -8 }, "reply": { "ru": "Промолчал. Доктор разбирался сам до вечера, очередь стояла до ночи.", "en": "You stayed quiet. He sorted it out himself; the line stood till nightfall." } }
    },
    {
      "id": "b5_12", "who": "novichok", "place": "medbay", "block": 5,
      "text": { "ru": "Новенький бледный по-настоящему, но боится идти к врачу: «А вдруг скажут, что кошу?»", "en": "The new guy is genuinely pale but scared to see the doc: 'What if they say I'm faking?'" },
      "left": { "text": { "ru": "Веду за руку", "en": "Walk him in" }, "effects": { "health": -6, "respect": 10, "suspicion": 8 }, "next": "b5_13", "reply": { "ru": "Довёл до кабинета. Очередь ворчала, новенький держался за твой рукав.", "en": "Got him to the door. The line grumbled; he clung to your sleeve." } },
      "right": { "text": { "ru": "Пусть сам решит", "en": "Let him decide" }, "effects": { "health": -9, "respect": -7, "suspicion": -8 }, "next": "b5_13", "reply": { "ru": "Он потоптался и ушёл в барак. Ты весь день думал, правильно ли.", "en": "He shuffled off back to the block. You wondered all day if that was right." } }
    },
    {
      "id": "b5_13", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«Мальчику и правда плохо», — доктор смотрит поверх очков. — «Нужен покой. Кто присмотрит?»", "en": "'The kid really is unwell,' the doc peers over his glasses. 'He needs rest. Who'll watch him?'" },
      "left": { "text": { "ru": "Беру на себя", "en": "I'll do it" }, "effects": { "respect": 11, "health": -7, "suspicion": 6 }, "next": "b5_14", "reply": { "ru": "Просидел с ним полночи. Не выспался, но парень задышал ровно.", "en": "Sat with him half the night. No sleep, but his breathing evened out." } },
      "right": { "text": { "ru": "Пусть медбрат", "en": "That's staff work" }, "effects": { "respect": -9, "health": 8, "suspicion": -6 }, "next": "b5_14", "reply": { "ru": "Отправил к персоналу. Выспался отлично и почему-то не очень доволен собой.", "en": "Left it to the staff. Slept great and somehow felt worse about it." } }
    },
    {
      "id": "b5_14", "who": "novichok", "place": "cell", "block": 5,
      "text": { "ru": "Новенький поправился и теперь ходит за тобой хвостом: «Научи, как с доктором разговаривать!»", "en": "The new guy's better and now shadows you everywhere: 'Teach me how to talk to the doc!'" },
      "left": { "text": { "ru": "Учу хитростям", "en": "Teach him tricks" }, "effects": { "respect": 12, "suspicion": 11, "health": -6 }, "reply": { "ru": "Показал, как правильно вздыхать. Через день полбарака вздыхало одинаково.", "en": "Showed him the proper sigh. A day later half the block was sighing identically." } },
      "right": { "text": { "ru": "Учу говорить правду", "en": "Teach him honesty" }, "effects": { "respect": -8, "suspicion": -10, "health": 9 }, "reply": { "ru": "Сказал: говори как есть. Скучно, но доктор его теперь любит.", "en": "Told him: just be straight. Boring, but the doc adores him now." } }
    },
    {
      "id": "b5_15", "who": "starik", "place": "medbay", "block": 5,
      "text": { "ru": "Старик держит очередь разговорами и явно тянет время: у него в бараке чинят шконку.", "en": "The old man's stalling the whole line with stories — his bunk's being repaired back in the block." },
      "left": { "text": { "ru": "Подыграю", "en": "Play along" }, "effects": { "respect": 10, "suspicion": 9, "health": -7 }, "reply": { "ru": "Поддержал разговор про рыбалку. Очередь встала намертво, старик доволен.", "en": "Chimed in about fishing. The line froze solid; the old man glowed." } },
      "right": { "text": { "ru": "Двигаю очередь", "en": "Move the line" }, "effects": { "respect": -6, "suspicion": -8, "health": 8 }, "reply": { "ru": "Аккуратно подвинул очередь вперёд. Старик надулся, но все успели к врачу.", "en": "Nudged the line forward. He pouted, but everyone got seen." } }
    },
    {
      "id": "b5_16", "who": "vertuhai", "place": "medbay", "block": 5,
      "text": { "ru": "«Шмон в медблоке!» — вертухай трясёт тумбочку. В ней чей-то запас сушек и старый журнал.", "en": "'Shakedown in the infirmary!' The guard rattles a cabinet: someone's stash of crackers and an old magazine." },
      "left": { "text": { "ru": "Говорю: моё", "en": "Say it's mine" }, "effects": { "respect": 13, "suspicion": 10, "health": -7 }, "reply": { "ru": "Взял на себя чужие сушки. Остался без ужина и с большим уважением.", "en": "Took the blame for someone's crackers. No dinner, plenty of credit." } },
      "right": { "text": { "ru": "Стою молча", "en": "Stand quiet" }, "effects": { "respect": -9, "suspicion": -6, "health": 7 }, "reply": { "ru": "Промолчал, тумбочку унесли. Никто ничего не сказал, но пауза была длинная.", "en": "Said nothing; the cabinet was carried off. Nobody spoke, but the silence went on a while." } }
    },
    {
      "id": "b5_17", "who": "sokamernik", "place": "cell", "block": 5,
      "text": { "ru": "«Есть гениальный план: жалуйся на спину. Спину проверить нельзя!» — сосед сияет.", "en": "'Genius plan: complain about your back. Nobody can check a back!' Your cellmate glows." },
      "left": { "text": { "ru": "Беру план в дело", "en": "Run with it" }, "effects": { "respect": 11, "suspicion": 10, "health": -6 }, "next": "b5_18", "reply": { "ru": "Отрабатывал хромоту до вечера. Ноги устали больше, чем от работы.", "en": "Practiced the limp all evening. Your legs got more tired than from actual work." } },
      "right": { "text": { "ru": "План так себе", "en": "Weak plan" }, "effects": { "respect": -8, "suspicion": -7, "health": 8 }, "reply": { "ru": "Отказался. Сосед обиделся и пошёл хромать сам, довольно убедительно.", "en": "You passed. He sulked and went limping on his own — fairly convincingly." } }
    },
    {
      "id": "b5_18", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«Спина, значит», — доктор кивает. — «Тогда наклонитесь и подберите вон ту ручку».", "en": "'Bad back, huh,' the doc nods. 'Then bend down and pick up that pen.'" },
      "left": { "text": { "ru": "Наклоняюсь легко", "en": "Bend down easily" }, "effects": { "suspicion": -10, "respect": -9, "health": 7 }, "reply": { "ru": "Поднял ручку как балерина. Легенда рухнула вместе с планом.", "en": "Scooped it up like a ballerina. The legend collapsed along with the plan." } },
      "right": { "text": { "ru": "Стону и тянусь", "en": "Groan and reach" }, "effects": { "suspicion": 12, "respect": 11, "health": -7 }, "reply": { "ru": "Тянулся три минуты со стонами. Доктор поставил галочку и ухмыльнулся.", "en": "Reached for it for three minutes, groaning. He ticked a box and smirked." } }
    },
    {
      "id": "b5_19", "who": "kum", "place": "corridor", "block": 5,
      "text": { "ru": "«Давай просто поговорим. Хочешь в медблок на неделю? Мне нужно лишь одно имя».", "en": "'Let's just talk. Want a week in the infirmary? I only need one name.'" },
      "left": { "text": { "ru": "Ни одного имени", "en": "No names" }, "effects": { "respect": 14, "suspicion": 9, "health": -8 }, "reply": { "ru": "Отказался. Неделю в тепле не дали, зато в бараке жмут руку.", "en": "You declined. No cozy week for you, but handshakes all around the block." } },
      "right": { "text": { "ru": "Торгуюсь ни о чём", "en": "Haggle over nothing" }, "effects": { "respect": -6, "suspicion": -10, "health": 8 }, "reply": { "ru": "Долго торговался и назвал имя кота. Кум записал и завис.", "en": "Haggled forever, then gave him the cat's name. He wrote it down and froze." } }
    },
    {
      "id": "b5_20", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«Помоги разложить лекарства по коробкам — освобожу от вечерней поверки», — предлагает врач.", "en": "'Help me sort the meds into boxes and I'll excuse you from evening count,' the doc offers." },
      "left": { "text": { "ru": "Соглашаюсь", "en": "Take the deal" }, "effects": { "health": 8, "suspicion": 9, "respect": -7 }, "reply": { "ru": "Три часа сортировки, зато вечер свободен. Барак решил, что ты теперь при должности.", "en": "Three hours of sorting, but the evening's yours. The block decided you've got a position now." } },
      "right": { "text": { "ru": "Спасибо, нет", "en": "Thanks, no" }, "effects": { "health": -8, "suspicion": -9, "respect": 10 }, "reply": { "ru": "Отказался, пошёл на поверку со всеми. Ноги гудят, но ты как все.", "en": "Passed, and stood the count with everyone. Legs ache, but you're one of them." } }
    },
    {
      "id": "b5_21", "who": "starik", "place": "cell", "block": 5,
      "text": { "ru": "«Колено ноет к дождю», — морщится старик. — «Сходишь за мазью в медблок вместо меня?»", "en": "'My knee aches when rain's coming,' the old man winces. 'Would you fetch me some ointment from the infirmary?'" },
      "left": { "text": { "ru": "Схожу за мазью", "en": "I'll fetch it" }, "effects": { "respect": 12, "suspicion": 10, "health": -6 }, "reply": { "ru": "Принёс мазь. Старик благодарен, а очередь теперь считает тебя аптекой.", "en": "Brought the ointment back. He's grateful; the line now treats you like a pharmacy." } },
      "right": { "text": { "ru": "Дойдём вместе", "en": "Let's walk there" }, "effects": { "respect": -6, "suspicion": -8, "health": 7 }, "reply": { "ru": "Довёл его до кабинета под руку. Дольше, зато никто не считает тебя складом.", "en": "Walked him to the office on your arm. Slower, but nobody thinks you're a supply depot." } }
    },
    {
      "id": "b5_22", "who": "vertuhai", "place": "corridor", "block": 5,
      "text": { "ru": "«Не положено!» — вертухай не пускает с чужой карточкой. — «Тут написано „Петров“, а ты нет».", "en": "'Not allowed!' The guard blocks you over someone else's card. 'This says Petrov. You are not Petrov.'" },
      "left": { "text": { "ru": "Я и есть Петров", "en": "I am Petrov" }, "effects": { "suspicion": 13, "respect": 12, "health": 6 }, "reply": { "ru": "Заявил это с таким лицом, что он засомневался и пропустил. Пока что.", "en": "Said it with such a face that he doubted himself and let you through. For now." } },
      "right": { "text": { "ru": "Отдаю карточку", "en": "Hand it over" }, "effects": { "suspicion": -11, "respect": -9, "health": -7 }, "reply": { "ru": "Вернул карточку и ушёл. Голова гудит, зато вертухай запомнил тебя с хорошей стороны.", "en": "Gave the card back and left. Your head still pounds, but the guard remembers you kindly." } }
    },
    {
      "id": "b5_23", "who": "sokamernik", "place": "medbay", "block": 5,
      "text": { "ru": "«Займи мне место в очереди, я на десять минут», — сосед уже исчезает за углом.", "en": "'Hold my spot, back in ten,' your cellmate says, already vanishing round the corner." },
      "left": { "text": { "ru": "Держу место", "en": "Hold the spot" }, "effects": { "respect": 10, "suspicion": 7, "health": -7 }, "reply": { "ru": "Держал место сорок минут под ворчание очереди. Сосед вернулся с двумя сушками.", "en": "Held it forty minutes under the line's grumbling. He came back with two crackers." } },
      "right": { "text": { "ru": "Очередь не резиновая", "en": "Line's not mine" }, "effects": { "respect": -8, "suspicion": -6, "health": 8 }, "reply": { "ru": "Не стал держать. Сосед вернулся в конец и молчал ровно до ужина.", "en": "Didn't hold it. He went to the back and sulked precisely until dinner." } }
    },
    {
      "id": "b5_24", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«Пропала коробка бинтов», — врач хмурится. — «Кабинет открыт весь день, заходит кто попало».", "en": "'A box of bandages is missing,' the doc frowns. 'The office stands open all day; anyone wanders in.'" },
      "left": { "text": { "ru": "Найду коробку", "en": "I'll find it" }, "effects": { "respect": 9, "suspicion": 8, "health": -6 }, "next": "b5_25", "reply": { "ru": "Пообещал разобраться. Теперь ты и подозреваемый, и следователь.", "en": "Promised to sort it out. Now you're both the suspect and the detective." } },
      "right": { "text": { "ru": "Это не ко мне", "en": "Not my problem" }, "effects": { "respect": -7, "suspicion": 11, "health": 7 }, "next": "b5_25", "reply": { "ru": "Отказался. Доктор не спорил, но записал что-то в журнал.", "en": "You passed. He didn't argue, but he wrote something in the log." } }
    },
    {
      "id": "b5_25", "who": "novichok", "place": "corridor", "block": 5,
      "text": { "ru": "Новенький белый как бинт: «Я их взял… хотел перевязаться сам, чтобы не позориться».", "en": "The new guy is white as gauze: 'I took them... wanted to bandage myself so I wouldn't look stupid.'" },
      "left": { "text": { "ru": "Вернём вместе", "en": "Return them together" }, "effects": { "respect": -6, "suspicion": -10, "health": 9 }, "next": "b5_26", "reply": { "ru": "Пошли к доктору вдвоём. Он поворчал и перевязал парня нормально.", "en": "You both went to the doc. He grumbled and bandaged the kid properly." } },
      "right": { "text": { "ru": "Скажу, что мои", "en": "Say they're mine" }, "effects": { "respect": 12, "suspicion": 9, "health": -7 }, "next": "b5_26", "reply": { "ru": "Взял вину на себя. Новенький чуть не заплакал, доктор чуть не поверил.", "en": "You took the blame. The kid nearly cried; the doc nearly believed you." } }
    },
    {
      "id": "b5_26", "who": "doktor", "place": "medbay", "block": 5,
      "text": { "ru": "«Бинты вернулись сами», — доктор ставит коробку на стол. — «Хочешь быть у меня помощником?»", "en": "'The bandages came back on their own,' the doc sets the box on the table. 'Want to be my assistant?'" },
      "left": { "text": { "ru": "Хочу", "en": "I'm in" }, "effects": { "health": 10, "suspicion": 11, "respect": -8 }, "reply": { "ru": "Теперь ты в халате. Тепло, сытно и половина барака шутит про белый воротничок.", "en": "Now you're in a lab coat. Warm, well fed, and half the block jokes about white collars." } },
      "right": { "text": { "ru": "Останусь в бараке", "en": "I'll stay put" }, "effects": { "health": -8, "suspicion": -9, "respect": 11 }, "reply": { "ru": "Отказался. Барак одобрительно кивнул, спина недовольно скрипнула.", "en": "You declined. The block nodded approvingly; your spine creaked in protest." } }
    },
    {
      "id": "b5_27", "who": "kum", "place": "medbay", "block": 5,
      "text": { "ru": "«Давай просто поговорим — тут тихо», — кум прикрыл дверь палаты. — «Как здоровье, честно?»", "en": "'Let's just talk, it's quiet here,' the officer shuts the ward door. 'How's your health, honestly?'" },
      "left": { "text": { "ru": "Честно рассказываю", "en": "Answer honestly" }, "effects": { "health": 9, "respect": -10, "suspicion": 7 }, "reply": { "ru": "Рассказал про кашель. Получил направление и десяток косых взглядов из коридора.", "en": "Told him about the cough. Got a referral and a dozen side-eyes from the hallway." } },
      "right": { "text": { "ru": "«Здоров как бык»", "en": "'Fit as a fiddle'" }, "effects": { "health": -9, "respect": 11, "suspicion": -6 }, "reply": { "ru": "Соврал бодро. Он ушёл ни с чем, а ты кашлял всю ночь в подушку.", "en": "Lied cheerfully. He left empty-handed; you coughed into your pillow all night." } }
    },
    {
      "id": "b5_28", "who": "starik", "place": "medbay", "block": 5,
      "text": { "ru": "«Тут все больные, а лечится один», — старик кивает на почти пустую банку витаминов. — «Поделим последнее?»", "en": "'Everyone's sick, one guy gets treated,' the old man nods at the nearly empty vitamin jar. 'Split the last one?'" },
      "left": { "text": { "ru": "Делим на всех", "en": "Split it around" }, "effects": { "respect": 12, "health": -7, "suspicion": -6 }, "reply": { "ru": "Разломили на крошки. Толку ноль, зато настроение у палаты поднялось.", "en": "Broke it into crumbs. Zero medical effect, but the ward cheered right up." } },
      "right": { "text": { "ru": "Отдам тому, кто хуже", "en": "Give it to the worst" }, "effects": { "respect": -7, "health": 9, "suspicion": 8 }, "reply": { "ru": "Отдал самому бледному. Справедливо, но кто-то шепнул, что ты выбрал любимчика.", "en": "Gave it to the palest guy. Fair, but someone muttered you'd picked a favourite." } }
    },
    {
      "id": "b6_01", "who": "bibliotekar", "place": "library", "block": 6,
      "text": { "ru": "«Тише. Здесь идёт чтение.» Библиотекарь пододвигает тебе тонкую книжку без обложки.", "en": "'Quiet. Reading is in progress.' The librarian slides you a thin book with no cover." },
      "left": { "text": { "ru": "Сесть и читать", "en": "Sit and read" }, "effects": { "suspicion": -10, "respect": -6, "health": 8 }, "reply": { "ru": "Два часа тишины. Голова отдохнула, барак решил, что ты странный.", "en": "Two hours of quiet. Your head rested; the block decided you're odd." } },
      "right": { "text": { "ru": "«Мне бы поговорить»", "en": "'I'd rather talk'" }, "effects": { "respect": 9, "suspicion": 7 }, "reply": { "ru": "Разговорился с целой полкой соседей. Библиотекарь смотрит так, будто ты сжёг книгу.", "en": "You chatted up half a shelf. The librarian looks like you burned a book." } }
    },
    {
      "id": "b6_02", "who": "novichok", "place": "library", "block": 6,
      "text": { "ru": "«Я маме письмо пишу, а руки трясутся. Напишешь за меня?» — новенький протягивает мятый лист.", "en": "'I'm writing to my mum but my hands are shaking. Write it for me?' The new guy holds out a crumpled sheet." },
      "left": { "text": { "ru": "Написать красиво", "en": "Write it nicely" }, "effects": { "respect": 11, "suspicion": 8 }, "next": "b6_03", "reply": { "ru": "Вышло так складно, что новенький сам прослезился. Слух пошёл мгновенно.", "en": "It came out so well the kid teared up. Word spread instantly." } },
      "right": { "text": { "ru": "Пусть пишет сам", "en": "Let him write it" }, "effects": { "respect": -9, "suspicion": -7, "health": 6 }, "reply": { "ru": "Корявый почерк, зато честный. Мама разберёт, ты не при делах.", "en": "Wobbly handwriting, but honest. Mum will manage; you stay out of it." } }
    },
    {
      "id": "b6_03", "who": "sokamernik", "place": "cell", "block": 6,
      "text": { "ru": "«Говорят, ты письма красиво пишешь. У меня очередь на шесть человек!» — сосед уже машет списком.", "en": "'They say you write pretty letters. I've got six people lined up!' Your cellmate waves a list." },
      "left": { "text": { "ru": "Открыть контору", "en": "Open for business" }, "effects": { "respect": 13, "suspicion": 11, "health": -8 }, "reply": { "ru": "К отбою рука отваливается, зато полбарака должно тебе по конверту.", "en": "By lights-out your hand's dead, but half the block owes you an envelope." } },
      "right": { "text": { "ru": "Только двоим", "en": "Two people, max" }, "effects": { "respect": -6, "suspicion": -8, "health": 7 }, "reply": { "ru": "Очередь обиделась, рука цела. Обиженные пишут сами и молча.", "en": "The queue sulked, your hand survived. They write their own now, silently." } }
    },
    {
      "id": "b6_04", "who": "prapor", "place": "corridor", "block": 6,
      "text": { "ru": "«Всё по описи!» — прапор тычет в журнал. У него не сходятся две книги, а сдавать надо сегодня.", "en": "'Everything by the ledger!' The quartermaster jabs at his log. Two books don't add up and it's due today." },
      "left": { "text": { "ru": "Помочь искать", "en": "Help him look" }, "effects": { "respect": -7, "suspicion": -10, "health": -6 }, "reply": { "ru": "Нашлись за батареей. Прапор доволен, спина ныла до вечера.", "en": "Found behind the radiator. He's happy; your back ached till evening." } },
      "right": { "text": { "ru": "«Спишите на пыль»", "en": "'Just write them off'" }, "effects": { "respect": 10, "suspicion": 9 }, "reply": { "ru": "Прапор списал и подмигнул. Теперь у вас общая маленькая правда.", "en": "He wrote them off with a wink. Now you two share a small little truth." } }
    },
    {
      "id": "b6_05", "who": "starik", "place": "library", "block": 6,
      "text": { "ru": "«При мне тут была картотека», — старик стучит по пустому ящику. — «Помоги восстановить, а?»", "en": "'In my day there was a card catalogue here,' the old man taps an empty drawer. 'Help me rebuild it?'" },
      "left": { "text": { "ru": "Взяться за картотеку", "en": "Take on the catalogue" }, "effects": { "respect": 8, "health": -9, "suspicion": -6 }, "next": "b6_06", "reply": { "ru": "Три часа букв и пыли. Старик впервые за год улыбнулся.", "en": "Three hours of letters and dust. First time the old man smiled all year." } },
      "right": { "text": { "ru": "«Кому она нужна»", "en": "'Who even needs it'" }, "effects": { "respect": -10, "suspicion": 7, "health": 6 }, "reply": { "ru": "Старик молча закрыл ящик. Тишина в зале стала холодной.", "en": "He shut the drawer without a word. The quiet in the room turned cold." } }
    },
    {
      "id": "b6_06", "who": "bibliotekar", "place": "library", "block": 6,
      "text": { "ru": "«В вашей картотеке лишняя карточка», — библиотекарь держит листок с чужим почерком и незнакомой фамилией.", "en": "'There's an extra card in your catalogue,' the librarian holds a slip in someone else's hand with an unfamiliar name." },
      "left": { "text": { "ru": "Выяснить, чья", "en": "Find out whose" }, "effects": { "suspicion": 12, "respect": 9 }, "next": "b6_07", "reply": { "ru": "Пошёл по следу — половина библиотеки заметила, что ты чем-то занят.", "en": "You followed the trail — half the library noticed you were up to something." } },
      "right": { "text": { "ru": "Убрать в стопку", "en": "Slip it in the pile" }, "effects": { "suspicion": -9, "respect": -7 }, "reply": { "ru": "Карточка утонула среди сотни таких же. Загадка закрыта, интерес тоже.", "en": "The card sank among a hundred like it. Mystery closed, and so is the interest." } }
    },
    {
      "id": "b6_07", "who": "starik", "place": "library", "block": 6,
      "text": { "ru": "«Это моя старая карточка», — вздыхает старик. — «Я тут тридцать лет назад книги записывал. Молчи об этом».", "en": "'That's my old card,' the old man sighs. 'I logged books here thirty years ago. Keep it quiet.'" },
      "left": { "text": { "ru": "Молчать", "en": "Keep quiet" }, "effects": { "suspicion": -11, "respect": 8, "health": -6 }, "reply": { "ru": "Ты промолчал, старик пожал руку. Секрет тяжелее книги.", "en": "You said nothing; he shook your hand. A secret weighs more than a book." } },
      "right": { "text": { "ru": "Рассказать бараку", "en": "Tell the block" }, "effects": { "respect": 12, "suspicion": 10, "health": -7 }, "reply": { "ru": "История зашла на ура. Старик теперь смотрит мимо тебя.", "en": "The story was a hit. Now the old man looks straight past you." } }
    },
    {
      "id": "b6_08", "who": "kum", "place": "corridor", "block": 6,
      "text": { "ru": "«Давай просто поговорим. Ты же грамотный — поможешь разобрать почерк в паре бумаг?»", "en": "'Let's just talk. You're literate — help me make out the handwriting on a couple of papers?'" },
      "left": { "text": { "ru": "Разобрать пару строк", "en": "Read a couple of lines" }, "effects": { "suspicion": 13, "respect": -8, "health": 6 }, "reply": { "ru": "Прочитал скучный список инвентаря. Но выходил ты из его кабинета при свидетелях.", "en": "You read out a dull inventory list. But you left his office in full view." } },
      "right": { "text": { "ru": "«Я плохо вижу»", "en": "'My eyes are bad'" }, "effects": { "suspicion": -10, "respect": 9, "health": -7 }, "reply": { "ru": "Кум улыбнулся и записал что-то себе. Коридор одобрительно закивал.", "en": "He smiled and jotted something down. The corridor nodded in approval." } }
    },
    {
      "id": "b6_09", "who": "sokamernik", "place": "cell", "block": 6,
      "text": { "ru": "«Слух: в библиотеке в словаре кто-то держит заначку конфет», — шепчет сосед. — «Проверим?»", "en": "'Rumour has it someone stashes sweets inside a dictionary in the library,' your cellmate whispers. 'Shall we check?'" },
      "left": { "text": { "ru": "Идём проверять", "en": "Let's go check" }, "effects": { "respect": 10, "suspicion": 11, "health": -6 }, "next": "b6_10", "reply": { "ru": "Перетряхнули три словаря. Нашли крошки и очень злого библиотекаря.", "en": "You shook out three dictionaries. Found crumbs and one furious librarian." } },
      "right": { "text": { "ru": "«Это байка»", "en": "'That's a myth'" }, "effects": { "respect": -8, "suspicion": -9, "health": 7 }, "reply": { "ru": "Сосед сходил один и вернулся ни с чем. Ты выспался.", "en": "He went alone and came back empty. You got some sleep." } }
    },
    {
      "id": "b6_10", "who": "bibliotekar", "place": "library", "block": 6,
      "text": { "ru": "«Словари не для этого», — библиотекарь ставит книгу на место. — «Убирать будете вы. Или объясняться».", "en": "'Dictionaries aren't for that,' the librarian reshelves the book. 'You'll tidy up. Or explain yourselves.'" },
      "left": { "text": { "ru": "Убрать всё самим", "en": "Tidy it ourselves" }, "effects": { "suspicion": -12, "health": -8, "respect": -6 }, "reply": { "ru": "Полки блестят, поясница нет. Библиотекарь снял вопрос.", "en": "The shelves gleam, your back doesn't. The librarian dropped it." } },
      "right": { "text": { "ru": "«Так и было»", "en": "'It was like that'" }, "effects": { "respect": 9, "suspicion": 10 }, "reply": { "ru": "Наглость сработала наполовину: тебя отпустили, но записали.", "en": "The bluff half-worked: you walked, but you got noted." } }
    },
    {
      "id": "b6_11", "who": "prapor", "place": "library", "block": 6,
      "text": { "ru": "«Мне нужен человек с почерком — заполнить сорок карточек. Оплата: две тетради», — прапор кладёт ручку.", "en": "'I need someone with decent handwriting — forty cards to fill. Pay: two notebooks,' the quartermaster sets down a pen." },
      "left": { "text": { "ru": "Беру как есть", "en": "I'll take it as is" }, "effects": { "respect": 7, "health": -10, "suspicion": -6 }, "reply": { "ru": "Сорок карточек, две тетради, одна мозоль. Тетради ушли влёт.", "en": "Forty cards, two notebooks, one blister. The notebooks sold out fast." } },
      "right": { "text": { "ru": "«Это дёшево»", "en": "'That's too cheap'" }, "effects": { "respect": 11, "suspicion": 9, "health": -6 }, "reply": { "ru": "Торговался до четырёх тетрадей. Прапор запомнил тебя как «этого наглого».", "en": "You haggled up to four. He'll remember you as 'that cheeky one'." } }
    },
    {
      "id": "b6_12", "who": "novichok", "place": "library", "block": 6,
      "text": { "ru": "«А так можно было?» — новенький нашёл в книге чужое недописанное письмо домой.", "en": "'Wait, is that allowed?' The new guy found someone's unfinished letter home tucked in a book." },
      "left": { "text": { "ru": "Найти автора", "en": "Find the author" }, "effects": { "respect": 11, "suspicion": 9, "health": -6 }, "next": "b6_13", "reply": { "ru": "Обошли полбарака с вопросами. Кто-то уже интересуется, зачем.", "en": "You canvassed half the block. Someone's already asking why." } },
      "right": { "text": { "ru": "Вернуть в книгу", "en": "Put it back" }, "effects": { "suspicion": -10, "respect": -7 }, "reply": { "ru": "Закрыли книгу и поставили на полку. Чужое письмо — чужое дело.", "en": "You closed the book and shelved it. Someone else's letter, someone else's business." } }
    },
    {
      "id": "b6_13", "who": "starik", "place": "library", "block": 6,
      "text": { "ru": "«Моё письмо», — старик забирает лист. — «Не дописал. Слов не хватает. Поможешь подобрать?»", "en": "'That's mine,' the old man takes the sheet. 'Never finished it. Ran out of words. Help me find some?'" },
      "left": { "text": { "ru": "Подобрать слова", "en": "Help find the words" }, "effects": { "respect": 9, "suspicion": -8, "health": -7 }, "reply": { "ru": "До поверки сидели над одним абзацем. Абзац вышел хороший.", "en": "You spent the time till roll call on one paragraph. It turned out good." } },
      "right": { "text": { "ru": "«Сам, дед»", "en": "'On your own, gramps'" }, "effects": { "respect": -11, "suspicion": -6, "health": 7 }, "reply": { "ru": "Старик кивнул и дописал сам. Кажется, короче, чем хотел.", "en": "He nodded and finished it himself. Shorter than he'd planned, it seemed." } }
    },
    {
      "id": "b6_14", "who": "bibliotekar", "place": "library", "block": 6,
      "text": { "ru": "«Книга просрочена на полгода», — библиотекарь показывает формуляр. — «Держатель — Баклан. Заберёшь?»", "en": "'This book's six months overdue,' the librarian shows a slip. 'It's with Baklan. Fetch it?'" },
      "left": { "text": { "ru": "Идти забирать", "en": "Go get it" }, "effects": { "respect": 12, "health": -9, "suspicion": 7 }, "reply": { "ru": "Книгу отдали с ворчанием и десятиминутной лекцией о наглости. Формуляр закрыт.", "en": "You got the book, plus grumbling and a ten-minute lecture on cheek. Slip closed." } },
      "right": { "text": { "ru": "«Сами просите»", "en": "'Ask him yourself'" }, "effects": { "respect": -9, "suspicion": -8, "health": 6 }, "reply": { "ru": "Библиотекарь вздохнул и вписал книгу в утраченные. Нервы целы.", "en": "The librarian sighed and marked it lost. Your nerves are intact." } }
    },
    {
      "id": "b6_15", "who": "kum", "place": "corridor", "block": 6,
      "text": { "ru": "«Слышал, у тебя талант к бумагам. Хочешь тёплое место в канцелярии?» — кум держит дверь открытой.", "en": "'Heard you have a talent for paperwork. Want a cushy spot in the office?' The officer holds the door open." },
      "left": { "text": { "ru": "«Подумаю»", "en": "'I'll think it over'" }, "effects": { "suspicion": 10, "respect": -7, "health": 7 }, "reply": { "ru": "Ни да, ни нет. Кум доволен — он умеет ждать.", "en": "Neither yes nor no. He's pleased — he's good at waiting." } },
      "right": { "text": { "ru": "«Мне и тут тепло»", "en": "'I'm warm enough here'" }, "effects": { "respect": 11, "suspicion": -9, "health": -9 }, "reply": { "ru": "Отказался громко, чтобы слышал коридор. Зато распределили на холодный склад.", "en": "You refused loudly so the whole corridor heard. Then got assigned to the freezing storeroom." } }
    },
    {
      "id": "b6_16", "who": "prapor", "place": "corridor", "block": 6,
      "text": { "ru": "«Нужна справка о переводе на другую работу. Форму заполнить умеешь?» — прапор мнётся у стенда.", "en": "'I need a work transfer slip. Know how to fill in the form?' The quartermaster shifts by the noticeboard." },
      "left": { "text": { "ru": "Заполнить по форме", "en": "Fill it in properly" }, "effects": { "suspicion": -9, "respect": 6, "health": -6 }, "next": "b6_17", "reply": { "ru": "Всё по графам, ни помарки. Прапор посмотрел на тебя новыми глазами.", "en": "Every box neat, not one smudge. He looked at you with new eyes." } },
      "right": { "text": { "ru": "«Не моё дело»", "en": "'Not my business'" }, "effects": { "respect": -8, "suspicion": -7, "health": 8 }, "reply": { "ru": "Прапор ушёл искать другого. Ты сохранил вечер и незаметность.", "en": "He went off to find someone else. You kept your evening and your low profile." } }
    },
    {
      "id": "b6_17", "who": "prapor", "place": "corridor", "block": 6,
      "text": { "ru": "«Слушай, а ещё три таких заполнишь? Только фамилии я сам впишу», — он придвигает стопку бланков.", "en": "'Say, could you do three more? I'll fill in the names myself,' he nudges over a stack of blanks." },
      "left": { "text": { "ru": "Заполнить всё", "en": "Do all three" }, "effects": { "respect": 10, "suspicion": 13, "health": -6 }, "next": "b6_18", "reply": { "ru": "Три бланка ушли к нему в карман. Что-то тут не по описи.", "en": "Three forms went straight into his pocket. Something here is off the ledger." } },
      "right": { "text": { "ru": "«Только с фамилиями»", "en": "'Only with the names in'" }, "effects": { "suspicion": -11, "respect": -8 }, "reply": { "ru": "Прапор поморщился и забрал пустые бланки. Осадок остался у обоих.", "en": "He winced and took the blanks back. Both of you felt the sting." } }
    },
    {
      "id": "b6_18", "who": "bibliotekar", "place": "library", "block": 6,
      "text": { "ru": "«У прапора вдруг завелись лишние бланки», — тихо говорит библиотекарь. — «Твой почерк, между прочим».", "en": "'The quartermaster suddenly has spare forms,' the librarian says softly. 'Your handwriting, by the way.'" },
      "left": { "text": { "ru": "Признать честно", "en": "Own up" }, "effects": { "suspicion": -12, "respect": -7, "health": 6 }, "reply": { "ru": "Сознался первым — и тем самым закрыл тему. Скучно, зато спокойно.", "en": "You confessed first and killed the topic. Boring, but calm." } },
      "right": { "text": { "ru": "«Почерк типовой»", "en": "'It's standard handwriting'" }, "effects": { "respect": 9, "suspicion": 11 }, "reply": { "ru": "Отбился формулировкой. Библиотекарь теперь сверяет твои буквы с полками.", "en": "You dodged with wording. Now the librarian compares your letters to the shelves." } }
    },
    {
      "id": "b6_19", "who": "sokamernik", "place": "cell", "block": 6,
      "text": { "ru": "«Слух пошёл, что нас всех переводят в другой корпус!» — сосед машет бумажкой без печати.", "en": "'Word is we're all being moved to another wing!' Your cellmate waves an unstamped scrap of paper." },
      "left": { "text": { "ru": "Разнести слух", "en": "Spread the word" }, "effects": { "respect": 11, "suspicion": 10, "health": -6 }, "reply": { "ru": "К вечеру барак собирал вещи. Перевода не было, зато все убрались.", "en": "By evening the whole block was packing. No transfer, but everyone tidied up." } },
      "right": { "text": { "ru": "Проверить печать", "en": "Check for a stamp" }, "effects": { "suspicion": -9, "respect": -7, "health": 7 }, "reply": { "ru": "Печати нет — бумажка пустая. Ты скучный и, к сожалению, прав.", "en": "No stamp — the paper's worthless. You're boring and, sadly, right." } }
    },
    {
      "id": "b6_20", "who": "bibliotekar", "place": "library", "block": 6,
      "text": { "ru": "«Кто-то вырывает страницы и складывает из них голубей», — библиотекарь кладёт на стол книгу без последней главы.", "en": "'Someone's tearing out pages and folding them into paper birds,' the librarian sets down a book missing its last chapter." },
      "left": { "text": { "ru": "Устроить дежурство", "en": "Set up a watch" }, "effects": { "respect": 8, "suspicion": 9, "health": -7 }, "reply": { "ru": "Две ночи караула. Виновника не поймал, но страницы перестали пропадать.", "en": "Two nights on watch. Never caught anyone, but the pages stopped vanishing." } },
      "right": { "text": { "ru": "«Допишу от руки»", "en": "'I'll rewrite it'" }, "effects": { "respect": -6, "suspicion": -10, "health": -8 }, "reply": { "ru": "Придумал финал сам. Читатели спорят, какой лучше — оригинал не помнит никто.", "en": "You invented the ending yourself. Readers argue which is better; nobody recalls the original." } }
    },
    {
      "id": "b6_21", "who": "novichok", "place": "cell", "block": 6,
      "text": { "ru": "«Мне из дома написали, а я читать при всех стесняюсь», — новенький прячет конверт под подушку.", "en": "'I got a letter from home but I'm shy about reading it in front of everyone,' the new guy hides the envelope under his pillow." },
      "left": { "text": { "ru": "Разогнать всех", "en": "Clear the room" }, "effects": { "respect": 10, "suspicion": 8, "health": -6 }, "reply": { "ru": "Выпроводил соседей на десять минут. Ворчали, но ушли.", "en": "You shooed everyone out for ten minutes. They grumbled, but they went." } },
      "right": { "text": { "ru": "«Читай вслух»", "en": "'Read it aloud'" }, "effects": { "respect": -8, "suspicion": -7, "health": 7 }, "reply": { "ru": "Прочитал вслух, барак растрогался. Новенький красный, но живой.", "en": "He read it out and the block went soft. The kid's red-faced but fine." } }
    },
    {
      "id": "b6_22", "who": "avtoritet", "place": "cell", "block": 6,
      "text": { "ru": "«Здесь решаю я. Перепиши график дежурств набело — и себя поставь, куда хочешь», — старший по бараку двигает мятый листок.", "en": "'I run things here. Copy out the chore rota neatly — and put yourself wherever you like,' the block elder slides over a crumpled sheet." },
      "left": { "text": { "ru": "Поставить себя удобно", "en": "Give yourself an easy slot" }, "effects": { "respect": 13, "suspicion": 9, "health": -9 }, "reply": { "ru": "Себе — воскресенье, остальным — как вышло. Полбарака теперь читает график очень внимательно.", "en": "Sunday for you, whatever's left for the rest. Half the block now reads that rota very carefully." } },
      "right": { "text": { "ru": "Переписать честно", "en": "Copy it out honestly" }, "effects": { "respect": -10, "suspicion": -8, "health": 8 }, "reply": { "ru": "Всё по-старому, только буквы ровнее. Никто не в обиде и никто не впечатлён.", "en": "Same rota, neater letters. Nobody's upset and nobody's impressed." } }
    },
    {
      "id": "b6_23", "who": "starik", "place": "library", "block": 6,
      "text": { "ru": "«Я тебе одну книгу отложил», — старик достаёт том с закладками. — «Только верни, я её сорок лет храню».", "en": "'I set a book aside for you,' the old man produces a bookmarked volume. 'Just bring it back — I've kept it forty years.'" },
      "left": { "text": { "ru": "Взять и беречь", "en": "Take it and guard it" }, "effects": { "respect": 8, "suspicion": -7, "health": -6 }, "reply": { "ru": "Спал с книгой под подушкой, чтоб не пропала. Шея потом не разгибалась.", "en": "Slept with it under your pillow so it wouldn't vanish. Your neck paid for it." } },
      "right": { "text": { "ru": "«Держите у себя»", "en": "'You keep it'" }, "effects": { "respect": -9, "suspicion": -6, "health": 8 }, "reply": { "ru": "Старик убрал том обратно. Читал ты в этот вечер стену.", "en": "He put the volume back. That evening you read the wall instead." } }
    },
    {
      "id": "b6_24", "who": "kum", "place": "library", "block": 6,
      "text": { "ru": "«Тут у вас читают, разговаривают… О чём хоть говорят?» — кум листает журнал выдачи.", "en": "'People read here, chat here… What do they even talk about?' The officer thumbs through the lending log." },
      "left": { "text": { "ru": "«О книгах»", "en": "'About books'" }, "effects": { "respect": 7, "suspicion": -9, "health": -6 }, "reply": { "ru": "Ответ ровно ни о чём. Кум оценил и полчаса сверлил тебя взглядом.", "en": "An answer about precisely nothing. He appreciated it and stared you down for half an hour." } },
      "right": { "text": { "ru": "Пересказать сюжет", "en": "Retell a plot" }, "effects": { "suspicion": 11, "respect": -6, "health": 9 }, "reply": { "ru": "Двадцать минут про приключенческий роман, сидя на тёплой батарее. Кум слушал и всё равно что-то записал.", "en": "Twenty minutes on an adventure novel, perched on a warm radiator. He listened and still wrote something down." } }
    },
    {
      "id": "b6_25", "who": "bibliotekar", "place": "library", "block": 6,
      "text": { "ru": "«Объявляю читательский вечер. Нужен человек читать вслух», — библиотекарь оглядывает пустой зал.", "en": "'I'm holding a reading night. I need someone to read aloud,' the librarian scans the empty room." },
      "left": { "text": { "ru": "Читать вслух", "en": "Read aloud" }, "effects": { "respect": 12, "suspicion": 8, "health": -7 }, "next": "b6_26", "reply": { "ru": "Голос сорвал, но зал не разошёлся до отбоя. Успех!", "en": "You lost your voice, but nobody left before lights-out. A hit!" } },
      "right": { "text": { "ru": "Расставить стулья", "en": "Set out the chairs" }, "effects": { "respect": -7, "suspicion": -9, "health": -6 }, "reply": { "ru": "Стулья ровные, читал кто-то другой. Тебя никто не заметил.", "en": "Chairs in neat rows, someone else did the reading. Nobody noticed you at all." } }
    },
    {
      "id": "b6_26", "who": "prapor", "place": "library", "block": 6,
      "text": { "ru": "«Что за сборище без бумаги от начальства?» — прапор стоит в дверях с журналом.", "en": "'What's this gathering without written approval?' The quartermaster stands in the doorway with his log." },
      "left": { "text": { "ru": "Оформить задним числом", "en": "Backdate the paperwork" }, "effects": { "respect": 11, "suspicion": 12 }, "reply": { "ru": "Заявку написали и подсунули в стопку. Вечер спасён, бумага живёт своей жизнью.", "en": "You wrote a request and slid it into the pile. Evening saved; that paper now lives its own life." } },
      "right": { "text": { "ru": "Разойтись мирно", "en": "Break it up quietly" }, "effects": { "respect": -9, "suspicion": -11, "health": 6 }, "reply": { "ru": "Разошлись без спора. Прапор даже похвалил — и никто не рад.", "en": "Everyone left without arguing. He even praised you — and nobody's happy about it." } }
    },
    {
      "id": "b6_27", "who": "sokamernik", "place": "library", "block": 6,
      "text": { "ru": "«Смотри, тут в конце книги чей-то дневник вписан от руки!» — сосед тычет в мелкий почерк.", "en": "'Look, someone's written a diary in the back of this book!' Your cellmate jabs at the tiny handwriting." },
      "left": { "text": { "ru": "Прочитать до конца", "en": "Read it all" }, "effects": { "suspicion": 10, "respect": 8, "health": -6 }, "reply": { "ru": "Дочитали до последней строчки. Половина — жалобы на кашу, но интересно.", "en": "You read it to the last line. Half of it is complaints about porridge, but gripping." } },
      "right": { "text": { "ru": "Закрыть книгу", "en": "Close the book" }, "effects": { "suspicion": -9, "respect": -8, "health": 7 }, "reply": { "ru": "Захлопнул и поставил на полку. Чужие мысли пусть лежат чужими.", "en": "You snapped it shut and shelved it. Let other people's thoughts stay theirs." } }
    },
    {
      "id": "b6_28", "who": "novichok", "place": "corridor", "block": 6,
      "text": { "ru": "«Мне сказали, справку надо подписать у трёх человек. Я нашёл двух и заблудился», — новенький почти плачет.", "en": "'They said I need three signatures. I found two and then got lost,' the new guy is close to tears." },
      "left": { "text": { "ru": "Провести по этажам", "en": "Walk him around" }, "effects": { "respect": 9, "suspicion": 8, "health": -7 }, "reply": { "ru": "Обошли три этажа, подпись добыли. Ноги гудят, зато парень должен.", "en": "Three floors later, signature acquired. Your legs ache, but the kid owes you." } },
      "right": { "text": { "ru": "Объяснить на пальцах", "en": "Just explain it" }, "effects": { "respect": -6, "suspicion": -10, "health": 8 }, "reply": { "ru": "Нарисовал схему на салфетке. Дошёл сам, но дважды не туда.", "en": "You sketched a map on a napkin. He got there — after two wrong turns." } }
    },
    {
      "id": "b7_01", "who": "starik", "place": "laundry", "block": 7,
      "text": { "ru": "«Пар — он правду вытягивает», — щурится старик у барабана. «Постоишь смену — сам всё поймёшь».", "en": "'Steam pulls the truth out of people,' the old man squints by the drum. 'Work one shift and you'll see.'" },
      "left": { "text": { "ru": "Встать на смену", "en": "Take the shift" }, "effects": { "respect": 10, "health": -8 }, "reply": { "ru": "Четыре часа в духоте — рубаха как тряпка, зато свои кивают.", "en": "Four hours in the heat — shirt soaked, but the guys nod at you now." } },
      "right": { "text": { "ru": "Найти дело полегче", "en": "Find easier work" }, "effects": { "respect": -8, "health": 8 }, "reply": { "ru": "Подмёл сухой коридор. Дышится отлично, уважения ноль.", "en": "Swept a dry hallway. Great air, zero respect." } }
    },
    {
      "id": "b7_02", "who": "baklan", "place": "laundry", "block": 7,
      "text": { "ru": "«Спорим, я закину мешок белья через всю прачечную?» — Баклан уже раскручивает узел.", "en": "'Bet I can toss this laundry sack across the whole room,' Baklan says, already winding up." },
      "left": { "text": { "ru": "Подначить", "en": "Egg him on" }, "effects": { "respect": 8, "suspicion": 10 }, "reply": { "ru": "Мешок улетел в вентилятор. Снег из простыней, вертухай в дверях.", "en": "The sack hit the fan. Sheet blizzard, guard in the doorway." } },
      "right": { "text": { "ru": "Отобрать мешок", "en": "Take the sack" }, "effects": { "respect": -6, "suspicion": -8 }, "reply": { "ru": "Отнял и положил в тележку. Баклан обиделся на весь белый свет.", "en": "Took it and dropped it in the cart. Baklan sulked at the entire universe." } }
    },
    {
      "id": "b7_03", "who": "sokamernik", "place": "laundry", "block": 7,
      "text": { "ru": "«Смотри», — сокамерник показывает ящик. «Триста носков, и ни одной пары. Это же биржа!»", "en": "'Look,' your cellmate shows you a bin. 'Three hundred socks, not one matching pair. That's a market!'" },
      "left": { "text": { "ru": "Открываем биржу", "en": "Open the market" }, "effects": { "respect": 12, "suspicion": 10 }, "next": "b7_04", "reply": { "ru": "Повесили табличку «Обмен носками». Очередь выстроилась мгновенно.", "en": "Hung up a 'Sock Exchange' sign. The queue formed instantly." } },
      "right": { "text": { "ru": "Просто разобрать", "en": "Just sort them" }, "effects": { "health": -6, "suspicion": -8 }, "reply": { "ru": "Час перебирал носки в тишине. Спина ноет, зато к тебе никаких вопросов.", "en": "An hour sorting socks in silence. Sore back, but nobody has questions about you." } }
    },
    {
      "id": "b7_04", "who": "novichok", "place": "laundry", "block": 7,
      "text": { "ru": "«А если я принесу три левых — дадут один правый?» — новенький держит очередь на месте.", "en": "'So if I bring three lefts, do I get one right?' The new guy is holding up the entire line." },
      "left": { "text": { "ru": "Ввести курс", "en": "Set the rate" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Объявил курс: три левых к одному правому. Прачечная зауважала.", "en": "Announced the rate: three lefts for one right. The laundry bowed." } },
      "right": { "text": { "ru": "Закрыть лавочку", "en": "Shut it down" }, "effects": { "respect": -8, "suspicion": -10 }, "reply": { "ru": "Свернул табличку до прихода начальства. Скучно, но тихо.", "en": "Rolled up the sign before the brass showed up. Boring, but quiet." } }
    },
    {
      "id": "b7_05", "who": "vertuhai", "place": "laundry", "block": 7,
      "text": { "ru": "«Почему пар из-под двери валит?» — вертухай стучит по косяку. «Не положено, чтобы парило!»", "en": "'Why is steam pouring under this door?' the guard raps on the frame. 'Steam is not permitted!'" },
      "left": { "text": { "ru": "Свалить на трубу", "en": "Blame the pipe" }, "effects": { "suspicion": 10, "respect": 8 }, "reply": { "ru": "«Труба старая, гражданин начальник». Он ушёл искать трубу.", "en": "'Old pipe, boss.' He wandered off to go find the pipe." } },
      "right": { "text": { "ru": "Приоткрыть окно", "en": "Crack the window" }, "effects": { "suspicion": -8, "health": -6 }, "reply": { "ru": "Пар вышел, сквозняк вошёл. К вечеру голос сел.", "en": "Steam out, draft in. By evening your voice was gone." } }
    },
    {
      "id": "b7_06", "who": "prapor", "place": "laundry", "block": 7,
      "text": { "ru": "«По описи двести наволочек, по факту сто девяносто одна», — прапор постукивает карандашом.", "en": "'Inventory says two hundred pillowcases. I count a hundred ninety-one,' the quartermaster taps his pencil." },
      "left": { "text": { "ru": "Помочь пересчитать", "en": "Help him recount" }, "effects": { "suspicion": -10, "respect": -6 }, "next": "b7_07", "reply": { "ru": "Пересчитали дважды. Девять так и не нашлись, зато прапор подобрел.", "en": "Counted twice. Nine still missing, but the quartermaster warmed up to you." } },
      "right": { "text": { "ru": "Сказать: округли", "en": "Say: round it up" }, "effects": { "respect": 10, "suspicion": 12 }, "next": "b7_07", "reply": { "ru": "«Пишите двести». Он записал. Рука дрогнула, но записал.", "en": "'Write two hundred.' He wrote it. His hand shook, but he wrote it." } }
    },
    {
      "id": "b7_07", "who": "kot", "place": "laundry", "block": 7,
      "text": { "ru": "Кот вылезает из-за сушилки. Под ним — гнездо ровно из девяти наволочек.", "en": "The cat crawls out from behind the dryer. Under him: a nest of exactly nine pillowcases." },
      "left": { "text": { "ru": "Сдать наволочки", "en": "Hand the linen in" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "Опись сошлась до штуки. Кот смотрел на тебя как на предателя рода кошачьего.", "en": "The count balanced to the last item. The cat looked at you like a traitor to all catkind." } },
      "right": { "text": { "ru": "Не трогать кота", "en": "Leave the cat be" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Оставил как есть. По прачечной пошёл слух: ты за кота.", "en": "Left it alone. Word went round the laundry: you're on the cat's side." } }
    },
    {
      "id": "b7_08", "who": "starik", "place": "laundry", "block": 7,
      "text": { "ru": "«Этот кот тут дольше нас всех», — старик кивает на пушистый ком в сухом белье. «Гоняем или пусть спит?»", "en": "'That cat's been here longer than any of us,' the old man nods at the fluffy lump in the clean linen. 'Chase him out, or let him sleep?'" },
      "left": { "text": { "ru": "Выставить за дверь", "en": "Put him outside" }, "effects": { "suspicion": -12, "respect": -10 }, "reply": { "ru": "Вынес кота в коридор. Бельё чистое, а вся смена ворчит про тебя до вечера.", "en": "Carried the cat into the hall. Clean linen, and the whole shift grumbled about you till night." } },
      "right": { "text": { "ru": "Пусть спит", "en": "Let him sleep" }, "effects": { "respect": 12, "suspicion": 10 }, "reply": { "ru": "Накрыл его простынёй. Теперь ты соучастник самого пушистого беспорядка в корпусе.", "en": "Tucked a sheet over him. Now you're an accomplice to the fluffiest mess in the building." } }
    },
    {
      "id": "b7_09", "who": "novichok", "place": "laundry", "block": 7,
      "text": { "ru": "«Я закинул одеяло в стирку с мылом для пола», — шепчет новенький. «Пена уже до колен».", "en": "'I washed a blanket with floor soap,' the new guy whispers. 'The foam's knee-deep already.'" },
      "left": { "text": { "ru": "Спасать вместе", "en": "Bail him out" }, "effects": { "health": -8, "respect": 10 }, "next": "b7_10", "reply": { "ru": "Черпали пену вёдрами. Мокрые по пояс, зато новенький теперь твой.", "en": "Bailed foam by the bucket. Soaked to the waist, but the kid's yours now." } },
      "right": { "text": { "ru": "Отойти в сторону", "en": "Step aside" }, "effects": { "respect": -10, "suspicion": -6 }, "next": "b7_10", "reply": { "ru": "Стоял сухой у стены. Пена дошла до коридора без тебя.", "en": "Stayed dry by the wall. The foam reached the hallway without you." } }
    },
    {
      "id": "b7_10", "who": "baklan", "place": "corridor", "block": 7,
      "text": { "ru": "«Моя рубаха посерела!» — Баклан трясёт тряпкой у тебя перед носом. «Твоя смена стирала!»", "en": "'My shirt went grey!' Baklan waves the rag in your face. 'Your shift washed it!'" },
      "left": { "text": { "ru": "Стоять на своём", "en": "Hold your ground" }, "effects": { "respect": 12, "health": -8 }, "reply": { "ru": "«Она у тебя серой пришла». Пихнул плечом и ушёл ворча.", "en": "'It came in grey.' He shoulder-checked you and stomped off muttering." } },
      "right": { "text": { "ru": "Перестирать молча", "en": "Rewash it quietly" }, "effects": { "respect": -8, "suspicion": -8 }, "reply": { "ru": "Перестирал. Она посерела ещё сильнее, но крик утих.", "en": "Rewashed it. Even greyer now, but the shouting stopped." } }
    },
    {
      "id": "b7_11", "who": "sokamernik", "place": "laundry", "block": 7,
      "text": { "ru": "«Кто стирает — тот всё знает», — сокамерник кивает на тележку. «В карманах чужих штанов целая летопись».", "en": "'Whoever does the wash knows everything,' your cellmate nods at the cart. 'Other people's pockets are a whole chronicle.'" },
      "left": { "text": { "ru": "Проверить карманы", "en": "Check the pockets" }, "effects": { "suspicion": 12, "respect": 10 }, "next": "b7_12", "reply": { "ru": "Нашёл огрызок карандаша, три пуговицы и записку «мама, я нормально ем». Богатый улов.", "en": "Found a pencil stub, three buttons and a note reading 'Mum, I'm eating fine.' Rich haul." } },
      "right": { "text": { "ru": "Стирать не глядя", "en": "Wash without looking" }, "effects": { "suspicion": -10, "respect": -6 }, "next": "b7_12", "reply": { "ru": "Загрузил как есть. Чья-то тайна ушла в барабан навсегда.", "en": "Loaded it all in. Somebody's secret went round the drum forever." } }
    },
    {
      "id": "b7_12", "who": "vertuhai", "place": "laundry", "block": 7,
      "text": { "ru": "«Из машины бумажка вылезла», — вертухай разглядывает мокрый клочок. «Чьё это тут плавает?»", "en": "'A scrap came out of the machine,' the guard studies the soggy paper. 'Whose is this floating around?'" },
      "left": { "text": { "ru": "Сказать: мой список", "en": "Say it's your list" }, "effects": { "suspicion": 10, "respect": 12 }, "reply": { "ru": "«Список носков, гражданин начальник». Он читал его минуту и сдался.", "en": "'Sock list, boss.' He read it for a solid minute and gave up." } },
      "right": { "text": { "ru": "Развести руками", "en": "Play dumb" }, "effects": { "respect": -10, "suspicion": -8 }, "reply": { "ru": "Пожал плечами. Бумажку унесли, зато к тебе вопросов нет.", "en": "Shrugged. They took the scrap away, and nobody's asking you anything." } }
    },
    {
      "id": "b7_13", "who": "kot", "place": "laundry", "block": 7,
      "text": { "ru": "Кот запрыгнул в тёплую сушилку и уснул. Дверцу вот-вот захлопнут.", "en": "The cat has curled up inside the warm dryer. Someone's about to slam the door." },
      "left": { "text": { "ru": "Лезть за котом", "en": "Reach in for him" }, "effects": { "health": -6, "respect": 10 }, "reply": { "ru": "Вытащил. Кот исцарапал руку и ушёл с видом обиженного начальства.", "en": "Pulled him out. He clawed your arm and stalked off like offended management." } },
      "right": { "text": { "ru": "Крикнуть смене", "en": "Yell to the shift" }, "effects": { "respect": -6, "suspicion": -6 }, "reply": { "ru": "Крикнул — машину не включили. Кот доспал своё, ты остался целым.", "en": "You yelled, nobody hit the switch. The cat finished his nap, you kept your skin." } }
    },
    {
      "id": "b7_14", "who": "prapor", "place": "corridor", "block": 7,
      "text": { "ru": "«Мне нужен человек в прачечную на постоянку», — прапор смотрит поверх описи. «Место тёплое. Во всех смыслах».", "en": "'I need a permanent man in the laundry,' the quartermaster says over his clipboard. 'Warm spot. In every sense.'" },
      "left": { "text": { "ru": "Согласиться", "en": "Take the post" }, "effects": { "respect": 10, "suspicion": 10 }, "next": "b7_15", "reply": { "ru": "Получил ключ от бельевой. И сорок глаз, следящих, что ты с ним делаешь.", "en": "Got the linen-room key. And forty eyes watching what you do with it." } },
      "right": { "text": { "ru": "Взять паузу", "en": "Ask for time" }, "effects": { "respect": -8, "suspicion": -8 }, "next": "b7_15", "reply": { "ru": "«Подумаю». Прапор кивнул: думай, но не до пенсии.", "en": "'I'll think about it.' He nodded: think, but not until retirement." } }
    },
    {
      "id": "b7_15", "who": "starik", "place": "laundry", "block": 7,
      "text": { "ru": "«Ключ от бельевой — не подарок, а привязь», — старик мешает бельё шестом. «Слушать будешь или сам умный?»", "en": "'That linen-room key is no gift, it's a leash,' the old man stirs the wash with a pole. 'Want the wisdom, or are you clever already?'" },
      "left": { "text": { "ru": "Слушать старика", "en": "Hear him out" }, "effects": { "suspicion": -10, "respect": 8 }, "reply": { "ru": "Сел рядом на скамью. Узнал, кто в прачечной чего стоит.", "en": "Sat down on the bench beside him. Learned who's worth what in this room." } },
      "right": { "text": { "ru": "Отмахнуться", "en": "Wave him off" }, "effects": { "respect": 8, "suspicion": 10 }, "reply": { "ru": "«Сам разберусь». Смена одобрительно хмыкнула, старик замолчал на два дня.", "en": "'I'll manage.' The shift grunted approval; the old man went quiet for two days." } }
    },
    {
      "id": "b7_16", "who": "vertuhai", "place": "corridor", "block": 7,
      "text": { "ru": "«Тележку с бельём везёшь? Открывай», — вертухай кивает на гору простыней.", "en": "'Pushing the linen cart? Open it up,' the guard nods at the mound of sheets." },
      "left": { "text": { "ru": "Откинуть всё сразу", "en": "Flip it all open" }, "effects": { "suspicion": -12, "respect": -6 }, "reply": { "ru": "Вывалил бельё на пол. Чисто, но собирать пришлось одному.", "en": "Dumped the linen on the floor. All clear, but you repacked it alone." } },
      "right": { "text": { "ru": "Приподнять край", "en": "Lift one corner" }, "effects": { "suspicion": 10, "respect": 8 }, "reply": { "ru": "Показал уголок и покатил дальше. Он долго смотрел в спину.", "en": "Showed a corner and rolled on. He watched your back a long time." } }
    },
    {
      "id": "b7_17", "who": "novichok", "place": "laundry", "block": 7,
      "text": { "ru": "«У меня руки красные и чешутся», — новенький прячет ладони. «Это от порошка, да?»", "en": "'My hands are red and itchy,' the new guy hides them. 'It's the detergent, right?'" },
      "left": { "text": { "ru": "Отправить к врачу", "en": "Send him to the doc" }, "effects": { "health": 8, "respect": -8 }, "reply": { "ru": "Ушёл за мазью. Смена осталась без пары рук, и это заметили.", "en": "Off he went for ointment. The shift lost two hands, and people noticed." } },
      "right": { "text": { "ru": "Дать свои перчатки", "en": "Give him your gloves" }, "effects": { "respect": 10, "health": -8 }, "reply": { "ru": "Отдал перчатки. Теперь чешутся твои ладони, зато он смотрит как на героя.", "en": "Handed over the gloves. Now your hands itch, but he looks at you like a hero." } }
    },
    {
      "id": "b7_18", "who": "baklan", "place": "laundry", "block": 7,
      "text": { "ru": "«Я тут главный по барабанам!» — Баклан загораживает машину. «Хочешь стирать — жди до вечера».", "en": "'I run the drums around here!' Baklan blocks the machine. 'Want a wash? Wait till evening.'" },
      "left": { "text": { "ru": "Протиснуться к машине", "en": "Squeeze past him" }, "effects": { "respect": 12, "health": -10 }, "next": "b7_19", "reply": { "ru": "Влез к машине первым. Тележкой по ноге прилетело, зато бельё загрузил.", "en": "Got to the machine first. The cart rolled over your foot, but the wash went in." } },
      "right": { "text": { "ru": "Занять очередь", "en": "Take a number" }, "effects": { "respect": -10, "suspicion": -6 }, "next": "b7_19", "reply": { "ru": "Встал в хвост. Баклан довольно раздулся, как мокрая подушка.", "en": "Got in line. Baklan puffed up like a wet pillow." } }
    },
    {
      "id": "b7_19", "who": "starik", "place": "laundry", "block": 7,
      "text": { "ru": "«Никакой он не главный», — тихо говорит старик. «Просто первый пришёл и не уходит. Сказать при всех?»", "en": "'He runs nothing,' the old man says quietly. 'He just got here first and never left. Say it out loud?'" },
      "left": { "text": { "ru": "Сказать при всех", "en": "Say it out loud" }, "effects": { "respect": 10, "suspicion": 10 }, "next": "b7_20", "reply": { "ru": "Объявил на всю прачечную. Смех, а Баклан пунцовый как варёная простыня.", "en": "Announced it to the whole room. Laughter, and Baklan went red as a boiled sheet." } },
      "right": { "text": { "ru": "Промолчать", "en": "Let it go" }, "effects": { "respect": -8, "health": 8 }, "next": "b7_20", "reply": { "ru": "Промолчал. Барабаны шумели, нервы целы, авторитет — не очень.", "en": "Said nothing. The drums rumbled, nerves intact, reputation less so." } }
    },
    {
      "id": "b7_20", "who": "sokamernik", "place": "cell", "block": 7,
      "text": { "ru": "«Баклан ходит и сопит», — сокамерник трёт лоб. «Мириться пойдёшь или пусть сопит?»", "en": "'Baklan's stomping around huffing,' your cellmate rubs his forehead. 'Go make peace, or let him huff?'" },
      "left": { "text": { "ru": "Пойти мириться", "en": "Go make peace" }, "effects": { "respect": -6, "suspicion": -10 }, "reply": { "ru": "Пожали руки у сушилки. Скучный мир, зато никто не караулит в углу.", "en": "Shook hands by the dryer. Dull peace, but nobody's lurking in corners." } },
      "right": { "text": { "ru": "Пусть сопит", "en": "Let him huff" }, "effects": { "respect": 10, "health": -8 }, "reply": { "ru": "Не пошёл. Утром нашёл свою кружку на самой верхней полке.", "en": "Didn't go. Next morning your mug was sitting on the very top shelf." } }
    },
    {
      "id": "b7_21", "who": "prapor", "place": "laundry", "block": 7,
      "text": { "ru": "«Порошка выдано на месяц, кончился за неделю», — прапор смотрит на пустые мешки.", "en": "'A month of detergent, gone in a week,' the quartermaster stares at the empty sacks." },
      "left": { "text": { "ru": "Признать перерасход", "en": "Own the overuse" }, "effects": { "suspicion": -12, "respect": -8 }, "reply": { "ru": "«Сыпали от души, виноваты». Порошок привезли, а смена посматривает косо.", "en": "'We poured it like soup, our bad.' Detergent arrived; the crew gives you side-eye." } },
      "right": { "text": { "ru": "Сказать: мешки текут", "en": "Say the bags leak" }, "effects": { "respect": 10, "suspicion": 10 }, "reply": { "ru": "«Мешки дырявые». Прапор записал «усушка» и посмотрел долгим взглядом.", "en": "'Bags are full of holes.' He logged it as 'shrinkage' and gave you a long look." } }
    },
    {
      "id": "b7_22", "who": "vertuhai", "place": "laundry", "block": 7,
      "text": { "ru": "«Сушилка воет так, что на посту слышно», — вертухай морщится. «Чините или выключаю».", "en": "'That dryer howls loud enough to hear from the post,' the guard winces. 'Fix it or I cut the power.'" },
      "left": { "text": { "ru": "Чинить самим", "en": "Fix it yourselves" }, "effects": { "respect": 10, "health": -8 }, "next": "b7_23", "reply": { "ru": "Подтянули барабан ложкой и ремнём. Воет тише, палец в синяках.", "en": "Tightened the drum with a spoon and a belt. Quieter howl, bruised finger." } },
      "right": { "text": { "ru": "Пусть выключает", "en": "Let him cut it" }, "effects": { "respect": -10, "health": 8 }, "next": "b7_23", "reply": { "ru": "Выключил. Тишина, отдых и гора мокрых простыней до потолка.", "en": "He cut it. Silence, rest, and a ceiling-high pile of wet sheets." } }
    },
    {
      "id": "b7_23", "who": "sokamernik", "place": "laundry", "block": 7,
      "text": { "ru": "«Мокрого белья гора, а сдавать завтра», — сокамерник смотрит на потолок. «Развесим по бараку?»", "en": "'Mountain of wet linen and it's due tomorrow,' your cellmate eyes the ceiling. 'String it up around the block?'" },
      "left": { "text": { "ru": "Развесить везде", "en": "String it everywhere" }, "effects": { "respect": 12, "suspicion": 10 }, "reply": { "ru": "Барак стал похож на парусник. Утром всё сухое, вертухай в шоке.", "en": "The block looked like a tall ship. Dry by morning, the guard speechless." } },
      "right": { "text": { "ru": "Досушить по-тихому", "en": "Dry it quietly" }, "effects": { "health": -8, "suspicion": -8 }, "reply": { "ru": "Досушивали на трубах до ночи. Спина отвалилась, зато никто не заметил.", "en": "Dried it on the pipes till late. Back destroyed, but nobody noticed a thing." } }
    },
    {
      "id": "b7_24", "who": "kot", "place": "corridor", "block": 7,
      "text": { "ru": "Кот тащит по коридору чей-то носок. Хозяин носка уже идёт навстречу.", "en": "The cat drags somebody's sock down the hall. The sock's owner is walking straight at you." },
      "left": { "text": { "ru": "Отбить носок", "en": "Rescue the sock" }, "effects": { "respect": 8, "health": -6 }, "reply": { "ru": "Отобрал у кота, вернул хозяину. Кот запомнил. Царапина тоже.", "en": "Wrestled it back and handed it over. The cat remembers. So does the scratch." } },
      "right": { "text": { "ru": "Не заметить", "en": "Look away" }, "effects": { "respect": -8, "suspicion": -6 }, "reply": { "ru": "Изучал стену. Носок уехал в неизвестность, а к тебе никто не придрался.", "en": "Studied the wall. The sock vanished into legend, and nobody pinned it on you." } }
    },
    {
      "id": "b7_25", "who": "novichok", "place": "laundry", "block": 7,
      "text": { "ru": "«А правда, что кто в прачечной — тот знает всё про всех?» — громко спрашивает новенький.", "en": "'Is it true the laundry crew knows everything about everyone?' the new guy asks, loudly." },
      "left": { "text": { "ru": "Подтвердить с важным видом", "en": "Confirm it grandly" }, "effects": { "respect": 12, "suspicion": 12 }, "reply": { "ru": "«Всё до последней пуговицы». Полбарака сразу захотело дружить.", "en": "'Down to the last button.' Half the block suddenly wanted to be friends." } },
      "right": { "text": { "ru": "Сказать: слухи", "en": "Call it gossip" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "«Мы стираем, а не подслушиваем». Новенький разочарованно вздохнул.", "en": "'We wash clothes, we don't eavesdrop.' The new guy sighed, disappointed." } }
    },
    {
      "id": "b7_26", "who": "starik", "place": "laundry", "block": 7,
      "text": { "ru": "«Раньше бельё катали вручную, вот такой валик», — старик показывает ладони. «Пробовать будешь?»", "en": "'We used to press linen by hand, a roller this big,' the old man spreads his palms. 'Care to try?'" },
      "left": { "text": { "ru": "Попробовать валик", "en": "Try the roller" }, "effects": { "health": -8, "respect": 10 }, "reply": { "ru": "Прокатал десять простыней. Руки гудят, старик уважительно хмыкнул.", "en": "Pressed ten sheets. Arms buzzing, and the old man grunted approval." } },
      "right": { "text": { "ru": "Обойтись машиной", "en": "Stick to the machine" }, "effects": { "respect": -6, "health": 6 }, "reply": { "ru": "Нажал кнопку. Машина справилась, старик посмотрел на кнопку с презрением.", "en": "Pressed the button. The machine coped; the old man glared at the button." } }
    },
    {
      "id": "b7_27", "who": "baklan", "place": "laundry", "block": 7,
      "text": { "ru": "«Кто взял мою наволочку с ромашками?» — Баклан обходит смену. «Она приметная!»", "en": "'Who took my pillowcase with the daisies?' Baklan works the room. 'It's distinctive!'" },
      "left": { "text": { "ru": "Помочь искать", "en": "Help him look" }, "effects": { "respect": 8, "health": -6 }, "reply": { "ru": "Перерыли три тележки. Нашли под его же матрасом. Спасибо не сказал.", "en": "Dug through three carts. Found it under his own mattress. No thanks given." } },
      "right": { "text": { "ru": "Посмеяться", "en": "Laugh it off" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Вся смена ржала про ромашки. Баклан теперь стирает по ночам.", "en": "The whole shift howled about the daisies. Now Baklan washes at night." } }
    },
    {
      "id": "b7_28", "who": "vertuhai", "place": "laundry", "block": 7,
      "text": { "ru": "«Смена окончена, а вы всё трёте», — вертухай стучит по часам. «Расходимся или пишу рапорт?»", "en": "'Shift's over and you're still scrubbing,' the guard taps his watch. 'Clear out or I write it up.'" },
      "left": { "text": { "ru": "Домыть партию", "en": "Finish the load" }, "effects": { "respect": 10, "suspicion": 10 }, "reply": { "ru": "Домыли и вышли последними. Рапорт не написал, но фамилию запомнил.", "en": "Finished and walked out last. No report, but he memorized your name." } },
      "right": { "text": { "ru": "Уйти по часам", "en": "Leave on time" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "Ушли ровно. Партия киснет до утра, смена ворчит до вечера.", "en": "Left on the dot. The load sours till morning, the crew grumbles till night." } }
    },
    {
      "id": "b8_01", "who": "prapor", "place": "workshop", "block": 8,
      "text": { "ru": "«Наряд на работу. Тебе — либо шлифовка, либо покраска», — прапор стучит папкой по столу.", "en": "'Work assignment. Sanding or painting, your pick,' the quartermaster taps his clipboard on the desk." },
      "left": { "text": { "ru": "Иду на шлифовку", "en": "Take sanding" }, "effects": { "respect": 10, "health": -8 }, "reply": { "ru": "К обеду ты серый от пыли, зато руки уважают.", "en": "By lunch you're grey with dust, but nobody calls you soft." } },
      "right": { "text": { "ru": "Беру покраску", "en": "Take painting" }, "effects": { "respect": -7, "suspicion": -6 }, "reply": { "ru": "Красил аккуратно и тихо. Скучно, зато чисто.", "en": "Painted neat and quiet. Dull, but tidy." } }
    },
    {
      "id": "b8_02", "who": "elektrik", "place": "workshop", "block": 8,
      "text": { "ru": "«Щиток трещит, как сковородка», — электрик машет тебе отвёрткой. «Подержишь фонарь?»", "en": "'The panel's crackling like a frying pan,' the electrician waves a screwdriver at you. 'Hold the light?'" },
      "left": { "text": { "ru": "Держу фонарь", "en": "Hold the light" }, "effects": { "respect": 9, "health": -7, "suspicion": 6 }, "next": "b8_03", "reply": { "ru": "Искры сыпались красиво, брови целы. Почти.", "en": "The sparks were spectacular. Your eyebrows mostly survived." } },
      "right": { "text": { "ru": "Зову старшего", "en": "Call a supervisor" }, "effects": { "respect": -9, "suspicion": -8 }, "next": "b8_03", "reply": { "ru": "Пришёл прапор с огнетушителем и лекцией на двадцать минут.", "en": "The quartermaster showed up with an extinguisher and a twenty-minute lecture." } }
    },
    {
      "id": "b8_03", "who": "elektrik", "place": "workshop", "block": 8,
      "text": { "ru": "Свет в мастерской мигает и гаснет. «Пробки старые, — шепчет электрик. — Могу починить за минуту, а могу за час».", "en": "The workshop lights flicker and die. 'Old fuses,' the electrician whispers. 'I can fix it in a minute — or in an hour.'" },
      "left": { "text": { "ru": "Чини за минуту", "en": "Fix it fast" }, "effects": { "respect": -6, "suspicion": -9, "health": 7 }, "reply": { "ru": "Свет вернулся, смена продолжилась. Все вздохнули без восторга.", "en": "Lights back, shift back on. Everyone sighed; nobody cheered." } },
      "right": { "text": { "ru": "Пусть чинит час", "en": "Let it take an hour" }, "effects": { "respect": 12, "suspicion": 10 }, "reply": { "ru": "Час сидели в темноте и травили байки. Смена прошла как отпуск.", "en": "An hour in the dark swapping stories. Best shift of the month." } }
    },
    {
      "id": "b8_04", "who": "starik", "place": "workshop", "block": 8,
      "text": { "ru": "«Рубанок держат вот так, а не как ложку», — старик забирает у тебя инструмент.", "en": "'You hold a plane like this, not like a spoon,' the old man takes the tool out of your hands." },
      "left": { "text": { "ru": "Слушаю урок", "en": "Take the lesson" }, "effects": { "respect": 8, "health": 8, "suspicion": 7 }, "reply": { "ru": "Через полчаса стружка пошла ровная. Старик кивнул — это как медаль.", "en": "Half an hour later the shavings came off clean. He nodded — practically a medal." } },
      "right": { "text": { "ru": "Сам разберусь", "en": "I'll figure it out" }, "effects": { "respect": -6, "health": -10 }, "reply": { "ru": "Доска встала дыбом, палец встретился с занозой. Наука дорогая.", "en": "The board fought back and the splinter won. Tuition paid in full." } }
    },
    {
      "id": "b8_05", "who": "prapor", "place": "workshop", "block": 8,
      "text": { "ru": "«Всё по описи!» — прапор раскладывает инструмент по номерам. «Поможешь считать напильники?»", "en": "'Everything by the inventory!' The quartermaster lines the tools up by number. 'Help me count the files?'" },
      "left": { "text": { "ru": "Считаю честно", "en": "Count it straight" }, "effects": { "suspicion": -10, "respect": -7 }, "next": "b8_06", "reply": { "ru": "Сошлось до штуки. Прапор чуть не прослезился.", "en": "Tallied to the last one. He nearly teared up." } },
      "right": { "text": { "ru": "Считаю быстро", "en": "Count it fast" }, "effects": { "respect": 9, "suspicion": 8 }, "next": "b8_06", "reply": { "ru": "«Сорок два!» — сказал ты, не глядя. Прапор записал.", "en": "'Forty-two!' you announced without looking. He wrote it down." } }
    },
    {
      "id": "b8_06", "who": "prapor", "place": "workshop", "block": 8,
      "text": { "ru": "«Одного сверла нет, — прапор бледнеет. — Или ищем, или пишу бумагу».", "en": "'One drill bit is missing,' the quartermaster goes pale. 'We search, or I file a report.'" },
      "left": { "text": { "ru": "Перерою всё", "en": "Turn the place over" }, "effects": { "health": -8, "respect": 6, "suspicion": -7 }, "next": "b8_07", "reply": { "ru": "Сверло нашлось в мешке со стружкой. Спина — нет.", "en": "Found the bit in the sawdust bag. Your back is still missing." } },
      "right": { "text": { "ru": "Пусть пишет", "en": "Let him file it" }, "effects": { "suspicion": 12, "respect": 8 }, "next": "b8_07", "reply": { "ru": "Бумага ушла наверх. Мастерская загудела, как улей.", "en": "The paperwork went upstairs. The workshop buzzed like a hive." } }
    },
    {
      "id": "b8_07", "who": "vertuhai", "place": "workshop", "block": 8,
      "text": { "ru": "«Шмон по описи! Всем карманы вывернуть», — вертухай перекрывает выход.", "en": "'Inventory search! Pockets out, everyone,' the guard blocks the door." },
      "left": { "text": { "ru": "Выворачиваю первым", "en": "Empty pockets first" }, "effects": { "suspicion": -12, "respect": -8 }, "reply": { "ru": "Из карманов посыпались гвозди и сухарь. Вертухай махнул: проходи.", "en": "Out came nails and a stale crust. The guard waved you through." } },
      "right": { "text": { "ru": "Стою до последнего", "en": "Wait him out" }, "effects": { "respect": 11, "suspicion": 9, "health": -6 }, "reply": { "ru": "Простоял у стены полчаса из принципа. Ноги против, зато мастерская за.", "en": "Half an hour against the wall on principle. Your legs objected; the shop applauded." } }
    },
    {
      "id": "b8_08", "who": "sokamernik", "place": "workshop", "block": 8,
      "text": { "ru": "«Есть гениальный план: делаем табуретки на два гвоздя меньше», — шепчет сосед у верстака.", "en": "'Genius plan: build the stools with two fewer nails,' your cellmate whispers at the bench." },
      "left": { "text": { "ru": "Экономим гвозди", "en": "Skip the nails" }, "effects": { "respect": 9, "suspicion": 10 }, "reply": { "ru": "Норму сдали раньше всех. Табуретки скрипят как хор.", "en": "Quota done before anyone else. The stools now sing in harmony." } },
      "right": { "text": { "ru": "Делаем как надо", "en": "Build them right" }, "effects": { "respect": -6, "health": -7, "suspicion": -8 }, "reply": { "ru": "Сидели до отбоя, зато ни одна не сложилась под прапором.", "en": "Worked till lights-out, but not one folded under the quartermaster." } }
    },
    {
      "id": "b8_09", "who": "starik", "place": "workshop", "block": 8,
      "text": { "ru": "«При мне на этом станке делали шкатулки», — старик гладит старый токарник.", "en": "'In my day this lathe turned out jewellery boxes,' the old man pats the machine." },
      "left": { "text": { "ru": "Прошу научить", "en": "Ask him to teach you" }, "effects": { "respect": 10, "health": -6, "suspicion": 6 }, "next": "b8_10", "reply": { "ru": "Два часа стружки и одна кривая шкатулка. Начало положено.", "en": "Two hours of shavings and one lopsided box. It's a start." } },
      "right": { "text": { "ru": "Мне бы норму сдать", "en": "Just make quota" }, "effects": { "respect": -8, "suspicion": -6, "health": 7 }, "reply": { "ru": "Норму сдал вовремя. Старик посмотрел так, будто ты обидел станок.", "en": "Quota met on time. The old man looked like you'd insulted the lathe." } }
    },
    {
      "id": "b8_10", "who": "starik", "place": "workshop", "block": 8,
      "text": { "ru": "«Шкатулка кривая, но живая, — старик вертит её в руках. — Показать людям или в стружку?»", "en": "'Crooked, but it's alive,' the old man turns the box over in his hands. 'Show it around or toss it in the shavings?'" },
      "left": { "text": { "ru": "Показать людям", "en": "Show it around" }, "effects": { "respect": 12, "suspicion": 8 }, "reply": { "ru": "К вечеру три заказа и одна кличка «Мастер Кривые Руки». Обидно, но приятно.", "en": "By evening: three orders and the nickname 'Wonky Hands'. Half insult, half honour." } },
      "right": { "text": { "ru": "В стружку", "en": "Into the shavings" }, "effects": { "respect": -9, "suspicion": -7, "health": 6 }, "reply": { "ru": "Улики уничтожены. Совесть мастера слегка пострадала.", "en": "Evidence destroyed. Your inner craftsman winced." } }
    },
    {
      "id": "b8_11", "who": "avtoritet", "place": "workshop", "block": 8,
      "text": { "ru": "«Здесь решаю я. Твой верстак у окна теперь мой», — старший по бараку кладёт ладонь на доску.", "en": "'I call the shots here. Your bench by the window is mine now,' the block boss plants his hand on the board." },
      "left": { "text": { "ru": "Меняюсь без спора", "en": "Swap without a fuss" }, "effects": { "respect": -10, "suspicion": -6, "health": 7 }, "reply": { "ru": "Ушёл в тёмный угол. Зато никто не дышит в затылок.", "en": "Moved to the dark corner. At least nobody breathes down your neck." } },
      "right": { "text": { "ru": "Верстак мой", "en": "Bench stays mine" }, "effects": { "respect": 13, "health": -9, "suspicion": 7 }, "reply": { "ru": "Полдня переглядывались через опилки. Верстак остался за тобой.", "en": "Half a day of staring at each other across the sawdust. The bench stayed yours." } }
    },
    {
      "id": "b8_12", "who": "elektrik", "place": "workshop", "block": 8,
      "text": { "ru": "«Собрал кипятильник из двух ложек, — хвастается электрик. — Спрячешь у себя?»", "en": "'I built a water heater out of two spoons,' the electrician brags. 'Stash it for me?'" },
      "left": { "text": { "ru": "Прячу у себя", "en": "Stash it" }, "effects": { "respect": 11, "suspicion": 12 }, "reply": { "ru": "Теперь у тебя чай раньше всех и нервный тик при слове «шмон».", "en": "Now you get tea before everyone — and a twitch every time someone says 'search'." } },
      "right": { "text": { "ru": "Сам прячь", "en": "Hide it yourself" }, "effects": { "respect": -7, "suspicion": -9 }, "reply": { "ru": "Электрик обиделся на десять минут, потом забыл.", "en": "He sulked for ten minutes, then forgot about it." } }
    },
    {
      "id": "b8_13", "who": "sokamernik", "place": "workshop", "block": 8,
      "text": { "ru": "«Заказ: полка для книг библиотекарю. Берёмся?» — сосед уже тащит доски.", "en": "'Order in: a bookshelf for the librarian. We taking it?' Your cellmate's already hauling boards." },
      "left": { "text": { "ru": "Берёмся", "en": "Take the job" }, "effects": { "respect": 10, "health": -8 }, "next": "b8_14", "reply": { "ru": "Пилили в обед. Доски кончились раньше энтузиазма.", "en": "Sawed straight through lunch. The boards ran out before the enthusiasm did." } },
      "right": { "text": { "ru": "У нас своя норма", "en": "We have our own quota" }, "effects": { "respect": -8, "suspicion": -7, "health": 6 }, "next": "b8_14", "reply": { "ru": "Сосед вздохнул и полез искать другие руки.", "en": "He sighed and went off to find other hands." } }
    },
    {
      "id": "b8_14", "who": "prapor", "place": "workshop", "block": 8,
      "text": { "ru": "«Доски у меня по описи, а не по дружбе, — прапор щурится. — Трёх штук нет. Куда делись?»", "en": "'My boards go by the inventory, not by friendship,' the quartermaster squints. 'Three planks short. Where'd they go?'" },
      "left": { "text": { "ru": "Говорю как есть", "en": "Tell him straight" }, "effects": { "suspicion": -11, "respect": -8 }, "reply": { "ru": "Прапор записал, поворчал и выдал ещё две. Бумага побеждает.", "en": "He logged it, grumbled, and handed over two more. Paperwork wins." } },
      "right": { "text": { "ru": "Списываю на брак", "en": "Write them off as scrap" }, "effects": { "respect": 9, "suspicion": 11 }, "reply": { "ru": "«Брак» уехал в библиотеку и стал полкой. Опись сошлась, совесть шаталась.", "en": "The 'scrap' went to the library and became a shelf. The inventory balanced; your conscience wobbled." } }
    },
    {
      "id": "b8_15", "who": "vertuhai", "place": "workshop", "block": 8,
      "text": { "ru": "«Не положено! Станок после звонка не включать», — вертухай стоит над душой.", "en": "'Not allowed! No machines after the bell,' the guard hovers over your shoulder." },
      "left": { "text": { "ru": "Выключаю станок", "en": "Shut it down" }, "effects": { "suspicion": -9, "respect": -7, "health": 8 }, "reply": { "ru": "Ушёл вовремя, деталь недоделана. Завтра доделаешь. Наверное.", "en": "Left on time, part unfinished. Tomorrow, probably." } },
      "right": { "text": { "ru": "Дорежу деталь", "en": "Finish the cut" }, "effects": { "respect": 11, "suspicion": 10, "health": -6 }, "reply": { "ru": "Успел за десять секунд до скандала. Деталь ровная, вертухай — нет.", "en": "Finished ten seconds before the shouting started. The part came out straight; the guard didn't." } }
    },
    {
      "id": "b8_16", "who": "starik", "place": "cell", "block": 8,
      "text": { "ru": "«Руки после мастерской надо мазать, а то потрескаются», — старик протягивает баночку.", "en": "'Rub your hands after the shop or they'll crack,' the old man holds out a little tin." },
      "left": { "text": { "ru": "Беру баночку", "en": "Take the tin" }, "effects": { "health": 12, "respect": -6 }, "reply": { "ru": "Руки как новые. Пахнешь как бабушкин комод.", "en": "Hands like new. You smell like your grandma's dresser." } },
      "right": { "text": { "ru": "Обойдусь так", "en": "I'll be fine" }, "effects": { "respect": 8, "health": -9, "suspicion": 6 }, "reply": { "ru": "Гордо потрескался. Гордость греет хуже мази.", "en": "Cracked proudly. Pride is a poor moisturiser." } }
    },
    {
      "id": "b8_17", "who": "avtoritet", "place": "workshop", "block": 8,
      "text": { "ru": "«Сделай ящик с двойным дном — чай и печенье прятать от завхоза. Ты же мастер», — старший по бараку кладёт эскиз на верстак.", "en": "'Build me a box with a double bottom — somewhere to keep the tea and biscuits away from the storeman. You're the craftsman, right?' The block boss drops a sketch on your bench." },
      "left": { "text": { "ru": "Сделаю", "en": "I'll build it" }, "effects": { "respect": 12, "suspicion": 11 }, "next": "b8_18", "reply": { "ru": "Взял эскиз. Теперь ты официально «тот, кто умеет».", "en": "Took the sketch. You're now officially 'the guy who can'." } },
      "right": { "text": { "ru": "Только простой ящик", "en": "Plain box only" }, "effects": { "respect": -9, "suspicion": -8 }, "next": "b8_18", "reply": { "ru": "Сделал обычный ящик. Красивый и до обидного честный.", "en": "Made a plain box. Handsome and annoyingly honest." } }
    },
    {
      "id": "b8_18", "who": "sokamernik", "place": "workshop", "block": 8,
      "text": { "ru": "«Про твой ящик уже вся мастерская гудит, — сосед косится на дверь. — Заканчивать или ломать?»", "en": "'The whole shop's buzzing about that box of yours,' your cellmate eyes the door. 'Finish it or break it up?'" },
      "left": { "text": { "ru": "Заканчиваем", "en": "Finish it" }, "effects": { "respect": 13, "suspicion": 12, "health": -7 }, "next": "b8_19", "reply": { "ru": "Дно щёлкнуло идеально. Сосед аплодировал шёпотом.", "en": "The bottom clicked shut perfectly. Your cellmate applauded in a whisper." } },
      "right": { "text": { "ru": "Разбираем", "en": "Break it up" }, "effects": { "respect": -11, "suspicion": -12 }, "next": "b8_19", "reply": { "ru": "Ящик стал дровами за минуту. Слухи умерли чуть медленнее.", "en": "The box became firewood in a minute. The rumours took slightly longer." } }
    },
    {
      "id": "b8_19", "who": "vertuhai", "place": "workshop", "block": 8,
      "text": { "ru": "«Слышал, у нас тут появился краснодеревщик, — вертухай крутит в пальцах стружку. — Покажешь работу?»", "en": "'Hear we've got a cabinetmaker now,' the guard rolls a wood shaving between his fingers. 'Show me your work?'" },
      "left": { "text": { "ru": "Показываю работу", "en": "Show him" }, "effects": { "suspicion": -13, "respect": -7 }, "reply": { "ru": "Показал табуретку и полку. Вертухай хмыкнул и ушёл разочарованный.", "en": "Showed him a stool and a shelf. He grunted and left disappointed." } },
      "right": { "text": { "ru": "Я тут просто крашу", "en": "I just do the painting" }, "effects": { "respect": 10, "suspicion": 9 }, "reply": { "ru": "Наврал с честными глазами. Пальцы в лаке подтвердили легенду.", "en": "Lied with an honest face. The varnish on your fingers backed up the story." } }
    },
    {
      "id": "b8_20", "who": "prapor", "place": "corridor", "block": 8,
      "text": { "ru": "«Тележку с готовой продукцией докатишь до склада? Мне бумаги подписывать», — прапор суёт тебе ручку тележки.", "en": "'Roll the finished goods over to the store room? I've got forms to sign,' the quartermaster shoves the cart handle at you." },
      "left": { "text": { "ru": "Качу тележку", "en": "Push the cart" }, "effects": { "health": -8, "suspicion": -9, "respect": 6 }, "reply": { "ru": "Докатил, ничего не потерял. Прапор впервые сказал «спасибо».", "en": "Delivered, nothing lost. First 'thank you' he's ever said." } },
      "right": { "text": { "ru": "Это не мой наряд", "en": "Not my assignment" }, "effects": { "respect": 9, "suspicion": 8, "health": 7 }, "reply": { "ru": "Формально прав. Прапор запомнил формально надолго.", "en": "Technically correct. He'll technically remember that for a long time." } }
    },
    {
      "id": "b8_21", "who": "elektrik", "place": "workshop", "block": 8,
      "text": { "ru": "«Хочешь фокус? Отключу свет ровно на минуту в обед», — электрик подмигивает у щитка.", "en": "'Want to see a trick? I'll kill the lights for exactly one minute at lunch,' the electrician winks by the panel." },
      "left": { "text": { "ru": "Давай фокус", "en": "Do the trick" }, "effects": { "respect": 12, "suspicion": 11 }, "next": "b8_22", "reply": { "ru": "Минута темноты, тридцать секунд визга и общий восторг.", "en": "One minute of darkness, thirty seconds of shrieking, universal delight." } },
      "right": { "text": { "ru": "Не сегодня", "en": "Not today" }, "effects": { "respect": -8, "suspicion": -9 }, "next": "b8_22", "reply": { "ru": "Электрик убрал руку с рубильника. Скучно, но целы.", "en": "He took his hand off the switch. Boring, but intact." } }
    },
    {
      "id": "b8_22", "who": "vertuhai", "place": "workshop", "block": 8,
      "text": { "ru": "«Кто трогал щиток?» — вертухай обводит взглядом мастерскую.", "en": "'Who's been at the panel?' The guard sweeps the workshop with his eyes." },
      "left": { "text": { "ru": "Молчу вместе со всеми", "en": "Stay quiet with everyone" }, "effects": { "respect": 11, "suspicion": 10, "health": -6 }, "reply": { "ru": "Мастерская молчала как один. Смену продлили на час — всем.", "en": "The shop stayed silent as one. Shift extended by an hour — for everyone." } },
      "right": { "text": { "ru": "Скажу про старую проводку", "en": "Blame the old wiring" }, "effects": { "suspicion": -11, "respect": -6 }, "reply": { "ru": "Вертухай поверил проводке больше, чем людям. Логично.", "en": "The guard trusted the wiring more than the people. Fair enough." } }
    },
    {
      "id": "b8_23", "who": "avtoritet", "place": "corridor", "block": 8,
      "text": { "ru": "«У новеньких руки трясутся у станка. Возьмёшь одного в напарники?» — старший по бараку кивает в сторону мастерской.", "en": "'The new guys shake at the machines. Take one under your wing?' The block boss nods toward the workshop." },
      "left": { "text": { "ru": "Беру напарника", "en": "Take a partner" }, "effects": { "respect": 10, "health": -7, "suspicion": -6 }, "reply": { "ru": "Он испортил три доски и одну твою нервную клетку. Но научился.", "en": "He ruined three boards and one of your nerves. But he learned." } },
      "right": { "text": { "ru": "Я не нянька", "en": "I'm no babysitter" }, "effects": { "respect": -9, "health": 8, "suspicion": 6 }, "reply": { "ru": "Работал один и быстро. И почему-то как-то пусто.", "en": "Worked alone and fast. And somehow it felt empty." } }
    },
    {
      "id": "b8_24", "who": "starik", "place": "workshop", "block": 8,
      "text": { "ru": "«Этот станок надо гладить, а не пинать», — старик хмурится, глядя, как ты бьёшь по заклинившей ручке.", "en": "'That machine wants coaxing, not kicking,' the old man frowns as you whack the jammed handle." },
      "left": { "text": { "ru": "Глажу станок", "en": "Coax it" }, "effects": { "health": 9, "suspicion": -7, "respect": -6 }, "reply": { "ru": "Покрутил, смазал — пошло. Станок теперь твой друг, но молчаливый.", "en": "Wiggled it, oiled it, done. The machine's your friend now — a quiet one." } },
      "right": { "text": { "ru": "Ещё разок пну", "en": "One more kick" }, "effects": { "respect": 8, "health": -11 }, "reply": { "ru": "Ручка поддалась, нога — нет. Метод рабочий, цена высокая.", "en": "The handle gave. Your foot didn't. Effective, expensive." } }
    },
    {
      "id": "b8_25", "who": "sokamernik", "place": "workshop", "block": 8,
      "text": { "ru": "«Спорим, за смену сделаю больше табуреток?» — сосед уже держит пилу наперевес.", "en": "'Bet I can out-stool you this shift?' Your cellmate's already got the saw up." },
      "left": { "text": { "ru": "Спорим", "en": "You're on" }, "effects": { "respect": 11, "health": -10 }, "next": "b8_26", "reply": { "ru": "Опилки летели как снег. Счёт двенадцать — одиннадцать.", "en": "Sawdust flew like snow. Twelve to eleven." } },
      "right": { "text": { "ru": "Работаю спокойно", "en": "Work at my own pace" }, "effects": { "respect": -7, "health": 9, "suspicion": -6 }, "next": "b8_26", "reply": { "ru": "Сделал шесть, зато ровных. Сосед сделал двенадцать, зато кривых.", "en": "Six stools, all straight. He made twelve, all crooked." } }
    },
    {
      "id": "b8_26", "who": "prapor", "place": "workshop", "block": 8,
      "text": { "ru": "«Половина табуреток шатается, — прапор качает одну пальцем. — Переделывать или принимать как есть?»", "en": "'Half these stools wobble,' the quartermaster rocks one with a finger. 'Redo them or sign them off?'" },
      "left": { "text": { "ru": "Переделаю", "en": "I'll redo them" }, "effects": { "health": -9, "suspicion": -8, "respect": 7 }, "reply": { "ru": "Сидел до ночи с молотком. Зато ни одна больше не шатается.", "en": "Stayed up late with a hammer. Not one wobbles now." } },
      "right": { "text": { "ru": "Принимай как есть", "en": "Sign them off" }, "effects": { "respect": 9, "suspicion": 10, "health": 6 }, "reply": { "ru": "Прапор подписал со вздохом. Где-то в столовой скрипнула табуретка.", "en": "He signed with a sigh. Somewhere in the canteen, a stool creaked." } }
    },
    {
      "id": "b8_27", "who": "elektrik", "place": "cell", "block": 8,
      "text": { "ru": "«Проведу тебе лампочку над шконкой, — предлагает электрик. — Мелочь, а читать можно».", "en": "'I'll run a bulb over your bunk,' the electrician offers. 'Small thing, but you could actually read.'" },
      "left": { "text": { "ru": "Проводи", "en": "Wire it up" }, "effects": { "respect": 8, "suspicion": 11, "health": 6 }, "reply": { "ru": "Лампочка светит, провод спрятан за трубой. Уют по-мастеровому.", "en": "The bulb glows, the wire hides behind a pipe. Craftsman's comfort." } },
      "right": { "text": { "ru": "Обойдусь", "en": "I'll manage" }, "effects": { "suspicion": -10, "respect": -7 }, "reply": { "ru": "Читаешь в общем свете, щуришься. Зато вопросов ноль.", "en": "You read in the shared light, squinting. Zero questions asked." } }
    },
    {
      "id": "b8_28", "who": "avtoritet", "place": "workshop", "block": 8,
      "text": { "ru": "«Инструмент из мастерской не выносят. Ни ты, ни я», — старший по бараку смотрит на твой карман.", "en": "'Tools don't leave this shop. Not you, not me,' the block boss stares at your pocket." },
      "left": { "text": { "ru": "Выкладываю стамеску", "en": "Put the chisel back" }, "effects": { "suspicion": -12, "respect": -7 }, "reply": { "ru": "Стамеска легла на место. Полка в камере так и осталась мечтой.", "en": "The chisel went back on the rack. That shelf for your cell stays a dream." } },
      "right": { "text": { "ru": "Мне для полки надо", "en": "I need it for a shelf" }, "effects": { "respect": 9, "suspicion": 13, "health": -6 }, "reply": { "ru": "Полку доделал за ночь. И потом три дня вздрагивал на каждый шаг в коридоре.", "en": "Finished the shelf overnight. And flinched at every footstep in the corridor for three days." } }
    },
    {
      "id": "b9_01", "who": "avtoritet", "place": "cell", "block": 9,
      "text": { "ru": "«Слышал, ты команду собираешь. Мне-то место найдётся?» — старший по бараку садится напротив.", "en": "'Word is you're putting a crew together. Room for me?' The block boss sits down across from you." },
      "left": { "text": { "ru": "Берём его", "en": "He's in" }, "effects": { "respect": 14, "suspicion": 10 }, "reply": { "ru": "Теперь у команды есть вес. И очень громкий голос.", "en": "The crew has clout now. And a very loud voice." } },
      "right": { "text": { "ru": "Пока подумаю", "en": "Let me think" }, "effects": { "respect": -9, "suspicion": -7 }, "reply": { "ru": "Он хмыкнул и ушёл. Зато никто не заметил разговора.", "en": "He snorted and left. At least nobody noticed the talk." } }
    },
    {
      "id": "b9_02", "who": "sokamernik", "place": "cell", "block": 9,
      "text": { "ru": "«Составил список надёжных. Всего два имени, и одно — моё».", "en": "'I made a list of people we can trust. Two names. One of them is mine.'" },
      "left": { "text": { "ru": "Расширяем список", "en": "Add more names" }, "effects": { "respect": 10, "suspicion": 9 }, "next": "b9_03", "reply": { "ru": "Дописали ещё четверых. Список стал похож на приглашение на праздник.", "en": "Four more names added. The list now looks like a party invite." } },
      "right": { "text": { "ru": "Двоих хватит", "en": "Two is enough" }, "effects": { "respect": -7, "suspicion": -8 }, "reply": { "ru": "Меньше народу — меньше болтовни. И меньше рук.", "en": "Fewer people, fewer loose lips. And fewer hands." } }
    },
    {
      "id": "b9_03", "who": "starik", "place": "cell", "block": 9,
      "text": { "ru": "Старик разглядывает бумажку с именами. «Половину вычеркни. Они и обед не сохранят в тайне».", "en": "The old man studies a list of names. 'Cross out half. These lads can't keep lunch a secret.'" },
      "left": { "text": { "ru": "Вычёркиваем", "en": "Cross them out" }, "effects": { "respect": -6, "suspicion": -11, "health": 6 }, "reply": { "ru": "Список похудел вдвое. Спится заметно спокойнее.", "en": "The list is half as long. You sleep noticeably better." } },
      "right": { "text": { "ru": "Все нужны", "en": "We need everyone" }, "effects": { "respect": 12, "suspicion": 11 }, "reply": { "ru": "Оставил всех. Старик молча убрал очки в карман.", "en": "You kept them all. The old man quietly pocketed his glasses." } }
    },
    {
      "id": "b9_04", "who": "baklan", "place": "yard", "block": 9,
      "text": { "ru": "«Возьми меня в дело! Я самый тихий человек в бараке!» — орёт Баклан на весь двор.", "en": "'Take me along! I'm the quietest guy in this block!' Baklan bellows across the whole yard." },
      "left": { "text": { "ru": "Ладно, берём", "en": "Fine, you're in" }, "effects": { "respect": 11, "suspicion": 13 }, "reply": { "ru": "Обнял так, что рёбра щёлкнули. Зато теперь он на нашей стороне.", "en": "He hugged you till your ribs clicked. At least he's on your side now." } },
      "right": { "text": { "ru": "Слишком громкий", "en": "Too loud" }, "effects": { "respect": -8, "suspicion": -9, "health": -6 }, "reply": { "ru": "Обиделся и толкнул плечом на прощание. Плечо помнит.", "en": "He sulked and shoulder-checked you goodbye. Your shoulder remembers." } }
    },
    {
      "id": "b9_05", "who": "elektrik", "place": "corridor", "block": 9,
      "text": { "ru": "«Могу устроить репетицию: свет мигнёт на десять секунд. Посмотрим, кто куда побежит».", "en": "'I can run a rehearsal: lights blink for ten seconds. We'll see who runs where.'" },
      "left": { "text": { "ru": "Устраиваем репетицию", "en": "Do the rehearsal" }, "effects": { "respect": 12, "suspicion": 10 }, "next": "b9_06", "reply": { "ru": "Свет мигнул. Половина барака завизжала, вторая половина сделала вид, что спала.", "en": "Lights flickered. Half the block shrieked, the other half pretended to be asleep." } },
      "right": { "text": { "ru": "Без репетиций", "en": "No rehearsals" }, "effects": { "respect": -10, "suspicion": -9 }, "reply": { "ru": "Электрик убрал отвёртку. «Ну, будем импровизировать».", "en": "The electrician pocketed his screwdriver. 'Improvising it is.'" } }
    },
    {
      "id": "b9_06", "who": "sokamernik", "place": "cell", "block": 9,
      "text": { "ru": "«Я записал, кто как себя вёл в темноте. Огласить при всех?»", "en": "'I wrote down how everyone behaved in the dark. Read it out loud?'" },
      "left": { "text": { "ru": "Огласить", "en": "Read it out" }, "effects": { "respect": 13, "suspicion": 12 }, "reply": { "ru": "Барак хохотал полчаса. Двое перестали здороваться.", "en": "The block laughed for half an hour. Two guys stopped saying hello." } },
      "right": { "text": { "ru": "Только между нами", "en": "Just between us" }, "effects": { "respect": -7, "suspicion": -10, "health": 7 }, "reply": { "ru": "Сложили бумажку вчетверо. Никто не в обиде, все спокойны.", "en": "Folded the note in four. No hurt feelings, everyone calm." } }
    },
    {
      "id": "b9_07", "who": "starik", "place": "cell", "block": 9,
      "text": { "ru": "«Кого берут в серьёзное дело: тех, кто в переполохе бежит первым, или тех, кто стоит?» — старик греет руки о кружку.", "en": "'Who do you take on a serious job: the ones who bolt first in a commotion, or the ones who stand still?' The old man warms his hands on a mug." },
      "left": { "text": { "ru": "Кто бежит — тот наш", "en": "Runners are ours" }, "effects": { "respect": 11, "suspicion": 9 }, "reply": { "ru": "Ставлю на смелых. Правда, смелые и шумные — обычно одни и те же люди.", "en": "You bet on the bold. Sadly, bold and loud are usually the same people." } },
      "right": { "text": { "ru": "Кто стоит — тот наш", "en": "Standers are ours" }, "effects": { "respect": -6, "suspicion": -11, "health": 6 }, "reply": { "ru": "Выбрал тех, кто не дёргается. Скучные, зато не подведут.", "en": "You picked the ones who don't flinch. Boring, but reliable." } }
    },
    {
      "id": "b9_08", "who": "novichok", "place": "cell", "block": 9,
      "text": { "ru": "«А меня возьмёте? Я никому не скажу! Кроме соседа, он уже знает».", "en": "'Can I come? I won't tell anyone! Except my bunkmate, he already knows.'" },
      "left": { "text": { "ru": "Берём под присмотр", "en": "Keep him close" }, "effects": { "respect": 9, "suspicion": 11 }, "reply": { "ru": "Пусть лучше болтает рядом, чем в стороне.", "en": "Better he blabs beside you than behind you." } },
      "right": { "text": { "ru": "Никаких новеньких", "en": "No rookies" }, "effects": { "respect": -8, "suspicion": -7, "health": -6 }, "reply": { "ru": "Расстроился и полночи вздыхал над ухом. Не выспался.", "en": "He moped and sighed by your ear half the night. No sleep for you." } }
    },
    {
      "id": "b9_09", "who": "avtoritet", "place": "cell", "block": 9,
      "text": { "ru": "«Кто-то из твоих бегает к куму с докладами. Угадай кто», — старший ухмыляется.", "en": "'Someone in your circle keeps running to the officer's door with reports. Guess who,' the boss smirks." },
      "left": { "text": { "ru": "Требую имя", "en": "Give me the name" }, "effects": { "respect": 10, "suspicion": 12 }, "next": "b9_10", "reply": { "ru": "Имя назвали. Теперь бы ещё понять, правда ли это.", "en": "You got a name. Now to find out if it's true." } },
      "right": { "text": { "ru": "Сам разберусь", "en": "I'll figure it out" }, "effects": { "respect": -9, "suspicion": -8 }, "reply": { "ru": "Старший пожал плечами. Загадка осталась при тебе.", "en": "He shrugged. The riddle stays yours." } }
    },
    {
      "id": "b9_10", "who": "sokamernik", "place": "cell", "block": 9,
      "text": { "ru": "«Проверить просто: скажем одному ложную дату. Утечёт — значит, он».", "en": "'Simple test: feed one guy a fake date. If it leaks, it's him.'" },
      "left": { "text": { "ru": "Ставим ловушку", "en": "Set the trap" }, "effects": { "respect": 12, "suspicion": 9 }, "reply": { "ru": "К вечеру ложную дату знал весь барак. Проверка провалилась красиво.", "en": "By evening the whole block knew the fake date. The test failed spectacularly." } },
      "right": { "text": { "ru": "Не хочу подставлять", "en": "Won't set him up" }, "effects": { "respect": -11, "suspicion": -9, "health": 6 }, "reply": { "ru": "Решил поверить человеку. Спится ровно, но так ничего и не выяснил.", "en": "You chose to trust him. You sleep fine, but you learned nothing." } }
    },
    {
      "id": "b9_11", "who": "kot", "place": "yard", "block": 9,
      "text": { "ru": "Кот уселся ровно на схему, которую ты чертишь палкой на земле, и щурится.", "en": "The cat parks itself right on the plan you're scratching into the dirt and squints." },
      "left": { "text": { "ru": "Сгоняю кота", "en": "Shoo the cat" }, "effects": { "respect": 9, "suspicion": 10, "health": -6 }, "reply": { "ru": "Кот ушёл с достоинством и когтем. Схема цела, рука нет.", "en": "The cat left with dignity and one claw. The plan survived, your hand didn't." } },
      "right": { "text": { "ru": "Пусть сидит", "en": "Let him sit" }, "effects": { "respect": -7, "suspicion": -12 }, "reply": { "ru": "Прошёл вертухай, увидел кота на земле и ничего не заподозрил.", "en": "A guard walked by, saw a cat in the dirt, suspected nothing." } }
    },
    {
      "id": "b9_12", "who": "elektrik", "place": "corridor", "block": 9,
      "text": { "ru": "«Нужен человек на щиток. Работа простая: дёрнуть рубильник и не паниковать».", "en": "'I need someone at the breaker box. Simple job: pull the switch and don't panic.'" },
      "left": { "text": { "ru": "Беру это на себя", "en": "I'll do it" }, "effects": { "respect": 13, "suspicion": 11 }, "next": "b9_13", "reply": { "ru": "Согласился. Электрик показал рубильник и три раза сказал «не этот».", "en": "You agreed. He showed you the switch and said 'not that one' three times." } },
      "right": { "text": { "ru": "Пусть кто-то другой", "en": "Someone else" }, "effects": { "respect": -10, "suspicion": -8 }, "reply": { "ru": "Нашли добровольца. Он уже дважды переспросил, где щиток.", "en": "A volunteer stepped up. He's already asked twice where the box is." } }
    },
    {
      "id": "b9_13", "who": "baklan", "place": "corridor", "block": 9,
      "text": { "ru": "«Дай мне рубильник! Я знаю, что такое рубильник!» — Баклан тянет руку.", "en": "'Give me the switch! I know what a switch is!' Baklan reaches out." },
      "left": { "text": { "ru": "Отдать ему", "en": "Let him have it" }, "effects": { "respect": 11, "suspicion": 13 }, "reply": { "ru": "Отдал. Он тут же похвастался этим двум незнакомым людям.", "en": "You handed it over. He immediately bragged about it to two strangers." } },
      "right": { "text": { "ru": "Дать ему шум", "en": "Give him noise duty" }, "effects": { "respect": -7, "suspicion": -11, "health": 6 }, "reply": { "ru": "Поставил его орать в другом конце. Обиделся, но зато тихо у щитка.", "en": "You put him on yelling duty at the far end. He sulked, but the box stayed quiet." } }
    },
    {
      "id": "b9_14", "who": "starik", "place": "cell", "block": 9,
      "text": { "ru": "«Говорят, ты раздаёшь поручения. Самому громкому — самое тихое дело? Смело», — старик поднимает бровь.", "en": "'They say you hand out jobs. The loudest man gets the quietest one? Bold,' the old man raises an eyebrow." },
      "left": { "text": { "ru": "Переигрываю", "en": "Reshuffle them" }, "effects": { "respect": -8, "suspicion": -11, "health": 7 }, "reply": { "ru": "Тихо поменял людей местами. Никто даже не заметил.", "en": "You quietly swapped people around. Nobody even noticed." } },
      "right": { "text": { "ru": "Доверяю громким", "en": "Loud guys are fine" }, "effects": { "respect": 14, "suspicion": 10 }, "reply": { "ru": "Оставил как есть. Баклан сияет и репетирует крик шёпотом.", "en": "You left it. Baklan beams and rehearses his shout in a whisper." } }
    },
    {
      "id": "b9_15", "who": "novichok", "place": "yard", "block": 9,
      "text": { "ru": "«А правда, что если бежать зигзагом, то никто не догонит?»", "en": "'Is it true nobody can catch you if you run in a zigzag?'" },
      "left": { "text": { "ru": "Правда, конечно", "en": "Absolutely true" }, "effects": { "respect": 10, "suspicion": 8, "health": -6 }, "reply": { "ru": "Он тут же побежал зигзагом по двору и врезался в скамейку.", "en": "He immediately zigzagged across the yard into a bench." } },
      "right": { "text": { "ru": "Забудь про зигзаг", "en": "Forget the zigzag" }, "effects": { "respect": -7, "suspicion": -9, "health": 6 }, "reply": { "ru": "Расстроился, но остался на месте. Скамейка тоже цела.", "en": "He was disappointed but stayed put. The bench is fine too." } }
    },
    {
      "id": "b9_16", "who": "avtoritet", "place": "cell", "block": 9,
      "text": { "ru": "«Если уходишь — уходи красиво. Но барак-то останется. Подумал об этом?»", "en": "'If you go, go with style. But the block stays behind. Thought about that?'" },
      "left": { "text": { "ru": "Оставлю преемника", "en": "I'll name a successor" }, "effects": { "respect": 13, "suspicion": 9 }, "reply": { "ru": "Назвал имя. Барак загудел, обсуждая, справится ли он.", "en": "You named someone. The block buzzed, debating whether he'd manage." } },
      "right": { "text": { "ru": "Разберутся сами", "en": "They'll manage" }, "effects": { "respect": -11, "suspicion": -7, "health": 6 }, "reply": { "ru": "Промолчал. Меньше слов — меньше поводов вспоминать твоё имя.", "en": "You said nothing. Fewer words, fewer reasons to remember your name." } }
    },
    {
      "id": "b9_17", "who": "sokamernik", "place": "cell", "block": 9,
      "text": { "ru": "«Давай придумаем условный сигнал. Например, я кашляю два раза».", "en": "'Let's set a signal. Say, I cough twice.'" },
      "left": { "text": { "ru": "Кашель подходит", "en": "Cough works" }, "effects": { "respect": 10, "suspicion": 9 }, "next": "b9_18", "reply": { "ru": "Договорились. К вечеру кашлял весь барак — сквозняк.", "en": "Agreed. By evening the whole block was coughing — draft." } },
      "right": { "text": { "ru": "Никаких сигналов", "en": "No signals" }, "effects": { "respect": -9, "suspicion": -8 }, "reply": { "ru": "Сосед надулся. Зато договариваться теперь придётся молча и на глаз.", "en": "He sulked. Now you'll have to coordinate silently, by eye." } }
    },
    {
      "id": "b9_18", "who": "elektrik", "place": "cell", "block": 9,
      "text": { "ru": "«Сигнал должен быть такой, чтобы его нельзя было подать случайно. Могу мигнуть лампой».", "en": "'A signal has to be something you can't give by accident. I could blink the lamp.'" },
      "left": { "text": { "ru": "Лампа надёжнее", "en": "Lamp is safer" }, "effects": { "respect": 11, "suspicion": 9 }, "reply": { "ru": "Перешли на лампу. Правда, теперь всё зависит от одной лампочки.", "en": "You switched to the lamp. Now everything hinges on one bulb." } },
      "right": { "text": { "ru": "Оставим по-простому", "en": "Keep it simple" }, "effects": { "respect": -7, "suspicion": -10, "health": 6 }, "reply": { "ru": "Оставили звук. Просто, глупо и не привлекает внимания.", "en": "You kept the sound. Simple, silly, and draws no attention." } }
    },
    {
      "id": "b9_19", "who": "kot", "place": "cell", "block": 9,
      "text": { "ru": "Кот притащил к твоей шконке крышку от кастрюли и уронил её с грохотом.", "en": "The cat drags a pot lid to your bunk and drops it with a clang." },
      "left": { "text": { "ru": "Забрать, пригодится", "en": "Keep it, useful" }, "effects": { "respect": 10, "suspicion": 11 }, "reply": { "ru": "Спрятал под матрас. Отличный шумовой инструмент на будущее.", "en": "Stashed it under the mattress. Excellent future noisemaker." } },
      "right": { "text": { "ru": "Вернуть на кухню", "en": "Return it" }, "effects": { "respect": -9, "suspicion": -11 }, "reply": { "ru": "Отнёс обратно. Повар кивнул, кот презрительно отвернулся.", "en": "You took it back. The cook nodded, the cat looked away in disgust." } }
    },
    {
      "id": "b9_20", "who": "baklan", "place": "yard", "block": 9,
      "text": { "ru": "«Я тут всем рассказал, что мы друзья. Ну, для прикрытия!» — гордо объявляет Баклан.", "en": "'I told everyone we're friends. You know, as cover!' Baklan announces proudly." },
      "left": { "text": { "ru": "Подыграть", "en": "Play along" }, "effects": { "respect": 12, "suspicion": 10 }, "next": "b9_21", "reply": { "ru": "Обнял его за плечи. Теперь вы официально шумный дуэт.", "en": "You threw an arm around him. Officially the block's loudest duo now." } },
      "right": { "text": { "ru": "Отрицать всё", "en": "Deny everything" }, "effects": { "respect": -10, "suspicion": -8 }, "reply": { "ru": "Сказал, что впервые его вижу. Он растерянно захлопал глазами.", "en": "You said you'd never met him. He blinked in confusion." } }
    },
    {
      "id": "b9_21", "who": "starik", "place": "yard", "block": 9,
      "text": { "ru": "«Дружба с самым громким человеком двора — это стратегия или беда?»", "en": "'Befriending the loudest man in the yard — strategy or disaster?'" },
      "left": { "text": { "ru": "Это стратегия", "en": "It's strategy" }, "effects": { "respect": 11, "suspicion": 8 }, "reply": { "ru": "Пока он гремит, никто не смотрит на тихих. Работает.", "en": "While he rattles on, nobody watches the quiet ones. It works." } },
      "right": { "text": { "ru": "Это беда", "en": "It's a disaster" }, "effects": { "respect": -6, "suspicion": -12, "health": 7 }, "reply": { "ru": "Честно признался. Старик засмеялся и налил тебе чаю.", "en": "You admitted it. The old man laughed and poured you tea." } }
    },
    {
      "id": "b9_22", "who": "novichok", "place": "corridor", "block": 9,
      "text": { "ru": "«Меня вызывали поговорить. Я молчал! Ну, почти», — новенький мнёт шапку.", "en": "'They called me in for a chat. I said nothing! Well, almost,' the rookie wrings his hat." },
      "left": { "text": { "ru": "Выспросить всё", "en": "Press for details" }, "effects": { "respect": 10, "suspicion": 12 }, "reply": { "ru": "Выяснил: он рассказал про кота. Кот теперь под наблюдением.", "en": "Turns out he talked about the cat. The cat is now under surveillance." } },
      "right": { "text": { "ru": "Успокоить парня", "en": "Calm him down" }, "effects": { "respect": -6, "suspicion": -10, "health": 7 }, "reply": { "ru": "Похлопал по плечу. Он выдохнул и перестал дрожать.", "en": "You patted his shoulder. He exhaled and stopped shaking." } }
    },
    {
      "id": "b9_23", "who": "elektrik", "place": "corridor", "block": 9,
      "text": { "ru": "«Мне на волю через месяц. Могу не рисковать. А могу помочь», — говорит он тихо.", "en": "'I'm out in a month. I could sit this out. Or I could help,' he says quietly." },
      "left": { "text": { "ru": "Просить помочь", "en": "Ask him to help" }, "effects": { "respect": 13, "suspicion": 11 }, "reply": { "ru": "Согласился. Теперь ты должен человеку целый месяц спокойствия.", "en": "He agreed. You now owe a man a whole month of peace and quiet." } },
      "right": { "text": { "ru": "Отпустить спокойно", "en": "Let him walk" }, "effects": { "respect": -9, "suspicion": -12, "health": 6 }, "reply": { "ru": "Сказал: досиживай спокойно. Он крепко пожал руку.", "en": "You told him to serve it out. He shook your hand hard." } }
    },
    {
      "id": "b9_24", "who": "avtoritet", "place": "cell", "block": 9,
      "text": { "ru": "«Барак разделился: половина за тебя, половина против. Скажешь речь?»", "en": "'The block's split: half for you, half against. Want to give a speech?'" },
      "left": { "text": { "ru": "Говорю речь", "en": "Give the speech" }, "effects": { "respect": 14, "suspicion": 12 }, "next": "b9_25", "reply": { "ru": "Влез на табурет. Табурет качался, но слова вышли неплохие.", "en": "You climbed a stool. The stool wobbled, the words held up." } },
      "right": { "text": { "ru": "Обойдусь без речей", "en": "No speeches" }, "effects": { "respect": -11, "suspicion": -9 }, "reply": { "ru": "Промолчал. Половина решила, что тебе нечего сказать.", "en": "You stayed quiet. Half decided you had nothing to say." } }
    },
    {
      "id": "b9_25", "who": "sokamernik", "place": "cell", "block": 9,
      "text": { "ru": "«Речь была огонь. Только ты вслух назвал два имени», — шепчет сосед.", "en": "'Great speech. Except you said two names out loud,' your cellmate whispers." },
      "left": { "text": { "ru": "Свести всё в шутку", "en": "Turn it into a joke" }, "effects": { "respect": -7, "suspicion": -12 }, "reply": { "ru": "Объявил, что это были клички котов. Все поверили, но смеялись над тобой.", "en": "You claimed those were cat names. Everyone bought it — and laughed at you." } },
      "right": { "text": { "ru": "Сделать вид, что так надо", "en": "Act like it was planned" }, "effects": { "respect": 12, "suspicion": 11 }, "reply": { "ru": "Кивнул с умным видом. Названные двое побледнели.", "en": "You nodded knowingly. The two named men went pale." } }
    },
    {
      "id": "b9_26", "who": "kot", "place": "cell", "block": 9,
      "text": { "ru": "Кот запрыгнул на табурет посреди барака и оглядел всех как хозяин.", "en": "The cat hops onto a stool in the middle of the block and surveys everyone like a landlord." },
      "left": { "text": { "ru": "Оставить ему трибуну", "en": "Give him the stage" }, "effects": { "respect": -8, "suspicion": -12, "health": 6 }, "reply": { "ru": "Барак полчаса обсуждал кота вместо дел. Тихо, но и толку ноль.", "en": "The block spent half an hour on the cat instead of business. Quiet, but nothing got done." } },
      "right": { "text": { "ru": "Согнать и говорить самому", "en": "Shoo him, take the floor" }, "effects": { "respect": 12, "suspicion": 10 }, "reply": { "ru": "Согнал и сказал своё. Кот теперь смотрит на тебя с осуждением.", "en": "You shooed him and had your say. The cat now judges you openly." } }
    },
    {
      "id": "b9_27", "who": "starik", "place": "cell", "block": 9,
      "text": { "ru": "«Я остаюсь. Мне бежать некуда, да и колени не те. Возьми хоть совет».", "en": "'I'm staying. Nowhere to run and my knees are done. Take some advice instead.'" },
      "left": { "text": { "ru": "Слушаю совет", "en": "I'm listening" }, "effects": { "respect": -6, "suspicion": -13, "health": 8 }, "reply": { "ru": "Совет оказался про обувь. Скучно, но, кажется, спасёт ноги.", "en": "The advice was about footwear. Dull, but it might save your feet." } },
      "right": { "text": { "ru": "Уговариваю с нами", "en": "Talk him into it" }, "effects": { "respect": 13, "suspicion": 10, "health": -6 }, "reply": { "ru": "Спорили полночи. Он не согласился, а ты не выспался.", "en": "You argued half the night. He said no and you lost sleep." } }
    },
    {
      "id": "b9_28", "who": "sokamernik", "place": "cell", "block": 9,
      "text": { "ru": "«Если что-то пойдёт не так — мы ведь не знакомы, да?» — сосед протягивает руку.", "en": "'If this goes sideways, we've never met, right?' Your cellmate holds out a hand." },
      "left": { "text": { "ru": "Пожать руку", "en": "Shake on it" }, "effects": { "respect": -7, "suspicion": -12, "health": 7 }, "reply": { "ru": "Пожали руки на всякий случай. Обоим стало спокойнее.", "en": "You shook on it, just in case. Both of you breathed easier." } },
      "right": { "text": { "ru": "Мы знакомы всегда", "en": "We've always met" }, "effects": { "respect": 15, "suspicion": 11 }, "reply": { "ru": "Сказал громче, чем стоило. Сосед покраснел от гордости.", "en": "You said it louder than you should have. He blushed with pride." } }
    },
    {
      "id": "b10_01", "who": "sokamernik", "place": "yard", "block": 10,
      "text": { "ru": "«Сегодня всё решается. Ходи как обычно, дыши как обычно», — шепчет сосед и сам дышит как паровоз.", "en": "'Today's the day. Walk normal, breathe normal,' your cellmate whispers, breathing like a steam engine." },
      "left": { "text": { "ru": "Успокоить его", "en": "Calm him down" }, "effects": { "respect": 9, "suspicion": -7, "health": -6 }, "reply": { "ru": "Полчаса уговоров — он спокоен, а трясёт теперь тебя.", "en": "Half an hour of talking him down. He's fine now; you're the one shaking." } },
      "right": { "text": { "ru": "Идти отдельно", "en": "Walk separately" }, "effects": { "suspicion": -10, "respect": -8 }, "reply": { "ru": "Разошлись по разным углам. Тихо, но сосед смотрит обиженно.", "en": "You split to opposite corners. Quiet — but he's giving you the wounded look." } }
    },
    {
      "id": "b10_02", "who": "sokamernik", "place": "yard", "block": 10,
      "text": { "ru": "«Последняя сверка плана. Проговорим вслух или каждый держит в голове?»", "en": "'Final run-through. Do we say it out loud, or does everyone keep it in their head?'" },
      "left": { "text": { "ru": "Проговорить вслух", "en": "Say it out loud" }, "effects": { "respect": 11, "suspicion": 10 }, "next": "b10_03", "reply": { "ru": "Проговорили у стены. Все всё поняли — и, кажется, ещё пара голубей.", "en": "You go through it by the wall. Everyone's clear — and possibly two pigeons." } },
      "right": { "text": { "ru": "Каждый сам", "en": "Everyone stays silent" }, "effects": { "suspicion": -9, "respect": -7 }, "reply": { "ru": "Молча кивнули. Надёжно, но сосед точно что-нибудь перепутает.", "en": "Silent nods all round. Safe — though he'll definitely mix something up." } }
    },
    {
      "id": "b10_03", "who": "sokamernik", "place": "yard", "block": 10,
      "text": { "ru": "«Стоп. Ты сказал „после третьего сигнала“ или „после второго“?» — сосед бледнеет.", "en": "'Hold on. Did you say after the third signal, or the second?' He goes pale." },
      "left": { "text": { "ru": "Повторить ещё раз", "en": "Repeat it again" }, "effects": { "respect": 8, "suspicion": 8, "health": -6 }, "reply": { "ru": "Повторил трижды. Теперь это знает он, ты и твоя головная боль.", "en": "You repeat it three times. Now he knows, you know, and your headache knows." } },
      "right": { "text": { "ru": "Нарисовать на песке", "en": "Draw it in the dirt" }, "effects": { "respect": 10, "suspicion": -8, "health": -7 }, "reply": { "ru": "Начертил схему и затёр ботинком. Сосед сияет, ботинок в песке.", "en": "You sketch it out and scuff it away with your boot. He's beaming; the boot's a mess." } }
    },
    {
      "id": "b10_04", "who": "starik", "place": "yard", "block": 10,
      "text": { "ru": "«У тебя лицо человека, который завтра тут не завтракает», — усмехается старик.", "en": "'You've got the face of a man who won't be at breakfast tomorrow,' the old man chuckles." },
      "left": { "text": { "ru": "Отшутиться", "en": "Laugh it off" }, "effects": { "respect": 9, "suspicion": 7 }, "reply": { "ru": "Пошутил про кашу. Он засмеялся, но глаза остались умные.", "en": "You crack a joke about the porridge. He laughs — but his eyes stay sharp." } },
      "right": { "text": { "ru": "Сделать скучное лицо", "en": "Look bored" }, "effects": { "suspicion": -11, "respect": -6 }, "reply": { "ru": "Изобразил вселенскую тоску. Убедительно до зевоты.", "en": "You produce a face of pure boredom. Convincing enough to yawn at." } }
    },
    {
      "id": "b10_05", "who": "elektrik", "place": "corridor", "block": 10,
      "text": { "ru": "«Проверю щиток в последний раз. Постоишь у двери, посмотришь, не идёт ли кто?»", "en": "'One last check on the fuse box. Will you watch the door and see if anyone's coming?'" },
      "left": { "text": { "ru": "Постоять у двери", "en": "Watch the door" }, "effects": { "respect": 12, "suspicion": 9 }, "next": "b10_06", "reply": { "ru": "Полчаса изображал человека, который просто очень любит эту стену.", "en": "Half an hour pretending to be a man who really loves this wall." } },
      "right": { "text": { "ru": "Пусть сам", "en": "Let him solo it" }, "effects": { "suspicion": -8, "respect": -9 }, "reply": { "ru": "Ушёл в барак. Электрик потом весь день вздыхал в твою сторону.", "en": "You head back inside. He sighs in your direction for the rest of the day." } }
    },
    {
      "id": "b10_06", "who": "elektrik", "place": "corridor", "block": 10,
      "text": { "ru": "«Тут провод дребезжит. Подтянуть сейчас или не лезть, чтоб не заметили?»", "en": "'This wire's buzzing. Tighten it now, or leave it so nobody notices?'" },
      "left": { "text": { "ru": "Подтянуть сейчас", "en": "Tighten it now" }, "effects": { "respect": 10, "health": -8, "suspicion": 7 }, "next": "b10_07", "reply": { "ru": "Щёлкнуло, дёрнуло пальцы, но гудеть перестало.", "en": "A snap, a jolt in your fingers — and the buzzing stops." } },
      "right": { "text": { "ru": "Не трогать", "en": "Leave it alone" }, "effects": { "suspicion": -10, "respect": -7 }, "reply": { "ru": "Оставили как есть. Гудит — зато никто не приходил проверять.", "en": "You leave it humming. Annoying, but nobody came to check." } }
    },
    {
      "id": "b10_07", "who": "elektrik", "place": "corridor", "block": 10,
      "text": { "ru": "«Слышишь? Шаги. Прячем инструмент или делаем вид, что мы тут по работе?»", "en": "'Hear that? Footsteps. Hide the tools, or act like we're on the job?'" },
      "left": { "text": { "ru": "Делать вид", "en": "Act official" }, "effects": { "respect": 11, "suspicion": -9, "health": -8 }, "reply": { "ru": "Держал фонарь с таким умным лицом, что вертухай кивнул и ушёл. Руки потом дрожали до вечера.", "en": "You held the torch with such a serious face the guard nodded and moved on. Your hands shook till evening." } },
      "right": { "text": { "ru": "Прятать всё", "en": "Hide everything" }, "effects": { "suspicion": 10, "respect": -6, "health": -6 }, "reply": { "ru": "Успели. Отвёртка в носке — идея гениальная ровно до первого шага.", "en": "You made it. A screwdriver in your sock is genius right up until you walk." } }
    },
    {
      "id": "b10_08", "who": "vertuhai", "place": "yard", "block": 10,
      "text": { "ru": "«Что-то вы все сегодня подозрительно вежливые», — щурится вертухай.", "en": "'You lot are suspiciously polite today,' the guard squints." },
      "left": { "text": { "ru": "Поворчать как обычно", "en": "Grumble like usual" }, "effects": { "suspicion": -12, "respect": -7 }, "reply": { "ru": "Поныл про холодную кашу. Вертухай успокоился, барак поморщился.", "en": "You whine about cold porridge. The guard relaxes; the block winces." } },
      "right": { "text": { "ru": "Улыбнуться шире", "en": "Smile wider" }, "effects": { "suspicion": 11, "respect": 8 }, "reply": { "ru": "Улыбнулся так широко, что он на всякий случай записал тебя в блокнот.", "en": "You smile so wide he writes your name down just in case." } }
    },
    {
      "id": "b10_09", "who": "vertuhai", "place": "corridor", "block": 10,
      "text": { "ru": "«Внеплановый шмон в бараке. Всем выйти», — объявляет вертухай не вовремя.", "en": "'Surprise search in the block. Everybody out,' the guard announces at the worst moment." },
      "left": { "text": { "ru": "Выйти первым", "en": "Step out first" }, "effects": { "suspicion": -11, "respect": -7 }, "next": "b10_10", "reply": { "ru": "Вышел первым и спокойно. Идеальный скучный человек.", "en": "First out, calm as anything. A perfectly boring man." } },
      "right": { "text": { "ru": "Задержаться на минуту", "en": "Linger a minute" }, "effects": { "respect": 12, "suspicion": 10, "health": -6 }, "reply": { "ru": "Успел переложить свёрток. Сердце потом стучало до самого отбоя.", "en": "You got the bundle moved. Your heart kept drumming until lights out." } }
    },
    {
      "id": "b10_10", "who": "vertuhai", "place": "corridor", "block": 10,
      "text": { "ru": "«У тебя под подушкой моток верёвки. Объясняй», — вертухай качает находкой.", "en": "'There's a coil of rope under your pillow. Explain,' the guard dangles it." },
      "left": { "text": { "ru": "Это для белья", "en": "It's a laundry line" }, "effects": { "suspicion": -10, "respect": -7 }, "reply": { "ru": "«Носки сушу». Он поверил, потому что носки правда висели. Барак похихикал.", "en": "'For drying socks.' He bought it — the socks really were hanging. The block snickered." } },
      "right": { "text": { "ru": "Молча забрать", "en": "Take it back silently" }, "effects": { "respect": 11, "suspicion": 12, "health": -7 }, "reply": { "ru": "Забрал молча. Взгляд он не отвёл — теперь ты в его личном списке.", "en": "You take it without a word. He keeps the stare — you're on his personal list now." } }
    },
    {
      "id": "b10_11", "who": "avtoritet", "place": "yard", "block": 10,
      "text": { "ru": "«Слух ходит, что кто-то собрался прогуляться. Не ты, надеюсь?»", "en": "'Word is somebody's planning a stroll. Not you, I hope?'" },
      "left": { "text": { "ru": "Признаться честно", "en": "Admit it" }, "effects": { "respect": 13, "suspicion": 11 }, "reply": { "ru": "Он хмыкнул: «Уважаю честных чудаков». И это, кажется, комплимент.", "en": "He grunts: 'I respect an honest oddball.' That was probably a compliment." } },
      "right": { "text": { "ru": "Всё отрицать", "en": "Deny everything" }, "effects": { "suspicion": -10, "respect": -9 }, "reply": { "ru": "«Какая прогулка, я тут как дома». Он не поверил, но отстал.", "en": "'A stroll? I'm practically at home here.' He didn't buy it, but he dropped it." } }
    },
    {
      "id": "b10_12", "who": "starik", "place": "yard", "block": 10,
      "text": { "ru": "«При мне один тоже спешил. Забыл шапку — и всё, приметная голова».", "en": "'One fella here was in a hurry once. Forgot his hat — and that head got noticed.'" },
      "left": { "text": { "ru": "Пересобрать вещи", "en": "Repack everything" }, "effects": { "respect": 9, "health": -8, "suspicion": -7 }, "reply": { "ru": "Перебрал всё трижды. Спина ноет, зато шапка на месте.", "en": "You go through it all three times. Your back aches, but the hat's there." } },
      "right": { "text": { "ru": "Верить в удачу", "en": "Trust your luck" }, "effects": { "respect": 8, "suspicion": 9 }, "reply": { "ru": "Махнул рукой. Старик посмотрел с той самой жалостью.", "en": "You wave it off. The old man gives you that particular pitying look." } }
    },
    {
      "id": "b10_13", "who": "starik", "place": "yard", "block": 10,
      "text": { "ru": "«Присядь, чаю налью. Может, последний раз пьём», — старик уже достал кружки.", "en": "'Sit, have some tea. Might be our last cup,' the old man says, mugs already out." },
      "left": { "text": { "ru": "Сесть с ним", "en": "Sit with him" }, "effects": { "respect": 12, "suspicion": 8, "health": 6 }, "next": "b10_14", "reply": { "ru": "Просидели полчаса. Чай был крепкий, разговор — крепче.", "en": "You sat half an hour. Strong tea, stronger conversation." } },
      "right": { "text": { "ru": "Некогда", "en": "No time" }, "effects": { "suspicion": -8, "respect": -11 }, "reply": { "ru": "Прошёл мимо. Он не обиделся вслух — он умеет молча.", "en": "You walk past. He doesn't complain out loud — he's good at silence." } }
    },
    {
      "id": "b10_14", "who": "starik", "place": "yard", "block": 10,
      "text": { "ru": "«Оставишь мне что-нибудь на память или уйдёшь налегке?»", "en": "'Leaving me a keepsake, or travelling light?'" },
      "left": { "text": { "ru": "Отдать кружку", "en": "Give him your mug" }, "effects": { "respect": 11, "suspicion": 9 }, "reply": { "ru": "Отдал свою кружку. Он поставил её на полку как награду.", "en": "You hand over your mug. He sets it on the shelf like a trophy." } },
      "right": { "text": { "ru": "Ничего не менять", "en": "Change nothing" }, "effects": { "suspicion": -10, "respect": -7 }, "reply": { "ru": "Оставил всё как есть: пустых полок никто не заметит.", "en": "You leave everything in place. Nobody notices shelves that stay full." } }
    },
    {
      "id": "b10_15", "who": "sokamernik", "place": "yard", "block": 10,
      "text": { "ru": "«У меня руки трясутся. Дай что-нибудь подержать, а то я себя выдам».", "en": "'My hands are shaking. Give me something to hold before I give us away.'" },
      "left": { "text": { "ru": "Дать метлу", "en": "Hand him a broom" }, "effects": { "respect": 10, "suspicion": -9, "health": -6 }, "reply": { "ru": "Метёт двор третий час. Двор чистый, подозрений ноль, твоя метла уехала навсегда.", "en": "He's been sweeping for three hours. Spotless yard, zero suspicion, and your broom is gone forever." } },
      "right": { "text": { "ru": "Пусть держится сам", "en": "Let him cope" }, "effects": { "suspicion": 10, "respect": 7 }, "reply": { "ru": "Он справился, но уронил миску. Дважды. Громко.", "en": "He managed — after dropping a bowl. Twice. Loudly." } }
    },
    {
      "id": "b10_16", "who": "vertuhai", "place": "yard", "block": 10,
      "text": { "ru": "«Сегодня двойная поверка. Кто опоздает — тот моет коридор», — предупреждает вертухай.", "en": "'Double roll call today. Late means mopping the corridor,' the guard warns." },
      "left": { "text": { "ru": "Прийти раньше всех", "en": "Show up early" }, "effects": { "suspicion": -11, "respect": -6, "health": -6 }, "reply": { "ru": "Стоял на плацу первым и мёрз двадцать минут. Зато образцовый.", "en": "First on the yard, frozen for twenty minutes. But exemplary." } },
      "right": { "text": { "ru": "Прийти впритык", "en": "Cut it fine" }, "effects": { "respect": 10, "suspicion": 8 }, "reply": { "ru": "Влетел последним. Успел, но вертухай запомнил твой затылок.", "en": "You slid in last. Made it — but the guard memorised the back of your head." } }
    },
    {
      "id": "b10_17", "who": "avtoritet", "place": "yard", "block": 10,
      "text": { "ru": "«Хочешь уйти — уходи. Но у меня одно условие», — старший по бараку смотрит в упор.", "en": "'Want out? Go. But I've got one condition,' the block boss says, staring hard." },
      "left": { "text": { "ru": "Слушать условие", "en": "Hear the condition" }, "effects": { "respect": 12, "suspicion": 9 }, "next": "b10_18", "reply": { "ru": "Он наклонился и назвал условие. Оно оказалось неожиданно скромным.", "en": "He leans in and names it. Turns out it's surprisingly modest." } },
      "right": { "text": { "ru": "Обойтись без условий", "en": "No conditions" }, "effects": { "suspicion": -9, "respect": -10 }, "reply": { "ru": "«Как хочешь». Он отвернулся, и во дворе стало прохладнее.", "en": "'Suit yourself.' He turns away and the yard gets a few degrees colder." } }
    },
    {
      "id": "b10_18", "who": "avtoritet", "place": "yard", "block": 10,
      "text": { "ru": "«Не бросай новенького одного в бараке. Обещаешь?»", "en": "'Don't leave the new kid on his own in the block. Promise?'" },
      "left": { "text": { "ru": "Обещать", "en": "Promise" }, "effects": { "respect": 13, "suspicion": -7, "health": -6 }, "next": "b10_19", "reply": { "ru": "Пожал руку. Теперь у тебя на одну заботу больше и на одного недоброжелателя меньше.", "en": "You shake on it. One more worry, one less enemy." } },
      "right": { "text": { "ru": "Ничего не обещать", "en": "Promise nothing" }, "effects": { "suspicion": 8, "respect": -8 }, "reply": { "ru": "«Не могу обещать». Честно — но воздух загустел.", "en": "'Can't promise that.' Honest — and the air thickens." } }
    },
    {
      "id": "b10_19", "who": "avtoritet", "place": "yard", "block": 10,
      "text": { "ru": "«Раз договорились — держи. Пригодится», — протягивает свёрнутую тряпку.", "en": "'Deal's a deal — take this. You'll need it,' he holds out a rolled-up cloth." },
      "left": { "text": { "ru": "Взять", "en": "Take it" }, "effects": { "respect": 11, "suspicion": 10 }, "reply": { "ru": "Внутри — рабочие рукавицы. Скучно и невероятно полезно.", "en": "Inside: work gloves. Boring and unbelievably useful." } },
      "right": { "text": { "ru": "Отказаться вежливо", "en": "Politely decline" }, "effects": { "suspicion": -11, "respect": -6, "health": 6 }, "reply": { "ru": "Отказался. Он кивнул: «Меньше несёшь — быстрее идёшь».", "en": "You decline. He nods: 'Less to carry, faster to walk.'" } }
    },
    {
      "id": "b10_20", "who": "elektrik", "place": "yard", "block": 10,
      "text": { "ru": "«Фонарь над воротами моргает. Чинить сегодня или пусть моргает?»", "en": "'The lamp over the gate is flickering. Fix it today, or let it blink?'" },
      "left": { "text": { "ru": "Пусть моргает", "en": "Let it blink" }, "effects": { "respect": 10, "suspicion": 9 }, "reply": { "ru": "Оставили. К вечеру двор мигает как гирлянда — удобно и очень заметно.", "en": "You leave it. By evening the yard blinks like fairy lights — handy and very noticeable." } },
      "right": { "text": { "ru": "Починить", "en": "Fix it" }, "effects": { "suspicion": -10, "respect": -7, "health": -6 }, "reply": { "ru": "Починил. Начальство довольно, а темнота ушла вместе с планом Б.", "en": "Fixed. The brass are pleased, and the darkness left along with plan B." } }
    },
    {
      "id": "b10_21", "who": "vertuhai", "place": "corridor", "block": 10,
      "text": { "ru": "«Стой. Почему у тебя ботинки зашнурованы двойным узлом?» — вертухай смотрит вниз.", "en": "'Hold up. Why the double knots in your boots?' The guard looks down." },
      "left": { "text": { "ru": "«Спорт, гражданин начальник»", "en": "'Sports, chief'" }, "effects": { "respect": 9, "suspicion": 7 }, "reply": { "ru": "«Бегаю по утрам». Он оглядел тебя и почти поверил.", "en": "'I jog in the mornings.' He looked you over and almost believed it." } },
      "right": { "text": { "ru": "Перешнуровать при нём", "en": "Re-lace right there" }, "effects": { "suspicion": -12, "respect": -8 }, "reply": { "ru": "Перешнуровал обычным узлом. Скучно — значит, безопасно.", "en": "You re-lace them plain. Boring means safe." } }
    },
    {
      "id": "b10_22", "who": "sokamernik", "place": "yard", "block": 10,
      "text": { "ru": "«Собрал вещи в мешок. Берём всё или оставляем половину?»", "en": "'Packed the bag. Take everything, or ditch half?'" },
      "left": { "text": { "ru": "Берём всё", "en": "Take it all" }, "effects": { "respect": 9, "health": -9, "suspicion": 8 }, "next": "b10_23", "reply": { "ru": "Мешок весит как мешок. Догадайся, кто его понесёт.", "en": "The bag weighs like a bag. Guess who's carrying it." } },
      "right": { "text": { "ru": "Оставить половину", "en": "Ditch half" }, "effects": { "suspicion": -9, "respect": -6, "health": 8 }, "reply": { "ru": "Выкинули лишнее. Сосед оплакивал вторую пару носков.", "en": "You dump the extras. He mourned the second pair of socks." } }
    },
    {
      "id": "b10_23", "who": "sokamernik", "place": "yard", "block": 10,
      "text": { "ru": "«Мешок гремит на каждом шаге. Перекладываем или обматываем?»", "en": "'The bag rattles with every step. Repack it, or wrap it?'" },
      "left": { "text": { "ru": "Обмотать тряпками", "en": "Wrap it in rags" }, "effects": { "respect": 10, "suspicion": -9, "health": -7 }, "reply": { "ru": "Обматывали до ломоты в пальцах. Зато мешок теперь похож на очень уставшую подушку.", "en": "You wrapped it until your fingers ached. Now the bag looks like an extremely tired pillow." } },
      "right": { "text": { "ru": "Переложить заново", "en": "Repack it" }, "effects": { "respect": 8, "health": -7, "suspicion": 7 }, "reply": { "ru": "Перекладывали час, спорили два. Зато тихо.", "en": "An hour packing, two hours arguing. But silent." } }
    },
    {
      "id": "b10_24", "who": "starik", "place": "yard", "block": 10,
      "text": { "ru": "«Скажу по-стариковски: не беги первым. Первый всегда виден», — вздыхает старик.", "en": "'Old man's advice: don't go first. The first one's always seen,' he sighs." },
      "left": { "text": { "ru": "Послушать совет", "en": "Take the advice" }, "effects": { "suspicion": -10, "respect": -7, "health": 7 }, "reply": { "ru": "Решил быть вторым. Скромно и удивительно разумно.", "en": "You decide to go second. Modest and weirdly sensible." } },
      "right": { "text": { "ru": "Идти первым", "en": "Go first" }, "effects": { "respect": 12, "suspicion": 9 }, "reply": { "ru": "«Первым так первым». Старик хмыкнул: «Молодость».", "en": "'First it is.' The old man snorts: 'Youth.'" } }
    },
    {
      "id": "b10_25", "who": "avtoritet", "place": "yard", "block": 10,
      "text": { "ru": "«Барак гудит, все всё чуют. Сказать им речь или пусть догадываются?»", "en": "'The block's buzzing, everyone senses it. Give them a speech, or let them guess?'" },
      "left": { "text": { "ru": "Сказать речь", "en": "Give a speech" }, "effects": { "respect": 13, "suspicion": 12 }, "reply": { "ru": "Сказал три слова про дружбу. Аплодировали дольше, чем стоило.", "en": "Three words about friendship. The applause lasted longer than was wise." } },
      "right": { "text": { "ru": "Молча кивнуть всем", "en": "Just nod to everyone" }, "effects": { "suspicion": -9, "respect": -7 }, "reply": { "ru": "Обошёл барак и каждому кивнул. Тихо — но кто-то ждал слов, а не кивка.", "en": "You walk the block and nod to each man. Quiet — though some wanted words, not a nod." } }
    },
    {
      "id": "b10_26", "who": "vertuhai", "place": "yard", "block": 10,
      "text": { "ru": "«Пересчёт! Один лишний... нет, показалось», — вертухай считает по головам второй раз.", "en": "'Head count! One too many... no, my mistake,' the guard counts a second time." },
      "left": { "text": { "ru": "Помочь считать", "en": "Help him count" }, "effects": { "respect": 8, "suspicion": -10, "health": -6 }, "next": "b10_27", "reply": { "ru": "Помог считать. Он благодарен, а ты теперь знаешь его порядок обхода.", "en": "You help him count. He's grateful — and now you know his route." } },
      "right": { "text": { "ru": "Стоять ровно", "en": "Stand still" }, "effects": { "suspicion": 7, "respect": -6, "health": 7 }, "reply": { "ru": "Стоял столбом и отдохнул. Он пересчитал трижды и всё равно недоволен.", "en": "You stand like a post and get a rest. He counts three times and stays unhappy." } }
    },
    {
      "id": "b10_27", "who": "vertuhai", "place": "corridor", "block": 10,
      "text": { "ru": "«Раз ты такой полезный — подежуришь у двери вечером?» — предлагает вертухай.", "en": "'Since you're so helpful — mind watching the door tonight?' the guard offers." },
      "left": { "text": { "ru": "Согласиться", "en": "Agree" }, "effects": { "respect": -7, "suspicion": -12, "health": -7 }, "reply": { "ru": "Согласился. Скучно, ноги гудят, зато ты теперь «надёжный человек у двери».", "en": "You agree. Dull, aching feet — but now you're 'the reliable guy at the door'." } },
      "right": { "text": { "ru": "Отказаться", "en": "Turn it down" }, "effects": { "respect": 11, "suspicion": 9 }, "reply": { "ru": "«Спина болит». Барак одобрительно загудел, вертухай — нет.", "en": "'Bad back.' The block hums approval. The guard does not." } }
    },
    {
      "id": "b10_28", "who": "sokamernik", "place": "yard", "block": 10,
      "text": { "ru": "«Всё. Дальше только вперёд. Последний раз посмотрим на этот двор?»", "en": "'That's it. Only forward now. One last look at this yard?'" },
      "left": { "text": { "ru": "Посмотреть", "en": "Take a look" }, "effects": { "respect": 10, "suspicion": 8, "health": 6 }, "reply": { "ru": "Постояли минуту. Двор как двор, но в горле что-то щёлкнуло.", "en": "You stand there a minute. Just a yard — but something catches in your throat." } },
      "right": { "text": { "ru": "Не оглядываться", "en": "Don't look back" }, "effects": { "suspicion": -11, "respect": -6 }, "reply": { "ru": "Пошёл не оборачиваясь. Так делают в кино и, оказывается, в жизни.", "en": "You walk on without turning. Like in the movies — and, it turns out, in real life." } }
    },
    {
      "id": "ev_b1_bread", "who": "baklan", "place": "canteen", "block": 1, "event": true, "weight": 0.6,
      "text": { "ru": "Баклан накрыл три кружки и гоняет под ними сухарь: «Уследишь — твой».", "en": "Baklan covers three cups and shuffles a rusk under them: 'Track it and it's yours.'" },
      "left": { "text": { "ru": "Не ведусь", "en": "Not falling for it" }, "effects": { "suspicion": -4, "respect": -6 }, "reply": { "ru": "Отошёл. Баклан свистел вслед: «Скучный!»", "en": "Walked off. Baklan whistled after you: 'Boring!'" } },
      "right": { "text": { "ru": "Слежу за кружкой", "en": "Track the cup" }, "effects": {}, "mini": "bread", "rewardWin": { "health": 14, "respect": 6 }, "rewardLose": { "respect": -8 } }
    },
    {
      "id": "ev_b2_pick", "who": "sokamernik", "place": "corridor", "block": 2, "event": true, "weight": 0.6,
      "text": { "ru": "«У вертухая в кармане твоя отобранная ложка. Вытащишь незаметно?» — шепчет сосед.", "en": "'The guard's pocket has your confiscated spoon. Lift it without him noticing?' your cellmate whispers." },
      "left": { "text": { "ru": "Не лезу", "en": "Leave it" }, "effects": { "suspicion": -6, "respect": -8 }, "reply": { "ru": "Прошёл мимо. Ложка уехала в коробку с изъятым.", "en": "Walked past. The spoon went into the confiscated box." } },
      "right": { "text": { "ru": "Тяну аккуратно", "en": "Lift it carefully" }, "effects": {}, "mini": "pickpocket", "rewardWin": { "respect": 16 }, "rewardLose": { "suspicion": 14 } }
    },
    {
      "id": "ev_b3_kitchen", "who": "povar", "place": "canteen", "block": 3, "event": true, "weight": 0.6,
      "text": { "ru": "Повар шлёт миски по раздаче одну за другой: «Успевай подставлять, не то всё на пол!»", "en": "The cook sends bowls down the counter one after another: 'Keep up or it's all on the floor!'" },
      "left": { "text": { "ru": "Отойти в сторону", "en": "Step aside" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Отошёл. Миски ловил кто-то другой, и слава ему.", "en": "Stepped back. Someone else caught them, bless him." } },
      "right": { "text": { "ru": "Ловлю", "en": "Catch them" }, "effects": {}, "mini": "kitchen", "rewardWin": { "health": 14, "respect": 8 }, "rewardLose": { "health": -12 } }
    },
    {
      "id": "ev_b4_brawl", "who": "baklan", "place": "yard", "block": 4, "event": true, "weight": 0.6,
      "text": { "ru": "Баклан лезет бодаться посреди двора: «Ну чё, потолкаемся до первого падения?»", "en": "Baklan squares up in the middle of the yard: 'Come on, shoving match, first one down?'" },
      "left": { "text": { "ru": "Слиться", "en": "Slip away" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Ушёл к лавке. Двор посмеялся, но и только.", "en": "Went to the bench. The yard chuckled, nothing more." } },
      "right": { "text": { "ru": "Толкаемся", "en": "Shove it out" }, "effects": {}, "mini": "brawl", "rewardWin": { "respect": 16 }, "rewardLose": { "health": -14, "respect": -4 } }
    },
    {
      "id": "ev_b5_chip", "who": "doktor", "place": "medbay", "block": 5, "event": true, "weight": 0.6,
      "text": { "ru": "Врач прячет витаминку под один из стаканчиков: «Найдёшь — твоя. Заодно проверим внимание».", "en": "The doctor hides a vitamin under one of the cups: 'Find it and it's yours. Tests your focus too.'" },
      "left": { "text": { "ru": "Мне не надо", "en": "I'll pass" }, "effects": { "health": -6, "suspicion": -4 }, "reply": { "ru": "Отказался. Врач пожал плечами и съел витаминку сам.", "en": "Declined. The doctor shrugged and ate the vitamin himself." } },
      "right": { "text": { "ru": "Слежу", "en": "Watch closely" }, "effects": {}, "mini": "chip", "rewardWin": { "health": 16 }, "rewardLose": { "health": -6 } }
    },
    {
      "id": "ev_b6_lock", "who": "bibliotekar", "place": "library", "block": 6, "event": true, "weight": 0.6,
      "text": { "ru": "«Шкаф с бланками заклинило, ключ потерян век назад. Пошевелишь скрепкой?» — вздыхает библиотекарь.", "en": "'The form cabinet is jammed and the key vanished a century ago. Fancy a go with a paperclip?' the librarian sighs." },
      "left": { "text": { "ru": "Я не мастер", "en": "I'm no locksmith" }, "effects": { "respect": -6, "suspicion": -6 }, "reply": { "ru": "Развёл руками. Бланки остались под замком до лучших времён.", "en": "Shrugged. The forms stayed locked up for better days." } },
      "right": { "text": { "ru": "Ковыряю скрепкой", "en": "Work the paperclip" }, "effects": {}, "mini": "lockpick", "rewardWin": { "respect": 14, "suspicion": 6 }, "rewardLose": { "suspicion": 12 } }
    },
    {
      "id": "ev_b7_dash", "who": "starik", "place": "laundry", "block": 7, "event": true, "weight": 0.6,
      "text": { "ru": "По проходу катят тележки одна за другой. «Проскочишь до сушилки — заберёшь сухое первым», — щурится старик.", "en": "Carts roll down the aisle one after another. 'Make it to the dryer and you get the dry stuff first,' the old man squints." },
      "left": { "text": { "ru": "Подожду", "en": "I'll wait" }, "effects": { "respect": -6, "health": -4 }, "reply": { "ru": "Дождался очереди. Достался ворох ещё влажного.", "en": "Waited your turn. Got a pile of still-damp laundry." } },
      "right": { "text": { "ru": "Проскочить", "en": "Make the run" }, "effects": {}, "mini": "dash", "rewardWin": { "respect": 12, "health": 6 }, "rewardLose": { "health": -12 } }
    },
    {
      "id": "ev_b8_saw", "who": "elektrik", "place": "workshop", "block": 8, "event": true, "weight": 0.6,
      "text": { "ru": "«Прут надо укоротить ровно по метке. Ножовку в руках держал?» — электрик протягивает полотно.", "en": "'This bar needs cutting right on the mark. Ever held a hacksaw?' The electrician holds out the blade." },
      "left": { "text": { "ru": "Пусть сам пилит", "en": "Let him saw it" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Отдал ножовку обратно. Электрик пилил и ворчал до обеда.", "en": "Handed the saw back. He sawed and grumbled till lunch." } },
      "right": { "text": { "ru": "Пилю по метке", "en": "Saw on the mark" }, "effects": {}, "mini": "sawbars", "rewardWin": { "respect": 16 }, "rewardLose": { "health": -10, "suspicion": 8 } }
    },
    {
      "id": "ev_b9_key", "who": "sokamernik", "place": "cell", "block": 9, "event": true, "weight": 0.6,
      "text": { "ru": "Сосед прячет болванку ключа под одну из мисок: «Запомнишь, под какой? На побеге память пригодится».", "en": "Your cellmate hides a key blank under one of the bowls: 'Remember which? Memory matters on the run.'" },
      "left": { "text": { "ru": "Не до игр", "en": "No time for games" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Отмахнулся. Сосед обиженно ссыпал миски в стопку.", "en": "Waved it off. He stacked the bowls, offended." } },
      "right": { "text": { "ru": "Слежу за миской", "en": "Track the bowl" }, "effects": {}, "mini": "key", "rewardWin": { "respect": 14 }, "rewardLose": { "suspicion": 10 } }
    },
    {
      "id": "ev_b10_brawl", "who": "baklan", "place": "yard", "block": 10, "event": true, "weight": 0.6,
      "text": { "ru": "Перед самым рывком Баклан преграждает дорогу: «Докажи, что готов. Толкнёмся напоследок?»", "en": "Right before the run Baklan blocks your path: 'Prove you're ready. One last shoving match?'" },
      "left": { "text": { "ru": "Не время", "en": "Not now" }, "effects": { "respect": -8, "suspicion": -4 }, "reply": { "ru": "Обошёл его молча. Нервы дороже.", "en": "Walked around him without a word. Nerves are worth more." } },
      "right": { "text": { "ru": "Толкнёмся", "en": "Bring it" }, "effects": {}, "mini": "brawl", "rewardWin": { "respect": 16 }, "rewardLose": { "health": -12 } }
    }
  ],

  "//escapeCards": "Карты ПОБЕГА (спека 2026-07-18): block:N, escape:true. Двигают шкалу побега. Форсятся движком на границе блока в «Побеге». Одна сторона — удачная попытка (+escape), другая — срыв (0). Неудача ОБЯЗАНА объяснить, почему ты снова внутри (правило номер один).",
  "escapeCards": [
    {
      "id": "e1_01", "who": "sokamernik", "place": "cell", "block": 1, "escape": true,
      "text": { "ru": "Сокамерник дёргает за рукав: «Во время пересчёта в толпе можно шмыгнуть за угол. Рискнём?»", "en": "Your cellmate tugs your sleeve: 'During the head count you could slip round the corner in the crowd. Risk it?'" },
      "left": { "text": { "ru": "Ныряю в суматоху", "en": "Dive into the chaos" }, "effects": { "escape": 29 }, "reply": { "ru": "Ты почти дошёл до поворота — но вертухай начал считать по головам. Юркнул обратно в строй. Зато высмотрел, где слепой угол.", "en": "You nearly made the corner — then the guard started counting heads. Ducked back in line. But now you know where the blind spot is." } },
      "right": { "text": { "ru": "Не сейчас, рано", "en": "Not now, too soon" }, "effects": { "escape": 0 }, "reply": { "ru": "Толпа схлынула, момент ушёл. Зато никто ничего не заметил — целее будешь.", "en": "The crowd thinned, the moment passed. But nobody noticed a thing — you'll live longer." } }
    },
    {
      "id": "e1_02", "who": "novichok", "place": "canteen", "block": 1, "escape": true,
      "text": { "ru": "В столовке гам, дверь на кухню приоткрыта — а за ней, говорят, выход во двор. Сунешься?", "en": "The canteen's a racket, the kitchen door's ajar — and behind it, they say, is the yard. Make a break?" },
      "left": { "text": { "ru": "Рывок к двери", "en": "Bolt for the door" }, "effects": { "escape": 26 }, "reply": { "ru": "Добежал до порога — повар рявкнул, и ты сделал вид, что тянулся за солью. Но дорогу до кухни теперь знаешь.", "en": "Reached the threshold — the cook barked, and you pretended to reach for salt. Still, you know the way to the kitchen now." } },
      "right": { "text": { "ru": "Доедаю спокойно", "en": "Finish eating calmly" }, "effects": { "escape": 0 }, "reply": { "ru": "Момент профукал, зато пузо полное. Спешка в побеге — первый способ спалиться.", "en": "Blew the moment, but your belly's full. Rushing an escape is the fastest way to get caught." } }
    },
    {
      "id": "e1_03", "who": "baklan", "place": "canteen", "block": 1, "escape": true,
      "text": { "ru": "Баклан свистит: «Ворота открыли для хлебовозки! Запрыгнем в кузов — и на волю?»", "en": "The mouthy kid hisses: 'They opened the gate for the bread truck! Jump in the back — and out we go?'" },
      "left": { "text": { "ru": "За машиной!", "en": "After the truck!" }, "effects": { "escape": 31 }, "reply": { "ru": "Ты почти запрыгнул в кузов — но там сидел вертухай с термосом. Сделал вид, что считаешь булки. Теперь знаешь расписание хлебовозки.", "en": "You almost made the truck bed — but a guard sat there with a thermos. You pretended to count loaves. Now you know the bread truck's schedule." } },
      "right": { "text": { "ru": "Это ловушка", "en": "It's a trap" }, "effects": { "escape": 0 }, "reply": { "ru": "Машина уехала пустой — без тебя. Может, и к лучшему: за рулём сидел кум.", "en": "The truck drove off empty — without you. Maybe for the best: the warden's man was at the wheel." } }
    },
    {
      "id": "e2_01", "who": "elektrik", "place": "corridor", "block": 2, "escape": true,
      "text": { "ru": "Есть болванка под ключ от коридорной решётки. Провернёшь замок?", "en": "There's a blank cut for the corridor grille key. Try turning the lock?" },
      "left": { "text": { "ru": "Проворачиваю", "en": "Turn it" }, "effects": { "escape": 29 }, "reply": { "ru": "Замок щёлкнул… и заклинил на полповорота. Ты выдернул болванку за миг до обхода. Зато форму ключа теперь знаешь точно.", "en": "The lock clicked… and jammed halfway. You yanked the blank out a breath before the patrol. But now you know the key's exact shape." } },
      "right": { "text": { "ru": "Дотачиваю напильником", "en": "File it down more" }, "effects": { "escape": 0 }, "reply": { "ru": "Решил не спешить с сырой болванкой. Мудро — вчера на такой же спалился сосед.", "en": "Decided not to rush a rough blank. Wise — a neighbour got nabbed on one just like it yesterday." } }
    },
    {
      "id": "e2_02", "who": "sokamernik", "place": "corridor", "block": 2, "escape": true,
      "text": { "ru": "Сосед торопит: «Обход прошёл, коридор пустой минут пятнадцать. Ломим к решётке?»", "en": "Your cellmate rushes you: 'Patrol's done, the corridor's clear for fifteen minutes. Push for the grille?'" },
      "left": { "text": { "ru": "Ломим", "en": "Go for it" }, "effects": { "escape": 31 }, "reply": { "ru": "Вы добежали до решётки — а там новый навесной замок, повесили утром. Метнулись назад. Зато выяснили: замки меняют по утрам.", "en": "You reached the grille — but there's a new padlock, hung this morning. Bolted back. Still, you learned they swap locks at dawn." } },
      "right": { "text": { "ru": "Ждём другого окна", "en": "Wait for a better window" }, "effects": { "escape": 0 }, "reply": { "ru": "Досидели — и точно: через минуту вертухай вернулся раньше срока. Чуйка не подвела.", "en": "Sat tight — and sure enough, the guard came back early a minute later. Your gut was right." } }
    },
    {
      "id": "e2_03", "who": "prapor", "place": "corridor", "block": 2, "escape": true,
      "text": { "ru": "В прачечной сохнет китель вольнонаёмного, а рядом на прищепке — пропуск. Примеришь роль?", "en": "A civilian staffer's jacket hangs drying in the laundry, a pass clipped right beside it. Try the role on?" },
      "left": { "text": { "ru": "Надеть китель", "en": "Put on the jacket" }, "effects": { "escape": 29 }, "reply": { "ru": "Китель сел как влитой, с пропуском на груди ты прошёл мимо поста — вахтёр кивнул как своему. До ворот рукой подать, ты присмотрел лазейку и вернулся дошлифовать план.", "en": "The jacket fit like a glove, pass on your chest, you strolled past the post — the watchman nodded like you belonged. The gate's within reach; you scoped the gap and slipped back to polish the plan." } },
      "right": { "text": { "ru": "Сперва изучить пропуск", "en": "Check the pass first" }, "effects": { "escape": 0 }, "reply": { "ru": "Пригляделся — а на пропуске фото и печать, за ночь не подделать. Снял китель, повесил обратно. Зато высмотрел, в какие часы прачечная без присмотра.", "en": "Looked closer — the pass has a photo and a stamp, no faking that overnight. Hung the jacket back up. Still, you clocked the hours the laundry sits unwatched." } }
    },
    {
      "id": "e2_04", "who": "starik", "place": "corridor", "block": 2, "escape": true,
      "text": { "ru": "Старик шепнул: за кладовкой в конце коридора — старый лаз, заложенный кирпичом. Пойдёшь ковырять?", "en": "The old man whispered: behind the storeroom at the corridor's end there's an old crawlway, bricked up. Go pick at it?" },
      "left": { "text": { "ru": "Ковырять кирпич", "en": "Pry at the brick" }, "effects": { "escape": 0 }, "reply": { "ru": "Поддел кирпич черенком — раствор свежий, кто-то уже замуровал наглухо. Хруст услышал вертухай на обходе, ты сделал вид, что завязываешь шнурок. Отложил — но узнал, что лаз ещё помнят.", "en": "Pried a brick with a handle — fresh mortar, someone sealed it tight already. A guard on his round heard the crunch; you played it off as tying your lace. Shelved it — but learned the crawlway's not forgotten." } },
      "right": { "text": { "ru": "Сначала простукать стену", "en": "Tap the wall first" }, "effects": { "escape": 26 }, "reply": { "ru": "Прошёлся костяшкой по кладке — в углу отозвалось пустотой. Там кирпич шатается, за ним ход. Запомнил место и ушёл, пока никто не видел. Полдела сделано.", "en": "Knuckled along the brickwork — one corner rang hollow. A loose brick there, a passage behind it. Marked the spot and left before anyone looked. Half the job's done." } }
    },
    {
      "id": "e3_01", "who": "sokamernik", "place": "canteen", "block": 3, "escape": true,
      "text": { "ru": "Со стола на кухне можно смахнуть крепкую ложку — черенок как раз под подкоп. Брать?", "en": "You could sweep a sturdy spoon off the kitchen table — the handle's just right for digging. Grab it?" },
      "left": { "text": { "ru": "Тяну ложку в рукав", "en": "Slip it up my sleeve" }, "effects": { "escape": 29 }, "reply": { "ru": "Ложка нырнула в рукав, повар и не глянул. Черенок для подкопа теперь есть.", "en": "The spoon vanished up your sleeve, the cook never looked. Now you've got a digging tool." } },
      "right": { "text": { "ru": "Жду, пока отвернётся", "en": "Wait till he turns" }, "effects": { "escape": 0 }, "reply": { "ru": "Повар обернулся именно на тебя — ложку пришлось оставить. Зато высмотрел, где лежат самые крепкие.", "en": "The cook turned right at you — had to leave the spoon. Still, you spotted where the sturdy ones sit." } }
    },
    {
      "id": "e3_02", "who": "povar", "place": "canteen", "block": 3, "escape": true,
      "text": { "ru": "К чёрному ходу катят две тележки: одну с битой посудой, другую с бельём. В какую нырнуть?", "en": "Two carts roll toward the back door: one of chipped dishes, one of laundry. Which to dive into?" },
      "left": { "text": { "ru": "В тележку с посудой", "en": "Into the dish cart" }, "effects": { "escape": 0 }, "reply": { "ru": "Полез под тарелки — они звякнули на весь коридор, вертухай откинул тряпку. Пришлось вылезти. Зато понял: ждать надо бельевую.", "en": "Climbed under the plates — they clattered down the hall, the guard flipped the cloth back. Had to climb out. But now you know: wait for the laundry one." } },
      "right": { "text": { "ru": "В тележку с бельём", "en": "Into the laundry cart" }, "effects": { "escape": 30 }, "reply": { "ru": "Зарылся в бельё, докатили почти до самых ворот. Вылез размяться — но маршрут теперь весь твой.", "en": "Buried yourself in the laundry, rolled nearly to the gates. Climbed out to stretch — but the whole route's yours now." } }
    },
    {
      "id": "e3_03", "who": "novichok", "place": "canteen", "block": 3, "escape": true,
      "text": { "ru": "На гвозде у плиты висит ключ от чёрного хода кухни. Повар отошёл к котлу. Снять?", "en": "A key to the kitchen's back door hangs on a nail by the stove. The cook stepped over to the cauldron. Take it?" },
      "left": { "text": { "ru": "Снимаю ключ", "en": "Lift the key" }, "effects": { "escape": 31 }, "reply": { "ru": "Снял, вдавил в кусок мыла и повесил назад. Слепок в кармане — дверь считай открыта.", "en": "Lifted it, pressed it into a bar of soap, hung it back. The mold's in your pocket — that door's as good as open." } },
      "right": { "text": { "ru": "Дождусь, когда унесёт", "en": "Wait till he moves it" }, "effects": { "escape": -6 }, "reply": { "ru": "Повар вернулся и сунул ключ в карман — унёс с собой. Ты только зря проторчал у плиты, чуть суп не сжёг.", "en": "The cook came back and pocketed the key — carried it off. You just loitered by the stove and nearly burned the soup." } }
    },
    {
      "id": "e3_04", "who": "sokamernik", "place": "canteen", "block": 3, "escape": true,
      "text": { "ru": "Бак с очистками вывозят за кухню к воротам. Влезть в бак или подцепиться снаружи?", "en": "The scraps bin is being wheeled out past the kitchen to the gates. Climb inside it or hitch on outside?" },
      "left": { "text": { "ru": "Забираюсь в бак", "en": "Climb into the bin" }, "effects": { "escape": 0 }, "reply": { "ru": "Бак по пути опрокинули на компост — ты вывалился прямо под ноги дневальному. Сделал вид, что искал ложку. Зато засёк: до ворот бак не довозят.", "en": "Halfway there they tipped the bin onto the compost — you spilled out at the orderly's feet. Played it off as hunting for a spoon. But you clocked it: the bin never reaches the gates." } },
      "right": { "text": { "ru": "Цепляюсь сзади", "en": "Hitch on the back" }, "effects": { "escape": 27 }, "reply": { "ru": "Присел за тележкой, прокатился до самых ворот незамеченным. Спрыгнул размяться — маршрут теперь как на ладони.", "en": "Crouched behind the cart and rode to the very gates unseen. Hopped off to stretch — the route's laid out plain now." } }
    },
    {
      "id": "e4_01", "who": "sokamernik", "place": "yard", "block": 4, "escape": true,
      "text": { "ru": "«Под дальней лавкой земля мягкая. Ложкой за месяц — и мы под забором», — шепчет сосед.", "en": "'Ground under the far bench is soft. A spoon a month and we're under the fence,' your cellmate whispers." },
      "left": { "text": { "ru": "Копать по чуть-чуть", "en": "Dig a little daily" }, "effects": { "escape": 29 }, "reply": { "ru": "Каждую прогулку по горсти, землю в карманы и по дорожке. Ход пошёл, но пока упирается в бетон.", "en": "A handful each walk, dirt into your pockets and along the path. The tunnel's moving — but it hits concrete for now." } },
      "right": { "text": { "ru": "Копать сразу глубоко", "en": "Dig deep in one go" }, "effects": { "escape": -6 }, "reply": { "ru": "Лавка просела на глазах у всех, пришлось сесть сверху и делать вид, что загораешь. Яму засыпали до ужина.", "en": "The bench sagged in front of everyone; you sat on it pretending to sunbathe. The hole was filled in before dinner." } }
    },
    {
      "id": "e4_02", "who": "kot", "place": "yard", "block": 4, "escape": true,
      "text": { "ru": "Кот раз за разом идёт одним и тем же кривым маршрутом по двору — будто обходит что-то невидимое.", "en": "The cat keeps walking the same crooked route across the yard, as if steering around something invisible." },
      "left": { "text": { "ru": "Пройти его маршрутом", "en": "Walk his route" }, "effects": { "escape": 0 }, "reply": { "ru": "Дошёл до середины — вертухай окликнул: «Ты чего петляешь?». Пришлось изобразить растяжку и вернуться в строй.", "en": "Halfway across, the guard shouted, 'Why are you zigzagging?' You faked a stretch and rejoined the line." } },
      "right": { "text": { "ru": "Наблюдать со стороны", "en": "Watch from the side" }, "effects": { "escape": 30 }, "reply": { "ru": "Три круга наблюдений — и слепая зона камер уложилась в голове как карта. Идти пока рано.", "en": "Three laps of watching and the camera blind spot is mapped in your head. Too early to use it." } }
    },
    {
      "id": "e4_03", "who": "baklan", "place": "yard", "block": 4, "escape": true,
      "text": { "ru": "«За качалкой угол забора низкий. Подсажу — перемахнёшь», — Баклан складывает ладони лодочкой.", "en": "'The fence corner behind the gym is low. Give you a boost and you're over,' Baklan cups his hands." },
      "left": { "text": { "ru": "Замерить высоту", "en": "Measure it first" }, "effects": { "escape": 26 }, "reply": { "ru": "Померил угол шагами и плечами: не хватает полметра. Зато знаешь ровно, чего искать — ящик или подсадку повыше.", "en": "Measured it in steps and shoulder-heights: half a metre short. Now you know exactly what you need — a crate or a taller boost." } },
      "right": { "text": { "ru": "Прыгать прямо сейчас", "en": "Go for it now" }, "effects": { "escape": 0 }, "reply": { "ru": "Баклан покачнулся, ты сполз обратно и сел прямо на гантель. Шумно, обидно, и вертухай уже смотрит в ту сторону.", "en": "Baklan wobbled, you slid back down straight onto a dumbbell. Loud, humiliating, and the guard is already looking that way." } }
    },
    {
      "id": "e4_04", "who": "vertuhai", "place": "yard", "block": 4, "escape": true,
      "text": { "ru": "На построении тень от вышки накрывает половину шеренги. Считают по головам, быстро.", "en": "At lineup the tower's shadow covers half the row. They count heads fast." },
      "left": { "text": { "ru": "Встать в конец шеренги", "en": "Take the end of the row" }, "effects": { "escape": 0 }, "reply": { "ru": "С краю тебя пересчитали первым и трижды подряд. Ушёл в барак вместе со всеми — зато понял: считают всегда с конца.", "en": "On the end they counted you first and three times over. Walked back in with everyone — but now you know they always count from the end." } },
      "right": { "text": { "ru": "Встать в тень вышки", "en": "Stand in the tower's shadow" }, "effects": { "escape": 33 }, "reply": { "ru": "В тени тебя дважды пропустили при счёте и не заметили. Пока это только запас времени — но какой.", "en": "In the shadow they skipped you twice in the count and never noticed. Just a cushion of time so far — but what a cushion." } }
    },
    {
      "id": "e5_01", "who": "doktor", "place": "medbay", "block": 5, "escape": true,
      "text": { "ru": "В журнале врача — список тех, кого везут в больницу за забором. Строчку можно подправить.", "en": "The doc's log lists who gets transferred to the hospital outside the fence. A line could be edited." },
      "left": { "text": { "ru": "Подправить строчку", "en": "Edit the line" }, "effects": { "escape": 0 }, "reply": { "ru": "Чернила легли другим оттенком — заметно сразу, стёр и закрыл журнал. Зато запомнил, в какие дни идут перевозки.", "en": "The ink came out a shade off — obvious at a glance, so you rubbed it out and shut the log. Still, you learned which days the transfers run." } },
      "right": { "text": { "ru": "Выучить симптомы", "en": "Study the symptoms" }, "effects": { "escape": 29 }, "reply": { "ru": "Пролистал страницу с диагнозами и запомнил три, с которыми везут за забор. Пока всё ещё в палате — но теперь знаешь, чем «болеть».", "en": "You skimmed the diagnoses page and memorised three that get you shipped out. Still in the ward — but now you know what to 'have'." } }
    },
    {
      "id": "e5_02", "who": "sokamernik", "place": "medbay", "block": 5, "escape": true,
      "text": { "ru": "«Окно в перевязочной без решётки», — шепчет сосед. — «Правда, на втором этаже».", "en": "'The dressing room window has no bars,' your cellmate whispers. 'Second floor, though.'" },
      "left": { "text": { "ru": "Проверить шпингалет", "en": "Check the latch" }, "effects": { "escape": 27 }, "reply": { "ru": "Шпингалет поддался с третьего раза и остался незакрытым. Спускаться пока не на чем — но окно теперь твоё.", "en": "The latch gave on the third try and stayed unlocked. Nothing to climb down on yet — but that window is yours now." } },
      "right": { "text": { "ru": "Лезть прямо сейчас", "en": "Go out right now" }, "effects": { "escape": -6 }, "reply": { "ru": "Свесился и понял: до земли целый этаж, а внизу стоит дежурный. Влез обратно и сделал вид, что проветривал.", "en": "You hung out and realised: a full storey down, with a duty guard standing below. You climbed back in and pretended you were airing the room." } }
    },
    {
      "id": "e5_03", "who": "novichok", "place": "corridor", "block": 5, "escape": true,
      "text": { "ru": "По коридору катят пустую каталку под простынёй. Новенький кивает: «Никто под неё не заглядывает».", "en": "An empty gurney rolls down the hall under a sheet. The new guy nods: 'Nobody ever looks under it.'" },
      "left": { "text": { "ru": "Лечь под простыню", "en": "Lie under the sheet" }, "effects": { "escape": 0 }, "reply": { "ru": "Лёг — и чихнул на первом же повороте. Санитар решил, что показалось, но ты слез: дышать так тихо невозможно.", "en": "You lay down and sneezed at the first corner. The orderly figured he'd imagined it, but you slid off: breathing that quietly is impossible." } },
      "right": { "text": { "ru": "Замерить маршрут", "en": "Time the route" }, "effects": { "escape": 30 }, "reply": { "ru": "Прошёл рядом и засёк: от палаты до задней двери сорок секунд и один пост. Ты всё ещё внутри, но маршрут теперь в голове.", "en": "You walked alongside and counted: forty seconds from ward to back door, one checkpoint. Still inside, but the route is in your head now." } }
    },
    {
      "id": "e5_04", "who": "vertuhai", "place": "medbay", "block": 5, "escape": true,
      "text": { "ru": "У задней двери стоит машина медслужбы. Водитель ушёл за подписью, вертухай смотрит в другую сторону.", "en": "A medical van waits at the back door. The driver's off getting a signature; the guard is looking the other way." },
      "left": { "text": { "ru": "Поговорить с водителем", "en": "Talk to the driver" }, "effects": { "escape": 31 }, "reply": { "ru": "Поболтал про футбол и узнал: кузов не запирают до самой погрузки. Ты по-прежнему внутри — но теперь с расписанием рейсов.", "en": "You chatted football and learned the cargo door stays unlocked right up to loading. Still inside — but now you've got the run schedule." } },
      "right": { "text": { "ru": "Забраться в кузов", "en": "Get in the back" }, "effects": { "escape": 0 }, "reply": { "ru": "Дверца скрипнула так, что вертухай обернулся. Отскочил и стал изучать расписание на стене — машина уехала без тебя.", "en": "The door creaked loud enough to turn the guard's head. You bounced back and studied the wall schedule instead — the van left without you." } }
    },
    {
      "id": "e6_01", "who": "prapor", "place": "corridor", "block": 6, "escape": true,
      "text": { "ru": "На стенде висит образец пропуска. Бумага, ручка и полчаса тишины у тебя есть.", "en": "A sample pass hangs on the noticeboard. You have paper, a pen and half an hour of quiet." },
      "left": { "text": { "ru": "Срисовать образец", "en": "Copy the sample" }, "effects": { "escape": 29 }, "reply": { "ru": "Копия вышла похожей до запятой. Спрятал в книгу — пригодится, но идти пока рано.", "en": "The copy matches down to the comma. Hid it inside a book — useful later, too soon to walk." } },
      "right": { "text": { "ru": "Взять чистый бланк", "en": "Take a blank form" }, "effects": { "escape": 0 }, "reply": { "ru": "Бланки оказались под номерами, недостача всплыла к вечеру — пришлось вернуть на место и остаться за решёткой.", "en": "The blanks are numbered; the shortfall surfaced by evening, so I put it back and stayed behind the bars." } }
    },
    {
      "id": "e6_02", "who": "bibliotekar", "place": "library", "block": 6, "escape": true,
      "text": { "ru": "В стопке возвратов лежит справка о переводе в другое учреждение. Фамилия вписана карандашом.", "en": "In the returns pile sits a transfer certificate to another facility. The name is pencilled in." },
      "left": { "text": { "ru": "Стереть карандаш", "en": "Erase the pencil" }, "effects": { "escape": 0 }, "reply": { "ru": "Ластик оставил дыру, бумага просвечивает — с такой справкой не пройдёшь и первую дверь. Сунул обратно, зато знаю, где они лежат.", "en": "The eraser tore a hole and the paper's see-through — that wouldn't get me past the first door. Slid it back, but now I know where they live." } },
      "right": { "text": { "ru": "Запомнить формулировки", "en": "Memorise the wording" }, "effects": { "escape": 31 }, "reply": { "ru": "Выучил все обороты наизусть. Своя бумага будет звучать как настоящая — писать пока не на чем.", "en": "Learned every phrase by heart. My own paper will read as genuine — nothing to write it on yet." } }
    },
    {
      "id": "e6_03", "who": "starik", "place": "library", "block": 6, "escape": true,
      "text": { "ru": "«Раньше по письму-вызову людей отсюда забирали», — старик кивает на старый конверт с печатью.", "en": "'Back in the day a summons letter could get you collected,' the old man nods at an old stamped envelope." },
      "left": { "text": { "ru": "Снять оттиск печати", "en": "Lift the stamp" }, "effects": { "escape": 30 }, "reply": { "ru": "Оттиск на варёном яйце вышел бледный, но читаемый. Прячу под матрас — нужен ещё правильный конверт.", "en": "The impression on a boiled egg came out faint but legible. Hiding it under the mattress — still need the right envelope." } },
      "right": { "text": { "ru": "Забрать конверт", "en": "Pocket the envelope" }, "effects": { "escape": -6 }, "reply": { "ru": "Конверт хватились на выдаче через час, пошли по столам. Подкинул обратно на полку и остался сидеть, где сидел.", "en": "They missed the envelope within the hour and started checking desks. Dropped it back on the shelf and stayed exactly where I was." } }
    },
    {
      "id": "e6_04", "who": "sokamernik", "place": "library", "block": 6, "escape": true,
      "text": { "ru": "«Раз в месяц отсюда вывозят стопки списанных бумаг. Большие стопки», — сосед многозначительно смотрит.", "en": "'Once a month they cart out stacks of discarded paperwork. Big stacks,' your cellmate says meaningfully." },
      "left": { "text": { "ru": "Залезть в стопку", "en": "Get in the stack" }, "effects": { "escape": 0 }, "reply": { "ru": "Влез, чихнул от пыли и выдал себя на первой минуте — вывели обратно под смех всей библиотеки. Зато выяснил график вывоза.", "en": "Climbed in, sneezed from the dust and blew it in a minute — marched back inside to the whole library laughing. Did learn the pickup schedule." } },
      "right": { "text": { "ru": "Измерить ящики", "en": "Measure the crates" }, "effects": { "escape": 27 }, "reply": { "ru": "Померил шагами и локтями: человек влезает, если не дышать. Записал в тетрадь и жду вывоза.", "en": "Paced and measured: a person fits if he doesn't breathe. Noted it down and I'm waiting for pickup day." } }
    },
    {
      "id": "e7_01", "who": "sokamernik", "place": "laundry", "block": 7, "escape": true,
      "text": { "ru": "«Тележка для белья глубокая, как колодец», — сокамерник заглядывает внутрь. «Влезешь — и покатили».", "en": "'This linen cart is deep as a well,' your cellmate peers inside. 'Climb in and we roll.'" },
      "left": { "text": { "ru": "Залезть в тележку", "en": "Climb in the cart" }, "effects": { "escape": 29 }, "reply": { "ru": "Прокатили через два поста под простынями. У склада выгрузили — дальше не пустили, зато весь путь ты запомнил.", "en": "Rolled past two posts buried in sheets. Unloaded at the storeroom — no farther, but you memorized the whole route." } },
      "right": { "text": { "ru": "Сперва проверить колёса", "en": "Check the wheels first" }, "effects": { "escape": 0 }, "reply": { "ru": "Колесо завизжало на весь коридор, вертухай обернулся — тележку откатили назад, а тебя отправили мыть пол. Зато ясно: нужна смазка.", "en": "A wheel shrieked down the hall, the guard turned — the cart went back and you got mop duty. Lesson: it needs grease." } }
    },
    {
      "id": "e7_02", "who": "starik", "place": "laundry", "block": 7, "escape": true,
      "text": { "ru": "«В чужих тряпках чего только нет», — старик кивает на гору белья. «Гражданское собирать думаешь?»", "en": "'All sorts turn up in other people's rags,' the old man nods at the pile. 'Thinking of putting together some civvies?'" },
      "left": { "text": { "ru": "Взять сразу комплект", "en": "Grab a full set" }, "effects": { "escape": -6 }, "reply": { "ru": "Целый комплект пропал из описи разом — прапор поднял шум, всё пришлось вернуть под его взглядом. Слишком жадно вышло.", "en": "A whole set vanished from the inventory at once — the quartermaster made noise and you handed it all back under his stare. Too greedy." } },
      "right": { "text": { "ru": "По одной вещи в неделю", "en": "One item a week" }, "effects": { "escape": 26 }, "reply": { "ru": "Рубаха на этой неделе, штаны на следующей. Никто не заметил — под матрасом уже полгардероба, но выйти в нём пока некуда.", "en": "A shirt this week, trousers next. Nobody noticed — half a wardrobe under the mattress, though nowhere to wear it yet." } }
    },
    {
      "id": "e7_03", "who": "prapor", "place": "corridor", "block": 7, "escape": true,
      "text": { "ru": "Фургон прачечной сдаёт задом к воротам. Водитель ушёл подписывать накладную.", "en": "The laundry van backs up to the gates. The driver has gone off to sign the manifest." },
      "left": { "text": { "ru": "Помочь с погрузкой", "en": "Help with the loading" }, "effects": { "escape": 31 }, "reply": { "ru": "Таскал мешки и сосчитал всё: сколько ходок, где стоит охрана, когда кузов пустой. Обратно зашёл сам, спокойно.", "en": "Hauled sacks and counted it all: trips, guard posts, when the box is empty. Walked back inside on your own, calm as anything." } },
      "right": { "text": { "ru": "Проверить кузов изнутри", "en": "Check inside the box" }, "effects": { "escape": 0 }, "reply": { "ru": "Едва залез — водитель вернулся раньше и захлопнул створку. Вылез через боковую щель и сказал, что искал носок. Поверили с трудом.", "en": "Barely climbed in when the driver came back early and slammed the door. Squeezed out a side gap and claimed you were hunting a lost sock. They half believed it." } }
    },
    {
      "id": "e7_04", "who": "novichok", "place": "laundry", "block": 7, "escape": true,
      "text": { "ru": "«Тут шахта бельепровода», — новенький светит вниз фонариком. «Она аж на первый этаж уходит».", "en": "'Here's the laundry chute,' the new guy shines a light down. 'Goes all the way to the ground floor.'" },
      "left": { "text": { "ru": "Спуститься по шахте", "en": "Go down the chute" }, "effects": { "escape": 0 }, "reply": { "ru": "Застрял на втором изгибе и выбирался обратно ногами вперёд полчаса. Вывод: без верёвки туда лезть нечего.", "en": "Got wedged at the second bend and wormed back out feet first for half an hour. Verdict: no rope, no chute." } },
      "right": { "text": { "ru": "Спустить мешок с меткой", "en": "Send a marked sack" }, "effects": { "escape": 27 }, "reply": { "ru": "Скинул мешок на нитке и засёк падение. Теперь знаешь длину шахты и куда она выводит — осталось придумать, как пролезть.", "en": "Dropped a sack on a thread and timed the fall. Now you know the chute's length and where it lets out — just need a way to fit." } }
    },
    {
      "id": "e8_01", "who": "sokamernik", "place": "workshop", "block": 8, "escape": true,
      "text": { "ru": "«Из брезента можно сшить форму, как у вертухая, — шепчет сосед у швейной машинки. — Только пуговицы разные».", "en": "'We could sew a guard's uniform out of this canvas,' your cellmate whispers by the sewing machine. 'The buttons are all wrong, though.'" },
      "left": { "text": { "ru": "Шить как есть", "en": "Sew it as is" }, "effects": { "escape": 0 }, "reply": { "ru": "Форма вышла ладная, но пуговицы блестели не так — прапор заметил на первой же примерке и списал брезент. Ты снова у станка, зато знаешь, какие нужны пуговицы.", "en": "The uniform came out neat, but the buttons shone wrong and the quartermaster spotted it at the first fitting and wrote off the canvas. Back at the bench — but now you know which buttons you need." } },
      "right": { "text": { "ru": "Сначала найти пуговицы", "en": "Find the buttons first" }, "effects": { "escape": 29 }, "reply": { "ru": "Полторы недели собирал пуговицы по одной из ящика с браком. Форма готова и ждёт своего часа под матрасом — пока ты просто примерный работяга.", "en": "Ten days of picking buttons one at a time out of the scrap bin. The uniform's finished and waiting under the mattress — for now you're just a model worker." } }
    },
    {
      "id": "e8_02", "who": "starik", "place": "workshop", "block": 8, "escape": true,
      "text": { "ru": "«Решётка на окне мастерской старая, — старик кивает на пыльное стекло. — Пилить тихо или быстро?»", "en": "'That grate on the workshop window is old,' the old man nods at the dusty glass. 'Do we cut it quiet or quick?'" },
      "left": { "text": { "ru": "Тихо, под шум станков", "en": "Quiet, under the machines" }, "effects": { "escape": 31 }, "reply": { "ru": "Пилил по чуть-чуть, пока ревел токарный. Пропил замазал мылом с опилками — не видно. Пока сидишь, но решётка уже держится на честном слове.", "en": "Cut a little at a time while the lathe roared. Packed the groove with soap and sawdust — invisible. Still inside, but that grate is hanging on by a thread." } },
      "right": { "text": { "ru": "Быстро, пока никого", "en": "Quick, while it's empty" }, "effects": { "escape": -6 }, "reply": { "ru": "Полотно взвизгнуло на весь цех, вертухай пришёл проверять окна. Пришлось бросить всё и делать вид, что моешь стекло — теперь окна на особом счету.", "en": "The blade shrieked across the whole shop and the guard came to check the windows. You dropped everything and pretended to wash the glass — now the windows are on the watch list." } }
    },
    {
      "id": "e8_03", "who": "elektrik", "place": "workshop", "block": 8, "escape": true,
      "text": { "ru": "«Слепок ключа от склада у меня есть, — электрик кивает на станок. — Точить по слепку или на глаз?»", "en": "'I've got an impression of the store room key,' the electrician nods at the machine. 'Cut it to the mould or by eye?'" },
      "left": { "text": { "ru": "Точить на глаз", "en": "Cut it by eye" }, "effects": { "escape": 0 }, "reply": { "ru": "Ключ вошёл, но не повернулся — бородка на волос длиннее. Замок цел, ты снова в цеху с опилками в кармане, зато теперь знаешь точный размер.", "en": "The key slid in but wouldn't turn — a hair too long. The lock's fine, you're back at the bench with filings in your pocket, but now you know the exact size." } },
      "right": { "text": { "ru": "Точить по слепку", "en": "Cut it to the mould" }, "effects": { "escape": 27 }, "reply": { "ru": "Три вечера подгонял по миллиметру. Ключ мягко щёлкнул в пробном замке — осталось дождаться нужной смены.", "en": "Three evenings of filing a fraction at a time. The key clicked softly in the test lock — now you just wait for the right shift." } }
    },
    {
      "id": "e8_04", "who": "prapor", "place": "corridor", "block": 8, "escape": true,
      "text": { "ru": "Ящики с готовой продукцией ждут вывоза. «Грузим верхний или нижний?» — прапор сверяется с описью.", "en": "Crates of finished goods wait for pickup. 'Load the top one or the bottom one?' the quartermaster checks his list." },
      "left": { "text": { "ru": "Верхний, его берут первым", "en": "Top one, it goes first" }, "effects": { "escape": 30 }, "reply": { "ru": "Ты незаметно переставил метки: нужный ящик теперь уходит последним рейсом, когда охрана уже зевает. Сам пока внутри, но маршрут ясен.", "en": "You quietly swapped the labels: the right crate now goes on the last run, when the guards are yawning. Still inside yourself, but the route is clear." } },
      "right": { "text": { "ru": "Нижний, он глубже", "en": "Bottom one, it's deeper" }, "effects": { "escape": 0 }, "reply": { "ru": "Нижний оказался с образцами — его вскрыли прямо у ворот для проверки. Хорошо, что ты в нём ещё не устроился: сидишь в цеху и вычёркиваешь этот вариант.", "en": "The bottom crate held samples — they cracked it open right at the gate. Lucky you hadn't climbed in yet: you're back in the shop, crossing that option off." } }
    },
    {
      "id": "e8_05", "who": "elektrik", "place": "workshop", "block": 8, "escape": true,
      "text": { "ru": "«Прожектор во дворе питается от нашего щитка, — электрик крутит провод. — Гасить весь двор или только дальний угол?»", "en": "'The yard floodlight runs off our panel,' the electrician twirls a wire. 'Kill the whole yard or just the far corner?'" },
      "left": { "text": { "ru": "Весь двор", "en": "The whole yard" }, "effects": { "escape": 0 }, "reply": { "ru": "Двор потемнел целиком — через минуту сбежалась вся смена с фонарями и пересчитала всех по головам. Свет вернули, а тебя вернули в цех.", "en": "The whole yard went black — a minute later the entire shift showed up with torches and counted every head. The lights came back, and so did you." } },
      "right": { "text": { "ru": "Только дальний угол", "en": "Just the far corner" }, "effects": { "escape": 26 }, "reply": { "ru": "Один фонарь просто «перегорел». Никто не всполошился, а у забора теперь есть тёмная полоса шириной в три шага.", "en": "One lamp simply 'burned out'. Nobody panicked, and now there's a dark strip three paces wide along the fence." } }
    },
    {
      "id": "e9_01", "who": "sokamernik", "place": "yard", "block": 9, "escape": true,
      "text": { "ru": "На построении в дальнем ряду началась толкотня — все сбились в кучу.", "en": "At the head count, a shoving match breaks out in the back row and everyone clumps together." },
      "left": { "text": { "ru": "Нырнуть в толпу", "en": "Slip into the crowd" }, "effects": { "escape": 29 }, "reply": { "ru": "Прошёл вдоль строя незамеченным до самых складов. Дальше забор, но путь теперь известен.", "en": "You drifted along the line unseen all the way to the storage sheds. The fence is still ahead, but now you know the route." } },
      "right": { "text": { "ru": "Стоять ровно", "en": "Hold your place" }, "effects": { "escape": 0 }, "reply": { "ru": "Остался в строю — и не зря: вертухаи пересчитали всех дважды. Толкотня была просто спором за место у стены.", "en": "You held the line — good call: guards counted twice. The shoving was just an argument over the wall spot." } }
    },
    {
      "id": "e9_02", "who": "elektrik", "place": "cell", "block": 9, "escape": true,
      "text": { "ru": "«Щиток открыт. Барак можно погасить прямо сейчас», — шепчет электрик.", "en": "'Breaker box is open. I can kill the lights in the block right now,' the electrician whispers." },
      "left": { "text": { "ru": "Гасить свет", "en": "Cut the lights" }, "effects": { "escape": -6 }, "reply": { "ru": "Темнота продержалась восемь секунд — сработал запасной контур, и в барак сразу зашли с фонарями. Пришлось лечь и притвориться спящим.", "en": "The dark lasted eight seconds — a backup circuit kicked in and guards walked in with flashlights. You lay down and faked sleep." } },
      "right": { "text": { "ru": "Ждать отбоя", "en": "Wait for lights-out" }, "effects": { "escape": 30 }, "reply": { "ru": "Дождался штатного отбоя и в общей темноте спокойно проверил решётку у сушилки. Один прут ходит.", "en": "You waited for the normal lights-out and calmly checked the grate by the drying room. One bar wiggles." } }
    },
    {
      "id": "e9_03", "who": "baklan", "place": "corridor", "block": 9, "escape": true,
      "text": { "ru": "«Могу заорать, что в бараке потоп. Все побегут!» — предлагает Баклан.", "en": "'I could yell that the block's flooding. Everyone'll run!' Baklan offers." },
      "left": { "text": { "ru": "Пусть орёт", "en": "Let him yell" }, "effects": { "escape": 27 }, "reply": { "ru": "Пока все неслись с тазами, ты спокойно засёк, за сколько охрана добегает до коридора. Сорок две секунды.", "en": "While everyone charged around with basins, you calmly timed how long guards take to reach the corridor. Forty-two seconds." } },
      "right": { "text": { "ru": "Приберечь на потом", "en": "Save it for later" }, "effects": { "escape": 0 }, "reply": { "ru": "Отложил тревогу — а зря: прапор как раз запер коридор на опись и никого не выпускал. Вернулся в барак ни с чем.", "en": "You held the alarm back — bad timing: the quartermaster had just locked the corridor for inventory and let nobody through. Back to the block empty-handed." } }
    },
    {
      "id": "e9_04", "who": "kot", "place": "yard", "block": 9, "escape": true,
      "text": { "ru": "Кот опрокинул стопку тазов у дальней стены. Грохот на весь двор.", "en": "The cat topples a stack of washtubs by the far wall. The clatter fills the yard." },
      "left": { "text": { "ru": "Идти на грохот", "en": "Head toward the noise" }, "effects": { "escape": 0 }, "reply": { "ru": "Пошёл посмотреть — и оказался в самой гуще сбежавшейся охраны. Постоял, покивал, ушёл вместе со всеми обратно в барак.", "en": "You went to look and landed in the middle of the guards who rushed over. You stood, nodded, and walked back inside with everyone else." } },
      "right": { "text": { "ru": "Идти в другую сторону", "en": "Head the other way" }, "effects": { "escape": 31 }, "reply": { "ru": "Пока все смотрели на тазы, дошёл до угла ограждения и нашёл, где сетка отходит от столба.", "en": "While everyone watched the tubs, you reached the fence corner and found where the mesh pulls away from the post." } }
    },
    {
      "id": "e10_01", "who": "sokamernik", "place": "yard", "block": 10, "escape": true,
      "text": { "ru": "«Два пути: тихо через прачечную или нагло через мастерскую. Решай!»", "en": "'Two ways: quiet through the laundry, or bold through the workshop. Your call!'" },
      "left": { "text": { "ru": "Через прачечную", "en": "Through the laundry" }, "effects": { "escape": 33 }, "reply": { "ru": "Выехал в тележке с бельём и вывалился уже за забором, в облаке чистых простыней. Свобода пахнет порошком!", "en": "You rode out in a laundry cart and tumbled out past the fence in a cloud of clean sheets. Freedom smells like detergent!" } },
      "right": { "text": { "ru": "Через мастерскую", "en": "Through the workshop" }, "effects": { "escape": 33 }, "reply": { "ru": "Вышел в рабочем комбинезоне, кивнул охране и уехал на грузовике с досками. Никто даже не спросил фамилию!", "en": "You walked out in overalls, nodded at the guards and left on a lumber truck. Nobody even asked your name!" } }
    },
    {
      "id": "e10_02", "who": "elektrik", "place": "corridor", "block": 10, "escape": true,
      "text": { "ru": "«Свет вырубаю. Пойдёшь по крыше или по кабельному тоннелю?»", "en": "'I'm killing the lights. Roof, or the cable tunnel?'" },
      "left": { "text": { "ru": "По крыше", "en": "Over the roof" }, "effects": { "escape": 33 }, "reply": { "ru": "Прошёл по крышам в полной темноте и спрыгнул в стог сена за периметром. Приземление — девять баллов из десяти!", "en": "You crossed the rooftops in the dark and dropped into a haystack outside the wire. Nine out of ten for the landing!" } },
      "right": { "text": { "ru": "По тоннелю", "en": "Through the tunnel" }, "effects": { "escape": 33 }, "reply": { "ru": "Прополз по кабельному тоннелю и вылез у дороги — весь в пыли и совершенно свободный!", "en": "You crawled the cable tunnel and popped out roadside — filthy, dusty and completely free!" } }
    },
    {
      "id": "e10_03", "who": "avtoritet", "place": "yard", "block": 10, "escape": true,
      "text": { "ru": "«Мы прикроем. Уходишь с колонной на работы или один, пока все смотрят на нас?»", "en": "'We'll cover you. Leave with the work column, or alone while everyone's watching us?'" },
      "left": { "text": { "ru": "С колонной", "en": "With the column" }, "effects": { "escape": 33 }, "reply": { "ru": "Встал в строй, вышел за ворота со всеми и на первом повороте просто пошёл прямо. Ворота остались позади!", "en": "You fell in with the column, walked out the gate with everyone and just kept going straight at the first turn. The gate's behind you!" } },
      "right": { "text": { "ru": "Один, под шумок", "en": "Alone, in the noise" }, "effects": { "escape": 33 }, "reply": { "ru": "Барак устроил такой концерт, что тебя никто не искал. Через забор — под общий хохот, и всё, воля!", "en": "The block put on such a show that nobody looked for you. Over the fence you went, to a roar of laughter — free!" } }
    },
    {
      "id": "e10_04", "who": "starik", "place": "yard", "block": 10, "escape": true,
      "text": { "ru": "«Старая калитка за котельной или дырка в заборе у сушилки. Обе рабочие, сынок».", "en": "'The old gate behind the boiler house, or the gap in the fence by the drying racks. Both work, son.'" },
      "left": { "text": { "ru": "Старая калитка", "en": "The old gate" }, "effects": { "escape": 33 }, "reply": { "ru": "Калитка открылась без единого скрипа — старик её сорок лет смазывал, будто знал. Ты на воле!", "en": "The gate swung open without a squeak — the old man had been oiling it for forty years, as if he knew. You're out!" } },
      "right": { "text": { "ru": "Дырка в заборе", "en": "The gap in the fence" }, "effects": { "escape": 33 }, "reply": { "ru": "Пролез боком, оставив на доске половину куртки. Куртке привет, тебе — свобода и свежий ветер!", "en": "You squeezed through sideways, leaving half your jacket on a plank. Farewell jacket, hello freedom and fresh wind!" } }
    }
  ]
};

export const CHARACTERS = CONTENT.characters;
export const BLOCK_CARDS = CONTENT.blockCards;
export const ESCAPE_CARDS = CONTENT.escapeCards;
