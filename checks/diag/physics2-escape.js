// Physics lane: why a small body leaves the world in world-small-drops (eyes / twinkle), under variants of HOLD.
const {HOLD}=await import('/src/core/world.js');
cat.auto=false;const W=site.world,T=site.THREE,S=site.supports;
const ids=['crumbs','shards','eyes','twinkle'];const staged=ids.map(id=>keepsakes.give(id));await Promise.all(staged.map(i=>i.worldTask));
const variants=JSON.parse(stage.opt('variants')||'[{"ccd":0.75},{"ccd":0}]'),saved={...HOLD,sunk:{...HOLD.sunk}};
for(const id of (stage.opt('ids')||'eyes,twinkle').split(',')){
 const i=keepsakes.get(id),e=i.worldEntry,b=e.body;
 for(const v of variants){
  Object.assign(HOLD,saved,v);if(v.sunkDepth)HOLD.sunk={...saved.sunk,depth:v.sunkDepth,deep:v.sunkDepth*8};
  S.detach(e,{wake:false});for(const other of W.entries.values())if(other!==e)other.body.setEnabled(false);e.body.setEnabled(true);W.cancelReturn(e);
  const sync=e.sync,sound=e.sound,rest=e.rest;e.sync=null;e.sound=null;e.rest=null;site.world.cat?.suspend('fixture',true);W.step(1/120);
  const escapes=[],slow=[];const u0=W.stats.unsunk,r0=W.stats.respawns;
  for(let seed=0;seed<100;seed++){
   if(e.timer){W.cancelReturn(e);}
   b.setTranslation({x:0,y:.5+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);
   b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
   let n=0,maxV=0,minY=Infinity,u=W.stats.unsunk;for(;n<960&&!b.isSleeping()&&!e.timer;n++){W.step(1/120);const lv=b.linvel();maxV=Math.max(maxV,Math.hypot(lv.x,lv.y,lv.z));minY=Math.min(minY,b.translation().y);}
   if(e.timer)escapes.push({seed,n,maxV:+maxV.toFixed(2),minY:+minY.toFixed(3),unsunk:W.stats.unsunk-u,p:b.translation()});else if(!b.isSleeping())slow.push(seed);
  }
  e.sync=sync;e.sound=sound;e.rest=rest;for(const other of W.entries.values())other.body.setEnabled(true);
  note('escape '+id+' '+JSON.stringify(v),JSON.stringify({escapes:escapes.slice(0,4),nEscapes:escapes.length,slow,unsunk:W.stats.unsunk-u0}));
 }
}
