import {T,mesh,sphere,mat,node,batch,body} from './forms.js';
function hull(x){const vertices=[];for(const z of [-.004,.006,.025]){const r=z>.02?.033:.056;for(let i=0;i<10;i++){const a=i*Math.PI/5;vertices.push([x+Math.cos(a)*r,Math.sin(a)*r,z]);}}vertices.push([x,0,.037]);return {type:'convex',vertices};}
export const physics=body(.04,[hull(-.066),hull(.066)],{attach:[0,0,-.004],front:'+Z'});
export function create(){const g=new T.Group();g.name='eyes';const back=mat('#e8e5dc',.38),rim=mat('#cacbc5',.28),black=mat('#151817',.24),glass=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.055,transparent:true,opacity:.16,depthWrite:false,clearcoat:1,metalness:.08});
 for(const [i,x]of [-.066,.066].entries()){mesh(g,new T.CylinderGeometry(.056,.056,.006,40),back,[x,0,0],[Math.PI/2,0,0]);mesh(g,new T.TorusGeometry(.0535,.0025,8,40),rim,[x,0,.005]);const dome=new T.SphereGeometry(.053,40,20,0,Math.PI*2,0,Math.PI/2);const m=mesh(g,dome,glass,[x,0,.006],[Math.PI/2,0,0]);m.scale.y=.60;const pupil=node(g,'pupil.'+i,[x+.005,-.012,.012]);sphere(pupil,.0235,black,[0,0,0],[1,1,.22],24);batch(pupil);}
 batch(g);g.userData.physics=physics;g.userData.pupilRadius=.018;return g;}
export function setPupils(g,x=0,y=-.012){const l=Math.hypot(x,y),s=l>.018?.018/l:1;for(const [i,cx]of [-.066,.066].entries())g.getObjectByName('pupil.'+i).position.set(cx+x*s,y*s,.012);}
