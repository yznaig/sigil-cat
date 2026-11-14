cat.auto=false;
for(const id of ['paper','postcard','ticket','tin','box','rack','top','rifle','pat'])keepsakes.give(id);
// the whole rack, all four hats, as a player has it once the cake has given the party hat (gags lane, playtest-2)
await site.rack.ready({grant:E.hat.hats});
// Exercise the real box arrival, not just direct give(): it must return to its reserved home.
await keepsakes.get('box').worldTask;
const boxHome={...keepsakes.get('box').worldEntry.body.translation()},boxQ={...keepsakes.get('box').worldEntry.body.rotation()};
await E.box.drop();
// Playtest 2: the first box is flung off him with real physics toward its place; it lands where physics puts it (a
// bounce, a skid, sometimes against a neighbour). Check it landed on the page, then set it back at its reserved home so
// the rest of this check measures the default collection layout, as before.
await until(()=>keepsakes.get('box').worldEntry.body.isSleeping(),12000);
{const r=keepsakes.get('box').picture.rect;check('world box gag flings it off him and it lands on the page',r.x<stage.width-20&&r.x+r.w>20&&r.y+r.h<stage.height-stage.insets.bottom+30,JSON.stringify(r));
 const e=keepsakes.get('box').worldEntry;e.body.setTranslation(boxHome,false);e.body.setRotation(boxQ,false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);site.world.sync(e);site.world.wake(e);}
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));
await until(()=>['rifle','top'].every(id=>keepsakes.get(id)?.worldEntry?.body.isSleeping()),12000);
await sleep(3000);
const L=site.worldLayout,footer=stage.height-stage.insets.bottom;
check('world lower floor clears footer',L.floorY()>keepsakes.feet.y+24&&footer-L.floorY()>=24,`floor=${L.floorY().toFixed(2)} feet=${keepsakes.feet.y.toFixed(2)} footer=${footer.toFixed(2)}`);
const every=[...keepsakes.live.values()].filter(i=>!i.def.sky),all=every.filter(i=>!i.stored);
check('world stored cards remain accessible',every.filter(i=>i.stored).every(i=>i.worldEntry?.support?.id==='pinboard'&&!!i.key.querySelector('button')));
check('world visible items reachable',all.every(i=>i.box.x>=-1&&i.box.x+i.box.w<=stage.width+1&&i.box.y+i.box.h<=footer-24+1),JSON.stringify(all.map(i=>({id:i.id,box:i.box}))));
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
// Aaron accepted (e1111-54, "thats fine") the shelf's rifle over its resting top: the turned shelf (e1111-36) puts the
// back-row rifle above the front-row top's stem. That one pair has its own ceiling, .30, just above its measured .28 at 1280x900;
// it is left out of the top's 20% sum, and every other pair keeps the 20% limit.
const accepted=(i,j)=>i.id==='top'&&j.id==='rifle'&&i.worldEntry?.support?.id==='shelf'&&j.worldEntry?.support?.id==='shelf';
const obscured=all.map(i=>({id:i.id,fraction:all.filter(j=>j!==i&&j.order>i.order&&!accepted(i,j)&&!(i.id==='rack'&&['rack','rack-lamp'].includes(j.worldEntry?.support?.id))).reduce((n,j)=>n+overlap(i.box,j.box),0)/(i.box.w*i.box.h)}));
const pairs=all.flatMap(i=>all.filter(j=>j!==i&&j.order>i.order&&accepted(i,j)).map(j=>({pair:i.id+' under '+j.id,fraction:overlap(i.box,j.box)/(i.box.w*i.box.h)})));
check('world default collection mostly unobstructed',obscured.every(i=>i.fraction<.2)&&pairs.every(p=>p.fraction<=.30),JSON.stringify({obscured,acceptedE1111_54:pairs}));
// Nothing goes straight onto the shelf, its hooks or the stand (playtest-3, as nothing goes straight onto the pinboard):
// the player places them. The everything-at-once scene keeps the shelf's own props on the floor.
check('world nothing is put on the shelf, its hooks or the stand for the player',all.every(i=>!['shelf','shelf-hooks','stand'].includes(i.worldEntry?.support?.id)),JSON.stringify(all.filter(i=>i.worldEntry?.support).map(i=>[i.id,i.worldEntry.support.id])));
const pet=catMid();
check('world homes leave cat petting stroke clear',all.every(i=>![-36,0,36].some(d=>i.hits(pet.x,pet.y+d))));
await __shot('world-unit2-all');
const rack=keepsakes.get('rack'),rx=rack.x,ry=rack.y;
await drag([{x:rack.px.x,y:rack.px.y-rack.h*.4},{x:rack.px.x+60,y:rack.px.y-100}]);
check('world rack fixed bottom left',rack.def.fixed&&rack.x===rx&&rack.y===ry&&rack.px.x<stage.width*.35);
store.flush();check('world saves versioned floor poses',all.every(i=>i.def.fixed ? !('x' in store.get('keepsakes.'+i.id)) : store.get('keepsakes.'+i.id+'.world')?.version===1));
// Existing v2 coordinate data remains valid and derives a quiet y=0 anchor.
const legacy=keepsakes.toUnits(stage.width*.55,keepsakes.floorY());
keepsakes.take('ticket');store.set('keepsakes.ticket',{...legacy,state:{},order:21});keepsakes.define(keepsakes.defs.get('ticket'));await keepsakes.get('ticket').worldTask;
check('world legacy v2 ticket migrates without motion',keepsakes.get('ticket').resting&&!keepsakes.physics.active);
await sleep(5000); // allow font/adaptive-resolution startup resizing to finish
const n=L.stats.shadowUpdates,steps=site.world.stats.steps,callbacks=stage.onFrame.length;
await sleep(2100);
check('world placement sleeps without updates',L.stats.shadowUpdates===n&&site.world.stats.steps===steps&&stage.onFrame.length===callbacks,`shadow updates=${L.stats.shadowUpdates-n}`);
check('world shadows attached to world plane',L.shadows.has('top')&&L.shadows.has('rifle'));
const f=L.furniture();check('world furniture reserved',f.shelf.x<f.pinboard.x&&f.pinboard.y>=stage.insets.top&&f.rack.fixed,JSON.stringify({furniture:f,insets:stage.insets}));
// Layout lane (playtest-3, e1113-30): the floor row. The controller stand and the egg cup arrive in a furnished room (the
// collection above already rests on the floor): they stand in one straight row right of the rack, reserved, and any
// keepsake where they land is moved out, not left inside them.
{const cm=await import(new URL('src/flappy/controller.js',document.baseURI).href),cu=await import(new URL('src/world/egg-cup.js',document.baseURI).href);
 const STAND_S=(await import(new URL('src/flappy/stand.js',document.baseURI).href)).STAND.scale;
 store.set('bird.stand',true);store.set('eggCup',true);await cm.ensureStand(site,{arrive:true});await cu.eggCupService(site).ensure({arrive:true});
 await until(()=>site.stand.arrival?.done&&site.eggCup.arrival?.done,8000);await until(()=>!site.world.stats.listening,15000);await sleep(500);
 const g=L.furniture(),sp=site.stand.root.position,cp=site.eggCup.root.position;
 check('world the floor row: rack, stand, cup in one straight row, reserved',g.stand?.fixed&&g['egg-cup']?.fixed&&Math.abs(sp.z-cp.z)<1e-6&&g.rack.x<g.stand.x&&g.stand.x<g['egg-cup'].x&&!(g.shelf.y+g.shelf.h>g.stand.y+g.stand.h),JSON.stringify({rack:g.rack,stand:g.stand,cup:g['egg-cup']}));
 const inside=[],T3=site.THREE;for(const i of keepsakes.live.values()){const e=i.worldEntry;if(!e||e.support||site.world.entries.get(i.id)!==e)continue;const c=new T3.Vector3().copy(e.body.translation());
  const ls=site.stand.root.worldToLocal(c.clone()),k=STAND_S;if(Math.abs(ls.x)<.36*k&&Math.abs(ls.z)<.16*k&&ls.y<.4*k)inside.push(['stand',i.id,ls.toArray().map(v=>+v.toFixed(3))]);
  const lc=site.eggCup.root.worldToLocal(c.clone());if(Math.hypot(lc.x,lc.z)<site.eggCup.half&&lc.y<.25)inside.push(['cup',i.id,lc.toArray().map(v=>+v.toFixed(3))]);}
 check('world no keepsake is left inside the stand or the cup (its middle in their footprint)',!inside.length,JSON.stringify(inside));
 await __shot('world-floor-row');
 store.set('worldRowCheck',{stand:sp.toArray(),cup:cp.toArray()});}
// Exercise saved rigid pose using the same service adapters will use in unit 3.
const T=stage.THREE,obj=new T.Group();stage.scene.add(obj);
let e=await site.world.add({id:'layout-fixture',object:obj,shapes:[{half:[.04,.04,.04]}],position:L.anchor(stage.width*.55),persist:true});
for(let n=0;n<960;n++)site.world.step(1/120);
const saved=store.get('worldBodies.layout-fixture'),before={...e.body.translation()};site.world.remove(e.id);
e=await site.world.add({id:'layout-fixture',object:obj,shapes:[{half:[.04,.04,.04]}],persist:true});
const u=stage.toScreen(new T.Vector3().copy(before)),v=stage.toScreen(obj.position);
check('world saved rigid pose restores asleep',saved?.version===1&&e.body.isSleeping()&&Math.hypot(u.x-v.x,u.y-v.y)<.5,`drift=${Math.hypot(u.x-v.x,u.y-v.y).toFixed(4)}px`);
site.world.remove(e.id);stage.scene.remove(obj);store.del('worldBodies.layout-fixture');
window.__worldLayoutSnapshot=[...keepsakes.live.values()].filter(i=>!i.def.sky).map(i=>({id:i.id,x:i.px.x,y:i.px.y}));
store.set('worldLayoutCheck',window.__worldLayoutSnapshot);store.flush();
note('board layout restore before',JSON.stringify({selected:site.pinboard.selected,savedSelected:store.get('pinboard.selected'),root:site.pinboard.root.position.toArray(),paper:keepsakes.get('paper').worldEntry.body.translation(),box:site.pinboard.picture.rect}));
// Matched submission-cost measurements: identical scene/camera, only shadow visibility differs.
// Real GPU renderer, CPU submission time (not GPU completion or iPhone frame time).
// e1111-21: builders can run functional placement/restore without speed gates.

if(stage.opt('functional')!=='1'){
const groups=[...site.worldLayout.shadows.values()].map(e=>e.group),samples={baseline:[],world:[]};
for(let repeat=0;repeat<5;repeat++)for(const enabled of [false,true]){
 for(const g of groups)g.visible=enabled;
 await sleep(100);
 const costs=[];
 for(let i=0;i<120;i++){const t=performance.now();stage.renderer.render(stage.scene,stage.camera);costs.push(performance.now()-t);}
 costs.sort((a,b)=>a-b);samples[enabled?'world':'baseline'].push(costs[60]);
}
for(const g of groups)g.visible=true;
const median=a=>[...a].sort((a,b)=>a-b)[2],delta=median(samples.world)-median(samples.baseline);
note('world matched rest submission cost',JSON.stringify({samples,delta,units:'ms CPU render submission; identical cached cat, 5x120 renders'}));
check('world rest submission delta <=0.1ms',delta<=.1,`delta=${delta.toFixed(3)}ms`);


}
