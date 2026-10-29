import {RULES} from './progression.js';
export const CHAPTERS=[
 {id:1,start:1,end:12,art:30,scene:'palace',name:'Дворец цветущей сливы',short:'ДВОРЕЦ СЛИВЫ',prize:'Золотой карп',condition:'Заверши финал без перемешивания',help:'Подсказки и отмена для печати разрешены.',summary:'12 уровней + финал без перемешивания',stops:['У ворот','Цветущий мост','Тихая терраса','Ступени дворца','Чайный сад','Галерея карпов','Нефритовый двор','Тень сливы','Лунный мост','Золотая лестница','Сад перед рассветом','Печать дворца']},
 {id:2,start:13,end:24,art:31,scene:'bamboo',name:'Роща поющего бамбука',short:'БАМБУКОВАЯ РОЩА',prize:'Хранитель бамбука',condition:'Собери комбо ×5 и заверши финал',help:'Комбо нужно собрать в финале. Помощь разрешена.',summary:'12 уровней + комбо ×5 в финале',stops:['Зелёные ворота','Тропа ручья','Бамбуковый мост','Шёпот листвы','Солнечная поляна','Каменные ступени','Изумрудный поток','Привал у воды','Тропа панды','Поющий водопад','Тихая заводь','Печать рощи']}
];
export const chapterForLevel=level=>CHAPTERS.find(c=>level>=c.start&&level<=c.end);
export const chapterRun=run=>!run.daily&&chapterForLevel(run.level);
const versionOK=(run,c)=>c.id===1?[1,2].includes(run.chapterVersion):run.chapterVersion===2;
export const chapterFinal=run=>{const c=chapterRun(run);return !!c&&run.level===c.end&&versionOK(run,c);};
// Chapter one keeps its original local/cloud storage contract.
const progress=(save,c)=>c.id===1?save.meta.chapters:save.meta.chapters?.byId?.[c.id];
export function chapterStatus(save,difficulty,c=CHAPTERS[0]){
 const cleared=Array.from({length:12},(_,i)=>!!save.stars?.[`${difficulty}:${c.start+i}`]).filter(Boolean).length;
 const p=progress(save,c);return {cleared,seal:!!p?.seals?.[difficulty],claimed:!!p?.claimed};
}
export const trialPassed=run=>chapterRun(run)?.id===2?(run.bestCombo||0)>=5:!run.shufflesUsed&&!run.recoveries;
export function trialLabel(run){return chapterRun(run)?.id===2?`Финал · комбо ×5 ${trialPassed(run)?'✓':`(${run.bestCombo||0}/5)`}`:trialPassed(run)?'Финал · без перемешивания':'Печать: нужна новая попытка';}
export function completeChapter(save,run){
 const c=chapterRun(run);
 const compatible=run.rules===RULES||(run.rules==='jade-7'&&c?.id===1);
 if(!compatible||!run.won||!run.completed||!c||!versionOK(run,c))return {reward:false};
 const root=save.meta.chapters??={seals:{},claimed:false};
 const p=c.id===1?root:((root.byId??={})[c.id]??={seals:{},claimed:false});p.seals??={};
 if(chapterFinal(run)&&trialPassed(run))p.seals[run.difficulty]=true;
 const status=chapterStatus(save,run.difficulty,c);
 if(status.cleared!==12||!status.seal||p.claimed)return {reward:false,...status};
 p.claimed=true;if(!save.meta.owned.includes(c.art))save.meta.owned.push(c.art);
 return {reward:true,art:c.art,...chapterStatus(save,run.difficulty,c)};
}
