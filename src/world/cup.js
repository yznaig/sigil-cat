import {bakeSolid} from './solid.js';
import {preparedShapes,disposeArt} from './small-body.js';
import {createMeshPicture} from '../core/mesh-picture.js';

// A temporary physical shell. Choreography, free fall and break are exclusive
// owners; finish latches before resolving the handoff promise.
export async function createCup(site,height) {
  const {THREE:T,world,stage}=site;
  await Promise.all([world.ensure(),stage.ensureEnv()]);
  const model=await import('../../assets/models/prepared/world-detail/cup.js');
  const source=model.create(),scale=height/.222,visual=bakeSolid(T,source);visual.geometry.scale(scale,scale,scale);
  source.traverse(o=>o.geometry?.dispose());
  const root=new T.Mesh(visual.geometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));stage.scene.add(root);
  const {shapes,vertices}=preparedShapes(T,model.physics,scale),picture=createMeshPicture(site,root,visual,vertices);
  const shadow={id:'glass',physical:true,object:root},stats={handoffs:0};
  let mode='choreographed',resolveFall=null,entry,age=0,placed=false,shadowless=false;
  const low=()=>Math.min(...vertices.map(v=>v.clone().applyQuaternion(root.quaternion).add(root.position).y));
  function finish(){
    if(mode==='broken'||mode==='disposed')return false;   // (also from 'flying': posed by hand)
    mode='broken';stats.handoffs++;
    const at=root.position.clone();dispose();resolveFall?.(at);resolveFall=null;return true;
  }
  entry=await world.add({id:'glass',object:root,shapes,mass:.12,position:new T.Vector3(0,.002,0),sleeping:true,presentation:picture,
    sound:{material:'glass',size:'medium'},material:{friction:.5,restitution:.03,skin:.0005,linearDamping:.2,angularDamping:.45},
    beforeStep(dt){if(mode==='free')age+=dt;},
    // shadowless: high in the air (the glass's tumble from the top of the page) a floor shadow would land far behind it.
    sync(e){picture.draw();if(shadowless)site.worldLayout.remove('glass');else site.worldLayout.shadow(shadow);
      // A moved kinematic shell gets a contact step. Stationary choreography
      // needs no continuing solver callback during the cat's pauses.
      if(mode==='choreographed')world.park(e);
      if(mode==='free'&&age>.04&&low()<.006){mode='contact';queueMicrotask(finish);}
    },rest(){if(mode==='free')finish();}});
  shadow.worldEntry=entry;world.park(entry);entry.body.setBodyType(world.rapier.RigidBodyType.KinematicPositionBased,false);entry.canGrab=false;
  // Flight (gags lane, playtest 3: "it 'teleports' before it smoothly visually falls all the way off the edge"): over
  // the front edge, off the bottom of the page and down from the top, the glass is a picture placed by hand, not a
  // body. As a kinematic body sinking below the floor, the world's floor rule (world.js unsink) lifted it back up onto
  // the floor and it hung there until it was hidden. fly() takes the body out of the world; pose() then places it.
  function fly(){
    if(mode!=='choreographed')return false;
    world.remove('glass');shadow.worldEntry=null;mode='flying';return true;   // (the shadow must not ask a removed body)
  }
  function pose(p,q=new T.Quaternion()){
    if(mode==='flying'){
      root.position.copy(p);root.quaternion.copy(q);root.updateMatrixWorld(true);picture.draw();
      // no floor shadow once it is below the floor (or high in the air: shadowless)
      if(shadowless||low()<-.004)site.worldLayout.remove('glass');else site.worldLayout.shadow(shadow);
      return;
    }
    if(mode!=='choreographed')return;
    if(!placed){placed=true;entry.body.setTranslation(p,false);entry.body.setRotation(q,false);world.sync(entry);return;}
    entry.body.setNextKinematicTranslation(p);entry.body.setNextKinematicRotation(q);world.wake(entry);
  }
  function fall(velocity={x:0,y:-.35,z:.12},angular={x:.8,y:0,z:-.5}){
    if(mode!=='choreographed')return Promise.resolve(null);
    mode='free';age=0;entry.canGrab=true;entry.body.setBodyType(world.rapier.RigidBodyType.Dynamic,true);
    entry.body.setLinvel(velocity,true);entry.body.setAngvel(angular,true);
    const promise=new Promise(resolve=>{resolveFall=resolve;});world.wake(entry);return promise;
  }
  function dispose(){
    world.remove('glass');site.worldLayout.remove('glass');picture.dispose();root.removeFromParent();root.material.dispose();disposeArt(visual);
    if(mode!=='broken')mode='disposed';
  }
  return {entry,root,picture,vertices,stats,pose,fall,fly,finish,dispose,get mode(){return mode;},get shadowless(){return shadowless;},set shadowless(v){shadowless=!!v;}};
}
