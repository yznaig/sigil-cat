// The Journey's tells unit (docs/journey/design.md §5.4-§5.6, §7 unit 2): no ghost doodle, the scrape, the butter
// shimmer, the whisker hum, the shelf's dust outlines, the board's pins, the empty peg, "what he said" in the grimoire
// and the combo riddles that show once their needs are done. Run with checks/lib.js on a fresh save; --reduced too.
const J=site.journey,R=stage.reducedMotion;
check('tells: the tells and journal parts are built',await until(()=>J.parts.tells?.stats&&J.parts.journal?.entries,10000),Object.keys(J.parts).join());
const TL=J.tells,S=TL.stats;
// a book open freezes the page's timers (src/core/page-scheduler.js): waits while one is open keep to the wall clock
const {wallClock}=await import(new URL('src/core/page-scheduler.js',document.baseURI).href);
const wsleep=(ms)=>new Promise((r)=>wallClock.setTimeout(r,ms));
const wuntil=async(f,ms=3000)=>{const t=performance.now();while(performance.now()-t<ms){if(f())return true;await wsleep(30);}return false;};
const box=(n)=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};

// ---- no ghost doodle (removed after a playtest): two bonks and the old 12 s wait draw nothing in the air ----
for(let i=0;i<2;i++){const m=catMid();await tap(m.x,m.y);await sleep(150);}
let drawnInAir=0;const watch=new MutationObserver((ms)=>{for(const r of ms)for(const n of r.addedNodes)if(n.nodeType===1&&!n.closest?.('[data-tell="shelf-gaps"]'))drawnInAir++;});
watch.observe(TL.layer,{childList:true,subtree:true});
await sleep(16000);watch.disconnect();
check('tells: no ghost doodle (no api, nothing drawn in the air after two bonks and 16 s)',!('doodle' in TL)&&!TL.config.doodle&&drawnInAir===0&&!document.querySelector('[data-tell="ghost-doodle"]'),JSON.stringify({drawnInAir,api:Object.keys(TL)}));

// the circle, drawn by hand (its top is the first solid keepsake, for the scrape below)
await until(settled,15000);
const sig=await drawSigil('circle');await until(settled,30000);
check('tells: the circle is drawn by hand',registry.has('circle'),drew(sig));

// ---- the scrape: the circle's top was the first solid keepsake, before the shelf ----
check('tells: the first solid keepsake scrapes from the left',await until(()=>S.scrapes.includes('left'),4000),JSON.stringify(S.scrapes));

// ---- the whisker hum: the butter song's "what's the butter man", six glints in the tune's order ----
const bm=E.butterman,harp=E.harp,g0=harp.glints;
bm.play({scene:'butter',forceAudio:true});
const hummed=await until(()=>S.hum.length>=6,30000,20);
const hum=S.hum.slice(0,6);
check('tells: the whisker hum fires six glints during the butter scene',hummed&&bm.running,JSON.stringify(hum.map(h=>h.whisker)));
check('tells: the glints are in the tune\'s order (C C B C D C)',hum.map(h=>h.whisker).join()==='1,1,0,1,2,1');
const gapsMs=hum.slice(1).map((h,i)=>h.at-hum[i].at);
check('tells: the glints are spaced like notes, not a burst',gapsMs.every(d=>d>200&&d<900),JSON.stringify(gapsMs));
check('tells: the harp drew them with its own gold ring',harp.glints-g0===hum.filter(h=>h.shown).length&&hum.filter(h=>h.shown).length>=4,JSON.stringify({glints:harp.glints-g0,shown:hum.filter(h=>h.shown).length}));
if(hum.length)await __shot('journey-tells-hum');
bm.stop();await until(settled,15000);
if(!cat.butterOn){cat.setButter(true);await cat.ensureButter();}
await until(()=>keepsakes.has('pat'),5000);await sleep(400);

// ---- the butter shimmer: one glint on a pass near the butter, not two within 20 s ----
const shimmerEl=()=>document.querySelector('#tells-fx [data-tell="butter-shimmer"]');
const pass=async()=>{const b=bm.butterScreen();for(let k=0;k<6;k++){hover(b.x+170-k*16,b.y-10);await sleep(110);}};
const s0=S.shimmers;await pass();
const shone=S.shimmers-s0===1&&!!shimmerEl();
check('tells: a pointer pass near the butter fires one shimmer',shone,`${S.shimmers-s0}`);
await sleep(1200);await pass();
check('tells: a second pass within 20 s does not',S.shimmers-s0===1,`${S.shimmers-s0}`);
check('tells: the passes did not find the whisper by themselves',!registry.has('whisper'));
hover(20,stage.height/2);   // the pointer leaves the butter (left there, it would find the whisper)

// ---- the shelf's dust outlines: only for things never owned ----
keepsakes.give('tin');
const shelfUp=await until(()=>site.shelf?.ready&&!site.shelf.arriving,20000);
await sleep(800);TL.gaps();
const ever=(id)=>!!store.get('worldDiscoveries.'+id)||keepsakes.has(id);
const want=['rifle','top','pat','tin','bucket','flour'].filter(id=>!ever(id)).sort().join();
const shown=()=>[...document.querySelectorAll('#tells-fx [data-tell="shelf-gap"]')].map(n=>n.dataset.item).sort().join();
check('tells: the shelf arrives with two solid things',shelfUp);
check('tells: dust outlines show exactly the never-owned things',shown()===want&&want.includes('rifle')&&!want.includes('top')&&!want.includes('tin'),JSON.stringify({shown:shown(),want}));
const gr=[...document.querySelectorAll('#tells-fx [data-tell="shelf-gap"]')].map(box);
check('tells: the outlines are on screen and sized like things',gr.length>0&&gr.every(r=>r.w>4&&r.w<stage.width/2&&r.x>-20&&r.x+r.w<stage.width+20&&r.y>-20&&r.y<stage.height),JSON.stringify(gr.map(r=>[r.x|0,r.y|0,r.w|0,r.h|0])));
await __shot('journey-tells-shelf-gaps');
keepsakes.give('rifle');
check('tells: an outline goes once its thing is owned',await until(()=>{TL.gaps();return !shown().split(',').includes('rifle');},5000),shown());

// ---- the board's pins: a flat keepsake picked up, the empty pins glint once ----
keepsakes.give('postcard');
check('tells: the first flat keepsake scrapes from the right',await until(()=>S.scrapes.includes('right'),4000),JSON.stringify(S.scrapes));
keepsakes.give('ticket');
const boardUp=await until(()=>site.pinboard?.ready&&!site.pinboard.arriving&&site.pinboard.art?.pins?.size>0,20000);await sleep(800);
const p0=S.pins;dispatchEvent(new CustomEvent('sigilcat:pickup',{detail:{id:'postcard',pointerType:KIND}}));
const pinEls=document.querySelectorAll('#tells-fx [data-tell="board-pin"]').length;
check('tells: picking up a flat thing glints the board\'s empty pins',boardUp&&S.pins-p0===1&&pinEls>=1,JSON.stringify({boardUp,pins:S.pins-p0,pinEls}));
await sleep(300);dispatchEvent(new CustomEvent('sigilcat:pickup',{detail:{id:'ticket',pointerType:KIND}}));
check('tells: not again straight away',S.pins-p0===1);
dispatchEvent(new CustomEvent('sigilcat:pickup',{detail:{id:'top',pointerType:KIND}}));
check('tells: a solid thing picked up does not',S.pins-p0===1);

// ---- the empty peg: three hats, no party hat ----
for(let n=0;n<3;n++){await until(()=>!E.hat.busy&&!cat.popping,5000);await site.cast('triangle');await until(()=>!E.hat.busy,8000);await sleep(200);}
await until(()=>site.rack?.root&&site.rack.picture&&!site.rack.landing,15000);await sleep(600);
const pg0=S.pegs,pegOk=TL.peg();
check('tells: with three hats and no party hat the empty peg wobbles',pegOk&&S.pegs-pg0===1&&!!document.querySelector('#tells-fx [data-tell="empty-peg"]'),JSON.stringify(site.rack?.owned?.()));
await __shot('journey-tells-peg');

// ---- "what he said" in the grimoire ----
await until(settled,15000);
J.emit('said',{id:'check-1',text:'once round. one flick. no help.',node:'noscope'});
J.emit('said',{id:'check-2',text:'felt is a lot to live up to.',node:null});
site.books.open('grimoire');
const sec=await wuntil(()=>document.querySelector('.book-sheet [data-journey="journal"]'));
const jt=document.querySelector('.book-sheet [data-journey="journal"]')?.textContent||'';
check('tells: the grimoire shows "what he said" with both lines',sec&&/what he said/i.test(jt)&&jt.includes('once round. one flick. no help.')&&jt.includes('felt is a lot to live up to.'),jt.slice(0,160));
check('tells: an unfound secret\'s lines are under "something"',!!document.querySelector('.book-sheet [data-journey="journal"] [data-node="noscope"]')?.textContent.includes('something'));
document.querySelector('.book-sheet [data-journey="journal"]')?.scrollIntoView({block:'center'});await wsleep(250);
await __shot('journey-tells-journal');
site.books.close();await sleep(300);

// ---- combo riddles: shown once their needs are done ----
const {FINDS}=await import(new URL('src/finds.js',document.baseURI).href);
const riddle=(id)=>FINDS.find(f=>f.id===id).riddle;
const inBook=async(id)=>{site.books.open('grimoire');await wuntil(()=>document.querySelector('.book-sheet #cards'));const t=document.querySelector('.book-sheet #cards').textContent;site.books.close();await sleep(250);return t.includes(riddle(id));};
store.del('achievements.loaf');store.del('achievements.spin');
check('tells: a combo whose needs are not done stays hidden',!J.visibleCombos().includes('blastoff')&&!await inBook('blastoff'),JSON.stringify(J.visibleCombos()));
store.set('achievements.loaf',Date.now());store.set('achievements.spin',Date.now());
check('tells: a combo whose needs are done shows its riddle',J.visibleCombos().includes('blastoff')&&await inBook('blastoff'),JSON.stringify(J.visibleCombos()));
const butterDone=J.has('butter');
check('tells: paradox follows its own needs (loaf and butter)',J.visibleCombos().includes('paradox')===butterDone&&await inBook('paradox')===butterDone,JSON.stringify({butterDone,vis:J.visibleCombos()}));
