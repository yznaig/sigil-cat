// Visual lane (playtest-3): "after I did buttaman scene 3 it kind of bugged out some visuals" (Aaron, img7: the box
// drawn flattened, a pale sliver by the shelf, the bucket cut off, lines by the rack, the egg). The rise (scene 3)
// dollies the camera in while widening it (src/eggs/butterman.js, the lens) and brings it back after. A picture is
// redrawn only when its body moves, so anything that moved during the wide lens (the cat's startle, his shove, a nudge)
// kept a picture drawn with the wide camera, and its depth drawn with the lens's near plane, after the camera came
// back. This plays the rise with every floor item nudged while the lens is wide, then compares the room with a fresh
// redraw of every picture: they must match, and the camera must be back exactly.
const {collectFinal}=await import('/checks/world-final-collection.mjs');
const W=site.world,T=site.THREE,gl=stage.renderer.getContext(),bm=window.butterman;
const frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
await collectFinal(site,{cake:false});
// the egg too (img7 shows it)
await until(()=>keepsakes.defs.has('egg'),20000);if(!keepsakes.has('egg'))await keepsakes.give('egg')?.worldTask;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);await frames(10);
const camOf=()=>[stage.camera.fov,stage.camera.near,stage.camera.far,...stage.camera.position.toArray(),...stage.camera.projectionMatrix.elements];
const cam0=camOf();
const floor=[...W.entries.values()].filter(e=>e.presentation?.draw&&!e.support&&!e.fixed&&e.body.isDynamic()&&e.object.visible);
await __shot('visual-rise-before');
bm.play({scene:'rise',force:true});
const wide=await until(()=>stage.camera.fov>(cam0[0]+.8*(60-cam0[0])),15000,20);
// the widest part of the lens: every floor item is nudged (as his shove or the cat's startle moves them) and settles
for(const e of floor){W.cancelReturn(e);e.body.setLinvel({x:0,y:.6,z:0},true);e.body.setAngvel({x:0,y:1.2,z:0},true);W.wake(e);}
const calm=await until(()=>floor.every(e=>e.body.isSleeping()||e.presentation.precise),8000,50);
note('visual rise: nudged while the lens is wide',JSON.stringify({wide,fov:+stage.camera.fov.toFixed(1),items:floor.length,settledDuringLens:calm&&stage.camera.fov>cam0[0]+1}));
await until(()=>!bm.running,30000,50);await until(()=>!W.stats.listening,8000);await frames(20);
const cam1=camOf();
check('visual rise: the camera is back exactly after the rise',cam1.every((v,i)=>Math.abs(v-cam0[i])<1e-9),JSON.stringify({before:cam0.slice(0,6),after:cam1.slice(0,6)}));
await __shot('visual-rise-after');
async function grab(){let out=null;const f=()=>{const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);out={w,h,px};};stage.onPresented.push(f);await until(()=>out,3000,5);stage.onPresented.splice(stage.onPresented.indexOf(f),1);return out;}
const A=await grab();await frames(2);const N=await grab();
for(const e of W.entries.values()){const p=e.presentation;if(p?.invalidate){p.invalidate();if(e.sync)W.sync(e);else p.draw(true);}}
await frames(3);const B=await grab();
// per item: pixels inside its picture box that a fresh redraw changes (and that do not change by themselves)
const d=stage.dpr,bad={};
for(const e of W.entries.values()){const r=e.presentation?.rect;if(!r||!e.presentation.card?.visible)continue;let n=0;
 for(let y=Math.max(0,Math.floor(r.y*d));y<Math.min(A.h,Math.ceil((r.y+r.h)*d));y++)for(let x=Math.max(0,Math.floor(r.x*d));x<Math.min(A.w,Math.ceil((r.x+r.w)*d));x++){
  const k=((A.h-1-y)*A.w+x)*4;let ab=0,an=0;for(let c=0;c<3;c++){ab=Math.max(ab,Math.abs(A.px[k+c]-B.px[k+c]));an=Math.max(an,Math.abs(A.px[k+c]-N.px[k+c]));}
  if(an<=3&&ab>24)n++;}
 const share=n/Math.max(1,r.w*r.h*d*d);if(share>.01)bad[e.id]={pixels:n,share:+share.toFixed(3)};}
await __shot('visual-rise-redrawn');
check('visual rise: every picture after the rise is what a fresh draw gives',!Object.keys(bad).length,JSON.stringify(bad));
__done();
