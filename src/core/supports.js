// Occupied supports are event-driven. No constraint, parent scan or save runs at rest.
export function createSupports(site) {
  const { THREE:T, world, stage, store } = site;
  const registry=new Map(), categories=new Map(), motions=new Map(), pending=new Map(), listeners=new Set();
  const crownHeights=new Map();
  const stats={updates:0,mounts:0,detaches:0,frames:0}; let listening=false;
  const vector=a=>new T.Vector3(...(a||[0,0,0])), quaternion=a=>new T.Quaternion(...(a||[0,0,0,1]));
  const slotOf=(id,name)=>registry.get(id)?.slots.find(s=>s.id===name);
  const accepts=(s,e)=>typeof s.accepts==='function'?s.accepts(e):!s.accepts||s.accepts.includes(e.id)||s.accepts.includes(categories.get(e.id));
  function pose(id,name,local) {
    const r=registry.get(id),s=slotOf(id,name); if(!r||!s)return null;
    if(r.worldPose)return r.worldPose(s,local);
    r.object.updateWorldMatrix(true,false);
    const p=vector(local?.position||s.position),q=quaternion(local?.quaternion||s.quaternion),scale=new T.Vector3();
    new T.Matrix4().compose(p,q,new T.Vector3(1,1,1)).premultiply(r.object.matrixWorld).decompose(p,q,scale);
    return {p,q};
  }
  function localOf(s,custom) { return {position:[...(custom?.position||s.position||[0,0,0])],quaternion:[...(custom?.quaternion||s.quaternion||[0,0,0,1])],custom:!!custom}; }
  function setPose(e,p,q) { e.body.setTranslation(p,false);e.body.setRotation(q,false);world.sync(e);stats.updates++; }
  function unlisten(){const i=stage.onFrame.indexOf(tick);if(i>=0)stage.onFrame.splice(i,1);listening=false;}
  function listen(){if(!motions.size||listening||document.hidden)return;stage.onFrame.push(tick);listening=true;}
  function tick(dt) {
    stats.frames++;
    for(const [e,m] of motions){
      m.t=(performance.now()-m.start)/1000; const target=pose(e.support.id,e.support.slot,e.support); if(!target){detach(e);continue;}
      const u=Math.min(1,m.t/m.duration),a=m.kind==='pin'?Math.sin(u*Math.PI*4)*.105*(1-u)**3:m.kind==='hang'?Math.sin(u*Math.PI*HANG.cycles*2+m.phase)*m.amp*(1-u)**2:0;
      const q=target.q.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),a));
      const pivot=vector(m.pivot),p=target.p.clone().add(pivot.clone().applyQuaternion(target.q)).sub(pivot.applyQuaternion(q));
      // The first .22s brings the insertion point to the pin/slot. Then only the
      // pin's one angular degree of freedom remains; its exact final pose sleeps.
      if(m.t<.22&&m.from)p.lerpVectors(m.from,p,1-(1-m.t/.22)**3);
      setPose(e,p,q);
      if(u===1){motions.delete(e);world.save(e);registry.get(e.support.id)?.onChange?.();}
    }
    if(!motions.size)unlisten();
  }
  function mount(e,id,name,{animate=true,localPose}={}) {
    const r=registry.get(id),s=slotOf(id,name);
    if(!r||!s||!accepts(s,e)||(s.occupant&&s.occupant!==e.id))return false;
    if(world.held?.entry===e)world.release();
    detach(e,{wake:false,save:false});
    world.cancelReturn(e);
    const from=e.object.getWorldPosition(new T.Vector3()); s.occupant=e.id;
    e.support={id,slot:name,...localOf(s,localPose)};
    world.park(e);e.body.setBodyType(world.rapier.RigidBodyType.Fixed,false);e.supported?.(e.support);
    const target=pose(id,name,e.support);setPose(e,target.p,target.q);
    // An attachment supplies an explicit presentation hook. Its parent already
    // owns rendering/invalidation (e.g. the cat picture); it gets no polling loop.
    r.adopt?.(e,s,e.support); stats.mounts++;world.save(e);r.onChange?.();r.onMount?.(e,{animate});
    if(animate&&!stage.reducedMotion&&r.kind!=='attachment'){
      const kind=s.kind||r.kind;
      motions.set(e,{t:0,start:performance.now(),duration:kind==='pin'?1.6:kind==='hang'?HANG.seconds:.22,kind,pivot:s.pivot||[0,0,0],from,amp:HANG.amp,phase:0});listen();
    }
    return true;
  }
  // A hanging item (the shelf's hooks, slot kind 'hang') swings about its pivot after it is hung, and again when it
  // is nudged (a tap, or a pull that did not lift it). Event-driven, a few seconds long, off under reduced motion.
  const HANG={seconds:2.6,cycles:3,amp:.2};
  // A pinned card swings on its pin too, briefly (cards lane, playtest 3: the ticket's tap-wiggle): the pinning swing's
  // shape over PIN_WIGGLE seconds.
  const PIN_WIGGLE=.7;
  function swing(e,strength=1){
    const s=e?.support&&slotOf(e.support.id,e.support.slot),r=s&&registry.get(e.support.id),kind=s&&(s.kind||r.kind);
    if(!s||(kind!=='hang'&&kind!=='pin')||stage.reducedMotion)return false;
    motions.set(e,{t:0,start:performance.now(),duration:kind==='pin'?PIN_WIGGLE:HANG.seconds,kind,pivot:s.pivot||[0,0,0],from:null,amp:HANG.amp*Math.max(-1.5,Math.min(1.5,strength)),phase:0});listen();return true;
  }
  function detach(e,{wake=true,save=true}={}) {
    if(!e.support)return false;
    const r=registry.get(e.support.id),s=slotOf(e.support.id,e.support.slot);
    // Resolve an animated parent only on this event, before releasing its visual.
    if(r?.kind==='attachment'){const p=pose(e.support.id,e.support.slot,e.support);if(p)setPose(e,p.p,p.q);}
    r?.release?.(e,s);if(s?.occupant===e.id)s.occupant=null;
    motions.delete(e);pending.delete(e);e.support=null;e.body.setBodyType(world.rapier.RigidBodyType.Dynamic,false);
    e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);
    if(wake)world.wake(e);else e.body.sleep();
    // A release is a resumable free pose, never a stale occupied slot or a new
    // sleeping pose in mid-air. world.add restores awake:false/true explicitly.
    if(save)world.save(e,true);stats.detaches++;r?.onChange?.();if(!motions.size)unlisten();return true;
  }
  // Where an item would sit in a slot, on the page: its collider points at the slot pose, projected, padded to at least
  // SNAP.min px and by SNAP.pad. Used for snapping by pointer position (e1111-58, note 7).
  const SNAP={min:60,pad:16};
  const _v=new T.Vector3(),_s={};
  function footprint(e,id,s){
    const target=pose(id,s.id);if(!target)return null;
    const vs=site.keepsakes?.get(e.id)?.colliderVertices;let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;
    if(vs?.length)for(const v of vs){stage.toScreen(_v.copy(v).applyQuaternion(target.q).add(target.p),_s);l=Math.min(l,_s.x);t=Math.min(t,_s.y);r=Math.max(r,_s.x);b=Math.max(b,_s.y);}
    else{stage.toScreen(target.p,_s);l=r=_s.x;t=b=_s.y;}
    // the hand's own grip point, where the pointer would be with the item in place
    if(world.held?.entry===e){stage.toScreen(_v.copy(world.held.local).applyQuaternion(target.q).add(target.p),_s);l=Math.min(l,_s.x);t=Math.min(t,_s.y);r=Math.max(r,_s.x);b=Math.max(b,_s.y);}
    const cx=(l+r)/2,cy=(t+b)/2,w=Math.max(SNAP.min,r-l+2*SNAP.pad),h=Math.max(SNAP.min,b-t+2*SNAP.pad);
    return {x:cx-w/2,y:cy-h/2,w,h,cx,cy};
  }
  function open(e){
    const out=[];
    for(const [id,r]of registry)for(const s of r.slots)if(!s.disabled&&accepts(s,e)&&(!s.occupant||s.occupant===e.id))out.push([id,s]);
    return out;
  }
  // With a pointer ({x,y} page px; by default the one holding e, if any): the open compatible slot whose footprint is
  // under it, nearest centre first, at any depth and speed. Otherwise (keyboard, or no footprint under the pointer):
  // the old rule, a slow body within .25 units and 32 px of the slot.
  // A support with an `area(e)` (the shelf, the pinboard: e1112 playtest-2) takes a drop anywhere over its whole
  // picture: the area is that rect joined with the footprints of its open slots for e (the hooks hang below the
  // shelf), and the open slot nearest the pointer wins. The returned rect is the whole area, so the highlight
  // outlines the furniture rather than one slot.
  function areaOf(e,id,r,slots){
    const a=r.area?.(e);if(!a)return null;let l=a.x,t=a.y,rr=a.x+a.w,b=a.y+a.h;const fs=[];
    for(const s of slots){const f=footprint(e,id,s);if(!f)continue;fs.push([s,f]);l=Math.min(l,f.x);t=Math.min(t,f.y);rr=Math.max(rr,f.x+f.w);b=Math.max(b,f.y+f.h);}
    return {rect:{x:l,y:t,w:rr-l,h:b-t},fs};
  }
  function candidate(e,pointer=site.worldInput?.pointerOf?.(e)) {
    if(pointer){
      const bySupport=new Map();for(const [id,s]of open(e)){if(!bySupport.has(id))bySupport.set(id,[]);bySupport.get(id).push(s);}
      let area=null;
      for(const [id,slots]of bySupport){
        const r=registry.get(id),a=areaOf(e,id,r,slots);if(!a||pointer.x<a.rect.x||pointer.x>a.rect.x+a.rect.w||pointer.y<a.rect.y||pointer.y>a.rect.y+a.rect.h)continue;
        for(const [s,f]of a.fs){const d=Math.hypot(pointer.x-f.cx,pointer.y-f.cy);if(!area||d<area.d)area={id,name:s.id,d,rect:a.rect,screen:true,area:true};}
      }
      if(area)return area;
      let best=null;
      for(const [id,s]of open(e)){
        if(registry.get(id).area)continue;
        const f=footprint(e,id,s);if(!f||pointer.x<f.x||pointer.x>f.x+f.w||pointer.y<f.y||pointer.y>f.y+f.h)continue;
        const d=Math.hypot(pointer.x-f.cx,pointer.y-f.cy);if(!best||d<best.d)best={id,name:s.id,d,rect:{x:f.x,y:f.y,w:f.w,h:f.h},screen:true};
      }
      if(best)return best;
    }
    const v=e.body.linvel();if(Math.hypot(v.x,v.y,v.z)>.65)return null;
    let best=null;
    for(const [id,s]of open(e)){
      const p=pose(id,s.id),d=p.p.distanceTo(e.object.position),a=stage.toScreen(p.p),b=stage.toScreen(e.object.position);
      if(d<=.25&&Math.hypot(a.x-b.x,a.y-b.y)<=32&&(!best||d<best.d))best={id,name:s.id,d};
    }
    return best;
  }
  function offer(e,pointer) {
    const best=candidate(e,pointer);return !!best&&mount(e,best.id,best.name);
  }
  function restore(e,saved){
    if(!saved||typeof saved!=='object')return false;
    if(!registry.has(saved.id)){e.support=saved;world.park(e);e.body.setBodyType(world.rapier.RigidBodyType.Fixed,false);pending.set(e,saved);return false;}
    return mount(e,saved.id,saved.slot,{animate:false,localPose:saved.custom?saved:undefined});
  }
  function register(def){
    if(registry.has(def.id))throw Error('Duplicate support '+def.id);
    registry.set(def.id,def);
    for(const [e,s]of pending)if(s.id===def.id){pending.delete(e);restore(e,s);}
    return ()=>{for(const e of world.entries.values())if(e.support?.id===def.id)detach(e);registry.delete(def.id);};
  }
  function update(id){
    const r=registry.get(id);if(!r)return;
    for(const e of world.entries.values())if(e.support?.id===id){
      const s=slotOf(id,e.support.slot);if(!s)continue;
      if(!e.support.custom)Object.assign(e.support,localOf(s));
      const p=pose(id,e.support.slot,e.support);setPose(e,p.p,p.q);r.adopt?.(e,s,e.support);world.save(e);
    }
  }
  // Cat-local art stays in the cat's existing picture. Only picking/detaching
  // resolves its page-space proxy, including the picture's roll and bob.
  function registerCatSeat({id,slots,parent=site.cat.seat,onChange}){
    const cat=site.cat;
    return register({id,kind:'attachment',object:parent,slots,onChange,
      worldPose(s,local){
        parent.updateWorldMatrix(true,false);cat.spin.updateWorldMatrix(true,false);
        const l=local||s,p=parent.localToWorld(vector(l.position)),q=parent.getWorldQuaternion(new T.Quaternion()).multiply(quaternion(l.quaternion));
        const inCat=cat.spin.worldToLocal(p.clone()),screen=cat.screenOf(inCat.toArray());
        const actual=stage.onWall(screen.x,screen.y,p.z);
        q.premultiply(new T.Quaternion().setFromAxisAngle(stage.camera.getWorldDirection(new T.Vector3()),-cat.rollNow));
        return {p:actual,q};
      },
      adopt(e,s,local){e.presentation?.attach(parent,parent,cat.touch,local);if(e.presentation)cat.inPicture(e.presentation.visual,true);cat.touch();},
      release(e){e.presentation?.detach();cat.touch();}
    });
  }
  function refreshAttachments(){for(const e of world.entries.values())if(e.support&&registry.get(e.support.id)?.kind==='attachment'){const p=pose(e.support.id,e.support.slot,e.support);setPose(e,p.p,p.q);}}
  function setCrownHeight(id,height){height==null?crownHeights.delete(id):crownHeights.set(id,height);site.cat.setSeatLift(Math.max(0,...crownHeights.values()));}
  function discover(id){
    if(!categories.has(id)||store.get('worldDiscoveries.'+id))return;
    store.set('worldDiscoveries.'+id,categories.get(id));for(const f of listeners)f(id,categories.get(id));
  }
  function registerCategory(id,category){categories.set(id,category);if(site.keepsakes.has(id))discover(id);}
  site.keepsakes.onGive(i=>discover(i.id));
  document.addEventListener('visibilitychange',()=>{const now=performance.now();for(const m of motions.values()){if(document.hidden)m.hiddenAt=now;else if(m.hiddenAt){m.start+=now-m.hiddenAt;delete m.hiddenAt;}}unlisten();listen();});
  return {register,registerCatSeat,mount,detach,offer,candidate,footprint,swing,HANG,SNAP,restore,update,pose,refreshAttachments,setCrownHeight,get crownHeight(){return site.cat.seatLift;},registerCategory,discover,registry,categories,stats,
    onDiscover(f){listeners.add(f);return()=>listeners.delete(f);},
    count:category=>Object.values(store.get('worldDiscoveries',{})).filter(c=>c===category).length,
    forget(e){pending.delete(e);detach(e,{wake:false,save:false});},get active(){return motions.size;},get listening(){return listening;}};
}
