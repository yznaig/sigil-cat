// Original Sigil Cat procedural art. No frame loop; geometry/textures build once.
import * as T from 'three';
export { T };
export const rng = (seed=111033) => () => ((seed = Math.imul(1664525, seed) + 1013904223 | 0) >>> 0) / 4294967296;
export function texture(kind, base, seed=111033, size=256) {
  const rand=rng(seed), c=new T.Color(base), data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const u=x/size,v=y/size, n=rand()-.5;
    let f=n*.065;
    if(kind==='wood') f=n*.018+.026*Math.sin(u*155+Math.sin(v*7)*2+Math.sin(v*23)*.3)+.008*Math.sin(u*590+Math.sin(v*13)*3);
    if(kind==='paper') f+=.045*Math.sin(x*2.1+y*.2)*Math.sin(y*1.3);
    if(kind==='metal') f+=.045*Math.sin(x*1.9+y*.09)+.02*Math.sin(x*.4)*Math.sin(y*.5);
    if(kind==='cloth') f+=((x%4===0||y%4===0)?-.09:.02);
    if(kind==='crumb') f+=(rand()>.94?-.20:.0);
    const i=(y*size+x)*4;
    // Convert linear THREE colors back to the authored sRGB bytes.
    const b=c.clone().convertLinearToSRGB();
    data[i]=Math.max(0,Math.min(255,(b.r+f)*255)); data[i+1]=Math.max(0,Math.min(255,(b.g+f)*255)); data[i+2]=Math.max(0,Math.min(255,(b.b+f)*255)); data[i+3]=255;
  }
  const map=new T.DataTexture(data,size,size);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.needsUpdate=true;return map;
}
export function mat(color, roughness=.5, metalness=0, kind=null, extra={}) {
  const map=kind?texture(kind,color):null;
  return new T.MeshStandardMaterial({color:map?'white':color,roughness,metalness,...(map?{map,bumpMap:map,bumpScale:kind==='wood'?.00015:.0006}:{}),...extra});
}
export function mesh(parent,geo,material,pos=[0,0,0],rot=[0,0,0],name='') {
  const m=new T.Mesh(geo,material);m.position.set(...pos);m.rotation.set(...rot);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
export function box(parent,size,material,pos=[0,0,0],bevel=.005,rot=[0,0,0]) {
  const [x,y,z]=size, r=Math.min(bevel,x/4,y/4,z/4), s=new T.Shape();
  s.moveTo(-x/2+r,-y/2+r);s.lineTo(x/2-r,-y/2+r);s.lineTo(x/2-r,y/2-r);s.lineTo(-x/2+r,y/2-r);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:z-2*r,bevelEnabled:r>0,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1,curveSegments:1});g.translate(0,0,-z/2+r);
  return mesh(parent,g,material,pos,rot);
}
export const lathe=(p,profile,m,pos=[0,0,0],segments=32)=>mesh(p,new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),segments),m,pos);
export function sphere(p,r,m,pos=[0,0,0],scale=[1,1,1],segments=16){const a=mesh(p,new T.SphereGeometry(r,segments,12),m,pos);a.scale.set(...scale);return a;}
export function rod(p,a,b,r,m,rt=r,segments=16){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const o=mesh(p,new T.CylinderGeometry(rt,r,v.length(),segments),m,av.add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
export const ring=(p,r,t,m,pos=[0,0,0],rot=[Math.PI/2,0,0],segments=40)=>mesh(p,new T.TorusGeometry(r,t,6,segments),m,pos,rot);
export function tube(p,points,r,m,segments=32){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),segments,r,6,false),m);}
export function label(p,w,h,draw,pos,rot=[0,0,0],size=512){const c=document.createElement('canvas');c.width=size;c.height=Math.round(size*h/w);const ctx=c.getContext('2d');draw(ctx,c.width,c.height);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return mesh(p,new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,transparent:true,roughness:.65,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),pos,rot);}
// Merge stationary subparts by material: one draw per material, no per-part tick.
// Call on each independently moving group, never across a lid/limb pivot.
export function batch(group){group.updateMatrixWorld(true);const buckets=new Map();for(const m of [...group.children]){if(!m.isMesh)continue;const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);let b=buckets.get(m.material);if(!b)buckets.set(m.material,b=[]);b.push(g);group.remove(m);m.geometry.dispose();}
  for(const [material,gs] of buckets){const g=new T.BufferGeometry();for(const key of ['position','normal','uv']){const count=gs.reduce((n,a)=>n+(a.getAttribute(key)?.array.length||0),0),data=new Float32Array(count);let off=0;for(const a of gs){const v=a.getAttribute(key)?.array;if(v){data.set(v,off);off+=v.length;}}g.setAttribute(key,new T.BufferAttribute(data,key==='uv'?2:3));}mesh(group,g,material);for(const a of gs)a.dispose();}return group;
}
export const body=(mass,colliders,anchors={})=>({units:'cat-height units; play mass, not kg',mass,colliders,anchors});
export const cuboid=(size,position=[0,0,0],rotation=[0,0,0])=>({type:'box',size,position,rotation});
export const cylinder=(radius,height,position=[0,0,0],rotation=[0,0,0])=>({type:'cylinder',radius,height,position,rotation});
export function finish(group,physics){group.userData.physics=physics;return batch(group);}
