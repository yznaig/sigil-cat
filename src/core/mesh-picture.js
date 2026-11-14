import {worldPresentation} from './world-presentation.js';
import {createAtlasPicture} from './mesh-atlas.js';
// A lit 3D model, cached in display colours. Use forPicture() on its materials.
// The body root has real pick geometry; the picture only avoids idle lighting work.
export function createMeshPicture(site,root,visual,vertices,{batch:batchComposite=false}={}) {
 if(visual.isMesh||batchComposite)return createAtlasPicture(site,root,visual,vertices);
 const {THREE:T,stage}=site,R=stage.renderer,scene=new T.Scene(),camera=stage.camera.clone();
 for(const child of stage.scene.children)if(child.isLight)scene.add(child.clone());
 scene.environment=stage.scene.environment;scene.environmentIntensity=stage.scene.environmentIntensity;
 const model=new T.Group();model.add(visual);scene.add(model);model.matrixAutoUpdate=false;
 const rt=new T.WebGLRenderTarget(4,4,{depthBuffer:true}),rect={x:0,y:0,w:1,h:1},stats={draws:0,ms:0};
 const region=new T.Vector4(1,1,0,0);
 const material=new T.ShaderMaterial({uniforms:{map:{value:rt.texture},region:{value:region}},transparent:true,depthTest:false,depthWrite:false,
  vertexShader:'uniform vec4 region;varying vec2 v;void main(){v=uv*region.xy+region.zw;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform sampler2D map;varying vec2 v;void main(){gl_FragColor=texture2D(map,v);}',
  blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor});
 const plane=new T.Mesh(new T.PlaneGeometry(1,1),material),card=new T.Group();card.add(plane);stage.scene.add(card);card.visible=false;plane.frustumCulled=false;let near=null;const batch=worldPresentation(site).picture(card,plane,{near:()=>near});
 const boundsCentre=new T.Box3().setFromPoints(vertices).getCenter(new T.Vector3());
 const radius=Math.sqrt(Math.max(...vertices.map(v=>v.distanceToSquared(boundsCentre))));let invalid=true,attachment=null;
 const pose=new T.Matrix4(),viewMatrix=new T.Matrix4(),projection=new T.Matrix4(),point=new T.Vector3(),screenPoint={};
 let lastWidth=0,lastHeight=0,lastDpr=0,lastVisible;
 function bounds(){
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  near=1;for(const p of vertices){stage.toScreen(point.copy(p).applyMatrix4(root.matrixWorld),screenPoint);left=Math.min(left,screenPoint.x);top=Math.min(top,screenPoint.y);right=Math.max(right,screenPoint.x);bottom=Math.max(bottom,screenPoint.y);near=Math.min(near,point.project(stage.camera).z*.5+.5);}
  near=Math.max(0,near);
  const x=Math.floor(left)-4,y=Math.floor(top)-4;
  Object.assign(rect,{x,y,w:Math.max(2,Math.ceil(right)-x+4),h:Math.max(2,Math.ceil(bottom)-y+4)});
 }
 function draw(force=false){
  root.updateWorldMatrix(true,false);
  if(!force&&!invalid&&pose.equals(root.matrixWorld)&&viewMatrix.equals(stage.camera.matrixWorld)&&projection.equals(stage.camera.projectionMatrix)&&lastWidth===stage.width&&lastHeight===stage.height&&lastDpr===stage.dpr&&lastVisible===root.visible)return;
  invalid=false;pose.copy(root.matrixWorld);viewMatrix.copy(stage.camera.matrixWorld);projection.copy(stage.camera.projectionMatrix);lastWidth=stage.width;lastHeight=stage.height;lastDpr=stage.dpr;lastVisible=root.visible;
  const begin=performance.now();bounds();
  if(attachment){
   attachment.frame.updateWorldMatrix(true,false);if(attachment.localPose)visual.matrix.compose(new T.Vector3(...attachment.localPose.position),new T.Quaternion(...attachment.localPose.quaternion),new T.Vector3(1,1,1));else visual.matrix.copy(attachment.frame.matrixWorld).invert().multiply(root.matrixWorld);visual.matrixAutoUpdate=false;visual.updateMatrixWorld(true);card.visible=false;attachment.invalidate();return;
  }
  card.visible=root.visible&&rect.w<stage.width*3&&rect.h<stage.height*3;if(!card.visible)return;
  scene.environment=stage.scene.environment;model.matrix.copy(root.matrixWorld);model.updateMatrixWorld(true);
  const p=new T.Vector3().setFromMatrixPosition(root.matrixWorld),s=stage.toScreen(p),ppu=stage.pxPerUnit(p);
  card.position.copy(p);card.quaternion.copy(stage.camera.quaternion);plane.position.set((rect.x+rect.w/2-s.x)/ppu,-(rect.y+rect.h/2-s.y)/ppu,0);plane.scale.set(rect.w/ppu,rect.h/ppu,1);
  plane.renderOrder=root.userData.pictureOrder=500-p.distanceTo(stage.camera.position)*10;
  camera.copy(stage.camera);const view=stage.camera.view;camera.setViewOffset(stage.width,stage.height,rect.x+(view?.enabled?view.offsetX:0),rect.y+(view?.enabled?view.offsetY:0),rect.w,rect.h);
  // Keep capacity through a tumble. Shrinking/reallocating two textures and
  // framebuffers on each 32px bounds crossing causes driver stalls.
  const capacity=Math.ceil(Math.max(rect.w,rect.h,radius*2*ppu+8)*stage.dpr/32)*32;
  if(rt.width<capacity||rt.height<capacity)rt.setSize(capacity,capacity);
  const w=Math.ceil(rect.w*stage.dpr/32)*32,h=Math.ceil(rect.h*stage.dpr/32)*32;
  rt.viewport.set(0,0,w,h);rt.scissor.copy(rt.viewport);rt.scissorTest=true;region.set(w/rt.width,h/rt.height,0,0);
  const old=R.getRenderTarget();R.setRenderTarget(rt);R.clear();R.render(scene,camera);R.setRenderTarget(old);stats.draws++;stats.ms=performance.now()-begin;batch.invalidate();
 }
 function attach(parent,frame,invalidate,localPose=null){
  if(attachment?.parent!==parent){parent.add(visual);attachment={parent,frame,invalidate,localPose};}
  attachment.localPose=localPose;invalid=true;draw();
 }
 function detach(){
  if(!attachment)return;const old=attachment;attachment=null;model.add(visual);visual.traverse(o=>o.layers.set(0));visual.matrixAutoUpdate=true;visual.position.set(0,0,0);visual.quaternion.identity();visual.scale.setScalar(1);visual.updateMatrix();old.invalidate();invalid=true;draw();
 }
 const adapter={card,visual,scene,model,draw,rect,stats,attach,detach,invalidate(){invalid=true;},
  // drawn with another page camera than the current one (world-presentation.js redraws it once the camera settles)
  get stale(){return !viewMatrix.equals(stage.camera.matrixWorld)||!projection.equals(stage.camera.projectionMatrix);},
  // A bounded presentation move (the rack's arrival) shifts the drawn card only, without re-lighting it.
  invalidateCard(){batch.invalidate();},get attached(){return !!attachment;},dispose(){untrack();detach();batch.dispose();stage.scene.remove(card);rt.dispose();plane.geometry.dispose();material.dispose();}};
 const untrack=worldPresentation(site).track(adapter);return adapter;
}
