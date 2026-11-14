// The reward uses a fixed support and a visual rotor, never an unstable perpetual contact.
export function createChargedTop(site){
 const {world,stage,THREE:T}=site;
 let inst=null,angle=0,listening=false;
 const stats={frames:0};
 function unlisten(){const n=stage.onFrame.indexOf(frame);if(n>=0)stage.onFrame.splice(n,1);listening=false;}
 function listen(){if(inst&&!document.hidden&&!stage.reducedMotion&&!inst.worldEntry.support&&!listening){stage.onFrame.push(frame);listening=true;}}
 function frame(dt){if(!inst)return;angle=(angle+dt*12)%(Math.PI*2);const e=inst.worldEntry;
  e.object.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),angle);e.object.updateMatrixWorld(true);e.sync(e);stats.frames++;
 }
 function stop(){if(!inst)return;const i=inst,e=i.worldEntry;inst=null;unlisten();i.setState({charged:false});i.key.querySelector('button').textContent=i.def.label;
  e.body.setBodyType(world.rapier.RigidBodyType.Dynamic,true);e.body.setRotation(e.object.quaternion,true);e.grabbed=null;e.supported=null;
  world.wake(e);
 }
 function charge(i){if(!i?.worldReady||world.held?.entry===i.worldEntry)return false;if(inst===i)return true;
  stop();inst=i;angle=0;const e=i.worldEntry,b=e.body,p=b.translation();
  if(!e.support){b.setRotation({x:0,y:0,z:0,w:1},false);b.setTranslation({x:p.x,y:.003,z:p.z},false);}
  b.setLinvel({x:0,y:0,z:0},false);b.setAngvel({x:0,y:0,z:0},false);world.park(e);
  b.setBodyType(world.rapier.RigidBodyType.Fixed,false);e.grabbed=stop;e.supported=unlisten;world.sync(e);
  i.setState({charged:true});i.key.querySelector('button').textContent='the charged spinning top';world.save(e);listen();return true;
 }
 document.addEventListener('visibilitychange',()=>{unlisten();listen();});
 return {charge,stop,stats,get active(){return !!inst;},get listening(){return listening;}};
}
