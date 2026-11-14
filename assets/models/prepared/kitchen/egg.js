// One big hen's egg (kitchen lane, e1111-58/59): original procedural art. The outline is Narushin's egg curve
// (length L, breadth B, widest point moved w toward the blunt end), turned on a lathe; a warm light-brown shell with a
// faint mottle and sparse tan speckles, densest at the blunt end, drawn corrected for the lathe's stretch near the
// poles; fine pores in the bump map; a satin finish. Y-up, blunt end at Y=0. Dimensions in cat-height units.
import * as T from 'three';
import {rng,body} from '../core.js';
export const EGG={length:.2,breadth:.15,shift:.012};
// Radius at height y (0 = blunt end, L = pointed end).
export function radiusAt(y,{length:L,breadth:B,shift:w}=EGG){const x=y-L/2;return B/2*Math.sqrt(Math.max(0,(L*L-4*x*x)/(L*L+8*w*x+4*w*w)));}
export function outline(n=56){const pts=[];for(let k=0;k<=n;k++){const y=EGG.length*(1-Math.cos(Math.PI*k/n))/2;pts.push(new T.Vector2(k===0||k===n?0:radiusAt(y),y));}return pts;}
// A convex hull that follows the shell: 13 rings of 16.
export function hullPoints(scale=1){const out=[];for(let k=0;k<=12;k++){const y=EGG.length*(1-Math.cos(Math.PI*k/12))/2,r=radiusAt(y);if(k===0||k===12){out.push(0,y*scale,0);continue;}for(let i=0;i<16;i++)out.push(Math.cos(i*Math.PI/8)*r*scale,y*scale,Math.sin(i*Math.PI/8)*r*scale);}return out;}
export const physics=body(.06,[{type:'convex',vertices:(()=>{const p=hullPoints(),v=[];for(let i=0;i<p.length;i+=3)v.push(p.slice(i,i+3));return v;})()}]);
function shellMaps(){
 const W=1024,H=512,rand=rng(811130),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.fillStyle='#e4c29a';x.fillRect(0,0,W,H);
 // Soft mottle: large faint blotches, a little warmer toward the blunt end.
 for(let i=0;i<220;i++){const v=rand(),u=rand()*W,y=v*H,r=30+rand()*90,warm=rand()<.5;
  const g=x.createRadialGradient(u,y,0,u,y,r);g.addColorStop(0,warm?'rgba(170,112,66,.10)':'rgba(255,240,220,.10)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;
  for(const dx of [-W,0,W]){x.save();x.translate(dx,0);x.fillRect(u-r,y-r,2*r,2*r);x.restore();}}
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(190,140,92,.10)');g.addColorStop(.55,'rgba(190,140,92,0)');g.addColorStop(1,'rgba(255,250,240,.06)');x.fillStyle=g;x.fillRect(0,0,W,H);
 // Speckles: v along the egg (0 = blunt end). Horizontal size is divided by the local girth so a spot stays round.
 const rmax=radiusAt(EGG.length/2-EGG.shift);
 for(let i=0;i<900;i++){
  const v=Math.pow(rand(),1.7)*.96+.02,y=EGG.length*(1-Math.cos(Math.PI*v))/2,girth=Math.max(.12,radiusAt(y)/rmax);
  const u=rand()*W,s=.7+Math.pow(rand(),3)*3.8,a=.22+rand()*.34,tone=rand();
  x.fillStyle=tone<.7?`rgba(132,84,48,${a})`:tone<.92?`rgba(104,62,36,${a})`:`rgba(236,214,188,${a})`;
  x.beginPath();x.ellipse(u,v*H,s/girth,s*(.8+rand()*.4),rand()*Math.PI,0,Math.PI*2);x.fill();
  if(u<8||u>W-8){x.beginPath();x.ellipse(u<8?u+W:u-W,v*H,s/girth,s,0,0,Math.PI*2);x.fill();}
 }
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;map.wrapS=T.RepeatWrapping;
 // Pores: fine seeded noise, tiled.
 const N=256,d=new Uint8Array(N*N*4),r2=rng(811131);for(let i=0;i<N*N;i++){const p=r2()<.08?96:150+(r2()-.5)*40;d.set([p,p,p,255],i*4);}
 const bump=new T.DataTexture(d,N,N);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(6,3);bump.magFilter=T.LinearFilter;bump.minFilter=T.LinearMipmapLinearFilter;bump.generateMipmaps=true;bump.needsUpdate=true;
 return {map,bump};
}
export function create(){
 const g=new T.Group();g.name='egg';const {map,bump}=shellMaps();
 const shell=new T.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.0005,roughness:.44,metalness:0});
 const m=new T.Mesh(new T.LatheGeometry(outline(),72),shell);m.name='shell';m.castShadow=m.receiveShadow=true;g.add(m);
 g.userData.physics=physics;return g;
}
