const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok,detail='')=>__say(`CHECK reel ${name}: ${detail} ${ok?'PASS':'FAIL'}`);
const until=async f=>{const start=performance.now();while(!f()&&performance.now()-start<10000)await sleep(40);return f();};
await until(()=>!document.querySelector('#all').disabled);
const rows=[...document.querySelectorAll('#sounds article')];
// 68 since playtest-2 (the bread's rocket cue was removed, and with it one old-new comparison)
check('68 named rows and 32 old-new comparisons',rows.length===68&&rows.filter(r=>r.querySelectorAll('audio').length===2).length===32);
const originals=rows.filter(r=>r.dataset.selection==='original, kept by Aaron');
check('Aaron’s eight originals are labelled on their current players',originals.length===8&&
  originals.map(r=>r.dataset.name).sort().join(',')==='bite,choir,click,glass-slide,glass-smash,paper,slap,twinkle'&&
  originals.every(r=>r.querySelectorAll('audio')[1].getAttribute('aria-label').endsWith('original, kept by Aaron')));
const levels=(await (await fetch('sound-reel.json')).json()).levels;
const differences=rows.filter(r=>r.querySelectorAll('audio').length===2).map(r=>
  [...r.querySelectorAll('audio')].map(p=>levels[p.getAttribute('src').replace('../','')].activeRmsDbfs+20*Math.log10(p.volume)))
  .map(([a,b])=>Math.abs(a-b));
check('all reference/current pairs are level matched without boosting',differences.every(d=>d<1e-6),`max difference ${Math.max(...differences).toFixed(6)} dB`);
check('7 retained performances and embedded montage',document.querySelectorAll('#retained article').length===7&&!!document.querySelector('#retained video'));
document.querySelector('#all').click();
const advanced=await until(()=>/tap-bonk/.test(document.querySelector('#now').textContent));
check('playlist advances through real decoded audio',advanced,document.querySelector('#now').textContent);
document.querySelector('#stop').click();
check('stop silences every player',[...document.querySelectorAll('audio,video')].every(p=>p.paused));
const old=rows[0].querySelector('audio');await old.play();await sleep(70);
check('old comparison actually plays',!old.paused&&old.currentTime>0);document.querySelector('#stop').click();
const newSound=rows[0].querySelectorAll('audio')[1];await newSound.play();await sleep(70);
check('new comparison actually plays',!newSound.paused&&newSound.currentTime>0);document.querySelector('#stop').click();
document.querySelector('#all').click();document.querySelector('#stop').click();
await old.play();await sleep(100);
check('cancelled playlist startup cannot stop a newer selection',!old.paused&&old.currentTime>0);
document.querySelector('#stop').click();
rows[0].scrollIntoView();
await __shot('sound-reel');
originals.find(r=>r.dataset.name==='slap')?.scrollIntoView();
await __shot('sound-kept-originals');
