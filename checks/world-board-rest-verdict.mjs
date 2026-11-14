import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// RAF timestamps are doubles: 0.5 - 0.3999999999996362 is slightly above .1.
// Compare integer nanoseconds, far below the browser's timestamp resolution.
// Retain the original samples and raw deltas in the evidence.
export function verdict(out){
 const gpuAvailable=out.results.converted.every(r=>r.gpu.n>100);
 const deltaNs=Object.fromEntries(Object.entries(out.delta).map(([k,v])=>[k,Math.round(v*1e6)]));
 const limitNs=100000;
 return {limitNs,deltaNs,gpuAvailable,pass:Number.isFinite(deltaNs.frame)&&deltaNs.frame<=limitNs&&(!gpuAvailable||(Number.isFinite(deltaNs.gpu)&&deltaNs.gpu<=limitNs))&&!out.errors.length};
}
// Re-evaluate saved raw evidence without rerunning or replacing any sample.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 for(const path of process.argv.slice(2)){
  const out=JSON.parse(readFileSync(path,'utf8'));out.decision=verdict(out);
  writeFileSync(path,JSON.stringify(out,null,2)+'\n');
  console.log(path,JSON.stringify(out.decision));
  if(!out.decision.pass)process.exitCode=1;
 }
}
