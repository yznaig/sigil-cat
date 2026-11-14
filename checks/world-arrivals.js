// world-arrivals.js: Aaron's furniture arrivals and depth (e1111-36/37/34/41/42), live at real time on the audio clock.
// Run with ?arrivals=1 (automation otherwise places furniture at once). Normal motion: the first unlock (shelf) grinds
// in from the left for 15 s under the fading scrape and lands on the FF7R fanfare; the second (pinboard) grinds in
// from the right and lands on the Spellsword bong, measured here in the decoded file. Reduced motion: short fades,
// fanfares still play. Also: no furniture button rows, both pieces angled with drop targets aligned, the resting top
// tilted in its recess, the louder whisper, the grimoire credits.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,A=site.arrivals||(await import(new URL('src/world/arrival.js',document.baseURI).href)).furnitureArrivals(site);
const reduced=stage.reducedMotion,C=A.config,ctx=audio.context(true),sx=o=>stage.toScreen(new T.Vector3().setFromMatrixPosition(o.matrixWorld));
check('arrivals run live under ?arrivals=1',!A.instant()&&ctx?.state==='running',`instant ${A.instant()} audio ${ctx?.state}`);

// ---- first unlock: the shelf ----
const tin=keepsakes.give('tin');await tin.worldTask;check('arrivals one solid keeps the shelf locked',!A.plans.has('shelf')&&!site.shelf.ready);
const rifle=keepsakes.give('rifle');await rifle.worldTask;const plan=A.plans.get('shelf');
check('arrivals the first unlock is the shelf, ordinal 1, from the left',plan?.ordinal===1&&plan.side===-1,JSON.stringify({ordinal:plan?.ordinal,side:plan?.side}));
await site.shelf.task;await until(()=>plan.state!=='waiting',8000,10);
const shelf=site.shelf,home1=shelf.home;
check('arrivals the shelf body waits disabled, every bay refuses, store refuses',shelf.arriving&&!shelf.entry.body.isEnabled()&&shelf.slots.every(s=>s.disabled)&&!shelf.store('tin',false)&&!S.candidate(tin.worldEntry));
const trace=[];let mid=false,midShot=null;
while(plan.state==='moving'){const t=ctx.currentTime-plan.t0,r=shelf.picture.rect;trace.push({t,x:r.x,u:plan.u,scrape:plan.scrape?.node.gain.value??null});
 if(!reduced&&!mid&&t>=C.first.lead+7.2){mid=true;midShot=await __shot('arrivals-shelf-mid');}await sleep(reduced?30:120);}
const landed1=plan.landedAt-plan.t0;
if(!reduced){
 // e1111-55: 0-15 s the scrape fades in with nothing on screen; 15-30 s it scrapes at full level while the shelf slides in.
 const lead=C.first.lead,hidden=trace.filter(p=>p.t>.05&&p.t<lead-.15),w=shelf.picture.rect.w;
 check('arrivals the shelf stays off screen through the 15 s lead-in',hidden.length>50&&hidden.every(p=>p.x+w<=2&&p.u===0),`${hidden.length} samples; last ${JSON.stringify(hidden.at(-1))}`);
 check('arrivals first arrival lands at 30 s on the audio clock (15 s lead-in + 15 s slide)',Math.abs(landed1-(lead+C.first.seconds))<.06&&plan.seconds===lead+C.first.seconds,`landed ${landed1.toFixed(3)} s after start`);
 const moving=trace.filter(p=>p.t>lead+.3&&p.t<lead+C.first.seconds-.3),speeds=[];for(let i=1;i<moving.length;i++){const dt=moving[i].t-moving[i-1].t;if(dt>.05)speeds.push((moving[i].u-moving[i-1].u)/dt);}
 const mean=speeds.reduce((a,b)=>a+b,0)/speeds.length,cv=Math.sqrt(speeds.reduce((a,b)=>a+(b-mean)**2,0)/speeds.length)/mean;
 check('arrivals the slide grinds over the second 15 s: uneven pace, never backwards',cv>.2&&speeds.every(v=>v>=0)&&moving.every((p,i)=>!i||p.x>=moving[i-1].x-1.5)&&moving[0].x<moving.at(-1).x-100,`speed variation ${cv.toFixed(2)} over ${speeds.length} samples`);
 const at=s=>trace.reduce((b,p)=>Math.abs(p.t-s)<Math.abs(b.t-s)?p:b),g4=at(4).scrape,g8=at(8).scrape,g14=at(14).scrape,g20=at(20).scrape,g28=at(28).scrape;
 check('arrivals the scrape loops, fades in slowly over the lead-in, then stays full while it slides',g4>.03&&g4<.15&&g8>g4*2.5&&g14>.75&&g20>.97&&g28>.97&&!!plan.scrape,`gain at 4/8/14/20/28 s: ${[g4,g8,g14,g20,g28].map(v=>v?.toFixed(3)).join(' / ')}`);
}else check('arrivals reduced motion: shelf fades in place quickly',landed1<C.reducedSeconds+.1&&trace.every(p=>Math.abs(p.x-home1.x)<2),`${landed1.toFixed(3)} s`);
check('arrivals FF7R fanfare scheduled on the landing',!!plan.fanfare&&Math.abs(plan.fanfareWhen-(plan.t0+plan.seconds))<1e-6&&audio.buffer(C.first.fanfare)?.duration>4);
await sleep(250);let heard=0;for(let i=0;i<10;i++){heard=Math.max(heard,audio.level());await sleep(60);}
check('arrivals the fanfare is heard after landing',heard>2e-3,`level ${heard.toExponential(1)}`);
await until(()=>plan.state==='landed',2000,20);
check('arrivals landed shelf is usable at home',!shelf.arriving&&shelf.entry.body.isEnabled()&&shelf.slots.every(s=>!s.disabled)&&Math.abs(shelf.picture.rect.x-home1.x)<1&&shelf.store('tin',false)&&tin.worldEntry.support?.id==='shelf');
await __shot('arrivals-shelf-landed');

// ---- the resting top and the shelf's depth ----
const top=keepsakes.give('top');await top.worldTask;shelf.store('rifle',false);check('arrivals top stores on the shelf',shelf.store('top',false)&&top.worldEntry.support?.id==='shelf');
{const q=new T.Quaternion(...shelf.slots.find(s=>s.id==='top').quaternion),axis=new T.Vector3(0,1,0).applyQuaternion(q),tilt=Math.acos(axis.y)*180/Math.PI;
 const p=new T.Vector3(...shelf.slots.find(s=>s.id==='top').position);let gap=Infinity,below=0;
 for(const v of top.colliderVertices){const w=v.clone().applyQuaternion(q).add(p),floor=Math.hypot(w.x+.53,w.z-.06)<.073?.014:.05;gap=Math.min(gap,w.y-floor);if(w.y<floor-.0005)below++;}
 check('arrivals the top rests tilted on its shoulder in its recess',tilt>25&&tilt<60&&below===0&&gap<.002,`tilt ${tilt.toFixed(1)} deg, lowest contact gap ${(gap*1000).toFixed(2)} mm, ${below} points below`);
 const live=new T.Vector3(0,1,0).applyQuaternion(top.object.quaternion).applyQuaternion(shelf.root.quaternion.clone().invert());
 check('arrivals the stored top body takes the tilted pose',Math.abs(Math.acos(live.y)*180/Math.PI-tilt)<1,`${(Math.acos(live.y)*180/Math.PI).toFixed(2)} deg`);}
const facing=(root,deg)=>{stage.camera.updateMatrixWorld();const n=new T.Vector3(0,0,1).applyQuaternion(root.quaternion).applyQuaternion(stage.camera.quaternion.clone().invert()),c=root.position.clone().applyMatrix4(stage.camera.matrixWorldInverse),toCam=Math.atan2(-c.x,-c.z),yaw=Math.atan2(n.x,n.z);return (yaw-toCam)*180/Math.PI;};
// playtest 2 (furniture lane): the shelf is square to the screen plus a 2-degree turn, no longer 11 past facing the camera
const sq=(()=>{const n=new T.Vector3(0,0,1).applyQuaternion(shelf.root.quaternion).applyQuaternion(stage.camera.quaternion.clone().invert());return Math.atan2(n.x,n.z)*180/Math.PI;})();
// playtest 3 (layout lane, e1113-30, Aaron approved the mock-up): turned SHELF_VIEW.yawDeg (30) to its right, its front level
const {SHELF_VIEW}=await import(new URL('src/world/shelf.js',document.baseURI).href);
check('arrivals the shelf stands as placed: square to the screen plus its turn to the right (SHELF_VIEW.yawDeg)',Math.abs(sq-SHELF_VIEW.yawDeg)<.5,`${sq.toFixed(2)} deg from square, ${SHELF_VIEW.yawDeg} wanted`);

// ---- second unlock: the pinboard ----
const paper=keepsakes.give('paper');await paper.worldTask;const postcard=keepsakes.give('postcard');await postcard.worldTask;
const plan2=A.plans.get('pinboard');check('arrivals the second unlock is the board, ordinal 2, from the right',plan2?.ordinal===2&&plan2.side===1);
await site.pinboard.task;await until(()=>plan2.state!=='waiting',10000,10);const board=site.pinboard,home2=board.home;
const fanfare=audio.buffer(C.second.fanfare);
// The bong, measured in the decoded file the page plays: the strongest spectral-flux onset after 30 s.
function bongOf(buf){const N=1024,hop=48,sr=buf.sampleRate,ch=[...Array(buf.numberOfChannels)].map((_,c)=>buf.getChannelData(c)),from=Math.floor(30*sr),to=Math.min(buf.length-N,Math.floor(34.5*sr));
 const win=Float32Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1))),re=new Float64Array(N),im=new Float64Array(N);let prev=null;const flux=[],times=[];
 for(let s=from;s<to;s+=Math.round(hop*sr/48000)){for(let i=0;i<N;i++){let v=0;for(const c of ch)v+=c[s+i];re[i]=v/ch.length*win[i];im[i]=0;}
  for(let i=1,j=0;i<N;i++){let b=N>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
  for(let len=2;len<=N;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<N;i+=len)for(let k=0;k<len/2;k++){const c=Math.cos(a*k),d=Math.sin(a*k),x=re[i+k+len/2]*c-im[i+k+len/2]*d,y=re[i+k+len/2]*d+im[i+k+len/2]*c;re[i+k+len/2]=re[i+k]-x;im[i+k+len/2]=im[i+k]-y;re[i+k]+=x;im[i+k]+=y;}}
  const mag=new Float64Array(N/2+1);for(let k=0;k<=N/2;k++)mag[k]=Math.log1p(Math.hypot(re[k],im[k])*20);
  let f=0;if(prev)for(let k=0;k<=N/2;k++)f+=Math.max(0,mag[k]-prev[k]);prev=mag;flux.push(f);times.push((s+N/2)/sr);}
 let best=0,bi=0;for(let i=2;i<flux.length-2;i++){const m=(flux[i-2]+flux[i-1]+flux[i]+flux[i+1]+flux[i+2])/5;if(m>best){best=m;bi=i;}}return times[bi];}
const bong=bongOf(fanfare);
check('arrivals measured bong is where the slide is timed',Math.abs(bong-C.second.bong)<.1,`bong ${bong.toFixed(3)} s in the decoded file; slide ${C.second.bong} s`);
check('arrivals Spellsword starts with the slide',!!plan2.fanfare&&Math.abs(plan2.fanfareWhen-plan2.t0)<1e-6&&(reduced?Math.abs(plan2.fanfareOffset-(C.second.bong-plan2.seconds))<1e-6:plan2.fanfareOffset===0));
check('arrivals the board waits disabled; cards cannot pin early',board.arriving&&!board.entry.body.isEnabled()&&board.slots.every(s=>s.disabled)&&!board.pin('paper')&&!paper.worldEntry.support);
let mid2=false,stall=null;const trace2=[];
while(plan2.state==='moving'){const t=ctx.currentTime-plan2.t0;trace2.push({t,x:board.picture.rect.x});
 if(!reduced&&!mid2&&t>=12){mid2=true;await __shot('arrivals-board-mid');
  // A long stall (the main thread held 1.5 s, as a hidden tab or a slow frame would): the next frame resyncs to audio time.
  const t1=performance.now();while(performance.now()-t1<1500);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));stall={audio:ctx.currentTime-plan2.t0,plan:plan2.t};}
 await sleep(reduced?30:150);}
if(stall)check('arrivals a stalled page resyncs to the audio clock',Math.abs(stall.audio-stall.plan)<.12,JSON.stringify(stall));
const landed2=plan2.landedAt-plan2.t0;
if(!reduced){
 check('arrivals the board starts fully off the right edge',trace2.find(p=>p.t>.05)?.x>=stage.width-2,JSON.stringify(trace2.find(p=>p.t>.05)));
 check('arrivals second slide lands within 100 ms of the bong',Math.abs(landed2-bong)<.1,`landed ${landed2.toFixed(3)} s after the music began; bong at ${bong.toFixed(3)} s; off by ${((landed2-bong)*1000).toFixed(0)} ms`);
}else check('arrivals reduced motion: board fades in place, the bong on its appearance',landed2<C.reducedSeconds+.1&&Math.abs(plan2.fanfareOffset+landed2-bong)<.1);
await until(()=>plan2.state==='landed',2000,20);await sleep(600);
// Playtest 3 (cards lane): nothing goes onto the board by itself; the cards wait on the floor for the player.
check('arrivals landed board is usable and pins none of the waiting cards',!board.arriving&&board.entry.body.isEnabled()&&!paper.worldEntry.support&&!postcard.worldEntry.support&&Math.abs(board.picture.rect.x-home2.x)<1);
const ticket=keepsakes.give('ticket');await ticket.worldTask;await sleep(600);
check('arrivals a card found after the board lands on the floor too',!ticket.worldEntry.support);
for(const i of [paper,postcard,ticket])board.pin(i.id,false);await until(()=>!S.active,4000);await sleep(400);
const bYaw=facing(board.root);check('arrivals the board is angled like the shelf, mirrored',Math.abs(bYaw+11)<1.5,`${bYaw.toFixed(2)} deg past facing the camera`);
// Pins sit at each card's top centre on the board face; each card lies flat in its slot.
{const bad=[];for(const i of [paper,postcard,ticket]){if(i.stored)continue;const pin=board.art.pins.get(i.id),pw=new T.Vector3().setFromMatrixPosition(pin.matrixWorld),local=i.object.worldToLocal(pw.clone()),h=i.cardDimensions.height;
  const nb=new T.Vector3(0,0,1).applyQuaternion(board.root.quaternion),nc=new T.Vector3(0,0,1).applyQuaternion(i.object.quaternion);
  if(!(Math.abs(local.x)<.01&&Math.abs(local.y-(h/2-.018))<.01&&nb.dot(nc)>.999))bad.push({id:i.id,local:local.toArray().map(v=>+v.toFixed(4)),dot:nb.dot(nc)});}
 check('arrivals pins and cards line up on the turned board',!bad.length,JSON.stringify(bad));}
const r=board.picture.rect,found=document.querySelector('#found').getBoundingClientRect();
check('arrivals board stays on screen below the count',r.x+r.w<=stage.width+4&&r.y>=found.bottom-1,JSON.stringify(r));
check('arrivals board is a little smaller than before',MOBILE||(r.w<429*.96&&r.h<293*.97),`${r.w}x${r.h} px (was 429x293)`);
await __shot('arrivals-landed');

// ---- e1111-34: no button rows; a tap on the postcard flips it in place, no page (playtest 3) ----
const rows=document.querySelectorAll('.world-shelf-actions,.world-board-actions,.cake-actions,.rack-cycle,.shelf-arrange-scrim').length,visible=[...document.querySelectorAll('.world-furniture-actions button')].filter(b=>!b.hidden&&b.getBoundingClientRect().width>0).map(b=>b.textContent);
check('arrivals no furniture button rows remain',!rows&&!visible.length,JSON.stringify({rows,visible}));
{const i=postcard,pid=++pointerIds,p=stage.toScreen(i.object.localToWorld(new T.Vector3(0,-i.cardDimensions.height*.2,.003))),was=!!i.state.flipped;
 fire('pointerdown',p.x,p.y,pid);await sleep(80);fire('pointerup',p.x,p.y,pid,0);await sleep(150);
 check('arrivals a tap on the pinned postcard flips it in place, no page',!!i.state.flipped!==was&&!document.querySelector('.card-sheet')&&i.worldEntry.support?.id==='pinboard',JSON.stringify({flipped:i.state.flipped}));
 await __shot('arrivals-postcard-flipped');site.cards.flip(i);}
// (the phone's one-card board and its tap-for-the-next-card are gone: phones play on their side, shell lane playtest-2)
check('arrivals one board everywhere: every pinned card shows at once',[paper,postcard,ticket].every(i=>!i.stored&&i.object.visible),[paper,postcard,ticket].map(i=>i.id+':'+i.stored).join(' '));

// ---- e1111-41: the whisper, a smidge louder ----
{const Wh=(await import(new URL('src/eggs/butterman-config.js',document.baseURI).href)).BUTTERMAN.whisper;
 await audio.load(Wh.file);const buf=audio.buffer(Wh.file);let peak=0;for(let c=0;c<buf.numberOfChannels;c++)for(const v of buf.getChannelData(c))peak=Math.max(peak,Math.abs(v));
 const db=20*Math.log10(Wh.volume/.045),out=20*Math.log10(peak*Wh.volume);
 check('arrivals whisper is a few dB louder and far from clipping',db>3&&db<6&&out<-12,`+${db.toFixed(2)} dB on .045; loudest output peak ${out.toFixed(1)} dBFS`);}

// ---- e1111-03/38: the grimoire credits ----
{const {grimoireHTML}=await import(new URL('src/ui/books.js',document.baseURI).href);   // the grimoire is a pop-up now (shell lane)
 const doc=new DOMParser().parseFromString(grimoireHTML().body,'text/html'),c=doc.querySelector('.credits');
 check('arrivals grimoire credits the cow and the Spellsword fanfare',!!c&&/Rukh3D/.test(c.textContent)&&/CC BY 4\.0/.test(c.textContent)&&!!c.querySelector('a[href*="sketchfab.com/3d-models/farm-cow"]')&&/"RPG Victory Fanfare 2" by Lux Aeterna Audio/.test(c.textContent.replace(/[“”]/g,'"'))&&!!c.querySelector('a[href="https://www.youtube.com/@LuxAeterna22878"]'));}
store.set('arrivalsCheck',{shelf:shelf.home,pinboard:board.home});store.flush();
