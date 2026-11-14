import {T,mat,mesh,sphere,ring,finish,body,cylinder,rng} from './core.js';
export const physics=body(.18,[cylinder(.167,.182,[0,.091,0])]);
// left: how many of its five slices are still there (playtest 2, e1112-66: the cat eats it a slice at a time).
export function create({left=5}={}){const g=new T.Group();g.name='cake';const crumb=mat('#c39a58',.94,0,'crumb',{bumpScale:.0002}),crust=mat('#987039',.83,0,'crumb'),icing=mat('#fff0cf',.57),jam=mat('#9c3342',.45),rand=rng(111040),start=.65,end=start+(5.85-start)*Math.max(1,Math.min(5,left))/5;
 function layer(r,y,h,m){const s=new T.Shape();s.moveTo(0,0);s.lineTo(Math.cos(start)*r,Math.sin(start)*r);s.absarc(0,0,r,start,end,false);s.lineTo(0,0);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:2,curveSegments:32,steps:1});mesh(g,geo,m,[0,y,0],[-Math.PI/2,0,0]);}
 layer(.163,.002,.016,crust);layer(.16,.018,.057,crumb);layer(.161,.077,.010,jam);layer(.162,.088,.014,icing);layer(.16,.104,.056,crumb);layer(.164,.163,.017,icing);
 // Naked sponge sides deliberately show the filling and baked crumb.
 const dots=Math.max(3,Math.round(18*(end-start)/5.2));for(let i=0;i<dots;i++){const a=start+.10+i/(dots-1)*(end-start-.2);sphere(g,.012,icing,[Math.cos(a)*.151,.187,-Math.sin(a)*.151],[1,.8,1],10);}
 // Pores are the seeded crumb map, avoiding thousands of tiny pore triangles.
 return finish(g,physics);}
