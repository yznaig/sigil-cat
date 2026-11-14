import {bakeSolid} from './solid.js';
import {forPicture} from '../core/cat.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {floorHome,fitResting} from '../core/floor-home.js';
import {css} from '../core/util.js';

css('small-actions',`.world-small-actions button{min-width:44px;min-height:44px;max-width:calc(100vw - 48px);white-space:normal}`);

// Prepared art uses full sizes and Euler rotations. World uses hulls in body
// coordinates. Keeping this conversion here leaves the frozen solver API alone.
export function preparedShapes(T, physics, scale = 1) {
  const vertices = [], shapes = physics.colliders.map(c => {
    let points = c.vertices;
    if (c.type === 'box') {
      points = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) points.push([x*c.size[0]/2,y*c.size[1]/2,z*c.size[2]/2]);
    } else if (c.type === 'cylinder') {
      points = [];
      for (const y of [-c.height/2,c.height/2]) for (let n=0;n<24;n++) points.push([Math.cos(n*Math.PI/12)*c.radius,y,Math.sin(n*Math.PI/12)*c.radius]);
    }
    const q = new T.Quaternion().setFromEuler(new T.Euler(...(c.rotation || [0,0,0]))), p = new T.Vector3(...(c.position || [0,0,0]));
    const vs = points.map(a => new T.Vector3(...a).applyQuaternion(q).add(p).multiplyScalar(scale));
    vertices.push(...vs);
    return {type:'hull',points:vs.flatMap(v=>v.toArray())};
  });
  return {shapes,vertices};
}

export function disposeArt(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root?.traverse(o => { if(o.geometry)geometries.add(o.geometry); for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m); });
  for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  for(const t of textures)t.dispose(); for(const m of materials)m.dispose(); for(const g of geometries)g.dispose();
}

// Conservative preparation boxes leave visible air under some tumbled poses.
// Fit <=3 convex lobes to actual surface support points, once at construction.
// A bounded direction set keeps these much smaller than the rendering meshes.
function fitLobes(T,root,count) {
  const points=[];root.traverse(o=>{const a=o.geometry?.attributes.position;if(a)for(let n=0;n<a.count;n++)points.push(new T.Vector3().fromBufferAttribute(a,n));});
  const box=new T.Box3().setFromPoints(points),width=box.max.x-box.min.x;
  const bins=Array.from({length:count},()=>[]);
  for(const p of points)bins[Math.min(count-1,Math.floor((p.x-box.min.x)/width*count))].push(p);
  const directions=[];
  for(const x of [-1,0,1])for(const y of [-1,0,1])for(const z of [-1,0,1])if(x||y||z)directions.push(new T.Vector3(x,y,z).normalize());
  for(let n=0;n<96;n++){const y=1-2*(n+.5)/96,r=Math.sqrt(1-y*y),a=n*Math.PI*(3-Math.sqrt(5));directions.push(new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}
  const vertices=[],shapes=bins.map(bin=>{
    const unique=new Map();for(const dir of directions){let best=bin[0],dot=-Infinity;for(const p of bin){const d=dir.dot(p);if(d>dot){best=p;dot=d;}}unique.set(best.toArray().map(v=>v.toFixed(7)).join(','),best);}
    const vs=[...unique.values()];vertices.push(...vs);return {type:'hull',points:vs.flatMap(v=>v.toArray())};
  });return {shapes,vertices};
}

export function defineSmallBody(site, def, loadModel, options = {}) {
  const {THREE:T,world,stage,keepsakes,supports,store} = site;
  supports.registerCategory(def.id,'small');
  return keepsakes.define({...def,kind:'gl',make:null,place(){},
    object(_,inst) {
      const root = new T.Group(), legacy = store.get('keepsakes.'+inst.id), saved = store.get('worldBodies.'+inst.id);
      inst.physical = true;
      inst.worldTask = (async()=>{
        await Promise.all([world.ensure(),stage.ensureEnv()]);
        if(keepsakes.get(inst.id)!==inst)return;
        const model = typeof loadModel === 'function' ? await loadModel() : loadModel;
        if(keepsakes.get(inst.id)!==inst)return;
        inst.arrival={...inst.px};
        const source = model.create(); source.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(source), width = bounds.max.x-bounds.min.x;
        const floor = site.worldLayout.anchor(inst.px.x,site.worldLayout.floorY());
        const scale = saved?.adapter?.artScale || inst.w/stage.pxPerUnit(floor)/width;
        let {shapes,vertices} = preparedShapes(T,model.physics,scale);
        let visual;
        if(options.articulated) {
          const materials = new Set(); source.traverse(o=>{if(o.isMesh)materials.add(o.material);});
          for(const m of materials)forPicture(m);
          visual = new T.Group(); source.scale.setScalar(scale); visual.add(source);
        } else {
          visual = bakeSolid(T,source); visual.geometry.scale(scale,scale,scale);
          // Baked geometry is independent; materials/textures remain owned by visual.
          source.traverse(o=>o.geometry?.dispose());
        }
        inst.smallArt = visual; inst.preparedArt = source; inst.artScale = scale;
        const pickMaterial = new T.MeshBasicMaterial({visible:false,side:T.DoubleSide});
        if(visual.isMesh)root.add(new T.Mesh(visual.geometry,pickMaterial));
        else {
          source.updateMatrixWorld(true);
          source.traverse(o=>{if(o.isMesh){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);root.add(new T.Mesh(g,pickMaterial));}});
        }
        if(options.fitLobes)({shapes,vertices}=fitLobes(T,root,options.fitLobes));
        inst.colliderShapes=shapes; inst.colliderVertices=vertices;
        const vb = new T.Box3().setFromObject(visual), pictureVertices = [...vertices];
        for(const x of [vb.min.x,vb.max.x])for(const y of [vb.min.y,vb.max.y])for(const z of [vb.min.z,vb.max.z])pictureVertices.push(new T.Vector3(x,y,z));
        const picture = createMeshPicture(site,root,visual,pictureVertices,{batch:true}); inst.picture=picture;
        const draw=picture.draw;
        picture.draw=force=>{
          draw(force);
          // The cat's cached picture is at Z=0; rear sky art stays behind it.
          if(!picture.attached&&root.position.z<0){picture.card.children[0].renderOrder=-2;root.userData.pictureOrder=-2;}
        };
        const rotation = new T.Quaternion().setFromEuler(new T.Euler(...(options.rotation||[0,0,0])));
        floor.y = -Math.min(...vertices.map(v=>v.clone().applyQuaternion(rotation).y))+.001+(legacy||stage.reducedMotion?0:.12);
        if(!legacy&&!saved&&!def.sky)floor.copy(await floorHome(site,inst,vertices,rotation,floor));
        // Where it may rest is the shared rule (floor-home.js fitResting): the world calls it on arrival and on a real
        // layout change, never on a same-layout restore; it also runs when the body comes to rest (rest below).
        const resize=e=>fitResting(site,e,pictureVertices);
        const entry=await world.add({id:inst.id,object:root,shapes,mass:model.physics.mass,position:floor,rotation,persist:true,sleeping:!!legacy||stage.reducedMotion,
          adapterState:{version:1,artScale:scale},presentation:picture,sound:options.sound,
          material:{friction:.8,restitution:.06,linearDamping:.5,angularDamping:1.6,skin:.0005,softCcdPrediction:.03,...options.material},
          beforeStep:options.beforeStep,
          sync(e){
            inst.resting=!!e.support||e.body.isSleeping();picture.draw();
            keepsakes.syncWorld(inst,picture.rect);site.worldLayout.shadow(inst);options.sync?.(inst,e);
          },
          resize,rest(e){resize(e);world.sync(e);keepsakes.saveWorld(inst);world.save(e);},tap:ev=>def.tap?.(inst,ev),
          home(){const p=site.worldLayout.anchor(stage.width*.65);p.y=.7;return p;}
        });
        inst.worldEntry=entry; entry.grabbed=()=>{inst.autoHome=false;inst.resting=false;};
        entry.visibleHit=point=>{const p=stage.toScreen(point);return root.position.z>=0||stage.camera.position.z<0||!site.cat.hitTest(p.x,p.y);};
        inst.moveWorld=screen=>{
          supports.detach(entry);const p=site.worldLayout.anchor(screen.x,screen.y);
          p.y=-Math.min(...vertices.map(v=>v.clone().applyQuaternion(rotation).y))+.001;
          entry.body.setTranslation(p,false);entry.body.setRotation(rotation,false);entry.body.setLinvel({x:0,y:0,z:0},false);entry.body.setAngvel({x:0,y:0,z:0},false);world.wake(entry);world.sync(entry);
        };
        world.sync(entry);inst.worldReady=true;
        inst.key.classList.add('world-small-actions');
        await options.ready?.(inst,entry,{legacy,saved});
        if(entry.support)supports.update(entry.support.id);
        world.save(entry);keepsakes.saveWorld(inst);
      })().catch(error=>{inst.worldError=String(error);console.error('world small',inst.id,error);});
      return root;
    },
    removed(inst){options.removed?.(inst);world.remove(inst.id);site.worldLayout.remove(inst.id);inst.picture?.dispose();
      if(options.articulated)rootGeometries(inst.object);disposeArt(inst.smallArt);inst.object.children[0]?.material.dispose();store.del('worldBodies.'+inst.id);}
  });
}
function rootGeometries(root){root.traverse(o=>o.geometry?.dispose());}

export function hop(site, inst, velocity = .65) {
  const e=inst.worldEntry;if(!e||e.support||site.stage.reducedMotion)return;
  e.body.applyImpulse({x:0,y:e.body.mass()*velocity,z:0},true);
  e.body.applyTorqueImpulse({x:e.body.mass()*.0004,y:0,z:e.body.mass()*.0003},true);site.world.wake(e);
}
