// Diag (controls lane): the whole collection, one shot; optional safe-area override from ?safe=l,r,t,b via CDP
const q=new URLSearchParams(location.search);
if(q.get('cdpsafe')){const [left,right,top,bottom]=q.get('cdpsafe').split(',').map(Number);note('cdp safe',String(await __safeArea({left,right,top,bottom})));await sleep(300);dispatchEvent(new Event('resize'));await sleep(500);}
const probe=document.createElement('div');probe.style.cssText='position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.appendChild(probe);
const cs=getComputedStyle(probe);note('env',[cs.paddingLeft,cs.paddingRight,cs.paddingTop,cs.paddingBottom].join(' '));
const {collectFinal}=await import('/checks/world-final-collection.mjs');
await collectFinal(site,{cake:true});
await until(()=>!site.world.stats.listening&&!site.supports.listening,20000);await sleep(2000);
for(const id of ['grimoire','achievements'])document.getElementById(id).hidden=false;
await __shot(q.get('name')||'scene');
const R=r=>r&&[r.x,r.y,r.w,r.h].map(Math.round);
note('furniture',JSON.stringify({W:stage.width,H:stage.height,insets:stage.insets,cat:R(cat.rect),rack:R(site.rack.picture.rect),items:[...keepsakes.live.values()].filter(i=>i.box).map(i=>i.id+':'+R(i.box)).join(' ')}));
