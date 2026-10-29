// ViewBox frames follow the actual painted tile faces, not assumed equal cell crops.
const x=[71,313,554,796,1037,1279], y=[82,384,693];
const atlas=new URL('../../assets/tiles-v2.png',import.meta.url).href;
const collectibles=new URL('../../assets/collectibles-v3.png',import.meta.url).href;
export function symbol(kind){
if(kind===31)return `<img class="tile-picture chapter-art" src="${new URL('../../assets/chapter-panda-v1.png',import.meta.url).href}" alt="" draggable="false">`;
if(kind===30)return `<img class="tile-picture chapter-art" src="${new URL('../../assets/chapter-carp-v1.png',import.meta.url).href}" alt="" draggable="false">`;
const k=Math.max(0,Math.min(29,kind|0));
if(k>=18){const i=k-18;return `<svg class="tile-picture" viewBox="${[109,422,750,1074][i%4]} ${[48,380,714][Math.floor(i/4)]} 259 288" preserveAspectRatio="none" aria-hidden="true"><image href="${collectibles}" width="1448" height="1086"/></svg>`;}
return `<svg class="tile-picture" viewBox="${x[k%6]} ${y[Math.floor(k/6)]} 186 241" preserveAspectRatio="none" aria-hidden="true"><image href="${atlas}" width="1536" height="1024"/></svg>`;}
