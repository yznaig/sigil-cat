import {T,mat,mesh,rod,sphere,finish,body,rng} from './core.js';
export const physics=body(.12,[{type:'convex',vertices:[[-.22,0,-.14],[.22,0,-.14],[.23,0,.14],[-.22,0,.14],[-.13,.12,-.06],[.12,.13,-.06],[.12,.12,.07],[-.1,.15,.05]]}],{landed:{mass:0}});
export function create(){const g=new T.Group();g.name='hay';const mats=['#9b7835','#b79446','#c5a75e','#7d652d'].map(c=>mat(c,.95)),rand=rng(111039);
 // Low dark core stays BELOW the densely crossed outer straw surface.
 sphere(g,.14,mats[3],[0,.018,0],[1.45,.22,.9],14);
 for(let i=0;i<600;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand()),x=Math.cos(a)*r*.21,z=Math.sin(a)*r*.13,y=.014+(1-r*r)*.102+rand()*.018,l=.06+rand()*.14,dir=rand()*Math.PI*2,dx=Math.cos(dir)*l,dz=Math.sin(dir)*l;rod(g,[x-dx/2,Math.max(.003,y-rand()*.04),z-dz/2],[x+dx/2,Math.max(.004,y-rand()*.025),z+dz/2],.0025+rand()*.001,mats[i%4],.0012,4);}
 return finish(g,physics);}
