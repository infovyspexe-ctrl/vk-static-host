import { createButton } from './Button.js';
import { THEME } from './theme.js';
import { i18n } from '../i18n/strings.js';
import { closeZoom } from './hudLayout.js';

// The editor camera alone zooms. HUD, text and palette stay in screen space.
export function setupBuildViewport(scene, worldObjects) {
  const {width, height} = scene.scale;
  const chrome = scene.chrome;
  const top = chrome.fieldTop;
  const bottom = Math.max(top + 48, Math.min(height, scene.layout.groundY));
  const camera = scene.cameras.add(0, top, width, bottom-top);
  const cssScale = () => {
    const measured = scene.game.canvas.getBoundingClientRect().width / width;
    return measured > 0.05 ? measured : chrome.cssScale;
  };
  let close = chrome.closeByDefault;
  let center = {x:scene.layout.playerOriginX + scene.layout.cellSize * 5,
    y:scene.layout.groundY - scene.layout.cellSize * 1.7};
  const world = new Set(worldObjects);
  const sync = () => {
    for (const object of scene.artSprites.values()) world.add(object);
    for (const object of scene.children.list) {
      // Phaser dispatches pointerup to the object under the RELEASE position.
      // A field drag ending over a toolbar button must not activate that button.
      if (object.type === 'Container' && object.input && !object.getData('panGuard')) {
        const listeners = object.listeners('pointerup');
        object.removeAllListeners('pointerup');
        for (const listener of listeners) object.on('pointerup', (...args) => {
          if (!scene.panStart) listener.apply(object,args);
        });
        object.setData('panGuard',true);
      }
      if (world.has(object)) {
        object.cameraFilter = (object.cameraFilter | scene.cameras.main.id) & ~camera.id;
      } else object.cameraFilter |= camera.id;
    }
  };
  const apply = () => {
    const zoom = close ? closeZoom(scene.layout.cellSize, cssScale()) :
      Math.min(1, (bottom-top)/(scene.layout.cellSize*12));
    camera.setZoom(zoom);
    if (!close) camera.centerOn(width/2, scene.layout.groundY-scene.layout.cellSize*5.3);
    else {
      const halfW = width/(2*zoom), halfH = (bottom-top)/(2*zoom);
      center.x = Phaser.Math.Clamp(center.x, scene.layout.playerOriginX + halfW - scene.layout.cellSize/2,
        scene.layout.enemyOriginX + scene.progress.width*scene.layout.cellSize - halfW + scene.layout.cellSize/2);
      center.y = Phaser.Math.Clamp(center.y, scene.layout.groundY-11*scene.layout.cellSize+halfH,
        scene.layout.groundY-halfH+scene.layout.cellSize*.4);
      camera.centerOn(center.x, center.y);
    }
  };
  const overview = chrome.overview;
  const button = createButton(scene, overview.x + overview.w / 2, overview.y + overview.h / 2, '', ()=>{
    close=!close; apply(); label();
  }, {fontSize:'20px',paddingX:14,paddingY:8,color:THEME.colors.neutral});
  const hint = scene.add.text(0, 0, '', {
    fontFamily:THEME.fontFamily,fontSize:'20px',color:THEME.colors.text,
  }).setOrigin(.5).setVisible(false);
  const label = () => {
    button.setLabel(i18n.t(close?'build.overview':'build.closeup'));
    hint.setText(i18n.t(close?'build.panHint':'build.overviewHint'));
  };
  apply(); label(); sync();
  scene.events.on('preupdate',sync);
  scene.scale.on('resize',apply);
  scene.events.once('shutdown',()=>{scene.events.off('preupdate',sync);scene.scale.off('resize',apply);});
  return {
    camera, button, hint,
    get close(){return close;},
    contains(p){return p.x>=0 && p.x<width && p.y>=top && p.y<bottom;},
    point(p){return camera.getWorldPoint(p.x,p.y);},
    pan(dx,dy){center.x-=dx/camera.zoom;center.y-=dy/camera.zoom;apply();},
    focus(x,y){center={x,y};apply();},
    project(x,y){return {x:camera.x+camera.width/2+(x-camera.midPoint.x)*camera.zoom,
      y:camera.y+camera.height/2+(y-camera.midPoint.y)*camera.zoom};},
  };
}
