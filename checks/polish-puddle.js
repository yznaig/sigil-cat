// World polish lane (e1111-58, item 8): the puddle is about twice the area, plain clean water (no mirror picture),
// shadows land on it, and its wet patch still charges the top (now over the whole bigger pool). Run with checks/lib.js.
cat.auto=false;
await fast(8,()=>E.glass.show());
const pool=keepsakes.get('puddle'),[x,z,w,d]=pool.state.floor;
check('puddle is about twice the area',pool.def.size===.7*Math.SQRT2&&pool.state.wide===1,`floor ${w.toFixed(3)} x ${d.toFixed(3)}`);
const m=pool.object.material;
check('no reflection: the water no longer reads the cat picture',!m.uniforms.uCat&&!/uCat|behind\(/.test(m.fragmentShader));
const shadowOrders=[];stage.scene.traverse(o=>{if(/shadow/i.test(o.name||'')||o===cat.shadow)shadowOrders.push(o.renderOrder);});
for(const g of site.worldLayout.shadows.values())g.group.traverse(o=>{if(o.isMesh)shadowOrders.push(o.renderOrder);});
check('floor shadows draw over the water',pool.object.renderOrder<Math.min(-5,...shadowOrders),`puddle ${pool.object.renderOrder}, shadows ${[...new Set(shadowOrders)]}`);
// an old saved pool (before it doubled) keeps its middle and grows to the new area once
pool.setState({floor:[x,z,w/Math.SQRT2,d/Math.SQRT2],wide:0});pool.def.place(pool.object,pool);
const g=pool.state.floor;
check('an older saved pool grows to the new size once',Math.abs(g[2]-w)<1e-9&&Math.abs(g[3]-d)<1e-9&&g[0]===x&&pool.state.wide===1);
pool.def.place(pool.object,pool);check('and only once',Math.abs(pool.state.floor[2]-w)<1e-9);
// the top stands in the new outer band of the pool (outside where the old pool reached): a bolt through the water
// still charges it
const top=keepsakes.give('top');await top.worldTask;
const e=top.worldEntry,b=e.body,W=site.world,C=site.worldProps.charged;
const put=(px,pz)=>{b.setTranslation({x:px,y:.003,z:pz},false);b.setRotation({x:0,y:0,z:0,w:1},false);b.setLinvel({x:0,y:0,z:0},false);b.setAngvel({x:0,y:0,z:0},false);W.park(e);W.sync(e);};
put(x+w*.36,z);
await sleep(300);await __shot('polish-puddle');
await fast(8,()=>site.cast('zigzag'));
check('a top in the bigger pool is charged by the bolt',C.active&&top.state.charged);
C.stop();await until(()=>!W.stats.listening,8000);
put(x+w*.62,z);await until(()=>!E.bolt.busy,8000);
await fast(8,()=>site.cast('zigzag'));
check('a top just outside the pool is not charged',!C.active);
