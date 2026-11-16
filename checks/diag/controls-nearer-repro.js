// Diag (controls lane): with real CDP touch, hold an item with one finger and press Nearer with a second. What happens?
cat.auto=false;const W=site.world,T=site.THREE;
keepsakes.give('tin');await keepsakes.get('tin').worldTask;await sleep(2500);
const e=keepsakes.get('tin').worldEntry,p=stage.toScreen(e.object.getWorldPosition(new T.Vector3()));
const fwd=()=>stage.camera.getWorldDirection(new T.Vector3());const depth=()=>W.held?fwd().dot(W.held.target.clone().sub(stage.camera.position)):null;
const log=[];for(const t of ['pointerdown','pointerup','pointercancel','click','touchstart','touchend','touchcancel'])addEventListener(t,ev=>log.push(t+(ev.pointerId!=null?'#'+ev.pointerId:'')+':'+(ev.target.tagName||'')+(ev.target.textContent?.slice(0,8)||'')),true);
await __touch('touchStart',[{x:p.x,y:p.y,id:1}]);for(let k=1;k<=6;k++){await sleep(30);await __touch('touchMove',[{x:p.x+k*4,y:p.y-k*3,id:1}]);}
await sleep(100);const bar=document.querySelector('.world-grip');const r=bar?.getBoundingClientRect();
note('bar',JSON.stringify({held:W.held?.entry?.id,bar:!!bar,rect:r&&[r.x,r.y,r.width,r.height].map(Math.round),insets:stage.insets,h:stage.height}));
await __shot('nearer-repro-held');
const btn=bar?.querySelector('button');const b=btn?.getBoundingClientRect();const f={x:p.x+24,y:p.y-18,id:1};
const d0=depth();
if(b){await __touch('touchStart',[f,{x:b.x+b.width/2,y:b.y+b.height/2,id:2}]);await sleep(700);const dmid=depth();await __touch('touchMove',[f]);await sleep(200);note('after second finger',JSON.stringify({d0,dmid,d1:depth(),held:W.held?.entry?.id}));}
await __touch('touchEnd',[]);await sleep(200);
note('events',log.join(' '));
