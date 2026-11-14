// Plays the whole gag at two tempos and prints each action's start (beats and seconds), as logged
// live from the running clock, plus the clip plan and load results. Proves that bpm retimes everything:
// the beat numbers stay the same and the seconds scale by 120/180.
// Run: shot 'http://localhost:8742/prototypes/butterman/index.html' --timeout 90 --js "$(cat checks/two-tempos.js)"
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const bm = window.butterman;
  await bm.clipsReady;
  const out = [];
  const tempos = [120, 180];
  const results = {};
  for (const bpm of tempos) {
    bm.config.bpm = bpm;
    bm.play();
    const secs = bm.state.totalSeconds;
    await sleep(secs * 1000 + 900);
    results[bpm] = bm.state.log.filter((e) => e.action || e.event);
    out.push(`bpm ${bpm}: mode ${bm.state.mode}, clock ${bm.state.clock}, ${bm.state.totalBeats} beats = ${secs} s, footfalls ${bm.state.footfalls}, butter on head ${bm.state.butterOnHead}`);
    for (const e of results[bpm]) out.push(`  ${(e.action || e.event).padEnd(16)} beat ${String(e.beat).padStart(6)}  sched ${String(e.s).padStart(7)} s` + (e.seenAt !== undefined ? `  seen ${e.seenAt} s` : ''));
  }
  // same beats at both tempos, seconds in the 120:180 ratio
  const a = results[120].filter((e) => e.action), b = results[180].filter((e) => e.action);
  const sameBeats = a.length === b.length && a.every((e, i) => e.beat === b[i].beat);
  const ratioOk = a.every((e, i) => Math.abs(e.s * 120 / 180 - b[i].s) < 1e-3);
  const lagMax = Math.max(...[...a, ...b].map((e) => e.seenAt - e.s));
  out.push(`same beat grid at both tempos: ${sameBeats}; seconds scale by 120/180: ${ratioOk}; worst frame lag seeing an action start: ${lagMax.toFixed(3)} s`);
  out.push('clips: ' + Object.entries(bm.state.clips).map(([f, c]) => `${f.replace('audio/', '')} ${c.loaded ? 'loaded ' + c.duration + 's' : c.fallback ? 'FALLBACK' : 'pending'}`).join(', '));
  out.push('audio plan @180: ' + bm.state.scheduled.map((r) => `${r.action}@b${r.beat}=${r.s}s(${r.clip})`).join(' '));
  out.push('audioSession: ' + JSON.stringify(bm.state.audioSession) + ' (null = not Safari)');
  bm.showText(out.join('\n'));
})()
