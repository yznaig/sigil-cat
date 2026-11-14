// Seeded with the old party reward: hat + butter, without a rack/world save.
// Do not call rack.ready(): this must happen through the production restore path.
cat.auto=false;
// Playtest 2: the cake's reward is the party hat and the rack, nothing else; an old party save restores just that.
check('rack legacy party reward restores without explicit discovery',await until(()=>site.rack.hats.size===1&&site.rack.hats.has('party')&&[...site.rack.hats.values()].every(i=>i.worldReady),15000));
const R=site.rack,S=site.supports,W=site.world;
check('rack legacy party reward has one worn identity and an empty peg',E.hat.wearing==='party'&&R.hats.get('party').worldEntry.support?.id==='cat-hat'&&!R.slots.find(s=>s.id==='party').occupant&&[...W.entries.keys()].filter(id=>id.startsWith('rack/')).length===1);
// e1111-58: the butter goes under the hat; the party hat rests on the pat (.0735 up), the crown height is the hat's top.
check('rack legacy butter stays on his head under the physical party hat',cat.butterOn&&cat.butterSlot.position.y===0&&Math.abs(R.hats.get('party').worldEntry.support.position[1]-(.0735-.025))<1e-6&&Math.abs(S.crownHeight-(.4315*R.scale-.025+.0735))<.002,`crown ${S.crownHeight}`);
check('rack legacy reward migration saves the attachment',store.get('worldBodies.rack/party')?.support?.id==='cat-hat');
check('rack legacy reward settles without a world callback',await until(()=>!W.stats.listening&&!S.listening,8000));
await __shot('world-unit7-legacy-party');
