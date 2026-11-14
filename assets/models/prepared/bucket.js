import {T,mat,lathe,ring,tube,sphere,mesh,batch,finish,body,cylinder,rng} from './core.js';
const walls=Array.from({length:8},(_,i)=>{const vertices=[];for(const y of [0,.23])for(const r of [y? .126:.092,y?.116:.082])for(const a of [(i-.5)*Math.PI/4,(i+.5)*Math.PI/4])vertices.push([Math.sin(a)*r,y,Math.cos(a)*r]);return {type:'convex',vertices};});
export const physics=body(.25,[cylinder(.092,.014,[0,.007,0]),...walls],{milk:[0,.017,0],handle:[0,.21,0]});
export const milkPhysics=body(.12,[cylinder(.108,.145,[0,.0725,0])]);
export function createMilk(){const g=new T.Group();g.name='milk';const milk=mat('#fff7dc',.23);lathe(g,[[0,0],[.083,0],[.108,.14],[.109,.145],[.105,.147],[0,.147]],milk);return finish(g,milkPhysics);}
export function create({variant}={}){if(variant==='milk')return createMilk();const g=new T.Group();g.name='bucket';const zinc=mat('#989e9d',.38,.83),dark=mat('#606665',.47,.8),wood=mat('#65422c',.62,0,'wood');
 const n=128,d=new Uint8Array(n*n*4),rand=rng(111038);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const f=Math.sin(x*.47+Math.sin(y*.28)*3)*Math.cos(y*.51+Math.sin(x*.31)*2)*13+rand()*9;const a=(y*n+x)*4;d.set([148+f,154+f,153+f,255],a);}const tex=new T.DataTexture(d,n,n);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=tex.minFilter=T.LinearFilter;tex.needsUpdate=true;zinc.map=tex;zinc.color.set('white');zinc.bumpMap=tex;zinc.bumpScale=.00015;
 lathe(g,[[0,0],[.089,0],[.096,.008],[.097,.02],[.126,.222],[.127,.234],[.122,.239],[.116,.233],[.116,.221],[.086,.019],[0,.019]],zinc,undefined,40);
 ring(g,.124,.0045,zinc,[0,.231,0]);ring(g,.096,.0025,dark,[0,.026,0]);ring(g,.121,.002,zinc,[0,.201,0]);
 for(const s of [-1,1]){sphere(g,.012,zinc,[s*.122,.208,0],[.4,1,1]);sphere(g,.004,dark,[s*.128,.208,0],[.4,1,1]);}
 const points=[];for(let i=0;i<=24;i++){const a=Math.PI*i/24;points.push([Math.cos(a)*.13,.21+Math.sin(a)*.135,-Math.sin(a)*.035]);}tube(g,points,.003,dark,32);tube(g,[[-.038,.338,-.033],[0,.346,-.035],[.038,.338,-.033]],.009,wood,10);
 finish(g,physics);if(variant!=='empty'){const milk=createMilk();milk.position.y=.017;g.add(milk);}return g;}
