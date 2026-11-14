// Production interactions; no cost or frame-time gates. See the separate reload runner.
cat.auto=false;
const C=E.box.recipe,W=site.world,T=site.THREE;
const settle=async()=>{await until(()=>!W.stats.listening,16000);};
const advance=n=>{const hooks=[...W.entries.values()].map(e=>[e,e.sync]);hooks.forEach(([e])=>e.sync=null);for(let k=0;k<n;k++)W.step(1/120);hooks.forEach(([e,s])=>{if(W.entries.has(e.id)){e.sync=s;W.sync(e);}});};
const hit=i=>{for(let y=i.box.y+4;y<i.box.y+i.box.h-4;y+=5)for(let x=i.box.x+4;x<i.box.x+i.box.w-4;x+=5)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
await E.bread.whenReady();
await fast(8,async()=>{site.cast('dome');await stage.after(.2);E.bread.toCat();await stage.after(.3);site.cast('dome');await stage.after(.2);E.bread.toCat();await stage.after(.3);});
await fast(12,async()=>{await site.cast('cup');await site.cast('cup');});
for(const id of ['flour','bucket'])await keepsakes.get(id)?.worldTask;
check('cake bread twice gives flour and cup twice gives pail',C.state.bread>=2&&C.state.cup===2&&keepsakes.get('flour')?.worldReady&&keepsakes.get('bucket')?.worldReady);
await site.cast('square');const box=keepsakes.get('box');await box.worldTask;advance(600);
check('cake original box entry ends and never repeats',C.state.intro&&!cat.hidden&&!E.box.inside&&await E.box.drop()&&!E.box.inside);
const p=hit(box),was=C.state.open,body=box.worldEntry.body;
if(p){fire('pointerdown',p.x,p.y,++pointerIds);check('cake short press creates no grip',!W.held);await sleep(45);fire('pointerup',p.x,p.y,pointerIds,0);await until(()=>!E.box.lidMoving,5000);}
check('cake short click toggles only the lid',p&&C.state.open!==was&&!E.box.inside&&!cat.hidden);
if(!C.state.open)await E.box.setOpen(true);advance(360);
const hp=hit(box);if(hp){const id=++pointerIds;fire('pointerdown',hp.x,hp.y,id);await sleep(260);check('cake hold creates weighted point grip',W.held?.entry===box.worldEntry);fire('pointercancel',hp.x,hp.y,id,0);}
check('cake hold cancellation preserves lid and releases grip',C.state.open&&!W.held);advance(480);
await __shot('world-unit8-open');
// Closed-top contact uses a real portion dropped from above, not an admission API.
await C.dispense('flour');const flour=keepsakes.get('recipe-flour');await E.box.setOpen(false);
const bp=new T.Vector3().copy(body.translation()),bq=new T.Quaternion().copy(body.rotation());
flour.worldEntry.body.setTranslation(new T.Vector3(0,.65*box.chainScale,0).applyQuaternion(bq).add(bp),false);W.wake(flour.worldEntry);advance(600);
check('cake closed lid rejects falling flour',!C.state.contents.includes('recipe-flour')&&flour.worldEntry.body.translation().y>body.translation().y+.3*box.chainScale);
await E.box.setOpen(true);
// Fork hook is the production sigil event; only the upper exit starts the visit.
site.cast('fork');await keepsakes.get('pitchfork').worldTask;
check('cake fork event supplies exactly one physical pitchfork',keepsakes.get('pitchfork').worldReady&&[...W.entries.keys()].filter(id=>id==='pitchfork').length===1);
await C.throwFork();advance(180);await until(()=>keepsakes.get('hay')?.worldReady,10000);
const h=keepsakes.get('hay'),e=h.worldEntry;
const sample=()=>({steps:W.stats.steps,landed:C.state.hay?.landed,fixed:e.fixed,timer:!!e.timer,sleep:e.body.isSleeping(),position:{...e.body.translation()},velocity:{...e.body.linvel()},contacts:[]});
function report(label){const v=sample();for(let n=0;n<e.body.numColliders();n++)W.physics.contactPairsWith(e.body.collider(n),other=>{v.contacts.push(other.parent()?.userData||'floor');});note('hay premise '+label,JSON.stringify(v));}
report('before 800');advance(800);report('after 800');
let more=0;while(!C.state.hay?.landed&&more<960){advance(1);more++;if(more%120===0)report('extra '+more);}
note('hay premise additional steps to land',String(more));report('end');
