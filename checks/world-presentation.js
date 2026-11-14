// Functional parity only: pixels, ordering, wake, visibility and disposal.
// No cost gate or throughput measurement (e1111-21).
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const items=['rifle','top','paper','postcard','ticket','tin','pat'].map(id=>keepsakes.give(id));await Promise.all(items.map(i=>i.worldTask));await site.shelf.task;await sleep(2000);await until(()=>!W.stats.listening&&!S.listening,12000);
const B=site.worldPresentation;B.flush();
// One batch per side of the cat (e1111-58: pictures deeper than him draw before him) and per depth kind: a picture
// that takes no part in the depth between pictures (a soft floor shadow, the shelf's wall shadow: depth 'none', physics
// and layout lanes) draws in a chunk of its own, so a side holding both kinds has two (presentation check fix,
// 2026-11-13). The side is worked out here from the camera, apart from the presentation's own sort.
const groups=()=>{const f=new T.Vector3(),r=new T.Vector3();stage.camera.getWorldDirection(f);const limit=r.copy(site.cat.card.position).sub(stage.camera.position).dot(f),g=new Set();
 for(const p of B.list)if(p.card.visible&&p.quad.material.visible)g.add((r.copy(p.card.position).sub(stage.camera.position).dot(f)>limit)+':'+(p.depthMode==='none'));return g;};
const kinds=groups();
check('presentation one picture batch per side of the cat and depth kind, and stationary shadow layer',B.stats.pictureBatches===kinds.size&&B.stationaryShadows>=4&&B.stats.shadowVertices>0,JSON.stringify({...B.stats,groups:[...kinds]}));
async function parity(label){
 B.flush();const R=stage.renderer,w=stage.width,h=stage.height,rt=new T.WebGLRenderTarget(w,h),a=new Uint8Array(w*h*4),b=new Uint8Array(w*h*4),old=R.getRenderTarget();
 R.setRenderTarget(rt);R.clear();R.render(stage.scene,stage.camera);R.readRenderTargetPixels(rt,0,0,w,h,a);
 // Every picture the presentation batches, drawn on its own: keepsakes, world bodies and pictures owned by neither
 // (the shelf's wall shadow, layout lane playtest-3, was left out of a list built from keepsakes and world bodies).
 const cards=[...new Set(B.list.map(p=>p.card))];
 B.root.visible=false;for(const card of cards)stage.scene.add(card);
 const layers=[];for(const e of site.worldLayout.shadows.values())for(const m of e.group.children){layers.push([m,m.layers.mask]);m.layers.enable(0);}
 R.clear();R.render(stage.scene,stage.camera);R.readRenderTargetPixels(rt,0,0,w,h,b);
 for(const card of cards)card.removeFromParent();for(const [m,mask]of layers)m.layers.mask=mask;B.root.visible=true;R.setRenderTarget(old);rt.dispose();
 let changed=0,worst=0;for(let n=0;n<a.length;n+=4){let delta=0;for(let k=0;k<4;k++)delta=Math.max(delta,Math.abs(a[n+k]-b[n+k]));if(delta>4)changed++;worst=Math.max(worst,delta);}
 check('presentation '+label+' matches independent quads/shadows',changed/(w*h)<.005,JSON.stringify({changedPixels:changed,fraction:changed/(w*h),maxChannelDelta:worst}));
}
await parity('free props');await __shot('world-unit6-batch-floor');
const p=keepsakes.get('pat'),shadow=site.worldLayout.shadows.get('pat');W.wake(p.worldEntry);check('presentation waking removes stale merged shadow',!shadow.batch.stationary);await until(()=>!W.stats.listening,8000);
for(const id of ['rifle','top','tin','pat'])site.shelf.store(id,false);await sleep(200);await parity('stored art');await __shot('world-unit6-batch-shelf');
// Adaptive DPR emits real layout events even after bodies sleep. A resize is
// supposed to invalidate a picture; sample an uninterrupted idle layout window.
let layouts=0,windowFound=false;const resized=()=>layouts++;stage.onResize.push(resized);
for(let attempt=0;attempt<6;attempt++){
 await until(()=>!W.stats.listening&&!S.listening&&!B.pending&&!B.listening,10000);
 const before=JSON.stringify(B.stats),callbacks=stage.onRender.length,generation=layouts,dpr=stage.dpr;await sleep(2100);
 if(layouts!==generation){note('presentation idle window resized',JSON.stringify({dpr:[dpr,stage.dpr],layouts:layouts-generation}));continue;}
 windowFound=true;check('presentation settled buffers and callbacks do not change',before===JSON.stringify(B.stats)&&!B.pending&&!B.listening&&stage.onRender.length===callbacks,JSON.stringify({before:JSON.parse(before),after:B.stats,callbacks:[callbacks,stage.onRender.length],pending:B.pending,listening:B.listening,dpr}));break;
}
stage.onResize.splice(stage.onResize.indexOf(resized),1);check('presentation stable layout idle window observed',windowFound);
// Tray visibility and page takeover still use the original logical card API.
const card=site.shelf.picture.card;card.visible=false;B.flush();const n=B.stats.pictureQuads;card.visible=true;B.flush();check('presentation visibility is event driven',B.stats.pictureQuads===n+1);
const oldTop=stage.insets.top,oldBottom=stage.insets.bottom;stage.setInsets(oldTop+12,oldBottom+10);await sleep(100);await parity('resized art');stage.setInsets(oldTop,oldBottom);await sleep(100);
const registrations=B.pictures;keepsakes.take('tin');await sleep(150);B.flush();
check('presentation disposal removes picture and shadow registration',B.pictures===registrations-1&&!site.worldLayout.shadows.has('tin')&&!W.entries.has('tin'));
await parity('disposed prop');
