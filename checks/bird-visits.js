// Bird lane (playtest-2; playtest 3: 4-10 min, a 10-minute limiter): the bird is a visitor. A limiter that holds across reloads, a 2.5-minute stay,
// and an egg on every visit when the player has none anywhere. Run with ?birdcheck=1 and a saved state whose bird
// has been away 290 s of a 300 s gap: it must come within the first 15 s of this visit (the visit's settle time).
cat.auto=false;const B=E.bird,C=E.box.recipe;
note('bird visits schedule at load',JSON.stringify(B.schedule));
check('bird limiter: a bird away 290 of 300 s is due within this visit\'s first 15 s',B.state==='waiting'&&B.schedule.due<=15000,JSON.stringify(B.schedule));
check('bird limiter: it comes',await until(()=>B.state==='flying',20000)&&B.stats.appearedAt<=16500,`arrived ${B.stats.appearedAt?.toFixed(0)} ms after opening`);
check('bird every arrival lets an egg go when there is none',await until(()=>keepsakes.get('egg')?.worldReady,6000)&&C.state.egg?.count===1&&B.stats.eggCalls===1);
const next=B.schedule;check('bird the next absence is drawn between 4 and 10 minutes',B.schedule.away===0&&next.gap>=240000&&next.gap<=600000,JSON.stringify(next));
// It stays 2.5 min, then flies off (here, shortened); the flight off is drawn, then the next absence starts.
check('bird stays 2.5 minutes by default',next.stayLeft>140000&&next.stayLeft<=150000,JSON.stringify(next));
B.debug.stay(200);check('bird flies off when its stay is over',await until(()=>B.state==='leaving',2000));
await sleep(stage.reducedMotion?300:900);await __shot('bird-visits-leaving');
check('bird is gone after its flight off, the limiter armed',await until(()=>B.state==='waiting'&&!document.querySelector('.distant-bird'),6000)&&B.stats.departures===1&&B.stats.timer&&B.schedule.due<=600000&&B.stats.callbacks===0,JSON.stringify(B.schedule));
// The egg goes into a cake (taken from the room): the next visit brings another.
keepsakes.take('egg');await sleep(100);
B.debug.skipTo(89.5);await until(()=>B.state==='flying',3000);
check('bird the next visit brings another egg for another cake',await until(()=>keepsakes.get('egg')?.worldReady,6000)&&C.state.egg.count===2&&B.stats.arrivals===2);
// An egg in the box counts: no drop.
const egg=keepsakes.get('egg');await until(()=>egg.worldEntry.body.isSleeping(),12000);
const k=C.state.chest.findIndex(e=>!e);C.state.chest[k]={id:'egg',state:{}};keepsakes.take('egg');C.save(true);
B.leave();await until(()=>B.state==='waiting',6000);B.debug.skipTo(89.5);await until(()=>B.state==='flying',3000);await sleep(stage.reducedMotion?1800:3600);
check('bird an egg in the box means no new egg',B.stats.eggCalls===3&&!keepsakes.has('egg')&&C.state.egg.count===2);
// Waiting time is kept across the reload.
B.leave();await until(()=>B.state==='waiting',6000);await sleep(2500);
const away=B.schedule.away;store.set('birdcheck',{away,at:Date.now()});store.flush();
check('bird waiting time accrues while visible',away>=2000,JSON.stringify(B.schedule));
