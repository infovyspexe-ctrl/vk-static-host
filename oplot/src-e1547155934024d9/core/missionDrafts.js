import { missionFor } from '../data/missions.js';

function valid(draft,id){
  return Number.isInteger(id)&&Boolean(missionFor(id))&&draft?.level===id&&
    !draft.missionCompleted&&Array.isArray(draft.cells)&&Number.isFinite(draft.gold)&&draft.gold>=0;
}

// Reading/migrating never writes storage. Keep each mission's wallet and build together.
export function readMissionDrafts(saved={}){
  const drafts={};
  for(const [key,draft] of Object.entries(saved?.drafts??{})){
    const id=Number(key);
    if(String(id)===key&&valid(draft,id))drafts[id]=draft;
  }
  const active=saved?.active;
  if(valid(active,active?.level))drafts[active.level]=active;
  return drafts;
}

export function missionDraft(saved,id){return readMissionDrafts(saved)[id]??null;}
