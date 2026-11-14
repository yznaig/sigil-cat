import {worldPresentation} from './world-presentation.js';
import {softFloorShadow} from './soft-floor-shadow.js';
// Fixed furniture with one soft blurred floor shadow (the rack; layout lane, playtest-3, e1113-30: the stand and the egg
// cup "proper shadows ... soft n simple, like the hat rack"). Their meshes stay out of the hard per-mesh shadow batch.
const SOFT_SHADOWS=new Set(['rack','stand','egg-cup']);
// One y=0 plane. Screen bands choose reachable foreground depth, not a second floor.
export function createWorldLayout(site) {
 const {stage,THREE:T,store}=site;
 const stats={shadowUpdates:0,layouts:0}, shadows=new Map(),reservations=new Map();
 const depthDirection=new T.Vector3(.3,0,-3.5).normalize(); // opposite key light (-.3,3,3.5)
 const feet=()=>stage.toScreen(new T.Vector3());
 const floorY=()=>Math.min(feet().y+Math.max(40,stage.height*.10),stage.height-stage.insets.bottom-28);
 const furniture=()=>({
  shelf:{x:18,y:stage.insets.top+18,w:Math.min(220,stage.width*.28),h:100},
  pinboard:{x:stage.width-Math.min(240,stage.width*.32)-18,y:stage.insets.top+18,w:Math.min(240,stage.width*.32),h:150},
  rack:{x:Math.max(42,stage.width*.08),y:floorY(),fixed:true},
  ...Object.fromEntries(reservations)
 });
 function anchor(x,y=floorY()){return stage.onFloor(x,y);}
 function reachable(p,margin=40){
  const q=stage.toScreen(new T.Vector3(p.x,0,p.z));
  const x=Math.max(margin,Math.min(stage.width-margin,q.x));
  const y=Math.max(feet().y+28,Math.min(stage.height-stage.insets.bottom-28,q.y));
  const v=anchor(x,y);v.y=p.y;return v;
 }
 const vertex=`uniform mat4 sourceMatrix,receiverMatrix,receiverInverse;uniform float receiverZ;uniform bool supported;void main(){vec3 p=(sourceMatrix*vec4(position,1.)).xyz;if(supported){p=(receiverInverse*vec4(p,1.)).xyz;float h=max(0.,p.z-receiverZ);p.xy+=vec2(.18,-.4)*h;p.z=receiverZ;p=(receiverMatrix*vec4(p,1.)).xyz;}else{float h=max(0.,p.y);p+=vec3(.1,-1.,-3.5/3.)*h;p.y=.001;}gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`;
 const fragment=`void main(){gl_FragColor=vec4(.12,.09,.06,.12);}`;
 function shadow(inst){
  if(!inst.physical&&!['rifle','top'].includes(inst.id)||!inst.object)return;
  const root=inst.object;
  // Model may arrive asynchronously. Existing decorative disks are hidden once it exists.
  if(!root.children.length&&!root.isMesh)return;
  let entry=shadows.get(inst.id);
  if(!entry){
   const group=new T.Group(),pairs=[];
   root.traverse(o=>{
    if(o.geometry===site.cat.shadow.geometry){o.visible=false;return;}
    if(!o.isMesh||o.geometry.type==='TorusGeometry'||o.geometry.type==='SphereGeometry')return;
    const mat=new T.ShaderMaterial({uniforms:{sourceMatrix:{value:new T.Matrix4()},receiverMatrix:{value:new T.Matrix4()},receiverInverse:{value:new T.Matrix4()},receiverZ:{value:.018},supported:{value:false}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:T.DoubleSide});
    const mesh=new T.Mesh(o.geometry,mat);mesh.frustumCulled=false;mesh.renderOrder=-5;if(!SOFT_SHADOWS.has(inst.id))group.add(mesh);pairs.push([o,mat]);
   });
   stage.scene.add(group);entry={group,pairs,matrix:new T.Matrix4(),initialized:false};shadows.set(inst.id,entry);entry.batch=SOFT_SHADOWS.has(inst.id)?softFloorShadow(site,group,pairs):worldPresentation(site).shadow(inst.id,group,pairs);
  }
  const support=inst.worldEntry?.support,receiver=support&&site.supports.registry.get(support.id)?.shadow?.();
  const parent=receiver?.parent||stage.scene;if(!SOFT_SHADOWS.has(inst.id)&&entry.group.parent!==parent)parent.add(entry.group);
  entry.group.visible=root.visible&&(!support||!!receiver);
  // World.sync already updated the body and its pick geometry this frame.
  // Free-running visual effects still own their transform update here.
  if(!site.world?.syncing||inst.flight||inst.state?.charged)root.updateMatrixWorld(true);
  // The charged rotor uses a sleeping fixed body but still turns its visual.
  // Keep that silhouette live so it cannot rebuild sleeping neighbours' layer.
  const movingVisual=inst.flight||inst.state?.charged&&!stage.reducedMotion;
  const body=inst.worldEntry||site.world?.entries.get(inst.id),stationary=parent===stage.scene&&!support&&!movingVisual&&!!body&&(body.fixed||body.body.isSleeping())&&site.world.held?.entry!==body;
  if(entry.initialized&&entry.matrix.equals(root.matrixWorld)&&entry.elapsed===inst.elapsed&&entry.kick===inst.kick&&entry.support===support?.id){if(entry.batch.stationary!==stationary)entry.batch.update(stationary);return;}
  for(const [o,m]of entry.pairs){m.uniforms.sourceMatrix.value.copy(o.matrixWorld);m.uniforms.supported.value=!!receiver;if(receiver){receiver.object.updateMatrixWorld(true);m.uniforms.receiverMatrix.value.copy(receiver.object.matrixWorld);m.uniforms.receiverInverse.value.copy(receiver.object.matrixWorld).invert();m.uniforms.receiverZ.value=receiver.z;}}
  receiver?.invalidate();
  entry.matrix.copy(root.matrixWorld);entry.elapsed=inst.elapsed;entry.kick=inst.kick;entry.support=support?.id;entry.initialized=true;entry.batch.update(stationary);stats.shadowUpdates++;
 }
 function remove(id){const e=shadows.get(id);if(e){e.batch.dispose();e.group.removeFromParent();for(const [,m]of e.pairs)m.dispose();shadows.delete(id);}}
 // Fixed furniture can adopt/release child shadow proxies without a world loop.
 // Pose changes reuse materials; only a changed mesh set rebuilds the cache.
 function invalidateShadow(id,{geometry=false}={}){if(geometry)remove(id);else{const e=shadows.get(id);if(e)e.initialized=false;}}
 stage.onResize.push(()=>{stats.layouts++;});
 // Speed lane (e1112-59): the same material as shadow() makes, for the boot warm-up (src/core/warm-shared.js).
 const warmMaterial=()=>new T.ShaderMaterial({uniforms:{sourceMatrix:{value:new T.Matrix4()},receiverMatrix:{value:new T.Matrix4()},receiverInverse:{value:new T.Matrix4()},receiverZ:{value:.018},supported:{value:false}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:T.DoubleSide});
 return {warmMaterial,floorY,anchor,reachable,furniture,reserve(id,rect){if(rect)reservations.set(id,{...rect});else reservations.delete(id);},depthDirection,shadow,invalidateShadow,remove,shadows,stats,
  pose(inst){if(inst.worldEntry){const b=inst.worldEntry.body,p=b.translation(),q=b.rotation();return {version:1,position:[p.x,p.y,p.z],quaternion:[q.x,q.y,q.z,q.w],support:'floor'};}const p=anchor(inst.px.x,inst.box.y+inst.box.h);return {version:1,position:p.toArray(),quaternion:inst.object?inst.object.quaternion.toArray():[0,0,0,1],support:inst.id==='rack'?'fixed':'floor'};}
 };
}
