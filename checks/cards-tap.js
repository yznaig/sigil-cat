// Cards lane, playtest 3. Aaron: "Only the physics paper and the cake recipe paper actually need to open up to a page
// like this. Clicking the void paper and flipping it was fine", "These pages dont need any buttons on them. they just
// need an (x) button to close or/and the ability to just click off to the side", and "Nothing should go STRAIGHT onto
// the pinboard ... they should always be droped for the player to put on the pinboard".
// Every card kind clicked with real input, on the floor and pinned: the paper and the recipe open a page with one (x)
// that closes on the (x), a click outside and Escape; the postcard flips in place; the ticket wiggles; none opens the
// old 3D reader. Press and move drags each. New cards and a recycling star never land on the board by themselves.
// --then checks/cards-tap-reload.js: pinned cards stay pinned, loose ones stay loose.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,B=()=>site.pinboard;
const ids=['paper','postcard','ticket','recipe'];
for(const id of ['paper','postcard','ticket'])keepsakes.give(id);
keepsakes.give('recipe',{at:keepsakes.toUnits(stage.width*.58,site.worldLayout.floorY())});
await Promise.all(ids.map(id=>keepsakes.get(id).worldTask));await B().task;await until(()=>!B().arriving,15000);
const card=id=>keepsakes.get(id),entry=id=>card(id).worldEntry;
await until(()=>ids.every(id=>entry(id).body.isSleeping()),15000);await sleep(400);
check('cards new cards land on the floor; the board arriving pins none',B().ready&&ids.every(id=>!entry(id).support&&!card(id).picture.attached),ids.map(id=>id+':'+(entry(id).support?.id||'floor')).join(' '));
await __shot('cards-tap-floor');

// A point on the card's own picture that the world's pick gives to it (on the board, the board's picture is searched).
function spot(id){
 const e=entry(id),b=card(id).picture.attached?B().picture.rect:card(id).picture.rect,list=[];
 for(let y=b.y+3;y<b.y+b.h-3;y+=3)for(let x=b.x+3;x<b.x+b.w-3;x+=3)if(x>4&&x<stage.width-4&&y>4&&y<stage.height-stage.insets.bottom&&site.worldInput.pick({clientX:x,clientY:y})?.entry===e&&document.elementFromPoint(x,y)===canvas)list.push({x,y});
 return list[Math.floor(list.length/2)]||null;
}
const page=()=>document.querySelector('.card-sheet');
const reader=()=>!!document.querySelector('.world-inspect');
// The page: one control, a small round (x) on its top right corner, inside the screen.
function pageShape(){
 const h=page();if(!h)return {open:false};const f=h.querySelector('.sheet-frame').getBoundingClientRect(),x=h.querySelector('.sheet-x'),r=x?.getBoundingClientRect();
 return {open:true,buttons:h.querySelectorAll('button,[role=button],a').length,x:!!x&&x.getAttribute('aria-label')==='Close'&&!x.textContent.trim(),size:r&&Math.round(r.width),
  corner:!!r&&Math.abs(r.right-f.right)<16&&Math.abs(r.top-f.top)<16,onScreen:!!r&&r.left>=0&&r.top>=0&&r.right<=stage.width&&r.bottom<=stage.height,focus:document.activeElement===x};
}
async function readsPage(id,where){
 const p=spot(id);if(!p){check(`cards ${where} ${id}: a click opens its page`,false,'no visible point');return;}
 const text=id==='paper'?/Dear Dr\. Cat/:/Cake in a box/;
 // the (x)
 await __pointer([p]);await until(page,2000);const shape=pageShape();
 check(`cards ${where} ${id}: a click opens its page, with one small (x) on its corner and no other button`,shape.open&&text.test(page().textContent)&&shape.buttons===1&&shape.x&&shape.size<=34&&shape.corner&&shape.onScreen&&(MOBILE||shape.focus)&&!reader(),JSON.stringify(shape));
 if(!page())return;await __shot(`cards-tap-${id}-${where}-page`);
 const r=page().querySelector('.sheet-x').getBoundingClientRect();await __pointer([{x:r.x+r.width/2,y:r.y+r.height/2}]);await sleep(150);
 check(`cards ${where} ${id}: the (x) closes it`,!page()&&!entry(id).support===(where==='floor'));
 // a click outside, to the side of the page
 await __pointer([p]);if(!await until(page,2000))return check(`cards ${where} ${id}: opens again`,false);const f=page().querySelector('.sheet-frame').getBoundingClientRect();
 const side={x:Math.max(6,f.x/2),y:stage.height/2};await __pointer([side]);await sleep(150);
 check(`cards ${where} ${id}: a click off to the side closes it`,!page(),JSON.stringify({side,frame:[f.x|0,f.right|0]}));
 // Escape
 await __pointer([p]);await until(page,2000);await __key('Escape');await sleep(150);
 check(`cards ${where} ${id}: Escape closes it`,!page());
 check(`cards ${where} ${id}: reading it leaves it where it was`,where==='floor'?!entry(id).support:entry(id).support?.id==='pinboard');
}
const up=q=>new T.Vector3(0,0,1).applyQuaternion(q);
async function flips(where){
 const id='postcard',i=card(id),p=spot(id);if(!p){check(`cards ${where} postcard: a click flips it`,false,'no visible point');return;}
 const before=!!i.state.flipped,n0=up(i.object.quaternion);
 await __pointer([p]);await sleep(150);
 check(`cards ${where} postcard: a click opens no page`,!page()&&!reader());
 await until(()=>entry(id).support||entry(id).body.isSleeping(),6000);await sleep(where==='floor'?300:1700);
 const n1=up(i.object.quaternion);
 check(`cards ${where} postcard: a click flips it over in place`,!!i.state.flipped===!before&&n0.dot(n1)<-.9,JSON.stringify({flipped:i.state.flipped,dot:+n0.dot(n1).toFixed(3)}));
 await __shot(`cards-tap-postcard-${where}-flipped`);
 const q=spot(id);if(q){await __pointer([q]);await until(()=>entry(id).support||entry(id).body.isSleeping(),6000);await sleep(where==='floor'?300:1700);}
 check(`cards ${where} postcard: a second click flips it back`,!!q&&!!i.state.flipped===before&&up(i.object.quaternion).dot(n0)>.9,JSON.stringify({q,flipped:i.state.flipped,dot:+up(i.object.quaternion).dot(n0).toFixed(3)}));
}
async function wiggles(where){
 const id='ticket',i=card(id),e=entry(id),p=spot(id);if(!p){check(`cards ${where} ticket: a click wiggles it`,false,'no visible point');return;}
 const body0=new T.Vector3().copy(e.body.translation());
 // the drawn pose against the body's (on the floor) or the pin's resting pose (on the board), every frame for 1.2 s
 let most=0,last=0;const t0=performance.now();
 const watch=new Promise(r=>{const f=()=>{const rest=e.support?S.pose('pinboard',id).q:new T.Quaternion().copy(e.body.rotation());last=i.object.quaternion.angleTo(rest)*180/Math.PI;most=Math.max(most,last);if(performance.now()-t0<1200)requestAnimationFrame(f);else r();};f();});
 await __pointer([p]);await watch;
 const moved=new T.Vector3().copy(e.body.translation()).distanceTo(body0);
 check(`cards ${where} ticket: a click wiggles it (no page) and it comes back to rest where it was`,!page()&&!reader()&&(stage.reducedMotion?most<.5:most>3&&most<12)&&last<.3&&(e.support?e.support.id==='pinboard':moved<.002),JSON.stringify({maxDeg:+most.toFixed(2),endDeg:+last.toFixed(2),moved:+moved.toFixed(4)}));
}

// ---- on the floor ----
await readsPage('paper','floor');await readsPage('recipe','floor');await flips('floor');await wiggles('floor');

// ---- press and move drags every card (no page, no flip, no wiggle) ----
for(const id of ids){
 const i=card(id),e=entry(id),p=spot(id);if(!p){check(`cards press and move drags the ${id}`,false,'no visible point');continue;}
 const flipped=!!i.state.flipped,a=stage.toScreen(new T.Vector3().copy(e.body.translation())),dx=p.x<stage.width/2?-1:1,to={x:Math.max(30,Math.min(stage.width-30,p.x+dx*70)),y:p.y-24};
 const path=Array.from({length:10},(_,k)=>({x:p.x+(to.x-p.x)*k/9,y:p.y+(to.y-p.y)*k/9}));
 await __pointer(path);await until(()=>!W.held&&e.body.isSleeping(),8000);await sleep(200);
 const b=stage.toScreen(new T.Vector3().copy(e.body.translation()));
 check(`cards press and move drags the ${id}`,Math.hypot(b.x-a.x,b.y-a.y)>25&&!page()&&!reader()&&!!i.state.flipped===flipped&&!e.support,JSON.stringify({moved:Math.round(Math.hypot(b.x-a.x,b.y-a.y))}));
}

// ---- a recycling star lands on the floor by the bin, never on the board ----
{const R=E.recycle;keepsakes.give('crumbs');await keepsakes.get('crumbs').worldTask;await until(()=>R.armed,8000);
 const bin={...R.bin.picture.rect};keepsakes.get('crumbs').key.querySelector('.recycle-key').click();
 await until(()=>keepsakes.has('goodjob'),4000);await until(()=>!keepsakes.get('goodjob').el.getAnimations({subtree:true}).length,4000);await sleep(100);
 const s=keepsakes.get('goodjob').el.getBoundingClientRect(),b=B().picture.rect,over=!(s.right<=b.x||s.x>=b.x+b.w||s.bottom<=b.y||s.y>=b.y+b.h);
 check('cards a recycling star lands on the floor beside the bin, not on the board',!over&&s.bottom<=stage.height-stage.insets.bottom+2&&s.bottom>=bin.y&&s.right<=bin.x+8&&s.x>bin.x-s.width*4,JSON.stringify({star:[s.x|0,s.y|0,s.width|0],bin:[bin.x|0,bin.y|0,bin.w|0,bin.h|0],board:[b.x|0,b.y|0,b.w|0,b.h|0]}));
 await __shot('cards-tap-star');}

// ---- pinned ----
for(const id of ids)check(`cards the player can pin the ${id}`,B().pin(id,false)&&entry(id).support?.id==='pinboard');
await until(()=>!S.active,4000);await sleep(500);await __shot('cards-tap-pinned');
await readsPage('paper','board');await readsPage('recipe','board');await flips('board');await wiggles('board');

// For the reload: the paper and postcard stay pinned; the ticket and recipe go back to the floor.
for(const id of ['ticket','recipe'])S.detach(entry(id));
await until(()=>['ticket','recipe'].every(id=>entry(id).body.isSleeping()),8000);await sleep(300);
store.set('cardsTapCheck',Object.fromEntries(ids.map(id=>[id,entry(id).support?.id||null])));store.flush();
