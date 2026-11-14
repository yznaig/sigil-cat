// Butterman lane (playtest-3): what survives a reload after checks/butterman-p3.js. Run with checks/lib.js.
const bm = E.butterman, W = site.world;
await W.ensure?.(); await until(() => W.ready, 20000); await sleep(1500);
check('p3 reload: all three still watched, the B still plays scene 1', bm.state.roundSeen && bm.state.next === 'butter', `seen ${JSON.stringify(bm.state.seen)}, next ${bm.state.next}`);
W.cat?.update?.(true); const cb = W.cat?.body, bad = [];
for (const [id, inst] of keepsakes.live) { const e = inst.worldEntry; if (!e || !cb || e.support) continue; const t = e.body.translation();   // (supported: the butter sits on him)
  for (let j = 0; j < cb.numColliders(); j++) if (cb.collider(j).containsPoint(t)) bad.push(id); }
check('p3 reload: no keepsake is inside the cat', !!cb && !bad.length, bad.join(', ') || `${keepsakes.live.size} keepsakes`);
