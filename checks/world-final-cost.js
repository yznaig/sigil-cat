// Merged production work: 20 actual movable bodies, then every simultaneously
// reachable body before cake assembly. The fixed furniture remains enabled.
// e1112-11 (Aaron): the speed limit on this PC is 4.0 ms median p95; 2.5 ms stays the reported target.
const COST_GATE_MS=4.0;
const {collectFinal}=await import('/checks/world-final-collection.mjs');
const revealed=stage.opt('cakecost')==='1';
let items=await collectFinal(site,{cake:revealed});const W=site.world,T=site.THREE;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
// All new adapters occur in the twenty; old core/cards have their own unchanged
// fixtures too. No body is replaced with a primitive or has its sync disabled.
// (the star became a 2D sticker, gags lane playtest-2: the rejected paper takes its place, so the workload stays twenty)
const ids=['rifle','top','tin','pat','eyes','paper','crumbs','shards','box','flour','bucket','pitchfork',...(revealed?['cake','postcard','ticket']:['recipe-flour','recipe-butter','recipe-milk']),'rack/wizard','rack/cone','rack/crown','bulb','controller'];
let entries=items.map(i=>i.worldEntry),mixed=ids.map(id=>W.entries.get(id));
check('final cost has all twenty production adapters',mixed.length===20&&mixed.every(Boolean),JSON.stringify(ids));
const gl=stage.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');note('final cost renderer',gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
// Two depth columns keep every centre in both viewports. Recipe recovery is
// deliberately live: a wider offscreen grid was retiring those bodies after
// one sync, so it did not measure twenty production adapters for 180 frames.
function reset(list){for(const [n,e]of list.entries()){
 const row=Math.floor(n/2);
 W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);
 e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);
}}
const runs={twenty:[],maximum:[]};
for(let run=0;run<5;run++){
 if(run){for(const i of items)keepsakes.take(i.id);if(run===1){const awarded=await site.lamp.award();note('final cost fresh bulb premise',JSON.stringify({unlocked:store.get('lamp.unlocked'),awarded,live:!!site.lamp.inst}));check('final fixture preserves once-only bulb award',store.get('lamp.unlocked')===true&&awarded===false&&!site.lamp.inst);}items=await collectFinal(site,{cake:revealed});await until(()=>!W.stats.listening&&!site.supports.listening,20000);for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}entries=items.map(i=>i.worldEntry);mixed=ids.map(id=>W.entries.get(id));}
 for(const [name,list]of [['twenty',mixed],['maximum',entries]]){
 // The omitted cards/party hat remain on their real supports. Parking them
 // beside the lens inflated the shared atlas for an unmeasured object.
 for(const e of entries)if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
 // The sample measures bodies in motion. The physics lane's settling (world.js REST, playtest-2) puts a body to sleep
 // once its farthest point moves under 5 px/s on the page: the recipe butter, small and flat at the back of the grid
 // (17 px tall), landed and slept after ~37 frames of each 45 and was not drawn again until the next reset (145-149
 // draws of 180; traced). A real rule for play; the stress scene opts out (entry.restless) so all keep moving.
 for(const e of entries)e.restless=list.includes(e);
 for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
 const loadBefore=await __loadAverage();reset(list);W.physics.propagateModifiedBodyPositionsToColliders();let overlaps=0;
 for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++)for(let i=0;i<list[a].body.numColliders();i++)for(let j=0;j<list[b].body.numColliders();j++)if(list[a].body.collider(i).contactCollider(list[b].body.collider(j),0)?.distance<0)overlaps++;
 check('final '+name+' starts without interpenetration',!overlaps,JSON.stringify({run:run+1,overlaps}));
 W.step(1/60);const times=[],draws=list.map(e=>e.presentation.stats.draws);
 for(let n=0;n<180;n++){if(n%45===0)reset(list);const t=performance.now();W.step(1/60);times.push(performance.now()-t);}
 const rendered=list.map((e,n)=>({id:e.id,draws:e.presentation.stats.draws-draws[n]}));check('final '+name+' draws every production adapter throughout the sample',rendered.every(r=>r.draws>=170),JSON.stringify(rendered));
 times.sort((a,b)=>a-b);runs[name].push(times[171]);note('final production budget run',JSON.stringify({run:run+1,name,count:list.length,p95:times[171],meshAtlas:{...site.meshPictures.stats},loadBefore,loadAfter:await __loadAverage()}));
}
}
for(const name of ['twenty','maximum']){const median=runs[name].slice().sort((a,b)=>a-b)[2];check('final '+name+' production workload median p95 <=4.0ms gate, 2.5ms target',median<=COST_GATE_MS,JSON.stringify({runs:runs[name],median,scene:entries.map(e=>e.id),method:'180 rendered frames, two 120Hz steps with production adapter/picture/shadow sync; five runs; desktop CPU viewport proxy'}));}
for(const e of entries)e.restless=false;
