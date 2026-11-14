import {T,mat,box,label,mesh,finish,body,cuboid,rng} from './core.js';
export const physics=body(.12,[cuboid([.35,.19,.225],[0,.095,0])],{shelfSeat:[0,0,0]});
export function create(){const g=new T.Group();g.name='tin';const enamel=mat('#e9e2cf',.3),green=mat('#3d6b5a',.25),edge=mat('#a7a39a',.3,.85),seam=mat('#273e32',.65),plaster=mat('#dfb090',.86,0,'cloth'),pad=mat('#f9e1cd',.96,0,'cloth');
 const rounded=(w,h,d,y,m)=>{const r=.018,x=w/2,z=d/2,s=new T.Shape();s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);const geo=new T.ExtrudeGeometry(s,{depth:h-.003,bevelEnabled:true,bevelSize:.0015,bevelThickness:.0015,bevelSegments:2,curveSegments:5,steps:1});mesh(g,geo,m,[0,y+.0015,0],[-Math.PI/2,0,0]);};
 rounded(.335,.16,.212,.005,enamel);rounded(.338,.007,.216,.004,edge);
 rounded(.341,.006,.217,.156,seam);rounded(.35,.029,.225,.162,green);rounded(.35,.004,.225,.163,edge);
 const print=(c,w,h)=>{c.fillStyle=c.strokeStyle='#3d6b5a';c.textAlign='center';c.font=`bold ${w*.12}px Georgia`;c.fillText('PLASTERS',w/2,h*.48);c.font=`italic ${w*.064}px Georgia`;c.fillText('for bitten fingers',w/2,h*.76);c.lineWidth=w*.004;c.strokeRect(w*.04,h*.06,w*.92,h*.88);};
 label(g,.284,.105,print,[0,.091,.109]);label(g,.24,.075,(c,w,h)=>{c.fillStyle='#59796a';c.textAlign='center';c.font=`${w*.07}px Georgia`;c.fillText('A LITTLE CARE',w/2,h*.38);c.font=`italic ${w*.06}px Georgia`;c.fillText('for curious paws',w/2,h*.72);},[0,.088,-.109],[0,Math.PI,0]);
 const patch=new T.Group();patch.position.set(.065,.194,.006);patch.rotation.y=-.33;g.add(patch);box(patch,[.11,.002,.035],plaster,[0,0,0],.001);box(patch,[.037,.002,.029],pad,[0,.0015,0],.001);
 // Sparse edge chips expose metal; no heavy grunge on the identifying print.
 const rand=rng(111036);for(let i=0;i<18;i++){const x=(rand()-.5)*.30;box(g,[.0015+rand()*.003,.001,.0005],edge,[x,i%2?.167:.012,.108],0);}
 return finish(g,physics);}
