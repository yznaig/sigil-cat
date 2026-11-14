// The bird's egg (e1111-58/59): one big physical egg, the fourth ingredient. It cannot break.
import {bakeSolid,solidDefinition} from './solid.js';
import {shapeVertices,disposeArt} from './ingredients.js';
export function defineEgg(site,chain){
 const {THREE:T,store,audio,stage,world}=site;
 audio.loadAll(['tap-pop']);
 solidDefinition(site,{id:'egg',category:'recipe',label:'the egg',size:.2,aspect:1.3,home:()=>({x:.6,y:-.5}),
  tap(i){audio.play('tap-pop',{gain:.22,rate:1.35});const e=i.worldEntry;if(e&&!e.support&&!stage.reducedMotion){e.body.applyTorqueImpulse({x:0,y:0,z:e.body.mass()*.0016},true);world.wake(e);}},
  removed(i){if(i.solidArt)disposeArt(i.solidArt);}},async inst=>{
  const {create,hullPoints}=await import('../../assets/models/prepared/kitchen/egg.js');
  const s=store.get('worldBodies.egg.adapter.artScale',chain.state.artScale);
  const model=create();model.scale.setScalar(s);const visual=bakeSolid(T,model);
  const shapes=[{type:'hull',points:hullPoints(s),radius:.001}],vertices=shapeVertices(T,shapes);
  return {visual,shapes,vertices,mass:.06,height:.2*s,adapterState:{version:1,artScale:s},rotation:new T.Quaternion().setFromEuler(new T.Euler(0,.4,Math.PI/2)),
   sound:{material:'paper',size:'small'},material:{friction:.7,restitution:.04,restitutionCombine:'min',linearDamping:.6,angularDamping:2.6,skin:.0006,softCcdPrediction:.08},
   // Held over the egg cup (layout lane, playtest-3, src/world/egg-cup.js): the "Release to place" box over it.
   ready(e){inst.chainScale=s;chain.ready(inst,e);const off=e.released;e.released=()=>{off?.();site.eggCup?.clearPreview();};},
   sync(e){chain.syncItem('egg',e);site.eggCup?.preview(e);},rest(e){chain.restItem('egg',e);}};
 });
}
