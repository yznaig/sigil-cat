cat.auto=false;const W=site.world,T=site.THREE;
for(const id of ['grimoire','achievements'])document.getElementById(id).hidden=false;
keepsakes.give('tin');await keepsakes.get('tin').worldTask;await sleep(2500);
const e=keepsakes.get('tin').worldEntry,p=stage.toScreen(e.object.getWorldPosition(new T.Vector3()));
await __touch('touchStart',[{x:p.x,y:p.y,id:1}]);for(let k=1;k<=6;k++){await sleep(30);await __touch('touchMove',[{x:p.x+k*4,y:p.y-k*3,id:1}]);}
await sleep(150);
const R=s=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(Math.round).join(',');}).join(' ');
note('rects',JSON.stringify({place:document.querySelector('.world-grip')?.dataset.place,btn:R('.world-grip button'),sound:R('#footer .sound'),zoom:R('#footer .zoom'),marks:R('#marks > li'),hint:R('#hint'),links:R('#footer .fr > *'),insets:stage.insets}));
await __shot(new URLSearchParams(location.search).get('name')||'bar');
await __touch('touchEnd',[]);
