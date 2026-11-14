// World polish lane (e1111-58, item 5): the butter goes under the hat. Run with checks/lib.js.
cat.auto=false;
const S=site.supports,R=site.rack;
await R.ready();
await E.hat.wear('wizard');
cat.setButter(true,'quiet');
const pat=keepsakes.get('pat')||keepsakes.give('pat');await pat.worldTask;
await until(()=>pat.worldEntry?.support?.id==='cat-butter',5000);await sleep(600);
const hat=R.hats.get('wizard').worldEntry,lift=hat.support.position[1];
const butterTop=.02+.065/2;
check('butter rides on his head, not on the hat',cat.butterSlot.position.y===0&&pat.worldEntry.support.position[1]===.02,`butter slot ${cat.butterSlot.position.y}`);
check('the hat rests on top of the butter',Math.abs(lift-(butterTop-.004))<1e-6,`hat base ${lift.toFixed(4)}, butter top ${butterTop.toFixed(4)}`);
const crown=R.hats.get('wizard'),top=S.crownHeight;
check('the crown height (what sits on top) is the hat over the butter',top>lift+.1,`crown ${top.toFixed(3)}`);
const ph=stage.toScreen(hat.object.getWorldPosition(new site.THREE.Vector3())),pb=stage.toScreen(pat.worldEntry.object.getWorldPosition(new site.THREE.Vector3()));
check('on the page the pat is below the hat',pb.y>ph.y,`pat ${pb.y.toFixed(1)}, hat ${ph.y.toFixed(1)}`);
await __shot('polish-hat-butter');
for(const pose of ['lie','stretch','sit']){cat.request(pose);await until(()=>cat.pose===pose&&!cat.popping,10000);}
check('the stack holds through his poses',Math.abs(hat.support.position[1]-lift)<1e-6&&pat.worldEntry.support?.id==='cat-butter');
cat.setButter(false,'quiet');await sleep(700);
check('without the butter the hat sits back on his head',Math.abs(hat.support.position[1]+.025)<1e-6&&Math.abs(S.crownHeight-(top-lift-.025))<1e-6,`hat base ${hat.support.position[1]}`);
cat.setButter(true,'slap');await sleep(900);
check('butter slapped on under a worn hat lifts the hat onto it',Math.abs(hat.support.position[1]-lift)<1e-6&&cat.butterSlot.position.y===0);
await __shot('polish-hat-butter-slap');
