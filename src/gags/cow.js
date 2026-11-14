// A finite, saved visit. Rukh3D's CC BY 4.0 skin; prepared walk/graze clips.
import {createMeshPicture} from '../core/mesh-picture.js';
import {forPicture} from '../core/cat.js';
import {preparedShapes,shapeVertices,disposeArt} from '../world/ingredients.js';
export function createCow(site,chain){
 const {THREE:T,stage,world,keepsakes}=site;let actor=null,loading=null,stopped=false,create,pose,physics;
 async function visit(){
  if(actor||loading||!chain.state.visit)return loading;
  loading=(async()=>{
   await Promise.all([world.ensure(),stage.ensureEnv()]);
   ({create,pose,physics}=await import('../../assets/models/prepared/cow-real/cow.js'));
   const art=await create();if(!chain.state.visit){disposeArt(art);return;}
   const v=chain.state.visit,s=v.scale;
   art.scale.setScalar(s);art.traverse(o=>{if(o.isMesh)o.material=forPicture(o.material);});
   const root=new T.Group();stage.scene.add(root);
   const shapes=preparedShapes(T,physics,s),vertices=shapeVertices(T,shapes);
   // Include muzzle, tail and horns throughout both supplied clips.
   for(const x of [-1.3,1.8])for(const y of [0,1.6])for(const z of [-.45,.45])vertices.push(new T.Vector3(x*s,y*s,z*s));
   const picture=createMeshPicture(site,root,art,vertices);
   const e=await world.add({id:'cake-cow',object:root,shapes,mass:0,fixed:true,position:new T.Vector3(v.x,0,v.z),presentation:picture});
   e.body.setBodyType(world.rapier.RigidBodyType.KinematicPositionBased,true);e.canGrab=false;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),gradient=c.createRadialGradient(32,32,4,32,32,31);gradient.addColorStop(0,'rgba(45,32,20,.22)');gradient.addColorStop(1,'rgba(45,32,20,0)');c.fillStyle=gradient;c.fillRect(0,0,64,64);
   const shadow=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(2.6*s,1.1*s,1);shadow.renderOrder=-4;root.add(shadow);
   actor={art,root,picture,entry:e,shadow};stopped=false;stage.onFrame.push(frame);draw(0);
  })().finally(()=>{loading=null;});return loading;
 }
 function draw(dt){
  if(!actor)return;const v=chain.state.visit;if(!v)return;const {art,root,picture,entry:e}=actor;
  const walking=v.phase==='enter'||v.phase==='leave',eat=v.phase==='lower'?Math.min(1,v.time/2):v.phase==='eat'?1:v.phase==='raise'?Math.max(0,1-v.time/2):0;
  pose(art,{phase:v.walkTime/1.6*Math.PI*2,walk:walking?1:0,eat});
  e.body.setTranslation({x:v.x,y:0,z:v.z},false);root.position.set(v.x,0,v.z);root.updateMatrixWorld(true);
  // Head and legs follow the skin, with the body remaining a kinematic visitor.
  const head=art.worldToLocal(art.getObjectByName('head').getWorldPosition(new T.Vector3())).multiplyScalar(v.scale);
  e.body.collider(1).setTranslationWrtParent({x:head.x,y:head.y,z:head.z});
  for(let i=0;i<4;i++){
   const name=['rear.L','rear.R','front.L','front.R'][i];
   const a=art.worldToLocal(art.getObjectByName(name).getWorldPosition(new T.Vector3())).multiplyScalar(v.scale),b=art.worldToLocal(art.getObjectByName(name+'.hoof').getWorldPosition(new T.Vector3())).multiplyScalar(v.scale);
   e.body.collider(i+2).setTranslationWrtParent(a.add(b).multiplyScalar(.5));
  }
  actor.shadow.position.set(-.1*v.scale,.001,0);world.wake(e);picture.draw(true);
 }
 function contact(){
  if(!actor)return;
  const b=keepsakes.get('bucket')?.worldEntry,v=chain.state.visit;if(!b||!v||v.milked||chain.state.milkFull)return;
  let touched=false;
  for(let i=0;i<b.body.numColliders()&&!touched;i++)for(let j=0;j<actor.entry.body.numColliders()&&!touched;j++)world.physics.contactPair(b.body.collider(i),actor.entry.body.collider(j),m=>{for(let n=0;n<m.numContacts();n++)if(m.contactDist(n)<=.002)touched=true;});
  if(touched)chain.fillMilk();
 }
 function frame(dt){
  if(stopped||!actor)return;const v=chain.state.visit;if(!v){finish();return;}
  dt=Math.min(dt,.05);v.time+=dt;
  const speed=actor.art.userData.rig.speed*v.scale;
  if(v.phase==='enter'||v.phase==='leave'){
   v.walkTime+=dt;v.x+=speed*dt;
   if(v.phase==='enter'&&v.x>=v.target){v.x=v.target;v.phase='lower';v.time=0;}
   else if(v.phase==='leave'&&stage.toScreen(new T.Vector3(v.x-1.3*v.scale,0,v.z)).x>stage.width+10){chain.state.visit=null;chain.save();finish();return;}
  }else if(v.phase==='lower'&&v.time>=2){v.phase='eat';v.time=0;}
  else if(v.phase==='eat'&&v.time>=18){chain.consumeHay();v.phase='raise';v.time=0;}
  else if(v.phase==='raise'&&v.time>=2){v.phase='leave';v.time=0;}
  draw(dt);contact();
  v.saveClock=(v.saveClock||0)+dt;if(v.saveClock>.5){v.saveClock=0;chain.save();}
 }
 function finish(){
  stopped=true;const at=stage.onFrame.indexOf(frame);if(at>=0)stage.onFrame.splice(at,1);
  if(actor){world.remove('cake-cow');actor.picture.dispose();stage.scene.remove(actor.root);disposeArt(actor.art);stage.scene.remove(actor.shadow);disposeArt(actor.shadow);actor=null;}
 }
 // The equivalent action positions the real pail against the same contact proxies.
 async function milk(){
  if(!actor||chain.state.visit?.milked)return false;
  const i=keepsakes.get('bucket');if(!i)return false;await i.worldTask;
  site.worldInput.cancel();site.supports.detach(i.worldEntry);
  const v=chain.state.visit,p={x:v.x-.35*v.scale,y:.14*v.scale,z:v.z+.39*v.scale};
  i.worldEntry.body.setTranslation(p,true);i.worldEntry.body.setLinvel({x:0,y:0,z:-.2},true);world.wake(i.worldEntry);world.sync(i.worldEntry);return true;
 }
 return {visit,milk,contact,get actor(){return actor;},get active(){return !!actor||!!loading;}};
}
