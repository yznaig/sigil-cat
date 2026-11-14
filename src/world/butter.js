import {forPicture} from '../core/cat.js';
import {solidDefinition} from './solid.js';
export function createButter(site){
 const {cat,stage,world,THREE:T,keepsakes,supports,store,audio}=site;
 const seat='cat-butter',rotation=new T.Quaternion().setFromEuler(new T.Euler(0,.25,.05));
 let handling=false,returning=false;
 supports.registerCatSeat({id:seat,parent:cat.butterSlot,slots:[{id:'crown',accepts:['pat'],position:[0,.02,0],quaternion:rotation.toArray()}]});
 const material=forPicture(new T.MeshStandardMaterial({color:0xf3d36b,roughness:.42}));
 solidDefinition(site,{id:'pat',label:'the pat of butter',size:.2,aspect:.55,home:()=>({x:1.2,y:-.4}),
  place:placeFlight,tap(){audio.play('slap',{gain:.25,rate:1.4});},removed(){cat.ownButterPresentation(false);}
 },async inst=>{
  await cat.ensureButter();
  // Convex rounded edges keep waxy corners off the floor without a box's overhang.
  const geo=cat.butterGeometry,unique=[],half=[.1,.0325,.065],r=.016;
  // Five directions an axis (integration, playtest-3): with three, a pat resting on a rounded edge between two samples
  // sank its art .0047 below the hull (the rounding's sag at 45 degrees, 2 px on a desktop: world-shelf-solids' visual
  // gap); at 26.6 degree steps the sag is under .0005.
  const D=[-1,-.5,0,.5,1];
  for(const x of D)for(const y of D)for(const z of D){
   if(!x&&!y&&!z)continue;const n=new T.Vector3(x,y,z).normalize();unique.push(new T.Vector3(Math.sign(x)*(half[0]-r)+n.x*r,Math.sign(y)*(half[1]-r)+n.y*r,Math.sign(z)*(half[2]-r)+n.z*r));
  }
  return {visual:new T.Mesh(geo,material),shapes:[{type:'hull',points:unique.flatMap(v=>v.toArray())}],vertices:unique,mass:.08,height:.065,
   rotation:new T.Quaternion().setFromEuler(new T.Euler(.48,0,0)),material:{friction:.85,restitution:.03,linearDamping:.5,angularDamping:1.4,skin:.001,softCcdPrediction:.04},
   ready(e){
    e.supported=s=>{const on=s.id===seat;handling=true;cat.setButter(on,'quiet');handling=false;store.set('butterman.buttered',on);if(on)cat.ownButterPresentation(true);};
    e.grabbed=()=>{inst.autoHome=false;inst.resting=false;handling=true;cat.setButter(false,'quiet');handling=false;store.set('butterman.buttered',false);e.body.setEnabled(true);inst.object.visible=true;inst.solidArt.visible=true;};
    e.dragging=ev=>inst.el.classList.toggle('over',cat.hitTest(ev.clientX,ev.clientY));
    e.dropped=ev=>{inst.el.classList.remove('over');if(ev&&cat.hitTest(ev.clientX,ev.clientY)){putBack();return true;}return false;};
    if(e.support?.id===seat){cat.ownButterPresentation(true);setVisible(inst,cat.butterOn);}
   }};
 });
 function setVisible(i,on){i.object.visible=on;i.solidArt.visible=on;i.worldEntry.body.setEnabled(on);i.picture.draw(true);cat.touch();}
 async function show(on,mode){
  if(handling)return;
  if(!on){const i=keepsakes.get('pat');if(i?.worldEntry?.support?.id===seat)setVisible(i,false);return;}
  const i=keepsakes.get('pat')||keepsakes.give('pat');await i.worldTask;if(!cat.butterOn||handling||!i.worldEntry)return;
  cat.ownButterPresentation(true);setVisible(i,true);supports.mount(i.worldEntry,seat,'crown',{animate:false});
 }
 cat.onButter.push(show);
 async function putBack(){
  const i=keepsakes.get('pat');if(!i?.worldEntry||returning)return false;returning=true;
  const e=i.worldEntry;world.release();supports.detach(e,{wake:false});world.park(e);world.disable(e);e.canGrab=false;
  const from=i.object.position.clone(),q=i.object.quaternion.clone();
  handling=true;cat.setButter(true,'quiet');handling=false;store.set('butterman.buttered',true);cat.ownButterPresentation(true);
  audio.play('slap',{gain:.5});
  await stage.tween(stage.reducedMotion?0:.22,k=>{const target=supports.pose(seat,'crown'),t=1-(1-k)**3;e.body.setTranslation(from.clone().lerp(target.p,t),false);e.body.setRotation(q.clone().slerp(target.q,t),false);world.sync(e);});
  e.body.setEnabled(true);e.canGrab=true;supports.mount(e,seat,'crown',{animate:false});returning=false;return true;
 }
 // The hull face straight below the centre of mass is where a level pat comes
 // to rest (its waxy base is not flat); landing in that pose leaves no roll.
 function restPose(vs,com){
  const down=new T.Vector3(0,-1,0),a=new T.Vector3(),b=new T.Vector3(),n=new T.Vector3();let best=null,bestT=Infinity;
  for(let i=0;i<vs.length;i++)for(let j=i+1;j<vs.length;j++)for(let k=j+1;k<vs.length;k++){
   n.crossVectors(a.subVectors(vs[j],vs[i]),b.subVectors(vs[k],vs[i]));if(n.lengthSq()<1e-12)continue;n.normalize();
   let d=n.dot(vs[i]),above=false,below=false;for(const v of vs){const s=n.dot(v)-d;if(s>1e-7)above=true;else if(s<-1e-7)below=true;if(above&&below)break;}
   if(above&&below)continue;if(above){n.negate();d=-d;}
   const along=n.dot(down);if(along<=1e-6)continue;const t=(d-n.dot(com))/along;if(t>=0&&t<bestT){bestT=t;best=n.clone();}
  }
  return best?new T.Quaternion().setFromUnitVectors(best,down):new T.Quaternion();
 }
 function beginFlight(i){
  const e=i.worldEntry;supports.detach(e,{wake:false});world.park(e);world.disable(e);e.canGrab=false;i.object.visible=true;i.solidArt.visible=true;
  // Land in the pat's flat resting pose on the floor. The pre-flight pose is
  // the tilted glass pose, 2cm up: handing that to physics made it drop ~7px.
  i.flightLandingQ=restPose(i.colliderVertices,new T.Vector3().copy(e.body.localCom()));
  i.flightLanding=new T.Vector3().copy(e.body.translation());i.flightLanding.y=-Math.min(...i.colliderVertices.map(v=>v.clone().applyQuaternion(i.flightLandingQ).y))+.001;
  i.w=.2*stage.pxPerUnit(i.flightLanding);i.h=.065*stage.pxPerUnit(i.flightLanding);
 }
 function placeFlight(obj,i){
  const f=i.flight;if(!f)return;
  const landing=i.flightLanding||new T.Vector3().copy(i.worldEntry.body.translation());
  const z=1+(landing.z-1)*(f.depth??0);stage.onWall(f.x,f.y,z,obj.position);
  const scale=i.w/.2/stage.pxPerUnit(obj.position)*f.sc,sq=f.sq||1;obj.scale.set(scale*sq,scale/sq,scale);obj.rotation.set(.48,0,f.rot*Math.PI/180);if(f.depth&&i.flightLandingQ)obj.quaternion.slerp(i.flightLandingQ,f.depth);i.picture.draw();
 }
 function endFlight(i){
  const e=i.worldEntry,p=i.object.position.clone(),q=i.object.quaternion.clone();i.flight=null;i.object.scale.setScalar(1);
  e.body.setTranslation(p,false);e.body.setRotation(q,false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);e.body.setEnabled(true);e.canGrab=true;world.wake(e);world.sync(e);
 }
 return {putBack,beginFlight,endFlight,show,seat,get returning(){return returning;}};
}
