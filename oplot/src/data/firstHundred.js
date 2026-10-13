// Tactical checks inside the main campaign, interleaved with ordinary forts.
// HP * damage stays 1 before shared power normalization: these change the answer,
// not the total enemy budget. Some batteries survive an opening volley, while assault
// crews trade health for a dangerous first shot.
const STRUCTURAL_ENCOUNTERS={
  32:{shape:'twins',rows:3,cols:1,armor:'brick',types:['archer','shooter']},
  38:{shape:'bridge',rows:3,cols:3,armor:'iron',types:['cannon','archer']},
  42:{shape:'steps',rows:4,cols:1,armor:'gold',types:['shooter','cannon']},
  48:{shape:'keep',rows:3,cols:2,armor:'iron',types:['grenadier','shooter']},
  52:{shape:'twins',rows:4,cols:2,armor:'iron',types:['rocket','cannon']},
  58:{shape:'bridge',rows:4,cols:3,armor:'gold',types:['archer','grenadier']},
  62:{shape:'keep',rows:5,cols:1,armor:'iron',types:['cannon','shooter']},
  68:{shape:'steps',rows:4,cols:3,armor:'gold',types:['rocket','archer']},
  72:{shape:'twins',rows:5,cols:1,armor:'gold',types:['grenadier','cannon']},
  78:{shape:'bridge',rows:5,cols:2,armor:'iron',types:['shooter','rocket']},
  82:{shape:'keep',rows:4,cols:3,armor:'gold',types:['cannon','grenadier']},
  88:{shape:'steps',rows:5,cols:2,armor:'iron',types:['rocket','shooter']},
  92:{shape:'twins',rows:5,cols:3,armor:'gold',types:['cannon','rocket']},
  98:{shape:'bridge',rows:5,cols:3,armor:'gold',types:['grenadier','shooter']},
};

export function firstHundredFort(level){
  if(STRUCTURAL_ENCOUNTERS[level])return STRUCTURAL_ENCOUNTERS[level];
  if(level<35||level>100||level%10!==5)return null;
  if(level===55)return {rows:4,cols:3,armor:'iron',types:['cannon'],
    tactics:{id:'ambush',hp:.2,damage:5,armor:1}};
  if(level===75)return {rows:4,cols:2,armor:'iron',types:['grenadier'],
    tactics:{id:'bombardment',hp:.125,damage:8,armor:1}};
  // A late glass-artillery check. Its hp*damage budget is still neutral, but
  // an old, under-filled citadel cannot simply coast from the middle chapter.
  if(level===85)return {rows:3,cols:1,armor:'iron',types:['grenadier'],
    tactics:{id:'bombardment',hp:.03,damage:100/3,armor:1}};
  const damage=4+(level-35)/15;
  return {rows:5,cols:1,armor:'iron',types:['rocket','rocket','grenadier'],tactics:{id:'siege',hp:1/damage,damage,armor:1}};
}
