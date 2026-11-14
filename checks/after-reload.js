// after-reload.js: run on the reloaded page, straight after play.js. What a visitor did is still there.
const keep = JSON.parse(sessionStorage.getItem('check.keep') || 'null');
if (!keep) check('after the reload', false, 'play.js left no notes');
else {
  await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));await sleep(1200);
  const now = Object.fromEntries([...keepsakes.live.values()].map((k) => [k.id, [+k.x.toFixed(3), +k.y.toFixed(3)]]));
  const ids = Object.keys(keep.keepsakes), missing = ids.filter((id) => !now[id]);
  // the eyes ride on whatever they are stuck to, so only where they are stuck is compared
  // the cloud drifts across the page (physics lane, playtest-2): it keeps only its height
  const moved = ids.filter((id) => now[id] && id !== 'eyes' && !keep.attachments?.[id] && ((id !== 'cloud' && Math.abs(now[id][0] - keep.keepsakes[id][0]) > 0.02) || Math.abs(now[id][1] - keep.keepsakes[id][1]) > 0.02));
  check('keepsakes survive a reload', missing.length === 0 && ids.length >= 14, `${ids.length - missing.length} of ${ids.length} still there${missing.length ? ', missing: ' + missing.join(', ') : ''}`);
  check('and are where they were left', moved.length === 0, moved.length ? 'moved: ' + moved.map((id) => `${id} ${keep.keepsakes[id]} -> ${now[id]}`).join('; ') : 'every one within 0.02 cat-heights');
  check('physical cat attachments retain exact local seat',Object.entries(keep.attachments||{}).every(([id,s])=>JSON.stringify(keepsakes.get(id)?.worldEntry?.support)===JSON.stringify(s)));
  await until(() => E.hat.wearing === keep.hat, 3000);
  check('what he was wearing survives too', E.hat.wearing === keep.hat && cat.butterOn === keep.butter && E.eyes.on === keep.eyesOn, `hat ${E.hat.wearing}, butter ${cat.butterOn}, eyes on ${E.eyes.on}`);
  // the row shows the sigils (and the controller's replay button), not every find (playtest-2, text lane)
  const inRow = registry.FINDS.filter((f) => registry.has(f.id) && (f.kind === 'sigil' || f.id === 'bird')).length;
  check('finds and bonks survive', registry.count() === keep.found && ui.count === keep.bonks && document.querySelectorAll('#marks button').length === inRow && !document.getElementById('grimoire').hidden,
    `${registry.count()} found, ${ui.count} bonks, ${document.querySelectorAll('#marks button').length} marks in the row`);
  const btn = document.getElementById('sound');
  audio.play('thunder', { gain: 0.8 }); await sleep(400); const lvl = audio.level();
  check('the sound control survives a reload (left muted, volume kept)', audio.state().muted && Math.abs(audio.state().volume - keep.volume) < 0.01 && /off/i.test(btn.textContent) && lvl < 1e-6, `muted ${audio.state().muted}, volume ${audio.state().volume}, button "${btn.textContent}", heard ${lvl.toExponential(1)}`);
  await __shot('30-after-reload');
  btn.click();
}
