import {worldPresentation} from './world-presentation.js';
import {makeSplatMesh} from './splats.js';
import {pictureScale,splatShare,still,MOTION} from './picture-motion.js';
// One cached picture per prop; redrawn only by a body sync or viewport change.
export const SORT={loose:.07,hard:.21,exact:.002,perFrame:1};
// The picture's box is projected from `bounds` (the collider's hull points). A splat's own Gaussians reach past its
// collider in places (the controller's grips rise above it), and its picture cut them off in a straight edge along the
// card's border (visual lane, playtest-3, "border lines"). So the bounds also take the splat's outermost centres along
// 13 axes (once, when the prop is made: ~1-2 ms for a 66k-splat prop); the margin round the box covers the
// Gaussians' own spread.
export function splatExtremes(T,data,scale,offset){
 const c=data.center,n=data.count;if(!c||!n)return [];
 // 13 axes: x, y, z, x±y, x±z, y±z, x+y±z, x-y±z. Unrolled (a generic loop over the axes cost ~8 ms a prop).
 const lo=new Float64Array(13).fill(Infinity),hi=new Float64Array(13).fill(-Infinity),li=new Int32Array(13),hj=new Int32Array(13);
 for(let i=0,k=0;i<n;i++,k+=3){const x=c[k],y=c[k+1],z=c[k+2],a=x+y,b=x-y;
  const v0=x,v1=y,v2=z,v3=a,v4=b,v5=x+z,v6=x-z,v7=y+z,v8=y-z,v9=a+z,v10=a-z,v11=b+z,v12=b-z;
  if(v0<lo[0]){lo[0]=v0;li[0]=i;}if(v0>hi[0]){hi[0]=v0;hj[0]=i;}if(v1<lo[1]){lo[1]=v1;li[1]=i;}if(v1>hi[1]){hi[1]=v1;hj[1]=i;}
  if(v2<lo[2]){lo[2]=v2;li[2]=i;}if(v2>hi[2]){hi[2]=v2;hj[2]=i;}if(v3<lo[3]){lo[3]=v3;li[3]=i;}if(v3>hi[3]){hi[3]=v3;hj[3]=i;}
  if(v4<lo[4]){lo[4]=v4;li[4]=i;}if(v4>hi[4]){hi[4]=v4;hj[4]=i;}if(v5<lo[5]){lo[5]=v5;li[5]=i;}if(v5>hi[5]){hi[5]=v5;hj[5]=i;}
  if(v6<lo[6]){lo[6]=v6;li[6]=i;}if(v6>hi[6]){hi[6]=v6;hj[6]=i;}if(v7<lo[7]){lo[7]=v7;li[7]=i;}if(v7>hi[7]){hi[7]=v7;hj[7]=i;}
  if(v8<lo[8]){lo[8]=v8;li[8]=i;}if(v8>hi[8]){hi[8]=v8;hj[8]=i;}if(v9<lo[9]){lo[9]=v9;li[9]=i;}if(v9>hi[9]){hi[9]=v9;hj[9]=i;}
  if(v10<lo[10]){lo[10]=v10;li[10]=i;}if(v10>hi[10]){hi[10]=v10;hj[10]=i;}if(v11<lo[11]){lo[11]=v11;li[11]=i;}if(v11>hi[11]){hi[11]=v11;hj[11]=i;}
  if(v12<lo[12]){lo[12]=v12;li[12]=i;}if(v12>hi[12]){hi[12]=v12;hj[12]=i;}}
 const out=[];for(const i of new Set([...li,...hj]))out.push(new T.Vector3(c[i*3],c[i*3+1],c[i*3+2]).multiplyScalar(scale).add(offset));return out;
}
export function createPropPicture(site,root,data,scale,offset,colliderBounds){
 const {THREE:T,stage}=site,R=stage.renderer,scene=new T.Scene(),model=new T.Group(),mesh=makeSplatMesh(data);
 // The splat's extremes are found in an idle moment after the prop is made (a few ms), then the picture redraws.
 const bounds=[...colliderBounds];let disposed=false;
 (window.requestIdleCallback??(f=>setTimeout(f,50)))(()=>{if(disposed)return;const t=performance.now();bounds.push(...splatExtremes(T,data,scale,offset));stats.boundsMs=performance.now()-t;invalid=true;const e=[...(site.world?.entries?.values()??[])].find(x=>x.presentation===adapter);if(e?.sync&&!e.timer)site.world.sync(e);else draw();},{timeout:2000});
 mesh.scale.setScalar(scale);mesh.position.copy(offset);model.add(mesh);scene.add(model);
 const camera=stage.camera.clone(),rt=new T.WebGLRenderTarget(4,4,{depthBuffer:false});
 const region=new T.Vector4(1,1,0,0);
 const sprite=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({uniforms:{map:{value:rt.texture},region:{value:region}},transparent:true,depthTest:false,depthWrite:false,
 blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor,
 vertexShader:'uniform vec4 region;varying vec2 v;void main(){v=uv*region.xy+region.zw;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D map;varying vec2 v;void main(){gl_FragColor=texture2D(map,v);}'}));
 sprite.frustumCulled=false;sprite.renderOrder=100;const card=new T.Group();card.add(sprite);stage.scene.add(card);card.visible=false;let near=null;const batch=worldPresentation(site).picture(card,sprite,{near:()=>near});
 const stats={draws:0,sortMs:0,pictureMs:0,sorts:0,skips:0,requests:0,asyncSorts:0,boundsMs:null},rect={x:0,y:0,w:1,h:1};let invalid=true,attachment=null,precise=true,stale=0,reduced=false;
 const pose=new T.Matrix4(),viewMatrix=new T.Matrix4(),projection=new T.Matrix4(),point=new T.Vector3(),screenPoint={};
 let lastWidth=0,lastHeight=0,lastDpr=0,lastVisible,stillSince=null;
 function draw(force=false){
  root.updateMatrixWorld(true);
  // A picture drawn lighter while moving (picture-motion.js) is redrawn sharp once the body has held still a moment.
  const now=performance.now();if(still(pose,root.matrixWorld))stillSince??=now;else stillSince=null;const settled=stillSince!==null&&now-stillSince>=MOTION.stillMs;
  if(!force&&!invalid&&!(reduced&&settled)&&pose.equals(root.matrixWorld)&&viewMatrix.equals(stage.camera.matrixWorld)&&projection.equals(stage.camera.projectionMatrix)&&lastWidth===stage.width&&lastHeight===stage.height&&lastDpr===stage.dpr&&lastVisible===root.visible)return;
  invalid=false;pose.copy(root.matrixWorld);viewMatrix.copy(stage.camera.matrixWorld);projection.copy(stage.camera.projectionMatrix);lastWidth=stage.width;lastHeight=stage.height;lastDpr=stage.dpr;lastVisible=root.visible;
  const start=performance.now();let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  near=1;for(const p of bounds){stage.toScreen(point.copy(p).applyMatrix4(root.matrixWorld),screenPoint);left=Math.min(left,screenPoint.x);top=Math.min(top,screenPoint.y);right=Math.max(right,screenPoint.x);bottom=Math.max(bottom,screenPoint.y);near=Math.min(near,point.project(stage.camera).z*.5+.5);}
  near=Math.max(0,near);
  const x=Math.floor(left)-5,y=Math.floor(top)-5;
  Object.assign(rect,{x,y,w:Math.max(2,Math.ceil(right)-x+5),h:Math.max(2,Math.ceil(bottom)-y+5)});
  if(rect.w>stage.width*3||rect.h>stage.height*3){card.visible=false;reduced=false;return;}card.visible=root.visible;
  if(attachment){
   attachment.frame.updateWorldMatrix(true,false);model.matrixAutoUpdate=false;
   if(attachment.localPose)model.matrix.compose(new T.Vector3(...attachment.localPose.position),new T.Quaternion(...attachment.localPose.quaternion),new T.Vector3(1,1,1));
   else model.matrix.copy(attachment.frame.matrixWorld).invert().multiply(root.matrixWorld);
   model.updateWorldMatrix(true,true);mesh.setLod(1);mesh.sortFor(stage.camera);card.visible=false;reduced=false;attachment.invalidate();return;
  }
  const p=root.position,screen=stage.toScreen(p),ppu=stage.pxPerUnit(p);sprite.renderOrder=root.userData.pictureOrder=500-p.distanceTo(stage.camera.position)*10;card.position.copy(p);card.quaternion.copy(stage.camera.quaternion);
  sprite.position.set((x+rect.w/2-screen.x)/ppu,-(y+rect.h/2-screen.y)/ppu,0);sprite.scale.set(rect.w/ppu,rect.h/ppu,1);
  camera.copy(stage.camera);const view=stage.camera.view;camera.setViewOffset(stage.width,stage.height,x+(view?.enabled?view.offsetX:0),y+(view?.enabled?view.offsetY:0),rect.w,rect.h);
  model.matrixAutoUpdate=false;model.matrix.copy(root.matrixWorld);model.updateMatrixWorld(true);
  // Sorting (physics lane, e1111-58 cost gates). A prop at rest is sorted exactly, here. A tumbling one asks the shared
  // worker for a new order once the eye has swung SORT.loose round it, and keeps drawing its last order until the
  // answer lands (between frames). Without a worker: one prop per world frame sorts here, the rest wait unless they are
  // SORT.hard out of date. Stale order by a few degrees does not show on a prop this size.
  const relod=mesh.setLod(splatShare(stage,precise)),angle=relod?Infinity:mesh.sortAngle(camera);
  stats.sortMs=0;
  if(precise){if(angle>SORT.exact){const t=performance.now();mesh.sortFor(camera,true);stats.sortMs=performance.now()-t;stats.sorts++;}stale=0;}
  else if(angle>SORT.loose){
   if(mesh.sortAsync(camera,()=>{invalid=true;stats.asyncSorts++;})){stats.requests++;stale=angle;}
   else{
    const budget=site.splatSortBudget??={frame:-1,used:0},frame=site.world?.stats.frames??0;
    if(budget.frame!==frame){budget.frame=frame;budget.used=0;}
    if(budget.used<SORT.perFrame||angle>SORT.hard){const t=performance.now();mesh.sortFor(camera,true);stats.sortMs=performance.now()-t;stats.sorts++;budget.used++;stale=0;}else{stats.skips++;stale=angle;}
   }
  }else stale=angle;
  // Retain capacity through a tumble, as the mesh pictures already do. A
  // smaller projected bound changes the camera crop, not texture ownership.
  const k=pictureScale(stage,precise||settled);reduced=k<stage.dpr;const w=Math.ceil(rect.w*k/32)*32,h=Math.ceil(rect.h*k/32)*32;if(rt.width<w||rt.height<h)rt.setSize(Math.max(rt.width,w),Math.max(rt.height,h));
  rt.viewport.set(0,0,w,h);rt.scissor.copy(rt.viewport);rt.scissorTest=true;region.set(w/rt.width,h/rt.height,0,0);
  const old=R.getRenderTarget();R.setRenderTarget(rt);R.clear();R.render(scene,camera);R.setRenderTarget(old);stats.draws++;stats.pictureMs=performance.now()-start;batch.invalidate();
 }
 function attach(parent,frame,invalidate,localPose=null){parent.add(model);attachment={parent,frame,invalidate,localPose};invalid=true;draw();}
 function detach(){if(!attachment)return;const old=attachment;attachment=null;scene.add(model);model.traverse(o=>o.layers.set(0));old.invalidate();invalid=true;draw();}
 const adapter={draw,rect,card,stats,mesh,visual:model,attach,detach,
  // drawn with another page camera than the current one (world-presentation.js redraws it once the camera settles)
  get stale(){return !viewMatrix.equals(stage.camera.matrixWorld)||!projection.equals(stage.camera.projectionMatrix);},
  // precise: the body is at rest; its picture gets an exact sort (one more draw if the last one was approximate).
  get precise(){return precise;},set precise(v){v=!!v;if(v&&!precise&&(stale>SORT.exact||reduced||mesh.lod<1))invalid=true;precise=v;},get attached(){return !!attachment;},invalidate(){invalid=true;},dispose(){disposed=true;untrack();if(attachment){model.removeFromParent();attachment.invalidate();attachment=null;}batch.dispose();stage.scene.remove(card);mesh.dispose();rt.dispose();sprite.geometry.dispose();sprite.material.dispose();}};
 const untrack=worldPresentation(site).track(adapter);return adapter;
}
