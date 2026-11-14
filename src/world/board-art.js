import {forPicture} from '../core/cat.js';
// All grain, cork chips and hardware are original deterministic geometry/canvas art.
export function boardArt(T,width,height){
 let seed=187;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function texture(kind){
  const c=document.createElement('canvas');c.width=kind==='wood'?1024:512;c.height=512;const x=c.getContext('2d');
  x.fillStyle=kind==='wood'?'#6f442c':'#b99363';x.fillRect(0,0,c.width,c.height);
  if(kind==='wood')for(let y=0;y<512;y+=.6){x.beginPath();x.moveTo(0,y);for(let i=0;i<=1024;i+=8)x.lineTo(i,y+2*Math.sin(i*.014+y*.13)+.8*Math.sin(i*.05+y));x.strokeStyle=`rgba(${rnd()>.45?'34,16,6':'205,160,105'},${.03+rnd()*.19})`;x.lineWidth=.5+rnd()*1.5;x.stroke();}
  else for(let i=0;i<32000;i++){const a=rnd()*512,b=rnd()*512,s=.5+rnd()*4;x.fillStyle=['#a27d4f','#cba873','#896842','#dfbd86','#b39368'][i%5];x.beginPath();x.moveTo(a,b);x.lineTo(a+s,b-1);x.lineTo(a+s*.8,b+s);x.lineTo(a-s*.3,b+s*.5);x.closePath();x.fill();}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
 }
 const wood=texture('wood'),cork=texture('cork');
 const woodMat=forPicture(new T.MeshStandardMaterial({map:wood,roughness:.42,bumpMap:wood,bumpScale:.0005,color:0xd5b998}));
 const corkMat=forPicture(new T.MeshStandardMaterial({map:cork,roughness:.96,bumpMap:cork,bumpScale:.0015}));
 const metal=forPicture(new T.MeshStandardMaterial({color:0xb5a892,metalness:.85,roughness:.3}));
 const group=new T.Group(),border=.035;
 const bevel=(pts,depth,material)=>{const s=new T.Shape();s.moveTo(...pts[0]);for(const p of pts.slice(1))s.lineTo(...p);s.closePath();return new T.Mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,steps:1,curveSegments:1}),material);};
 const x=width/2,y=height/2,b=border;
 for(const pts of [ [[-x,-y],[x,-y],[x-b,-y+b],[-x+b,-y+b]], [[-x,y],[-x+b,y-b],[x-b,y-b],[x,y]], [[-x,-y],[-x+b,-y+b],[-x+b,y-b],[-x,y]], [[x,-y],[x,y],[x-b,y-b],[x-b,-y+b]] ])group.add(bevel(pts,.026,woodMat));
 const centre=new T.Mesh(new T.BoxGeometry(width-2*b,height-2*b,.018),corkMat);centre.position.z=.008;group.add(centre);
 for(const a of [-1,1])for(const c of [-1,1]){
  const screw=new T.Mesh(new T.CylinderGeometry(.005,.005,.003,12),metal);screw.rotation.x=Math.PI/2;screw.position.set(a*(x-.017),c*(y-.017),.032);group.add(screw);
  const cut=new T.Mesh(new T.BoxGeometry(.006,.001,.0005),forPicture(new T.MeshStandardMaterial({color:0x302c27,roughness:.8})));cut.position.copy(screw.position).z+=.002;cut.rotation.z=.3;group.add(cut);
 }
 const owned=new Set();group.traverse(o=>{if(o.isMesh)owned.add(o);});
 const pins=new Map();
 function pin(id,position,color){
  let p=pins.get(id);if(!p){p=new T.Group();const shaft=new T.Mesh(new T.CylinderGeometry(.0018,.0018,.024,10),metal);shaft.rotation.x=Math.PI/2;shaft.position.z=.009;p.add(shaft);
   const cap=new T.Mesh(new T.SphereGeometry(.009,16,10),forPicture(new T.MeshStandardMaterial({color,roughness:.23,metalness:.15})));cap.scale.set(1,1,.6);cap.position.z=.024;p.add(cap);group.add(p);pins.set(id,p);p.traverse(o=>{if(o.isMesh)owned.add(o);});}
  p.position.set(...position);return p;
 }
 const vertices=[];for(const a of [-1,1])for(const b of [-1,1])for(const z of [-.012,.07])vertices.push(new T.Vector3(a*x,b*y,z));
 return {group,pin,pins,vertices,textures:[wood,cork],dispose(){const geometries=new Set(),materials=new Set();for(const o of owned){geometries.add(o.geometry);materials.add(o.material);}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();wood.dispose();cork.dispose();group.removeFromParent();}};
}
