import {worldPresentation} from './world-presentation.js';
import {pictureScale,still,MOTION} from './picture-motion.js';
// One light pass for all dirty loose meshes. Identical geometry/materials share
// an InstancedMesh; atlas tiles keep sleeping pictures without redrawing them.
// Attached art remains real geometry inside the support's existing picture.
// Speed lane (e1112-59): the atlas, made ahead so its programs can be warmed at boot (src/core/warm-shared.js).
export function meshAtlas(site){return site.meshPictures??=createAtlas(site);}
export function createAtlasPicture(site,root,visual,vertices){
 const A=site.meshPictures??=createAtlas(site);return A.add(root,visual,vertices);
}
function createAtlas(site){
 const {THREE:T,stage}=site,R=stage.renderer,scene=new T.Scene(),camera=stage.camera.clone();
 for(const o of stage.scene.children)if(o.isLight)scene.add(o.clone());
 const limit=128,groups=new Map(),pictures=new Set(),dirty=new Set(),free=[],quadGeometry=new T.PlaneGeometry(1,1);
 // Its depth is kept as a texture: the main pass composites the pictures by it (world-presentation.js, playtest-2).
 const rt=new T.WebGLRenderTarget(64,64,{depthBuffer:true,depthTexture:new T.DepthTexture(64,64)}),stats={passes:0,draws:0,growths:0,texturePixels:4096,tile:64,prepMs:0,renderMs:0,fallbackMs:0,fallbacks:0,calls:0};
 let nextSlot=0,width=64,height=64,flushing=false,relaying=0,trace=null;
 const clearGeometry=quadGeometry.clone(),clearRegions=new T.InstancedBufferAttribute(new Float32Array(limit*4),4);
 clearGeometry.setAttribute('region',clearRegions);
 const clearMaterial=new T.ShaderMaterial({depthTest:true,depthWrite:true,depthFunc:T.AlwaysDepth,blending:T.NoBlending,
  vertexShader:'attribute vec4 region;void main(){gl_Position=vec4(position.xy*region.xy+region.zw,1.,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(0.);}'});
 const clear=new T.InstancedMesh(clearGeometry,clearMaterial,limit);clear.frustumCulled=false;clear.renderOrder=-1000;scene.add(clear);
 const transform=new T.Matrix4();
 function groupFor(visual){
  const materials=Array.isArray(visual.material)?visual.material:[visual.material],key=visual.geometry.uuid+materials.map(m=>m.uuid).join('/');
  if(groups.has(key))return groups.get(key);
  const geometry=visual.geometry.clone(),regions=new T.InstancedBufferAttribute(new Float32Array(limit*4),4),tiles=new T.InstancedBufferAttribute(new Float32Array(limit*4),4);geometry.setAttribute('region',regions);geometry.setAttribute('tile',tiles);tiles.setUsage(T.DynamicDrawUsage);
  const clones=materials.map(source=>{const m=source.clone(),prior=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source);
   m.onBeforeCompile=(s,r)=>{prior.call(source,s,r);s.vertexShader='attribute vec4 region;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ngl_Position.xy=gl_Position.xy*region.xy+gl_Position.w*region.zw;vAtlasTile=tile;');
    // Each instance paints only inside its own tile (box-open stray pictures fix, 2026-11-13): art that reaches past its
    // picture's screen box (a lid swung open, a part a body grew) is cut at its own picture's edge, never drawn into a
    // neighbour's cached picture, which would keep it until that neighbour next moved. tile = its tile in atlas pixels.
    s.vertexShader='attribute vec4 tile;\nvarying vec4 vAtlasTile;\n'+s.vertexShader;
    s.fragmentShader='varying vec4 vAtlasTile;\n'+s.fragmentShader.replace(/void main\(\)\s*\{/,m=>m+'\nif(any(lessThan(gl_FragCoord.xy,vAtlasTile.xy))||any(greaterThanEqual(gl_FragCoord.xy,vAtlasTile.zw)))discard;');};
   m.customProgramCacheKey=()=>key()+':world-atlas';return m;});
  const mesh=new T.InstancedMesh(geometry,Array.isArray(visual.material)?clones:clones[0],limit);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);regions.setUsage(T.DynamicDrawUsage);mesh.count=0;scene.add(mesh);
  const g={mesh,regions,tiles,clones,users:0};groups.set(key,g);g.key=key;return g;
 }
 // Pack each picture at its own full-resolution capacity. A large box must
 // not allocate a box-sized tile for every button-sized hat or ingredient.
 function layout(p,capacity){
  if(p.capacity>=capacity&&p.region)return;p.capacity=Math.max(p.capacity,capacity);
  const list=[...pictures].sort((a,b)=>b.capacity-a.capacity||a.slot-b.slot);
  const area=list.reduce((sum,i)=>sum+i.capacity*i.capacity,0),largest=Math.max(...list.map(i=>i.capacity));
  function pack(w){let x=0,y=0,row=0;const placements=[];
   for(const i of list){if(x+i.capacity>w){x=0;y+=row;row=0;}placements.push({x,y,size:i.capacity});x+=i.capacity;row=Math.max(row,i.capacity);}
   return {w,h:y+row,placements};
  }
  let best=width>=largest?pack(width):null;
  if(best&&best.h<=height)best.h=height;
  else{
   best=null;const maximum=Math.ceil(Math.sqrt(area)/64)*64+largest;
   for(let w=largest;w<=maximum;w+=64){const candidate=pack(w),score=candidate.w*candidate.h+area*.05*Math.abs(Math.log(candidate.w/candidate.h));if(!best||score<best.score)best={...candidate,score};}
  }
  if(best.w!==width||best.h!==height){width=best.w;height=best.h;rt.setSize(width,height);stats.growths++;stats.texturePixels=width*height;}
  const placements=best.placements;
  stats.tile=Math.max(...list.map(i=>i.capacity));
  // A re-pack redraws every shown picture into its new tile. One whose last draw was made with another page camera (the
  // rise's wide lens: visual lane, playtest-3, img7) is drawn again in full, not just re-rendered: its screen box and
  // card are that camera's, and rendering it with this one through that box put it outside its own tile (the
  // recycling bin went blank, the bucket was cut off). The rest keep the cheap re-render.
  const redo=[];
  for(let n=0;n<list.length;n++){
   const i=list[n];i.region=placements[n];const r=i.region;
   i.uv.set(i.renderWidth/width,i.renderHeight/height,r.x/width,r.y/height);
   if(!i.attached&&i.card.visible){if(i!==p&&i.stale)redo.push(i);else dirty.add(i);}
  }
  for(const i of redo){i.invalidate();relaying++;try{i.draw();}finally{relaying--;}}
 }
 function flush(){
  if(!dirty.size||flushing)return;flushing=true;const t0=performance.now();
  scene.environment=stage.scene.environment;scene.environmentIntensity=stage.scene.environmentIntensity;camera.copy(stage.camera);
  for(const g of groups.values())g.mesh.count=0;clear.count=0;
  const fallback=[];
  for(const p of dirty){
   if(p.attached||!p.card.visible)continue;
   const region=p.region,x=region.x/width,y=region.y/height,w=p.renderWidth/width,h=p.renderHeight/height,rect=p.rect;
   clearRegions.setXYZW(clear.count++,2*w,2*h,2*x+w-1,2*y+h-1);trace?.push([region.x,region.y,region.x+p.renderWidth,region.y+p.renderHeight]);
   p.model.matrixAutoUpdate=false;p.model.matrix.copy(p.root.matrixWorld);p.model.updateMatrixWorld(true);
   const parts=[];let custom=false;
   p.visual.traverseVisible(o=>{if(o.isMesh){parts.push(o);const ms=Array.isArray(o.material)?o.material:[o.material];if(o.geometry.isInstancedBufferGeometry||ms.some(m=>m.isShaderMaterial))custom=true;}else if(o.isSprite||o.isLight)custom=true;});
   // Arbitrary contained splats/custom art retain the ordinary renderer path.
   // Its viewport is this picture's tile; it cannot paint a neighbour's cache.
   if(custom)fallback.push(p);
   else for(const part of parts){
    const g=groupFor(part);if(!p.usedGroups.has(g)){p.usedGroups.add(g);g.users++;}
    const n=g.mesh.count++;
    g.regions.setXYZW(n,stage.width/rect.w*w,stage.height/rect.h*h,
     (stage.width-2*rect.x)/rect.w*w+2*x-1,
     (2*(rect.y+rect.h)-stage.height)/rect.h*h+2*y-1);
    g.tiles.setXYZW(n,region.x,region.y,region.x+p.renderWidth,region.y+p.renderHeight);
    g.mesh.setMatrixAt(n,part.matrixWorld);
   }
   p.stats.draws++;stats.draws++;
  }
  clearRegions.clearUpdateRanges();clearRegions.addUpdateRange(0,clear.count*4);clearRegions.needsUpdate=true;
  // A group with nothing to draw this pass is skipped outright (three still binds its program for count 0).
  // Upload only the instances written this pass (three otherwise sends all 128 slots of every group each frame).
  for(const g of groups.values()){g.mesh.visible=g.mesh.count>0;if(g.mesh.count){const n=g.mesh.count;g.regions.clearUpdateRanges();g.regions.addUpdateRange(0,n*4);g.regions.needsUpdate=true;g.tiles.clearUpdateRanges();g.tiles.addUpdateRange(0,n*4);g.tiles.needsUpdate=true;g.mesh.instanceMatrix.clearUpdateRanges();g.mesh.instanceMatrix.addUpdateRange(0,n*16);g.mesh.instanceMatrix.needsUpdate=true;}}
  const t1=performance.now();const old=R.getRenderTarget(),auto=R.autoClear;R.autoClear=false;R.setRenderTarget(rt);const c0=R.info.render.calls;R.render(scene,camera);stats.calls+=R.info.render.calls-c0;const t2=performance.now();
  for(const p of fallback){
   if(!p.fallback){p.fallback=new T.Scene();for(const o of stage.scene.children)if(o.isLight)p.fallback.add(o.clone());p.fallback.add(p.model);}
   p.fallback.environment=stage.scene.environment;p.fallback.environmentIntensity=stage.scene.environmentIntensity;
   const r=p.region,rect=p.rect,view=stage.camera.view;camera.copy(stage.camera);camera.setViewOffset(stage.width,stage.height,rect.x+(view?.enabled?view.offsetX:0),rect.y+(view?.enabled?view.offsetY:0),rect.w,rect.h);
   rt.viewport.set(r.x,r.y,p.renderWidth,p.renderHeight);rt.scissor.copy(rt.viewport);rt.scissorTest=true;R.setRenderTarget(rt);R.render(p.fallback,camera);
  }
  rt.viewport.set(0,0,width,height);rt.scissor.copy(rt.viewport);rt.scissorTest=false;R.setRenderTarget(old);R.autoClear=auto;
  stats.passes++;dirty.clear();flushing=false;const t3=performance.now();stats.prepMs+=t1-t0;stats.renderMs+=t2-t1;stats.fallbackMs+=t3-t2;stats.fallbacks+=fallback.length;
 }
 function add(root,visual,vertices){
  const slot=free.length?free.pop():nextSlot++;if(slot>=limit)throw Error('World mesh atlas capacity exceeded');
  const usedGroups=new Set();
  const uv=new T.Vector4(),mat=new T.ShaderMaterial({uniforms:{map:{value:rt.texture},region:{value:uv}},transparent:true,depthTest:false,depthWrite:false,
   vertexShader:'uniform vec4 region;varying vec2 v;void main(){v=uv*region.xy+region.zw;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform sampler2D map;varying vec2 v;void main(){gl_FragColor=texture2D(map,v);}',
   blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor});
  const plane=new T.Mesh(quadGeometry,mat),card=new T.Group();card.add(plane);stage.scene.add(card);plane.frustumCulled=false;card.visible=false;const batch=worldPresentation(site).picture(card,plane,{depthMap:rt.depthTexture});let untrack=null;
  const model=new T.Group();model.add(visual);const rect={x:0,y:0,w:1,h:1},stats={draws:0,ms:0},cache=new T.Matrix4(),view=new T.Matrix4(),projection=new T.Matrix4();
  const point=new T.Vector3(),centre=new T.Vector3(),screen={},centreScreen={},unit=new T.Vector3(1,1,1),localQ=new T.Quaternion();
  // A foot/hinge origin is not the centre of the geometry. Using distance from
  // that origin doubled long props' reserve and inflated every atlas tile.
  const boundsCentre=new T.Box3().setFromPoints(vertices).getCenter(new T.Vector3());
  const mvp=new T.Matrix4();
  const radius=Math.sqrt(Math.max(...vertices.map(v=>v.distanceToSquared(boundsCentre))));let attachment=null,invalid=true,lastWidth=0,lastHeight=0,lastDpr=0,lastVisible,precise=true,reduced=false,stillSince=null;
  function draw(force=false){
   root.updateWorldMatrix(true,false);
   if(!root.visible){card.visible=false;dirty.delete(p);}
   // A picture drawn lighter while moving (picture-motion.js) is redrawn sharp once the body has held still a moment.
   const now=performance.now();if(still(cache,root.matrixWorld))stillSince??=now;else stillSince=null;const settled=stillSince!==null&&now-stillSince>=MOTION.stillMs;
   if(!force&&!invalid&&!(reduced&&settled)&&cache.equals(root.matrixWorld)&&view.equals(stage.camera.matrixWorld)&&projection.equals(stage.camera.projectionMatrix)&&lastWidth===stage.width&&lastHeight===stage.height&&lastDpr===stage.dpr&&lastVisible===root.visible)return;
   invalid=false;cache.copy(root.matrixWorld);view.copy(stage.camera.matrixWorld);projection.copy(stage.camera.projectionMatrix);lastWidth=stage.width;lastHeight=stage.height;lastDpr=stage.dpr;lastVisible=root.visible;
   // Hidden stored cards still need current hit/save bounds after a layout event.
   // Visibility skips rendering below, not the physical-to-screen pose sync.
   let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
   // stage.toScreen per vertex, folded into one clip matrix (same projection).
   // The points are read live on every draw (box-open stray pictures fix, 2026-11-13). They were copied once and copied
   // again only when their number changed, but the box swaps its lid's points in place as the lid swings
   // (gags/box.js setLidCollider: same array, same count): its screen box stayed the shut box's, the open lid fell
   // outside its own tile and was painted over its neighbours' tiles (Aaron's img10: cardboard under the flour).
   const camera=stage.camera,e=mvp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(root.matrixWorld).elements,W=stage.width/2,H=stage.height/2;
   for(let n=0;n<vertices.length;n++){
    const v=vertices[n],vx=v.x,vy=v.y,vz=v.z,w=e[3]*vx+e[7]*vy+e[11]*vz+e[15];
    const sx=((e[0]*vx+e[4]*vy+e[8]*vz+e[12])/w+1)*W,sy=(1-(e[1]*vx+e[5]*vy+e[9]*vz+e[13])/w)*H;
    if(sx<x)x=sx;if(sy<y)y=sy;if(sx>right)right=sx;if(sy>bottom)bottom=sy;
   }
   rect.x=Math.floor(x)-4;rect.y=Math.floor(y)-4;rect.w=Math.max(2,Math.ceil(right)-rect.x+4);rect.h=Math.max(2,Math.ceil(bottom)-rect.y+4);
   if(attachment){
    attachment.frame.updateWorldMatrix(true,false);
    if(attachment.localPose)visual.matrix.compose(point.fromArray(attachment.localPose.position),localQ.fromArray(attachment.localPose.quaternion),unit);else visual.matrix.copy(attachment.frame.matrixWorld).invert().multiply(root.matrixWorld);
    visual.matrixAutoUpdate=false;visual.updateMatrixWorld(true);card.visible=false;reduced=false;dirty.delete(p);attachment.invalidate();return;
   }
   card.visible=root.visible&&rect.w<stage.width*3&&rect.h<stage.height*3;if(!card.visible){reduced=false;dirty.delete(p);return;}
   centre.setFromMatrixPosition(root.matrixWorld);stage.toScreen(centre,centreScreen);const ppu=stage.pxPerUnit(centre);
   card.position.copy(centre);card.quaternion.copy(stage.camera.quaternion);plane.position.set((rect.x+rect.w/2-centreScreen.x)/ppu,-(rect.y+rect.h/2-centreScreen.y)/ppu,0);plane.scale.set(rect.w/ppu,rect.h/ppu,1);
   plane.renderOrder=root.userData.pictureOrder=500-centre.distanceTo(stage.camera.position)*10;
   const k=pictureScale(stage,precise||settled);reduced=k<stage.dpr;p.renderWidth=Math.ceil(rect.w*k/32)*32;p.renderHeight=Math.ceil(rect.h*k/32)*32;
   layout(p,Math.ceil(Math.max(rect.w,rect.h,2*radius*ppu+8)*stage.dpr/64)*64);
   uv.set(p.renderWidth/width,p.renderHeight/height,p.region.x/width,p.region.y/height);
   dirty.add(p);if(!site.world.syncing&&!site.worldPresentation?.batching&&!relaying)flush();batch.invalidate();
  }
  function attach(parent,frame,invalidate,localPose=null){parent.add(visual);attachment={parent,frame,invalidate,localPose};invalid=true;draw();}
  function detach(){if(!attachment)return;const old=attachment;attachment=null;model.add(visual);visual.traverse(o=>o.layers.set(0));visual.matrixAutoUpdate=true;visual.position.set(0,0,0);visual.quaternion.identity();visual.scale.setScalar(1);visual.updateMatrix();old.invalidate();invalid=true;draw();}
  const p={slot,capacity:64,renderWidth:64,renderHeight:64,region:null,usedGroups,uv,root,visual,card,model,rect,stats,draw,attach,detach,invalidate(){invalid=true;},
   // drawn with another page camera than the current one (world-presentation.js redraws it once the camera settles)
   get stale(){return !view.equals(stage.camera.matrixWorld)||!projection.equals(stage.camera.projectionMatrix);},
   get precise(){return precise;},set precise(v){v=!!v;if(v&&!precise&&reduced)invalid=true;precise=v;},
   // The atlas draws clones of the source materials: a material state change (the bulb's glow) must reach both.
   get materials(){return [...usedGroups].flatMap(g=>g.clones);},get attached(){return !!attachment;},dispose(){
   // Remove attached art directly: no needless last render while disposing.
   if(attachment){visual.removeFromParent();attachment.invalidate();attachment=null;}
   untrack();batch.dispose();pictures.delete(p);dirty.delete(p);free.push(slot);card.removeFromParent();mat.dispose();
   for(const group of usedGroups){group.users--;if(!group.users){group.mesh.removeFromParent();group.mesh.geometry.dispose();group.mesh.dispose();for(const m of group.clones)m.dispose();groups.delete(group.key);}}
   model.removeFromParent();
  }};pictures.add(p);untrack=worldPresentation(site).track(p);return p;
 }
 // Speed lane (e1112-59): the first item drawn into the atlas built the clear program and its material's atlas variant
 // live (the end of Butterman's first play stopped for ~0.1 s). warm(materials): compile them in the background, then
 // draw the clear quad and one one-pixel tile per material into the atlas, once, off screen. Their (empty) groups stay,
 // so the programs stay alive for the real items that share them.
 async function warm(materials){
  await stage.ensureEnv();scene.environment=stage.scene.environment;scene.environmentIntensity=stage.scene.environmentIntensity;camera.copy(stage.camera);
  const geometry=new T.PlaneGeometry(1,1),mine=materials.map(m=>groupFor(new T.Mesh(geometry,m))),px=[2/width,2/height,1/width-1,1/height-1];
  for(const g of groups.values())g.mesh.visible=false;
  for(const g of mine){g.mesh.count=1;g.mesh.visible=true;g.regions.setXYZW(0,1e-4,1e-4,px[2],px[3]);g.regions.needsUpdate=true;g.mesh.setMatrixAt(0,new T.Matrix4());g.mesh.instanceMatrix.needsUpdate=true;}
  clear.count=1;clearRegions.setXYZW(0,...px);clearRegions.needsUpdate=true;
  try{await R.compileAsync(scene,camera);await new Promise(r=>requestAnimationFrame(r));
   if(flushing||dirty.size)return;      // a real item got here first: it builds them itself
   const old=R.getRenderTarget(),auto=R.autoClear;R.autoClear=false;R.setRenderTarget(rt);R.render(scene,camera);R.setRenderTarget(old);R.autoClear=auto;
  }finally{for(const g of mine){g.mesh.count=0;g.mesh.visible=false;}clear.count=0;}
 }
 return {add,flush,stats,warm,get pending(){return dirty.size;},
  // Read-only, for checks (box-open stray pictures fix, 2026-11-13: checks/box-open-tiles.js reads the atlas back).
  get target(){return rt;},get list(){return [...pictures];},
  // trace: an array set by a check; every tile a pass draws into is pushed to it as [x0,y0,x1,y1] in atlas pixels
  get trace(){return trace;},set trace(v){trace=v;}};
}
