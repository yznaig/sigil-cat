// A fixed assembly gets one union silhouette. Blur the mask once per changed
// pose/occupant, so overlapping triangles cannot make dark wireframe outlines.
// The resulting floor quad joins the existing main-pass picture batch.
// Used by the hat rack, the controller stand and the egg cup (src/core/world-layout.js SOFT_SHADOWS), and, cast from
// high in the air, by the shelf (softHungFloorShadow below; e1113-30, moved to the floor e1116-23).
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
// The same soft shadow for a piece hung high in the air (the shelf; Aaron, e1113-30: "it would be nice to have the shelf
// have a shadow aswell. soft n simple, like the hat rack"). Shelfshadow lane (music round, e1116-23, mock-up option b):
// "the shelfs shadow should appear further back on the floor, more realistically since it is sort of floating mid air".
// It used to fall on a wall plane behind the brackets; no wall is drawn, so it read as a floor just under them. Now it
// is cast onto the floor (y=0) along the room's key light (-.3,3,3.5), the light every floor shadow uses
// (world-presentation.js, softFloorShadow): it lands 1.17 x its height further back and a touch right, and, the shelf
// hanging ~.75-1.2 up, it is blurred wider (HUNG_SHADOW.blur) than the rack's. One floor quad in the world's frame (the
// light does not turn with the piece), painted only when its parts change or the piece is laid out again (paint), moved,
// not repainted, while the piece slides in (place: by the piece's movement cast along the same light). Nothing per frame.
//   root: the piece's group; parts(): the objects whose meshes cast it.
export const HUNG_SHADOW={light:[-.3,3,3.5],blur:.12,opacity:.24};
export function softHungFloorShadow(site,root,parts){
 const {THREE:T}=site,C=HUNG_SHADOW,canvas=document.createElement('canvas'),mask=document.createElement('canvas');
 const texture=new T.CanvasTexture(canvas);texture.premultiplyAlpha=true;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:C.opacity});
 const card=new T.Group(),quad=new T.Mesh(new T.PlaneGeometry(1,1),material);quad.rotation.x=-Math.PI/2;quad.renderOrder=-5;card.add(quad);card.visible=false;
 const batch=worldPresentation(site).picture(card,quad,{depth:'none'}),point=new T.Vector3(),centre=new T.Vector3(),at=new T.Vector3(),move=new T.Vector3();
 const kx=C.light[0]/C.light[1],kz=C.light[2]/C.light[1];
 let painted=false,shown=1;
 function paint(){
  root.updateMatrixWorld(true);const meshes=[];for(const p of parts())p?.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position)meshes.push(o);});
  if(!meshes.length){card.visible=false;painted=false;return;}
  const triangles=[];let left=Infinity,right=-Infinity,near=Infinity,far=-Infinity;
  for(const o of meshes){const a=o.geometry.attributes.position,index=o.geometry.index,n=index?.count??a.count;
   for(let i=0;i<n;i++){point.fromBufferAttribute(a,index?index.getX(i):i).applyMatrix4(o.matrixWorld);const h=Math.max(0,point.y),x=point.x-kx*h,z=point.z-kz*h;triangles.push(x,z);left=Math.min(left,x);right=Math.max(right,x);near=Math.min(near,z);far=Math.max(far,z);}}
  const b=paintSilhouette(canvas,mask,triangles,{left,right,near,far},C.blur);texture.needsUpdate=true;
  centre.set((b.left+b.right)/2,.001,(b.near+b.far)/2);quad.scale.set(b.w,b.h,1);at.copy(root.position);painted=true;place();
 }
 // Follow the piece (its arrival slide); `opacity` 0..1 fades it with the piece.
 function place(opacity=shown){
  shown=opacity;if(!painted)return;root.updateMatrixWorld(true);move.copy(root.position).sub(at);
  card.position.set(centre.x+move.x-kx*move.y,centre.y,centre.z+move.z-kz*move.y);
  material.opacity=C.opacity*shown;card.visible=root.visible&&shown>0;card.updateMatrixWorld(true);batch.invalidate();
 }
 return {paint,place,card,quad,get painted(){return painted;},dispose(){batch.dispose();texture.dispose();material.dispose();quad.geometry.dispose();}};
}
