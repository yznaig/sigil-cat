// Shared main-pass presentation. The lighting/splat caches remain owned by their
// adapters. Cached quads share a draw; sleeping floor shadows share a geometry.
// All buffer writes are event-driven. There is no recurring idle callback.
export function worldPresentation(site) {
  return site.worldPresentation ??= createPresentation(site);
}
function createPresentation(site) {
  const {THREE:T,stage}=site,root=new T.Group();root.name='world-presentation';stage.scene.add(root);
  const pictures=new Set(),shadows=new Map(),chunks=[],ordered=[];
  const stats={pictureBuilds:0,shadowBuilds:0,pictureQuads:0,pictureBatches:0,shadowVertices:0,behindCat:0};
  const white=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
  const point=new T.Vector3(),tint=new T.Color(),corners=[[-.5,.5,0,1],[-.5,-.5,0,0],[.5,.5,1,1],[-.5,-.5,0,0],[.5,-.5,1,0],[.5,.5,1,1]];
  let pictureDirty=false,shadowDirty=false,listening=false,cleanupQueued=false,hidden=document.body.classList.contains('bm-scene');
  root.visible=!hidden;
  function cleanup(){cleanupQueued=false;if(pictureDirty||shadowDirty)return;const i=stage.onRender.indexOf(flush);if(i>=0)stage.onRender.splice(i,1);listening=false;}
  function schedule(){if(hidden||listening)return;listening=true;stage.onRender.push(flush);}
  function dirtyPictures(){pictureDirty=true;schedule();}
  function dirtyShadows(){shadowDirty=true;schedule();}
  function watchVisible(object,changed){
    let value=object.visible;
    Object.defineProperty(object,'visible',{configurable:true,enumerable:true,get:()=>value,set(v){if(value===v)return;value=v;if(!hidden)changed();}});
    return ()=>Object.defineProperty(object,'visible',{configurable:true,enumerable:true,writable:true,value});
  }
  // Depth between pictures (playtest-2, physics lane, item 2: "the egg texture could be seen through the bucket"). Each
  // picture is a flat card, and the cards were only painted far to near by their centres, so whatever sat inside a
  // container (its centre nearer than the container's) was painted whole over the container's front wall. Now every
  // lit mesh picture brings its own depth (the atlas renders it with the page camera's own depth range) and writes it
  // per pixel; a picture without depth (a splat prop, a card) writes one depth, its nearest point. Pictures are still
  // painted far to near, so edges blend as before; the depth test only decides where they truly pass through or
  // inside one another. The depth is cleared after each side of the cat, so nothing outside the pictures sees it.
  // Edges (visual lane, playtest-3: Aaron's "strange border lines", img2 and img6). A picture is one region of a larger
  // texture (an atlas tile, or the used corner of a target kept big through a tumble). Sampled with linear filtering,
  // a pixel at the card's edge also read the texel just past the region, whenever the card's edge fell between screen
  // pixels (a fractional pixel ratio: Windows' 125/150 %, the adaptive ratio's 0.25 steps), the picture had fewer texels
  // than the card has pixels (drawn lighter while moving, or drawn before the ratio rose), or the camera moved under a
  // sleeping picture. Past the region lies a neighbour's tile or what an earlier, larger draw left: a 1-px line of some
  // other colour along the card's edge (mostly its top and right, where the region ends). Every lookup is now held half
  // a texel inside the picture's own region (vClamp), so only its own (empty-margined) texels can reach the screen.
  const fragment=`varying vec2 vUv;varying float vMap;varying vec4 vTint;varying float vDepth;varying vec4 vClamp;uniform sampler2D depthMap;
    ${Array.from({length:8},(_,i)=>`uniform sampler2D map${i};`).join('\n')}
    void main(){vec4 c;vec2 uv=clamp(vUv,vClamp.xy,vClamp.zw);${Array.from({length:8},(_,i)=>`${i?'else ':''}${i<7?`if(vMap<${i+.5})`:''}{c=texture2D(map${i},uv);}`).join('')}
    gl_FragColor=vec4(c.rgb*vTint.rgb*vTint.a,c.a*vTint.a);
    #ifdef PICTURE_DEPTH
    if(gl_FragColor.a<.004)discard;
    gl_FragDepth=vDepth<0.?texture2D(depthMap,uv).r:vDepth;
    #endif
    }`;
  function makeChunk(depth){
    const geometry=new T.BufferGeometry(),uniforms={depthMap:{value:white}};for(let n=0;n<8;n++)uniforms['map'+n]={value:white};
    const material=new T.ShaderMaterial({uniforms,transparent:true,depthTest:depth,depthWrite:depth,defines:depth?{PICTURE_DEPTH:1}:{},
      blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor,
      vertexShader:'attribute vec2 pictureUv;attribute float pictureMap;attribute vec4 pictureTint;attribute float pictureDepth;attribute vec4 pictureClamp;varying vec2 vUv;varying float vMap;varying vec4 vTint;varying float vDepth;varying vec4 vClamp;void main(){vUv=pictureUv;vMap=pictureMap;vTint=pictureTint;vDepth=pictureDepth;vClamp=pictureClamp;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}',fragmentShader:fragment});
    const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);
    return {geometry,material,mesh,capacity:0,count:0,maps:[],depth,depthMap:null};
  }
  function capacity(c,quads){
    if(c.capacity>=quads)return;c.capacity=Math.max(32,2**Math.ceil(Math.log2(quads)));
    for(const [name,size] of [['position',3],['pictureUv',2],['pictureMap',1],['pictureTint',4],['pictureDepth',1],['pictureClamp',4]])c.geometry.setAttribute(name,new T.BufferAttribute(new Float32Array(c.capacity*6*size),size).setUsage(T.DynamicDrawUsage));
  }
  // Depth against the cat (e1111-58, note 2). His picture is one card at his middle (renderOrder 0, z=0 in the
  // world). A picture whose centre lies deeper along the view than his card draws before him, the rest after him;
  // within each side the existing order holds. Chunks never straddle him.
  const forward=new T.Vector3(),rel=new T.Vector3();
  function catDepth(){const c=site.cat?.card;if(!c)return Infinity;stage.camera.getWorldDirection(forward);return rel.copy(c.position).sub(stage.camera.position).dot(forward);}
  function behindCat(p,limit){return rel.copy(p.card.position).sub(stage.camera.position).dot(forward)>limit;}
  // The window depth (0 near … 1 far) of a picture without its own: its nearest point, given by its owner
  // (picture(card, quad, {near})), else its card's centre.
  const ndc=new T.Vector3();
  function nearDepth(p){
    const near=p.near?.();if(near!==undefined&&near!==null)return near;
    ndc.copy(p.card.position).project(stage.camera);return Math.min(1,Math.max(0,ndc.z*.5+.5));
  }
  // Depth is cleared after the pictures behind the cat and after those in front (a depth-only full-page triangle).
  const clearGeometry=new T.BufferGeometry();clearGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
  const clearMaterial=new T.ShaderMaterial({transparent:true,depthTest:true,depthWrite:true,depthFunc:T.AlwaysDepth,colorWrite:false,
    vertexShader:'void main(){gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(0.);}'});
  const clears=[];for(const order of [-.5,999]){const m=new T.Mesh(clearGeometry,clearMaterial);m.frustumCulled=false;m.renderOrder=order;m.name='picture-depth-clear';root.add(m);clears.push(m);}
  // Chunks of the other kind are kept aside, not disposed: a disposed material can take its program with it, and the
  // next one of that kind then builds it again live (0.3-0.6 s; integration, playtest-2, speed follow-up).
  const spare={true:[],false:[]};
  // A second divider (playtest-2, butterman lane): while Butterman is on screen, a picture deeper along the view than
  // his middle draws before him and the rest after him, the same split as at the cat. He tells us each frame he is
  // shown (divider.moved()); the batch is rebuilt only when the set of pictures behind him changes, and his own
  // draw order is handed back through spec.order(n). His felt is drawn in the transparent pass for this.
  // (Still needed with the per-pixel depth between pictures above: he is a splat, which takes no part in that depth,
  // so only draw order puts a keepsake behind him under him. Integration, playtest-2.)
  let divider=null,dividerKey='';
  function dividerDepth(){const d=divider?.depth();return d==null?null:d;}
  function deepKey(){const d=dividerDepth();if(d==null)return '';stage.camera.getWorldDirection(forward);let n=0,sum=0;for(const p of pictures)if(p.card.visible&&p.quad.material.visible&&behindCat(p,d)){n++;sum+=p.sequence;}return n+':'+sum+':'+(d>catDepth()?1:0);}
  function buildPictures(){
    ordered.length=0;for(const p of pictures)if(p.card.visible&&p.quad.material.visible)ordered.push(p);
    const limit=catDepth(),bm=dividerDepth();for(const p of ordered){p.behind=behindCat(p,limit);p.deep=bm!=null&&behindCat(p,bm);}
    ordered.sort((a,b)=>(b.behind-a.behind)||(b.deep-a.deep)||a.quad.renderOrder-b.quad.renderOrder||a.sequence-b.sequence);
    for(const c of chunks)if(c){c.count=0;c.maps.length=0;c.mesh.visible=false;}
    let index=0,c=null,side=null,deep=null,after=null;stats.behindCat=0;stats.depthQuads=0;
    for(const p of ordered){
      const m=p.quad.material,texture=m.uniforms?.map?.value||m.map||white,region=m.uniforms?.region?.value;
      if(p.behind)stats.behindCat++;
      // A chunk draws with depth or without it (floor shadows lie on the floor and take part in no depth test).
      const depth=p.depthMode!=='none',depthMap=p.depthMode==='map'?p.depthMap:null;
      if(!c||side!==p.behind||deep!==p.deep||c.depth!==depth||depthMap&&c.depthMap&&c.depthMap!==depthMap||c.maps.length===8&&!c.maps.includes(texture)){
        if(chunks[index]&&chunks[index].depth!==depth){const old=chunks[index];old.mesh.visible=false;old.count=0;spare[old.depth].push(old);chunks[index]=spare[depth].pop()??null;}
        c=chunks[index]??(chunks[index]=makeChunk(depth));c.depthMap=null;c.mesh.renderOrder=p.behind?-.9+index*.001:500+index;index++;side=p.behind;deep=p.deep;capacity(c,ordered.length);}
      if(p.deep)after=c.mesh.renderOrder;
      if(depthMap)c.depthMap=depthMap;
      const z=depth?(depthMap?-1:nearDepth(p)):0;if(depth)stats.depthQuads++;
      let map=c.maps.indexOf(texture);if(map<0){map=c.maps.length;c.maps.push(texture);}
      // Moving neighbours can reorder the batch without touching a sleeping
      // picture's transform. Its cached six world-space vertices stay valid.
      if(p.dirty){p.card.updateWorldMatrix(true,true);for(let k=0;k<6;k++){point.set(corners[k][0],corners[k][1],0).applyMatrix4(p.quad.matrixWorld);point.toArray(p.vertices,k*3);}p.dirty=false;}
      tint.setRGB(1,1,1);if(m.color)tint.copy(m.color).convertLinearToSRGB();
      const pos=c.geometry.attributes.position,uv=c.geometry.attributes.pictureUv,mi=c.geometry.attributes.pictureMap,col=c.geometry.attributes.pictureTint,dz=c.geometry.attributes.pictureDepth,cl=c.geometry.attributes.pictureClamp;
      // the picture's own region, half a texel in (see the fragment shader above)
      const rx=region?.x??1,ry=region?.y??1,rz=region?.z??0,rw=region?.w??0,tw=texture.image?.width||0,th=texture.image?.height||0,hx=tw?.5/tw:0,hy=th?.5/th:0;
      const c0=Math.min(rz+hx,rz+rx/2),c1=Math.min(rw+hy,rw+ry/2),c2=Math.max(rz+rx-hx,rz+rx/2),c3=Math.max(rw+ry-hy,rw+ry/2);
      for(let k=0;k<6;k++){const v=corners[k],n=c.count++,j=k*3;pos.setXYZ(n,p.vertices[j],p.vertices[j+1],p.vertices[j+2]);uv.setXY(n,v[2]*rx+rz,v[3]*ry+rw);mi.setX(n,map);col.setXYZW(n,tint.r,tint.g,tint.b,m.opacity);dz.setX(n,z);cl.setXYZW(n,c0,c1,c2,c3);}
    }
    for(const c of chunks){if(!c)continue;c.mesh.visible=!!c.count;c.geometry.setDrawRange(0,c.count);if(!c.count)continue;for(const a of Object.values(c.geometry.attributes)){a.clearUpdateRanges();a.addUpdateRange(0,c.count*a.itemSize);a.needsUpdate=true;}for(let n=0;n<8;n++)c.material.uniforms['map'+n].value=c.maps[n]||white;c.material.uniforms.depthMap.value=c.depthMap||white;}
    stats.pictureQuads=ordered.length;stats.pictureBatches=index;stats.pictureBuilds++;pictureDirty=false;
    if(bm!=null){dividerKey=deepKey();divider.order(after==null?(bm>limit?-.95:1):after+(after<0?.0005:.5));}
  }
  const shadowGeometry=new T.BufferGeometry(),shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
    vertexShader:'void main(){vec3 p=position;float h=max(0.,p.y);p+=vec3(.1,-1.,-3.5/3.)*h;p.y=.001;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
    fragmentShader:'void main(){gl_FragColor=vec4(.12,.09,.06,.12);}'});
  const shadowMesh=new T.Mesh(shadowGeometry,shadowMaterial);shadowMesh.renderOrder=-5;shadowMesh.frustumCulled=false;shadowMesh.visible=false;root.add(shadowMesh);
  let shadowCapacity=0;
  function buildShadows(){
    let needed=0;for(const s of shadows.values())if(s.stationary&&s.group.visible)for(const [o]of s.pairs)needed+=o.geometry.index?.count??o.geometry.attributes.position.count;
    if(needed>shadowCapacity){shadowCapacity=Math.max(1024,2**Math.ceil(Math.log2(needed)));shadowGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(shadowCapacity*3),3).setUsage(T.DynamicDrawUsage));}
    const position=shadowGeometry.attributes.position;let count=0;
    for(const s of shadows.values())if(s.stationary&&s.group.visible)for(const [o,m]of s.pairs){
      const a=o.geometry.attributes.position,indices=o.geometry.index,n=indices?.count??a.count;
      for(let i=0;i<n;i++){point.fromBufferAttribute(a,indices?indices.getX(i):i).applyMatrix4(m.uniforms.sourceMatrix.value);position.setXYZ(count++,point.x,point.y,point.z);}
    }
    if(position){position.clearUpdateRanges();position.addUpdateRange(0,count*3);position.needsUpdate=true;}shadowGeometry.setDrawRange(0,count);shadowMesh.visible=!!count;stats.shadowVertices=count;stats.shadowBuilds++;shadowDirty=false;
  }
  function flush(){
    if(!hidden){if(pictureDirty)buildPictures();if(shadowDirty)buildShadows();}
    // Do not splice a dispatch array while another adapter is using it.
    if(!cleanupQueued){cleanupQueued=true;queueMicrotask(cleanup);}
  }
  // A camera that moves and comes back (visual lane, playtest-3; Aaron's img7, "after I did buttaman scene 3 it kind of
  // bugged out some visuals"). Butterman's rise dollies the page camera in while widening it, and back after. A cached
  // picture is redrawn only when its own body moves, so whatever moved while the lens was wide (his shove, the cat's
  // startle) kept a picture drawn with the wide camera, and depth from the lens's near plane, once the camera came
  // back: the box flattened, the bucket cut off by a neighbour's wrong depth, a sliver of the flour by the board.
  // Every picture adapter (mesh atlas, mesh picture, splat prop) is tracked here and says whether it was drawn with
  // the page camera as it is now (adapter.stale). A change to the camera's projection arms a watch (the camera's
  // updateProjectionMatrix: a resize, the lens, the cat's own crop and restore); once the camera has held still for two
  // frames, the pictures drawn with another camera are redrawn through their owners (a world body's sync, which also
  // refreshes its hit box), a ~1.5 ms share per frame so a held lens does not stall a frame. Idle: no work at all.
  const adapters=new Set(),seenCam=new Float64Array(32),settledCam=new Float64Array(32),nowCam=new Float64Array(32);
  let watching=false,stillFrames=0,queue=null,batching=false;
  function readCam(out){const c=stage.camera;out.set(c.matrixWorld.elements,0);out.set(c.projectionMatrix.elements,16);return out;}
  const sameCam=(a,b)=>{for(let i=0;i<32;i++)if(a[i]!==b[i])return false;return true;};
  readCam(settledCam);seenCam.set(settledCam);
  function unwatch(){watching=false;const i=stage.onRender.indexOf(watchCamera);if(i>=0)stage.onRender.splice(i,1);}
  function watchCamera(){
    readCam(nowCam);
    if(!sameCam(nowCam,seenCam)){seenCam.set(nowCam);stillFrames=0;queue=null;return;}
    if(++stillFrames<2)return;
    if(!queue){if(sameCam(seenCam,settledCam)){queueMicrotask(unwatch);return;}settledCam.set(seenCam);queue=[...adapters].filter(a=>a.stale);}
    const owners=new Map();for(const e of site.world?.entries?.values()??[])if(e.presentation)owners.set(e.presentation,e);
    const t0=performance.now();batching=true;
    try{while(queue.length&&performance.now()-t0<1.5){const a=queue.shift();if(!a.stale)continue;const e=owners.get(a);if(e?.sync&&!e.timer)site.world.sync(e);else a.draw();}}
    finally{batching=false;site.meshPictures?.flush();flush();}
    if(!queue.length){queue=null;queueMicrotask(unwatch);}
  }
  function armCamera(){if(watching)return;watching=true;stillFrames=0;stage.onRender.push(watchCamera);}
  {const c=stage.camera,update=c.updateProjectionMatrix;c.updateProjectionMatrix=function(){update.call(this);armCamera();};}
  function track(adapter){adapters.add(adapter);return ()=>adapters.delete(adapter);}
  let sequence=0;
  // options.depthMap: the picture's own depth texture (the mesh atlas); options.near(): its nearest window depth;
  // options.depth:'none' takes no part in depth (floor shadows).
  function picture(card,quad=card.children[0],options={}){
    const p={card,quad,sequence:sequence++,dirty:true,vertices:new Float32Array(18),depthMode:options.depth==='none'?'none':options.depthMap?'map':'near',depthMap:options.depthMap||null,near:options.near||null};pictures.add(p);card.removeFromParent();const unwatch=watchVisible(card,dirtyPictures);dirtyPictures();
    return {invalidate(){p.dirty=true;dirtyPictures();if(!site.world?.syncing&&!batching)flush();},dispose(){unwatch();pictures.delete(p);dirtyPictures();},get batched(){return true;}};
  }
  function shadow(id,group,pairs){
    const s={group,pairs,stationary:false};shadows.set(id,s);const unwatch=watchVisible(group,()=>{if(s.stationary)dirtyShadows();});
    const setStatic=on=>{if(s.stationary===on)return;s.stationary=on;for(const mesh of group.children)on?mesh.layers.disable(0):mesh.layers.enable(0);dirtyShadows();};
    return {update(on){setStatic(on);if(on)dirtyShadows();},wake(){setStatic(false);},dispose(){setStatic(false);unwatch();shadows.delete(id);dirtyShadows();},get stationary(){return s.stationary;}};
  }
  // spec: { depth() -> his middle's depth along the view, or null while he is not shown; order(n) -> his draw order }
  const dividerApi={set(spec){divider=spec;dividerKey='';dirtyPictures();},
    moved(){if(!divider)return;const k=deepKey();if(k===dividerKey)return;dividerKey=k;if(hidden){divider.order(dividerDepth()>catDepth()?-.95:1);return;}dirtyPictures();}};
  // Speed lane (e1112-59): the first keepsake built these two programs live (a galaxy postcard stopped the page for
  // ~0.3 s). warm(): one picture chunk of each kind (with and without depth, physics lane) and the shared shadow,
  // drawn once ahead through stage.warm. Draws nothing visible.
  function warm(){for(const [n,depth] of [[0,true],[1,false]]){const c=chunks[n]??(chunks[n]=makeChunk(depth));capacity(c,1);stage.warm(c.mesh);}stage.warm(clears[0]);stage.warm(shadowMesh);}
  return {picture,shadow,flush,stats,root,shadowMesh,divider:dividerApi,warm,track,get batching(){return batching;},
    wake(id){const s=shadows.get(id);if(s?.stationary){s.stationary=false;for(const m of s.group.children)m.layers.enable(0);dirtyShadows();}},
    setHidden(on){hidden=on;root.visible=!on;if(!on){dirtyPictures();dirtyShadows();}else{const i=stage.onRender.indexOf(flush);if(i>=0)stage.onRender.splice(i,1);listening=false;}},
    get pending(){return pictureDirty||shadowDirty;},get listening(){return listening;},get pictures(){return pictures.size;},
    // Read-only, for checks (visual lane, playtest-3: checks/visual-hairlines.js scans each card's border).
    get list(){return [...pictures].map(p=>({card:p.card,quad:p.quad,depthMode:p.depthMode}));},get stationaryShadows(){let n=0;for(const s of shadows.values())if(s.stationary)n++;return n;}
  };
}
