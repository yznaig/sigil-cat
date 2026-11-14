// Production cards, source geometry and actual routed input. No selector substitutes for 3D art.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const paper=keepsakes.give('paper');await paper.worldTask;
check('board first flat loads physics after cat',paper.worldReady&&W.stats.requestedAt>=site.timing.shown&&!site.pinboard.ready,paper.worldError||'');
keepsakes.give('paper');check('board duplicate does not unlock',S.count('flat')===1&&!site.pinboard.ready);
const postcard=keepsakes.give('postcard'),ticket=keepsakes.give('ticket');await Promise.all([postcard.worldTask,ticket.worldTask]);await site.pinboard.task;await sleep(1800);
const cards=[paper,postcard,ticket];
// Playtest 3 (cards lane): nothing goes onto the board by itself; the cards wait on the floor and the player pins them.
check('board new cards wait on the floor until the player pins them',cards.every(i=>!i.worldEntry.support),cards.map(i=>i.id+':'+(i.worldEntry.support?.id||'floor')).join(' '));
for(const i of cards)site.pinboard.pin(i.id,false);await until(()=>!S.active,4000);await sleep(300);
check('board second unique discovery unlocks one fixed support',S.count('flat')===3&&site.pinboard.ready&&W.entries.has('furniture-pinboard')&&site.pinboard.entry.fixed);
check('board cards are printed 3D meshes',cards.every(i=>i.physical&&i.worldReady&&i.cardArt.isMesh&&i.cardArt.geometry.groups.length===3&&i.prints.length===2&&i.colliderShapes.length>=2&&i.colliderShapes.length<=3&&!i.el.firstChild));
const found=document.querySelector('#found').getBoundingClientRect();
check('board below count and clear of cat petting',site.pinboard.picture.rect.y>=found.bottom&&cards.filter(i=>!i.stored).every(i=>![-36,0,36].some(d=>i.hits(catMid().x,catMid().y+d))),JSON.stringify(site.pinboard.picture.rect));
const glyphs=[];
for(const i of cards){site.pinboard.select(i.id);await sleep(80);const a=i.object.localToWorld(new T.Vector3(0,0,0)),b=i.object.localToWorld(new T.Vector3(0,i.cardDimensions.width*i.prints[0].glyph/768,0));const sa=stage.toScreen(a),sb=stage.toScreen(b);glyphs.push({id:i.id,height:Math.hypot(sa.x-sb.x,sa.y-sb.y)});await __shot('world-unit5-board-'+i.id);}
// e1112-63 (Aaron, "#1 yup thats fine"): on a phone on its side (844x390) the whole four-card board fits a 390 px tall
// screen, so its card text draws 7-10 px; that size only takes a 7 px floor. A tap opens the paper's page.
const GLYPH_MIN=MOBILE&&innerWidth>innerHeight?7:12;
check('board identifying glyphs at least '+GLYPH_MIN+' CSS px',glyphs.every(p=>p.height>=GLYPH_MIN),JSON.stringify(glyphs));
for(const i of cards){
 if(i.id==='paper'){
  // e1111-58: the rejected paper opens as the photocopy sheet it was before unit 5, not the 3D card reader
  site.pinboard.select(i.id);const oldFocus=i.key.querySelector('button');oldFocus.focus();site.cards.read(i.id);
  const sheet=document.querySelector('.paper-read .sheet');
  const x=document.querySelector('.paper-read .sheet-x');
  check('board paper opens its old photocopy sheet, its one control a small (x)',!!sheet&&E.paradox.reading&&/Dear Dr\. Cat/.test(sheet.textContent)&&!!sheet.querySelector('.stamp')&&document.querySelectorAll('.paper-read button').length===1&&document.activeElement===x);
  await __shot('world-unit5-read-paper');
  const font=document.documentElement.style.fontSize;document.documentElement.style.fontSize='200%';
  check('board paper 200 percent text and a 44px (x) target',sheet.scrollWidth<=sheet.clientWidth+1&&parseFloat(getComputedStyle(x,'::before').height)>=44&&parseFloat(getComputedStyle(sheet).fontSize)>=29);
  document.documentElement.style.fontSize=font;x.click();
  check('board paper focus returns',!E.paradox.reading&&document.activeElement===oldFocus);
  continue;
 }
 // Playtest 3: the postcard and the ticket open no page. Their key does what a tap does: the postcard flips over on
 // the board (and back), the ticket swings on its pin.
 site.pinboard.select(i.id);const key=i.key.querySelector('button');key.focus();site.cards.read(i.id);
 check('board '+i.id+' has no page to read',!document.querySelector('.card-sheet,.world-inspect'));
 const was=!!i.state.flipped;key.click();await sleep(100);
 if(i.id==='postcard'){check('board postcard key flips it on the board',!!i.state.flipped!==was&&i.worldEntry.support?.id==='pinboard');await __shot('world-unit5-back-postcard');key.click();await until(()=>!S.active,3000);check('board postcard key flips it back',!!i.state.flipped===was);}
 else check('board ticket key wiggles it on its pin',(stage.reducedMotion||S.active>0)&&!i.state.flipped&&i.worldEntry.support?.id==='pinboard');
 await until(()=>!S.active,3000);check('board '+i.id+' focus stays on its key',document.activeElement===key);
}
// Reject before mutating either item or occupied slot.
document.activeElement?.blur(); // focus-return was asserted above; art shots show the ordinary page
const before=JSON.stringify(paper.worldEntry.support);
check('board wrong occupied slot refuses atomically',!S.mount(paper.worldEntry,'pinboard','postcard')&&JSON.stringify(paper.worldEntry.support)===before&&S.registry.get('pinboard').slots.find(s=>s.id==='postcard').occupant==='postcard');
S.detach(paper.worldEntry);const p=new T.Vector3().copy(paper.object.position);S.mount(paper.worldEntry,'pinboard','paper');
let maxSwing=0;await until(()=>{const target=S.pose('pinboard','paper'),q=paper.object.quaternion;maxSwing=Math.max(maxSwing,q.angleTo(target.q));return !S.active;},2100,8);
check('board single top point swing <=8deg ends <=2s',maxSwing<=8*Math.PI/180&&!S.active,`max=${(maxSwing*180/Math.PI).toFixed(3)}deg callbacks=${S.listening}`);
// Visible ordered picking and a live off-centre mouse/finger grip.
site.pinboard.select('paper');await sleep(80);
const local=new T.Vector3(-paper.cardDimensions.width*.32,paper.cardDimensions.height*.2,.003),screen=stage.toScreen(paper.object.localToWorld(local)),pid=++pointerIds;
fire('pointerdown',screen.x,screen.y,pid);check('board tap leaves support in place',!!paper.worldEntry.support&&!W.held);
fire('pointermove',screen.x-35,screen.y+30,pid);await sleep(500);const held=W.held;
check('board off-centre live grip releases support once',held?.entry===paper.worldEntry&&!paper.worldEntry.support&&W.physics.impulseJoints.len()===0);
await __shot('world-unit5-grip');
fire('pointercancel',screen.x-35,screen.y+30,pid,0);check('board cancel leaves no joint',!W.held&&W.physics.impulseJoints.len()===0);
await until(()=>paper.worldEntry.body.isSleeping(),5000);
// The production hulls drop naturally. No render submission in this synchronous physics batch;
// production adapter cost is measured separately in world-board-cost.js.
const reports=[];
for(const i of cards){
 S.detach(i.worldEntry,{wake:false});for(const e of W.entries.values())if(e!==i.worldEntry)e.body.setEnabled(false);
 const e=i.worldEntry,b=e.body,saveSync=e.sync;e.sync=null;const massBefore=b.mass();W.step(1/120);note('board collider re-enable mass '+i.id,JSON.stringify({before:massBefore,after:b.mass()}));let worst=0,minY=Infinity,gap=0,flat=1,maxGain=0;const failed=[];
 const low=()=>{const q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation());return i.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0];};
 const energy=()=>{const p=b.translation(),v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*p.y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);};
 site.world.cat?.suspend('fixture',true); // isolated drops where the cat floats (cat-body.js)
 for(let seed=0;seed<100;seed++){
  b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  let n=0,lastEnergy=energy();for(;n<480&&!b.isSleeping();n++){W.step(1/120);const now=energy();maxGain=Math.max(maxGain,now-lastEnergy);lastEnergy=now;minY=Math.min(minY,low().y);}
  if(!b.isSleeping())failed.push(seed);worst=Math.max(worst,n/120);const l=low(),a=stage.toScreen(l),f=stage.toScreen(new T.Vector3(l.x,0,l.z));gap=Math.max(gap,Math.hypot(a.x-f.x,a.y-f.y));flat=Math.min(flat,Math.abs(new T.Vector3(0,0,1).applyQuaternion(b.rotation()).y));
 }
 e.sync=saveSync;reports.push({id:i.id,failed,worstSeconds:worst,minY,restGapPx:gap,broadFaceUpDot:flat,maxEnergyGain:maxGain});
 check('board '+i.id+' 100 broad-face drops <=4s',!failed.length&&flat>.9&&gap<=2&&maxGain<.01,JSON.stringify(reports.at(-1)));
 for(const body of W.entries.values())body.body.setEnabled(true);
 site.pinboard.pin(i.id,false);
}
note('board drop diagnostics',JSON.stringify(reports));
site.pinboard.select('paper');await sleep(2500);
const snapshot=()=>({steps:W.stats.steps,syncs:W.stats.syncs,shadows:site.worldLayout.stats.shadowUpdates,frames:S.stats.frames,board:site.pinboard.picture.stats.draws,pictures:cards.map(i=>i.picture.stats.draws),textures:cards.flatMap(i=>i.prints.map(p=>p.texture.version)),callbacks:stage.onFrame.length});
const quiet=snapshot();await sleep(2100);
check('board asleep zero steps syncs pictures shadows uploads callbacks',JSON.stringify(quiet)===JSON.stringify(snapshot())&&!W.stats.listening&&!S.listening,JSON.stringify({before:quiet,after:snapshot()}));
store.set('boardCheck',cards.map(i=>({id:i.id,p:i.object.position.toArray(),q:i.object.quaternion.toArray(),support:i.worldEntry.support,box:{...i.box}})));store.flush();await __shot('world-unit5-rest');
