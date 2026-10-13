import { Sfx } from './sfx.js';

// Small, dry sounds suit the paper battlefield. Limit dense volleys so 40 guns
// never become one distorted continuous blast. This does not affect combat time.
const last = new Map();
function allowed(key, spacing = 65) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - (last.get(key) ?? -Infinity) < spacing) return false;
  last.set(key, now);
  return true;
}

export const CombatSounds = {
  build(kind) {
    if (!allowed(`build:${kind}`, 45)) return;
    Sfx.tone(kind === 'erase' ? 240 : 420, .06, {type:'triangle',vol:.15,slide:kind === 'erase' ? -80 : 70});
  },
  shot(kind) {
    if (!allowed(`shot:${kind}`, kind === 'bullet' ? 90 : 65)) return;
    if (kind === 'arrow') Sfx.tone(620,.085,{type:'triangle',vol:.12,slide:-350});
    else if (kind === 'bullet') { Sfx.noise(.055,{vol:.22,hp:950}); Sfx.tone(220,.08,{type:'sawtooth',vol:.13,slide:-120}); }
    else if (kind === 'bomb') Sfx.tone(170,.16,{type:'sine',vol:.2,slide:-110});
    else { Sfx.noise(.11,{vol:.25,hp:420}); Sfx.tone(115,.17,{type:'triangle',vol:.2,slide:-70}); }
  },
  impact(kind, material = 'unit') {
    if (!allowed(`impact:${kind}:${material}`, 70)) return;
    if (kind === 'arrow') Sfx.tone(340,.045,{type:'triangle',vol:.11,slide:-170});
    else if (kind === 'bullet') Sfx.noise(.04,{vol:.16,hp:material === 'iron' ? 1400 : 650});
    else { Sfx.noise(.15,{vol:.28,hp:material === 'iron' ? 700 : 220}); Sfx.tone(95,.18,{type:'triangle',vol:.18,slide:-55}); }
  },
  collapse() { if (allowed('collapse',180)) Sfx.noise(.2,{vol:.25,hp:180}); },
  result(won) { Sfx.tone(won ? 420 : 260,.23,{type:'triangle',vol:.2,slide:won ? 190 : -130}); },
};
