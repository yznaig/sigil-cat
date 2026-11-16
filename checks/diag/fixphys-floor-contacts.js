// fixphys diag (suite fix, 2026-11-13): how often Rapier's floor contact is wrong, by floor size (?fh=half extent).
// Per item, N drops like the drop checks; every step reads the floor manifold. bogus: a floor contact deeper than .05
// or with a normal under 60 degrees from up. mismatch: a slow body whose lowest collider point is > .002 inside the
// floor while every floor contact reads >= 0. Not in run-all.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,R=site.rack;
const N=Number(stage.opt('n')||100),ids=(stage.opt('ids')||'eyes,crumbs,shards,postcard,recipe-flour,rack/wizard,rack/crown').split(',');
if(ids.some(id=>id.startsWith('rack/'))){await R.ready({grant:E.hat.hats});await sleep(1800);}
const items=[];for(const id of ids){if(id.startsWith('rack/'))items.push(R.hats.get(id.split('/')[1]));else{const i=keepsakes.give(id);await i.worldTask;items.push(i);}}
await sleep(500);const P=W.physics,floor=W.floor;site.world.cat?.suspend('fixture',true);
for(const i of items){
 const e=i.worldEntry,b=e.body;S.detach(e,{wake:false});for(const o of W.entries.values())o.body.setEnabled(o===e);
 const sync=e.sync,rest=e.rest,sound=e.sound;e.sync=null;e.rest=null;e.sound=null;
 const lowest=()=>{const q=b.rotation(),lp=e.low,x=q.x,y=q.y,z=q.z,w=q.w,r0=2*(x*y+w*z),r1=1-2*(x*x+z*z),r2=2*(y*z-w*x);let lo=Infinity;for(let n=0;n<lp.length;n+=4)lo=Math.min(lo,r0*lp[n]+r1*lp[n+1]+r2*lp[n+2]-lp[n+3]);return lo+b.translation().y;};
 let bogus=0,bogusDrops=0,mismatch=0,mismatchDrops=0,awake=0,steps=0,worst=0;const lifts0=W.stats.unsunk;
 for(let seed=0;seed<N;seed++){
  b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);
  b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  let bd=0,md=0,n=0;for(;n<960&&!b.isSleeping();n++){W.step(1/120);steps++;
   let near=Infinity,bad=false;for(let k=0;k<b.numColliders();k++){const c=b.collider(k);P.contactPair(c,floor,(m,flip)=>{const nn=m.normal();for(let j=0;j<m.numContacts();j++){const d=m.contactDist(j);near=Math.min(near,d);if(d<-.05||Math.abs(nn.y)<.5)bad=true;}});}
   if(bad){bogus++;bd=1;}
   const v=b.linvel();if(Math.hypot(v.x,v.y,v.z)<.05&&near>=0&&near<Infinity&&lowest()<-.002){mismatch++;md=1;}}
  bogusDrops+=bd;mismatchDrops+=md;if(!b.isSleeping()){awake++;(globalThis.__ns??=[]).push(seed);}worst=Math.max(worst,n/120);
 }
 e.sync=sync;e.rest=rest;e.sound=sound;for(const o of W.entries.values())o.body.setEnabled(true);
 note('floor contacts '+i.id+' fh '+(stage.opt('fh')||100),JSON.stringify({drops:N,bogusSteps:bogus,bogusDrops,mismatchSteps:mismatch,mismatchDrops,neverSlept:awake,seeds:(globalThis.__ns||[]).splice(0),worstSeconds:worst,lifts:W.stats.unsunk-lifts0,steps}));
}
