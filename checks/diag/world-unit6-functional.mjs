// e1111-21: focused functional coverage only. No run-all or cost harness.
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const arg=k=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1];};
const cases=[
 ['presentation','world-presentation'],['rotor','world-presentation-rotor'],['shelf','world-shelf','world-shelf-reload'],['play','world-shelf-play'],['drag-all','world-shelf-drag-all'],['solids','world-shelf-solids'],
 ['supports','world-supports'],['board','world-board','world-board-reload'],['board-integration','world-board-integration'],['curtain','world-board-curtain'],
 ['physics','physics','physics-reload'],['calm','physics-calm',null,'--reduced'],['return','look-pat-return'],['landing','look-landing'],['use','look-use','look-reload'],
 ['impacts','world-impacts'],['props','world-props'],['layout','world-layout','world-layout-reload'],
 ['core','world-core'],['water','world-water','world-water-reload'],['water-reduced','world-water','world-water-reload','--reduced']
].filter(c=>!arg('only')||new RegExp(arg('only')).test(c[0]));
const tmp=mkdtempSync('/tmp/world-unit6-functional-'),out='checks/diag/world-unit6-functional.json';
let report;try{report=JSON.parse(readFileSync(out));}catch{report={decision:'e1111-21',description:'Functional checks only; all cost sections omitted, no full suite.',runs:[]};}
const paths=execFileSync('rg',['--files','src'],{encoding:'utf8'}).trim().split('\n').sort(),hash=createHash('sha256');for(const p of paths)hash.update(p).update(readFileSync(p));const source=hash.digest('hex');
let failures=0;
for(const size of (arg('sizes')||'desktop,phone').split(','))for(const [name,script,then,extra]of cases){
 let file='checks/'+script+'.js';
 if(name==='layout'||name==='props'||name==='core'){
  let js=readFileSync(file,'utf8');
  const cut=name==='layout'?'// Matched submission-cost measurements:':name==='core'?'// Median of five independent':'const costs=[];';
  if(!js.includes(cut))throw Error('Cost section marker changed: '+file);
  if(name==='layout')js=js.slice(0,js.indexOf(cut));
  else if(name==='core')js=js.slice(0,js.indexOf(cut))+"for(const entry of [...W.entries.values()]){stage.scene.remove(entry.object);W.remove(entry.id);}\n"+js.slice(js.indexOf("check('world cleanup zero bodies"));
  else js=js.slice(0,js.indexOf(cut))+js.slice(js.indexOf('advance(1200);const draws='));
  file=tmp+'/'+name+'.js';writeFileSync(file,js);
 }
 const checkSource=createHash('sha256').update(readFileSync(file)).update(readFileSync('checks/lib.js')).update(then?readFileSync('checks/'+then+'.js'):'').digest('hex');
 if(process.argv.includes('--resume')&&report.runs.some(r=>r.name===name&&r.size===size&&r.source===source&&r.checkSource===checkSource&&r.exit===0)){console.log(`${name} ${size}: prior identical-source/check PASS`);continue;}
 const own=['presentation','shelf','play','drag-all','solids'].includes(name),shots=own?'docs/shots':tmp+'/shots';mkdirSync(shots,{recursive:true});
 const args=['checks/run.mjs','http://localhost:18743','--lib','checks/lib.js','--js',file,'--size',size,'--jpeg','--out',shots,'--timeout','240'];
 if(then)args.push('--then','checks/'+then+'.js');if(extra)args.push(extra);
 const r=spawnSync(process.execPath,args,{encoding:'utf8',env:process.env,timeout:300000,maxBuffer:16*1024*1024}),log=(r.stdout||'')+(r.stderr||'');
 const result={name,size,source,checkSource,at:new Date().toISOString(),exit:r.status,checks:log.split('\n').filter(l=>/CHECK|FAIL|PAGEERROR|HTTP |REQUEST/.test(l)),log};
 report.runs.push(result);writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(`${name} ${size}: ${r.status===0?'PASS':'FAIL'} (${result.checks.length} lines)`);if(r.status!==0){failures++;console.log(result.checks.filter(l=>/FAIL|ERROR/.test(l)).join('\n'));}
}
console.log(failures?'FUNCTIONAL FAILURES: '+failures:'SELECTED FUNCTIONAL CHECKS PASS');process.exitCode=failures?1:0;
