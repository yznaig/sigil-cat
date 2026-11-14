import {createChargedTop} from './charged-top.js';
import {createTopSpin} from './top-spin.js';
import {fetchSplat} from './splats.js';
import {createPropPicture,splatExtremes} from './prop-picture.js';
import {floorHome,fitResting} from './floor-home.js';
const FILES={rifle:'assets/splats/awp-1.spz',top:'assets/splats/top-1.spz'};
// Art, collider, input proxy and floor silhouette share one body-local coordinate system.
export function createWorldProps(site){
 const {stage,THREE:T,world,keepsakes}=site,loads=new Map(),charged=createChargedTop(site),topSpin=createTopSpin(site);
 const load=id=>{if(!loads.has(id))loads.set(id,fetchSplat(new URL('../../'+FILES[id],import.meta.url).href));return loads.get(id);};
 function create(id,inst){
  const root=new T.Group();inst.physical=true;inst.elapsed=6;
  inst.worldTask=(async()=>{
   await new Promise(r=>stage.early?r():stage.onEarly.push(r));
   const [data,baked]=await Promise.all([load(id),fetch(new URL('../../'+FILES[id].replace('.spz','.colliders.json'),import.meta.url)).then(r=>{if(!r.ok)throw Error('Collider HTTP '+r.status);return r.json();})]);await world.ensure();if(keepsakes.get(id)!==inst)return;
   const position=site.worldLayout.anchor(inst.px.x,inst.box.y+inst.box.h-30);
   const length=id==='rifle'?data.max[0]-data.min[0]:data.max[1]-data.min[1];
   // The 2D saved home is a projected drag box, not a physical size reference.
   // Reconstructing size from it after a drag changed both art and colliders.
   const savedScale=site.store.get('worldBodies.'+id+'.adapter.artScale');
   const scale=Number.isFinite(savedScale)&&savedScale>0?savedScale:inst.w/stage.pxPerUnit(position)/length;
   const offset=new T.Vector3(-(data.min[0]+data.max[0])*scale/2,-data.min[1]*scale,-(data.min[2]+data.max[2])*scale/2);
   const shapes=[],vertices=[];
   for(const [index,hull] of baked.hulls.entries()){
    const a=new Float32Array(hull.length);
    for(let n=0;n<hull.length;n+=3){const p=new T.Vector3(hull[n],hull[n+1],hull[n+2]).multiplyScalar(scale).add(offset);p.toArray(a,n);vertices.push(p);}
    shapes.push({type:'hull',points:Array.from(a),massFraction:id==='rifle'?[.75,.15,.1][index]:1});
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(a,3));geometry.computeVertexNormals();
    const proxy=new T.Mesh(geometry,new T.MeshBasicMaterial({visible:false}));root.add(proxy);
   }
   inst.colliderShapes=shapes;
   inst.colliderVertices=[...new Map(vertices.map(v=>[v.toArray().join(','),v])).values()];
   const picture=createPropPicture(site,root,data,scale,offset,inst.colliderVertices);inst.picture=picture;
   const rotation=new T.Quaternion().setFromEuler(new T.Euler(id==='rifle'?-.7:.15,0,.08));
   position.y=stage.reducedMotion?0:.15;
   if(stage.reducedMotion)position.y=-Math.min(...vertices.map(p=>p.clone().applyQuaternion(rotation).y))+.003;
   // A fresh rifle takes clear floor like the other loose props; it used to drop
   // onto whatever already rested at its 2D home (crumbs, flour) and rattle on
   // them. The small top keeps its arrival home (its drag-to-shelf path is clear).
   // Its place is planned with the splat's own reach too (integration, playtest-3): the scope stands above the hull, and
   // a card planned just behind the hull's box was drawn under the scope (world-layout at 1536x864: the postcard, 33%).
   if(id==='rifle'&&!site.store.get('worldBodies.'+id))position.copy(await floorHome(site,inst,[...inst.colliderVertices,...splatExtremes(T,data,scale,offset)],rotation,position));if(keepsakes.get(id)!==inst)return;
   // Where it may rest is the shared rule (floor-home.js fitResting); the world calls it, never on a same-layout restore.
   const radius=Math.max(...inst.colliderVertices.map(v=>v.length()));
   const resize=entry=>fitResting(site,entry,vertices,{reach:radius*1.5});
   const sync=entry=>{inst.resting=entry.body.isSleeping();picture.card.visible=root.visible;picture.draw();keepsakes.syncWorld(inst,picture.rect);site.worldLayout.shadow(inst);};
   const entry=await world.add({id,object:root,shapes,mass:id==='rifle'?1.2:.2,position,rotation,persist:true,sleeping:stage.reducedMotion,sync,resize,presentation:picture,adapterState:{version:1,artScale:scale},
    rest:()=>{inst.elapsed=6;keepsakes.saveWorld(inst);},tap:e=>inst.def.tap(inst,e,site),
    home:()=>{const p=site.worldLayout.anchor(inst.px.x);p.y=1.2;return p;}});
   if(keepsakes.get(id)!==inst){world.remove(id);picture.dispose();return;}
   inst.worldEntry=entry;inst.worldReady=true;inst.resting=entry.body.isSleeping();
   if(!entry.body.isSleeping()){entry.body.setAngvel({x:.4,y:.2,z:.4},true);}
   // The rifle's .4 let it roll on its round barrel for seconds (playtest-2, physics lane, item 1): 1.2.
   entry.body.setAngularDamping(entry.damping.angular=id==='top'?.8:1.2);
   world.save(entry);
   if(id==='top'&&inst.state.charged)charged.charge(inst);
  })().catch(e=>{inst.worldError=String(e);console.error('world prop',id,e);});return root;
 }
 function tap(inst){if(inst.state.charged)return;const e=inst.worldEntry;if(!e||stage.reducedMotion)return;
  // The top rights itself and spins where it is (src/core/top-spin.js), on the shelf too.
  if(inst.id==='top'){topSpin.spin(inst);return;}
  if(e.support)site.supports.detach(e);
  e.body.applyImpulse({x:.02,y:.05,z:0},true);
  world.wake(e);
 }
 function remove(inst){if(topSpin.spinning===inst)topSpin.stop();if(inst.state.charged)charged.stop();world.remove(inst.id);site.worldLayout.remove(inst.id);inst.picture?.dispose();for(const p of inst.object.children){p.geometry?.dispose();p.material?.dispose();}site.store.del('worldBodies.'+inst.id);}
 return {create,tap,remove,charged,topSpin};
}
