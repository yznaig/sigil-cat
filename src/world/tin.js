import {bakeSolid,boxVertices,solidDefinition} from './solid.js';
export function defineTin(site){
 const {THREE:T,world,audio}=site;let art;
 return solidDefinition(site,{id:'tin',label:'the tin of plasters',size:.34,aspect:.7,home:()=>({x:.5,y:-.46}),
  tap(inst){audio.play('paper',{gain:.4,rate:1.4});const e=inst.worldEntry;if(e&&!e.support&&!site.stage.reducedMotion){e.body.applyTorqueImpulse({x:0,y:.0001,z:.0002},true);world.wake(e);}}
 },async inst=>{
  const {create}=await import('../../assets/models/prepared/tin.js');
  if(!art){
   const p=site.worldLayout.anchor(inst.px.x,inst.box.y+inst.box.h-20);
   const scale=site.store.get('worldBodies.tin.adapter.artScale')||inst.w/site.stage.pxPerUnit(p)/.35;
   art=bakeSolid(T,create());art.geometry.scale(scale,scale,scale);art.userData.scale=scale;
  }
  const scale=art.userData.scale;
  // The rolled lid and plaster are enclosed; bottom skin is less than a pixel.
  const half=[.175,.0965,.1125].map(v=>v*scale),offset=[0,.1005*scale,0];
  return {visual:art.clone(),shapes:[{half,offset:{x:offset[0],y:offset[1],z:offset[2]}}],vertices:boxVertices(T,half,offset),adapterState:{version:1,artScale:scale},height:.197*scale,mass:.12,rotation:new T.Quaternion().setFromEuler(new T.Euler(0,-.12,0)),material:{friction:.65,restitution:.16,linearDamping:.3,angularDamping:.7,skin:.001,softCcdPrediction:.06}};
 });
}
