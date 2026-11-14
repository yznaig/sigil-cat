// Butterman lane (playtest-2): after checks/butterman-p2.js, the page reloaded. The encore stays spent, the ticket is
// still there, and the cameo gap starts again from the load.
cat.auto = false;
const bm = E.butterman, K = bm.config.cameo;
await until(() => keepsakes.get('ticket')?.worldReady, 15000);
check('p2 reload: the encore stays seen', bm.encoreSeen && bm.state.encoreDone && store.get(bm.config.encore.seenKey) === true);
check('p2 reload: the ticket is still in the room', keepsakes.has('ticket') && keepsakes.get('ticket').worldEntry?.body.isEnabled());
for (const i of E.harp.config.tune) E.harp.pluck(i);
await sleep(1500);
check('p2 reload: the tune does not bring the encore back', bm.state.mode === 'idle' && bm.encore() === false, bm.state.mode);
const keep = K.chancePerSecond, summoned = store.get(K.storageKey); store.del(K.storageKey); K.chancePerSecond = 1e6;   // (summoning stops them for good)
await sleep(1200); K.chancePerSecond = keep; if (summoned) store.set(K.storageKey, summoned);
check('p2 reload: no cameo inside the gap after a reload', bm.state.cameos.count === 0 && !bm.state.cameos.active, `${bm.state.cameos.count}`);
