cat.auto=false;
for(const id of ['cloud','top','crumbs','postcard','rifle']) keepsakes.give(id);
await cat.ensureButter(); await sleep(1200);
// This is a crowded-floor drag check. The asynchronous selected splats must
// finish their initial drops before the fling chooses an unoccupied landing.
// Otherwise a prop can fall into the chosen gap while the butter slides down.
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));
check('look crowded floor fixture naturally settles',await until(()=>site.world.ready&&!site.world.stats.listening,10000));
const selected=[];
for(const def of keepsakes.defs.values()) {
 for(const method of ['press','dragging','dropped','tap']) {
  const original=def[method];
  if(original) def[method]=function(...args){selected.push(`${def.id}.${method}`);return original.apply(this,args);};
 }
}
// Exercise both sides without depending on the fling's random choice.
for(const side of [-1,1]) {
 cat.setButter(true,'quiet');
 const random=Math.random; Math.random=()=>side<0?.1:.9;
 try { await E.fling.fling(); } finally {Math.random=random;}
 const g=keepsakes.get('grease').box;
 await drag(Array.from({length:40},(_,i)=>({x:g.x+g.w/2+Math.sin(i)*6,y:g.y+4+(g.h-8)*i/39})),5);
 const p=keepsakes.get('pat'),m=catMid(),x=p.px.x,y=p.px.y-p.h/2;
 const candidates=[...keepsakes.live.values()].filter(i=>i.hits(x,y)).sort((a,b)=>Number(!!a.object)-Number(!!b.object)||b.order-a.order);
 const sponge=document.querySelector('.wipe-sponge');
 note('pat press measurement',JSON.stringify({side,point:{x,y},px:p.px,box:p.box,size:[p.w,p.h],phoneScale:Math.min(1,stage.width/600),resting:p.resting,held:p.held,flight:p.flight,contact:p.contact,physics:keepsakes.physics,layer:p.layer,candidates:candidates.map(i=>({id:i.id,gl:!!i.object,order:i.order,box:i.box})),dom:document.elementsFromPoint(x,y).map(e=>e.className||e.tagName),sponge:sponge?{pointerEvents:getComputedStyle(sponge).pointerEvents,opacity:getComputedStyle(sponge).opacity}:null}));
 selected.length=0;
 const id=++pointerIds;fire('pointerdown',x,y,id);
 for(let i=1;i<16;i++) {await sleep(10);fire('pointermove',x+(m.x-x)*i/15,y+(m.y-y)*i/15,id);if(i===2)note('pat press receiver',JSON.stringify({held:[...keepsakes.live.values()].filter(k=>k.held).map(k=>k.id),calls:selected}));}
 fire('pointerup',m.x,m.y,id,0);await sleep(30);
 note('pat drag calls',JSON.stringify(selected));
 check(`look crowded floor pat returns from ${side<0?'left':'right'}`,cat.butterOn&&await until(()=>keepsakes.get('pat')?.worldEntry?.support?.id==='cat-butter',500)&&!!store.get('butterman.buttered'));
 if(!cat.butterOn&&keepsakes.has('pat')) keepsakes.take('pat');
}
