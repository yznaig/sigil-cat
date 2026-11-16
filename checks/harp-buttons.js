// Harp lane (music round, 2026-11-16, e1116-11). Aaron: "on mobile, similar to how the "closer, further" buttons are set
// up, there should be 6 buttons you can click to play the harp whiskers for about ~10s after playing a whisker, and then
// it can disappear (or it can be replaced by the "futher closer" if someone picks something up)".
// Run with checks/lib.js on a fresh save. Phone (real touch through CDP for the buttons), ?safe=l,r,t,b for a notch,
// ?rm=1 for reduced motion; on a desktop it checks only that they never come.
//  1 none before a pluck; a tap on a whisker brings six; left to right A S D J K L (whiskers 0..5); thumb-sized; inside
//    the safe sides; under his whiskers and clear of the page's controls and the sigil row; no new frame work
//  2 each button plucks its own whisker (the ring along it) on the press, as a tap on it does
//  3 10 s after the last pluck they go; every press starts the 10 s again; gone, no frame work and nothing to hit
//  4 an item held: Nearer/Deeper win and the whisker buttons hide; let go within the time and they are back
//  5 a lock (a scene, a mode) ends them
//  6 the tune on the buttons finds the harp and plays the encore, as on the whiskers; the encore ends the buttons
const H=E.harp,B=H.buttons,bm=E.butterman,W=site.world,T=site.THREE,show=(o)=>JSON.stringify(o),q=new URLSearchParams(location.search);
const R=(r)=>r&&{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.w),h:Math.round(r.h)};
const rectOf=(el)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0?{x:r.left,y:r.top,w:r.width,h:r.height}:null;};
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const SAFE=q.get('safe')?q.get('safe').split(',').map(Number):null;
if(SAFE){const [left,right,top,bottom]=SAFE;const ok=await __safeArea({left,right,top,bottom});dispatchEvent(new Event('resize'));await sleep(600);
 check('harp-buttons safe area emulated (DevTools protocol)',ok&&stage.insets.left===left&&stage.insets.right===right,show({ok,insets:stage.insets}));}
cat.auto=false;cat.setYaw(cat.config.rotate.homeYaw);await sleep(800);
for(const id of ['grimoire','achievements'])document.getElementById(id).hidden=false;   // the books shown, as in play
const mid=(w)=>({x:(w.pts[1].x+w.pts[2].x)/2,y:(w.pts[1].y+w.pts[2].y)/2});
const tapWhisker=async(i)=>{const w=H.whiskers().find(x=>x.index===i);await tap(mid(w).x,mid(w).y);};
const ringEnds=()=>[...document.querySelectorAll('#harp-fx path')].map(p=>p.getAttribute('d').match(/-?[\d.]+/g).map(Number)).map(n=>[n[0],n[1],n[4],n[5]]);
const along=(w)=>{const all=H.whiskers();const near=([ax,ay,bx,by])=>all.map(v=>[v.index,Math.hypot(ax-v.pts[0].x,ay-v.pts[0].y)+Math.hypot(bx-v.pts[2].x,by-v.pts[2].y)]).sort((a,b)=>a[1]-b[1])[0];return ringEnds().some(e=>{const n=near(e);return n&&n[0]===w.index&&n[1]<16;});};   // a ring drawn along this whisker (nearest of the six; he bobs a little)
const frames0=stage.onFrame.length;
check('harp-buttons fresh save: the harp not found, no whisker buttons',!registry.has('harp')&&!B.el&&!document.getElementById('harp-keys'));

if(!MOBILE){
  const p0=H.plucks;await tapWhisker(3);await sleep(200);await __key('k');await sleep(300);
  check('harp-buttons a desktop (a mouse) gets no whisker buttons, after a tap or a key',H.plucks===p0+2&&!B.el&&!document.getElementById('harp-keys'),show({plucks:H.plucks-p0}));
}else{
  // ---- 1 ----
  const p0=H.plucks;await tapWhisker(1);
  const up=await until(()=>B.shown,1500);await sleep(H.config.buttons.fade*1000+100);
  const btns=[...document.querySelectorAll('#harp-keys button')],rs=btns.map(rectOf);
  check('harp-buttons 1 a tap on a whisker plucks it and brings up six whisker buttons',H.plucks===p0+1&&up&&btns.length===6&&rs.every(Boolean),show({plucks:H.plucks-p0,up,n:btns.length}));
  const order=btns.map((b,i)=>[rs[i].x,+b.dataset.whisker]).sort((a,b)=>a[0]-b[0]).map(a=>a[1]).join('');
  check('harp-buttons 1 left to right they are A S D J K L: your-left whiskers top to bottom, then your-right',order==='012345',order);
  check('harp-buttons 1 each is thumb-sized (44 px or more each way)',rs.every(r=>r.w>=44&&r.h>=44),show(rs.map(R)));
  const L=stage.insets.left||0,Rt=stage.width-(stage.insets.right||0);
  check('harp-buttons 1 inside the safe sides and the screen',rs.every(r=>r.x>=L&&r.x+r.w<=Rt&&r.y>=0&&r.y+r.h<=stage.height),show({insets:stage.insets,rs:rs.map(R)}));
  const ws=H.whiskers(),low=Math.max(...ws.flatMap(w=>w.pts.map(p=>p.y))),cx=cat.screenOf([0,cat.height*.5,0]).x;
  const lc=(rs[0].x+rs[2].x+rs[2].w)/2,rc=(rs[3].x+rs[5].x+rs[5].w)/2;
  check('harp-buttons 1 below his whiskers (his face stays clear), the left three left of him and the right three right of him',Math.min(...rs.map(r=>r.y))>low+20&&lc<cx&&rc>cx,show({top:Math.min(...rs.map(r=>r.y)),whiskersLow:Math.round(low),lc,rc,cx:Math.round(cx)}));
  const ui=['.top .tl','.top .name','#tally','.fs-toggle','#footer .sound','#footer .zoom','#footer .fr > *','#marks > li']
    .flatMap(s=>[...document.querySelectorAll(s)]).filter(e=>!e.hidden&&getComputedStyle(e).visibility!=='hidden').map(e=>({el:e.id||e.className?.baseVal||e.className||e.tagName,r:rectOf(e)})).filter(u=>u.r);
  const hits=rs.flatMap((r,i)=>ui.filter(u=>overlap(r,u.r)>0).map(u=>i+' over '+u.el));
  check('harp-buttons 1 clear of SOUND, ZOOM, the books, the full-screen toggle, the top line and the row of sigils',!hits.length,show(hits));
  check('harp-buttons 1 showing them adds no frame work',stage.onFrame.length===frames0,show([frames0,stage.onFrame.length]));
  await __shot('harp-buttons-up');
  // ---- 2 ----
  let fid=10;const press=async(i)=>{const r=rectOf(document.querySelector(`#harp-keys button[data-whisker="${i}"]`)),pt={x:r.x+r.w/2,y:r.y+r.h/2,id:++fid};
    await __touch('touchStart',[pt]);await sleep(50);const after=H.plucks;await __touch('touchEnd',[]);await sleep(40);return after;};
  const got=[];
  for(const i of [0,1,2,3,4,5]){
    await sleep(1000);const n0=H.plucks,t0=B.taps;const onPress=await press(i);const w=H.whiskers().find(x=>x.index===i);
    got.push({i,onPress:onPress-n0,plucks:H.plucks-n0,taps:B.taps-t0,rings:!!w&&along(w),seen:!!w?.seen});
  }
  check('harp-buttons 2 each button plucks its own whisker, once, on the press (the ring along that whisker)',got.every(g=>g.onPress===1&&g.plucks===1&&g.taps===1&&g.seen&&g.rings),show(got));
  await sleep(60);await __shot('harp-buttons-pluck');
  // ---- 3: the 10 s, started again by each press ----
  await sleep(6000);const leftBefore=B.left;await press(3);const tR=performance.now(),leftAfter=B.left;
  await sleep(6000);const still=B.shown;
  const gone=await until(()=>!B.shown,8000,20);const tGone=performance.now()-tR;
  check('harp-buttons 3 a press restarts the 10 s: still up 12 s after the press before it',leftBefore<4.5&&leftAfter>9.8&&still,show({leftBefore,leftAfter,still}));
  check('harp-buttons 3 then they go 10 s after the last pluck',gone&&tGone>9600&&tGone<10800,show({gone,ms:Math.round(tGone)}));
  await sleep(H.config.buttons.fade*1000+200);
  check('harp-buttons 3 gone: hidden (nothing to hit) and no frame work',B.el.hidden&&!B.shown&&stage.onFrame.length===frames0&&document.elementsFromPoint(...(()=>{const r=rs[2];return [r.x+r.w/2,r.y+r.h/2];})()).every(e=>!e.closest?.('#harp-keys')),show({hidden:B.el.hidden,frames:[frames0,stage.onFrame.length]}));
  if(stage.reducedMotion){
    await tapWhisker(1);await until(()=>B.shown,1500);const op=getComputedStyle(B.el).transitionDuration;B.end();
    check('harp-buttons 3 reduced motion: no fade, gone at once',B.el.hidden&&/^0s/.test(op),show({hidden:B.el.hidden,op}));
  }
  await __shot('harp-buttons-hidden');
  // ---- 4: an item held ----
  const tin=keepsakes.give('tin');await tin.worldTask;await until(()=>!W.stats.listening,10000);await sleep(800);
  await tapWhisker(4);await until(()=>B.shown,1500);
  const p=stage.toScreen(tin.worldEntry.object.getWorldPosition(new T.Vector3())),finger={x:p.x,y:p.y,id:1};
  const underPad=[...document.querySelectorAll('#harp-keys button')].map(rectOf).some(r=>r&&p.x>=r.x-4&&p.x<=r.x+r.w+4&&p.y>=r.y-4&&p.y<=r.y+r.h+4);
  await __touch('touchStart',[finger]);for(let k=1;k<=6;k++){await sleep(30);finger.x+=4;finger.y-=3;await __touch('touchMove',[finger]);}
  await sleep(150);const grip=document.querySelector('.world-grip');
  await sleep(H.config.buttons.fade*1000+150);
  check('harp-buttons 4 an item held: Nearer/Deeper up, the whisker buttons gone',W.held?.entry?.id==='tin'&&!!grip&&!B.shown&&B.el.hidden&&B.left>0,show({held:W.held?.entry?.id,grip:!!grip,shown:B.shown,left:B.left,tinUnderPad:underPad}));
  await __shot('harp-buttons-held');
  await __touch('touchEnd',[]);await sleep(200);
  check('harp-buttons 4 let go within the 10 s: Nearer/Deeper gone, the whisker buttons back',!W.held&&!document.querySelector('.world-grip')&&B.shown&&B.left>0,show({held:W.held?.entry?.id,shown:B.shown,left:B.left}));
  // ---- 5: a lock ends them ----
  input.lock('harp-buttons-check',true);await sleep(100);const lockedOut=!B.shown;input.lock('harp-buttons-check',false);await sleep(500);
  check('harp-buttons 5 a lock (a scene, a mode) ends them, and they stay away after it',lockedOut&&!B.shown&&B.left===0,show({lockedOut,shown:B.shown,left:B.left}));
  await sleep(H.config.patience*1000+300);
  // ---- 6: the tune on the buttons ----
  await tapWhisker(0);await until(()=>B.shown,1500);await sleep(H.config.patience*1000+300);
  for(const i of H.config.tune){await press(i);await sleep(120);}
  check('harp-buttons 6 the tune on the buttons (C C B C D C) finds the harp and plays the encore',await until(()=>registry.has('harp')&&H.unlocked,3000)&&await until(()=>bm.running,3000),show({found:registry.has('harp'),running:bm.running}));
  check('harp-buttons 6 the encore has the stage: the whisker buttons go when it starts',await until(()=>!B.shown&&B.left===0,1500),show({shown:B.shown,left:B.left}));
  await until(()=>!bm.running,60000);B.end();await sleep(500);
  check('harp-buttons no frame work left',stage.onFrame.length===frames0,show([frames0,stage.onFrame.length]));
}
