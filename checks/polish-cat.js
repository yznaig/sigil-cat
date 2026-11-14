// World polish lane (e1111-58, items 2 and 3): the loaf (bread) only from the sigil, and the cat never stuck shaking.
// Run with checks/lib.js.
cat.auto=false;
const bread=E.bread,pet=E.petbite,rnd=Math.random;
// 2. A long loaf hold with every random roll at its luckiest: the old 15%-per-hold roll would have made bread here.
cat.request('lie');await until(()=>cat.pose==='lie'&&!cat.popping&&cat.phase==='hold',10000);
Math.random=()=>0;
try{await fast(4,()=>sleep(2500));}finally{Math.random=rnd;}
check('loaf never happens by chance',bread.state==='cat'&&bread.count===0&&!cat.standIn,`after ${(10).toFixed(0)} s of loaf hold with Math.random()=0: ${bread.state}, ${bread.count} breads`);
cat.request('sit');await until(()=>cat.pose==='sit'&&!cat.popping,10000);
const r=await drawSigil('dome');
check('the loaf sigil still makes bread',r.name==='dome'&&await until(()=>bread.isBread,8000),drew(r));
bread.toCat(true);await until(()=>!cat.standIn,2000);
// 3. Stuck shaking: a few strokes short of a bite left his annoyance (and the twitch it drives) in place for good.
await until(settled,6000);
for(let i=0;i<5;i++)pet.stroke();
await sleep(200);
const warned=stage.reducedMotion?!pet.twitching:pet.twitching&&Math.abs(cat.fx.rot)>0;
check('petting a while still makes him twitch first',warned,`annoyance ${pet.annoyance.toFixed(2)}, twitching ${pet.twitching}`);
const t0=performance.now();
const calmed=await until(()=>!pet.twitching&&cat.fx.rot===0&&pet.annoyance===0,8000);
const rots=[];for(let i=0;i<40;i++){rots.push(cat.fx.rot);await sleep(25);}
check('left alone he stops twitching (no stuck shake)',calmed&&rots.every(v=>v===0)&&pet.annoyance===0,`calm after ${((performance.now()-t0)/1000).toFixed(1)} s; annoyance ${pet.annoyance}`);
// the bite itself is unchanged: seven strokes in a row
const b0=pet.bites;for(let i=0;i<7;i++)pet.stroke();
check('seven strokes in a row still bite',pet.bites===b0+1&&pet.config.patience===7);
await sleep(300);
check('after the bite nothing keeps shaking him',!pet.twitching&&cat.fx.rot===0);
