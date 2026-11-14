// Four full pixel-patterned 3D hats share one identity each between peg and cat.
import {createHats,HAT_NAMES,SIGIL_HATS} from '../world/hats.js';
import {createLamp} from '../world/lamp.js';
export const HAT={width:.5,sink:.025,order:HAT_NAMES};
export default function createHat(site){
 const {cat,stage,audio,store}=site,rack=site.rack=createHats(site);
 site.lamp=createLamp(site,rack);audio.loadAll(['tap-bonk','tap-pop']);let busy=false,count=0;
 async function wear(name,opts){return rack.wear(name||null,opts);}
 // Tapping the post goes round the hats he has, then bare-headed (the party hat joins once the cake gives it).
 async function cycle(){if(busy||cat.hidden||cat.standIn)return false;const have=rack.owned(),n=have.indexOf(rack.wearing);await wear(n===have.length-1?null:have[n+1]);audio.play('tap-pop',{gain:.5});return true;}
 // One hat per cast (playtest 3, Aaron: "unlock one of its 3 hats at a time not all at once"): each triangle gives the
 // next of wizard, cone, crown that he does not have yet, and drops it on his head. Once he has all three a cast just
 // brings the rack (it is built, or already standing) with a hop: no hat is dropped. The party hat stays the cake's.
 const unlockNext=()=>SIGIL_HATS.find(n=>!rack.owned().includes(n))||null;
 async function drop(name){
  if(busy||cat.hidden||cat.standIn)return false;busy=true;count++;
  try{
   const next=name||unlockNext();
   if(!next){await rack.ready();audio.play('tap-pop',{gain:.5});cat.playEmote('hop','hat');return true;}
   await rack.ready({grant:[next]});
   if(rack.wearing)await wear(null);const e=rack.hats.get(next).worldEntry;site.supports.detach(e,{wake:false});site.world.park(e);
   // A bounded arrival owns this same body until the cat seat takes over.
   // No second sprite or temporary hat is created during the drop.
   const end=site.supports.pose('cat-hat','hat'),from=end.p.clone();from.y+=1.4;
   e.body.setBodyType(site.world.rapier.RigidBodyType.KinematicPositionBased,false);
   await stage.tween(stage.reducedMotion?.01:.45,u=>{e.body.setTranslation(from.clone().lerp(end.p,u*u),false);e.body.setRotation(end.q,false);site.world.sync(e);});
   await wear(next);audio.play('tap-bonk',{gain:.6});cat.playEmote('hop','hat');return true;
  }finally{busy=false;}
 }
 site.spells.triangle=()=>drop();
 // Older party rewards saved a worn hat without creating a rack keepsake.
 if(HAT_NAMES.includes(store.get('hat')))stage.onEarly.push(()=>rack.ready({quiet:true}));
 return {find:'hat',config:HAT,drop,wear,cycle,get wearing(){return rack.wearing;},get busy(){return busy;},get count(){return count;},hats:HAT_NAMES,get next(){return unlockNext();},again:()=>site.cast('triangle')};
}
