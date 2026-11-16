// Playtest 4 (flappybreak lane). Aaron, on his phone: "after I played Flappy Bird ... my drawing lines stopped
// disappearing. The cat is no longer bobbing. I can't actually move my items. Something just totally broke."
// Root cause: a phone turned upright mid-game. The "flip sideways" overlay's freeze hold threw (the page scheduler
// refused a second pause), and the two timeScale 0-then-restore rebases (the turn's release, then the game's) left
// stage.timeScale at 0 for good: the page still drew, but its clock never moved again.
// Every way into and out of the game, then the page must be alive: the stage clock runs at timeScale 1, he bobs, a
// stroke on the air fades, an item follows a drag, nothing is held (no freeze, input lock, paused scheduler, inert
// node, leftover Escape handler or stage callback). Paths: the bird's circle (score past both flappy achievements to
// 50, die, give up), the return button alive, Escape, a hidden tab mid-game, the controller's first click (trailer),
// the controller replay (die, retry, give up), a resize mid-game; on a phone, upright mid-game and back (the bug),
// and upright then closed while still upright.
const {wallClock,pageCallbacksPaused}=await import(new URL('src/core/page-scheduler.js',document.baseURI));
const wait=ms=>new Promise(r=>wallClock.setTimeout(r,ms));
const poll=async(f,ms=12000)=>{const t=performance.now();while(performance.now()-t<ms){if(f())return true;await wait(20);}return false;};
const B=E.bird,W=innerWidth,H=innerHeight;
const baseEscape=input.onEscape.length;
const held=()=>({timeScale:stage.timeScale,freeze:site.freeze.reasons,locked:input.locked,paused:pageCallbacksPaused?.()??null,
  inert:[...document.body.children].filter(n=>n.inert).map(n=>n.id||n.className).slice(0,3),screen:!!document.querySelector('#bird-screen'),turn:!!document.getElementById('turn')});
const paper=keepsakes.give('paper');await paper.worldTask;await poll(()=>paper.worldEntry?.body.isSleeping(),15000);
// a point on empty air near the middle of the room (not him, not an item, not the bird's circle)
function airPoint(){
  for(let y=stage.height*.45;y<stage.height*.85;y+=12)for(let x=stage.width*.1;x<stage.width*.9;x+=12)if(isAir(x,y)&&isAir(x+6,y))return {x,y};
  return null;
}
// Drag an item by hand: the paper, or (when the stand or a newcomer covers it) any other resting world item.
async function dragItem(){
  const items=[paper,...[...keepsakes.live.values()].filter(i=>i!==paper&&i.worldEntry&&i.box)];
  for(const it of items){
    const e=it.worldEntry;if(!e||!it.box)continue;await poll(()=>e.body.isSleeping(),4000);
    const c=stage.toScreen(e.object.position),b=it.box;let grip=null,d0=Infinity;
    for(let y=b.y+2;y<b.y+b.h-2;y+=3)for(let x=b.x+2;x<b.x+b.w-2;x+=3){const d=Math.hypot(x-c.x,y-c.y);if(d<d0&&site.worldInput.pick({clientX:x,clientY:y})?.entry===e){grip={x,y};d0=d;}}
    if(!grip)continue;
    const from=stage.toScreen(e.object.position),dx=grip.x<stage.width/2?70:-70,id=++pointerIds;
    fire('pointerdown',grip.x,grip.y,id);for(let n=1;n<=20;n++){fire('pointermove',grip.x+dx*n/20,grip.y-30*n/20,id);await wait(25);}
    await wait(150);const to=stage.toScreen(e.object.position);fire('pointerup',grip.x+dx,grip.y-30,id,0);
    return {item:it.id,moved:Math.hypot(to.x-from.x,to.y-from.y)};
  }
  return {moved:0,why:'no grip on any item'};
}
async function alive(label){
  await poll(()=>!B.screen&&!input.locked,8000);await wait(250);
  const c0=stage.clock,bobs=new Set();for(let i=0;i<20;i++){await wait(50);bobs.add(cat.bob.toFixed(5));}
  const clock=stage.clock-c0,bobbing=stage.reducedMotion||bobs.size>3;
  let ink='no air';const p=airPoint();
  if(p){await tap(p.x,p.y);const inked=site.ink.busy;ink=inked?(await poll(()=>!site.ink.busy,3000)?'faded':'stuck'):'no ink';}
  const drag=await dragItem();
  const h=held(),clear=h.timeScale===1&&!h.freeze.length&&!h.locked&&!h.paused&&!h.inert.length&&!h.screen&&!h.turn&&input.onEscape.length===baseEscape;
  check(`flappy unfreeze ${label}: the page lives after (clock runs, he bobs, ink fades, an item drags, nothing held)`,
    clock>.3&&bobbing&&ink==='faded'&&drag.moved>15&&clear&&!stage.onFrame.some(f=>f.name==='rebase'),
    JSON.stringify({clock:+clock.toFixed(3),bobs:bobs.size,ink,drag,...h,rebase:stage.onFrame.filter(f=>f.name==='rebase').length,escape:input.onEscape.length-baseEscape}));
}
async function giveUp(){await poll(()=>B.screen?.over,4000);await wait(120);
  const r=document.querySelector('#bird-screen [data-give-up]').getBoundingClientRect();await __pointer([{x:r.x+r.width/2,y:r.y+r.height*.35}]);}
async function openFromCircle(){
  if(B.state!=='flying'){B.debug.skipTo(89.9);await poll(()=>B.state==='flying',4000);}
  await poll(()=>!cat.popping&&!B.screen,6000);await wait(2600);   // it has flown in
  await __pointer([{x:B.circle.x,y:B.circle.y}]);
  return await poll(()=>B.state==='game'&&!!B.screen?.game,6000);
}
const flap=()=>__pointer([{x:innerWidth*.45,y:innerHeight*.5}]);
const scoreTo=n=>Object.defineProperty(B.screen.game,'score',{configurable:true,get:()=>n});

// 1. The circle, a long run past both score achievements (Flappy at 1, Pipe Dream at 15) to 50; on a phone it is
//    turned upright and back mid-game (Aaron's freeze), then a death and give up.
{const pre=[...store.get('achievements')?Object.keys(store.get('achievements')):[]];
 check('flappy unfreeze the circle opens the game',await openFromCircle());await flap();
 for(const n of [1,15,30,50]){scoreTo(n);await wait(120);}
 if(MOBILE){await __resize(H,W);await poll(()=>!!document.getElementById('turn'),3000);await wait(400);
   const frozen=B.screen.elapsed;await wait(300);
   check('flappy unfreeze upright mid-game: the turn overlay holds the room and the game still',site.freeze.reasons.includes('turn')&&B.screen.elapsed===frozen,JSON.stringify(held()));
   await __resize(W,H);await poll(()=>!document.getElementById('turn'),3000);await wait(300);
   check('flappy unfreeze turned back: the game runs on, the room stays frozen under it',B.screen.elapsed>frozen&&!site.freeze.reasons.length&&pageCallbacksPaused?.()!==false&&stage.timeScale===1,JSON.stringify(held()));}
 else {await __resize(W-200,H-100);await wait(300);await __resize(W,H);await wait(300);}
 B.debug.death();await giveUp();
 const got=Object.keys(store.get('achievements')||{});
 check('flappy unfreeze both score achievements earned during the run',['flappy','pipes'].every(a=>got.includes(a)),JSON.stringify({pre,got}));
 await alive(MOBILE?'circle, 50, upright mid-game, death, give up':'circle, 50, resize mid-game, death, give up');
 check('flappy unfreeze the earned reveals play once he is back',await poll(()=>site.achievements.showing||!site.achievements.queued,6000));
 check('flappy unfreeze the death brings the controller',await poll(()=>keepsakes.get('controller')?.worldReady,20000));}

// 2. The circle again, leaving alive by the return button; 3. the circle, a hidden tab mid-game, then Escape.
{await openFromCircle();await flap();await wait(200);
 const r=document.querySelector('#bird-screen [data-exit]').getBoundingClientRect();await __pointer([{x:r.x+r.width/2,y:r.y+r.height/2}]);
 await poll(()=>B.state==='flying',4000);await alive('circle, return button');
 await openFromCircle();await flap();
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await wait(250);
 delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));await wait(150);
 await __key('Escape');await alive('circle, hidden tab, Escape');}

// 4. The controller keepsake's first click: the trailer (and the stand after it).
{const inst=keepsakes.get('controller');await poll(()=>inst.worldEntry.body.isSleeping(),15000);
 const box=inst.box;await __pointer([{x:box.x+box.w*.5,y:box.y+box.h*.43}]);
 check('flappy unfreeze the controller plays the trailer',await poll(()=>B.screen?.root.classList.contains('trailer'),5000));
 await poll(()=>!B.screen,12000);await alive('controller trailer');await poll(()=>site.stand?.arrival?.done,8000);}

// 5. The controller again: the game; die, retry, die, give up. On a phone: upright mid-game, Escape while still
//    upright (it closes once the phone turns back), then a second replay ended by a death.
{const inst=keepsakes.get('controller');await poll(()=>inst.worldEntry.body.isSleeping(),15000);
 const play=async()=>{const b=inst.box;await __pointer([{x:b.x+b.w*.5,y:b.y+b.h*.43}]);return await poll(()=>!!B.screen?.game,5000);};
 check('flappy unfreeze the controller replays the game',await play());await flap();scoreTo(20);await wait(150);
 B.debug.death();await poll(()=>B.screen?.over,4000);await wait(120);await __key('Space');
 await poll(()=>B.screen?.retries===1,3000);B.debug.death();await giveUp();
 await alive('controller replay, death, retry, death, give up');
 if(MOBILE){await poll(()=>inst.worldEntry.body.isSleeping(),15000);await play();await flap();
   await __resize(H,W);await poll(()=>!!document.getElementById('turn'),3000);await wait(200);
   B.screen.close(false);await wait(400);
   check('flappy unfreeze closed while upright: it waits under the overlay',!!B.screen&&site.freeze.reasons.includes('turn'),JSON.stringify(held()));
   await __resize(W,H);await alive('controller replay, upright, closed, turned back');}}
__done();
