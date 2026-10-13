import { THEME } from './theme.js';

const C = {
  ink: 0x18222a, player: 0x3f7f86, enemy: 0x984b42, gold: 0xe8bd69,
  wood: 0x79543a, woodLight: 0xb17b4f, brick: 0x9b5b48, mortar: 0xd1a77d,
  iron: 0x53616b, ironLight: 0x93a0a7, shield: 0xb98b37, cloth: 0x355a62,
};

export function addWorldBackdrop(scene, { shade = 0.34, vignette = true } = {}) {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(-100);
  g.fillStyle(0xf1e8cf, 1); g.fillRect(0, 0, width, height);
  const step = 32;
  g.lineStyle(1, 0x9eb8b1, .36);
  for (let x = step; x < width; x += step) g.lineBetween(x, 0, x, height);
  for (let y = step; y < height; y += step) g.lineBetween(0, y, width, y);
  g.lineStyle(2, 0xc97868, .42); g.lineBetween(72, 0, 72, height);
  // Uneven paper edges, staple holes and pencil smudges keep the sheet tactile.
  g.fillStyle(0x8a6a49, .08); g.fillEllipse(width*.82,height*.14,190,70); g.fillEllipse(width*.2,height*.78,240,80);
  g.lineStyle(4, 0x322923, .11); g.strokeCircle(width*.88,height*.82,64); g.strokeCircle(width*.88,height*.82,72);
  for (let y=90;y<height;y+=145) { g.fillStyle(0x4e4438,.18); g.fillCircle(25,y,8); g.lineStyle(2,0xffffff,.35); g.strokeCircle(25,y,8); }
  if (shade > .5) { g.fillStyle(0x6e604e, Math.min(.18,(shade-.5)*.35)); g.fillRect(0,0,width,height); }
  return g;
}

export function drawFortressCell(g, cell, x, y, size, side = 'player', alpha = 1) {
  const s = size * 0.92;
  const l = x - s / 2, t = y - s / 2;
  g.lineStyle(Math.max(1, size * 0.055), C.ink, alpha * 0.9);
  if (cell.kind === 'unit') {
    drawUnit(g, cell.typeId, x, y, s, side, alpha);
    return;
  }
  if (cell.typeId === 'wood') {
    g.fillStyle(C.wood, alpha); g.fillRoundedRect(l, t, s, s, size * 0.08); g.strokeRoundedRect(l, t, s, s, size * 0.08);
    g.lineStyle(Math.max(1, size * 0.04), C.woodLight, alpha * 0.75);
    g.lineBetween(l + s * .22, t + s * .08, l + s * .22, t + s * .92); g.lineBetween(l + s * .68, t + s * .08, l + s * .68, t + s * .92);
    g.lineStyle(Math.max(1, size * .035), C.ink, alpha * .55); g.lineBetween(l + s * .08, t + s * .25, l + s * .92, t + s * .78);
  } else if (cell.typeId === 'brick') {
    g.fillStyle(C.brick, alpha); g.fillRoundedRect(l, t, s, s, size * .06); g.strokeRoundedRect(l, t, s, s, size * .06);
    g.lineStyle(Math.max(1, size * .035), C.mortar, alpha * .7);
    g.lineBetween(l, y, l + s, y); g.lineBetween(x, t, x, y); g.lineBetween(l + s * .25, y, l + s * .25, t + s);
  } else if (cell.typeId === 'iron') {
    g.fillStyle(C.iron, alpha); g.fillRoundedRect(l, t, s, s, size * .08); g.strokeRoundedRect(l, t, s, s, size * .08);
    g.lineStyle(Math.max(1, size * .045), C.ironLight, alpha * .75); g.lineBetween(l + s * .14, t + s * .18, l + s * .86, t + s * .18);
    for (const px of [l + s*.17, l + s*.83]) for (const py of [t + s*.2, t + s*.8]) { g.fillStyle(C.ink, alpha); g.fillCircle(px, py, size * .045); }
  } else if (cell.typeId === 'gold') {
    g.fillStyle(C.gold, alpha); g.fillRoundedRect(l, t, s, s, size * .08); g.strokeRoundedRect(l, t, s, s, size * .08);
    g.lineStyle(Math.max(1, size * .035), 0xffe6a6, alpha * .7); g.lineBetween(l+s*.15,t+s*.2,l+s*.55,t+s*.08);
    g.fillStyle(0x8b632b, alpha); g.fillCircle(x, y, size*.15); g.lineStyle(Math.max(1,size*.03),0xffdf83,alpha); g.strokeCircle(x,y,size*.15);
  } else {
    g.fillStyle(C.shield, alpha); g.fillRoundedRect(l, t, s, s, size * .08); g.strokeRoundedRect(l, t, s, s, size * .08);
    g.fillStyle(0x6d4b2c, alpha); g.fillTriangle(x, t+s*.12, l+s*.18, t+s*.36, x, t+s*.9); g.fillTriangle(x, t+s*.12, l+s*.82, t+s*.36, x, t+s*.9);
    g.lineStyle(Math.max(1,size*.04),0xf3d58b,alpha); g.strokeTriangle(x,t+s*.12,l+s*.18,t+s*.36,x,t+s*.9); g.strokeTriangle(x,t+s*.12,l+s*.82,t+s*.36,x,t+s*.9);
  }
}

function drawUnit(g, typeId, x, y, s, side, alpha) {
  const team = side === 'enemy' ? C.enemy : C.player;
  const base = typeId.replace(/^(longbow|ranger)$/, 'archer').replace(/^(crossbow|musketeer)$/, 'shooter')
    .replace(/^(bombard|mortar)$/, 'cannon').replace(/^(piercer|salvo)$/, 'rocket').replace(/^(wide|cluster)$/, 'grenadier');
  const branchA = ['longbow','crossbow','bombard','piercer','wide'].includes(typeId);
  const l = x-s/2, t=y-s/2;
  g.fillStyle(0x21313a, alpha*.96); g.fillRoundedRect(l,t,s,s,s*.12); g.lineStyle(Math.max(1,s*.05),C.ink,alpha); g.strokeRoundedRect(l,t,s,s,s*.12);
  g.fillStyle(team, alpha); g.fillTriangle(l+s*.1,t+s*.82,l+s*.5,t+s*.28,l+s*.9,t+s*.82);
  g.fillStyle(0xd5aa7b, alpha); g.fillCircle(x,t+s*.31,s*.14);
  g.fillStyle(branchA ? C.gold : (typeId===base ? C.ironLight : 0x74a66b), alpha); g.fillTriangle(x,t+s*.12,l+s*.35,t+s*.33,l+s*.65,t+s*.33);
  g.lineStyle(Math.max(1,s*.065),0xe7cf9c,alpha);
  if (base === 'archer') { g.strokeCircle(l+s*.66,t+s*.53,s*.22); g.lineBetween(l+s*.66,t+s*.3,l+s*.66,t+s*.76); g.lineBetween(l+s*.4,t+s*.58,l+s*.9,t+s*.42); }
  else if (base === 'shooter') { g.lineStyle(Math.max(2,s*.1),0x87613d,alpha); g.lineBetween(l+s*.28,t+s*.52,l+s*.9,t+s*.48); g.lineStyle(Math.max(1,s*.035),C.gold,alpha); g.lineBetween(l+s*.7,t+s*.42,l+s*.7,t+s*.58); }
  else if (base === 'cannon') { g.fillStyle(C.iron,alpha); g.fillRoundedRect(l+s*.28,t+s*.42,s*.62,s*.22,s*.06); g.fillCircle(l+s*.38,t+s*.73,s*.15); g.fillCircle(l+s*.75,t+s*.73,s*.15); }
  else if (base === 'rocket') { g.fillStyle(0x8f4b37,alpha); g.fillTriangle(l+s*.82,t+s*.22,l+s*.38,t+s*.7,l+s*.72,t+s*.76); g.fillStyle(C.gold,alpha); g.fillTriangle(l+s*.36,t+s*.7,l+s*.2,t+s*.88,l+s*.43,t+s*.77); }
  else { g.fillStyle(C.iron,alpha); g.fillCircle(l+s*.67,t+s*.55,s*.18); g.lineStyle(Math.max(1,s*.04),C.gold,alpha); g.lineBetween(l+s*.63,t+s*.38,l+s*.55,t+s*.22); g.fillStyle(0xe5683f,alpha); g.fillCircle(l+s*.54,t+s*.2,s*.055); }
  if (typeId !== base) { g.fillStyle(branchA ? C.gold : 0x74a66b,alpha); g.fillCircle(l+s*.16,t+s*.16,s*.09); }
}

export function drawPaletteIcon(scene, x, y, size, kind, typeId, side = 'player') {
  return scene.add.image(x, y, `notebook-${typeId}`).setDisplaySize(size, size)
    .setFlipX(side === 'enemy' && kind === 'unit').setInteractive({ useHandCursor: true });
}

export function syncFortressSprites(scene, sprites, side, base, layout, alpha = 1) {
  const alive = new Set(); const s = layout.cellSize;
  for (const [key, cell] of base.cells) {
    if(cell.objectId && key!==cell.objectId)continue;
    const id = `${side}:${key}`; alive.add(id);
    const { sx, sy } = { sx: (side === 'player' ? layout.playerOriginX : layout.enemyOriginX) + cell.x*s+s/2, sy: layout.groundY-(cell.y-1)*s-s/2 };
    let image = sprites.get(id);
    if (!image) { image = scene.add.image(sx, sy, cell.locked&&!cell.objectId?'mission-targets':`notebook-${cell.typeId}`,cell.locked&&!cell.objectId?cell.typeId:undefined); sprites.set(id, image); }
    if(cell.objectId){
      image.setTexture(`notebook-${cell.typeId}`,'trimmed').setOrigin(.5,1)
        .setPosition(sx+(cell.objectWidth-1)*s/2,layout.groundY-(cell.y-1)*s)
        .setDisplaySize(cell.objectWidth*s,cell.objectHeight*s).setAlpha(alpha);
      continue;
    }
    if(cell.locked){
      image.setTexture('mission-targets',cell.typeId);
      const ratio=image.frame.width/image.frame.height;
      image.setPosition(sx,layout.groundY-(cell.y-1)*s-s*.5).setDisplaySize(s*ratio,s).setAlpha(alpha);
      continue;
    }
    const scale = cell.kind === 'unit' ? 1.08 : 1.04;
    const alignedY = cell.kind === 'unit' ? layout.groundY-(cell.y-1)*s-(s*scale)/2 : sy;
    image.setTexture(`notebook-${cell.typeId}`).setPosition(sx, alignedY).setDisplaySize(s*scale,s*scale).setAlpha(alpha)
      .setFlipX(side === 'enemy' && cell.kind === 'unit');
  }
  for (const [id,image] of sprites) if (id.startsWith(`${side}:`) && !alive.has(id)) { image.destroy(); sprites.delete(id); }
}

export function drawGround(g, left, top, width, height, side = 'player', terrain = null) {
  if(terrain?.platformHoles?.length){
    const s=width/(terrain.width+1),origin=left+s/2;
    let begin=0;
    for(let x=0;x<=terrain.width;x++)if(x===terrain.width||terrain.platformHoles.includes(x)){
      if(x>begin)drawGround(g,begin===0?left:origin+begin*s,top,(x-begin)*s+(begin===0?s/2:0)+(x===terrain.width?s/2:0),height,side);
      begin=x+1;
    }
    return;
  }
  const color = side === 'enemy' ? C.enemy : C.player;
  g.fillStyle(0xd8c9a7, .88); g.fillRoundedRect(left, top, width, height, height*.22);
  g.lineStyle(Math.max(2,height*.12), C.ink, .9); g.strokeRoundedRect(left, top, width, height, height*.22);
  g.lineStyle(2, color, .72); g.lineBetween(left+height*.18,top+height*.25,left+width-height*.18,top+height*.25);
  g.lineStyle(1, C.ink, .3);
  for(let x=left+height*.4;x<left+width;x+=height*.9) g.lineBetween(x,top+height*.12,x-height*.2,top+height*.82);
}

export function drawFieldHeraldry(g, layout, playerWidth) {
  const s = layout.cellSize;
  const left = layout.playerOriginX;
  const right = layout.enemyOriginX + playerWidth * s;
  const poleTop = layout.groundY - s * 1.15;
  for (const [x, color, flip] of [[left-s*.18,C.player,1],[right+s*.18,C.enemy,-1]]) {
    g.lineStyle(Math.max(2,s*.06), C.ink, .95); g.lineBetween(x, layout.groundY, x, poleTop);
    g.fillStyle(color, .95);
    g.fillTriangle(x, poleTop, x + flip*s*.62, poleTop+s*.22, x, poleTop+s*.48);
    g.lineStyle(Math.max(1,s*.03), C.gold, .8); g.lineBetween(x, poleTop, x+flip*s*.57, poleTop+s*.21);
  }
  const mid = (layout.playerOriginX + playerWidth*s + layout.enemyOriginX) / 2;
  g.fillStyle(C.ink,.72); g.fillCircle(mid, layout.groundY-s*.25, s*.35);
  g.lineStyle(Math.max(2,s*.075),C.gold,.9);
  g.lineBetween(mid-s*.17,layout.groundY-s*.47,mid+s*.17,layout.groundY-s*.05);
  g.lineBetween(mid+s*.17,layout.groundY-s*.47,mid-s*.17,layout.groundY-s*.05);
}

export function addEmberParticles(scene) {
  // Intentionally quiet: the notebook direction uses pencil motion, not cinematic embers.
}

export { C as ART_COLORS };
