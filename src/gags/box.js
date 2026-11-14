// Square's original pop-in, once. Afterwards this is the kitchen's chest (e1111-61): closed until clicked, a click
// opens it (lid, sound, the chest screen); click-and-hold still lifts the physical box, and shaking it bakes.
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {puff} from '../core/puff.js';
import {solidDefinition,bakeSolid} from '../world/solid.js';
import {preparedShapes,shapeVertices,disposeArt} from '../world/ingredients.js';
import {createRecipes} from '../world/recipes.js';
import {GROUPS} from '../core/world.js';
// fling: the first box's send-off when he pops out: seconds in the air, least upward speed (units/s), how far to the
// side when it has no place yet (x speed), and its tumble (rad/s about x, y and z)
export const BOX={size:.84,aspect:.74,stay:2.6,fling:{time:.6,up:2.2,side:.6,carry:1,spin:[.5,.6,1.6]}};
export default function createBox(site){
 const {THREE:T,stage,cat,world,keepsakes,store,audio}=site;
 let create,physics,lidPhysics;const stats={tipped:0,flings:0};
 const recipe=createRecipes(site);let busy=false,inside=false,count=0,changing=false;
 audio.loadAll(['box-thud','tap-pop','chest-open','chest-close','click','paper']);
 solidDefinition(site,{id:'box',category:'container',label:'the baking box',size:BOX.size,aspect:BOX.aspect,home:()=>({x:1.15,y:-.38}),tap:()=>recipe.openChest(),removed(i){recipe.removeBox(i);i.object.geometry.dispose();if(i.solidArt)disposeArt(i.solidArt);}},async inst=>{
  ({create,physics,lidPhysics}=await import('../../assets/models/prepared/box.js'));
  const s=store.get('worldBodies.box.adapter.artScale',recipe.state.artScale);
  const model=create({open:recipe.state.open}),lid=model.getObjectByName('lid');model.remove(lid);lid.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
  const shell=bakeSolid(T,model);shell.geometry.scale(s,s,s);
  lid.position.set(0,0,0);lid.rotation.set(0,0,0);const lidMesh=bakeSolid(T,lid);lidMesh.geometry.scale(s,s,s);
  const visual=new T.Group(),hinge=new T.Group();hinge.position.set(0,.38*s,-.23*s);hinge.rotation.x=recipe.state.open?-Math.PI:0;hinge.add(lidMesh);visual.add(shell,hinge);
  const shapes=preparedShapes(T,physics,s);shapes.push({...preparedShapes(T,lidPhysics,s)[0],offset:new T.Vector3(0,.386*s,.004*s),massFraction:.04/.29});
  for(let i=0;i<5;i++)shapes[i].massFraction=.25/.29/5;
  const vertices=shapeVertices(T,shapes),pictureVertices=vertices;
  inst.chainScale=s;inst.hinge=hinge;inst.lidMesh=lidMesh;
  // Pick shell and lid only, never the empty cavity or its composite contents.
  const pick=pickGeometry(shell,hinge);
  return {visual,pickGeometry:pick,pictureVertices,shapes,vertices,mass:.29,height:.38*s,adapterState:{version:1,artScale:s},material:{friction:.78,restitution:.025,linearDamping:.5,angularDamping:1.5,skin:.0006,softCcdPrediction:.08},sound:{material:'paper',size:'medium'},
   ready(e){e.deferGrab=true;e.interior={min:[-.286*s,.014*s,-.216*s],max:[.286*s,.38*s,.216*s]};e.released=()=>{world.save(e,true);recipe.save(true);};setLidCollider(inst);recipe.registerBox(inst,{toggle,setOpen,cancel:()=>cancelGrip?.(),get moving(){return changing;}});},
   beforeStep:(dt,e)=>recipe.boxStep(dt,e),rest:()=>recipe.save()
  };
 });
 function pickGeometry(shell,hinge){
  hinge.updateMatrix();const lid=hinge.children[0].geometry.clone().applyMatrix4(hinge.matrix),base=shell.geometry.clone();base.clearGroups();lid.clearGroups();const g=mergeGeometries([base,lid]);base.dispose();lid.dispose();return g;
 }
 function setLidCollider(i){
  const s=i.chainScale,h=i.hinge,c=i.worldEntry.body.collider(5),q=h.quaternion;
  const center=new T.Vector3(0,.006*s,.234*s).applyQuaternion(q).add(h.position);
  c.setTranslationWrtParent(center);c.setRotationWrtParent(q);
  const shapes=preparedShapes(T,physics,s);shapes.push({half:[.304*s,.006*s,.234*s],offset:center,rotation:q});i.colliderVertices.splice(0,i.colliderVertices.length,...shapeVertices(T,shapes));
  i.picture.invalidate();world.sync(i.worldEntry);
 }
 async function setOpen(open){
  const i=keepsakes.get('box');if(!i?.worldEntry||changing||busy)return false;
  if(recipe.state.open===open)return true;cancelGrip?.();changing=true;const grabbable=i.worldEntry.canGrab;i.worldEntry.canGrab=false;
  // Nothing is lost in the box (playtest-2, physics lane, item 2): what rests on the lid is tipped off before it
  // opens, and anything inside is tipped out before it shuts.
  // The swinging lid meets only the room (world.js GROUPS) so it cannot swat a tipped item back in; a shutting lid also
  // waits a moment for what it tipped out to clear the box.
  const tipped=(open?onLid(i):within(i));for(const e of tipped)tipOff(i,e,open?.5:.7);
  if(tipped.length&&!open&&!stage.reducedMotion)await stage.after(.75);
  const lid=i.worldEntry.body.collider(5);lid.setCollisionGroups(GROUPS.hook);
  const a=i.hinge.rotation.x,b=open?-Math.PI:0;recipe.state.open=open;recipe.save(true);
  await stage.tween(stage.reducedMotion?0:.24,k=>{i.hinge.rotation.x=a+(b-a)*k;setLidCollider(i);world.wake(i.worldEntry);});
  lid.setCollisionGroups(GROUPS.item);
  const old=i.object.geometry;i.object.geometry=pickGeometry(i.solidArt.children[0],i.hinge);old.dispose();site.worldLayout.remove('box');site.worldLayout.shadow(i);
  changing=false;i.worldEntry.canGrab=grabbable;world.save(i.worldEntry,true);recipe.save(true);return true;
 }
 const toggle=()=>recipe.screen.isOpen?recipe.screen.close():recipe.openChest();
 // ---- Nothing is lost in the box (playtest-2, physics lane, item 2) ----
 // "if I put something ontop of the box and then open it, the item falls into it and I cant get it out": the lid's
 // collider swings away from under it. Whatever rests on the closed lid (or on something resting there) is tipped off
 // to the front corner nearer to it, landing beside the box; anything found inside when the lid shuts is tipped out
 // the same way. Positions are judged in the box's own frame (the prepared art's interior, at the box's scale).
 const _q=new T.Quaternion(),_l=new T.Vector3();
 function local(i,p){const b=i.worldEntry.body;_q.copy(b.rotation()).invert();return _l.copy(p).sub(b.translation()).applyQuaternion(_q).divideScalar(i.chainScale);}
 const loose=e=>e&&e.id!=='box'&&!e.fixed&&!e.support&&!e.timer&&e.canGrab!==false&&e.body.isEnabled()&&e.body.isDynamic();
 function onLid(i){
  const out=[];for(const e of world.entries.values()){if(!loose(e))continue;const p=local(i,e.body.translation());
   if(Math.abs(p.x)<.36&&Math.abs(p.z)<.3&&p.y>.36&&p.y<1.6)out.push(e);}
  return out;
 }
 function within(i){
  const out=[];for(const e of world.entries.values()){if(!loose(e))continue;const p=local(i,e.body.translation());
   if(Math.abs(p.x)<.3&&Math.abs(p.z)<.23&&p.y>0&&p.y<.4)out.push(e);}
  return out;
 }
 function tipOff(i,e,t){
  if(world.held?.entry===e)world.release();
  const b=i.worldEntry.body,s=i.chainScale,q=new T.Quaternion().copy(b.rotation()),centre=new T.Vector3().copy(b.translation());
  const p=new T.Vector3().copy(e.body.translation()),mine=local(i,p).clone();
  // the nearer side, unless that lands off the page; always a little toward the front (the lid hinges at the back)
  const land=side=>new T.Vector3(side*(.3*s+e.reach+.05),0,.2*s).applyQuaternion(q).add(centre);
  const onPage=v=>{const t=stage.toScreen(v);return t.x>24&&t.x<stage.width-24&&t.y<stage.height-stage.insets.bottom-12;};
  let side=mine.x>=0?1:-1;if(!onPage(land(side))&&onPage(land(-side)))side=-side;
  const to=land(side);to.y=e.reach*.6;
  if(stage.reducedMotion){e.body.setTranslation(to,true);e.body.setLinvel({x:0,y:0,z:0},true);e.body.setAngvel({x:0,y:0,z:0},true);}
  else{e.body.setLinvel({x:(to.x-p.x)/t,y:(to.y-p.y)/t+4.905*t,z:(to.z-p.z)/t},true);e.body.setAngvel({x:0,y:0,z:-side*2},true);}
  world.wake(e);world.save(e,true);stats.tipped++;
 }
 async function drop(){
  if(busy||cat.hidden||cat.standIn)return false;
  count++;const i=keepsakes.get('box')||keepsakes.give('box');await i.worldTask;
  if(recipe.state.intro){/* text lane: the cat says the intro (e1112-32) */site.ui.speak?.(['tap the box to open it; hold to lift it.','something could be baked in there.'])??site.ui.say('tap the box to open it; hold to lift it. something could be baked in there.');return true;}
  busy=true;recipe.state.intro=true;recipe.save(true);const e=i.worldEntry,p=new T.Vector3().copy(e.body.translation()),q=new T.Quaternion().copy(e.body.rotation());
  e.canGrab=false;world.park(e);world.disable(e);
  const target=site.worldLayout.anchor(cat.rect.cx||stage.width/2,cat.screenOf([0,0,0]).y+8);target.y=.004;
  const from=target.clone();from.y=stage.height/stage.pxPerUnit(target)+1;
  await stage.tween(stage.reducedMotion?0:.42,k=>{e.body.setTranslation(from.clone().lerp(target,k*k),false);e.body.setRotation({x:0,y:0,z:0,w:1},false);world.sync(e);});
  audio.play('box-thud',{gain:.7});const mid=cat.screenOf([0,cat.height*.4,0]);puff(mid.x,mid.y,cat.rect.ppu*cat.height*.9);cat.hide('box',true);cat.hideShadow('box',true);inside=true;
  // Small solid ear silhouettes preserve the original moment; they leave with him.
  const ears=new T.Group(),mat=new T.MeshStandardMaterial({color:0x171514,roughness:.8});
  for(const x of [-.12,.12]){const m=new T.Mesh(new T.ConeGeometry(.07*i.chainScale,.18*i.chainScale,3),mat);m.position.set(x*i.chainScale,.43*i.chainScale,.02);ears.add(m);}i.solidArt.add(ears);i.picture.invalidate();i.picture.draw();
  await stage.after(BOX.stay);inside=false;cat.hide('box',false);cat.hideShadow('box',false);cat.playEmote('hop','out of the box');audio.play('tap-pop',{gain:.5});i.solidArt.remove(ears);disposeArt(ears);i.picture.invalidate();
  // He bursts out and the box is flung off him (playtest 2): a real throw, up and off to the side toward where it was
  // (its place in the room), turning over once on the way, and physics lands it (a bounce, a skid, sometimes a topple).
  // Reduced motion: it is simply set back where it was.
  if(stage.reducedMotion){e.body.setTranslation(p,false);e.body.setRotation(q,false);world.sync(e);e.body.setEnabled(true);}
  else{
   const F=BOX.fling,from=new T.Vector3(target.x,target.y+.05,target.z),d=new T.Vector3(p.x-from.x,0,p.z-from.z),far=d.length();
   const side=far>.05?Math.sign(d.x)||1:((cat.rect.cx||stage.width/2)>stage.width/2?-1:1);
   if(far<=.05)d.set(side*F.side*F.time,0,0);
   // A ballistic arc of F.time seconds to its place, at least F.up upward (the horizontal speed allows for the body's
   // own damping), with a tilt over to the side that it lands out of: it hits on a corner and rocks back onto its base.
   const t=F.time,lin=e.body.linearDamping(),vy=Math.max(F.up,(p.y-from.y)/t+.5*9.81*t),drag=F.carry;   // the skid after landing carries it the rest of the way
   // The box sits where his body is: he stays out of the physical world until it has flown clear of him.
   world.cat?.suspend('box-fling',true);stage.after(.55).then(()=>world.cat?.suspend('box-fling',false));
   e.body.setTranslation(from,false);e.body.setRotation(q,false);e.body.setEnabled(true);
   e.body.setLinvel({x:d.x/t*drag,y:vy,z:d.z/t*drag},true);e.body.setAngvel({x:F.spin[0],y:side*F.spin[1],z:-side*F.spin[2]},true);
   stats.flings++;
  }
  e.canGrab=true;world.wake(e);world.save(e,true);busy=false;return true;
 }
 // Box-specific click/hold semantics, without changing other adapters' input.
 let cancelGrip=null;site.input.onEscape.push(()=>cancelGrip?.());site.input.onLock.push(()=>cancelGrip?.());
 site.input.claim(96,ev=>{
  const i=keepsakes.get('box'),e=i?.worldEntry;if(!e||busy||changing)return null;
  const hit=site.worldInput.pick(ev);if(hit?.entry!==e)return null;
  const start={x:ev.clientX,y:ev.clientY},ray=new T.Raycaster(),plane=new T.Plane().setFromNormalAndCoplanarPoint(stage.camera.getWorldDirection(new T.Vector3()),hit.point);
  let held=false,moved=false,canceled=false,bar=null;
  const depth=delta=>{if(world.held?.entry!==e)return;const d=stage.camera.getWorldDirection(new T.Vector3()).multiplyScalar(delta);world.move(world.held.target.clone().add(d));plane.translate(d);};
  const wheel=v=>{if(!held)return;v.preventDefault();v.stopImmediatePropagation();depth(site.worldInput.wheelDepth(v));};
  const begin=()=>{if(!held&&!canceled){held=true;world.grab(e,hit.point);i.autoHome=false;
   // Scroll down brings it nearer; Nearer/Deeper only on touch (e1111-58, notes 4 and 6; world-input.js).
   bar=site.worldInput.gripBar(depth,'Held box placement');
   stage.canvas.addEventListener('wheel',wheel,{capture:true,passive:false});
  }};
  const timer=setTimeout(begin,220),clean=()=>{clearTimeout(timer);bar?.remove();stage.canvas.removeEventListener('wheel',wheel,true);cancelGrip=null;};
  cancelGrip=()=>{canceled=true;clean();if(world.held?.entry===e)world.release();};
  return {move(v){if(canceled)return;if(Math.hypot(v.clientX-start.x,v.clientY-start.y)<8&&!moved)return;moved=true;clearTimeout(timer);begin();ray.setFromCamera(new T.Vector2(v.clientX/stage.width*2-1,1-v.clientY/stage.height*2),stage.camera);const p=ray.ray.intersectPlane(plane,new T.Vector3());if(p)world.move(p);},end(v){clean();if(held&&world.held?.entry===e)world.release();if(v.type==='pointerup'&&!held&&!moved&&!canceled)toggle();}};
 });
 site.spells.square=drop;
 return {find:'box',config:BOX,drop,toggle,setOpen,recipe,get busy(){return busy;},get inside(){return inside;},get napping(){return false;},get count(){return count;},get lidMoving(){return changing;},stats,onLid:()=>{const i=keepsakes.get('box');return i?.worldEntry?onLid(i).map(e=>e.id):[];},within:()=>{const i=keepsakes.get('box');return i?.worldEntry?within(i).map(e=>e.id):[];},again:()=>site.cast('square')};
}
