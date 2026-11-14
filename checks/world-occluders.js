// Physics lane, playtest-2 item 4 (Aaron: "things behind the cat should be slowly scooted off to the left or right
// until they are in frame and grabbable. the cloud also gets stuck, but this could be solved by simply letting it
// float all the way from left to right"; e1112-35: behind ANY furniture too). src/core/world-occluders.js.
cat.auto=false;const W=site.world,O=site.occluders,T=site.THREE,S=site.supports;
const {SCOOT}=await import('/src/core/world-occluders.js');
const tin=keepsakes.give('tin');keepsakes.give('rack');await tin.worldTask;await keepsakes.get('rack')?.worldTask;
await until(()=>!W.stats.listening,15000);
const e=tin.worldEntry;
function park(p){S.detach(e,{wake:false});W.cancelReturn(e);e.body.setTranslation(p,false);e.body.setRotation({x:0,y:0,z:0,w:1},false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);e.object.visible=true;W.sync(e);W.wake(e);}
function reach(){const r=tin.picture.rect;for(let y=Math.max(r.y+3,stage.insets.top);y<Math.min(r.y+r.h-3,stage.height-stage.insets.bottom);y+=4)for(let x=Math.max(3,r.x+3);x<Math.min(stage.width-3,r.x+r.w-3);x+=4)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===e)return true;return false;}
// Straight behind something along the line of sight through its middle, on the floor.
function behind(screen,deeper){const r=stage.ray(screen.x,screen.y),t=(0-r.origin.y)/r.direction.y;const f=r.origin.clone().add(r.direction.clone().multiplyScalar(t));
 const d=new T.Vector3().copy(f).sub(stage.camera.position);d.y=0;d.normalize();return f.add(d.multiplyScalar(deeper));}
async function trial(name,where,cover){
 park(where);await until(()=>e.body.isSleeping()||!!e.scoot,4000);
 const hiddenAtFirst=O.exposure(e);const scoots=O.stats.scoots;
 // Judged when it comes to rest: it may already be sliding.
 await until(()=>!!e.scoot,4000);const slid=O.stats.scoots>scoots||!!e.scoot||hiddenAtFirst.share>=SCOOT.hidden;
 await until(()=>!e.scoot&&e.body.isSleeping()&&!W.stats.listening,(SCOOT.patience+6)*1000);
 const after=O.exposure(e),picked=reach();
 await __shot('occluders-'+name);
 check('occluders a tin left behind '+name+' slides out until it can be seen and picked up',hiddenAtFirst.share<SCOOT.hidden&&hiddenAtFirst.by===cover&&slid&&after.share>=SCOOT.hidden&&picked,
  JSON.stringify({first:hiddenAtFirst,after,picked,stats:O.stats,p:e.body.translation()}));
}
// the cat
{const mid=cat.screenOf([0,cat.height*.25,0]);await trial('the cat',behind({x:mid.x,y:stage.toScreen(new T.Vector3(0,0,0)).y},.55),'cat');}
// the recycling bin (a fixed world entry with a picture: found by the data, not by name)
{keepsakes.give('crumbs');keepsakes.give('shards');await until(()=>E.recycle?.armed,10000);await until(()=>!W.stats.listening,12000);
 const bin=[...W.entries.values()].find(x=>x.fixed&&x.id==='furniture-recycle-bin');
 if(bin){for(const id of ['crumbs','shards']){const x=keepsakes.get(id)?.worldEntry;if(x){S.detach(x,{wake:false});x.body.setTranslation({x:7,y:.3,z:-6},false);W.park(x);W.sync(x);}}
  const r=bin.presentation.rect;await trial('the recycling bin',behind({x:r.x+r.w/2,y:r.y+r.h*.85},.18),'furniture-recycle-bin');}
 else note('occluders the recycling bin','no bin here');}
// the controller stand with the controller in it (layout lane, playtest-3: the stand is an open frame, so what hides a
// thing there is the controller seated in it, registered by the stand as 'stand-seat'). The egg cup's own turn is in checks/egg-cup.js (a small keepsake: the tin is wider than the cup).
{const cm=await import(new URL('src/flappy/controller.js',document.baseURI).href);store.set('bird.stand',true);await cm.ensureStand(site);
 let c=keepsakes.give('controller');if(!c){cm.defineController(site,()=>{});c=keepsakes.give('controller');}await c.worldTask;await until(()=>site.stand.ready,10000);site.stand.place(c.worldEntry,false);
 await until(()=>!W.stats.listening,12000);const r=site.stand.rect;
 await trial('the controller in its stand',behind({x:r.x+r.w*.5,y:r.y+r.h*.8},.22),'stand-seat');}
// a registered occluder (any later furniture can register this way)
{O.add('test-panel',{covers:(ray,d,x,y)=>Math.abs(x-stage.width*.5)<120&&y>stage.height*.4});
 const spot=stage.onFloor(stage.width*.5,site.worldLayout.floorY()+30);await trial('a registered panel',{x:spot.x,y:.05,z:spot.z},'test-panel');O.remove('test-panel');}
// something in plain view is left alone
{let spot=null;for(const [fx,dy] of [[.82,40],[.2,40],[.5,90],[.7,10],[.3,90]]){const q=stage.onFloor(stage.width*fx,site.worldLayout.floorY()+dy);park({x:q.x,y:.05,z:q.z});await until(()=>e.body.isSleeping(),4000);if(O.exposure(e).share>=SCOOT.shown){spot=q;break;}}
 note('occluders plain-view spot',JSON.stringify(spot));spot??=stage.onFloor(stage.width*.82,site.worldLayout.floorY()+40);park({x:spot.x,y:.05,z:spot.z});await until(()=>e.body.isSleeping(),4000);await sleep(SCOOT.every*1000+300);
 check('occluders a tin in plain view is not moved',!e.scoot&&O.exposure(e).share>=SCOOT.shown,JSON.stringify(O.exposure(e)));}
// the cloud crosses the page left to right and comes in again from the left
{const c=keepsakes.give('cloud');await sleep(300);c.arrival=null;c.x=keepsakes.toUnits(stage.width*.75,0).x;c.cross=null;const xs=[];
 await fast(8,async()=>{for(let n=0;n<40;n++){xs.push(Math.round(c.px.x));await sleep(140);}});
 const rose=xs.slice(1).filter((x,k)=>x>xs[k]).length,wrapped=xs.slice(1).some((x,k)=>x<xs[k]-stage.width*.5);
 check('occluders the cloud drifts left to right across the page and comes round again',rose>=xs.length*.8&&wrapped,JSON.stringify(xs));}
