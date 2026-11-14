// Where a resting prop may be (fix round C, playtest-2): ONE rule for the three places that decide it.
// The floor is the whole visible floor: inside the page's sides and above the footer, and beside and behind him too.
// What he or the furniture hides there is slid sideways into view by the occluders rule (world-occluders.js, e1112-35),
// and a prop more than 80% off the page respawns (world.js offscreen). Behind him is not a lesser floor: the old
// restore and resize fits pulled every prop into the arrival band in front of him (worldLayout.reachable), so a prop
// placed or left beside or behind him moved on every reload.
//  - placement: floorHome below puts a new prop fully inside floorRect;
//  - restore: world.add keeps the saved pose exactly when the layout is unchanged (it calls the entry's resize only
//    when the layout differs);
//  - resize (a real layout change, a fresh arrival, a small prop coming to rest): fitResting moves the prop the least
//    distance back inside the page's sides and above the footer, and never forward from the back of the room.
// worldLayout.reachable stays the ARRIVAL band (a respawn, a puddle, the lamp's fall): where something new appears.
export const FLOOR={side:12,top:8,footer:30};
// A newcomer may arrive in the front band covering up to this share of its own picture rather than behind his feet.
// flat, shown (integration, playtest-3, "the flour seems to be spawning way in the back" with the cards on the floor):
// a prop lying flat (its colliders under `flat` high as it lies: the four cards, not the rifle or the pitchfork) and
// floor art (the puddle) take floor, not height. What they take is their floor area as the camera shows it: a
// newcomer's base (the floor its own colliders stand on) must keep off it, but the rest of its picture may stand over
// a flat prop behind it, as long as `shown` of that prop stays uncovered (the 20% the room's "mostly unobstructed"
// rule allows, checks/world-layout.js; well inside the occluders' SCOOT.shown, so nothing placed this way is scooted). The old rule counted a lying card's whole screen box, so a room with its cards
// on the floor had no front band left (physics lane item 4's limit: 33% covered).
export const FRONT={overlap:.15,flat:.02,shown:.8};
export function floorRect(stage){return {left:FLOOR.side,right:stage.width-FLOOR.side,top:stage.insets.top+FLOOR.top,bottom:stage.height-stage.insets.bottom-FLOOR.footer};}
// vertices: the body-local points its picture spans (collider or picture vertices). reach: for a body still in the
// air, its farthest point from its origin, so the spot it will land on is kept above the footer too.
export function fitResting(site,entry,vertices,{reach=0}={}){
 if(entry.support)return false;
 const {THREE:T,stage}=site,f=floorRect(stage),q=new T.Quaternion().copy(entry.body.rotation());let moved=false;
 // Twice: a shift along the floor changes the prop's depth and so its projected size.
 for(let n=0;n<2;n++){
  const p=new T.Vector3().copy(entry.body.translation()),ps=vertices.map(v=>stage.toScreen(v.clone().applyQuaternion(q).add(p)));
  const l=Math.min(...ps.map(v=>v.x)),r=Math.max(...ps.map(v=>v.x)),b=Math.max(...ps.map(v=>v.y));
  const landing=reach&&!entry.body.isSleeping()?Math.max(b,stage.toScreen(new T.Vector3(p.x,0,p.z+reach)).y):b;
  const dx=l<f.left?f.left-l:r>f.right?f.right-r:0,dy=Math.min(0,f.bottom-landing);
  if(Math.abs(dx)<.5&&Math.abs(dy)<.5)break;
  const s=stage.toScreen(new T.Vector3(p.x,0,p.z));let next=stage.onFloor(s.x+dx,s.y+dy);next.y=p.y;
  next=clearOfCat(site,vertices,q,next);entry.body.setTranslation(next,false);moved=true;
 }
 return moved;
}
// Finite placement at discovery. Player poses never pass through this search.
// Use the actual hull extents, including depth, rather than the old DOM sizes.
export async function floorHome(site,inst,vertices,rotation,preferred){
 const {THREE:T,stage,keepsakes,worldLayout:L}=site;
 // An explicit placement before the body exists (keepsake.moveTo) is kept; autoHome itself starts false for any
 // keepsake without a collection slot, so it cannot tell a default arrival from a placed one.
 if(inst.explicitPlacement)return preferred;
 inst.autoHome=true;
 inst.floorOrigin??=preferred.clone();
 // The shelf's own props never wait on the shelf that is constructing them (its place is furniture to avoid).
 const canStore=!['tin','pat','rifle','top'].includes(inst.id);
 if(canStore)await site.shelf?.ensure();
 // A shelf still dropping into place has not reserved its place yet: wait for it (bounded, as the waits below).
 for(let k=0;canStore&&k<300&&site.shelf?.arriving;k++)await stage.after(0);
 // Furniture discovered in the same moment reserves its space on its first
 // picture. Placing before that put the box half over the rack's stand and
 // the fork behind the pinboard.
 const rack=keepsakes.get('rack');
 if(rack&&!L.furniture().rack?.w){await rack.worldTask;for(let k=0;k<4&&!L.furniture().rack?.w&&keepsakes.get('rack')===rack;k++)await stage.after(0);}
 // (only once the board is unlocked: a lone card, which now finds its own floor spot here, has no board to wait for;
 // cards lane, playtest 3)
 if(['paper','postcard','ticket','recipe'].some(id=>keepsakes.has(id))&&site.supports.count('flat')>=2&&!site.pinboard?.ready){
  for(let k=0;k<240&&!site.pinboard?.ready;k++)await stage.after(0);
  await stage.after(0);await stage.after(0);
 }
 const planned=site.floorHomes??=new Map();
 const {bounds,project,visual,occupied,cost,choose,furniture,flatOf}=placer(site);
 const b=bounds(vertices,rotation);let best=null;
 // Props are never put onto the shelf, its hooks or the stand for the player (playtest-3, the orchestrator: as nothing
 // goes straight onto the pinboard, the player places them). A crowded floor is packed tighter instead: beside and
 // behind him (the occluders' scoot keeps those reachable), or slightly overlapping when nothing is clear. The old
 // crowded-kitchen rule stored the shelf's untouched props on the shelf, after the plan, which also left the flour far
 // back (physics lane item 4).
 // Untouched defaults (grabs and explicit placements clear autoHome;
 // supported/attached/animated props stay out of this).
 const others=[];
 for(const i of keepsakes.live.values()){
  const e=i.worldEntry;
  if(i===inst||!i.autoHome||i.def.sky||!e||e.fixed||e.support||i.flight||i.picture?.attached||!i.colliderVertices?.length||e.timer||e.canGrab===false||site.world.held?.entry===e)continue;
  const q=bounds(i.colliderVertices,new T.Quaternion().copy(e.body.rotation())),now=new T.Vector3().copy(e.body.translation());now.y=-q.min.y+.002;
  // Only a prop still resting where placement put it may be moved. Awake ones
  // (dropping in, or sliding) and ones the player or physics moved (knocked,
  // stacked, poured into the box) keep their place and count as taken floor.
  const asleep=e.body.isSleeping(),spot=i.floorSpot,untouched=asleep&&!!spot&&Math.hypot(now.x-spot.x,now.z-spot.z)<.05;
  const r=!asleep&&planned.get(i.id)||visual(i,project(q,now));
  others.push({i,e,b:q,p:i.floorOrigin||now.clone(),r:flatOf(q)?{...r,flat:true}:r,untouched});
 }
 const area=m=>{const p=m.p.clone();p.y=-m.b.min.y+.002;const r=project(m.b,p);return r.w*r.h;};
 for(const m of others)m.area=area(m);
 others.sort((a,b)=>b.area-a.area);
 // 1. Stable: props stay exactly where they rest. Moving every prop on each
 // discovery woke them (rattles, impact sounds) and made the floor jump. Only
 // an untouched prop whose spot furniture, controls or the cat has since
 // taken is re-chosen, then the newcomer.
 let plan=null;const moves=[];
 {
  const obstacles=occupied(new Set([inst,...others.map(m=>m.i)]));let clean=true;
  const relocate=[];
  for(const m of others){const c=m.untouched?cost(m.r,furniture):{};if(c.covered||c.cat)relocate.push(m);else obstacles.push(m.r);}
  for(const m of [...relocate,{i:inst,b,p:inst.floorOrigin}]){
   let next=choose(m.b,m.p,obstacles);
   // A newcomer whose only clear spot is behind his feet (playtest-3, physics lane item 4: "the flour seems to be
   // spawning way in the back"; the front band was full of props lying on the floor) takes the least covered spot in
   // the front band instead, when it covers at most FRONT.overlap of its own picture: a slight overlap in front is
   // better than arriving out of sight beside his head. No other prop is moved for it.
   if(m.i===inst&&next&&!next.cat&&next.r.y+next.r.h<keepsakes.feet.y){const f=choose(m.b,m.p,obstacles,{front:true});if(f&&!f.cat&&f.covered<=FRONT.overlap*f.r.w*f.r.h)next={...f,covered:0};}
   if(!next||next.covered||next.cat)clean=false;if(next){obstacles.push(next.r);moves.push([m,next]);}
  }
  if(clean)plan=moves;
 }
 // 2. No clear spot: repack the untouched defaults together, largest first.
 // Greedy discovery order could put flour behind a later box even when a
 // clear arrangement existed. With nothing clear left, each takes its least
 // covered spot (a slight overlap) rather than leaving the floor.
 if(!plan){
  const moving=[{i:inst,b,p:inst.floorOrigin,area:area({b,p:inst.floorOrigin})},...others.filter(m=>m.untouched&&!m.e.support)];
  moving.sort((a,b)=>b.area-a.area);
  const obstacles=[...occupied(new Set(others.map(m=>m.i).concat(inst))),...others.filter(m=>!m.untouched&&!m.e.support).map(m=>m.r)];plan=[];
  for(const m of moving){const next=choose(m.b,m.p,obstacles);if(next){obstacles.push(next.r);plan.push([m,next]);}}
 }
 for(const [m,next] of plan){
  // A prop the player has put on a support since the plan was made stays there.
  if(m.i!==inst&&m.e.support)continue;
  planned.set(m.i.id,next.r);m.i.floorSpot=next.p.clone();
  if(m.i===inst){best=next;continue;}
  // Compare the floor position only: the planned rest height never equals a
  // settled body's own, and that difference alone used to move and wake it.
  const now=m.e.body.translation();if(Math.hypot(next.p.x-now.x,next.p.z-now.z)<1e-4)continue;
  // Keep rotation and height: a sleeping body is moved at rest (no fall, no
  // impact sound, still asleep).
  next.p.y=now.y;m.e.body.setTranslation(next.p,false);site.world.sync(m.e);site.world.save(m.e);m.e.rest?.(m.e);
 }
 if(!best)return preferred;
 planned.set(inst.id,best.r);best.p.y=preferred.y;return best.p;
}

// Against his colliders directly, not the scene query: a body he gained since the last step is not in its tree yet.
function touchesCat(body,center,shape){for(let k=0;k<body.numColliders();k++)if(body.collider(k).intersectsShape(shape,center,{x:0,y:0,z:0,w:1}))return true;return false;}
// A resize can push a resting prop's clamped spot into the cat's own body (cat-body.js), which then shoves it back
// off the page. Step the spot back across the floor (up the screen), keeping its x, until its box is clear of him.
// sideways: first slide it along its own row away from him (then the other way), never past the page's 16px edge,
// then toward the viewer; a card spawned against him would otherwise be shoved half off the page as it falls.
export function clearOfCat(site,vertices,q,p,{sideways=false}={}){
 // His body is built lazily from a step or a query (cat-body.js); a spawn before his first step must still see it.
 const cat=site.world?.cat;cat?.update?.(true);const body=cat?.enabled&&cat.body,R=site.world?.rapier;if(!body||!R)return p;
 const {THREE:T,stage}=site,b=new T.Box3().setFromPoints(vertices.map(v=>v.clone().applyQuaternion(q))),half=b.getSize(new T.Vector3()).multiplyScalar(.5).addScalar(.015);
 const box=new R.Cuboid(half.x,half.y,half.z),hits=at=>touchesCat(body,b.getCenter(new T.Vector3()).add(at),box);
 if(!hits(p))return p;
 const s=stage.toScreen(new T.Vector3(p.x,0,p.z));
 if(sideways){
  const fits=n=>{const xs=vertices.map(v=>stage.toScreen(v.clone().applyQuaternion(q).add(n)).x);return Math.min(...xs)>=16&&Math.max(...xs)<=stage.width-16;};
  const away=Math.sign(s.x-stage.toScreen(new T.Vector3().copy(body.translation())).x)||-1;
  for(const dir of [away,-away])for(let dx=12;dx<stage.width;dx+=12){const n=stage.onFloor(s.x+dir*dx,s.y);n.y=p.y;if(!fits(n))break;if(!hits(n))return n;}
  // Then toward the viewer, in front of his paws, while it stays above the footer.
  const floorLine=stage.height-stage.insets.bottom-30;
  for(let dy=12;dy<400;dy+=12){const n=stage.onFloor(s.x,s.y+dy);n.y=p.y;if(Math.max(...vertices.map(v=>stage.toScreen(v.clone().applyQuaternion(q).add(n)).y))>floorLine)break;if(!hits(n))return n;}
 }
 for(let dy=12;dy<400;dy+=12){const n=stage.onFloor(s.x,s.y-dy);n.y=p.y;if(!hits(n))return n;}
 return p;
}

// What a placement search shares (floorHome below, and clearSpot for a respawn): the floor taken by furniture, controls
// and other props, his body and whiskers, and the best clear spot near a start.
export function placer(site){
 const {THREE:T,stage,keepsakes,worldLayout:L}=site;
 const planned=site.floorHomes??=new Map(),footer=stage.height-stage.insets.bottom;
 const bounds=(vs,q)=>new T.Box3().setFromPoints(vs.map(v=>v.clone().applyQuaternion(q)));
 // lying flat (FRONT.flat): its height as it lies
 const flatOf=b=>b.max.y-b.min.y<FRONT.flat;
 const project=(b,p)=>{
  let l=Infinity,t=Infinity,r=-Infinity,d=-Infinity;
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
   const a=stage.toScreen(new T.Vector3(x+p.x,y+p.y,z+p.z));l=Math.min(l,a.x);t=Math.min(t,a.y);r=Math.max(r,a.x);d=Math.max(d,a.y);
  }
  return {x:l,y:t,w:r-l,h:d-t};
 };
 const furniture=Object.values(L.furniture()).filter(r=>r.w&&r.h);
 // The drawn furniture itself, in case its reservation is not yet refreshed.
 for(const f of [site.pinboard,site.shelf,site.rack]){const r=f?.picture?.rect;if(r?.w>2&&r.h>2)furniture.push({...r});}
 // An opened <details> menu overlays the floor for a moment; only its summary
 // is a standing control. Props under the open panel must not be moved.
 for(const actions of document.querySelectorAll('.world-furniture-actions')){const el=actions.matches('details')&&actions.querySelector('summary')||actions,r=el.getBoundingClientRect();if(r.width&&r.height)furniture.push({x:r.x,y:r.y,w:r.width,h:r.height});}
 // Art can stand past its collider (the closed box's flaps): a resting prop
 // also takes the screen area of its drawn picture.
 function visual(i,r){
  const v=i.worldEntry?.body.isSleeping()&&i.picture?.card?.visible&&i.picture.rect;if(!v)return r;
  const x=Math.min(r.x,v.x),y=Math.min(r.y,v.y);return {x,y,w:Math.max(r.x+r.w,v.x+v.w)-x,h:Math.max(r.y+r.h,v.y+v.h)-y};
 }
 function occupied(excluded){
  const out=[...furniture];
  for(const other of keepsakes.live.values()){
   // Fixed floor art without a body (the puddle) is still floor taken; the
   // grease streak lives on the glass in front and covers nothing.
   const floorArt=other.def.fixed&&other.def.layer!=='front';
   if(excluded.has(other)||!other.physical&&!floorArt||other.def.sky||other.stored||other.worldEntry?.support||other.object?.visible===false)continue;
   const e=other.worldEntry;
   if(e&&!e.fixed&&other.colliderVertices?.length){
    const b=bounds(other.colliderVertices,new T.Quaternion().copy(e.body.rotation())),p=new T.Vector3().copy(e.body.translation());
    p.y=-b.min.y+.002;const r=visual(other,project(b,p));out.push(flatOf(b)?{...r,flat:true}:r);
   }else{const r=(!e&&planned.get(other.id))||other.box;out.push(floorArt&&!e&&r?{...r,flat:true}:r);}
  }
  return out;
 }
 // His whiskers stand out past the body hit test; a box must not rest on them.
 const whiskers=[];
 for(const w of site.cat.config?.whiskers?.[site.cat.shown]||[]){
  const pts=w.map(p=>site.cat.screenOf(p,{}));
  for(let s=0;s+1<pts.length;s++)for(let k=0;k<=8;k++)whiskers.push({x:pts[s].x+(pts[s+1].x-pts[s].x)*k/8,y:pts[s].y+(pts[s+1].y-pts[s].y)*k/8});
 }
 const over=(r,o)=>Math.max(0,Math.min(r.x+r.w+5,o.x+o.w)-Math.max(r.x-5,o.x))*Math.max(0,Math.min(r.y+r.h+5,o.y+o.h)-Math.max(r.y-5,o.y));
 // base: the newcomer's own floor area on screen (a function, worked out only when a flat prop is in the way)
 function cost(r,obstacles,base=null){
  let covered=0,b=null;
  for(const o of obstacles)if(o){
   const a=over(r,o);if(!a)continue;
   // a flat prop: its floor is taken (the newcomer's base keeps off it), and the newcomer may hide no more of it than
   // 1 - FRONT.shown; without a base (a caller that has none) it counts whole, as before
   if(o.flat&&base){b??=base();covered+=over(b,o)+Math.max(0,a-(1-FRONT.shown)*o.w*o.h);}else covered+=a;
  }
  // A margin round him: settling, his bob and a flat prop's bounce all move
  // a prop a few pixels from its planned rectangle.
  let cat=0;for(const u of [0,.25,.5,.75,1])for(const v of [0,.25,.5,.75,1])if(site.cat.hitTest(r.x-8+(r.w+16)*u,r.y-8+(r.h+16)*v))cat++;
  for(const w of whiskers)if(w.x>r.x-5&&w.x<r.x+r.w+5&&w.y>r.y-5&&w.y<r.y+r.h+5)cat++;
  return {covered,cat};
 }
 // His own body (cat-body.js) is a solid: a prop placed overlapping it, even where the picture shows floor beside
 // or behind him, is pushed out on arrival and tumbles into its neighbours. Test the candidate's box against his
 // hulls themselves (not a round footprint: that took the floor in front of him and crowded everything else).
 site.world?.cat?.update?.(true);const catBody=site.world?.cat?.enabled&&site.world.cat.body,R=site.world?.rapier,size=new T.Vector3(),mid=new T.Vector3(),ident={x:0,y:0,z:0,w:1};
 const inCat=(b,p)=>{if(!catBody||!R)return false;b.getSize(size).multiplyScalar(.5).addScalar(.015);b.getCenter(mid).add(p);return touchesCat(catBody,mid,new R.Cuboid(size.x,size.y,size.z));};
 // front: only spots whose bottom is below his feet (the front band).
 function choose(b,start,obstacles,{front=false}={}){
  const from=stage.toScreen(new T.Vector3(start.x,0,start.z));let best=null;
  const foot=b.clone();foot.max.y=foot.min.y;                     // its floor area: the box's bottom face
  function consider(x,y){
   const p=L.anchor(x,y);if(Math.abs(p.x)>10||Math.abs(p.z)>10)return;p.y=-b.min.y+.002;
   const r=project(b,p),f=floorRect(stage);if(r.x<f.left||r.x+r.w>f.right||r.y<f.top||r.y+r.h>f.bottom)return;
   if(front&&r.y+r.h<keepsakes.feet.y)return;
   let {covered,cat}=cost(r,obstacles,()=>project(foot,p));if(inCat(b,p))cat+=25;
   // Beside him is fine; far behind him art shrinks and, with no visible
   // horizon on a phone, reads as floating beside his head.
   const behind=Math.max(0,keepsakes.feet.y-120-(r.y+r.h));
   // A short screen (a phone on its side) has a thin floor band in front of him, so the nearest clear spot was far
   // back, small beside his head and right up against the board, where a nudge put the box behind it (fix round A,
   // e1112-35). There a spot whose bottom is above his feet costs much more, so props stay in the front band if any
   // clear spot is left there.
   const back=stage.height<=500?Math.max(0,keepsakes.feet.y-20-(r.y+r.h))*50:0;
   const score=cat*1e6+covered*100+Math.hypot(x-from.x,y-from.y)+behind*3+back;
   if(!best||score<best.score)best={p,r,score,covered,cat};
  }
  consider(from.x,from.y);
  // The old foreground-only band could not hold the complete collection.
  // Also search the same floor beside/behind the cat; hit tests still exclude
  // its silhouette, furniture and controls, and art keeps its physical scale.
  if(!best||best.score>0)for(let y=Math.max(stage.insets.top+24,keepsakes.feet.y-240);y<=footer-26;y+=12)for(let x=18;x<stage.width-12;x+=16)consider(x,y);
  return best;
 }
 return {bounds,project,visual,occupied,cost,choose,furniture,flatOf};
}
// A clear floor spot in view for a body coming back into the room at once (playtest-3, physics lane items 2 and 3: an
// item taken out of the chest, a body pushed too far into him). The same search and costs as a new prop's place, near
// `preferred` (its arrival spot), but nothing else is moved or stored: every other prop counts as taken floor.
// Returns the body position to rest at (its lowest point just above the floor), or null when no spot is clear.
export function clearSpot(site,inst,vertices,rotation,preferred){
 const {THREE:T}=site,{bounds,occupied,choose}=placer(site),b=bounds(vertices,rotation);
 const best=choose(b,preferred,occupied(new Set([inst])));
 if(!best||best.covered||best.cat)return null;
 site.floorHomes.set(inst.id,best.r);return best.p;
}
