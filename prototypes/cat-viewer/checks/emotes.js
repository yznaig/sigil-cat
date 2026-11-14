(async () => {
  // Emote checks: full emotes interrupt a hold, land on their returnTo pose, queue behind a
  // transition or another emote, overlays never wait, and a pose request survives an emote.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cv = window.catViewer, out = [];
  const state = () => `${cv.phase} ${cv.phase === 'emote' ? cv.currentEmote : cv.pose} queue[${cv.queue.join(',')}]`;
  const expect = (label, ok) => out.push((ok ? 'PASS ' : 'FAIL ') + label + '  -> ' + state());
  const waitFor = async (fn, ms = 6000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (fn()) return true; await sleep(30); } return false; };
  cv.auto = false;
  await sleep(300);

  // 1. Tap while asleep: 'wake' interrupts the hold and lands lying down.
  cv.request('sleep');
  await waitFor(() => cv.phase === 'hold' && cv.pose === 'sleep');
  cv.trigger('tap');
  expect('tap asleep starts emote wake', cv.phase === 'emote' && cv.currentEmote === 'wake');
  await waitFor(() => cv.phase === 'hold');
  expect('wake returns to lie hold', cv.phase === 'hold' && cv.pose === 'lie');

  // 2. Butterman mid-transition: queued, not cut in; plays when the transition lands.
  cv.request('sit');
  await sleep(150);
  const wasMoving = cv.phase === 'moving';
  cv.trigger('butterman');
  expect('butterman during lie_to_sit is queued', wasMoving && cv.phase === 'moving' && cv.queue[0] === 'flinch');
  await waitFor(() => cv.phase === 'emote');
  expect('flinch starts once the transition lands', cv.currentEmote === 'flinch');

  // 3. Another full emote during an emote waits too; an overlay plays at once.
  cv.config.cycle.emotes.spin.cooldown = 0;
  cv.playEmote('spin', 'check');
  expect('spin during flinch is queued', cv.queue[0] === 'spin');
  const before = cv.emoteLog.length;
  cv.playEmote('hop', 'check');
  expect('hop overlay plays at once, not queued', cv.emoteLog.length === before + 1 && /overlay/.test(cv.emoteLog.at(-1)) && cv.queue.length === 1);

  // 4. A pose request during the emotes is kept and walked after the queue drains.
  cv.request('sleep');
  await waitFor(() => cv.phase === 'emote' && cv.currentEmote === 'spin', 6000);
  expect('queued spin plays after flinch', cv.currentEmote === 'spin');
  await waitFor(() => cv.phase === 'hold' && cv.pose === 'sleep', 9000);
  expect('request(sleep) made during emotes still arrives', cv.phase === 'hold' && cv.pose === 'sleep');

  // 5. Queue cap: the newest replaces the last waiting slot.
  cv.request('lie');
  await waitFor(() => cv.phase === 'moving');
  cv.playEmote('flinch', 'cap'); cv.playEmote('wake', 'cap'); cv.playEmote('flinch', 'cap');
  expect('queue capped at ' + cv.config.cycle.queueMax + ', newest last', cv.queue.length === cv.config.cycle.queueMax && cv.queue.at(-1) === 'flinch');

  out.push('', 'emote log:', ...cv.emoteLog.slice(-9).map((l) => '  ' + l));
  const pre = document.createElement('pre');
  pre.id = 'check-out';
  pre.style.cssText = 'position:fixed;right:16px;top:44px;background:#000c;color:#9f9;padding:8px;font:12px monospace;margin:0;z-index:9;white-space:pre-wrap;max-width:640px';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
})()
