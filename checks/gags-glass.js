// Gags lane, playtest 2 (item 2): the glass tips forward off the front edge (its top toward you), drops out of the
// bottom of the page, then tumbles down from the top of the page and shatters where the puddle spreads.
// Playtest 3: the fall off the bottom is one smooth motion (no jump back onto the floor, nothing hidden while any of it
// is still on the page), and the shards are there the moment it shatters, where it shatters.
// Run with checks/lib.js. Reduced motion: it simply breaks at the landing spot.
cat.auto=false;const T=site.THREE,calm=stage.reducedMotion;
const trace=[];let sampling=true,shotFall=false,shotTip=false;
const unsunk0=site.world.stats.unsunk;
const sample=()=>{const c=E.glass.cup;if(c&&(c.mode==='choreographed'||c.mode==='flying')){const r=c.picture.rect,e=new T.Euler().setFromQuaternion(c.root.quaternion);trace.push({t:stage.clock,mode:c.mode,y:r.y,h:r.h,cy:r.y+r.h/2,root:stage.toScreen(c.root.position).y,shadow:site.worldLayout.shadows.has('glass'),shown:c.root.visible&&r.w>0,tilt:e.x,ry:e.y});
  if(!shotTip&&e.x>.6&&r.y<stage.height){shotTip=true;__shot('gags-glass-tipping');}
  if(!shotFall&&trace.length>5&&c.root.visible&&r.y+r.h>stage.height*.3&&r.y+r.h<stage.height*.6&&trace.some(p=>p.cy>stage.height)){shotFall=true;__shot('gags-glass-tumbling');}}
  if(sampling)requestAnimationFrame(sample);};
requestAnimationFrame(sample);
const ok=await E.glass.show();sampling=false;
const pool=keepsakes.get('puddle');
if(!calm){
  const tipped=trace.filter(p=>p.tilt>.5),out=trace.findIndex(p=>p.y>stage.height||!p.shown),back=trace.findIndex((p,i)=>i>out&&p.shown&&p.y+p.h<stage.insets.top+8);
  check('it tips forward (its top toward you) while still on the page',tipped.some(p=>p.y<stage.height),JSON.stringify(tipped.slice(0,2)));
  check('it drops out of the bottom of the page',out>0,`frame ${out} of ${trace.length}`);
  check('then it comes down from above the top of the page',back>out,`frame ${back}`);
  const fall=trace.slice(back),spin=new Set(fall.map(p=>Math.round(p.ry*4)));
  check('tumbling as it falls, straight down, with no stray floor shadow',fall.length>3&&spin.size>2&&fall.every((p,i)=>!i||p.root>=fall[i-1].root-.5)&&fall.every(p=>!p.shadow),`${fall.length} frames, ${spin.size} headings`);
}
if(!calm){
  // playtest 3: over the edge in one motion. From the first frame it is posed by hand to the frame it is gone, its
  // picture only ever moves down the page (no jump back up onto the floor), and it is hidden only once all of it is
  // below the bottom of the page.
  const fly=trace.filter(p=>p.mode==='flying'),gone=fly.findIndex(p=>!p.shown),going=fly.slice(0,gone);
  // (its picture's middle: the base's own middle rises a little as it turns on its front foot, as it should)
  const steps=going.slice(1).map((p,i)=>({d:p.cy-going[i].cy,dt:p.t-going[i].t})),ups=steps.filter(s=>s.d<-4);   // (a few px of give as it starts to tip is the picture rect turning)
  const fastest=Math.max(...steps.map(s=>s.d/Math.max(s.dt,1/120)));
  check('the fall off the bottom is one smooth motion: always down the page, no jump',going.length>4&&ups.length===0&&fastest<stage.height*4&&site.world.stats.unsunk===unsunk0,
    `${going.length} frames; ${ups.length} upward; fastest ${fastest.toFixed(0)} px/s; floor lifts ${site.world.stats.unsunk-unsunk0}; middles ${going.map(p=>p.cy.toFixed(0)).join(' ')}`);
  const over=E.glass.over;
  check('it falls all the way off the screen before it is hidden',!!over?.gone&&over.gone.y>stage.height&&going.at(-1).y>stage.height-going.at(-1).h*.6,
    `hidden with its picture's top at ${over?.gone?.y?.toFixed(0)} px (page ${stage.height}), after ${over?.gone?.t?.toFixed(2)} s`);
}
// playtest 3: the shards the moment it breaks, where it breaks
const sh=E.glass.shattered,shards=keepsakes.get('shards'),P=pool&&stage.toScreen(pool.object.position);
await until(()=>shards?.worldEntry?.body.isSleeping(),6000);
const S=shards?.worldEntry&&stage.toScreen(new T.Vector3().copy(shards.worldEntry.body.translation()));
check('the shards are there the moment it shatters, where it shatters',!!sh&&sh.at-sh.broke<500&&!!S&&Math.hypot(S.x-P.x,S.y-P.y)<Math.max(140,stage.width*.12),
  sh?`${(sh.at-sh.broke).toFixed(0)} ms after the smash; resting ${S?Math.hypot(S.x-P.x,S.y-P.y).toFixed(0):'?'} px from the puddle's middle`:'no shards spawned');
const [x,z]=pool?.state.floor||[];
check('it shatters: the shell is gone, the puddle and the shards are there',ok&&E.glass.cup?.mode==='broken'&&!site.world.entries.has('glass')&&!!pool&&keepsakes.has('shards'));
check('the puddle spreads in front of him, on the reachable floor',pool&&z>.2&&stage.toScreen(new T.Vector3(x,0,z)).y<stage.height-stage.insets.bottom,JSON.stringify(pool?.state.floor));
await sleep(600);await __shot(calm?'gags-glass-broken-calm':'gags-glass-broken');
