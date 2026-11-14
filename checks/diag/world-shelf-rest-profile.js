// Shared premise test: does the idle miss mean an adapter is still doing work,
// or does the fixed comparison include the cost of more main-pass draw calls?
cat.auto=false;const W=site.world,S=site.supports;
for(const id of ['cloud','top','crumbs','twinkle','postcard','rifle','paper','shards','puddle','box','eyes','rack','ticket','tin','pat','grease'])if(keepsakes.defs.has(id))keepsakes.give(id);
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));await site.shelf.task;await until(()=>!W.stats.listening&&!S.listening,30000);await sleep(6500);stage.timeScale=0;
const snapshot=()=>({steps:W.stats.steps,syncs:W.stats.syncs,shadows:site.worldLayout.stats.shadowUpdates,atlas:site.meshPictures.stats.passes,shelf:site.shelf.picture.stats.draws,board:site.pinboard.picture.stats.draws,supports:S.stats.frames,callbacks:stage.onFrame.length});
const before=snapshot();await sleep(2100);const after=snapshot();note('shelf idle premise counters',JSON.stringify({before,after,zero:JSON.stringify(before)===JSON.stringify(after)}));
const R=stage.renderer,gl=R.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),modes=[['all',[]],['no-shelf',[site.shelf.picture.card]],['no-new-shadows',['tin','pat'].map(id=>site.worldLayout.shadows.get(id)?.group)],['no-unit6-pictures',[site.shelf.picture.card,...['tin','pat'].map(id=>keepsakes.get(id).picture.card)]],['no-floor-shadows',[...site.worldLayout.shadows.values()].map(s=>s.group)]];
const out=[];
for(let round=0;round<5;round++)for(const [name,objects] of (round%2?[...modes].reverse():modes)){
 const saved=objects.filter(Boolean).map(o=>[o,o.visible]);for(const [o]of saved)o.visible=false;
 R.render(stage.scene,stage.camera);gl.finish();const samples=[];
 for(let batch=0;batch<5;batch++){const t=performance.now();for(let n=0;n<50;n++)R.render(stage.scene,stage.camera);samples.push((performance.now()-t)/50);gl.finish();}
 const info={...R.info.render};out.push({round,name,samples,info});for(const [o,v]of saved)o.visible=v;
}
note('shelf rest submission attribution',JSON.stringify({renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),load:await __loadAverage(),method:'five alternating rounds; five batches of 50 identical main renders per mode; gl.finish outside the CPU timer prevents backlog carry; hiding is diagnostic only',out}));
