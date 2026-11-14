// World polish lane (e1111-58, item 7): the bolt's first cloud floats in slowly from the side, it does not spawn.
// Run with checks/lib.js; with --reduced it is simply there.
cat.auto=false;
check('no cloud before the first bolt',!keepsakes.has('cloud'));
// A screenshot stalls the page for a frame (100 ms at phone dpr 2): samples taken around it are marked, not read as a jump.
let shooting=false;const xs=[],sample=()=>{const c=keepsakes.get('cloud');if(c?.box)xs.push({t:stage.clock,x:c.box.x+c.box.w/2,w:c.box.w,shot:shooting});};
stage.onRender.push(sample);
site.cast('zigzag');
await until(()=>keepsakes.has('cloud'),8000);
const cloud=keepsakes.get('cloud');
await sleep(stage.reducedMotion?400:2400);shooting=true;await __shot('polish-cloud-arriving');await sleep(50);shooting=false;
await until(()=>!cloud.arrival,12000);await sleep(300);
stage.onRender.splice(stage.onRender.indexOf(sample),1);
const first=xs[0],last=xs.at(-1),home=keepsakes.toPx(cloud.x,cloud.y).x;
if(stage.reducedMotion){
 check('reduced motion: the cloud is simply there',Math.abs(first.x-last.x)<cloud.u*.2,`moved ${Math.abs(first.x-last.x).toFixed(1)} px`);
}else{
 const steps=xs.slice(1).filter(p=>!p.shot).map(p=>{const i=xs.indexOf(p);return Math.abs(p.x-xs[i-1].x);}),dur=last.t-first.t;
 check('the cloud starts off the side of the page',first.x+first.w/2<0||first.x-first.w/2>stage.width,`first centre ${first.x.toFixed(0)} px, width ${first.w.toFixed(0)}`);
 check('it floats in slowly and lands where it lives',dur>6&&Math.abs(last.x-home)<cloud.u*.2,`${dur.toFixed(1)} s; ends ${last.x.toFixed(0)}, home ${home.toFixed(0)}`);
 // no jumps: the largest frame-to-frame move stays a glide (under 1% of the page width per frame)
 check('no jump: one smooth glide',Math.max(...steps)<stage.width*.01,`largest step ${Math.max(...steps).toFixed(1)} px`);
}
await __shot('polish-cloud-home');
// Playtest-2 (physics lane): the cloud now drifts left to right across the page all the time, so "in place" means
// no further than that drift carried it (and no second arrival).
const {BOLT}=await import('/src/eggs/bolt.js');
const x0=cloud.box.x,t0=stage.clock;site.cast('zigzag');await until(()=>!E.bolt.busy,8000);await sleep(400);
const drift=stage.reducedMotion?0:(stage.width+cloud.box.w+60)/BOLT.cloud.crossSeconds*(stage.clock-t0);
check('a second bolt darkens the cloud in place, no second arrival',!cloud.arrival&&Math.abs(cloud.box.x-x0-drift)<cloud.u*.2,JSON.stringify({moved:cloud.box.x-x0,drift}));
