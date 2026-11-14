// Bounded celebration: one instanced draw for the paper, a temporary modeled paper blower.
// No rigid bodies, permanent callbacks, lights or collection identities are created here.
import { forPicture } from '../core/cat.js';
export function celebrate(site, seconds) {
  const {THREE:T,stage,cat}=site, reduced=stage.reducedMotion;
  const t0=stage.clock, cleanup=[], group=new T.Group();
  let confetti=null;
  const piece=new T.Object3D(), color=new T.Color(), bits=[];
  const palette=['#ff639d','#35bfb0','#f6c44a','#8064be','#f9edcf'];
  let seed=811;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const distance=1.5, h=2*distance*Math.tan(T.MathUtils.degToRad(stage.camera.fov/2)),w=h*stage.width/stage.height;
  group.quaternion.copy(stage.camera.quaternion);
  group.position.copy(stage.camera.position).add(new T.Vector3(0,0,-distance).applyQuaternion(stage.camera.quaternion));
  if(!reduced) {
    const geometry=new T.BoxGeometry(.7,1,.05),material=new T.MeshStandardMaterial({roughness:.72,metalness:.08,side:T.DoubleSide,transparent:true});
    confetti=new T.InstancedMesh(geometry,material,160);confetti.name='party-confetti';confetti.frustumCulled=false;
    for(let i=0;i<160;i++) {
      const side=i%2?1:-1;
      bits.push({x:side*(w/2+h*.03),y:h*(-.1+random()*.12),z:(random()-.5)*h*.1,
        vx:-side*h*(.35+random()*.42),vy:h*(.4+random()*.24),size:h*(.008+random()*.008),
        angle:random()*6.28,turn:3+random()*5,delay:random()*.3});
      confetti.setColorAt(i,color.set(palette[i%palette.length]));
    }
    group.add(confetti);stage.scene.add(group);cleanup.push(()=>{group.removeFromParent();confetti.dispose();geometry.dispose();material.dispose();});
  }
  const blower=new T.Group();blower.name='party-blower';
  const materials=[new T.MeshStandardMaterial({color:'#f5be47',roughness:.48}),new T.MeshStandardMaterial({color:'#f486a9',roughness:.8}),new T.MeshStandardMaterial({color:'#36bdb2',roughness:.72})].map(m=>forPicture(m));
  function part(geometry,mat){const m=new T.Mesh(geometry,materials[mat]);blower.add(m);cleanup.push(()=>geometry.dispose());return m;}
  const mouth=part(new T.CylinderGeometry(.017,.021,.085,12),0);mouth.rotation.x=Math.PI/2;mouth.position.z=.035;
  const paper=part(new T.BoxGeometry(.065,.014,1),1);paper.position.z=.13;
  const ring=part(new T.TorusGeometry(.039,.010,8,24),2);ring.rotation.y=Math.PI/2;
  const stripes=[];for(let i=0;i<5;i++) {const b=part(new T.BoxGeometry(.066,.015,.017),2);stripes.push(b);}
  cat.spin.add(cat.inPicture(blower,true));
  let ended=false;
  function update() {
    const t=stage.clock-t0;
    const face=cat.config.face[cat.shown]||cat.config.face.sit;
    blower.position.set(face[0],face[1]-.055,face[2]+.018);blower.rotation.y=1.45;
    blower.visible=!cat.hidden&&!cat.standIn && t<1.6;
    const extend=reduced ? .16 : .10+.22*Math.sin(Math.PI*Math.min(1,t/1.25))**.6;
    paper.scale.z=extend;paper.position.z=.08+extend/2;ring.position.set(0,.031,.08+extend);
    stripes.forEach((b,i)=>{b.position.z=.09+extend*(i+.5)/5;});
    cat.touch();
    if(confetti) {
      bits.forEach((b,i)=>{
        const u=Math.max(0,t-b.delay);
        piece.position.set(b.x+b.vx*(1-Math.exp(-u*1.1))/1.1,b.y+b.vy*u-h*.24*u*u,b.z+Math.sin(u*3+b.angle)*h*.04);
        piece.rotation.set(b.angle+u*b.turn,u*b.turn*.7,b.angle+u);piece.scale.setScalar(b.size*(t>=b.delay?1:0));piece.updateMatrix();confetti.setMatrixAt(i,piece.matrix);
      });
      confetti.instanceMatrix.needsUpdate=true;confetti.material.opacity=Math.min(1,Math.max(0,(seconds-t)/.8));
    }
    if(t>=seconds)dispose();
  }
  function dispose(){if(ended)return;ended=true;const i=stage.onFrame.indexOf(update);if(i>=0)stage.onFrame.splice(i,1);blower.removeFromParent();cleanup.forEach(f=>f());materials.forEach(m=>m.dispose());cat.touch();}
  update();stage.onFrame.push(update);
  return {dispose,get active(){return !ended;},get confetti(){return ended?0:confetti?.count||0;},get blower(){return !ended&&blower.visible;},sides:reduced?0:2};
}
