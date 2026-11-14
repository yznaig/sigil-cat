// A teacher's GOOD JOB sticker (kitchen lane, e1111-58): original procedural art. A five-pointed gold-foil star, a
// fine brushed grain and an embossed inner rim, GOOD / JOB! printed in red with a white keyline (the print is not
// metallic), a paper back and a thin cut edge; one tip lifts a hair, as a sticker does. Front +Z, centred.
import * as T from 'three';
import {rng,body} from '../core.js';
const R=.13,r=.056,TH=.0012;
const lift=(x,y)=>{const d=Math.max(0,(y-.07)/.06);return .006*d*d;};      // the top tip curls up a little
export function starPoints(scale=1){const p=[];for(let k=0;k<10;k++){const a=Math.PI/2+k*Math.PI/5,rr=k%2?r:R;p.push([Math.cos(a)*rr*scale,Math.sin(a)*rr*scale]);}return p;}
export const physics=body(.012,(()=>{const s=starPoints(),parts=[],v=(x,y,z)=>[x,y,z+lift(x,y)];
 const centre=[];for(let k=1;k<10;k+=2)for(const z of [-TH,TH])centre.push(v(...s[k],z));parts.push({type:'convex',vertices:centre});
 for(let k=0;k<10;k+=2){const a=s[(k+9)%10],b=s[k],c=s[k+1],t=[];for(const z of [-TH,TH])for(const q of [a,b,c])t.push(v(...q,z));parts.push({type:'convex',vertices:t});}
 return parts;})(),{adhesive:[0,0,-TH],front:'+Z'});
function prints(){
 const S=512,rand=rng(811140),art=document.createElement('canvas'),metal=document.createElement('canvas');art.width=art.height=metal.width=metal.height=S;
 const a=art.getContext('2d'),m=metal.getContext('2d');
 const g=a.createRadialGradient(S*.38,S*.3,10,S/2,S/2,S*.62);g.addColorStop(0,'#fff0b0');g.addColorStop(.45,'#f3cb57');g.addColorStop(1,'#cf9a2c');a.fillStyle=g;a.fillRect(0,0,S,S);
 for(let i=0;i<140;i++){a.strokeStyle=i%2?'rgba(255,240,190,.10)':'rgba(120,80,20,.10)';a.lineWidth=.6+rand();a.beginPath();const x=rand()*S,y=rand()*S,d=(rand()-.5)*.5+.6;a.moveTo(x,y);a.lineTo(x+Math.cos(d)*180,y+Math.sin(d)*180);a.stroke();}
 m.fillStyle='#ffffff';m.fillRect(0,0,S,S);
 // Embossed inner rim, following the star.
 const star=(k)=>{const p=starPoints(S/(2*R)*k);a.beginPath();p.forEach(([x,y],i)=>{const X=S/2+x,Y=S/2-y;i?a.lineTo(X,Y):a.moveTo(X,Y);});a.closePath();};
 a.lineWidth=7;a.strokeStyle='rgba(120,82,18,.55)';star(.86);a.stroke();a.lineWidth=3;a.strokeStyle='rgba(255,236,170,.6)';star(.83);a.stroke();
 const word=(text,y,size)=>{for(const c of [a,m]){c.font=`900 ${size}px "Arial Black","Archivo",Impact,sans-serif`;c.textAlign='center';c.textBaseline='middle';
  const w=c.measureText(text).width,k=Math.min(1,214/w);c.save();c.translate(S/2,y);c.scale(k,1);c.lineJoin='round';
  c.lineWidth=12;c.strokeStyle=c===a?'#fffaf0':'#000';c.strokeText(text,0,0);c.fillStyle=c===a?'#b0141a':'#000';c.fillText(text,0,0);c.restore();}};
 word('GOOD',S*.47,96);word('JOB!',S*.645,96);
 const map=new T.CanvasTexture(art);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 const metalness=new T.CanvasTexture(metal);
 return {map,metalness};
}
export function create(){
 const g=new T.Group();g.name='goodjob';const {map,metalness}=prints();
 const foil=new T.MeshStandardMaterial({map,metalness:.82,metalnessMap:metalness,roughness:.3,emissive:'#2e2000',emissiveIntensity:.6}),back=new T.MeshStandardMaterial({color:'#e6dfcc',roughness:.92}),edge=new T.MeshStandardMaterial({color:'#b58b2c',roughness:.4,metalness:.8});
 const pts=starPoints(),shape=new T.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 for(const [side,mat]of [[1,foil],[-1,back]]){
  const geo=new T.ShapeGeometry(shape).toNonIndexed(),p=geo.attributes.position,uv=[];
  // Subdivide once so the lifted tip bends smoothly.
  const src=[];for(let i=0;i<p.count;i++)src.push([p.getX(i),p.getY(i)]);const tri=[];
  for(let i=0;i<src.length;i+=3){const [A,B,C]=[src[i],src[i+1],src[i+2]],mid=(u,v)=>[(u[0]+v[0])/2,(u[1]+v[1])/2],ab=mid(A,B),bc=mid(B,C),ca=mid(C,A);tri.push(A,ab,ca,ab,B,bc,ca,bc,C,ab,bc,ca);}
  const pos=[];for(let i=0;i<tri.length;i+=3){const order=side===1?[0,1,2]:[0,2,1];for(const j of order){const [x,y]=tri[i+j];pos.push(x,y,lift(x,y)+side*TH);uv.push(x/(2*R)+.5,y/(2*R)+.5);}}
  const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('uv',new T.Float32BufferAttribute(uv,2));out.computeVertexNormals();
  const mesh=new T.Mesh(out,mat);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
 }
 const wall=[],wuv=[];for(let i=0;i<10;i++){const A=pts[i],B=pts[(i+1)%10];for(const [v,z]of [[A,-TH],[B,-TH],[B,TH],[A,-TH],[B,TH],[A,TH]]){wall.push(v[0],v[1],lift(...v)+z);wuv.push(0,0);}}
 const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wall,3));wg.setAttribute('uv',new T.Float32BufferAttribute(wuv,2));wg.computeVertexNormals();g.add(new T.Mesh(wg,edge));
 g.userData.physics=physics;return g;
}
