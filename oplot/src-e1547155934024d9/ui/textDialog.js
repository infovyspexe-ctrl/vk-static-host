import {Input} from '../core/input.js';
import {i18n} from '../i18n/strings.js';

// Long tactical explanations use screen pixels and an internal scroll area.
export function textDialog(scene, text) {
  Input.openLayer(scene, 'help');
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:1000;background:#302722cc;display:flex;align-items:center;justify-content:center;padding:12px';
  const panel=document.createElement('div');
  panel.style.cssText='box-sizing:border-box;width:min(760px,100%);max-height:100%;overflow:auto;background:#eee4c8;color:#302722;padding:20px;border-radius:12px;font:18px/1.5 Arial';
  const body=document.createElement('div');body.textContent=text;body.style.whiteSpace='pre-line';
  const close=document.createElement('button');close.textContent=i18n.t('upgrade.back');
  close.style.cssText='font:inherit;padding:8px 24px;margin-top:16px;cursor:pointer';
  const remove=()=>{overlay.remove();Input.closeLayer(scene,'help');};
  close.onclick=remove;overlay.onkeydown=event=>{event.stopPropagation();if(event.key==='Escape')remove();};
  panel.append(body,close);overlay.append(panel);document.body.append(overlay);close.focus({preventScroll:true});
  scene.events.once('shutdown',remove);
}
