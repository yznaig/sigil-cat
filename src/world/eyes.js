import {defineSmallBody,hop} from './small-body.js';

export function createPhysicalEyes(site, config) {
  const {THREE:T,cat,stage,world,supports,keepsakes,audio} = site;
  // On him they sit on his face group (cat.face, moved with his seat at the pop's swap), just proud of it: they follow
  // every frame of a pose change in his own picture, the way a hat and the butter do (playtest-3, physics lane item 1:
  // they used to keep the old pose's face until the pop ended, then jump). facePoint: the same spot in his own space.
  const PROUD=.014,seat='eyes-cat', slot={id:'face',accepts:['eyes'],position:[0,0,PROUD]};
  const facePoint=()=>{const f=cat.face.position;return [f.x,f.y,f.z+PROUD];};
  const stats={pupilFrames:0,releases:0}; let pupilStop=null;
  let model;
  const loadModel=async()=>model??=await import('../../assets/models/prepared/world-detail/eyes.js');
  const instance=()=>keepsakes.get('eyes');
  const collision=(e,on)=>{for(let n=0;n<e.body.numColliders();n++)e.body.collider(n).setEnabled(on);};
  const state=()=>{const i=instance();if(i?.worldEntry){const id=i.worldEntry.support?.id;i.setState({on:id===seat?'cat':id?.startsWith('eyes-host-')?id.slice(10):null});}};
  supports.registerCatSeat({id:seat,parent:cat.face,slots:[slot],onChange:state});
  const catSupport=supports.registry.get(seat),adopt=catSupport.adopt,release=catSupport.release;
  catSupport.adopt=(e,...args)=>{adopt(e,...args);collision(e,false);};
  catSupport.release=e=>{release(e);collision(e,true);e.object.visible=true;e.canGrab=true;instance().smallArt.visible=true;};

  // The picture follows cat.face by itself; this only brings the body's proxy pose (picking, the save) up to date.
  function updateCatSeat() {
    if(instance()?.worldEntry?.support?.id===seat)supports.update(seat);
  }
  updateCatSeat();
  cat.onPicture.push(()=>{
    const i=instance();if(i?.worldEntry?.support?.id!==seat)return;
    i.smallArt.visible=cat.screenOf(facePoint()).facing>.12;
  });
  // Picking resolves the animated screen proxy only on input. Rendering inherits
  // the existing cat picture, including his roll, disappearance and bread pose.
  const catPose=catSupport.worldPose;
  catSupport.worldPose=(...args)=>{
    const i=instance();if(i?.worldEntry)i.worldEntry.canGrab=!cat.hidden&&cat.screenOf(facePoint()).facing>.12;
    return catPose(...args);
  };

  // Playtest 2: "the googly eyes stay on the cat forever / until you take it off like the hats, and the only other
  // place you should be able to put the googly eyes is right on the platinum cat". Two homes: his face (the seat
  // above) and the cat embossed on the Platinum Cat badge (src/world/platinum.js eyesAnchor). Nothing else takes them.
  const HOSTS=['platinum'];
  const valid=id=>HOSTS.includes(id)&&!!keepsakes.get(id);
  function hostPose(id) {
    const host=keepsakes.get(id);
    if(id==='butterman') {
      const h=site.eggs.butterman?.headAttachment;
      if(!h)return null;
      h.updateWorldMatrix(true,false);
      const box=new T.Box3().setFromObject(h),p=box.getCenter(new T.Vector3()),q=h.getWorldQuaternion(new T.Quaternion());
      p.add(new T.Vector3(0,0,box.getSize(new T.Vector3()).z*.48).applyQuaternion(q));return {p,q};
    }
    if(!host)return null;
    if(host.worldEntry) {
      host.object.updateWorldMatrix(true,false);
      if(host.eyesAnchor)return {p:host.object.localToWorld(new T.Vector3(...host.eyesAnchor())),q:host.object.getWorldQuaternion(new T.Quaternion())};
      const box=host.colliderVertices?.length?new T.Box3().setFromPoints(host.colliderVertices):new T.Box3().setFromObject(host.object).applyMatrix4(host.object.matrixWorld.clone().invert());
      const local=box.getCenter(new T.Vector3());local.z=box.max.z+.008;
      host.object.updateWorldMatrix(true,false);return {p:host.object.localToWorld(local),q:host.object.getWorldQuaternion(new T.Quaternion())};
    }
    const x=host.box.x+host.box.w*.5,y=host.box.y+host.box.h*.42;
    return {p:stage.onWall(x,y,host.object?.position.z??.8),q:stage.camera.quaternion.clone()};
  }
  function hostChanged(id) {
    const i=instance(),e=i?.worldEntry;if(e?.support?.id!=='eyes-host-'+id)return;
    const pose=hostPose(id);if(!pose){detach();return;}
    const visible=id==='butterman'?!!site.eggs.butterman?.headAttachment:keepsakes.get(id)?.object?.visible!==false;
    const facing=new T.Vector3(0,0,1).applyQuaternion(pose.q).dot(stage.camera.position.clone().sub(pose.p).normalize())>.08;
    const show=visible&&facing;
    if(e.object.position.distanceToSquared(pose.p)<1e-12&&e.object.quaternion.angleTo(pose.q)<1e-7&&e.object.visible===show)return;
    const shown=i.smallArt.visible!==show;
    e.object.visible=show;e.canGrab=show;i.smallArt.visible=show;e.body.setTranslation(pose.p,false);e.body.setRotation(pose.q,false);
    // Following the badge (it has just drawn itself, with them in it): their own sync must not redraw it again.
    const art=hostArt(id,e);quiet=art;try{world.sync(e);}finally{quiet=false;}
    if(art&&shown){const p=keepsakes.get(id).picture;p.invalidate();p.draw();}
  }
  let quiet=false;
  // On the badge the pair is drawn inside the badge's own picture, as on his face they are drawn inside his (playtest-3,
  // physics lane item 1: "they entirely despawn when I try to place them on the platinum cat"). Drawn as a card of
  // their own they lost to the badge: a picture without per-pixel depth writes its nearest point's depth, and the
  // badge's rim is nearer than its embossed cat. In its picture they follow it every frame, onto the board with it.
  // The local pose is the anchor (which carries the badge's board scale), refreshed whenever the badge moves or scales.
  function hostArt(id,e) {
    const host=keepsakes.get(id),p=host?.picture;
    if(!p?.visual||!host.eyesAnchor||!e.presentation)return false;
    const at=host.eyesAnchor(),now=e.presentation.attached&&e.hostArt;
    if(now&&now.host===host&&now.at.every((v,k)=>Math.abs(v-at[k])<1e-9))return true;
    e.hostArt={host,at};
    e.presentation.attach(p.visual,p.visual,()=>{if(quiet)return;p.invalidate();p.draw();},{position:at,quaternion:[0,0,0,1]});
    return true;
  }
  function ensureHost(id) {
    if(!valid(id))return false;
    const key='eyes-host-'+id;if(supports.registry.has(key))return true;
    const host=keepsakes.get(id);
    let unregister;
    if(host) {
      const placed=host.placed,removing=host.removing;
      host.placed=()=>{placed?.();hostChanged(id);};
      host.removing=()=>{removing?.();if(instance()?.state.on===id)detach();unregister?.();};
    }
    unregister=supports.register({id:key,kind:'attachment',slots:[{id:'face',accepts:['eyes']}],worldPose:()=>hostPose(id)||{p:instance().object.position.clone(),q:instance().object.quaternion.clone()},
      adopt(e){collision(e,false);
        // Legacy DOM hosts retain their art behind the canvas while carrying
        // real eyes; this compatibility path vanishes when their adapter is GL.
        if(host&&!host.object)document.getElementById('back').appendChild(host.el);
        hostChanged(id);
        // Restored before the badge has its picture (a reload): into its picture once it has one.
        if(!hostArt(id,e))host?.worldTask?.then(()=>{if(e.support?.id===key){hostArt(id,e);hostChanged(id);}});
      },
      release(e){collision(e,true);
        if(e.hostArt){const p=e.hostArt.host.picture;e.hostArt=null;e.presentation.detach();p?.invalidate();p?.draw();}
        e.object.visible=true;e.canGrab=true;instance().smallArt.visible=true;if(host&&!host.object)document.getElementById('front').appendChild(host.el);},onChange:state});
    return true;
  }
  function stick(on,{quiet=false}={}) {
    const i=instance();if(!i?.worldEntry)return false;
    if(on==='bread')on='cat';
    if(on==='cat')updateCatSeat();else if(!ensureHost(on)||!hostPose(on))return false;
    const ok=supports.mount(i.worldEntry,on==='cat'?seat:'eyes-host-'+on,'face',{animate:false});
    if(ok){state();if(!quiet)audio.play('tap-pop',{gain:.5,rate:1.3});}
    return ok;
  }
  function detach() {
    const i=instance(),e=i?.worldEntry;if(!e?.support)return false;
    supports.detach(e);i.smallArt.visible=true;world.sync(e);state();stats.releases++;return true;
  }
  function stopPupils(){pupilStop?.();pupilStop=null;}
  function look(ev) {
    const i=instance();if(!i?.worldReady||document.hidden)return;
    stopPupils();const p=i.worldEntry.support?.id===seat?cat.screenOf(facePoint()):stage.toScreen(i.object.position);
    const x=ev?ev.clientX-p.x:0,y=ev?p.y-ev.clientY:-40,l=Math.hypot(x,y)||1;
    const target=new T.Vector2(x/l,y/l).multiplyScalar(Math.min(.018,l*.00045));
    const pupil=i.preparedArt.getObjectByName('pupil.0'),start=new T.Vector2(pupil.position.x+.066,pupil.position.y);
    const started=performance.now();const apply=u=>{
      const p=start.clone().lerp(target,u);model.setPupils(i.preparedArt,p.x,p.y);i.picture.invalidate();
      if(i.picture.attached)cat.touch();else i.picture.draw();
    };
    if(stage.reducedMotion){apply(1);return;}
    const frame=()=>{const t=(performance.now()-started)/1000;stats.pupilFrames++;apply(1-Math.pow(1-Math.min(1,t/.18),3));if(t>=.18)stopPupils();};
    pupilStop=()=>{const n=stage.onFrame.indexOf(frame);if(n>=0)stage.onFrame.splice(n,1);};stage.onFrame.push(frame);
  }
  stage.canvas.addEventListener('pointermove',look,{passive:true});stage.canvas.addEventListener('pointerleave',()=>look(null));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPupils();});
  defineSmallBody(site,{id:'eyes',label:'the googly eyes',size:config.size,aspect:config.aspect,home:()=>config.floor,pad:8,
    tap(i){if(!detach()){audio.play('rattle',{gain:.45});hop(site,i,.45);}}
  },loadModel,{articulated:true,fitLobes:2,rotation:[-Math.PI/2,0,0],sound:{material:'tin',size:'small'},
    // No speculative (soft CCD) contacts for the eyes (integration, playtest-3): the two light lobes spin fast as they
    // land, and Rapier's predicted contacts then gave them energy from nowhere (a still-spinning landing shot off at
    // 4 m/s; world-small-drops: 2 of 400 drops on a phone, 1 of 400 on a desktop; none of 400 without). Full CCD still
    // comes on when they move fast (world.js ccd).
    material:{speculative:false},
    ready(i,e,{saved}){
      // Let go over him or over the badge: they stick. Anywhere else they simply fall.
      e.dropped=ev=>{
        const x=ev.clientX,y=ev.clientY,badge=keepsakes.get('platinum');
        const on=cat.hitTest(x,y)?'cat':badge?.worldEntry&&badge.hits?.(x,y)?'platinum':null;
        return on?stick(on):false;
      };
      const on=typeof saved?.support==='object'?saved.support.id===seat?'cat':saved.support.id.slice(10):!saved?i.state.on:null;
      if(on&&!stick(on,{quiet:true})){supports.detach(e);i.setState({on:null});}
      state();
      for(const [text,fn]of [['Put eyes on cat',()=>stick('cat')],['Take eyes off',detach]]){
        const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;i.key.appendChild(b);
      }
      const buttons=new Map();
      function addHost(host){if(!valid(host.id)||buttons.has(host.id))return;const b=document.createElement('button');b.type='button';b.textContent='Put eyes on '+host.def.label;b.onclick=()=>stick(host.id);i.key.appendChild(b);buttons.set(host.id,b);}
      for(const host of keepsakes.live.values())addHost(host);
      // The keepsake service's lifetime is the page lifetime. Ignore future
      // discoveries after this pair is removed/rebuilt.
      keepsakes.onGive(host=>{if(instance()===i)addHost(host);});
    },removed:stopPupils});
  return {stick,detach,hostChanged,updateCatSeat,stats,get pupilsActive(){return !!pupilStop;}};
}
