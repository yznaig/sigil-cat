// Compare cached mesh pixels directly with the original 3D geometry at the
// cache's actual resolution, including repacking while neighbours sleep.
cat.auto=false;const T=site.THREE,W=site.world,R=stage.renderer;
const items=['tin','pat','postcard','flour','eyes','box','bucket'].map(id=>keepsakes.give(id));await Promise.all(items.map(i=>i.worldTask));await site.shelf.ensure();await E.box.setOpen(false);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});W.park(i.worldEntry);}
const reference=new T.Scene();for(const o of stage.scene.children)if(o.isLight)reference.add(o.clone());reference.environment=stage.scene.environment;reference.environmentIntensity=stage.scene.environmentIntensity;
const camera=stage.camera.clone(),quadScene=new T.Scene(),quadCamera=new T.OrthographicCamera(-.5,.5,.5,-.5,0,2);quadCamera.position.z=1;
const quad=new T.Mesh(new T.PlaneGeometry(1,1));quadScene.add(quad);const old=R.getRenderTarget();
let worstFraction=0,totalChanged=0,totalPixels=0;
function compare(i,label){
  const p=i.picture,m=p.card.children[0].material,region=m.uniforms.region.value,texture=m.uniforms.map.value;
  check('atlas '+i.id+' stays visible in '+label,p.card.visible&&!i.worldEntry.timer,JSON.stringify(p.rect));
  const w=Math.round(region.x*texture.image.width),h=Math.round(region.y*texture.image.height),rt=new T.WebGLRenderTarget(w,h,{depthBuffer:true}),a=new Uint8Array(w*h*4),b=new Uint8Array(a.length);
  const model=new T.Group();model.matrixAutoUpdate=false;model.matrix.copy(i.object.matrixWorld);model.add(p.visual.clone(true));reference.add(model);
  camera.copy(stage.camera);const view=stage.camera.view;camera.setViewOffset(stage.width,stage.height,p.rect.x+(view?.enabled?view.offsetX:0),p.rect.y+(view?.enabled?view.offsetY:0),p.rect.w,p.rect.h);
  model.traverse(o=>{const ms=Array.isArray(o.material)?o.material:o.material?[o.material]:[];for(const m of ms)m.uniforms?.uViewport?.value.set(w,h);});
  R.setRenderTarget(rt);R.clear();R.render(reference,camera);R.readRenderTargetPixels(rt,0,0,w,h,a);
  quad.material=m;R.clear();R.render(quadScene,quadCamera);R.readRenderTargetPixels(rt,0,0,w,h,b);
  let changed=0;for(let n=0;n<a.length;n+=4){let delta=0;for(let k=0;k<4;k++)delta=Math.max(delta,Math.abs(a[n+k]-b[n+k]));if(delta>4)changed++;}
  worstFraction=Math.max(worstFraction,changed/(w*h));totalChanged+=changed;totalPixels+=w*h;
  check('atlas '+i.id+' '+label+' matches original 3D pixels',changed/(w*h)<.005,JSON.stringify({size:[w,h],changed,fraction:changed/(w*h)}));
  reference.remove(model);R.setRenderTarget(old);rt.dispose();
}
for(let pose=0;pose<3;pose++){
 for(const [n,i]of items.entries()){
  const e=i.worldEntry;e.body.setTranslation({x:(n%2-.5)*1.5,y:.4+Math.floor(n/2)*.12,z:-1.5-Math.floor(n/2)*.7+pose*.25},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(pose*.4,n*.3,pose*.2)),false);W.sync(e);
 }
 site.meshPictures.flush();
 for(const i of items)compare(i,'pose '+pose);
}
// A box may contain a selected splat. That custom shader uses the tile's
// physical viewport, not the dimensions of the enclosing atlas texture.
const box=keepsakes.get('box'),top=keepsakes.give('top');await top.worldTask;
await E.box.setOpen(true);W.park(box.worldEntry);W.park(top.worldEntry);site.supports.detach(top.worldEntry,{wake:false});
box.worldEntry.body.setTranslation({x:0,y:.25,z:-1.5},false);box.worldEntry.body.setRotation(new T.Quaternion(),false);W.sync(box.worldEntry);
top.picture.attach(box.solidArt,box.object,()=>box.picture.invalidate(),{position:[0,.12,0],quaternion:[0,0,0,1]});box.picture.draw(true);site.meshPictures.flush();
compare(box,'with contained selected splat');
top.picture.detach();box.picture.invalidate();box.picture.draw(true);site.meshPictures.flush();compare(box,'after contained splat leaves');

quad.geometry.dispose();note('atlas full-resolution parity',JSON.stringify({worstFraction,totalChanged,totalPixels,allocation:site.meshPictures.stats}));
