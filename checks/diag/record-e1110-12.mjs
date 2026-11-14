// Record the completed suite without rerunning or changing its acceptance checks.
// node checks/diag/record-e1110-12.mjs /tmp/world-e1110-12-final.log
import {readFileSync,writeFileSync} from 'node:fs';
const text=readFileSync(process.argv[2],'utf8'),sizes={};
for(const size of ['desktop','phone']){
 const section=text.split('== world-core-'+size+'\n')[1]?.split('\n== ')[0];
 if(!section)throw new Error('Missing core result: '+size);
 const lines=section.split('\n'),runs=lines.filter(l=>l.startsWith('CHECK world budget run ')).map(l=>JSON.parse(l.slice(l.indexOf('{'))));
 if(runs.length!==5)throw new Error('Incomplete five-run budget');
 sizes[size]={renderer:lines.find(l=>l.startsWith('CHECK world renderer:'))?.slice(22),runs,medianP95:runs.map(r=>r.p95).sort((a,b)=>a-b)[2],checks:lines.filter(l=>l.startsWith('CHECK'))};
}
const end=text.trim().split('\n').slice(-2);
if(!text.includes('== files'))throw new Error('Suite not complete');
writeFileSync('checks/diag/e1110-12-results.json',JSON.stringify({decision:'e1110-12',softCcdPrediction:.08,barrelHalfExtents:[.14,.014,.014],visibleBarrelHalfExtents:[.14,.012,.012],floorTolerance:.01,cpuBudgetMs:2,sizes,suiteEnd:end,failures:text.split('\n').filter(l=>/ FAIL$|^FAILED:|^FAIL |^PAGEERROR|^HTTP |^REQUEST/.test(l))},null,2)+'\n');
