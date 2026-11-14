// A small household recycling bin (kitchen lane, e1111-58): original procedural art. A rounded-square tapered tub
// in blue polypropylene with a thick rolled rim, a recessed white chasing-arrows mark on the front and a faint
// moulding seam. Y-up, base at Y=0, front toward +Z. Dimensions in cat-height units.
import * as T from 'three';
import {body,cuboid} from '../core.js';
export const BIN={height:.34,top:.15,bottom:.12};   // half widths
export const physics=body(0,[cuboid([BIN.bottom*2,.02,BIN.bottom*2],[0,.01,0])]);
// Superellipse: a circle pushed toward a square with rounded corners.
function squarish(geo,p=5){const a=geo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),r=Math.hypot(x,z);if(r<1e-6)continue;const c=x/r,s=z/r,k=1/Math.pow(Math.pow(Math.abs(c),p)+Math.pow(Math.abs(s),p),1/p);a.setX(i,x*k);a.setZ(i,z*k);}geo.computeVertexNormals();return geo;}
function arrowsMark(){
 const S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');x.clearRect(0,0,S,S);
 x.strokeStyle='#f4f6f2';x.fillStyle='#f4f6f2';x.lineWidth=22;x.lineCap='butt';x.lineJoin='round';
 // Three bent arrows chasing round a triangle.
 const R=86,cx=S/2,cy=S/2+12,pts=[0,1,2].map(k=>{const a=-Math.PI/2+k*Math.PI*2/3;return [cx+Math.cos(a)*R,cy+Math.sin(a)*R];});
 for(let k=0;k<3;k++){const [ax,ay]=pts[k],[bx,by]=pts[(k+1)%3],t0=.2,t1=.68;
  const p0=[ax+(bx-ax)*t0,ay+(by-ay)*t0],p1=[ax+(bx-ax)*t1,ay+(by-ay)*t1];
  x.beginPath();x.moveTo(...p0);x.lineTo(...p1);x.stroke();
  const d=Math.atan2(by-ay,bx-ax),L=30,Wd=24;x.beginPath();x.moveTo(p1[0]+Math.cos(d)*L,p1[1]+Math.sin(d)*L);x.lineTo(p1[0]+Math.cos(d+Math.PI/2)*Wd,p1[1]+Math.sin(d+Math.PI/2)*Wd);x.lineTo(p1[0]-Math.cos(d+Math.PI/2)*Wd,p1[1]-Math.sin(d+Math.PI/2)*Wd);x.closePath();x.fill();
 }
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
export function create(){
 const g=new T.Group();g.name='recycling-bin';const {height:h,top:rt,bottom:rb}=BIN,wall=.009;
 const blue=new T.MeshStandardMaterial({color:'#2f68b4',roughness:.46,metalness:0});
 const inner=new T.MeshStandardMaterial({color:'#1d4a86',roughness:.62,metalness:0,side:T.DoubleSide});
 const outer=[[0,0],[rb-.012,0],[rb-.002,.004],[rb,.014],[rt-.004,h-.03],[rt+.004,h-.024],[rt+.011,h-.016],[rt+.012,h-.006],[rt+.006,h]].map(p=>new T.Vector2(...p));
 const shell=new T.Mesh(squarish(new T.LatheGeometry(outer,64,Math.PI/4)),blue);shell.name='tub';g.add(shell);
 const lip=[[rt+.006,h],[rt-wall,h-.002],[rt-wall-.002,h-.012],[rb-wall,.02],[0,.02]].map(p=>new T.Vector2(...p));
 const inside=new T.Mesh(squarish(new T.LatheGeometry(lip,64,Math.PI/4)),inner);inside.name='inside';g.add(inside);
 // The mark sits on the front wall, leaning back with its taper.
 const lean=Math.atan2(rt-rb,h),mark=new T.Mesh(new T.PlaneGeometry(.19,.19),new T.MeshStandardMaterial({map:arrowsMark(),transparent:true,roughness:.5,polygonOffset:true,polygonOffsetFactor:-2,depthWrite:false}));
 const y=h*.5,zf=rb+(rt-rb)*(y/h);mark.position.set(0,y,zf+.0015);mark.rotation.x=-lean;mark.name='mark';g.add(mark);
 g.userData.physics=physics;return g;
}
// Collider walls for a fixed body: floor, four leaning walls (as thin boxes), so dropped things fall inside.
export function wallShapes(T3,scale=1){
 const {height:h,top:rt,bottom:rb}=BIN,t=.012,lean=Math.atan2(rt-rb,h),mid=(rt+rb)/2,len=Math.hypot(h,rt-rb);
 const shapes=[{half:[rb*scale,.006*scale,rb*scale],offset:new T3.Vector3(0,.006*scale,0)}];
 for(const [ax,s]of [['z',1],['z',-1],['x',1],['x',-1]]){
  const off=new T3.Vector3(ax==='x'?s*mid:0,h/2,ax==='z'?s*mid:0).multiplyScalar(scale);
  const rot=new T3.Quaternion().setFromEuler(ax==='z'?new T3.Euler(s*lean,0,0):new T3.Euler(0,0,-s*lean));
  shapes.push({half:ax==='z'?[rt*scale,len/2*scale,t/2*scale]:[t/2*scale,len/2*scale,rt*scale],offset:off,rotation:rot});
 }
 return shapes;
}
