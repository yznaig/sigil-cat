import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {forPicture} from '../core/cat.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {floorHome,fitResting} from '../core/floor-home.js';
// Bake prepared art once, including nested labels. Loose copies share geometry,
// materials and the dirty-tile pass; the pick mesh never renders a second copy.
export function bakeSolid(T,group){
 group.updateMatrixWorld(true);const geometries=[],materials=[];
 group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.clearGroups();geometries.push(g);materials.push(forPicture(o.material));});
 const geometry=mergeGeometries(geometries,true);for(const g of geometries)g.dispose();
 return new T.Mesh(geometry,materials);
}
export function solidDefinition(site,def,build){
 const {THREE:T,stage,world,keepsakes,store,supports}=site;
 supports.registerCategory(def.id,def.category||'solid');
 return keepsakes.define({...def,kind:'gl',make:null,place(obj,inst){def.place?.(obj,inst);},
  object(_,inst){
   const restoring=!!store.get('worldBodies.'+inst.id)||!!store.get('keepsakes.'+inst.id);
   const root=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));inst.physical=true;
   inst.worldTask=(async()=>{
    await Promise.all([world.ensure(),stage.ensureEnv(),document.fonts.ready]);if(keepsakes.get(inst.id)!==inst)return;
    const spec=await build(inst),visual=spec.visual;root.geometry=spec.pickGeometry||visual.geometry;
    inst.solidArt=visual;inst.colliderShapes=spec.shapes;inst.colliderVertices=spec.vertices;
    const picture=createMeshPicture(site,root,visual,spec.pictureVertices||spec.vertices,{batch:true});inst.picture=picture;
    const q=spec.rotation||new T.Quaternion(),legacy=!!store.get('keepsakes.'+inst.id),position=site.worldLayout.anchor(inst.px.x,inst.box.y+inst.box.h-20);
    position.y=-Math.min(...spec.vertices.map(v=>v.clone().applyQuaternion(q).y))+.002+(legacy||stage.reducedMotion?0:.15);
    if(!restoring)position.copy(await floorHome(site,inst,spec.vertices,q,position));
    // Where it may rest is the shared rule (floor-home.js fitResting); the world calls it, never on a same-layout restore.
    const resize=e=>fitResting(site,e,spec.vertices);
    const sync=e=>{if(inst.flight){def.place?.(root,inst);return;}inst.resting=!!e.support||e.body.isSleeping();spec.sync?.(e);picture.draw();keepsakes.syncWorld(inst,picture.rect);if(spec.shadow?.()!==false)site.worldLayout.shadow(inst);else site.worldLayout.remove(inst.id);};
    const entry=await world.add({id:inst.id,object:root,shapes:spec.shapes,mass:spec.mass,position,rotation:q,persist:true,sleeping:legacy||stage.reducedMotion,material:spec.material,adapterState:spec.adapterState,presentation:picture,sync,resize,
     beforeStep:spec.beforeStep,sound:spec.sound,rest:e=>{keepsakes.saveWorld(inst);spec.rest?.(e);},tap:ev=>def.tap?.(inst,ev,site),home:()=>{const p=site.worldLayout.anchor(inst.px.x);p.y=1.2;return p;}});
    inst.worldEntry=entry;entry.gripHeight=spec.height/2;entry.grabbed=()=>{inst.autoHome=false;inst.resting=false;};
    inst.moveWorld=screen=>{supports.detach(entry);const p=site.worldLayout.anchor(screen.x,screen.y);p.y=-Math.min(...spec.vertices.map(v=>v.clone().applyQuaternion(q).y))+.002;entry.body.setTranslation(p,false);entry.body.setRotation(q,false);entry.body.setLinvel({x:0,y:0,z:0},false);entry.body.setAngvel({x:0,y:0,z:0},false);world.wake(entry);world.sync(entry);};
    world.sync(entry);inst.worldReady=true;if(entry.support)supports.update(entry.support.id);spec.ready?.(entry);world.save(entry);keepsakes.saveWorld(inst);
   })().catch(e=>{inst.worldError=String(e);console.error('world solid',inst.id,e);});return root;
  },removed(inst){world.remove(inst.id);site.worldLayout.remove(inst.id);inst.picture?.dispose();inst.object.material.dispose();store.del('worldBodies.'+inst.id);def.removed?.(inst);}
 });
}
export function boxVertices(T,half,offset=[0,0,0]){const out=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])out.push(new T.Vector3(x*half[0]+offset[0],y*half[1]+offset[1],z*half[2]+offset[2]));return out;}
