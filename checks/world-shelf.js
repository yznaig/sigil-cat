cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const a=keepsakes.give('tin');await a.worldTask;check('shelf one unique solid stays locked',!site.shelf.ready&&S.count('solid')===1);
keepsakes.give('tin');check('shelf duplicate remains locked',S.count('solid')===1&&!site.shelf.ready);
const items=[a];for(const id of ['rifle','top','pat']){const i=keepsakes.give(id);await i.worldTask;items.push(i);}await site.shelf.task;await until(()=>!W.stats.listening,10000);
const shelf=site.shelf;
check('shelf two uniques unlock one fixed support',shelf.ready&&shelf.entry.fixed&&S.count('solid')===4&&shelf.slots.length===4);
check('shelf starts empty without moving collection',items.every(i=>!i.worldEntry.support));
for(const i of items)shelf.store(i.id,false);await sleep(200);await __shot('world-unit6-filled');
const r=shelf.picture.rect,m=catMid();
check('shelf fits left and clear of the pet stroke',r.x>=0&&r.x+r.w<=stage.width&&![m.y-36,m.y,m.y+36].some(y=>m.x>=r.x&&m.x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h),JSON.stringify({rect:r,cat:m}));
// e1111-34: no button row; drag (mouse/touch) is the way to arrange.
check('shelf has no button row',!document.querySelector('.world-shelf-actions,.shelf-arrange-scrim'));
const ids=items.map(i=>i.worldEntry.body.handle);const tin=a.worldEntry;
const before=JSON.stringify(tin.support);check('shelf wrong bay rejects atomically',!S.mount(tin,'shelf','pat')&&JSON.stringify(tin.support)===before);
S.detach(tin,{wake:false});const slot=shelf.slots.find(s=>s.id==='tin'),pose=S.pose('shelf','tin');tin.body.setTranslation(pose.p,false);W.sync(tin);slot.occupant='reserved';check('shelf occupied bay rejects',!S.offer(tin)&&!tin.support);slot.occupant=null;
tin.body.setLinvel({x:2,y:0,z:0},false);check('shelf fast release rejects',!S.offer(tin)&&!tin.support);tin.body.setLinvel({x:0,y:0,z:0},false);
const started=performance.now();check('shelf slow release accepted',S.offer(tin));await until(()=>!S.active,400,5);check('shelf plop finishes within .25s',performance.now()-started<=250&&!S.active,`${(performance.now()-started).toFixed(2)}ms`);
// Real off-centre routed drag; the same pointer path is mouse/touch by viewport.
const top=keepsakes.get('top'),findHit=i=>{for(let y=i.box.y+5;y<i.box.y+i.box.h-5;y+=3)for(let x=i.box.x+5;x<i.box.x+i.box.w-5;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
const hit=findHit(top);check('shelf stored splat remains pickable',!!hit);
if(hit){const pid=++pointerIds;fire('pointerdown',hit.x,hit.y,pid);fire('pointermove',hit.x+12,hit.y+10,pid);await sleep(300);check('shelf live grip detaches and retains identity',W.held?.entry===top.worldEntry&&!top.worldEntry.support&&W.physics.impulseJoints.len()===0);
 const target=S.pose('shelf','top'),grab=target.p.clone().add(W.held.local.clone().applyQuaternion(target.q)),p=stage.toScreen(grab);
 for(let n=0;n<40;n++){fire('pointermove',p.x,p.y,pid);await sleep(25);}const slowed=await until(()=>!!shelf.preview,3000,20);check('shelf compatible slow grip previews',slowed,JSON.stringify({speed:top.worldEntry.body.linvel(),candidate:S.candidate(top.worldEntry)}));await __shot('world-unit6-preview');
 fire('pointerup',p.x,p.y,pid,0);await sleep(250);check('shelf mouse or touch release inserts',top.worldEntry.support?.id==='shelf'&&!W.held&&!shelf.preview);
}
const lift=[...a.key.querySelectorAll('button')].find(b=>b.textContent.startsWith('Lift / place'));lift.focus();await __key('Enter');check('shelf native keyboard lifts same body',W.held?.entry===tin);await __key('Escape');check('shelf escape leaves no orphan joint',!W.held&&W.physics.impulseJoints.len()===0&&!shelf.preview);shelf.store('tin',false);
await sleep(150);await __shot('world-unit6-arrange');
check('shelf retains four identities',items.every((i,n)=>i.worldEntry.body.handle===ids[n])&&items.every(i=>i.worldEntry.support?.id==='shelf'));
// Both new mesh backs and undersides use the actual physical object and cache.
for(const i of [a,keepsakes.get('pat')]){S.detach(i.worldEntry,{wake:false});W.park(i.worldEntry);const p=site.worldLayout.anchor(stage.width*.7);p.y=.3;i.worldEntry.body.setTranslation(p,false);i.worldEntry.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(.9,Math.PI,.2)),false);W.sync(i.worldEntry);await __shot('world-unit6-back-'+i.id);shelf.store(i.id,false);}
await sleep(2200);const snapshot=()=>({steps:W.stats.steps,syncs:W.stats.syncs,shadows:site.worldLayout.stats.shadowUpdates,supports:S.stats.frames,atlas:site.meshPictures.stats.passes,shelf:shelf.picture.stats.draws,callbacks:stage.onFrame.length});const quiet=snapshot();await sleep(2100);check('shelf supported zero idle work',JSON.stringify(quiet)===JSON.stringify(snapshot())&&!S.listening&&!W.stats.listening,JSON.stringify({before:quiet,after:snapshot()}));
store.set('shelfCheck',items.map(i=>({id:i.id,p:i.object.position.toArray(),q:i.object.quaternion.toArray(),support:i.worldEntry.support,box:{...i.box}})));store.flush();
