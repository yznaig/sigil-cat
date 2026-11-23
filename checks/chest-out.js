// chest-out.js (lane p8-chestout; Aaron, desktop: "taking things out of the box spawned them all the way back where
// that bucket is, I grabbed the cake and it moved forward but they both spawned back where that bucket was").
// What comes out of the chest lands in the front band (its bottom at or below his feet, the front of the visible
// floor) whenever there is room for it there, in plain view, clear of the box and of every other prop, wherever the
// box stands and at any zoom. With the front band full (a short screen at the most zoom: five tall props and the box
// side by side), the crowded-floor rule of physics-p3 applies: in view, mostly seen, clear of the box and the others.
// For each box place (?boxes=, default three: front right, front left, back middle): the box moved there, the kitchen
// items taken out of the room into the chest, then all of them (and a cake) taken out in quick succession.
// Run by hand: node checks/run.mjs <url>/?zoom=1.3 --lib checks/lib.js --js checks/chest-out.js --size desktop
cat.auto=false;
const W=site.world,T=site.THREE,C=E.box.recipe;
const {placer,FRONT,keepOffBox}=await import(new URL('src/core/floor-home.js',document.baseURI).href);
const rest=(ms=15000)=>until(()=>!W.stats.listening,ms);
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const inView=r=>r.x>=0&&r.x+r.w<=stage.width&&r.y>=stage.insets.top&&r.y+r.h<=stage.height-stage.insets.bottom;
const R=r=>[r.x,r.y,r.w,r.h].map(Math.round);
const params=new URLSearchParams(location.search);
// box places, as fractions of the floor's width and of the floor band's height (0: the back of the visible floor, 1: the footer line)
const PLACES={'front-right':[.8,.92],'front-left':[.25,.92],'front-middle':[.55,.95],'back-middle':[.5,.1],'back-right':[.85,.15]};
const places=(params.get('boxes')||'front-right,front-left,back-middle').split(',');
const IDS=['bucket','flour','egg','tin'];
const box=keepsakes.give('box');await box.worldTask;await rest();
const be=box.worldEntry;
for(const id of IDS){const i=keepsakes.give(id);await i?.worldTask;await sleep(120);}
await rest();
const footer=()=>stage.height-stage.insets.bottom;
async function putBox(name){
 const [fx,fy]=PLACES[name],top=Math.max(stage.insets.top,keepsakes.feet.y-160),bot=footer()-40,q=new T.Quaternion().copy(be.body.rotation());
 const low=-Math.min(...box.colliderVertices.map(v=>v.clone().applyQuaternion(q).y))+.002;
 const p=site.worldLayout.anchor(stage.width*fx,top+(bot-top)*fy);p.y=low;
 be.body.setTranslation(p,true);be.body.setLinvel({x:0,y:0,z:0},true);be.body.setAngvel({x:0,y:0,z:0},true);W.wake(be);await rest();
 // pulled back inside the page by the world's own rules if need be
 return R(box.picture.rect);
}
const all=[];
for(const place of places){
 const boxRect=await putBox(place);
 await C.openChest();await until(()=>C.screen.isOpen&&!E.box.lidMoving,4000);
 const slotOf=id=>C.inventory().findIndex(i=>i?.id===id),free=()=>C.state.chest.findIndex(e=>!e);
 for(const id of [...IDS,'cake'])if(slotOf(id)>=0)await C.move({kind:'inv',i:slotOf(id)},{kind:'chest',i:free()});
 // a cake the room has never had (Aaron's cake came out of a bake)
 if(keepsakes.has('cake')&&slotOf('cake')<0){keepsakes.take('cake');await sleep(100);}
 if(!C.state.chest.some(e=>e?.id==='cake')&&!keepsakes.has('cake')){const k=free();C.state.chest[k]={id:'cake',state:{}};}
 const ids=C.state.chest.filter(Boolean).map(e=>e.id).filter(id=>[...IDS,'cake'].includes(id));
 // All out in quick succession, as a player drags them. Right after each one is placed: was there room for it in the
 // front band then? (floor-home's own front search over the floor as it is, the same 15% overlap a newcomer may take, none with the box;
 // what is in the room counts where it is, not where it was planned.) Then it must stay in the front band.
 const room={};
 for(const id of ids){const k=C.state.chest.findIndex(e=>e?.id===id),to=[...Array(36).keys()].find(n=>!C.inventory()[n]);await C.move({kind:'chest',i:k},{kind:'inv',i:to});
  const i=keepsakes.get(id);await i?.worldTask;if(!i?.colliderVertices?.length)continue;
  const P=placer(site),e=i.worldEntry,b=P.bounds(i.colliderVertices,new T.Quaternion().copy(e.body.rotation())),f=P.choose(b,new T.Vector3().copy(e.body.translation()),keepOffBox(P.occupied(new Set([i]))),{front:true});
  room[id]=!!f&&!f.cat&&f.covered<=FRONT.overlap*f.r.w*f.r.h;await sleep(60);}
 await until(()=>ids.every(id=>keepsakes.get(id)?.worldReady),8000);C.screen.close();await sleep(300);await rest();await sleep(600);await rest();
 const bx=box.picture.rect,feet=keepsakes.feet.y;
 const rows=ids.map(id=>{const i=keepsakes.get(id),r=i.picture.rect;
  const others=ids.filter(o=>o!==id).map(o=>keepsakes.get(o)).filter(Boolean);
  const hit=others.reduce((m,o)=>Math.max(m,overlap(r,o.picture.rect)/(r.w*r.h)),0);
  return {id,rect:R(r),bottom:Math.round(r.y+r.h),front:r.y+r.h>=feet-20,room:room[id],view:inView(r),boxShare:+(overlap(r,bx)/(r.w*r.h)).toFixed(3),itemShare:+hit.toFixed(3),seen:+site.occluders.exposure(i.worldEntry).share.toFixed(2)};});
 const good=x=>(x.front||!x.room)&&x.view&&x.boxShare<.1&&x.itemShare<.15&&x.seen>=.6,ok=rows.every(good);
 all.push({place,zoom:stage.zoom,box:boxRect,feet:Math.round(feet),rows,bad:rows.filter(x=>!good(x)).map(x=>x.id)});
 check(`chest-out box ${place} zoom ${stage.zoom}: everything taken out rests in front of his feet whenever there was room there, in view, clear of the box and of each other`,ok,JSON.stringify({box:R(bx),feet:Math.round(feet),rows}));
 await __shot(`chest-out-${place}-z${Math.round(stage.zoom*100)}`);
}
__say('CHECK chest-out summary: '+JSON.stringify(all.map(a=>({place:a.place,zoom:a.zoom,feet:a.feet,bottoms:Object.fromEntries(a.rows.map(r=>[r.id,r.bottom])),behind:a.rows.filter(r=>!r.front).map(r=>r.id+(r.room?'(room in front)':'(band full)')),bad:a.bad}))));
