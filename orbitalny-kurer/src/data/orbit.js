export const TYPES={metal:{name:'Металл',color:'#59cbe8'},fuel:{name:'Топливо',color:'#f4dd62'},tech:{name:'Модули',color:'#d477ff'}};
export const STATIONS=[{id:'hab',name:'Жилая станция',color:'#7d8fff'},{id:'lab',name:'Лаборатория',color:'#59cbe8'},{id:'moon',name:'Лунная база',color:'#d477ff'}];
export const UPGRADES={hold:{name:'Грузовой отсек',base:80,max:6},scanner:{name:'Сканер',base:110,max:6},drone:{name:'Дрон-сборщик',base:180,max:5},tug:{name:'Орбитальный буксир',base:260,max:5}};
export const price=(id,level)=>Math.round(UPGRADES[id].base*Math.pow(1.78,level));
export const GOAL=44;
