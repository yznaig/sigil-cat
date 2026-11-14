(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const g = window.catGlb, out = [];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const fmt = (v) => '[' + v.map((x) => x.toFixed(3)).join(', ') + ']';
  const print = () => {
    const pre = document.createElement('pre');
    pre.style.cssText = 'position:fixed;right:16px;top:44px;background:#000c;color:#9f9;padding:8px;font:11px/1.35 monospace;margin:0;z-index:9;white-space:pre-wrap;max-width:min(640px,calc(100vw - 32px))';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
    console.info('[check]\n' + out.join('\n'));
  };

  // 1. Load
  const t0 = performance.now();
  while (!g.loaded && !g.error && performance.now() - t0 < 25000) await sleep(100);
  out.push('loaded: ' + g.loaded + (g.error ? '  ERROR ' + g.error : '') + ' after ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s');
  if (!g.loaded) return print();
  g.auto = false;
  out.push('model: ' + g.model + '   head bone: ' + g.headBone);
  out.push('clips: ' + Object.entries(g.clips).map(([n, s]) => (n === s ? n : n + '=' + s)).join(' '));
  if (!g.butter) g.setButter(true);
  await sleep(2500);                                   // let the butter drop-in land

  // 2. Butter before the move
  const a = { world: g.butterWorld(), cat: g.inCat(), head: g.headPose() };

  // 3. Crossfade: request the other pose and sample the weights every frame
  const from = g.pose, to = from === 'lie' ? 'sit' : 'lie';
  out.push(`before: ${g.phase} ${from}  weights ${JSON.stringify(g.weights())}`);
  g.request(to);
  const samples = [];
  let mid = null, best = 0;
  const ts = performance.now();
  while (performance.now() - ts < 1500) {
    await frame();
    const w = g.weights(), ms = Math.round(performance.now() - ts);
    samples.push(`  ${String(ms).padStart(4)} ms ${JSON.stringify(w)}`);
    const partial = Object.values(w).filter((v) => v > 0 && v < 1);
    const low = Math.min(...partial);                  // keep the sample closest to 50/50
    if (Object.keys(w).length >= 2 && partial.length >= 2 && low > best) { best = low; mid = `${ms} ms ${JSON.stringify(w)}`; }
  }
  out.push(`request(${to}): weights per frame (first 8 of ${samples.length})`);
  out.push(...samples.slice(0, 8));
  out.push(`after:  ${g.phase} ${g.pose}  weights ${JSON.stringify(g.weights())}`);
  out.push('two clips both weighted mid-fade: ' + (mid ? 'PASS  ' + mid : 'FAIL'));

  // 4. Butter after the move (the new clip moves the head)
  await sleep(1200);
  const b = { world: g.butterWorld(), cat: g.inCat(), head: g.headPose() };
  // A bone turns about its joint, so the head shows up as a rotation, not a move.
  const dot = Math.abs(a.head.quat.reduce((s, v, i) => s + v * b.head.quat[i], 0));
  const headTurn = 2 * Math.acos(Math.min(1, dot)) * 180 / Math.PI;
  const butterMoved = dist(a.cat.butter, b.cat.butter), inHeadDrift = dist(a.head.butterInHead, b.head.butterInHead);
  out.push(`butter world  A ${fmt(a.world)}  B ${fmt(b.world)}`);
  out.push(`head bone turned ${headTurn.toFixed(1)} deg (cat frame); butter moved ${butterMoved.toFixed(3)} (cat frame, no bob/spin)`);
  out.push(`butter in head-bone frame  A ${fmt(a.head.butterInHead)}  B ${fmt(b.head.butterInHead)}  drift ${inHeadDrift.toFixed(5)}`);
  // The head frame moved (the butter moved in the cat's frame) while the butter stayed fixed in the
  // head frame. A model may move the head mostly by moving the body (the Blender cat's sit_to_lie),
  // so a turn of the head bone itself is reported but not required.
  const follows = butterMoved > 0.02 && inHeadDrift < 0.001;
  out.push('butter follows the head bone: ' + (follows ? 'PASS' : 'FAIL'));
  print();
})()
