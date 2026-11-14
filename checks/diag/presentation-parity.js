// Diagnostic (world-presentation check fix, 2026-11-13): what the batched composite and the check's independent
// reference differ by. Shows batched | old reference | |diff|x4, then the diff against a reference with every batched
// picture. Not in run-all.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const items=['rifle','top','paper','postcard','ticket','tin','pat'].map(id=>keepsakes.give(id));await Promise.all(items.map(i=>i.worldTask));await site.shelf.task;await sleep(2000);await until(()=>!W.stats.listening&&!S.listening,12000);
const B=site.worldPresentation;B.flush();
const R=stage.renderer,w=stage.width,h=stage.height;
function grab(){const rt=new T.WebGLRenderTarget(w,h),a=new Uint8Array(w*h*4),old=R.getRenderTarget();R.setRenderTarget(rt);R.clear();R.render(stage.scene,stage.camera);R.readRenderTargetPixels(rt,0,0,w,h,a);R.setRenderTarget(old);rt.dispose();return a;}
function reference(cards){B.root.visible=false;for(const card of cards)stage.scene.add(card);
 const layers=[];for(const e of site.worldLayout.shadows.values())for(const m of e.group.children){layers.push([m,m.layers.mask]);m.layers.enable(0);}
 const b=grab();for(const card of cards)card.removeFromParent();for(const [m,mask]of layers)m.layers.mask=mask;B.root.visible=true;return b;}
function diff(a,b){let changed=0,worst=0,x0=w,y0=h,x1=-1,y1=-1;for(let n=0;n<a.length;n+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(a[n+k]-b[n+k]));if(d>4){changed++;const p=n/4,x=p%w,y=h-1-Math.floor(p/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}worst=Math.max(worst,d);}return {changed,fraction:changed/(w*h),worst,box:[x0,y0,x1,y1]};}
function panel(list,name){const cv=document.createElement('canvas');cv.width=w;cv.height=h*list.length;const g=cv.getContext('2d');
 list.forEach((px,i)=>{const im=g.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=((h-1-y)*w+x)*4,d=(y*w+x)*4;for(let k=0;k<3;k++)im.data[d+k]=px[s+k];im.data[d+3]=255;}g.putImageData(im,0,h*i);});
 cv.style.cssText=`position:fixed;left:0;top:0;width:${w/stage.dpr}px;height:${h/stage.dpr}px;z-index:99999`;return cv;}
async function show(name,images){for(let i=0;i<images.length;i++){const c=panel([images[i]],name);document.body.appendChild(c);await __shot(name+'-'+i);c.remove();}}
function absdiff(a,b){const o=new Uint8Array(a.length);for(let n=0;n<a.length;n+=4){for(let k=0;k<3;k++)o[n+k]=Math.min(255,4*Math.abs(a[n+k]-b[n+k]));o[n+3]=255;}return o;}
async function round(label){
 B.flush();const a=grab();
 const oldCards=[...new Set([...keepsakes.live.values()].map(i=>i.picture?.card).concat([...W.entries.values()].map(e=>e.presentation?.card)).filter(Boolean))];
 const all=[...new Set(B.list.map(p=>p.card))],missing=all.filter(c=>!oldCards.includes(c));
 const b=reference(oldCards),c=reference(all);
 const v=new T.Vector3(),rects=missing.map(card=>{card.updateWorldMatrix(true,true);const q=B.list.find(p=>p.card===card).quad;q.geometry.computeBoundingBox();const bb=q.geometry.boundingBox;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [x,y] of [[bb.min.x,bb.min.y],[bb.max.x,bb.min.y],[bb.min.x,bb.max.y],[bb.max.x,bb.max.y]]){v.set(x,y,0).applyMatrix4(q.matrixWorld).project(stage.camera);const sx=(v.x*.5+.5)*w,sy=(.5-v.y*.5)*h;x0=Math.min(x0,sx);x1=Math.max(x1,sx);y0=Math.min(y0,sy);y1=Math.max(y1,sy);}
  return {name:card.name||q.name||'?',parent:q.parent?.name,depthMode:B.list.find(p=>p.card===card).depthMode,renderOrder:q.renderOrder,opacity:+q.material.opacity.toFixed(3),visible:card.visible,rect:[x0,y0,x1,y1].map(Math.round)};});
 note('parity '+label,JSON.stringify({quads:B.stats.pictureQuads,batches:B.stats.pictureBatches,listed:all.length,oldCards:oldCards.length,missing:rects,old:diff(a,b),all:diff(a,c)}));
 await show('parity-'+label,[a,b,absdiff(a,b),absdiff(a,c)]);
}
await round('free');
for(const id of ['rifle','top','tin','pat'])site.shelf.store(id,false);await sleep(200);await round('stored');
