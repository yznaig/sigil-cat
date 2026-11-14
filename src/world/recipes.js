// The kitchen (e1111-58/59/61): the ingredients' sources, the baking box as a chest, baking by shaking, eating.
// The box is a Minecraft-style chest: what goes into it leaves the room (despawns), what comes out arrives back in
// the room on a clear floor spot (respawns, playtest-3). Flour, butter, milk and an egg in the chest, the lid shut and a good shake: the next time
// it opens, those four are gone and a cake is there. No idle scan: everything here answers an event.
import {defineIngredients,CAKE_SLICES} from './ingredients.js';
import {defineEgg} from './egg.js';
import {createCow} from '../gags/cow.js';
import {createChestScreen} from '../ui/chest.js';
import {createItemIcons} from '../ui/item-icons.js';
import {cardService} from './cards.js';
import {cardSheet} from './card-sheet.js';
import {bakeSolid} from './solid.js';
import {puff} from '../core/puff.js';
import {clearSpot} from '../core/floor-home.js';
const SLOTS=27;
// The first cake is 'cake'; each later bake is 'cake-2', 'cake-3', ... (playtest 2, e1112-65).
export const cakeId=n=>n<=1?'cake':'cake-'+n,isCake=id=>id==='cake'||/^cake-\d+$/.test(id||'');
// Which room items count as which ingredient. The pail counts as milk only while it is full.
export const INGREDIENTS={flour:['flour','recipe-flour'],butter:['pat','recipe-butter'],milk:['recipe-milk','bucket'],egg:['egg']};
// Fixed things, sky things and things that belong to another holder never show in the inventory.
const NOT_ITEMS=new Set(['box','rack','hay','puddle','grease','cloud','twinkle','goodjob','bulb','platinum']);
const NAMES={flour:'Flour',bucket:'Pail',pitchfork:'Pitchfork',cake:'Cake',egg:'Egg',pat:'Butter',recipe:'Recipe Card',
 'recipe-flour':'Flour','recipe-butter':'Butter','recipe-milk':'Milk',paper:'Rejected Paper',postcard:'Postcard from the Void',
 ticket:'Encore Ticket',top:'Spinning Top',rifle:'Rifle',tin:'Tin of Plasters',crumbs:'Bread Crumbs',shards:'Broken Glass',
 eyes:'Googly Eyes',controller:'Controller'};
export const RECIPE_TEXT='Cake in a box\n\nflour\nbutter\nmilk\nan egg\n\nPut all four in the box, close the lid and give it a good shake. Open it again.';
export function createRecipes(site){
 const {THREE:T,stage,world,keepsakes,store,audio}=site;
 const loaded=structuredClone(store.get('cakeChain')||{});
 const state=Object.assign({version:2,artScale:store.get('worldBodies.box.adapter.artScale',1.15*Math.min(1,stage.width/600)),bread:0,cup:0,intro:!!store.get('keepsakes.box'),open:false,milkFull:false,visit:null,hay:null,phase:'ingredients',portions:{},chest:Array(SLOTS).fill(null),inv:{},bakes:0,eaten:0,egg:null,card:false},loaded);
 let box=null,boxHooks=null,busy=false,baking=false,shake=null,commandShake=false;
 const respawning=new Set(),stats={stashed:0,respawned:0,bakes:0,forkGone:0,nibbles:0,sounds:[]};
 const sound=(name,o)=>{const v=audio.play(name,o);stats.sounds.push([name,!!v]);if(stats.sounds.length>40)stats.sounds.shift();return v;};
 const v3=p=>new T.Vector3().copy(p),q4=q=>new T.Quaternion().copy(q);
 const scale=()=>box?.chainScale||state.artScale;
 function save(flush=false){store.set('cakeChain',structuredClone(state));if(flush)store.flush();}
 const chestIndex=id=>state.chest.findIndex(e=>e?.id===id),chestHas=id=>chestIndex(id)>=0;
 // ---- Older saves: the open cardboard box held physical contents. They are now simply in the chest. ----
 if(loaded.version!==2){
  const ids=[...new Set([...(loaded.contents||[]),...Object.keys(loaded.sealed||{}),...(loaded.pendingCake?['cake']:[])])];
  if(loaded.phase==='baked'&&!ids.includes('cake'))ids.push('cake');
  state.chest=Array(SLOTS).fill(null);ids.slice(0,SLOTS).forEach((id,n)=>{state.chest[n]={id,state:store.get('keepsakes.'+id)?.state||{}};store.del('keepsakes.'+id);store.del('worldBodies.'+id);keepsakes.has(id)&&keepsakes.take(id);});
  for(const k of ['contents','sealed','pendingCake'])delete state[k];state.version=2;
 }
 if(!Array.isArray(state.chest)||state.chest.length!==SLOTS)state.chest=Array.from({length:SLOTS},(_,n)=>state.chest?.[n]||null);
 // (Playtest-2, bird lane: the controller is a keepsake now and stays in the chest like anything else.)
 // (Gags lane, playtest-2: an eaten cake is no longer deleted on load: the first cake stays after its party.)
 state.open=false;
 for(const e of state.chest)if(e){store.del('keepsakes.'+e.id);store.del('worldBodies.'+e.id);}
 save();
 // ---- Sources: bread twice gives flour, the cup twice a pail, the fork's throw brings hay, hay brings the cow. ----
 function source(kind){
  if(kind!=='bread'&&kind!=='cup')return;state[kind]++;const id=kind==='bread'?'flour':'bucket';
  if(state[kind]>=2&&!chestHas(id))keepsakes.give(id);save();
 }
 addEventListener('sigilcat:ingredient-source',ev=>source(ev.detail));
 // The fork sigil (playtest 2, e1112-36): a new pitchfork falls from the sky onto the floor. Thrown up through the top of
 // the page it is gone (and brings the hay) until the sigil is drawn again. One already in the room just wiggles; one in
 // the chest stays there (the old "the pitchfork is in the box" line is dropped, e1112-32).
 addEventListener('sigilcat:fork',ev=>{ev.preventDefault();if(chestHas('pitchfork'))return;if(keepsakes.has('pitchfork')){keepsakes.give('pitchfork');return;}forkFromSky();});
 async function forkFromSky(){
  const x=stage.width*(stage.width<600?.62:.66),i=keepsakes.give('pitchfork',{at:keepsakes.toUnits(x,site.worldLayout.floorY())});if(!i)return false;
  i.autoHome=false;await i.worldTask;const e=i.worldEntry;if(!e||keepsakes.get('pitchfork')!==i)return false;
  site.supports.detach(e,{wake:false});
  const floor=site.worldLayout.anchor(x),top=stage.onWall(x,-.55*stage.height,floor.z);
  // Tines down and a little tilted, turning slowly as it drops: it lands on the floor and topples, never rising, so
  // it can never count as a throw into the sky (stepItem only arms on the way up).
  e.fromSky=true;e.skyArmed=false;
  e.body.setTranslation({x:top.x,y:Math.min(10,Math.max(top.y,1.6)),z:top.z},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(.18,.5,Math.PI-.22)),false);
  e.body.setLinvel({x:0,y:-1.2,z:0},false);e.body.setAngvel(stage.reducedMotion?{x:0,y:0,z:0}:{x:.4,y:1.1,z:.5},false);world.wake(e);world.sync(e);world.save(e,true);
  return true;
 }
 function registerBox(inst,hooks){box=inst;boxHooks=hooks;watchReachability(inst,inst.worldEntry);}
 function removeBox(inst){if(box!==inst)return;if(screen.isOpen)screen.close();box=null;boxHooks=null;save(true);}
 function watchReachability(i,e){
  if(e.cakeReachability)return;e.cakeReachability=true;const sync=e.sync,rotation=q4(e.body.rotation());
  e.sync=e=>{sync?.(e);if(e.timer||e.canGrab===false||e.fixed||e.support||!i.picture)return;const r=i.picture.rect;
   const outside=r.x+r.w<-20||r.x>stage.width+20||r.y>stage.height-stage.insets.bottom+24||r.y+r.h<-20;
   if(!outside||e.id==='pitchfork'&&r.y+r.h<0&&(e.body.linvel().y>0||e.fromSky))return;
   if(world.held?.entry===e)return;world.park(e);world.disable(e);e.object.visible=false;i.picture.draw(true);site.worldLayout.shadow(i);
   // Back at once while the inventory shows, or just after leaving it (world.js RETURN, playtest-2 item 5).
   const back=()=>{clearTimeout(e.timer);e.timer=null;e.returnNow=null;if(!world.entries.has(e.id))return;const p=site.worldLayout.anchor(stage.width*(e.id==='box'?.7:e.id==='flour'?.25:e.id==='bucket'?.45:.6));p.y=.7;
    e.body.setTranslation(p,false);e.body.setRotation(rotation,false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);e.body.setEnabled(true);e.object.visible=true;world.wake(e);world.sync(e);
   };
   e.returnNow=back;e.timer=setTimeout(back,site.inventoryOpen||performance.now()<(e.quickUntil||0)?350:5000);
  };
 }
 function ready(i,e){
  watchReachability(i,e);
  if(i.id==='hay')e.canGrab=false;
  e.released=()=>{world.save(e,true);save(true);};
  if(i.id==='hay'&&state.hay?.landed){e.body.setBodyType(world.rapier.RigidBodyType.Fixed,true);e.fixed=true;e.canGrab=false;world.park(e);cow.visit();}
  if(i.id==='cake'){if(state.phase==='baked'){state.phase='revealed';save(true);}e.canGrab=state.phase==='revealed'||state.phase==='eaten';i.key.hidden=!e.canGrab;}
  if(isCake(i.id)&&i.id!=='cake'){e.canGrab=true;i.key.hidden=false;}
  if(i.id==='bucket'){i.milk.visible=state.milkFull;e.body.setAdditionalMass(state.milkFull?.12:0,false);}
 }
 function syncItem(id,e){
  const i=keepsakes.get(id);if(id==='bucket'&&i?.milk&&state.milkFull){
   const v=e.body.linvel();i.milk.rotation.z=T.MathUtils.clamp(-v.x*.06,-.1,.1);i.milk.rotation.x=T.MathUtils.clamp(v.z*.06,-.1,.1);i.picture.invalidate();
  }
 }
 function restItem(id,e){
  if(id==='hay'&&state.hay&&!state.hay.landed){
   e.body.setBodyType(world.rapier.RigidBodyType.Fixed,true);e.fixed=true;e.canGrab=false;world.park(e);world.sync(e);
   state.hay.landed=true;world.save(e);startVisit(e);save(true);
  }
  if(id==='pitchfork')e.fromSky=false;
  if(id==='bucket'){const i=keepsakes.get(id);if(i?.milk){i.milk.rotation.set(0,0,0);i.picture.invalidate();i.picture.draw();}}
  save();
 }
 const forkPoint=new T.Vector3(),forkScreen={};
 function stepItem(id,dt,e){
  if(id==='bucket')cow.contact();
  // Armed and not rising: neither the arming nor the exit can change, so the projection is skipped (physics lane cost).
  if(id==='pitchfork'&&(!e.skyArmed||e.body.linvel().y>0)){
   const i=keepsakes.get(id),q=q4(e.body.rotation()),t=v3(e.body.translation());let lo=Infinity,hi=-Infinity;
   for(const v of i.colliderVertices){const y=stage.toScreen(forkPoint.copy(v).applyQuaternion(q).add(t),forkScreen).y;if(y<lo)lo=y;if(y>hi)hi=y;}
   if(lo>0&&!e.fromSky)e.skyArmed=true;
   if(e.fromSky&&lo>0&&e.body.linvel().y>-.05&&Math.abs(e.body.linvel().y)<.05)e.fromSky=false;
   const p=stage.toScreen(t);
   if(e.skyArmed&&hi<0&&e.body.linvel().y>0&&p.x>=0&&p.x<=stage.width){e.skyArmed=false;skyExit(p.x,e);}
  }
 }
 // ---- The chest ----
 const present=kind=>state.chest.some(e=>e&&INGREDIENTS[kind].includes(e.id)&&(e.id!=='bucket'||state.milkFull));
 const KINDS=['flour','butter','milk','egg'];
 // Cake after cake (playtest 2, e1112-65): the four in the chest bake whenever they are all there, not only the first time.
 function insideAll(){return KINDS.every(present);}
 // Held anywhere: in the room or in the chest (the butter counts on his head, too).
 const holds=kind=>kind==='milk'?state.milkFull||keepsakes.has('recipe-milk')||chestHas('recipe-milk'):INGREDIENTS[kind].some(id=>keepsakes.has(id)||chestHas(id));
 function chestable(i){
  if(!i||NOT_ITEMS.has(i.id)||i.id.startsWith('rack/')||i.def.fixed||i.def.sky||i.def.inert||!i.physical)return false;
  const e=i.worldEntry;if(!e||!i.worldReady||e.canGrab===false||e.fixed)return false;
  // Away by design (the pitchfork up in the sky) is not in the room; a lost item on its way back is (returnNow).
  if(e.timer&&!e.returnNow)return false;
  if(e.support&&!['shelf','shelf-hooks','pinboard'].includes(e.support.id))return false;
  return true;
 }
 const nameOf=id=>NAMES[isCake(id)?'cake':id]||(keepsakes.defs.get(id)?.label||id).replace(/^(the|a|an) /i,'').replace(/\b\w/g,c=>c.toUpperCase());
 const icons=createItemIcons(site);
 function liveItems(){return [...keepsakes.live.values()].filter(chestable).sort((a,b)=>a.order-b.order);}
 function inventory(){
  const live=liveItems(),ids=new Set(live.map(i=>i.id));
  for(const id of Object.keys(state.inv))if(!ids.has(id)||state.inv[id]<0||state.inv[id]>35)delete state.inv[id];
  const used=new Set(Object.values(state.inv)),order=[27,28,29,30,31,32,33,34,35,...Array(27).keys()];
  for(const i of live)if(state.inv[i.id]===undefined){const s=order.find(k=>!used.has(k));if(s===undefined)continue;state.inv[i.id]=s;used.add(s);}
  const slots=Array(36).fill(null);for(const i of live){const s=state.inv[i.id];if(s!==undefined&&!slots[s])slots[s]=i;}
  return slots;
 }
 const view=i=>i&&{id:i.id,name:nameOf(i.id),icon:icons.of(i)||missingIcon()};
 // With no picture at all (browser storage cleared), the game's own missing-texture square stands in.
 let missing=null;const missingIcon=()=>missing??=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');for(let i=0;i<2;i++)for(let j=0;j<2;j++){x.fillStyle=(i+j)%2?'#000':'#f800f8';x.fillRect(i*32,j*32,32,32);}return c.toDataURL();})();
 const chestView=e=>e&&{id:e.id,name:nameOf(e.id),icon:icons.saved(e.id,e.id==='bucket'&&state.milkFull?':milk':'')||modelIcons.get(e.id)||missingIcon()};
 // Things seen only in the chest (a fresh cake) are drawn from their model once.
 const modelIcons=new Map();
 async function iconFromModel(id){
  if(modelIcons.has(id)||icons.saved(id))return;
  const kind=isCake(id)?'cake':id;
  const load={cake:()=>import('../../assets/models/prepared/cake.js'),egg:()=>import('../../assets/models/prepared/kitchen/egg.js'),flour:()=>import('../../assets/models/prepared/flour.js')}[kind];if(!load)return;
  const m=await load(),art=bakeSolid(T,m.create()),root=new T.Group();root.add(art);root.updateMatrixWorld(true);
  const pts=[];art.geometry.computeBoundingBox();const b=art.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])pts.push(new T.Vector3(x,y,z));
  const url=icons.of({id,object:root,picture:{visual:art},colliderVertices:pts},{fresh:true});if(url)modelIcons.set(id,url);
  art.geometry.dispose();for(const mat of [].concat(art.material))mat.dispose();
 }
 const screen=createChestScreen(site,{
  slots:()=>({chest:state.chest.map(chestView),inv:inventory().map(view)}),
  move:(from,to)=>move(from,to),
  closed:()=>closeChest(),
 });
 // Into the chest: out of the room, as though picked up and put away.
 function stash(id){
  const i=keepsakes.get(id);if(!chestable(i))return null;
  const e=i.worldEntry;if(world.held?.entry===e)world.release();
  icons.of(i);
  // The pail's picture is kept both full and empty: baking may empty it while it is in the chest.
  if(id==='bucket'&&i.milk){const full=state.milkFull,shown=i.milk.visible;for(const f of [!full,full]){state.milkFull=f;i.milk.visible=f;icons.of(i,{fresh:true});}state.milkFull=full;i.milk.visible=shown;}
  e.grabbed?.();
  const r=i.picture?.rect;if(r&&r.w<stage.width*2)puff(r.x+r.w/2,r.y+r.h/2,Math.max(60,Math.min(200,r.w*1.3)));
  const entry={id,state:structuredClone(i.state||{})};delete state.inv[id];
  keepsakes.take(id);stats.stashed++;return entry;
 }
 // Out of the chest: back into the room the way any arrival comes (playtest-3, physics lane item 2: "taking something
 // out of the box should just spawn it like regular (somewhere on the screen) instead of spawning it 'out' the box,
 // things get stuck in the box"). It is given like a new keepsake (its own home, floor-home's placement), then, if
 // that spot is not clear (another item came out a moment before), moved to the nearest clear floor spot in view
 // (floor-home.js clearSpot, the respawn's search), and it appears in a puff. Never in front of or inside the box.
 async function respawn(entry,invSlot){
  const {id}=entry;if(keepsakes.has(id)){state.inv[id]=invSlot;return keepsakes.get(id);}
  if(!keepsakes.defs.has(id))return null;
  state.inv[id]=invSlot;respawning.add(id);
  let inst;try{inst=keepsakes.give(id,{state:entry.state||{}});}finally{respawning.delete(id);}
  if(!inst)return null;inst.autoHome=false;stats.respawned++;
  await inst.worldTask;const e=inst.worldEntry;if(!e||keepsakes.get(id)!==inst)return inst;
  e.quickUntil=performance.now()+4000;
  site.supports.detach(e,{wake:false});
  const q=q4(e.body.rotation()),now=v3(e.body.translation()),spot=inst.colliderVertices?.length&&clearSpot(site,inst,inst.colliderVertices,q,now);
  if(spot&&Math.hypot(spot.x-now.x,spot.z-now.z)>1e-3){spot.y+=stage.reducedMotion?0:.1;e.body.setTranslation(spot,false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);}
  world.wake(e);world.sync(e);world.save(e,true);
  const r=inst.picture?.rect;if(r&&r.w>0&&r.w<stage.width*2)puff(r.x+r.w/2,r.y+r.h/2,Math.max(60,Math.min(200,r.w*1.3)));
  return inst;
 }
 let moving=false;
 async function move(from,to){
  if(moving)return false;moving=true;
  try{
   const inv=inventory(),get=s=>s.kind==='chest'?state.chest[s.i]:inv[s.i];
   const A=get(from),B=get(to);if(!A)return false;
   if(from.kind==='inv'&&to.kind==='inv'){state.inv[A.id]=to.i;if(B)state.inv[B.id]=from.i;save();return true;}
   if(from.kind==='chest'&&to.kind==='chest'){state.chest[from.i]=B||null;state.chest[to.i]=A;save(true);return true;}
   if(from.kind==='inv'){
    const entry=stash(A.id);if(!entry)return false;
    state.chest[to.i]=entry;save(true);
    if(B)await respawn(B,from.i);
   }else{
    state.chest[from.i]=null;
    if(B){const back=stash(B.id);if(back)state.chest[from.i]=back;}
    save(true);await respawn(A,to.i);
   }
   save(true);checkCard();return true;
  }finally{moving=false;screen.render();}
 }
 async function openChest(){
  if(!box?.worldEntry||screen.isOpen||busy||boxHooks?.moving||site.input.locked)return false;
  boxHooks.cancel?.();site.worldInput.cancel();
  if(state.phase==='baked'){state.phase='revealed';save(true);/* text lane: no cake-progress line (e1112-32) */}
  // The inventory lists what is in the room: anything on its way back from off the page comes back now, and stays
  // quick to come back while the screen shows (playtest-2, item 5).
  site.inventoryOpen=true;for(const i of keepsakes.live.values())i.worldEntry?.returnNow?.();
  sound('chest-open',{gain:.85});boxHooks.setOpen(true);
  await Promise.all(state.chest.filter(e=>e&&!icons.saved(e.id)).map(e=>iconFromModel(e.id).catch(()=>{})));
  await new Promise(r=>setTimeout(r,stage.reducedMotion?0:110));
  if(!await screen.open())site.inventoryOpen=false;save(true);return true;
 }
 function closeChest(){
  site.inventoryOpen=false;
  sound('chest-close',{gain:.85});setTimeout(async()=>{for(let k=0;k<60&&boxHooks?.moving;k++)await new Promise(r=>setTimeout(r,25));boxHooks?.setOpen(false);},stage.reducedMotion?0:130);
  // text lane: no cake-progress line here any more (e1112-32)
  save(true);
 }
 // Shaking: the box held and moved back and forth, at least four reversals within two seconds.
 function boxStep(dt,e){
  if(state.open||(!commandShake&&world.held?.entry!==e)){shake=null;return;}
  // The shake's axis is the box's main sideways motion, picked again until a first reversal counts (fix round A): it was
  // fixed on the first held step, so a lift that drifted toward or away from you locked out a left-right shake.
  const v=e.body.linvel(),dom=Math.abs(v.x)>=Math.abs(v.z)?'x':'z';
  if(shake&&!shake.n&&shake.axis!==dom&&Math.hypot(v.x,v.z)>.35){shake.axis=dom;shake.sign=0;shake.turn=e.body.translation()[dom];}
  const axis=shake?.axis||dom,speed=v[axis],p=e.body.translation()[axis];
  if(!shake)shake={sign:0,turn:p,n:0,age:0,axis};shake.age+=dt;
  if(shake.age>2){shake.n=0;shake.sign=0;}
  const sign=Math.sign(speed);
  if(Math.abs(speed)>.35&&sign!==shake.sign){
   if(shake.sign&&Math.abs(p-shake.turn)>.07*scale()){shake.n++;shake.age=0;if(shake.n>=2&&state.chest.some(Boolean))audio.play('box-thud',{gain:.12,rate:1.5+Math.random()*.2});}
   shake.sign=sign;shake.turn=p;
   if(shake.n>=4&&insideAll())bake();
  }
 }
 function bake(){
  if(baking||state.open||!insideAll())return false;baking=true;
  // One transaction: the four go, the cake takes the flour's place, the pail stays (emptied).
  let at=-1;
  for(const kind of KINDS){
   const k=state.chest.findIndex(e=>e&&INGREDIENTS[kind].includes(e.id)&&e.id!=='bucket');
   if(kind==='milk'&&k<0){state.milkFull=false;continue;}
   if(k>=0){if(at<0)at=k;state.chest[k]=null;}
  }
  if(at<0)at=state.chest.findIndex(e=>!e);
  // Each bake is a new cake: the first is 'cake' (its reveal and its party are the first cake's alone), then 'cake-2',
  // 'cake-3', ... They pile up; nothing replaces anything.
  const n=state.bakes+1,id=cakeId(n);api.defineCake(id);
  state.chest[at]={id,state:{}};if(n===1)state.phase='baked';state.bakes=n;state.bread=0;state.portions={...state.portions,flour:true,butter:true,milk:true,egg:true};
  stats.bakes++;save(true);sound('box-thud',{gain:.6});/* text lane: the thump speaks for itself (e1112-32) */iconFromModel(id).catch(()=>{});
  baking=false;return true;
 }
 async function shakeBox(){
  if(!box||state.open||busy)return false;
  if(!insideAll()){/* text lane: its line is gone (e1112-32) */return false;}
  busy=true;commandShake=true;const e=box.worldEntry,bakes0=stats.bakes;boxHooks.cancel?.();site.worldInput.cancel();
  const grip=v3(e.body.worldCom()),p=grip.clone().add(new T.Vector3(0,.5*scale(),0));
  world.grab(e,grip);
  await stage.tween(.35,k=>world.move(p));
  await stage.tween(4,k=>world.move(p.clone().add(new T.Vector3(Math.sin(k*Math.PI*10)*.22*scale(),0,0))));
  world.release();commandShake=false;busy=false;save(true);return stats.bakes>bakes0;
 }
 function fillMilk(){
  if(!state.visit||state.visit.milked||state.milkFull)return false;
  state.visit.milked=true;state.milkFull=true;const i=keepsakes.get('bucket');if(i?.milk){i.worldEntry.body.setAdditionalMass(.12,true);i.milk.visible=true;i.picture.invalidate();i.picture.draw();world.wake(i.worldEntry);}
  save(true);site.ui.speak?.('thank you, cow.')??site.ui.say('thank you, cow.');/* text lane: the cat says it (e1112-32) */checkCard();return true;
 }
 // A tap on a cake (playtest 2). The first cake's first tap is the party (the crash screen and the party hat), once
 // ever, and the cake stays. Every other tap, on it or any later cake, is the cat hopping and nibbling, and a slice
 // is gone (e1112-66); the last slice leaves nothing behind (no crumbs: recycling is capped).
 async function eat(id='cake'){
  if(!keepsakes.has(id)||site.eggs.party?.state.active)return false;
  if(id==='cake'&&state.phase==='revealed'){
   const result=site.eggs.party?.eatCake();if(!site.eggs.party?.state.active)return false;
   state.phase='eaten';state.eaten++;save(true);return result;
  }
  if(id==='cake'&&state.phase!=='eaten')return false;
  await nibble(id);return false;
 }
 let nibbling=false;
 async function nibble(id){
  const i=keepsakes.get(id);if(!i?.worldEntry||nibbling)return false;nibbling=true;
  try{
   if(!site.cat.hidden&&!site.cat.standIn)site.cat.playEmote('hop','nibble');
   sound('bite',{gain:.35,rate:1.15+Math.random()*.1});stats.nibbles++;
   const slices=(i.state.slices||0)+1;i.setState({slices});
   const r=i.picture?.rect;if(r&&!stage.reducedMotion)puff(r.x+r.w/2,r.y+r.h*.4,Math.max(40,Math.min(90,r.w*.45)));
   if(slices>=CAKE_SLICES){
    delete state.inv[id];state.finished=[...new Set([...(state.finished||[]),id])];keepsakes.take(id);save(true);
   }else await api.resliceCake(i);
   return true;
  }finally{nibbling=false;}
 }
 function tapItem(id){
  const i=keepsakes.get(id);
  if(id==='bucket'&&state.milkFull){site.ui.speak?.('thank you, cow.')??site.ui.say('thank you, cow.');/* text lane: one milk line, his (e1112-32) */return;}
  if(i?.worldEntry&&!stage.reducedMotion&&!i.worldEntry.support){i.worldEntry.body.applyImpulse({x:0,y:i.worldEntry.body.mass()*.5,z:0},true);world.wake(i.worldEntry);}
 }
 // ---- The fork, the hay and the cow (unchanged) ----
 function hayLanding(i,x){
  // The hay falls straight down, so its whole column must be clear: props, furniture (the bin) and the cat.
  const R=world.rapier,skip=new Set([i.worldEntry?.body,keepsakes.get('pitchfork')?.worldEntry?.body].filter(Boolean));
  const box=new T.Box3().setFromPoints(i.colliderVertices),half=box.getSize(new T.Vector3()).multiplyScalar(.5),mid=box.getCenter(new T.Vector3()),column=new R.Cuboid(half.x+.025,1.3,half.z+.025);
  const blocked=p=>{let hit=false;world.physics.intersectionsWithShape({x:p.x+mid.x,y:1.32,z:p.z+mid.z},{x:0,y:0,z:0,w:1},column,c=>{const b=c.parent();if(!b||skip.has(b)||!b.isEnabled())return true;hit=true;return false;});return hit;};
  const start=stage.height-stage.insets.bottom-30;
  for(let y=start;y>=stage.height*.42;y-=12){const p=site.worldLayout.anchor(x,y);if(Math.abs(p.x)>11||Math.abs(p.z)>11)continue;if(!blocked(p))return p;}
  return site.worldLayout.anchor(x,start);
 }
 async function skyExit(x,e){
  // Gone (playtest 2, e1112-36): it went up and does not come back until the fork is drawn again. Hidden at once, its
  // floor shadow with it, then taken out of the room after this physics step (never mid-step). Then the hay falls.
  if(world.held?.entry===e)world.release();world.park(e);world.disable(e);e.object.visible=false;e.presentation.draw(true);
  const fork=keepsakes.get('pitchfork');if(fork)site.worldLayout.shadow(fork);
  e.timer=setTimeout(()=>{e.timer=null;if(keepsakes.get('pitchfork')===fork)keepsakes.take('pitchfork');stats.forkGone++;save(true);},0);
  if(state.hay||state.visit)return;
  state.hay={x,landed:false};save(true);
  await stage.after(stage.reducedMotion?0:.45);
  const i=keepsakes.give('hay');await i.worldTask;
  const p=hayLanding(i,x);p.y=2.5;
  i.worldEntry.body.setEnabledTranslations(false,true,false,true);i.worldEntry.body.setEnabledRotations(false,false,false,true);i.worldEntry.body.setLinvel({x:0,y:0,z:0},false);i.worldEntry.body.setAngvel({x:0,y:0,z:0},false);i.worldEntry.body.setTranslation(p,false);world.wake(i.worldEntry);world.sync(i.worldEntry);world.save(i.worldEntry,true);save(true);
 }
 async function throwFork(){
  const i=keepsakes.get('pitchfork');if(!i)return false;await i.worldTask;const e=i.worldEntry;if(e.timer)return false;
  site.worldInput.cancel();site.supports.detach(e);const p=site.worldLayout.anchor(stage.width*.7);p.y=.5;e.body.setTranslation(p,false);e.body.setRotation({x:0,y:0,z:0,w:1},false);e.body.setLinvel({x:0,y:12,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);e.skyArmed=true;world.wake(e);return true;
 }
 function startVisit(hay){
  if(state.visit)return;const p=hay.body.translation(),s=.48,screen=stage.toScreen(v3(p)),start=stage.onFloor(-170,screen.y);
  state.visit={id:(state.visitCount||0)+1,phase:'enter',time:0,walkTime:0,x:start.x,target:p.x-1.3*s,z:p.z,scale:s,milked:false};state.visitCount=state.visit.id;save(true);cow.visit();
 }
 function consumeHay(){keepsakes.take('hay');state.hay=null;save(true);}
 // ---- The egg (e1111-58/59). Playtest-2 (bird lane): each time the bird comes and the player has no egg anywhere
 // (room, inventory, box), it lets another go, so cakes can be baked endlessly. It falls from the bird down to the
 // floor well back in the room (EGG_DROP.back of the way from his feet towards the bird's height on the page), small
 // with distance, so it reads as the bird's.
 const EGG_DROP={back:.33,farZ:-2.2};
 async function dropEgg({x,y}={}){
  if(keepsakes.has('egg')||chestHas('egg'))return false;
  state.egg={dropped:Date.now(),count:(state.egg?.count||0)+1};save(true);
  if(state.egg.count>=2&&!store.get('eggCup')){store.set('eggCup',true);eggCup(true);}
  x=Math.max(40,Math.min(stage.width-40,x??stage.width*.7));y=y??stage.height*.28;
  const inst=keepsakes.give('egg',{at:keepsakes.toUnits(x,site.worldLayout.floorY())});inst.autoHome=false;await inst.worldTask;
  const e=inst.worldEntry;if(!e)return false;
  const feet=stage.toScreen(new T.Vector3()).y,floor=site.worldLayout.anchor(x,feet-(feet-y)*EGG_DROP.back);
  floor.z=Math.max(floor.z,EGG_DROP.farZ);
  const start=stage.onWall(x,y,floor.z);
  // He has a body now (cat-body.js): an egg let go above him came to rest on his head, in front of the bird's
  // circle. Let it fall just clear of his footprint instead.
  const hulls=world.cat?.fit?.(site.cat.shown);if(hulls?.length){let rad=0;for(const h of hulls)for(let n=0;n<h.length;n+=3)rad=Math.max(rad,Math.hypot(h[n],h[n+2]));
   const d=Math.hypot(start.x,start.z),clear=rad+.12;if(d<clear){const k=d>1e-6?clear/d:1;start.x=d>1e-6?start.x*k:clear;start.z*=d>1e-6?k:1;}}
  e.body.setTranslation({x:start.x,y:Math.max(start.y,.6),z:start.z},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(.3,.2,1.2)),false);
  e.body.setLinvel({x:.15,y:0,z:0},false);e.body.setAngvel({x:.4,y:.2,z:-.8},false);world.wake(e);world.sync(e);world.save(e,true);
  return true;
 }
 addEventListener('sigilcat:bird-egg',ev=>dropEgg(ev.detail||{}));
 // The egg cup (layout lane, playtest-3, e1113-07): it falls into its place beside the controller stand with the
 // player's second egg (above), and stands there from then on (src/world/egg-cup.js). A save already past its second
 // egg gets it on load.
 function eggCup(arrive=false){return import('./egg-cup.js').then(m=>m.eggCupService(site).ensure({arrive})).catch(e=>console.error('egg cup',e));}
 if(store.get('eggCup')||(state.egg?.count||0)>=2){store.set('eggCup',true);eggCup();}
 // ---- The recipe card: once any two of the four are held, it flutters down (e1111-58). ----
 const cards=cardService(site);
 // A tap reads it as the index card it is, the way the rejected paper opens (playtest 2); a press and move drags it.
 // Its page has one small (x) and closes on a click outside or Escape (src/world/card-sheet.js, playtest 3).
 // (The press-and-hold 3D turn-over is gone: click views, press and move drags, src/world/cards.js.)
 let reading=null;
 function readCard(){
  if(reading?.open)return;
  const items=['flour','butter','milk','an egg'],steps=['all four in the box','close the lid','a good shake','open it again'];
  reading=cardSheet(site,{className:'recipe-read',label:'The recipe card: cake in a box',html:`<header><span class="kind">RECIPE</span><h2>Cake in a box</h2><p class="from">from the kitchen of <b>the cat</b></p></header><div class="cols"><ul>${items.map(t=>`<li>${t}</li>`).join('')}</ul><ol>${steps.map(t=>`<li>${t}</li>`).join('')}</ol></div><p class="serves">serves one cat</p>`});
 }
 cards.define({id:'recipe',label:'the recipe card',size:.36,aspect:.66,home:()=>({x:.55,y:-.3}),tap:readCard,read:readCard},RECIPE_TEXT);
 async function checkCard(){
  if(state.card||state.phase!=='ingredients'||KINDS.filter(holds).length<2)return false;
  state.card=true;save(true);
  const x=stage.width*.58,inst=keepsakes.give('recipe',{at:keepsakes.toUnits(x,site.worldLayout.floorY())});inst.autoHome=false;
  audio.play('paper',{gain:.4,rate:1.1});await inst.worldTask;const e=inst.worldEntry;if(!e||e.support)return true;
  const floor=site.worldLayout.anchor(x),top=stage.onWall(x,stage.insets.top+40,floor.z);
  e.body.setTranslation({x:top.x,y:Math.max(1.2,top.y),z:top.z},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(-.5,.3,.25)),false);
  e.body.setLinvel({x:0,y:-.1,z:0},false);e.body.setAngvel({x:.9,y:.2,z:.4},false);world.wake(e);world.sync(e);
  return true;
 }
 const api={readCard,get reading(){return !!reading?.open;},closeReading(){reading?.close();},state,save,source,registerBox,removeBox,ready,syncItem,restItem,nibble,cakeId,isCake,stepItem,boxStep,boxSync(){},fillMilk,bake,insideAll,shakeBox,eat,throwFork,consumeHay,tapItem,removed(){},
  openChest,move,chestable,inventory,dropEgg,checkCard,screen,icons,stats,INGREDIENTS,
  get box(){return box;},get busy(){return busy;},get shakes(){return shake?.n||0;},get chest(){return state.chest;}};
 const cow=createCow(site,api);api.cow=cow;
 defineIngredients(site,api);defineEgg(site,api);
 // The cakes baked after the first come back with their saves (their keepsake definitions restore them).
 for(let n=2;n<=state.bakes;n++)api.defineCake(cakeId(n));
 // A given item that is also in the chest has come back by another way (his butter, say): the room's copy wins.
 keepsakes.onGive(i=>{if(respawning.has(i.id))return;const k=chestIndex(i.id);if(k>=0){state.chest[k]=null;save(true);}checkCard();});
 // Reconcile interrupted work, never duplicating anything.
 if(state.phase==='baked'&&!chestHas('cake')){if(keepsakes.has('cake'))state.phase='revealed';else{const k=state.chest.findIndex(e=>!e);if(k>=0)state.chest[k]={id:'cake',state:{}};}}
 // An eaten cake now stays (playtest 2); a cake eaten before that comes back as the keepsake it would have been.
 if((state.phase==='revealed'||state.phase==='eaten')&&!chestHas('cake')&&!keepsakes.has('cake')&&!state.finished?.includes('cake'))keepsakes.give('cake');
 if(state.bread>=2&&!keepsakes.has('flour')&&!chestHas('flour'))keepsakes.give('flour');if(state.cup>=2&&!keepsakes.has('bucket')&&!chestHas('bucket'))keepsakes.give('bucket');
 if(state.hay&&!keepsakes.has('hay'))keepsakes.give('hay');if(state.visit)cow.visit();
 save();stage.onLoaded.push(()=>checkCard());
 addEventListener('pagehide',()=>{for(const i of keepsakes.live.values())if(i.worldEntry&&(i.def.category==='recipe'||i.id==='box'))world.save(i.worldEntry,true);save(true);});
 return api;
}
