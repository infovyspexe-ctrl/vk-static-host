import { MISSION_CHAPTERS } from '../data/missionChapters.js';
import { missionFor } from '../data/missions.js';
import { missionState } from './missions.js';
import { missionDraft } from './missionDrafts.js';

export function currentMission(saved={}){
  const state=missionState(saved),active=saved.active;
  const replay=missionDraft({drafts:saved.drafts},active?.level);
  return missionFor(active?.level)&&active.level<=state.unlocked&&!active.missionCompleted&&(!state.completed.includes(active.level)||replay)
    ?active.level:state.unlocked;
}

export function chapterFor(level){return MISSION_CHAPTERS.find(c=>level>=c.first&&level<=c.last)??null;}

export function chapterProgress(level,saved={}){
  const chapter=chapterFor(level);if(!chapter)return null;
  const state=missionState(saved);
  return {...chapter,index:MISSION_CHAPTERS.indexOf(chapter),total:chapter.last-chapter.first+1,
    done:state.completed.filter(id=>id>=chapter.first&&id<=chapter.last).length,
    locked:chapter.first>state.unlocked};
}

export function chapterJump(level,direction,saved={}){
  const current=chapterFor(level);if(!current)return currentMission(saved);
  const index=MISSION_CHAPTERS.indexOf(current),nextIndex=Math.max(0,Math.min(MISSION_CHAPTERS.length-1,index+Math.sign(direction)));
  if(nextIndex===index)return level;
  const next=MISSION_CHAPTERS[nextIndex],state=missionState(saved),active=currentMission(saved);
  if(active>=next.first&&active<=next.last&&!state.completed.includes(active))return active;
  for(let id=next.first;id<=next.last;id++)if(!state.completed.includes(id))return id;
  return next.first;
}
