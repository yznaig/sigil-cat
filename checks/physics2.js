// Physics and handling lane (Aaron's playtest notes e1111-58, 2026-11-12): one section per note.
//  1 solid contacts: the hand pushes, never passes through or presses into the floor; a sunk body is lifted once
//  2 the cat takes his space (collider) and draws in depth order against items
//  3 no spin from picking up or the wheel     4 scroll down = nearer     5 >80% off the page starts the respawn
//  6 Nearer/Deeper on touch only, no keyboard buttons    7 snapping by pointer position, at any depth
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const {HOLD}=await import('/src/core/world.js');
const ids=['rifle','top','tin','pat','postcard','paper'];
for(const id of ids)keepsakes.give(id);
await Promise.all(ids.map(id=>keepsakes.get(id).worldTask));await site.shelf.task;await site.pinboard.task;
await until(()=>!W.stats.listening&&!S.listening,20000);
const B=id=>keepsakes.get(id).worldEntry;
const step=(n,dt=1/120)=>{for(let k=0;k<n;k++)W.step(dt);};
const v3=v=>new T.Vector3(v.x,v.y,v.z);
function park(e,p,q){S.detach(e,{wake:false});W.cancelReturn(e);e.body.setTranslation(p,false);if(q)e.body.setRotation(q,false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);e.object.visible=true;W.sync(e);}
function lowY(e){const q=new T.Quaternion().copy(e.body.rotation()),p=v3(e.body.translation());return Math.min(...keepsakes.get(e.id).colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p).y));}
function depth(a,b){let d=Infinity;for(let i=0;i<a.numColliders();i++)for(let j=0;j<b.numColliders();j++){const c=a.collider(i).contactCollider(b.collider(j),0);if(c)d=Math.min(d,c.distance);}return d;}
// Everything else parked out of the way, so each section measures the bodies it names.
const aside=e=>{park(e,{x:8,y:.3,z:-6});W.park(e);};
for(const id of ids)aside(B(id));
// fy: 0 at the floor band's preferred line (worldLayout.floorY), 1 at the footer's top edge.
const floorAt=(fx,fy)=>{const L=site.worldLayout,y0=L.floorY(),y1=stage.height-stage.insets.bottom-30;return stage.onFloor(stage.width*fx,y0+(y1-y0)*fy);};

// ---- 1. solid contacts ----
{
 const rifle=B('rifle'),tin=B('tin'),spot=floorAt(.5,.5),from=floorAt(.2,.5),to=floorAt(.8,.5);
 park(tin,{x:spot.x,y:.06,z:spot.z});W.wake(tin);step(240);
 const start=v3(tin.body.translation());
 park(rifle,{x:from.x,y:.25,z:from.z});W.wake(rifle);step(2);
 W.grab(rifle,v3(rifle.body.translation()));let worst=Infinity;
 // Sweep the grip straight through the resting tin, then press down into the floor.
 for(let n=0;n<=120;n++){W.move(new T.Vector3(from.x+(to.x-from.x)*n/120,.15,spot.z));step(1);worst=Math.min(worst,depth(rifle.body,tin.body));}
 let lowest=Infinity;W.move(new T.Vector3(to.x,-1,spot.z));for(let n=0;n<120;n++){step(1);lowest=Math.min(lowest,lowY(rifle));}
 const target=W.held.target.y;W.release();
 const pushed=v3(tin.body.translation()).distanceTo(start);
 check('physics2 held rifle pushes the tin instead of passing through it',worst>-.02&&pushed>.05,JSON.stringify({deepest:worst,pushed,tin:tin.body.translation(),rifle:rifle.body.translation(),tinTimer:!!tin.timer,rifleTimer:!!rifle.timer,spot}));
 check('physics2 the hand cannot press a body into the floor',target>=0&&lowest>-.02,JSON.stringify({target,lowest}));
 // A body found inside the floor (a stale pose) is lifted out once and then rests, without rattling there.
 const unsunk=W.stats.unsunk;park(tin,{x:spot.x,y:-.4,z:spot.z});W.wake(tin);step(90);
 const lifted=lowY(tin);let steps=0;for(;steps<960&&!tin.body.isSleeping();steps++)step(1);
 check('physics2 a sunk body is lifted out and comes to rest',W.stats.unsunk>unsunk&&lifted>-.012&&tin.body.isSleeping(),JSON.stringify({lifted,unsunk:W.stats.unsunk-unsunk,restAfter:steps/120}));
 aside(rifle);aside(tin);
}

// ---- 2. the cat's space ----
{
 const tin=B('tin'),C=W.cat;step(1);
 check('physics2 cat body follows his pose',!!C?.body&&C.enabled&&C.pose===cat.shown&&C.body.numColliders()>=2,JSON.stringify({pose:C?.pose,shown:cat.shown,colliders:C?.body?.numColliders()}));
 const throwAt=()=>{park(tin,{x:0,y:.45,z:1.1});tin.body.setLinvel({x:0,y:.5,z:-3},false);W.wake(tin);let deepest=Infinity,minZ=Infinity;for(let n=0;n<180;n++){step(1);if(C.enabled)deepest=Math.min(deepest,depth(tin.body,C.body));minZ=Math.min(minZ,tin.body.translation().z);}return {deepest,minZ};};
 const bumped=throwAt();
 C.suspend('physics2',true);step(1);const through=throwAt();C.suspend('physics2',false);step(1);
 check('physics2 a thrown tin bumps off the cat, not through him',bumped.deepest>-.02&&bumped.minZ>through.minZ+.2,JSON.stringify({bumped,withoutCat:through}));
 // The hull turns with him.
 const yaw0=cat.yaw;cat.setYaw(yaw0+1.2);await sleep(80);W.wake(tin);step(2);const q=new T.Quaternion().copy(C.body.rotation()),turned=new T.Euler().setFromQuaternion(q,'YXZ').y;
 cat.setYawTarget(null);
 check('physics2 cat body turns with him',Math.abs(Math.atan2(Math.sin(turned-cat.spin.rotation.y),Math.cos(turned-cat.spin.rotation.y)))<.02,JSON.stringify({turned,shown:cat.spin.rotation.y}));
 aside(tin);
}
// Depth against the cat: a tin straight behind him is hidden by him; straight in front it covers him.
{
 const tin=B('tin'),gl=stage.renderer.getContext();
 async function pixel(p){
  let out=null;const f=()=>{const d=stage.dpr,x=Math.round(p.x*d),y=gl.drawingBufferHeight-Math.round(p.y*d),px=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);out=[...px];};
  stage.onPresented.push(f);await until(()=>out,3000,10);stage.onPresented.splice(stage.onPresented.indexOf(f),1);return out;
 }
 const mid=new T.Vector3(0,cat.spin.position.y+cat.height*.45,0);
 const cam=stage.camera.position,dir=mid.clone().sub(cam).normalize();
 // Along the same sight line through his middle, behind him and in front of him.
 const along=t=>cam.clone().add(dir.clone().multiplyScalar(t));
 const dMid=mid.distanceTo(cam),back=along(dMid+.75),front=along(dMid-.9);
 // Hovering on the sight line: teleporting off a contact (behind, he touches it) wakes the body, so no gravity here.
 const upright=new T.Quaternion();tin.body.setGravityScale(0,false);park(tin,back,upright);W.park(tin);W.sync(tin);await sleep(150);
 const screen=stage.toScreen(back),withBehind=await pixel(screen),pickBehind=site.worldInput.pick({clientX:screen.x,clientY:screen.y})?.entry?.id;
 const behindCount=site.worldPresentation.stats.behindCat;
 tin.object.visible=false;W.sync(tin);await sleep(150);const without=await pixel(screen);tin.object.visible=true;
 park(tin,front,upright);W.park(tin);W.sync(tin);await sleep(150);const s2=stage.toScreen(front),withFront=await pixel(s2),pickFront=site.worldInput.pick({clientX:s2.x,clientY:s2.y})?.entry?.id;
 await __shot('physics2-tin-in-front-of-cat');
 park(tin,back);W.park(tin);W.sync(tin);await sleep(150);await __shot('physics2-tin-behind-cat');tin.body.setGravityScale(1,false);
 const diff=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
 check('physics2 an item behind the cat draws behind him',diff(withBehind,without)<=15&&behindCount>=1,JSON.stringify({withBehind,without,behindCount}));
 check('physics2 an item in front of the cat draws over him',diff(withFront,without)>30,JSON.stringify({withFront,without,timer:!!tin.timer,visible:tin.object.visible,card:tin.presentation.card.visible,rect:tin.presentation.rect,s2}));
 check('physics2 the cat hides a body behind him from the pointer',pickBehind!=='tin'&&pickFront==='tin',JSON.stringify({pickBehind,pickFront}));
 aside(tin);
}

// ---- 3 and 4. no spin; the wheel brings it nearer ----
{
 const rifle=B('rifle'),inst=keepsakes.get('rifle'),spot=floorAt(.45,.3);
 park(rifle,{x:spot.x,y:.2,z:spot.z});W.wake(rifle);step(240);
 const end=inst.colliderVertices.slice().sort((a,b)=>a.x-b.x)[0].clone().applyQuaternion(rifle.object.quaternion).add(rifle.object.position);
 W.grab(rifle,end);const lift=end.clone();lift.y+=.35;W.move(lift);
 let held=0;for(let n=0;n<120;n++){step(1);const w=rifle.body.angvel();held=Math.max(held,Math.hypot(w.x,w.y,w.z));}
 const fwd=stage.camera.getWorldDirection(new T.Vector3()),depthOf=p=>p.clone().sub(stage.camera.position).dot(fwd);
 const before=depthOf(W.held.target);canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));const nearer=depthOf(W.held.target);
 canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true}));const deeper=depthOf(W.held.target);
 check('physics2 scrolling down brings the held item nearer, up takes it deeper',nearer<before-.03&&deeper>nearer+.03,JSON.stringify({before,nearer,deeper}));
 let wheel=0;
 for(let n=0;n<60;n++){canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:n%20<10?240:-240,bubbles:true,cancelable:true}));step(2);const w=rifle.body.angvel();wheel=Math.max(wheel,Math.hypot(w.x,w.y,w.z));}
 W.release();const w=rifle.body.angvel(),after=Math.hypot(w.x,w.y,w.z);
 check('physics2 picking up and wheeling never spins the rifle up',held<=HOLD.spin+.01&&wheel<=HOLD.spin+.01&&after<=HOLD.release.spin+.01,JSON.stringify({held,wheel,afterRelease:after,cap:HOLD.spin}));
 aside(rifle);
}

// ---- 5. more than 80% off the page starts the respawn ----
{
 const tin=B('tin'),y=stage.height*.5;
 const at=x=>{const p=stage.onWall(x,y,.3);park(tin,p);tin.body.setGravityScale(0,false);W.wake(tin);step(1);return tin.presentation.rect;};
 // Slide it right until the wanted share of its picture is still on the page, then let the world run 70 substeps.
 const share=want=>{let x=stage.width*.5;for(let k=0;k<60&&W.visibleShare(tin)>want;k++){x+=12;at(x);}return W.visibleShare(tin);};
 at(stage.width*.5);const halfShare=share(.5);step(70);const half=!!tin.timer;W.cancelReturn(tin);
 at(stage.width*.5);const mostlyShare=share(.12);step(70);const mostly=!!tin.timer;W.cancelReturn(tin);
 const lens=stage.camera.position.clone().add(stage.camera.getWorldDirection(new T.Vector3()).multiplyScalar(.25));park(tin,lens);W.wake(tin);step(70);const near=!!tin.timer;W.cancelReturn(tin);
 tin.body.setGravityScale(1,false);
 check('physics2 a body more than 80% off the page starts its respawn; half on stays',!half&&mostly&&near,JSON.stringify({half,halfShare,mostly,mostlyShare,atTheLens:near}));
 aside(tin);
}

// ---- 6. buttons ----
{
 const tin=B('tin'),spot=floorAt(.55,.4);park(tin,{x:spot.x,y:.06,z:spot.z});W.wake(tin);step(240);
 const p=stage.toScreen(tin.object.position),pid=++pointerIds;fire('pointerdown',p.x,p.y,pid);fire('pointermove',p.x+30,p.y-30,pid);await sleep(60);
 const bar=document.querySelector('.world-grip'),labels=bar?[...bar.querySelectorAll('button')].map(b=>b.textContent):[];fire('pointerup',p.x+30,p.y-30,pid,0);await sleep(60);
 const touch=matchMedia('(pointer: coarse)').matches;
 site.worldInput.keyboardLift(tin);const keyBar=[...document.querySelectorAll('.world-grip button')].map(b=>b.textContent);site.worldInput.cancel();
 check('physics2 Nearer/Deeper only on touch, no keyboard buttons',(touch?JSON.stringify(labels)===JSON.stringify(['Nearer','Deeper']):!bar)&&!keyBar.some(t=>/[←↑↓→]|Place/.test(t))&&!document.querySelector('.world-rack-actions'),JSON.stringify({touch,labels,keyBar}));
 aside(tin);
}

// ---- 7. snapping by pointer position ----
async function snap(id,support,slot){
 const e=B(id),spot=floorAt(.62,.4);park(e,{x:spot.x,y:.08,z:spot.z});W.wake(e);step(300);
 const inst=keepsakes.get(id);let hit=null;const r=e.presentation.rect;
 for(let y=r.y+3;!hit&&y<r.y+r.h-3;y+=3)for(let x=r.x+3;x<r.x+r.w-3;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===e){hit={x,y};break;}
 if(!hit)return {hit:false,rect:{...r},timer:!!e.timer,visible:e.object.visible,p:e.body.translation(),sleeping:e.body.isSleeping()};
 const pid=++pointerIds;fire('pointerdown',hit.x,hit.y,pid);fire('pointermove',hit.x+10,hit.y-10,pid);
 // the wrong depth on purpose: as near as the hand allows
 for(let n=0;n<12;n++)canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:200,bubbles:true,cancelable:true}));
 const f=S.footprint(e,support,S.registry.get(support).slots.find(s=>s.id===slot)),dest={x:f.cx,y:f.cy};
 for(let n=1;n<=24;n++){fire('pointermove',hit.x+(dest.x-hit.x)*n/24,hit.y+(dest.y-hit.y)*n/24,pid);await sleep(16);}
 await sleep(80);
 const shown=support==='shelf'?!!site.shelf.preview:site.worldInput.highlight?.dataset.support===support;
 const gap=v3(e.body.translation()).distanceTo(S.pose(support,slot).p);
 await __shot('physics2-snap-'+id);
 fire('pointerup',dest.x,dest.y,pid,0);await sleep(400);
 return {hit:true,shown,gapAtRelease:gap,support:e.support?.id,slot:e.support?.slot};
}
{
 const tin=await snap('tin','shelf','tin');
 check('physics2 shelf: pointer over the bay highlights and places the tin at any depth',tin.shown&&tin.support==='shelf'&&tin.slot==='tin',JSON.stringify(tin));
 if(!MOBILE){
  const card=await snap('postcard','pinboard','postcard');
  check('physics2 board: pointer over the spot highlights and pins the card at any depth',card.shown&&card.support==='pinboard',JSON.stringify(card));
 }
}

// ---- 8. cost: a tumbling splat prop is sorted on the worker, and exactly once more where it comes to rest ----
{
 const {SORT}=await import('/src/core/prop-picture.js');
 const rifle=B('rifle'),pic=keepsakes.get('rifle').picture,spot=floorAt(.5,.3);
 park(rifle,{x:spot.x,y:.9,z:spot.z});rifle.body.setAngvel({x:3,y:2,z:1},true);W.wake(rifle);
 const r0=pic.stats.requests,a0=pic.stats.asyncSorts;
 const rested=await until(()=>rifle.body.isSleeping()&&!W.stats.listening,12000);await sleep(100);
 const angle=pic.mesh.sortAngle(stage.camera);
 check('physics2 a tumbling splat prop sorts off the main thread, exactly at rest',rested&&pic.stats.requests>r0&&pic.stats.asyncSorts>a0&&pic.precise&&pic.mesh.lod===1&&angle<=SORT.exact,JSON.stringify({rested,requests:pic.stats.requests-r0,answers:pic.stats.asyncSorts-a0,precise:pic.precise,angle}));
 aside(rifle);
}
