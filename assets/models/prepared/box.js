import {T,mat,box,label,mesh,finish,batch,body,cuboid,tube} from './core.js';
export const physics=body(.25,[cuboid([.60,.014,.46],[0,.007,0]),cuboid([.014,.366,.46],[-.293,.197,0]),cuboid([.014,.366,.46],[.293,.197,0]),cuboid([.572,.366,.014],[0,.197,-.223]),cuboid([.572,.366,.014],[0,.197,.223])],{lidHinge:[0,.38,-.23]});
export const lidPhysics=body(.04,[cuboid([.608,.012,.468],[0,.006,.234])]);
export const interior={min:[-.286,.014,-.216],max:[.286,.38,.216]};
export function create({open=true,variant}={}){if(variant==='closed')open=false;const g=new T.Group();g.name='box';const kraft=mat('#9c7447',.92,0,'paper',{bumpScale:.00012}),cut=mat('#654a2d',1),tape=mat('#aa8959',.6),inner=mat('#b08b5b',.96,0,'paper',{bumpScale:.0001});
 box(g,[.60,.014,.46],inner,[0,.007,0],.002);for(const s of [-1,1]){box(g,[.014,.366,.46],kraft,[s*.293,.197,0],.002);box(g,[.572,.366,.014],kraft,[0,.197,s*.223],.002);}
 // Exposed fluting at the four top edges; finite geometry, no per-fiber bodies.
 for(const s of [-1,1]){const p=[];for(let i=0;i<=120;i++)p.push([-.284+i/120*.568,.3805,s*.223+Math.sin(i*Math.PI*.7)*.0037]);tube(g,p,.0008,cut,180);const q=[];for(let i=0;i<=90;i++)q.push([s*.293+Math.sin(i*Math.PI*.7)*.0037,.3805,-.214+i/90*.428]);tube(g,q,.0008,cut,140);}
 const print=(c,w,h)=>{c.fillStyle='#443624';c.textAlign='center';c.font=`bold ${w*.095}px sans-serif`;c.fillText('THIS WAY UP',w/2,h*.83);for(const x of [w*.3,w*.7]){c.fillRect(x-w*.025,h*.23,w*.05,h*.32);c.beginPath();c.moveTo(x,h*.08);c.lineTo(x+w*.10,h*.27);c.lineTo(x-w*.10,h*.27);c.fill();}c.lineWidth=w*.005;c.strokeStyle='#443624';c.strokeRect(w*.08,h*.03,w*.84,h*.91);};
 label(g,.23,.19,print,[0,.19,.2305]);label(g,.18,.15,print,[-.3005,.19,0],[0,-Math.PI/2,0]);
 // Fold seams and an understated shipping tape strip continue on the bottom.
 box(g,[.003,.002,.44],cut,[0,.015,0],0);box(g,[.065,.001,.46],tape,[0,-.0005,0],0);
 finish(g,physics);const lid=new T.Group();lid.name='lid';lid.position.set(0,.38,-.23);lid.rotation.x=open?-1.65:0;g.add(lid);box(lid,[.608,.012,.468],kraft,[0,.006,.234],.002);box(lid,[.065,.001,.466],tape,[0,.0125,.234],.0003);box(lid,[.60,.001,.003],cut,[0,.013,.018],0);lid.userData.physics=lidPhysics;batch(lid);g.userData.interior=interior;g.userData.lid=lid.name;return g;}
