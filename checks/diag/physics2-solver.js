// Physics lane: solver-only A/B in one page (host load cancels out). Same scene/reset as world-final-cost 'twenty';
// syncs disabled so only physics.step is timed. Configurations alternate every 45-frame block.
const {collectFinal}=await import('/checks/world-final-collection.mjs');
let items=await collectFinal(site,{cake:false});const W=site.world,T=site.THREE;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork','recipe-flour','recipe-butter','recipe-milk','rack/wizard','rack/cone','rack/crown','bulb','controller'];
const list=ids.map(id=>W.entries.get(id));
for(const e of items.map(i=>i.worldEntry))if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);}
function reset(){for(const [n,e]of list.entries()){const row=Math.floor(n/2);W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}}
const syncs=list.map(e=>e.sync);for(const e of list)e.sync=null;
const configs=JSON.parse(stage.opt('configs')||'{"a":{},"b":{"ccdAll":true}}');
const apply=c=>{W.physics.numSolverIterations=c.iters??12;W.physics.integrationParameters.maxCcdSubsteps=c.substeps??4;for(const e of list){if(c.ccdAll!==undefined){e.body.enableCcd(c.ccdAll);e.ccd=c.ccdAll;}e.body.setSoftCcdPrediction(c.soft??.08);}const {HOLD}=window.__hold||{};};
const {HOLD}=await import('/src/core/world.js');const ccd0=HOLD.ccd;
const res={};for(const k of Object.keys(configs))res[k]=[];
const orig=W.physics.step.bind(W.physics);let acc=0;W.physics.step=(...a)=>{const t=performance.now();try{return orig(...a);}finally{acc+=performance.now()-t;}};
for(let round=0;round<8;round++)for(const [k,c]of Object.entries(configs)){
 HOLD.ccd=c.ccdAll!==undefined?(c.ccdAll?-1:1e9):(c.ccdRatio??ccd0);apply(c);reset();W.step(1/60);acc=0;
 for(let n=0;n<45;n++)W.step(1/60);if(round)res[k].push(acc/45);
}
W.physics.step=orig;HOLD.ccd=ccd0;list.forEach((e,i)=>e.sync=syncs[i]);
for(const [k,v]of Object.entries(res)){v.sort((a,b)=>a-b);note('solver '+k+' '+JSON.stringify(configs[k]),JSON.stringify({medianMsPerFrame:+v[3].toFixed(3),min:+v[0].toFixed(3),max:+v.at(-1).toFixed(3)}));}
