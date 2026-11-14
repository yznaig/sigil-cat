// Gags lane, playtest 2 (item 3): the first time the box sigil is drawn, he pops out of the box and the box is flung
// off him, up and to the side, tumbling, and lands by physics on the page. Reduced motion: set back in place.
// Run with checks/lib.js.
cat.auto=false;const T=site.THREE,calm=stage.reducedMotion,W=site.world;
const run=site.cast('square');const box=keepsakes.get('box');await box.worldTask;
await until(()=>E.box.inside,8000);await __shot('gags-box-inside');
const start=new T.Vector3().copy(box.worldEntry.body.translation()),path=[];let rec=true;
const rot=()=>{const q=box.worldEntry.body.rotation();return new T.Quaternion(q.x,q.y,q.z,q.w);};const q0=rot();
let shot=false;const sample=()=>{if(!E.box.inside&&box.worldEntry.body.isEnabled()){const p=box.worldEntry.body.translation();path.push({x:p.x,y:p.y,z:p.z,a:rot().angleTo(q0)});if(!shot&&p.y>start.y+.15){shot=true;__shot('gags-box-flung');}}if(rec)requestAnimationFrame(sample);};requestAnimationFrame(sample);
await run;await until(()=>!E.box.busy,8000);
await until(()=>box.worldEntry.body.isSleeping(),12000);rec=false;
const end=box.worldEntry.body.translation(),peak=Math.max(...path.map(p=>p.y)),turn=Math.max(...path.map(p=>p.a)),r=box.picture.rect;
if(!calm){
  check('the box is flung up off him',peak>start.y+.2,`rose ${(peak-start.y).toFixed(2)}`);
  check('and to the side, tumbling',Math.abs(end.x-start.x)>.25&&turn>.4,`moved ${(end.x-start.x).toFixed(2)} sideways, turned ${turn.toFixed(2)} rad`);
}else check('calm: no fling, it is set back',E.box.stats.flings===0);
check('it lands on the page, grabbable, and he is out',r.x>-10&&r.x+r.w<stage.width+10&&r.y+r.h<stage.height-stage.insets.bottom+30&&box.worldEntry.canGrab&&!cat.hidden&&!W.held,JSON.stringify(r));
await __shot(calm?'gags-box-landed-calm':'gags-box-landed');
