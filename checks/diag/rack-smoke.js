cat.auto=false;
await site.rack.ready();
check('rack built',!!site.rack.entry,JSON.stringify([...site.world.entries.keys()]));
await sleep(2200);
await __shot('world-unit7-pegs');
for(const name of E.hat.hats){await E.hat.wear(name);await sleep(250);await __shot('world-unit7-worn-'+name);}
await E.hat.wear(null);await site.lamp.award();await site.lamp.use();await sleep(2200);await __shot('world-unit7-warm');
note('rack state',JSON.stringify({bounds:site.rack.picture.rect,hats:[...site.rack.hats].map(([n,i])=>({name:n,support:i.worldEntry?.support,box:i.box,error:i.worldError})),bulb:site.lamp.inst?.worldError,steps:site.world.stats,callbacks:stage.onFrame.length}));
