// Harp lane (music round, 2026-11-16, e1116-11). Aaron: "the ASD JKL playable whiskers should be playable at all times,
// I think currently its set so that its only possible after you've already done the harp sequence."
// Run with checks/lib.js on a fresh save, desktop and phone (keys are real key presses, page.keyboard):
//  1 before the harp is found, A S D J K L pluck the six whiskers (each the whisker the mapping names, its note, its ring)
//  2 the tune on the keys finds the harp exactly as on the whiskers: found once, the encore once; again after it, the flare
//    and nothing more (no second find, no second encore)
//  3 ignored while typing in a text field (input, textarea, contenteditable), with a modifier, held (repeat), while the
//    page is locked, or with a pop-up or mode up (aria-modal, flappy's screen, the cake's error page); a focused slider
//    does not block them
//  4 on a desktop, key plucks never bring up the phone's whisker buttons
const H=E.harp,bm=E.butterman,show=(o)=>JSON.stringify(o);
cat.auto=false;cat.setYaw(cat.config.rotate.homeYaw);await sleep(600);
const press=async(k)=>{await __key(k);await sleep(60);};
check('harp-keys fresh save: the harp not found',!registry.has('harp')&&!H.unlocked&&H.keyPlucks===0);
// 1: each key, its whisker
// (the note follows the whisker in pluck(): H.config.notes[index]; the ring drawn is along the whisker that was plucked)
const ringEnds=()=>[...document.querySelectorAll('#harp-fx path')].map(p=>p.getAttribute('d').match(/-?[\d.]+/g).map(Number)).map(n=>[n[0],n[1],n[4],n[5]]);
const along=(w)=>{const all=H.whiskers();const near=([ax,ay,bx,by])=>all.map(v=>[v.index,Math.hypot(ax-v.pts[0].x,ay-v.pts[0].y)+Math.hypot(bx-v.pts[2].x,by-v.pts[2].y)]).sort((a,b)=>a[1]-b[1])[0];return ringEnds().some(e=>{const n=near(e);return n&&n[0]===w.index&&n[1]<16;});};   // a ring drawn along this whisker (nearest of the six; he bobs a little)
const order=['a','s','d','j','k','l'],got=[];
for(const k of order){
  const p0=H.plucks,k0=H.keyPlucks;await press(k);
  const idx=H.config.keys[k],w=H.whiskers().find(x=>x.index===idx);
  got.push({k,idx,plucked:H.plucks-p0,keyed:H.keyPlucks-k0,seen:!!w?.seen,rings:!!w&&along(w)});
  await sleep(1000);   // let the ring die so the next one is its own
}
check('harp-keys 1 before the harp is found, A S D J K L each pluck once, and the ring is along that key\'s whisker',got.every(g=>g.plucked===1&&g.keyed===1&&(!g.seen||g.rings)),show(got));
check('harp-keys 1 the keys map A S D to your left top to bottom, J K L to your right (0..5)',JSON.stringify(order.map(k=>H.config.keys[k]))==='[0,1,2,3,4,5]');
// the key's whisker is the one on that side of the screen, at that height
const ws=H.whiskers(),mid=(w)=>({x:(w.pts[1].x+w.pts[2].x)/2,y:(w.pts[1].y+w.pts[2].y)/2}),cx=cat.screenOf([0,cat.height*.5,0]).x;
const sides=ws.length===6&&[0,1,2].every(i=>mid(ws[i]).x<cx)&&[3,4,5].every(i=>mid(ws[i]).x>cx)&&mid(ws[0]).y<mid(ws[2]).y&&mid(ws[3]).y<mid(ws[5]).y;
check('harp-keys 1 A S D are the whiskers on the screen\'s left, top to bottom; J K L on its right',sides,show(ws.map(w=>[w.index,Math.round(mid(w).x),Math.round(mid(w).y)])));
check('harp-keys 1 every whisker was in view to ring',got.every(g=>g.seen));
check('harp-keys 1 still not found after six single notes',!registry.has('harp'));
// 2: the tune on the keys
const finds=[];registry.onFind(f=>finds.push(f.id));
const origEncore=bm.encore,realEncore=bm.encore.bind(bm);let encores=0,plays=0;bm.encore=()=>{encores++;const r=realEncore();if(r)plays++;return r;};
await sleep(H.config.patience*1000+300);
for(const k of ['s','s','a','s','d','s'])await press(k);
const found=await until(()=>registry.has('harp'),3000);await until(()=>encores>0,3000);
check('harp-keys 2 the tune on the keys (S S A S D S) finds the harp',found&&H.unlocked&&finds.filter(f=>f==='harp').length===1,show({finds,encores}));
check('harp-keys 2 and plays the encore, once',await until(()=>bm.running,3000)&&plays===1,show({encores,plays}));
await __shot('harp-keys-encore');
await until(()=>!bm.running,60000);await sleep(800);cat.setYaw(cat.config.rotate.homeYaw);await sleep(400);
const fl=H.flares;for(const k of ['s','s','a','s','d','s'])await press(k);
await until(()=>H.flares>fl,3000);await sleep(800);
check('harp-keys 2 the tune again: the whiskers flare, no second find, no second encore',H.flares===fl+1&&finds.filter(f=>f==='harp').length===1&&plays===1&&!bm.running,show({flares:H.flares-fl,finds,encores,plays,running:bm.running}));
bm.encore=origEncore;
// 3: where the keys do nothing
await sleep(1500);
const none=async(label,setup,undo,how='key')=>{
  const n0=H.plucks;await setup();
  if(how==='key')await press('k');else dispatchEvent(new KeyboardEvent('keydown',how));
  await sleep(80);const ok=H.plucks===n0;await undo();return [label,ok];
};
const field=(tag,attrs={})=>{const e=document.createElement(tag);Object.assign(e,attrs);e.style.cssText='position:fixed;left:8px;top:120px;width:120px;z-index:99';document.body.appendChild(e);return e;};
const res=[];let f;
res.push(await none('text input',()=>{f=field('input',{type:'text'});f.focus();},()=>f.remove()));
res.push(await none('search input',()=>{f=field('input',{type:'search'});f.focus();},()=>f.remove()));
res.push(await none('textarea',()=>{f=field('textarea');f.focus();},()=>f.remove()));
res.push(await none('contenteditable',()=>{f=field('div');f.contentEditable='true';f.textContent='x';f.focus();},()=>f.remove()));
res.push(await none('ctrl+k',()=>{},()=>{},{key:'k',ctrlKey:true,bubbles:true}));
res.push(await none('alt+k',()=>{},()=>{},{key:'k',altKey:true,bubbles:true}));
res.push(await none('meta+k',()=>{},()=>{},{key:'k',metaKey:true,bubbles:true}));
res.push(await none('held k (repeat)',()=>{},()=>{},{key:'k',repeat:true,bubbles:true}));
res.push(await none('page locked',()=>input.lock('harp-keys-check',true),()=>input.lock('harp-keys-check',false)));
res.push(await none('a pop-up (aria-modal)',()=>{f=field('div');f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');},()=>f.remove()));
res.push(await none('flappy\'s screen',()=>{f=field('div');f.id='bird-screen';},()=>f.remove()));
res.push(await none('the cake\'s error page',()=>{f=field('div');f.id='party-error';},()=>f.remove()));
check('harp-keys 3 the keys do nothing while typing, modified, held, locked or under a pop-up or mode',res.every(r=>r[1]),show(res.filter(r=>!r[1]).map(r=>r[0])));
// the real books: the grimoire open (a mode that owns the keyboard: locked and aria-modal)
// (an open book freezes the page's timers, sleep() included: wall-clock waits while it is open)
{const {wallClock}=await import(new URL('src/core/page-scheduler.js',document.baseURI).href),wsleep=(ms)=>new Promise((r)=>wallClock.setTimeout(r,ms));
 const n0=H.plucks;site.books.open('grimoire');let open=false;for(let t=0;t<40&&!open;t++){await wsleep(100);open=!!document.querySelector('.book-pop');}
 await wsleep(300);await __key('k');await wsleep(120);
 const ok=open&&H.plucks===n0;site.books.close();await wsleep(500);await until(()=>!document.querySelector('.book-pop'),4000);await sleep(400);
 check('harp-keys 3 the grimoire open: the keys do nothing',ok,show({open,plucks:H.plucks-n0}));}
// a focused slider (the volume) takes no letters, so it does not block them
{const v=document.getElementById('volume');const n0=H.plucks;v?.focus();await press('k');
 check('harp-keys 3 a focused slider does not block them',!!v&&document.activeElement===v&&H.plucks===n0+1,show({focused:document.activeElement?.id,plucks:H.plucks-n0}));v?.blur();}
check('harp-keys 3 a key still plucks after all that',await(async()=>{await sleep(300);const n0=H.plucks;await press('j');return H.plucks===n0+1;})());
// 4
if(!MOBILE)check('harp-keys 4 on a desktop key plucks bring up no whisker buttons',!document.getElementById('harp-keys')&&!H.buttons.el);
else note('harp-keys 4 (phone: the buttons are checks/harp-buttons.js)',`buttons ${H.buttons.shown}`);
