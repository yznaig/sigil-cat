// Physics lane: A/B of picture settings in one page, gate-style (tight loop of W.step(1/60), no finish), so the host's
// load hits every configuration alike. Configurations alternate per 45-frame block; 'twenty' scene of world-final-cost.
const {collectFinal}=await import('/checks/world-final-collection.mjs');
const {MOTION}=await import('/src/core/picture-motion.js'),{SORT}=await import('/src/core/prop-picture.js'),{HOLD}=await import('/src/core/world.js');
let items=await collectFinal(site,{cake:false});const W=site.world,T=site.THREE;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork','recipe-flour','recipe-butter','recipe-milk','rack/wizard','rack/cone','rack/crown','bulb','controller'];
const scene=stage.opt('scene')||'twenty',entries=items.map(i=>i.worldEntry),list=scene==='twenty'?ids.map(id=>W.entries.get(id)):entries;
for(const e of entries)if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
function reset(){for(const [n,e]of list.entries()){const row=Math.floor(n/2);W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}}
const configs=JSON.parse(stage.opt('configs')||'{"base":{},"lod":{"MOTION":{"splats":0.5}}}');
const saved={MOTION:{...MOTION},SORT:{...SORT},HOLD:{...HOLD}},targets={MOTION,SORT,HOLD};
const res={};for(const k of Object.keys(configs))res[k]={p95:[],mean:[]};
for(let round=0;round<Number(stage.opt('rounds')||6);round++)for(const [k,c]of Object.entries(configs)){
 for(const [t,o]of Object.entries(targets))Object.assign(o,saved[t],c[t]||{});
 reset();for(let n=0;n<10;n++)W.step(1/60);const times=[];
 for(let n=0;n<90;n++){if(n===45)reset();const t=performance.now();W.step(1/60);times.push(performance.now()-t);}
 if(round){times.sort((a,b)=>a-b);res[k].p95.push(times[85]);res[k].mean.push(times.reduce((a,b)=>a+b,0)/times.length);}
 await sleep(30);
}
for(const [t,o]of Object.entries(targets))Object.assign(o,saved[t]);
const med=a=>a.slice().sort((x,y)=>x-y)[a.length>>1];
for(const [k,v]of Object.entries(res))note('ab '+scene+' '+k+' '+JSON.stringify(configs[k]),JSON.stringify({p95:+med(v.p95).toFixed(2),mean:+med(v.mean).toFixed(2),p95s:v.p95.map(x=>+x.toFixed(1))}));
