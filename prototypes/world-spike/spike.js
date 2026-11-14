// Original spike; joint approach studied in cannon-es' MIT mousepick example. See SOURCES.md.
import * as THREE from 'three';
import * as C from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const started=performance.now(), canvas=document.querySelector('canvas'), status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setClearColor(0xf3f0e9);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.NeutralToneMapping;
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(30,1,.05,80);
const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment();
const env=pmrem.fromScene(room,.04); scene.environment=env.texture; scene.environmentIntensity=.7; room.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xfffaf2,0x6b5f52,1.5));
// Same key direction as stage.js: away from (-.3,3,3.5) => floor depth (+.3,0,-3.5).
const light=new THREE.DirectionalLight(0xfff4e6,2.5); light.position.set(-.3,3,3.5); light.castShadow=true;
Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:12});
light.shadow.camera.updateProjectionMatrix();
light.shadow.mapSize.set(1024,1024); light.shadow.normalBias=.003; light.shadow.bias=-.00015; scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.36}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
// Quiet ruler illustrates depth; it is not a physical edge or a wall.
const grid=new THREE.GridHelper(12,48,0xc6c3b8,0xdedbd2); grid.position.y=.0004; grid.rotation.y=-Math.atan2(.3,3.5); grid.material.transparent=true; grid.material.opacity=.27; scene.add(grid);
const world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:true}); world.broadphase=new C.SAPBroadphase(world);
world.solver.iterations=16; world.solver.tolerance=1e-7;
world.defaultContactMaterial.friction=.38; world.defaultContactMaterial.restitution=.28;
world.defaultContactMaterial.contactEquationStiffness=1e8; world.defaultContactMaterial.contactEquationRelaxation=4;
const ground=new C.Body({mass:0,material:new C.Material({friction:1,restitution:1}),shape:new C.Plane()}); ground.quaternion.setFromEuler(-Math.PI/2,0,0); world.addBody(ground);
const items=[], stats={steps:0,frames:0,stepSamples:[],frameSamples:[],gaps:[],contacts:[],initMs:0};
let pending=0,last=0,accumulator=0,held=null,manual=false;
const vec=v=>new C.Vec3(v.x,v.y,v.z);
function hull(points){
 const offset=points.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/points.length);
 const geometry=new ConvexGeometry(points.map(p=>p.clone().sub(offset))), p=geometry.attributes.position, vertices=[],faces=[],ids=new Map();
 for(let i=0;i<p.count;i+=3){const face=[];for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(p,i+j),key=v.toArray().map(x=>x.toFixed(6)).join(',');if(!ids.has(key)){ids.set(key,vertices.length);vertices.push(vec(v));}face.push(ids.get(key));}faces.push(face);}
 // Cannon expects coplanar triangles merged into one polygon; otherwise contact manifolds jitter.
 const groups=new Map();
 for(const face of faces){const a=vertices[face[0]],b=vertices[face[1]],c=vertices[face[2]],normal=b.vsub(a).cross(c.vsub(a));normal.normalize();const key=[normal.x,normal.y,normal.z,normal.dot(a)].map(x=>x.toFixed(4)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(face);}
 const polygons=[];
 for(const tris of groups.values()){
  const edges=new Map();for(const [a,b,c] of tris)for(const [u,v] of [[a,b],[b,c],[c,a]]){const reverse=v+','+u;if(edges.has(reverse))edges.delete(reverse);else edges.set(u+','+v,[u,v]);}
  const boundary=[...edges.values()], polygon=[boundary[0][0]];let next=boundary[0][1];
  while(next!==polygon[0]&&polygon.length<=boundary.length){polygon.push(next);const edge=boundary.find(e=>e[0]===next);if(!edge)break;next=edge[1];}
  if(next===polygon[0]&&polygon.length===boundary.length)polygons.push(polygon);else polygons.push(...tris);
 }
 geometry.dispose(); return {shape:new C.ConvexPolyhedron({vertices,faces:polygons}),offset:vec(offset)};
}
function bodyFor(root,name,mass){
 const b=new C.Body({mass,material:new C.Material({friction:.38,restitution:.28}),linearDamping:.12,angularDamping:.25,allowSleep:true,sleepSpeedLimit:.12,sleepTimeLimit:.7});
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); scene.add(root);world.addBody(b);
 const item={root,body:b,name};root.userData.item=item; items.push(item);
 b.addEventListener('collide',e=>{if(stats.contacts.length<300)stats.contacts.push({step:stats.steps,name,speed:Math.abs(e.contact.getImpactVelocityAlongNormal())});});return item;
}
const gltf=await new GLTFLoader().loadAsync('../../assets/models/awp.glb');
const model=gltf.scene, bounds=new THREE.Box3().setFromObject(model), center=bounds.getCenter(new THREE.Vector3()), size=bounds.getSize(new THREE.Vector3()), scale=1.3/size.x;
model.scale.setScalar(scale);model.position.copy(center).multiplyScalar(-scale);
const rifleRoot=new THREE.Group();rifleRoot.add(model);rifleRoot.updateMatrixWorld(true);
const rifle=bodyFor(rifleRoot,'rifle',1.2);
// Split the mesh into longitudinal convex slices. Keeps barrel, stock and scope contact close to art
// without using a dynamic concave triangle mesh or the empty space of one enclosing box.
const buckets=Array.from({length:6},()=>[]);
model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);buckets[Math.min(5,Math.max(0,Math.floor((v.x+.65)/1.3*6)))].push(v);}});
for(const points of buckets)if(points.length>3){const h=hull(points);rifle.body.addShape(h.shape,h.offset);}
const profile=[[0,-.105],[.012,-.1],[.035,-.075],[.09,-.025],[.112,.005],[.1,.025],[.04,.045],[.012,.055],[.012,.12],[.018,.13],[0,.135]];
function addTop(n){
 const root=new THREE.Group(), mesh=new THREE.Mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),48),new THREE.MeshStandardMaterial({color:0xb88b46,metalness:.85,roughness:.28})); root.add(mesh);
 const t=bodyFor(root,'top-'+n,.22), points=[];
 // Convex body plus slender handle: avoid filling the shoulder-to-handle hollow.
 for(const [r,y] of [[.008,-.105],[.112,.005],[.04,.045]])for(let i=0;i<8;i++)points.push(new THREE.Vector3(r*Math.cos(i*Math.PI/4),y,r*Math.sin(i*Math.PI/4)));
 const h=hull(points);t.body.addShape(h.shape,h.offset);t.body.addShape(new C.Cylinder(.018,.012,.08,12),new C.Vec3(0,.095,0));return t;
}
addTop(0);
function sync(){for(const i of items){i.root.position.copy(i.body.position);i.root.quaternion.copy(i.body.quaternion);}scene.updateMatrixWorld(true);}
function render(){sync();renderer.render(scene,camera);stats.frames++;status.textContent=held?'Held at the grab point':items.every(i=>i.body.sleepState===C.Body.SLEEPING)?'Asleep · no animation frames':'Moving · gravity + contact';}
function reset(count=2){
 release();while(items.length<count)addTop(items.length-1);
 for(let n=0;n<items.length;n++){
  const i=items[n], enabled=n<count;i.root.visible=enabled;i.body.collisionResponse=enabled;i.body.collisionFilterMask=enabled?-1:0;
  if(!enabled){i.body.position.set(0,-50,0);i.body.sleep();continue;}
  i.body.position.set(n===0?-.38:n===1?.5:((n%5)-2)*.3, n<2?1.15:1.3+Math.floor(n/5)*.3,n<2?0:-.35+(n%3)*.35);
  i.body.quaternion.setFromEuler(.25+n*.17,.15+n*.25,n===0?.26:.7);
  i.body.velocity.set(n===0?.35:-.12,0,-.06);i.body.angularVelocity.set(1,1.4,n===0?-.8:2.2);i.body.wakeUp();
 }
 stats.stepSamples=[];stats.frameSamples=[];stats.gaps=[];stats.contacts=[];last=0;accumulator=0;wake();
}
function step(){const t=performance.now();for(const i of items)i.body.material.restitution=i.body.velocity.length()>1?.28:0;world.step(1/120);stats.stepSamples.push(performance.now()-t);stats.steps++;}
function tick(now){pending=0;const t=performance.now();if(last)stats.gaps.push(now-last);accumulator+=last?Math.min((now-last)/1000,.05):1/60;last=now;
 while(accumulator>=1/120){step();accumulator-=1/120;}render();stats.frameSamples.push(performance.now()-t);
 if(held||items.some(i=>i.body.sleepState!==C.Body.SLEEPING))wake();else last=0;
}
function wake(){if(!pending&&!manual)pending=requestAnimationFrame(tick);}
const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(),pointer=new THREE.Vector2();
function ray(e){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);return raycaster;}
function move(e){if(!held||e.pointerId!==held.id)return;const p=ray(e).ray.intersectPlane(plane,new THREE.Vector3());if(!p)return;
 // Cap one-event displacement to avoid touch teleports injecting unbounded energy.
 const d=p.clone().sub(held.anchor.position);if(d.length()>.25)d.setLength(.25);held.anchor.position.vadd(vec(d),held.anchor.position);held.item.body.wakeUp();wake();}
canvas.addEventListener('pointerdown',e=>{
 if(held)return;const hit=ray(e).intersectObjects(items.filter(i=>i.root.visible).map(i=>i.root),true)[0];if(!hit)return;
 let root=hit.object;while(!root.userData.item)root=root.parent;const item=root.userData.item;
 const pivot=item.body.pointToLocalFrame(vec(hit.point)),anchor=new C.Body({mass:0,collisionFilterGroup:0,collisionFilterMask:0});anchor.position.copy(vec(hit.point));world.addBody(anchor);
 const joint=new C.PointToPointConstraint(item.body,pivot,anchor,new C.Vec3(),60);
 for(const eq of joint.equations)eq.setSpookParams(2e5,4,1/120);
 world.addConstraint(joint);item.body.wakeUp();plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);
 held={item,anchor,joint,pivot,id:e.pointerId};canvas.setPointerCapture(e.pointerId);wake();
});
canvas.addEventListener('pointermove',move);
function release(e){if(!held||(e?.pointerId!==undefined&&e.pointerId!==held.id))return;world.removeConstraint(held.joint);world.removeBody(held.anchor);held.item.body.wakeUp();held=null;wake();}
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
addEventListener('blur',()=>release());
canvas.addEventListener('wheel',e=>{if(!held)return;e.preventDefault();const d=Math.sign(e.deltaY)*.06;held.anchor.position.z-=d;held.anchor.position.x+=d*.3/3.5;plane.translate(new THREE.Vector3(d*.3/3.5,0,-d));wake();},{passive:false});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;
 const dist=Math.max(1.9/(2*Math.tan(Math.PI/12)),1.9/(2*Math.tan(Math.PI/12)*camera.aspect));
 camera.position.set(0,.62+dist*.12,dist);camera.lookAt(0,.5,0);camera.clearViewOffset();camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const groundPx=(1-new THREE.Vector3(0,0,0).project(camera).y)*innerHeight/2;
 camera.setViewOffset(innerWidth,innerHeight,0,groundPx-Math.min(innerHeight*.76,innerHeight-140),innerWidth,innerHeight);
 camera.updateProjectionMatrix();render();}
addEventListener('resize',resize);document.querySelector('#drop').onclick=()=>reset(2);document.querySelector('#many').onclick=()=>reset(20);
// Explicit deterministic stepping is only used to capture a frame sequence, never as the performance benchmark.
window.spike={stats,items,world,renderer,camera,reset,get held(){return held;},get pending(){return pending;},
 project(n=0,local=[0,0,0]){const p=new THREE.Vector3(...local).applyQuaternion(items[n].root.quaternion).add(items[n].root.position).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},
 manual(on){manual=on;if(pending)cancelAnimationFrame(pending);pending=0;last=0;if(!on)wake();},advance(n,draw=true){for(let i=0;i<n;i++)step();if(draw)render();},
 gripError(){if(!held)return null;return held.item.body.pointToWorldFrame(held.pivot).distanceTo(held.anchor.position);}};
resize();stats.initMs=performance.now()-started;reset();
