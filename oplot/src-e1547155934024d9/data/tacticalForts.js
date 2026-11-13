// Authored formations: explicit sizes and weapons, no player-dependent scaling.
// Front walls face x=0. Floors connect to them; destroying the supports matters.
export function battery({ columns = 2, rows = 2, count = 8, weapon = 'rocket', armor = 'gold', rear = true } = {}) {
  const cells = [];
  for(let x=0;x<columns;x++) for(let y=1;y<rows*2;y++) cells.push([x,y,'block',armor]);
  if (rear && rows > 1) for(let y=1;y<rows*2;y++) cells.push([columns+count,y,'block','iron']);
  for(let row=0;row<rows;row++) {
    const y=row*2+1;
    for(let i=0;i<count;i++) {
      if(row>0) cells.push([columns+i,y-1,'block','iron']);
      cells.push([columns+i,y,'unit',Array.isArray(weapon) ? weapon[(i+row)%weapon.length] : weapon]);
    }
  }
  return cells;
}

// Three disconnected stair towers. Rising exposes the low front group first;
// falling puts a tall masonry screen in front of the rear firing positions.
// Upper roofs stand on real columns, so destroying one column drops that tier.
export function terraces({ widths=[4,4,4], heights=[1,3,5], weapon='cannon', armor='iron', sheltered=false, braced=false, reinforced=false }={}){
  const cells=[];let start=0,unitIndex=0;
  for(let tier=0;tier<widths.length;tier++){
    const width=widths[tier],height=heights[tier];
    const reinforcedXs=reinforced?(tier===0
      ?[start+Math.floor(width/3),start+Math.floor(width*2/3)]
      :[start+Math.floor(width/2)]):[];
    if(height>1){
      for(let y=1;y<height;y++)cells.push([start,y,'block',armor]);
      for(let x=start+1;x<start+width;x++)cells.push([x,height-1,'block',armor]);
      if(braced)for(let y=1;y<height-1;y++)cells.push([start+width-1,y,'block',armor]);
      if(reinforced)for(const x of reinforcedXs)
        for(let y=1;y<height-1;y++)cells.push([x,y,'block',armor]);
    }
    if(braced&&tier<widths.length-1){
      cells.push([start+width,1,'block',armor]);
      if(sheltered){
        const sentry=Array.isArray(weapon)?weapon[unitIndex++%weapon.length]:weapon;
        cells.push([start+width,2,'unit',sentry]);
      }
    }
    for(let x=start;x<start+width;x++,unitIndex++){
      const type=Array.isArray(weapon)?weapon[unitIndex%weapon.length]:weapon;
      cells.push([x,height,'unit',type]);
      const reinforcedColumn=reinforcedXs.includes(x);
      if(sheltered&&height>1&&x>start&&!(braced&&x===start+width-1)&&!reinforcedColumn)cells.push([x,1,'unit',type]);
    }
    start+=width+1;
  }
  return cells;
}

function weaponAt(weapon,index){return Array.isArray(weapon)?weapon[index%weapon.length]:weapon;}

// Open galleries supported by several independent piers. Unlike battery(), a
// hit on the front does not drop the complete floor, while losing a middle pier
// can split the gallery into two surviving halves.
export function arcade({ width=14, decks=[3], piers=[0,6,13], count=16, weapon='cannon', armor='iron' }={}){
  const cells=[],seen=new Set(),add=(x,y,kind,id)=>{const key=`${x},${y}`;if(!seen.has(key)){seen.add(key);cells.push([x,y,kind,id]);}};
  const top=Math.max(...decks);
  for(const x of piers)for(let y=1;y<top;y++)add(x,y,'block',armor);
  for(const deck of decks)for(let x=0;x<width;x++)add(x,deck-1,'block',armor);
  const slots=[];
  for(let d=decks.length-1;d>=0;d--)for(let x=0;x<width;x++)if(!seen.has(`${x},${decks[d]}`))slots.push([x,decks[d]]);
  for(let x=1;x<width-1;x++)if(!seen.has(`${x},1`))slots.push([x,1]);
  for(let i=0;i<Math.min(count,slots.length);i++)add(slots[i][0],slots[i][1],'unit',weaponAt(weapon,i));
  return cells;
}

// Several disconnected keeps with genuine gaps. Each tower can collapse on its
// own, so target order changes the battle without any special-case combat rule.
export function towerCluster({ widths=[4,4,4], heights=[3,5,3], count=18, weapon='cannon', armor='gold', sheltered=true }={}){
  const cells=[],topSlots=[],midSlots=[],groundSlots=[],gapSlots=[];let start=0;
  for(let i=0;i<widths.length;i++){
    const w=widths[i],h=heights[i];
    for(let y=1;y<h;y++){cells.push([start,y,'block',armor],[start+w-1,y,'block',armor]);}
    for(let x=start+1;x<start+w-1;x++)cells.push([x,h-1,'block',armor]);
    for(let x=start;x<start+w;x++)topSlots.push([x,h]);
    for(let floor=3;floor<h;floor+=2)for(let x=start+1;x<start+w-1;x++){
      cells.push([x,floor-1,'block',armor]);midSlots.push([x,floor]);
    }
    if(sheltered)for(let x=start+1;x<start+w-1;x++)groundSlots.push([x,1]);
    if(sheltered&&i<widths.length-1)gapSlots.push([start+w,1]);
    start+=w+1;
  }
  const slots=[...topSlots,...midSlots,...groundSlots,...gapSlots];
  for(let i=0;i<Math.min(count,slots.length);i++)cells.push([slots[i][0],slots[i][1],'unit',weaponAt(weapon,i)]);
  return cells;
}

export const TACTICAL_FORTS = {
  3: battery({ columns: 1, rows: 1, count: 4, weapon: 'shooter', armor: 'brick' }),
  4: battery({ columns: 1, rows: 2, count: 2, weapon: 'shooter', armor: 'wood' }),
  5: battery({ columns: 1, rows: 2, count: 3, weapon: 'archer', armor: 'brick' }),
  6: battery({ columns: 1, rows: 2, count: 3, weapon: ['cannon','shooter','archer'], armor: 'brick' }),
  7: battery({ columns: 1, rows: 2, count: 4, weapon: ['cannon','shooter','cannon'], armor: 'iron' }),
  8: battery({ columns: 1, rows: 2, count: 4, weapon: ['cannon','shooter','cannon'], armor: 'gold' }),
  9: battery({ rows: 2, count: 4, weapon: 'cannon', armor: 'iron' }),
  10: battery({ rows: 2, count: 5, weapon: ['cannon','shooter','cannon'] }),
  11: battery({ rows: 2, count: 5, weapon: ['cannon','grenadier','shooter'] }),
  12: terraces({ weapon: ['cannon','grenadier','shooter'], armor:'gold', sheltered:true }),
  13: arcade({ count:14, weapon:['rocket','cannon','rocket'], armor:'iron' }),
  14: towerCluster({ widths:[4,4,4], heights:[3,5,3], count:16, weapon:['rocket','cannon','rocket'], armor:'iron' }),
  15: arcade({ decks:[3,5], piers:[0,4,9,13], count:16, weapon:['cannon','rocket','cannon'], armor:'brick' }),
  16: towerCluster({ widths:[6,7], heights:[5,3], count:18, weapon:['cannon','shooter','cannon'], armor:'iron' }),
  17: terraces({ heights:[5,3,1], weapon: ['cannon','rocket','cannon'], armor:'gold', sheltered:true, braced:true }),
  18: arcade({ decks:[3,5], piers:[0,3,6,9,13], count:21, weapon:['grenadier','cannon','grenadier'], armor:'gold' }),
  19: towerCluster({ widths:[4,4,4], heights:[5,3,5], count:21, weapon:['cannon','shooter','cannon'], armor:'gold' }),
  20: arcade({ decks:[3,5,7], piers:[0,4,9,13], count:27, weapon:['cannon','rocket','cannon'], armor:'gold' }),
  21: arcade({ width:14,decks:[3,5],piers:[0,3,6,9,13],count:27,weapon:['rocket','cannon','rocket'],armor:'gold' }),
  22: terraces({ widths:[5,5,4], weapon:['cannon','grenadier'], armor:'gold', sheltered:true, braced:true, reinforced:true }),
  23: arcade({ width:16,decks:[3,5],piers:[0,5,10,15],count:27,weapon:['grenadier','cannon','cannon'],armor:'gold' }),
  24: towerCluster({ widths:[5,5,4],heights:[5,3,5],count:27,weapon:['cannon','rocket','cannon'],armor:'gold' }),
  25: arcade({ width:16,decks:[3,5],piers:[0,2,4,6,8,10,12,15],count:24,weapon:'rocket',armor:'gold' }),
  26: towerCluster({ widths:[5,5,4],heights:[3,5,7],count:27,weapon:['cannon','grenadier','rocket'],armor:'gold' }),
  27: terraces({ widths:[5,5,4], heights:[5,3,1], weapon:['cannon','grenadier'], armor:'gold', sheltered:true, braced:true, reinforced:true }),
  28: towerCluster({ widths:[4,3,4,2],heights:[5,7,5,7],count:27,weapon:'grenadier',armor:'gold' }),
  29: arcade({ width:16,decks:[3,5,7],piers:[0,4,8,12,15],count:27,weapon:'rocket',armor:'gold' }),
  30: arcade({ width:16,decks:[3,5,7,9],piers:[0,3,6,9,12,15],count:34,weapon:'cannon',armor:'iron' }),
};
