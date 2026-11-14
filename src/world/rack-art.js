// Adapter-side preparation of our CC0 models. Geometry is merged once for the
// shared mesh-picture atlas; the prepared art and its source record stay intact.
import {forPicture} from '../core/cat.js';
import {fitResting} from '../core/floor-home.js';
export function prepareArt(T,group,scale=1){
 group.updateMatrixWorld(true);
 const materials=[],parts=[];let count=0;
 group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.scale(scale,scale,scale);parts.push({g,material:o.material,start:count});count+=g.attributes.position.count;if(!materials.includes(o.material))materials.push(o.material);});
 const geometry=new T.BufferGeometry();
 for(const name of ['position','normal','uv']){const width=name==='uv'?2:3,data=new Float32Array(count*width);let offset=0;for(const {g}of parts){const a=g.attributes[name];if(a)data.set(a.array,offset);offset+=g.attributes.position.count*width;}geometry.setAttribute(name,new T.BufferAttribute(data,width));}
 for(const {g,material,start}of parts){geometry.addGroup(start,g.attributes.position.count,materials.indexOf(material));g.dispose();}
 for(const m of materials)forPicture(m);
 group.traverse(o=>o.geometry?.dispose());
 const visual=new T.Mesh(geometry,materials);visual.name=group.name;
 // Bounds include the actual silhouette (not only a coarse collider).
 // Rotated AABB corners overstate a tilted brim by up to ~40% (the wizard hat's
 // box left the page on a narrow screen). Keep the art's own outermost
 // vertices instead: the support point in each of 512 spread directions.
 geometry.computeBoundingBox();const vertices=supportVertices(T,geometry.attributes.position);
 return {visual,vertices,dispose(){geometry.dispose();const maps=new Set();for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)maps.add(value);m.dispose();}for(const t of maps)t.dispose();}};
}
function supportVertices(T,a,count=512){
 const unique=new Map();for(let n=0;n<a.count;n++){const x=a.getX(n),y=a.getY(n),z=a.getZ(n);unique.set(x+','+y+','+z,[x,y,z]);}
 const p=Float64Array.from([...unique.values()].flat()),keep=new Set(),golden=Math.PI*(3-Math.sqrt(5));
 for(let k=0;k<count;k++){
  const y=1-2*(k+.5)/count,r=Math.sqrt(1-y*y),dx=Math.cos(golden*k)*r,dz=Math.sin(golden*k)*r;
  let best=-Infinity,index=0;
  for(let n=0;n<p.length;n+=3){const d=p[n]*dx+p[n+1]*y+p[n+2]*dz;if(d>best){best=d;index=n;}}
  keep.add(index);
 }
 return [...keep].map(n=>new T.Vector3(p[n],p[n+1],p[n+2]));
}
export function preparedShapes(T,physics,scale=1){
 return physics.colliders.map(c=>{
  const offset=new T.Vector3(...(c.position||[0,0,0])).multiplyScalar(scale),rotation=new T.Quaternion().setFromEuler(new T.Euler(...(c.rotation||[0,0,0])));
  if(c.type==='sphere')return {type:'ball',radius:c.radius*scale,offset};
  if(c.type==='box')return {half:c.size.map(v=>v*scale/2),offset,rotation};
  const points=[],n=16,r=c.radius*scale,h=c.height*scale/2;
  for(const y of [-h,h])for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=c.type==='cone'&&y===h?0:r;points.push(Math.cos(a)*rr,y,Math.sin(a)*rr);}
  return {type:'hull',points,offset,rotation};
 });
}
export function pickMesh(T,visual){return new T.Mesh(visual.geometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));}
// Where it may rest is the shared rule (floor-home.js fitResting); the world calls it, never on a same-layout restore.
export function resizeProp(site,vertices){return e=>fitResting(site,e,vertices);}
