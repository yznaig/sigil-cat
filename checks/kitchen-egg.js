// Kitchen lane (e1111-58/59): the 90 s bird lets one big egg go as it first flies on (playtest-2: and on every
// later visit when there is no egg anywhere, bird-visits.js); it falls into the room as a
// physical keepsake, counts as the fourth ingredient and cannot break. Needs ?birdcheck=1 (the bird's own fixture skip).
cat.auto=false;const C=E.box.recipe,W=site.world,B=E.bird;
check('egg none before the bird',!keepsakes.has('egg')&&!C.state.egg);
B.debug.skipTo(89.4);await until(()=>B.state==='flying',4000);
check('egg bird flies on',B.state==='flying');
await until(()=>keepsakes.has('egg'),4000);const egg=keepsakes.get('egg');await egg?.worldTask;
check('egg the bird drops one physical egg',egg?.worldReady&&!egg.worldError&&W.entries.has('egg')&&C.state.egg,egg?.worldError||'');
await sleep(stage.reducedMotion?0:250);await __shot('kitchen-egg-falling');
await until(()=>egg.worldEntry.body.isSleeping(),12000);await sleep(300);
const p=egg.worldEntry.body.translation(),r=egg.picture.rect,bird=B.circle;
check('egg lands on the floor, on the page, under the bird\'s side',p.y<.2&&r.x>0&&r.x+r.w<stage.width&&r.y+r.h<stage.height-stage.insets.bottom+4&&Math.abs((r.x+r.w/2)-bird.x)<stage.width*.35,JSON.stringify({p,r,bird}));
// Playtest-2 (Aaron's two pictures): it lands well back in the room, behind his feet on the page and small with
// distance, under the bird, so it reads as the bird's egg (not a big egg at the front).
{const feet=stage.toScreen(new site.THREE.Vector3()).y,bird=document.querySelector('.distant-bird')?.getBoundingClientRect();
 check('egg lands far back, under the bird, in proportion to it',p.z<-.5&&r.y+r.h<feet+8&&Math.abs((r.x+r.w/2)-B.circle.x)<B.circle.rx+r.w&&r.w<=bird.width*2.6&&bird.width>=30,JSON.stringify({z:p.z,bottom:r.y+r.h,feet,egg:r.w,bird:bird?.width}));}
await __shot('kitchen-egg-landed');
// It cannot break: a hard throw at the floor leaves the same egg.
{const e=egg.worldEntry;e.body.setTranslation({x:p.x,y:1.2,z:p.z},true);e.body.setLinvel({x:0,y:-8,z:0},true);W.wake(e);await until(()=>e.body.isSleeping(),12000);
 check('egg cannot break',keepsakes.get('egg')===egg&&W.entries.has('egg')&&egg.worldReady);}
check('egg is a recipe ingredient and an inventory item',C.INGREDIENTS.egg.includes('egg')&&C.inventory().some(i=>i?.id==='egg'));
store.flush();
