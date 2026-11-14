// Gags lane, playtest 2 (item 10): the cake gives the party hat and the rack, not all four hats; the hat sigil never
// gives the party hat. Run with checks/lib.js.
cat.auto=false;const R=site.rack;
check('fresh page: no rack, no hats',!keepsakes.has('rack')&&R.owned().length===0);
check('the party hat cannot be worn before the cake gives it',await E.hat.wear('party')===false&&!E.hat.wearing);
// The cake's return (party.js) wears it as a gift.
await E.hat.wear('party',{gift:true});await until(()=>R.hats.get('party')?.worldReady,15000);await sleep(800);
check('the cake gives the party hat and the rack, and only those',keepsakes.has('rack')&&R.hats.size===1&&E.hat.wearing==='party'&&R.owned().join()==='party'&&![...keepsakes.live.keys()].some(k=>k.startsWith('rack/')&&k!=='rack/party'),JSON.stringify(R.owned()));
await __shot('gags-hats-cake-only');
// Playtest 3: the sigil unlocks one hat per cast, in order (wizard, cone, crown), dropping it on his head; after all
// three a cast just brings the rack (no hat dropped, nothing new owned). Never the party hat.
const casts=[];
for(let n=0;n<5;n++){await until(()=>!E.hat.busy&&!cat.popping,5000);const before=R.owned().length;await site.cast('triangle');await until(()=>!E.hat.busy,5000);await sleep(200);
 casts.push({wearing:E.hat.wearing,owned:R.owned().join(),added:R.owned().length-before,hangs:[...R.hats.keys()].join()});}
check('each triangle unlocks the next hat, one at a time: wizard, cone, crown',casts.slice(0,3).map(c=>c.wearing).join()==='wizard,cone,crown'&&casts.slice(0,3).every(c=>c.added===1),JSON.stringify(casts.slice(0,3)));
check('after all three a cast just brings the rack: no new hat, none dropped',casts.slice(3).every(c=>c.added===0&&c.wearing==='crown')&&keepsakes.has('rack'),JSON.stringify(casts.slice(3)));
check('the hat sigil never drops the party hat',casts.every(c=>c.wearing!=='party'));
check('now all four hang or are worn',R.hats.size===4&&R.owned().length===4);
// Tapping the post goes round the owned hats.
await E.hat.wear(null);const round=[];for(let n=0;n<5;n++){await E.hat.cycle();round.push(E.hat.wearing);}
check('the post cycles through the hats he has, then bare',round.join()==='wizard,cone,party,crown,',round.join());
await __shot('gags-hats-all');
