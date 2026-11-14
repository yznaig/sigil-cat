// Physics lane, playtest-2 (Aaron's notes, 2026-11-12), items 1-3:
//  1 "we can probably up the speed they can spin/move a little bit ... when you set them down on the ground they really
//    slowly settle": higher hand caps; a set-down body comes to rest quickly (world.js REST), a real topple still falls
//  2 "I was able to put the egg in the bucket, and the egg texture could be seen through the bucket ... The same thing
//    happens with the box. and if I put something ontop of the box and then open it, the item falls into it": pictures
//    composited by depth (world-presentation.js); the box tips off what is on its lid and out what is inside
//  3 "The pitchfork just got stuck in the bucket somehow": the pail's handle is a hook (world.js GROUPS); a held item
//    wedged inside a container is let go of it (world.js JAM)
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const {HOLD,REST,JAM}=await import('/src/core/world.js');
await until(()=>['box','bucket','pitchfork','egg'].every(id=>keepsakes.defs.has(id)),20000);
const ids=['box','bucket','pitchfork','egg','tin','rifle','pat','top'];for(const id of ids)keepsakes.give(id);
await Promise.all(ids.map(id=>keepsakes.get(id).worldTask));await until(()=>!W.stats.listening,20000);
const B=id=>keepsakes.get(id).worldEntry,v3=v=>new T.Vector3(v.x,v.y,v.z);
const step=n=>{for(let k=0;k<n;k++)W.step(1/120);};
function park(e,p,q){S.detach(e,{wake:false});W.cancelReturn(e);e.body.setTranslation(p,false);e.body.setRotation(q||{x:0,y:0,z:0,w:1},false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);e.object.visible=true;W.sync(e);}
// Out of the way (and out of the kitchen's own off-page recovery, which would drop it back in the middle).
const aside=(e,k)=>{park(e,{x:8+k,y:.3,z:-6});W.park(e);W.cancelReturn(e);};
ids.forEach((id,k)=>aside(B(id),k));
W.cat?.suspend('physics-p2',true);
const floorAt=(fx,dy=40)=>stage.onFloor(stage.width*fx,site.worldLayout.floorY()+dy);
// The set-downs stay above the bottom chrome (fix round A): on a phone on its side floorY()+40 is under the footer,
// where a resting body is rightly judged off the page and sent back.
const onPage=fx=>stage.onFloor(stage.width*fx,Math.min(site.worldLayout.floorY()+40,stage.height-stage.insets.bottom-28));

// ---- 1. the hand is quicker; set down, things come to rest ----
check('physics-p2 the hand moves and spins items faster than before (7 units/s, 4 rad/s)',HOLD.speed>=9&&HOLD.spin>=6&&HOLD.release.speed>=8,JSON.stringify(HOLD));
{const spot=onPage(.5),times={};
 // Clear floor: any other loose keepsake lying there (a phone on its side shows the recipe card on the floor) goes aside.
 let k=ids.length;for(const e of W.entries.values())if(!ids.includes(e.id)&&!e.fixed&&!e.support&&e.body.isDynamic()&&e.body.isEnabled())aside(e,k++);
 for(const id of ['rifle','tin','pat','box','pitchfork','top']){
  const e=B(id),inst=keepsakes.get(id);park(e,{x:spot.x-.4,y:.3,z:spot.z});W.wake(e);step(240);
  const q=new T.Quaternion().copy(e.body.rotation()),p=v3(e.body.translation()),pts=inst.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.x-b.x);
  const grip=pts[0].clone().lerp(pts.at(-1),.3);W.grab(e,grip);const lift=grip.clone();lift.y+=.4;
  for(let n=0;n<60;n++){W.move(lift.clone().lerp(new T.Vector3(spot.x,lift.y,spot.z),n/60));step(1);}
  for(let n=0;n<60;n++){W.move(new T.Vector3(spot.x,lift.y+(.03-lift.y)*n/60,spot.z));step(1);}
  W.release();let n=0;for(;n<600&&!e.body.isSleeping();n++)step(1);times[id]=+(n/120).toFixed(2);aside(e,ids.indexOf(id));
 }
 // Before this lane the same set-downs slept after 2.0-3.2 s (the rifle rolled for 2.5 s); Rapier alone never sleeps
 // a body sooner than 2 s.
 const sorted=Object.values(times).sort((a,b)=>a-b);
 check('physics-p2 set down by hand, each comes to rest under 2 s, most within 1.2 s',sorted.at(-1)<2&&sorted[sorted.length>>1]<=1.2,JSON.stringify({times,settled:W.stats.settled}));}
// A box let go balanced a little past its edge still falls flat; it is not frozen leaning.
{const e=B('box'),spot=floorAt(.5);park(e,{x:spot.x,y:.25,z:spot.z},new T.Quaternion().setFromEuler(new T.Euler(0,0,.7)));W.wake(e);
 let n=0;for(;n<900&&!e.body.isSleeping();n++)step(1);const up=new T.Vector3(0,1,0).applyQuaternion(new T.Quaternion().copy(e.body.rotation()));
 const flat=Math.max(Math.abs(up.x),Math.abs(up.y),Math.abs(up.z))>.98;
 check('physics-p2 a toppling box still falls all the way flat',flat&&e.body.isSleeping(),JSON.stringify({up,seconds:n/120}));aside(e,0);}

// ---- 2. depth: the egg in the pail, the box ----
const gl=stage.renderer.getContext();
async function pixel(p){let out=null;const f=()=>{const d=stage.dpr,x=Math.round(p.x*d),y=gl.drawingBufferHeight-Math.round(p.y*d),px=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);out=[...px];};stage.onPresented.push(f);await until(()=>out,3000,10);stage.onPresented.splice(stage.onPresented.indexOf(f),1);return out;}
const diff=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
{const bk=B('bucket'),egg=B('egg'),spot=floorAt(.35);park(bk,{x:spot.x,y:.002,z:spot.z});W.wake(bk);
 park(egg,{x:spot.x,y:.3,z:spot.z});W.wake(egg);await until(()=>!W.stats.listening,8000);await sleep(200);
 const s=keepsakes.get('bucket').chainScale,e0=v3(egg.body.translation());
 // a point on the pail's front wall, low down, in front of the egg; and the egg's own top through the opening
 const wall=stage.toScreen(e0);
 // somewhere over the egg's picture, the opening shows it (a real pick)
 let pickTop=null;const r=keepsakes.get('egg').picture.rect;for(let y=r.y+2;!pickTop&&y<r.y+r.h;y+=3)for(let x=r.x+2;x<r.x+r.w;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===egg){pickTop='egg';break;}
 const withEgg=await pixel(wall),pickWall=site.worldInput.pick({clientX:wall.x,clientY:wall.y})?.entry?.id;
 await __shot('physics-p2-egg-in-pail');
 egg.object.visible=false;W.sync(egg);await sleep(150);const without=await pixel(wall);egg.object.visible=true;W.sync(egg);
 check('physics-p2 an egg in the pail is hidden by its wall, seen and picked through the opening',diff(withEgg,without)<=12&&pickWall==='bucket'&&pickTop==='egg',JSON.stringify({withEgg,without,pickWall,pickTop,inside:e0.y<.2*s}));
 check('physics-p2 pictures draw with depth (mesh pictures carry their own)',site.worldPresentation.stats.depthQuads>=2,JSON.stringify(site.worldPresentation.stats));
 aside(egg,3);aside(bk,2);}
{const box=keepsakes.get('box'),be=B('box'),tin=B('tin'),spot=floorAt(.5,60);E.box.recipe.state.intro=true;
 if(E.box.recipe.state.open)await E.box.setOpen(false);
 park(be,{x:spot.x,y:.01,z:spot.z});W.wake(be);await until(()=>!W.stats.listening,8000);
 const top=v3(be.body.translation());top.y=.45*box.chainScale+.1;park(tin,top);W.wake(tin);await until(()=>!W.stats.listening,8000);
 const onLid=E.box.onLid().includes('tin');
 await E.box.setOpen(true);await until(()=>!W.stats.listening,8000);
 const inside=E.box.within().includes('tin'),p=v3(tin.body.translation());
 await __shot('physics-p2-box-opened-under-tin');
 check('physics-p2 a tin resting on the box lid is tipped off, not into the box, when it opens',onLid&&!inside&&!tin.timer&&p.y<.2,JSON.stringify({onLid,inside,p,timer:!!tin.timer,tipped:E.box.stats.tipped}));
 // something inside when it shuts is tipped out
 const mid=v3(be.body.translation());mid.y=.12*box.chainScale;park(tin,mid);W.wake(tin);await until(()=>!W.stats.listening,8000);
 const wasList=E.box.within(),wasIn=wasList.includes('tin');await E.box.setOpen(false);await until(()=>!W.stats.listening,8000);
 check('physics-p2 anything inside the box when it shuts is tipped out',wasIn&&!E.box.within().includes('tin')&&!tin.timer,JSON.stringify({wasIn,p:tin.body.translation(),box:be.body.translation(),tipped:E.box.stats.tipped,wasList,after:E.box.within()}));
 aside(tin,4);aside(be,0);}

// ---- 3. the pitchfork and the pail ----
{const bk=B('bucket'),pf=B('pitchfork'),fi=keepsakes.get('pitchfork'),spot=floorAt(.5),out=[];
 for(const [label,euler] of [['upright',[0,0,0]],['tilted',[0,0,.35]],['leaning',[0,.7,1.05]]]){
  park(bk,{x:spot.x,y:.002,z:spot.z});park(pf,{x:spot.x,y:.25,z:spot.z},new T.Quaternion().setFromEuler(new T.Euler(...euler)));W.wake(bk);W.wake(pf);step(480);
  const top=fi.colliderVertices.reduce((a,v)=>v.y>a.y?v:a,fi.colliderVertices[0]).clone().applyQuaternion(new T.Quaternion().copy(pf.body.rotation())).add(v3(pf.body.translation()));
  W.grab(pf,top);for(let n=0;n<120;n++){W.move(top.clone().add(new T.Vector3(0,1.2*n/120,0)));step(1);}step(60);
  const bq=new T.Quaternion().copy(bk.body.rotation()),bp=v3(bk.body.translation()),low=Math.min(...keepsakes.get('bucket').colliderVertices.map(v=>v.clone().applyQuaternion(bq).add(bp).y));
  out.push({label,bucketLow:+low.toFixed(3),forkTop:+(top.y+1.2-(W.held?W.held.target.y:0)).toFixed(2)});W.release();step(240);
 }
 check('physics-p2 pulling the pitchfork out of the pail never lifts the pail off the floor',out.every(o=>o.bucketLow<.03),JSON.stringify(out));
 // a held fork forced down inside the pail (the hand cannot get where it pulls) is let through instead of jamming
 park(bk,{x:spot.x,y:.002,z:spot.z});park(pf,{x:spot.x,y:.12,z:spot.z});W.wake(bk);W.wake(pf);step(240);
 const jams=W.stats.jams,g=v3(pf.body.translation()).add(new T.Vector3(0,.4,0));W.grab(pf,g);
 for(let n=0;n<90;n++){W.move(g.clone().add(new T.Vector3(.5*n/90,-.4,0)));step(1);}
 const freed=W.stats.jams>jams&&W.jam?.held==='pitchfork';W.release();
 for(let n=0;n<600&&W.jam;n++){if(n===300){const p=v3(pf.body.translation());p.x+=1;park(pf,p);W.wake(pf);}step(1);}
 check('physics-p2 a held item wedged inside a container is let go of it, and they meet again once apart',freed&&!W.jam,JSON.stringify({jams:W.stats.jams-jams,unjammed:W.stats.unjammed,jam:W.jam,JAM}));
 aside(pf,1);aside(bk,2);}
W.cat?.suspend('physics-p2',false);
