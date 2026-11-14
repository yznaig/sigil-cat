// Page-size review at full device DPR; no cost or speed measurement.
cat.auto=false;await site.rack.ready({grant:E.hat.hats});await cat.ensureButter();
check('rack review uses full fixed DPR',Number(stage.opt('dpr'))===stage.dpr&&stage.dpr===Math.min(devicePixelRatio,2));
async function pose(name){cat.request(name);check('rack review pose '+name,await until(()=>cat.pose===name&&!cat.popping,10000));await sleep(250);}
await pose('sit');await E.hat.wear(null);cat.setButter(false,'quiet');await sleep(250);await __shot('world-unit7-pegs');
cat.setButter(true,'quiet');
for(const name of E.hat.hats){await E.hat.wear(name);await sleep(250);await __shot('world-unit7-worn-'+name);}
await E.hat.wear('wizard');await pose('lie');await __shot('world-unit7-wizard-lie');
await E.hat.wear('party');await pose('stretch');await __shot('world-unit7-party-stretch');
await pose('sit');await E.hat.wear(null);
await site.lamp.award();await site.lamp.inst.worldTask;await site.lamp.use();await sleep(2300);
check('rack review warm lamp',site.lamp.occupied&&site.lamp.on&&site.lamp.light.visible);await __shot('world-unit7-warm');
