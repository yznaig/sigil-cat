// Physics lane, playtest-3 (2026-11-13). Aaron's items, his words in ~/.sigil-cat-wt/inputs/playtest-3.md:
//   4 "the flour seems to be spawning way in the back": with the rack, the shelf's props, the cards and the kitchen out,
//     the flour arrives in the front floor band, in front of him.
//   3 "if something gets inside of the cats space too deep it just despawns and respawns. Buttaman just pushed the box
//     into the cat and it started tweaking out": a box forced into him goes in a puff within 1 s and comes back at rest,
//     in view and clear of him; a box resting against him is left alone.
//   2 "taking something out of the box should just spawn it like regular (somewhere on the screen) instead of spawning
//     it 'out' the box": what comes out of the chest rests on a clear floor spot in view, clear of the box.
//   1 "the googly eyes need to move as smoothly with the cat as the hat and butter do ... and it seems like they
//     entirely despawn when I try to place them on the platinum cat": every frame of a pose change the eyes sit on
//     the face of the pose his seat (the hat's place) is on; dropped on the badge they show on its cat (pixels), on
//     the floor and on the board; physics-p3-reload.js: still there after a reload.
cat.auto=false;
const W=site.world,T=site.THREE,S=site.supports,C=E.box.recipe;
const {CAT_IN,RETURN}=await import('/src/core/world.js');
const rest=(ms=15000)=>until(()=>!W.stats.listening,ms);
const giveAll=async ids=>{for(const id of ids){const i=keepsakes.give(id);await i?.worldTask;await sleep(120);}};
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const inView=r=>r.x>=0&&r.x+r.w<=stage.width&&r.y>=stage.insets.top&&r.y+r.h<=stage.height-stage.insets.bottom;
const line=(a,b,n=24)=>Array.from({length:n+1},(_,i)=>({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}));
const grip=i=>{const r=i.picture.rect;for(let y=r.y+r.h*.2;y<r.y+r.h-2;y+=3)for(let x=r.x+r.w*.2;x<r.x+r.w*.8;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};

// ---- 3. too far into him (first, with only the box out: nothing else in its path) ----
{const i=keepsakes.give('box');await i.worldTask;await rest();}
// his contact distance to a body: the nearest point of any pair with his hulls (negative: inside him)
function catDist(e){
 const body=W.cat?.body;let d=Infinity;if(!body||!W.cat.enabled)return d;
 for(let i=0;i<body.numColliders();i++){const c=body.collider(i);W.physics.contactPairsWith(c,o=>{if(W.physics.getCollider(o.handle)?.parent()?.userData!==e.id)return;W.physics.contactPair(c,o,m=>{for(let k=0;k<m.numContacts();k++)d=Math.min(d,m.contactDist(k));});});}
 return d;
}
const box=keepsakes.get('box'),be=box.worldEntry,bq=new T.Quaternion().copy(be.body.rotation());
const low=()=>-Math.min(...box.colliderVertices.map(v=>v.clone().applyQuaternion(bq).y))+.002;
// (a) eased against his side by a gentle steady push, then left there: not taken
{be.body.setRotation(bq,true);be.body.setTranslation({x:-1.3,y:low(),z:.05},true);W.wake(be);
 const n0=W.stats.catRespawns;let touched=false,pushing=true,maxIn=0;
 const ease=()=>{if(!pushing||be.timer)return;const v=be.body.linvel(),d=catDist(be);if(d<.006)touched=true;if(d<0)maxIn=Math.max(maxIn,-d);be.body.setLinvel({x:.45,y:v.y,z:v.z},true);W.wake(be);};
 stage.onFrame.push(ease);await sleep(2500);pushing=false;stage.onFrame.splice(stage.onFrame.indexOf(ease),1);await sleep(1500);
 check('3 a box pushed gently against his side and left there is left alone',touched&&W.stats.catRespawns===n0&&!be.timer&&be.object.visible,JSON.stringify({touched,maxIn,dist:catDist(be),respawns:W.stats.catRespawns-n0}));}
// (b) forced into him, the way a walker squeezes it against him: moved 1 cm a frame toward his middle, whatever is there
{const n0=W.stats.catRespawns;let pushing=true,contactAt=null,goneAt=null,maxIn=0;
 be.body.setTranslation({x:-1.2,y:low(),z:.05},true);be.body.setRotation(bq,true);be.body.setLinvel({x:0,y:0,z:0},true);W.wake(be);
 const force=()=>{if(!pushing)return;if(be.timer){goneAt??=performance.now();return;}const p=be.body.translation(),d=catDist(be);
  if(d<.004)contactAt??=performance.now();if(d<0)maxIn=Math.max(maxIn,-d);
  be.body.setTranslation({x:p.x+.01,y:p.y,z:p.z},true);W.wake(be);};
 stage.onFrame.push(force);
 await until(()=>goneAt,5000,10);pushing=false;stage.onFrame.splice(stage.onFrame.indexOf(force),1);
 const took=goneAt&&contactAt?(goneAt-contactAt)/1000:null;
 check('3 a box forced into him goes in a puff within 1 s of reaching him',W.stats.catRespawns===n0+1&&took!==null&&took<=1,JSON.stringify({took,maxIn,respawns:W.stats.catRespawns-n0}));
 // back RETURN.quick later, resting on a clear floor spot in view, clear of him; no jitter: once asleep it stays put
 await until(()=>!be.timer,3000,10);const backAt=performance.now();
 await until(()=>be.body.isSleeping(),4000,20);const restedIn=(performance.now()-backAt)/1000,p0=new T.Vector3().copy(be.body.translation());
 await sleep(1200);const drift=p0.distanceTo(be.body.translation()),r=box.picture.rect;
 check('3 it comes back at rest on a clear floor spot in view, clear of him, and stays still',be.object.visible&&be.body.isSleeping()&&restedIn<3&&drift<1e-4&&catDist(be)>0&&inView(r)&&!cat.hitTest(r.x+r.w/2,r.y+r.h/2),JSON.stringify({restedIn,drift,dist:catDist(be),rect:r}));
 await __shot('p3-box-respawned');}
// (c) put straight into him (its middle inside his body): at once
{const n0=W.stats.catRespawns,t0=performance.now();be.body.setTranslation({x:0,y:.35,z:0},true);W.wake(be);
 await until(()=>be.timer||W.stats.catRespawns>n0,1500,5);
 check('3 a box put inside him goes at the next step',W.stats.catRespawns===n0+1&&(performance.now()-t0)<500,String((performance.now()-t0).toFixed(0))+' ms');
 await until(()=>!be.timer,3000,10);await rest();}

// ---- 1a. the eyes on his face, every frame of a pose change ----
const eyes=keepsakes.give('eyes'),Cf=cat.config;await eyes.worldTask;await rest();
site.eyesWorld.stick('cat');await sleep(200);
{const _v=new T.Vector3();let frames=0,off=0,worst=0,swaps=0,lastSeat='';
 const seatPose=()=>Object.keys(Cf.crown).find(n=>cat.seat.position.distanceTo(_v.fromArray(Cf.crown[n]))<1e-6);
 const probe=()=>{
  const n=seatPose();if(!n||cat.standIn)return;frames++;const key=n;if(lastSeat&&key!==lastSeat)swaps++;lastSeat=key;
  eyes.picture.visual.updateWorldMatrix(true,false);const at=cat.spin.worldToLocal(eyes.picture.visual.getWorldPosition(new T.Vector3()));
  const want=new T.Vector3(...Cf.face[n]);want.z+=.014;const d=at.distanceTo(want);worst=Math.max(worst,d);if(d>1e-4)off++;
 };
 stage.onRender.push(probe);
 for(const next of [cat.pose==='sit'?'lie':'sit','sleep','sit']){await cat.load(next);cat.request(next);await until(()=>cat.pose===next&&cat.phase==='hold',20000);await sleep(150);}
 stage.onRender.splice(stage.onRender.indexOf(probe),1);
 check('1 through three pose changes the eyes sit on the face of the pose his seat is on, every frame (no lag, no jump)',eyes.state.on==='cat'&&frames>60&&swaps>=3&&off===0,JSON.stringify({frames,swaps,off,worst}));}

// ---- 1b. on the Platinum Cat badge ----
const gl=stage.renderer.getContext();
// the page's pixels in a rect (device pixels), read right after a frame is presented
async function pixels(r){let out=null;const f=()=>{const d=stage.dpr,x=Math.max(0,Math.round(r.x*d)),w=Math.round(r.w*d),h=Math.round(r.h*d),y=gl.drawingBufferHeight-Math.round((r.y+r.h)*d),px=new Uint8Array(w*h*4);gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);out=px;};
 stage.onPresented.push(f);cat.touch();await until(()=>out!==null,3000,10);stage.onPresented.splice(stage.onPresented.indexOf(f),1);return out;}
// the share of a rect's pixels that differ clearly between two reads (the eyes drawn there, or not)
const changed=(a,b)=>{let n=0;for(let k=0;k<a.length;k+=4)if(Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2])>60)n++;return n/(a.length/4);};
// the same rect with the eyes not drawn (their art hidden, every picture redrawn), then drawn again
async function withoutEyes(r){
 const i=keepsakes.get('eyes'),b=keepsakes.get('platinum'),redraw=()=>{for(const p of [i.picture,b?.picture])if(p){p.invalidate();p.draw();}};
 i.smallArt.visible=false;redraw();await sleep(100);const px=await pixels(r);i.smallArt.visible=true;redraw();await sleep(100);return px;
}
// the board first (two cards), so the badge has a board to be pinned to
{const a=keepsakes.give('paper'),b=keepsakes.give('postcard');await Promise.all([a.worldTask,b.worldTask]);await site.pinboard.task;await until(()=>site.pinboard.ready,8000);await rest();}
const A=site.achievements;A.grantAll();await until(()=>keepsakes.has('platinum'),8000);
const badge=keepsakes.get('platinum');await badge.worldTask;await until(()=>badge.worldEntry.body.isSleeping(),9000);
// the room is crowded by now: lay the badge flat on a clear floor spot in view first (floor-home's own search)
{const {clearSpot}=await import('/src/core/floor-home.js'),be2=badge.worldEntry,q=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0));
 const spot=clearSpot(site,badge,badge.colliderVertices,q,site.worldLayout.anchor(stage.width*.5,stage.height-stage.insets.bottom-60));
 if(spot){be2.body.setTranslation(spot,true);be2.body.setRotation(q,true);be2.body.setLinvel({x:0,y:0,z:0},true);be2.body.setAngvel({x:0,y:0,z:0},true);W.wake(be2);await rest();}}
const anchor=()=>stage.toScreen(badge.object.localToWorld(new T.Vector3(...badge.eyesAnchor())));
site.eyesWorld.detach();await rest();
async function dropOnBadge(where){
 // somewhere open on the floor first, so a real press reaches them
 for(const u of [.3,.5,.15,.7,.85])if(!grip(eyes)){eyes.moveWorld({x:stage.width*u,y:stage.height-stage.insets.bottom-50});await rest();}
 const g=grip(eyes),a=anchor();await __pointer(line(g,a,24));await sleep(900);await rest();
 const on=eyes.state.on==='platinum'&&eyes.worldEntry.support?.id==='eyes-host-platinum'&&eyes.picture.attached,r={...eyes.picture.rect},seen=await pixels(r);
 const base=await withoutEyes(r),again=await pixels(r),a2=anchor(),p=stage.toScreen(eyes.object.position),diff=changed(seen,base),back=changed(again,seen);
 check(`1 dropped on the badge ${where}, the eyes show on its cat`,on&&diff>=.1&&back<diff/2&&Math.hypot(a2.x-p.x,a2.y-p.y)<2,JSON.stringify({on,changed:diff,redrawnChanged:back,rect:r}));
}
await dropOnBadge('on the floor');await __shot('p3-eyes-badge-floor');
// pinned to the board with them on, they go with it
(await A.badge).pin(true);await until(()=>!S.active,3000);await sleep(600);
{const a=anchor(),p=stage.toScreen(eyes.object.position),r={...eyes.picture.rect},on=eyes.state.on==='platinum'&&eyes.picture.attached,px=await pixels(r);
 const diff=changed(px,await withoutEyes(r));
 check('1 pinned to the board with the eyes on, they stay on its cat and show',badge.worldEntry.support?.id==='platinum-cover'&&on&&Math.hypot(a.x-p.x,a.y-p.y)<2&&diff>=.1,JSON.stringify({changed:diff,a,p}));}
site.eyesWorld.detach();await rest();
await dropOnBadge('on the board');await __shot('p3-eyes-badge-board');
// ---- 4. the flour arrives in the front band ----
// Two rooms (the orchestrator's rule, integration playtest-3). A NORMALLY furnished room, strict: the rack, the
// shelf's own props up on the shelf where the player put them, the three cards lying on the floor, the box and the eyes
// (on the badge): the flour arrives in the front floor band, in front of his feet. Then a TRULY FULL room (the
// bucket, the recipe card and the egg added, all standing or lying in the front band): a new flour may land beside or
// behind him, but in view, reachable by a real pick, and not hidden (at least 35% seen, the occluders' own bar).
const pickOn=i=>{const q=i.picture.rect;for(let y=q.y+2;y<q.y+q.h-2;y+=4)for(let x=q.x+2;x<q.x+q.w-2;x+=4)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return true;return false;};
const propsNow=()=>Object.fromEntries([...keepsakes.live.values()].filter(i=>i.worldEntry&&!i.worldEntry.fixed&&i.id!=='flour').map(i=>[i.id,i.worldEntry.support?.id||[i.picture.rect.x,i.picture.rect.y,i.picture.rect.w,i.picture.rect.h].map(Math.round).join(',')]));
await giveAll(['rack','rifle','top','tin','paper','postcard','ticket','box','eyes']);await rest();
await site.shelf.ensure();await until(()=>site.shelf.ready&&!site.shelf.arriving,8000);for(const id of ['rifle','top','tin'])site.shelf.store(id,false);await rest();
{const f=keepsakes.give('flour');await f.worldTask;await rest();
 const r=f.picture.rect,z=f.worldEntry.body.translation().z,feet=keepsakes.feet.y;
 check('4 in a normally furnished room (rack, shelf props on the shelf, three cards on the floor, box, eyes), the flour arrives in the front floor band, in front of his feet',r.y+r.h>feet&&inView(r),JSON.stringify({rect:r,bottom:r.y+r.h,feet,z,planned:site.floorHomes?.get('flour'),props:propsNow()}));}
await giveAll(['bucket','recipe','egg']);await rest();
{keepsakes.take('flour');await sleep(300);const f=keepsakes.give('flour');await f.worldTask;await rest();await sleep(2500);await rest();
 const r=f.picture.rect,feet=keepsakes.feet.y,seen=site.occluders.exposure(f.worldEntry).share,pick=pickOn(f);
 check('4 in a truly full room (bucket, recipe and egg added), a new flour lands in view, reachable and not hidden (in front, beside or behind him)',inView(r)&&pick&&seen>=.35,JSON.stringify({rect:r,front:r.y+r.h>feet,seen,pick,props:propsNow()}));
 // Then crowded: the shelf's props taken back down to the floor and the crumbs given. A
 // crowded floor is packed on the floor, never onto the shelf, its hooks or the stand; nothing lost: every loose prop
 // is on the page, mostly seen (after the occluders' scoot) and picked by a real pick somewhere on its picture.
 for(const id of ['rifle','top','tin']){const e=keepsakes.get(id)?.worldEntry;if(e?.support){S.detach(e);}}
 await giveAll(['crumbs']);await sleep(2500);await rest();
 const onShelf=[...keepsakes.live.values()].filter(i=>['shelf','shelf-hooks','stand'].includes(i.worldEntry?.support?.id)).map(i=>i.id);
 const pickable=i=>{const q=i.picture.rect;for(let y=q.y+2;y<q.y+q.h-2;y+=4)for(let x=q.x+2;x<q.x+q.w-2;x+=4)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return true;return false;};
 const loose=[...keepsakes.live.values()].filter(i=>i.worldEntry&&!i.worldEntry.fixed&&!i.worldEntry.support&&!i.def.sky&&i.picture);
 const lost=loose.filter(i=>!inView(i.picture.rect)||site.occluders.exposure(i.worldEntry).share<.35||!pickable(i)).map(i=>({id:i.id,rect:i.picture.rect,seen:site.occluders.exposure(i.worldEntry).share}));
 check('4 the crowded floor keeps everything on the floor, none put on the shelf, hooks or stand, and nothing lost',!onShelf.length&&!lost.length,JSON.stringify({onShelf,lost,loose:loose.length}));
 await __shot('p3-flour');}

// ---- 2. out of the chest: a clear floor spot in view, never in or by the box ----
{await rest();await C.openChest();await until(()=>C.screen.isOpen&&!E.box.lidMoving,4000);
 const ids=['flour','bucket','egg','tin'],slotOf=id=>C.inventory().findIndex(i=>i?.id===id),free=()=>C.state.chest.findIndex(e=>!e);
 for(const id of ids)if(slotOf(id)>=0)await C.move({kind:'inv',i:slotOf(id)},{kind:'chest',i:free()});
 const inChest=ids.filter(id=>C.state.chest.some(e=>e?.id===id));
 // all four out in quick succession (the old drop fanned them out in front of the box)
 for(const id of ids){const k=C.state.chest.findIndex(e=>e?.id===id),to=[...Array(36).keys()].find(n=>!C.inventory()[n]);C.move({kind:'chest',i:k},{kind:'inv',i:to});await sleep(60);}
 await until(()=>ids.every(id=>keepsakes.get(id)?.worldReady),8000);C.screen.close();await sleep(300);await rest();
 const bx=box.picture.rect,rows=ids.map(id=>{const i=keepsakes.get(id),r=i.picture.rect,t=i.worldEntry.body.translation(),bt=be.body.translation();
  const local=new T.Vector3().copy(t).sub(bt).applyQuaternion(new T.Quaternion().copy(be.body.rotation()).invert()),I=be.interior;
  const inside=local.x>I.min[0]&&local.x<I.max[0]&&local.y>I.min[1]&&local.y<I.max[1]&&local.z>I.min[2]&&local.z<I.max[2];
  return {id,inside,boxShare:overlap(r,bx)/(r.w*r.h),view:inView(r),asleep:i.worldEntry.body.isSleeping()};});
 check('2 everything taken out of the chest rests on a clear floor spot in view, never in or against the box',inChest.length===ids.length&&rows.every(x=>!x.inside&&x.boxShare<.1&&x.view&&x.asleep),JSON.stringify({inChest,rows}));
 await __shot('p3-chest-out');}

store.flush?.();
