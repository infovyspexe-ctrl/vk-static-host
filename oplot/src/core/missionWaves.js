import { levelSpecFor } from '../data/levelProvider.js';
import { WAVE_RULES } from '../data/missions.js';
import { createBase } from '../mechanics/gridbuild/base.js';
import { applyBlueprint } from '../mechanics/gridbuild/blueprint.js';
import { battleBase } from './battleBase.js';
import { enemyTables } from './enemyForLevel.js';

export function missionEnemySpecs(progress,catalog=progress.catalog){
  const first=levelSpecFor(progress.mission?.enemy??progress.level,catalog);
  return [first,...(progress.mission?.waves??first.waves??[]).map(n=>levelSpecFor(n,catalog))];
}
// Both the browser and audit use these disposable enemy bases. Player damage stays.
export function missionWaveOptions(progress,spec=null){
  const destroyKeys=[...(progress.mission?.destroy??[]),...(progress.mission?.destroyBlocks??[])].map(([x,y])=>`${x},${y}`);
  const conditions={destroyKeys,maxLosses:progress.mission?.maxLosses??Infinity,
    ...(progress.mission?.timeLimit?{timeLimit:progress.mission.timeLimit}:{})};
  const waves=progress.mission?.waves??spec?.waves??[];
  if(!waves.length)return conditions;
  const reinforcements=waves.map(n=>levelSpecFor(n,progress.catalog)).map(spec=>{
    const base=createBase({width:progress.width,catalog:progress.catalog});
    const r=applyBlueprint(base,spec.cells);
    if(r.rejected.length)throw new Error('Invalid wave blueprint');
    const tables=enemyTables(spec);
    return {enemyBase:battleBase(base,tables.units,tables.blocks),enemyUnitTable:tables.units};
  });
  return {reinforcements,waveDelay:WAVE_RULES.delay,timeLimit:WAVE_RULES.timeLimit,...conditions};
}
