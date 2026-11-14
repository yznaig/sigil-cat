import {fetchSplat} from '../core/splats.js';
import {createPropPicture} from '../core/prop-picture.js';
import {floorHome,fitResting} from '../core/floor-home.js';
import {standService,STAND} from './stand.js';
// Its width in cat-height units. Playtest-3 (e1113-30, the mock-up Aaron approved): the stand and the controller in it
// were drawn at STAND.scale (.8) together, so the controller itself is that much smaller (.55 -> .44), everywhere: a
// seated controller is never drawn smaller than the one you pick up.
export const CONTROLLER={width:.55*STAND.scale};
// Playtest-2: the controller is a keepsake (it no longer pops on its first click) and has a wooden stand.
export function ensureStand(site,opts){return standService(site).ensure(opts);}

// Selected logo-free Idol controller. Art, pick hull, shadow and body share the
// baked coordinates; its native orientation is already flat with the controls up.
export function defineController(site, use) {
  const {THREE:T,stage,keepsakes,world,store} = site;
  // A keepsake since playtest-2: it and its pose (on the floor or in its stand) persist like any other prop.
  site.supports.registerCategory('controller','solid');
  const source='assets/splats/controller-1.spz';
  const url=new URL('../../'+source,import.meta.url).href;
  const prepared=Promise.all([fetchSplat(url),fetch(url.replace('.spz','.colliders.json')).then(r=>{if(!r.ok)throw Error('Controller hull HTTP '+r.status);return r.json();})]);
  function object(_,inst) {
    const root = new T.Group();inst.physical = true;
    inst.worldTask=(async()=>{
      const [data,baked]=await prepared;await world.ensure(); if(keepsakes.get('controller')!==inst)return;
      const raw=baked.hulls.flat(),points=[];
      for(let n=0;n<raw.length;n+=3)points.push(new T.Vector3(raw[n],raw[n+1],raw[n+2]));
      const bounds=new T.Box3().setFromPoints(points),scale=CONTROLLER.width/(bounds.max.x-bounds.min.x);
      const offset=bounds.getCenter(new T.Vector3()).multiplyScalar(-scale);offset.y=-bounds.min.y*scale;
      const shapes=[],vertices=[];
      for(const hull of baked.hulls){
        const a=new Float32Array(hull.length);
        for(let n=0;n<hull.length;n+=3){const v=new T.Vector3(hull[n],hull[n+1],hull[n+2]).multiplyScalar(scale).add(offset);v.toArray(a,n);vertices.push(v);}
        shapes.push({type:'hull',points:Array.from(a)});
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(a,3));geometry.computeVertexNormals();
        root.add(new T.Mesh(geometry,new T.MeshBasicMaterial({visible:false})));
      }
      inst.colliderShapes=shapes;inst.colliderVertices=[...new Map(vertices.map(v=>[v.toArray().join(','),v])).values()];
      const picture=createPropPicture(site,root,data,scale,offset,inst.colliderVertices);inst.picture=picture;inst.splatSource=source;inst.splatCount=data.count;
      const p=site.worldLayout.anchor(stage.width*.68,Math.min(site.worldLayout.floorY()+28,stage.height-stage.insets.bottom-45));
      const q=new T.Quaternion().setFromEuler(new T.Euler(.1,-.18,.14));
      // A restored controller keeps its saved pose: player poses never pass through floorHome's search (fix round C:
      // running it on a reload set off its repack, which stored the shelf's top and rifle on the shelf).
      const restored=!!store.get('worldBodies.controller');
      if(!restored)p.copy(await floorHome(site,inst,inst.colliderVertices,q,p));
      const spawn=stage.onWall(stage.toScreen(p).x,-110,p.z);p.y=Math.max(2,spawn.y);
      const home=()=>{const h=site.worldLayout.anchor(stage.width*.68);h.y=1.8;return h;};
      const entry=await world.add({id:'controller',object:root,shapes:inst.colliderShapes,mass:.3,position:p,rotation:q,
        persist:true,adapterState:{version:1},material:{restitution:.14,friction:.75,angularDamping:1.5,skin:.003},sound:{material:'wood',size:'medium'},presentation:picture,
        sync(e){picture.draw();keepsakes.syncWorld(inst,picture.rect);inst.resting=e.body.isSleeping();site.worldLayout.shadow(inst);if(world.held?.entry===e||preview)showPreview(e);},
        rest(){keepsakes.saveWorld(inst);},home,tap:()=>use(inst),
        // Where it may rest is the shared rule (floor-home.js fitResting): the world fits it on a real layout change
        // and never on a same-layout restore. (Its own resize handler used to pull it into the arrival band in front
        // of him on every resize, so a controller left beside or behind him moved on each reload.)
        resize:e=>fitResting(site,e,inst.colliderVertices)});
      if(keepsakes.get('controller')!==inst){world.remove('controller');return;}
      inst.worldEntry=entry;inst.worldReady=true;
      // A restored body keeps its saved pose (and its stand, which src/core/supports.js re-mounts once the stand exists).
      entry.released=()=>clearPreview();
      inst.spawnBottom=Math.max(...inst.colliderVertices.map(v=>stage.toScreen(v.clone().applyQuaternion(q).add(p)).y));
      if(!restored&&!entry.support){entry.body.setAngvel({x:.5,y:.25,z:-.4},true);world.wake(entry);}
    })().catch(error=>{inst.worldError=String(error);console.error('controller',error);});
    return root;
  }
  // While held over the stand: the shelf's "Release to place" box over the slot (.shelf-preview, src/world/shelf.js).
  let preview=null;
  function clearPreview(){preview?.remove();preview=null;}
  function showPreview(e){
    const c=world.held?.entry===e&&site.supports.candidate(e);if(!c||c.id!=='stand'||!c.rect){clearPreview();return;}
    preview??=document.body.appendChild(Object.assign(document.createElement('div'),{className:'shelf-preview',textContent:'Release to place'}));
    Object.assign(preview.style,{left:c.rect.x+'px',top:c.rect.y+'px',width:c.rect.w+'px',height:c.rect.h+'px'});
  }
  keepsakes.define({id:'controller',label:'A small black controller',kind:'gl',size:CONTROLLER.width,aspect:.62,home:()=>({x:.7,y:0}),object,
    tap:inst=>use(inst),removed(inst){clearPreview();world.remove(inst.id);site.worldLayout.remove(inst.id);inst.picture?.dispose();
      inst.object.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});store.del('worldBodies.controller');}});
}
