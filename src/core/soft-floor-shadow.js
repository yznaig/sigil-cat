// A fixed assembly gets one union silhouette. Blur the mask once per changed
// pose/occupant, so overlapping triangles cannot make dark wireframe outlines.
// The resulting floor quad joins the existing main-pass picture batch.
// Used by the hat rack, the controller stand and the egg cup (src/core/world-layout.js SOFT_SHADOWS), and, cast on the
// wall behind it, by the shelf (softWallShadow below; layout lane, playtest-3, e1113-30).
import {worldPresentation} from './world-presentation.js';
// Fill 2D triangles (flat [x,y, x,y, x,y, ...] in the silhouette's own units) into `mask`, then blur it into `canvas`.
// Returns the padded bounds the canvas covers.
function paintSilhouette(canvas,mask,triangles,bounds,blur){
 let {left,right,near,far}=bounds;const pad=blur*3;left-=pad;right+=pad;near-=pad;far+=pad;
 const w=right-left,h=far-near,scale=384/Math.max(w,h);
 canvas.width=mask.width=Math.max(16,Math.ceil(w*scale));canvas.height=mask.height=Math.max(16,Math.ceil(h*scale));
 const c=mask.getContext('2d');c.fillStyle='#614b33';c.beginPath();
 for(let i=0;i<triangles.length;i+=6){const p=[];for(let j=0;j<6;j+=2)p.push([(triangles[i+j]-left)*scale,(triangles[i+j+1]-near)*scale]);
  if((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0])<0)[p[1],p[2]]=[p[2],p[1]];
  c.moveTo(...p[0]);c.lineTo(...p[1]);c.lineTo(...p[2]);c.closePath();
  // Speed lane (e1112-59): filled 1024 triangles at a time. One path of all ~20k (rack, hats, shade, bulb) took the
  // canvas 0.3-0.7 s to fill, superlinear in its size: the first lamp-on and every hat change froze for that long.
  // Chunked: ~35 ms. The seams between chunks change the blurred shadow by at most 2/255 of its alpha (under 1/255
  // on screen at its .24 opacity).
  if((i/6+1)%1024===0){c.fill();c.beginPath();}
 }c.fill();
 const out=canvas.getContext('2d');out.filter=`blur(${blur*scale}px)`;out.drawImage(mask,0,0);
 return {left,right,near,far,w,h};
}
export function softFloorShadow(site,group,pairs){
 const {THREE:T}=site,canvas=document.createElement('canvas'),mask=document.createElement('canvas');
 const texture=new T.CanvasTexture(canvas);texture.premultiplyAlpha=true;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:.24});
 const quad=new T.Mesh(new T.PlaneGeometry(1,1),material);quad.rotation.x=-Math.PI/2;quad.renderOrder=-5;
 group.add(quad);const batch=worldPresentation(site).picture(group,quad,{depth:'none'}),point=new T.Vector3();
 function update(){
  const triangles=[];let left=Infinity,right=-Infinity,near=Infinity,far=-Infinity;
  for(const [o,m]of pairs){const a=o.geometry.attributes.position,index=o.geometry.index,n=index?.count??a.count;
   for(let i=0;i<n;i++){point.fromBufferAttribute(a,index?index.getX(i):i).applyMatrix4(m.uniforms.sourceMatrix.value);const h=Math.max(0,point.y),x=point.x+.1*h,z=point.z-3.5/3*h;triangles.push(x,z);left=Math.min(left,x);right=Math.max(right,x);near=Math.min(near,z);far=Math.max(far,z);}
  }
  if(!triangles.length)return;
  const b=paintSilhouette(canvas,mask,triangles,{left,right,near,far},.035);texture.needsUpdate=true;
  quad.position.set((b.left+b.right)/2,.001,(b.near+b.far)/2);quad.scale.set(b.w,b.h,1);batch.invalidate();
 }
 return {update,wake(){},get stationary(){return true;},dispose(){batch.dispose();texture.dispose();material.dispose();quad.geometry.dispose();}};
}
// The same soft shadow for a piece hung on the wall (the shelf; Aaron, e1113-30: "it would be nice to have the shelf
// have a shadow aswell. soft n simple, like the hat rack"). Cast by a light from the room's key-light side, above and
// in front (WALL_SHADOW.light; lower than the floor shadows' key light, so the shadow tucks in under the plank instead
// of reaching far down the wall) onto the wall plane behind the piece: its own local z = the back of its
// parts (where the brackets meet the wall). One quad in the piece's frame, painted only when its parts change (paint)
// and moved, not repainted, when the piece moves (place). Nothing per frame.
//   root: the piece's group (local y up, z toward the room); frame: the group its art hangs in, in root's own frame
//   (a mesh picture's visual); parts(): the objects (in frame) whose meshes cast it.
export const WALL_SHADOW={light:[-.35,1.6,3.5],opacity:.18,blur:.03,lift:.0015};
export function softWallShadow(site,root,frame,parts){
 const {THREE:T}=site,C=WALL_SHADOW,canvas=document.createElement('canvas'),mask=document.createElement('canvas');
 const texture=new T.CanvasTexture(canvas);texture.premultiplyAlpha=true;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:C.opacity});
 const card=new T.Group(),quad=new T.Mesh(new T.PlaneGeometry(1,1),material);quad.renderOrder=-5;card.add(quad);card.visible=false;
 const batch=worldPresentation(site).picture(card,quad,{depth:'none'}),point=new T.Vector3(),inverse=new T.Matrix4(),local=new T.Matrix4(),light=new T.Vector3();
 let painted=false,shown=1;
 function paint(){
  root.updateMatrixWorld(true);frame.updateMatrixWorld(true);inverse.copy(frame.matrixWorld).invert();
  // the light in the piece's frame (it turns with the piece, the room's light does not)
  light.set(...C.light).normalize().applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());
  const meshes=[];for(const p of parts())p?.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position)meshes.push(o);});
  let back=Infinity;const pts=[];
  for(const o of meshes){local.multiplyMatrices(inverse,o.matrixWorld);const a=o.geometry.attributes.position,index=o.geometry.index,n=index?.count??a.count,list=new Float32Array(n*3);
   for(let i=0;i<n;i++){point.fromBufferAttribute(a,index?index.getX(i):i).applyMatrix4(local);point.toArray(list,i*3);back=Math.min(back,point.z);}pts.push(list);}
  if(!meshes.length||!(light.z>.05)){card.visible=false;painted=false;return;}
  const triangles=[];let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(const list of pts)for(let i=0;i<list.length;i+=3){const t=(list[i+2]-back)/light.z,x=list[i]-t*light.x,y=-(list[i+1]-t*light.y);triangles.push(x,y);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const b=paintSilhouette(canvas,mask,triangles,{left,right,near:top,far:bottom},C.blur);texture.needsUpdate=true;
  // canvas rows run down the wall (y was negated), so the quad's top edge is the silhouette's top
  quad.position.set((b.left+b.right)/2,-(b.near+b.far)/2,back+C.lift);quad.scale.set(b.w,b.h,1);painted=true;place();
 }
 // Follow the piece (a layout, its arrival slide); `opacity` 0..1 fades it with the piece.
 function place(opacity=shown){
  shown=opacity;if(!painted)return;root.updateMatrixWorld(true);root.matrixWorld.decompose(card.position,card.quaternion,card.scale);
  material.opacity=C.opacity*shown;card.visible=root.visible&&shown>0;card.updateMatrixWorld(true);batch.invalidate();
 }
 return {paint,place,card,quad,get painted(){return painted;},dispose(){batch.dispose();texture.dispose();material.dispose();quad.geometry.dispose();}};
}
