// fixphys diag: replay world-rack's and world-cake-solids' failing drop seeds and log what REST does each one.
// Not in run-all. ?seeds=35,37&ids=rack/wizard,recipe-flour
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,R=site.rack;
const seeds=(stage.opt('seeds')||'0,35,37,67').split(',').map(Number),ids=(stage.opt('ids')||'rack/wizard,recipe-flour').split(',');
await R.ready({grant:E.hat.hats});await sleep(1800);
for(const id of ids){
 let i;if(id.startsWith('rack/')){i=R.hats.get(id.split('/')[1]);S.detach(i.worldEntry,{wake:false});}else{i=keepsakes.give(id);await i.worldTask;}
 const original=i.worldEntry;for(const other of W.entries.values())other.body.setEnabled(false);
 site.world.cat?.suspend('fixture',true);
 for(const seed of seeds){
  const e=await W.add({id:'diag-drop',object:new T.Group(),shapes:i.colliderShapes,mass:i.mass??original.body.mass(),material:i.physicsMaterial,position:new T.Vector3(0,.6+seed%5*.2,0),rotation:new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27))});
  const b=e.body;b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  const u0=W.stats.unsunk,lifts=[];let n=0,last=W.stats.unsunk,trace=[];
  for(;n<960&&!b.isSleeping();n++){W.step(1/120);if(W.stats.unsunk!==last){lifts.push(n);last=W.stats.unsunk;}
   if(n%60===59){const v=b.linvel(),w=b.angvel(),p=b.translation();trace.push([n,+p.y.toFixed(4),+Math.hypot(v.x,v.y,v.z).toFixed(4),+Math.hypot(w.x,w.y,w.z).toFixed(4),!!e.calm,e.calmAt==null?null:+e.calmAt.toFixed(2),!!e.gaining]);}}
  note('drop '+id+' seed '+seed,JSON.stringify({sleptAt:b.isSleeping()?n/120:null,unsunk:W.stats.unsunk-u0,lifts:lifts.slice(0,30),nLifts:lifts.length,trace}));
  W.remove(e.id);
 }
 for(const other of W.entries.values())other.body.setEnabled(true);
}
