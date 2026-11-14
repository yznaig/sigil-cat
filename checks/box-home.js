// Fix round A (playtest-2, e1112-35): the box's first place is in plain view. On a phone on its side the floor in front
// of him is a thin band; the box used to be placed far back, small beside his head and against the pinboard, where a
// nudge put it behind the board. Fresh page: give the box, let it land, judge where it rests.
cat.auto=false;const W=site.world;
const i=keepsakes.give('box');await i.worldTask;await until(()=>!W.stats.listening,10000);
const e=i.worldEntry,r=i.picture.rect,f=site.worldLayout.furniture();
const overlap=(a,b)=>b&&b.w&&Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const seen=site.occluders.exposure(e).share;
check('box home: clear of the pinboard and the shelf, and in view',!overlap(r,f.pinboard)&&!overlap(r,f.shelf)&&seen>=.9,JSON.stringify({rect:r,seen,pinboard:f.pinboard,shelf:f.shelf}));
check('box home: on the floor beside him, not far back by his head',r.y+r.h>=keepsakes.feet.y-20,JSON.stringify({bottom:r.y+r.h,feet:keepsakes.feet.y}));
await __shot('box-home');

// Layout lane (playtest-3, e1113-30): the floor row (rack, controller stand, egg cup) now fills the floor left of him.
// A box given with the row there keeps clear of all three and stays in plain view. Where it rests in depth is the
// physics lane's floor-home rule (not changed here): noted, not gated.
keepsakes.take('box');await until(()=>!W.stats.listening,10000);
await site.rack.ready({grant:E.hat.hats});await until(()=>!site.rack.arrival||site.rack.arrival.done,15000);
{const cm=await import(new URL('src/flappy/controller.js',document.baseURI).href);store.set('bird.stand',true);await cm.ensureStand(site);
 const cu=await import(new URL('src/world/egg-cup.js',document.baseURI).href);store.set('eggCup',true);await cu.eggCupService(site).ensure();await until(()=>!W.stats.listening,10000);}
{const j=keepsakes.give('box');await j.worldTask;await until(()=>!W.stats.listening,10000);
 const r2=j.picture.rect,f2=site.worldLayout.furniture(),seen2=site.occluders.exposure(j.worldEntry).share;
 check('box home with the floor row there: clear of the rack, the stand and the cup, and in view',!overlap(r2,f2.rack)&&!overlap(r2,f2.stand)&&!overlap(r2,f2['egg-cup'])&&seen2>=.9,JSON.stringify({rect:r2,seen:seen2,rack:f2.rack,stand:f2.stand,cup:f2['egg-cup']}));
 note('box home with the floor row there: its bottom against his feet (floor-home, physics lane)',JSON.stringify({bottom:r2.y+r2.h,feet:keepsakes.feet.y}));
 await __shot('box-home-row');}
