// Physics lane (2026-11-12): where a tumbling final-cost frame spends its time.
// Same scene and reset as checks/world-final-cost.js ('twenty'), with wrappers
// around the solver, each body's sync, the atlas/presentation flushes and the
// splat sorts. Diagnostic only: prints one profile line per run.
const {collectFinal}=await import('/checks/world-final-collection.mjs');
let items=await collectFinal(site,{cake:false});const W=site.world,T=site.THREE;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork','recipe-flour','recipe-butter','recipe-milk','rack/wizard','rack/cone','rack/crown','bulb','controller'];
const list=ids.map(id=>W.entries.get(id)),entries=items.map(i=>i.worldEntry);
for(const e of entries)if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
function reset(){for(const [n,e]of list.entries()){
 const row=Math.floor(n/2);
 W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);
 e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);
}}
const acc={};const add=(k,v)=>{(acc[k]??=[]).push(v);};
const wrap=(obj,name,key)=>{const f=obj[name];obj[name]=function(...a){const t=performance.now();try{return f.apply(this,a);}finally{frame[key]=(frame[key]||0)+performance.now()-t;}};return()=>{obj[name]=f;};};
let frame={};
const undo=[wrap(W.physics,'step','physics'),site.meshPictures&&wrap(site.meshPictures,'flush','atlasFlush'),site.worldPresentation&&wrap(site.worldPresentation,'flush','presentFlush')].filter(Boolean);
for(const e of list){const f=e.sync;e.sync=function(x){const t=performance.now();try{return f.call(this,x);}finally{frame['sync:'+e.id]=(frame['sync:'+e.id]||0)+performance.now()-t;}};undo.push(()=>{e.sync=f;});}
for(const id of ['rifle','top','controller']){const m=site.keepsakes.get(id)?.picture?.mesh;if(m)undo.push(wrap(m,'sortFor','sort:'+id));}
const repeats=Number(stage.opt('profruns')||3);
if(stage.opt('iters'))W.physics.numSolverIterations=Number(stage.opt('iters'));
if(stage.opt('ccd')==='0')for(const e of list)e.body.enableCcd(false);
if(stage.opt('soft'))for(const e of list)e.body.setSoftCcdPrediction(Number(stage.opt('soft')));
if(stage.opt('substeps'))W.physics.integrationParameters.maxCcdSubsteps=Number(stage.opt('substeps'));
note('profile settings',JSON.stringify({iters:W.physics.numSolverIterations,ccd:stage.opt('ccd'),soft:stage.opt('soft')}));
for(let run=0;run<repeats;run++){
 reset();W.step(1/60);const totals=[];const frames=[];const A=site.meshPictures.stats,a0={prep:A.prepMs,render:A.renderMs,fallback:A.fallbackMs,fallbacks:A.fallbacks,passes:A.passes,calls:A.calls};const sorts0=['rifle','top','controller'].map(id=>keepsakes.get(id)?.picture?.stats.sorts||0);
 for(let n=0;n<180;n++){if(n%45===0)reset();frame={};const t=performance.now();W.step(1/60);const total=performance.now()-t;totals.push(total);frame.total=total;frames.push(frame);}
 const keys=[...new Set(frames.flatMap(f=>Object.keys(f)))];const mean={};
 for(const k of keys){const v=frames.map(f=>f[k]||0);mean[k]=+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(3);}
 totals.sort((a,b)=>a-b);
 const atlas={prep:(A.prepMs-a0.prep)/180,render:(A.renderMs-a0.render)/180,fallback:(A.fallbackMs-a0.fallback)/180,fallbacks:(A.fallbacks-a0.fallbacks)/(A.passes-a0.passes),passes:A.passes-a0.passes,calls:(A.calls-a0.calls)/(A.passes-a0.passes)};
 const sorts=['rifle','top','controller'].map((id,k)=>(keepsakes.get(id)?.picture?.stats.sorts||0)-sorts0[k]);
 note('ccd state',JSON.stringify(list.map(e=>[e.id,+e.thin.toFixed(3),+e.reach.toFixed(2),e.ccd])));
 note('profile run '+run,JSON.stringify({p95:totals[171],median:totals[90],mean,atlas,sorts,load:await __loadAverage()}));
}
for(const u of undo)u();
