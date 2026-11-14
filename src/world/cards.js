import {forPicture} from '../core/cat.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {cardGeometry} from './card-geometry.js';
import {printStock} from './card-print.js';
import {createPinboard} from './pinboard.js';
import {clearOfCat,fitResting,floorHome} from '../core/floor-home.js';
const STOCK={paper:{width:.42,height:.525,thickness:.0015,curl:.008,mass:.015},postcard:{width:.51,height:.34,thickness:.003,curl:.003,mass:.025},ticket:{width:.54,height:.243,thickness:.002,curl:.005,mass:.012,ticket:true},recipe:{width:.38,height:.25,thickness:.0018,curl:.004,mass:.012}};
export function cardService(site){return site.cards??=(createCards(site));}
function createCards(site){
 const {THREE:T,stage,world,keepsakes,supports,store}=site;
 site.pinboard??=createPinboard(site);
 function create(id,inst,transcript){
  const root=new T.Group();inst.physical=true;inst.transcript=transcript;inst.cardDimensions={...STOCK[id]};
  const legacy=!!store.get('keepsakes.'+id),saved=store.get('worldBodies.'+id);
  supports.discover(id);
  inst.worldTask=(async()=>{
   await Promise.all([world.ensure(),stage.ensureEnv(),document.fonts.ready]);if(keepsakes.get(id)!==inst)return;
   const spec=STOCK[id],shape=cardGeometry(T,spec),prints=['front','back'].map(side=>printStock(T,id,side,transcript));
   const mats=prints.map(({texture})=>forPicture(new T.MeshStandardMaterial({map:texture,roughness:id==='postcard'?.53:.94,metalness:0})));
   mats.push(forPicture(new T.MeshStandardMaterial({color:id==='ticket'?0xc5ad82:0xcac3b2,roughness:.96})));
   const visual=new T.Mesh(shape.geometry,mats);inst.cardArt=visual;inst.prints=prints;
   root.add(new T.Mesh(shape.geometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide})));
   const vertices=[...new Map(shape.shapes.flatMap(s=>{const out=[];for(let n=0;n<s.points.length;n+=3)out.push(new T.Vector3(...s.points.slice(n,n+3)));return out;}).map(v=>[v.toArray().join(','),v])).values()];
   inst.colliderVertices=vertices;inst.colliderShapes=shape.shapes;
   const picture=createMeshPicture(site,root,visual,vertices);inst.picture=picture;
   const rotation=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2+(legacy||stage.reducedMotion?0:.22),0,id==='paper'?-.08:.06));
   const position=site.worldLayout.anchor(inst.px.x,Math.min(inst.box.y+inst.box.h-24,site.worldLayout.floorY()));
   position.y=-Math.min(...vertices.map(v=>v.clone().applyQuaternion(rotation).y))+.002+(legacy||stage.reducedMotion?0:.18);
   if(!saved)position.copy(clearOfCat(site,vertices,rotation,position,{sideways:true}));
   // Where it may rest is the shared rule (floor-home.js fitResting); the world calls it, never on a same-layout restore.
   const radius=Math.max(...vertices.map(v=>v.length()));
   const resize=e=>fitResting(site,e,vertices,{reach:radius});
   const normal=new T.Vector3(),force=new T.Vector3(),point=new T.Vector3();
   const beforeStep=(dt,e)=>{
    if(e.body.translation().y<radius*.12)return;
    // Passive drag at a slightly off-centre pressure point. F dot v <= 0;
    // no authored rotations, fake flutter loop or torque added at rest.
    normal.set(0,0,1).applyQuaternion(e.body.rotation());const v=e.body.velocityAtPoint(point.set(.008,.014,0).applyQuaternion(e.body.rotation()).add(e.body.translation()));
    const speed=normal.dot(v),m=e.body.mass();force.copy(normal).multiplyScalar(-Math.sign(speed)*Math.min(Math.abs(speed)*m*.18,speed*speed*.05*dt));
    e.body.applyImpulseAtPoint(force,point,false);
   };
   const sync=e=>{inst.resting=!!e.support||e.body.isSleeping();if(site.world.held?.entry===e)site.pinboard.guide(e);turn(inst,root);picture.draw();site.pinboard.overBoard(root,picture);keepsakes.syncWorld(inst,picture.rect);site.worldLayout.shadow(inst);};
   await site.pinboard.ensure();
   // A card that arrives at its collection slot (no spot given) lies on the floor now, never pinned (playtest 3), so it
   // takes the shared floor search like every other new prop: clear of the furniture, him and the other props.
   // clearOfCat judges the spot at the card's resting height (integration, playtest-3): judged at the height it falls
   // in from, it met his chest above a planned floor spot that is clear of him and shoved the card sideways onto the
   // next prop's spot (world-layout at 1536x864: the ticket 150 px right, under the tin).
   if(inst.autoHome&&!saved&&!legacy){const p=await floorHome(site,inst,vertices,rotation,position);if(keepsakes.get(id)!==inst)return;
    const rest=-Math.min(...vertices.map(v=>v.clone().applyQuaternion(rotation).y))+.002,c=clearOfCat(site,vertices,rotation,p.clone().setY(rest),{sideways:true});position.set(c.x,p.y,c.z);}
   const entry=await world.add({id,object:root,shapes:shape.shapes,mass:spec.mass,position,rotation,persist:true,sleeping:legacy||stage.reducedMotion,
    material:{linearDamping:.35,angularDamping:3,friction:.8,restitution:.02,skin:.001,softCcdPrediction:.03},beforeStep,sync,resize,presentation:picture,
    rest:()=>keepsakes.saveWorld(inst),tap:ev=>inst.def.tap?.(inst,ev,site),home:()=>{const p=site.worldLayout.anchor(stage.width*.65);p.y=1.2;return p;}});
   if(keepsakes.get(id)!==inst){world.remove(id);picture.dispose();return;}
   // A click or tap is the card's own (playtest 3, Aaron: "Only the physics paper and the cake recipe paper actually
   // need to open up to a page like this. Clicking the void paper and flipping it was fine"): the paper and the recipe
   // open their page (src/world/card-sheet.js), the postcard flips in place, the ticket wiggles. Press and move drags
   // every card (playtest 2). No 3D reader page any more.
   // Loose cards pass by pinned ones (src/world/pinboard.js cardGroups: lifting one from under another).
   if(!entry.support)site.pinboard.cardGroups(entry,false);
   inst.worldEntry=entry;entry.gripHeight=spec.height*.4;entry.grabbed=()=>{inst.autoHome=false;inst.resting=false;};
   world.sync(entry);inst.worldReady=true;inst.moveWorld=screen=>{
    supports.detach(entry);entry.grabbed();const p=site.worldLayout.anchor(screen.x,screen.y),q=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0));
    p.y=-Math.min(...vertices.map(v=>v.clone().applyQuaternion(q).y))+.002;entry.body.setTranslation(p,false);entry.body.setRotation(q,false);entry.body.setLinvel({x:0,y:0,z:0},false);entry.body.setAngvel({x:0,y:0,z:0},false);world.wake(entry);world.sync(entry);
   };
   // Restore support adoption needs the instance's public entry before its hooks.
   if(entry.support)supports.update(entry.support.id);
   site.pinboard.arrive(inst);world.save(entry);keepsakes.saveWorld(inst);
  })().catch(error=>{inst.worldError=String(error);console.error('world card',id,error);});return root;
 }
 function define(def,transcript){
  supports.registerCategory(def.id,'flat');
  return keepsakes.define({...def,kind:'gl',make:null,object:(_,inst)=>create(def.id,inst,transcript),place(){},removed(inst){world.remove(inst.id);site.worldLayout.remove(inst.id);inst.picture?.dispose();inst.cardArt?.geometry.dispose();for(const m of inst.cardArt?.material||[])m.dispose();for(const p of inst.prints||[])p.texture.dispose();store.del('worldBodies.'+inst.id);site.pinboard.invalidate();}});
 }
 function flip(inst){
  if(inst.worldEntry?.support){site.pinboard.flip(inst);return;}
  inst.setState({flipped:!inst.state.flipped});const e=inst.worldEntry;if(!e)return;
  const q=new T.Quaternion().copy(e.body.rotation()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));
  e.body.setRotation(q,true);const p=e.body.translation();e.body.setTranslation({x:p.x,y:p.y+.02,z:p.z},true);world.wake(e);
 }
 // The ticket's tap (playtest 3: back to its tap-wiggle, no page). On the board it swings on its pin (supports.swing);
 // on the floor its picture turns a few degrees either way and back, the keepsakes' own wiggle (hush.css k-wiggle),
 // about its middle, over .45 s. Event-driven; nothing runs once it is still. Reduced motion: no turn.
 const WIGGLE={seconds:.45,keys:[[0,0],[.25,-7],[.55,5],[.8,-2],[1,0]]};
 const _z=new T.Vector3(0,0,1),_q=new T.Quaternion();
 // The wiggle's turn on top of the body's pose: applied by the card's own sync while the body is awake (the tap's
 // press woke it), and by the frame below while it sleeps.
 function turn(inst,root){
  if(!inst.wiggleStart)return;const e=inst.worldEntry,u=(performance.now()-inst.wiggleStart)/1000/WIGGLE.seconds;
  if(u>=1||!e||e.support||world.held?.entry===e){inst.wiggleStart=0;return;}
  const k=WIGGLE.keys,n=k.findIndex(p=>p[0]>=u),a=k[Math.max(0,n-1)],b=k[Math.max(0,n)],t=b[0]>a[0]?(u-a[0])/(b[0]-a[0]):1,s=t*t*(3-2*t);
  root.quaternion.multiply(_q.setFromAxisAngle(_z,(a[1]+(b[1]-a[1])*s)*Math.PI/180));root.updateMatrixWorld(true);
 }
 function wiggle(inst){
  const e=inst?.worldEntry;if(!e)return false;
  if(e.support)return supports.swing(e,1);
  if(stage.reducedMotion||world.held?.entry===e||inst.picture?.attached)return false;
  inst.wiggleStart=performance.now();const root=inst.object;
  const frame=()=>{
   if(keepsakes.get(inst.id)!==inst||e.support)return;
   root.quaternion.copy(e.body.rotation());turn(inst,root);root.updateMatrixWorld(true);inst.picture.draw(true);
   if(inst.wiggleStart)requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);return true;
 }
 // Reading is the card's own (the paper's and the recipe's page); the others have none.
 return {define,read:id=>{const i=keepsakes.get(id);return i?.def.read?.(i);},flip,wiggle,stock:STOCK};
}
