// Physics lane: checks/world-final-cost.js as it runs (five re-collected runs, twenty then maximum), with each frame's
// time split into solver / atlas flush / presentation flush / syncs and the worst frames listed. Diagnostic only.
const {collectFinal}=await import('/checks/world-final-collection.mjs');
const revealed=stage.opt('cakecost')==='1';
let items=await collectFinal(site,{cake:revealed});const W=site.world,T=site.THREE;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork',...(revealed?['cake','postcard','ticket']:['recipe-flour','recipe-butter','recipe-milk']),'rack/wizard','rack/cone','rack/crown','bulb','controller'];
let entries=items.map(i=>i.worldEntry),mixed=ids.map(id=>W.entries.get(id));
function reset(list){for(const [n,e]of list.entries()){const row=Math.floor(n/2);W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}}
let frame={};const wrapOnce=(obj,name,key)=>{if(!obj||obj['__w'+name])return;const f=obj[name];obj['__w'+name]=true;obj[name]=function(...a){const t=performance.now();try{return f.apply(this,a);}finally{frame[key]=(frame[key]||0)+performance.now()-t;}};};
const runs=Number(stage.opt('gateruns')||3),finish=stage.opt('finish')==='1',gl=stage.renderer.getContext();
for(let run=0;run<runs;run++){
 if(run){for(const i of items)keepsakes.take(i.id);items=await collectFinal(site,{cake:revealed});await until(()=>!W.stats.listening&&!site.supports.listening,20000);for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}entries=items.map(i=>i.worldEntry);mixed=ids.map(id=>W.entries.get(id));}
 wrapOnce(W.physics,'step','physics');wrapOnce(site.meshPictures,'flush','atlas');wrapOnce(site.worldPresentation,'flush','present');
 for(const [name,list]of [['twenty',mixed],['maximum',entries]]){
  for(const e of entries)if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
  for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
  for(const e of list){if(e.__wrapped)continue;e.__wrapped=true;const f=e.sync;e.sync=function(x){const t=performance.now();try{return f?.call(this,x);}finally{frame.syncs=(frame.syncs||0)+performance.now()-t;}};}
  reset(list);W.physics.propagateModifiedBodyPositionsToColliders();
  W.step(1/60);const rows=[];const A=site.meshPictures.stats;
  for(let n=0;n<180;n++){if(n%45===0)reset(list);frame={};if(finish)gl.finish();const g=A.growths,t=performance.now();W.step(1/60);frame.total=performance.now()-t;frame.n=n;if(A.growths!==g)frame.growth=1;rows.push(frame);}
  const sorted=rows.slice().sort((a,b)=>b.total-a.total),mean=k=>+(rows.reduce((s,r)=>s+(r[k]||0),0)/rows.length).toFixed(3);
  note('gate '+name+' run '+(run+1),JSON.stringify({p95:sorted[8].total,mean:{total:mean('total'),physics:mean('physics'),atlas:mean('atlas'),present:mean('present'),syncs:mean('syncs')},worst:sorted.slice(0,10).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,+(+v).toFixed(2)])))}));
 }
}
