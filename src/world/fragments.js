import {defineSmallBody,hop} from './small-body.js';
import {bakeSolid} from './solid.js';
import {meshAtlas} from '../core/mesh-atlas.js';
// What a gag leaves on the floor: the bread's crumbs, the glass's shards. Small physical bodies (small-body.js).
const MODELS={
  crumbs:()=>import('../../assets/models/prepared/world-detail/crumbs.js'),
  shards:()=>import('../../assets/models/prepared/world-detail/shards.js'),
};
export function defineCrumbs(site) {
  return defineSmallBody(site,{id:'crumbs',label:'the crumbs',size:.34,aspect:.3,home:()=>({x:-.5,y:-.2}),
    tap(inst){site.audio.play('bite',{gain:.3,rate:1.3});hop(site,inst);}
  },MODELS.crumbs,{fitLobes:3,sound:{material:'butter',size:'small'}});
}
export function defineShards(site) {
  return defineSmallBody(site,{id:'shards',label:'the broken glass',size:.3,aspect:.46,home:()=>({x:.75,y:-.5}),
    tap(inst){if(site.stage.reducedMotion)site.audio.play('hit',{gain:.28,rate:1.8});else hop(site,inst,.3);}
  },MODELS.shards,{fitLobes:3,sound:{material:'glass',size:'small'},material:{friction:.65,restitution:.02,linearDamping:.65,angularDamping:2.8,skin:.001,softCcdPrediction:.08}});
}
// Playtest 3 (gags lane): "the bread crumbs just popped out of no where ... the glass shards seemed to appear way after
// the glass broke". Two causes, measured: the first one built its materials' shader programs in the picture atlas
// live (about a second), and floor-home planned a spot for it somewhere free on the floor. Now the gag that will leave
// one warms it ahead (warmFragment: the model, the physics world, the environment and those programs, once, in the
// background), and gives it where it comes from: a body at `from` (world units), landing near `land`, never through
// floor-home's search.
const warmed=new Map();
export function warmFragment(site,id){
  if(!warmed.has(id))warmed.set(id,Promise.all([MODELS[id](),site.world.ensure(),site.stage.ensureEnv()]).then(([m])=>{
    const source=m.create(),v=bakeSolid(site.THREE,source),mats=Array.isArray(v.material)?v.material:[v.material];
    source.traverse(o=>o.geometry?.dispose());
    return meshAtlas(site).warm(mats).finally(()=>v.geometry.dispose());
  }).catch(e=>{warmed.delete(id);console.warn('warm '+id+':',e?.message);}));
  return warmed.get(id);
}
// prepareFragment builds it at once, hidden and out of the physical world (and unnoticed by the recycling bin), so a
// gag can pay for the build early; show() puts it in at `from`, moving at `velocity`, turning at `spin`, at once.
// cancel() takes it back if it was never shown. spawnFragment does both in one go.
export function prepareFragment(site,id,land){
  const {THREE:T,stage,keepsakes,world}=site,at=stage.toScreen(land),waiting=site.fragmentsWaiting??=new Set();
  waiting.add(id);
  const inst=keepsakes.give(id,{at:keepsakes.toUnits(at.x,site.worldLayout.floorY())});
  if(!inst||keepsakes.get(id)!==inst){waiting.delete(id);return null;}
  inst.explicitPlacement=true;                      // its own spot (floor-home.js keeps it), not a planned one
  let shown=false;
  inst.worldTask.then(()=>{const e=inst.worldEntry;if(!e||shown)return;e.body.setEnabled(false);inst.object.visible=false;world.sync(e);});
  return {inst,ready:inst.worldTask,
    async show({from,velocity={x:0,y:0,z:0},spin={x:0,y:0,z:0},yaw=0}){
      shown=true;await inst.worldTask;waiting.delete(id);
      const e=inst.worldEntry;if(!e||keepsakes.get(id)!==inst)return null;
      const calm=stage.reducedMotion,zero={x:0,y:0,z:0};
      e.body.setTranslation(from,false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(0,yaw,0)),false);
      e.body.setLinvel(calm?zero:velocity,false);e.body.setAngvel(calm?zero:spin,false);
      if(!e.body.isEnabled())e.body.setEnabled(true);inst.object.visible=true;
      world.wake(e);world.sync(e);site.eggs.recycle?.noticed?.(inst);
      return inst;
    },
    cancel(){waiting.delete(id);if(!shown&&keepsakes.get(id)===inst)keepsakes.take(id);},
  };
}
export function spawnFragment(site,id,{land,...motion}){
  const f=prepareFragment(site,id,land);return f?f.show(motion):Promise.resolve(null);
}
