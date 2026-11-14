// Full hat volumes with original 16-pixel-era palette from src/gags/hat.js.
import {T,mat,lathe,box,sphere,mesh,finish,body,cylinder,cuboid} from './core.js';
const heights={wizard:.39,cone:.37,party:.4315,crown:.19};
export const physics={
 wizard:body(.06,[{type:'cone',radius:.137,height:.36,position:[0,.20,0]},cylinder(.235,.022,[0,.012,0])],{headSeat:[0,0,0],butter:[0,.39,0],peg:[0,.025,0]}),
 cone:body(.08,[{type:'cone',radius:.145,height:.34,position:[0,.20,0]},cuboid([.35,.03,.35],[0,.015,0])],{headSeat:[0,0,0],butter:[0,.37,0],peg:[0,.025,0]}),
 party:body(.03,[{type:'cone',radius:.15,height:.39,position:[0,.195,0]}],{headSeat:[0,0,0],butter:[0,.4315,0],peg:[0,.02,0]}),
 crown:body(.10,Array.from({length:8},(_,i)=>{let a=i*Math.PI/4;return cuboid([.12,.19,.025],[Math.sin(a)*.14,.095,Math.cos(a)*.14],[0,a,0]);}),{headSeat:[0,0,0],butter:[0,.19,0],peg:[0,.035,0]})
};
function pixels(kind){const n=32,data=new Uint8Array(n*n*4),pal=kind==='wizard'?['#5b3fa8','#7a5bd0','#3c2877','#ffd84a']:kind==='cone'?['#f47a1f','#ff9c4a','#b85312','#fdf6ec']:['#ff5fa2','#2ec4b6','#2ec4b6','#fdf6ec'];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){let k=0;if(kind==='wizard'){k=(x+2*y)%17===0?1:0;for(const [sx,sy]of [[6,8],[21,18],[13,26]])if((x===sx&&Math.abs(y-sy)<=1)||(y===sy&&Math.abs(x-sx)<=1))k=3;if(y<3)k=2;}else if(kind==='cone'){k=(y>=10&&y<15)||(y>=22&&y<27)?3:(x%11===0?1:0);}else k=(Math.floor(x/3)+Math.floor(y/3))%2;
 const c=new T.Color(pal[k]).convertLinearToSRGB(),i=(y*n+x)*4;data.set([c.r*255,c.g*255,c.b*255,255],i);}
 const t=new T.DataTexture(data,n,n);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;}
export function create({variant='wizard'}={}){if(!physics[variant])throw Error('Unknown hat '+variant);const g=new T.Group();g.name='rack/'+variant;const gold=mat('#f3c13a',.4,.7),inside=mat('#3c2877',.95),cream=mat('#fdf6ec',.8),fabric=mat('white',variant==='cone'?.45:.9,0,null,{map:pixels(variant)});
 if(variant==='wizard'){
  // Closed brim annulus and double-walled pointed crown; hollow head opening.
  lathe(g,[[.11,0],[.22,0],[.24,.01],[.235,.023],[.145,.027],[.14,.045],[.115,.12],[.085,.21],[.045,.31],[.009,.38],[0,.39],[.004,.37],[.035,.30],[.075,.21],[.105,.12],[.127,.045],[.11,.02],[.11,0]],fabric,undefined,16);
  lathe(g,[[.137,.035],[.145,.035],[.138,.065],[.130,.065],[.137,.035]],gold,undefined,16);
  lathe(g,[[.108,.002],[.108,.023],[.125,.043],[.12,.043],[.105,.022],[.105,.002]],inside,undefined,16);
 }else if(variant==='cone'){
  // Four bars keep the square foot genuinely open from underneath.
  const orange=mat('#b85312',.65);for(const s of [-1,1]){box(g,[.35,.03,.055],orange,[0,.015,s*.1475],0);box(g,[.055,.03,.24],orange,[s*.1475,.015,0],0);}
  lathe(g,[[.145,.025],[.145,.04],[.017,.36],[.012,.37],[.006,.37],[.008,.355],[.135,.038],[.135,.025],[.145,.025]],fabric,undefined,16);
 }else if(variant==='party'){
  lathe(g,[[.15,0],[.15,.012],[.008,.377],[0,.39],[0,.375],[.14,.012],[.14,0],[.15,0]],fabric,undefined,16);
  lathe(g,[[.14,0],[.153,0],[.153,.014],[.14,.014],[.14,0]],cream,undefined,16);
  // Pixel cluster pom, true boxes rather than a billboard star.
  for(const [x,y,z,s]of [[0,.395,0,.038],[-.023,.395,0,.023],[.023,.395,0,.023],[0,.42,0,.023],[0,.395,.023,.023],[0,.395,-.023,.023]])box(g,[s,s,s],gold,[x,y,z],0);
 }else{
  const pos=[],uv=[];const n=32,ro=.16,ri=.14;const point=(r,i,y)=>[Math.sin(i/n*Math.PI*2)*r,y,Math.cos(i/n*Math.PI*2)*r];
  const quad=(a,b,c,d)=>{pos.push(...a,...b,...c,...a,...c,...d);uv.push(0,0,1,0,1,1,0,0,1,1,0,1);};
  for(let i=0;i<n;i++){const h=j=>j%4===0?.19:j%4===2?.10:.13;const a=point(ro,i,0),b=point(ro,i+1,0),c=point(ro,i+1,h(i+1)),d=point(ro,i,h(i)),e=point(ri,i,0),f=point(ri,i+1,0),j=point(ri,i+1,h(i+1)),k=point(ri,i,h(i));quad(a,b,c,d);quad(f,e,k,j);quad(d,c,j,k);quad(e,f,b,a);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();mesh(g,geo,gold);
  const dark=mat('#b8860b',.5,.7);lathe(g,[[.14,.02],[.163,.02],[.163,.038],[.14,.038],[.14,.02]],dark,undefined,16);
  const gems=[mat('#2f6fb5',.25,.25),mat('#d8402f',.25,.25)];for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,[.032,.033,.012],gems[i%2],[Math.sin(a)*.16,.073,Math.cos(a)*.16],0,[0,a,0]);}
 }
 // Lathe's default V follows profile index, which distorts bands on long slopes.
 // Physical-height V keeps each pixel motif level and consistent all around.
 for(const o of g.children)if(o.isMesh&&o.material===fabric){const p=o.geometry.attributes.position,uv=o.geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setY(i,p.getY(i)/heights[variant]);uv.needsUpdate=true;}
 const out=finish(g,physics[variant]);out.userData.crownHeight=heights[variant];return out;}
