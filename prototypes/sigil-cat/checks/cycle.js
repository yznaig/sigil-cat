// cycle.js: drives the full pose cycle, taps, emotes and butter through window.sigilCat and prints what happened.
// Run: shot 'http://localhost:8000/prototypes/sigil-cat/index.html#ui=0' --js "$(cat checks/cycle.js)" --timeout 120
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (!window.sigilCat || !window.sigilCat.loaded) await sleep(100);
  const cv = window.sigilCat, c = document.getElementById('c'), out = [];
  const log = (label) => out.push(`${label}: ${cv.phase} ${cv.pose}`);
  const waitFor = async (pose, ms = 9000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (cv.phase === 'hold' && cv.pose === pose) return true; await sleep(50); } return false; };
  const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 3, clientX: x, clientY: y, bubbles: true, pointerType: 'mouse', isPrimary: true }));
  cv.auto = false;
  out.push(`clips: ${cv.clips.join(' ')}`);
  out.push(`triangles: ${cv.triangles}`);
  // the cycle the brief asks for: sit -> loaf -> sleep -> (wake) -> stretch -> sit
  log('start');
  cv.request('lie'); log('request loaf'); out.push('  reached loaf: ' + await waitFor('lie'));
  cv.request('sleep'); out.push('  reached sleep: ' + await waitFor('sleep'));
  cv.request('stretch'); await sleep(200); log('request stretch from sleep (routes sleep->lie->stretch)');
  let sawStretch = false; const t0 = performance.now();
  while (performance.now() - t0 < 12000) { if (cv.phase === 'oneshot' && cv.pose === 'stretch') sawStretch = true; if (sawStretch && cv.phase === 'hold') break; await sleep(50); }
  out.push(`  played the stretch one-shot: ${sawStretch}; ended in: ${cv.phase} ${cv.pose}`);
  // tail idle while sitting
  await sleep(1500);
  out.push(`  tail idle weight while sitting: ${cv.idle.weight.toFixed(2)}`);
  let flicked = false; const t1 = performance.now();
  while (performance.now() - t1 < 7000) { if (cv.idle.flicking) { flicked = true; break; } await sleep(30); }
  out.push(`  tail flicked within 7 s: ${flicked}`);
  // tap on him: hop or spin; tap asleep: wake into the loaf
  fire('pointerdown', innerWidth / 2, innerHeight * 0.5); await sleep(40); fire('pointerup', innerWidth / 2, innerHeight * 0.5);
  await sleep(300); out.push('  tap while sitting: ' + (cv.emoteLog.at(-1) || 'nothing'));
  cv.request('sleep'); await waitFor('sleep', 12000);
  fire('pointerdown', innerWidth / 2, innerHeight * 0.55); await sleep(40); fire('pointerup', innerWidth / 2, innerHeight * 0.55);
  await sleep(200); out.push('  tap while asleep: ' + (cv.emoteLog.at(-1) || 'nothing') + ' -> ' + cv.phase);
  out.push('  woke into loaf: ' + await waitFor('lie', 4000));
  cv.setButter(true); await sleep(300); out.push('  butter on, emote: ' + (cv.emoteLog.at(-1) || 'nothing'));
  // auto cycle moves on its own
  for (const p of Object.values(cv.config.cycle.poses)) if (p.hold) p.hold = [0.1, 0.2];
  cv.auto = true; let moved = false; const t2 = performance.now();
  while (performance.now() - t2 < 9000) { if (cv.phase !== 'hold') { moved = true; break; } await sleep(50); }
  out.push(`auto cycle moved on by itself: ${moved}`);
  cv.auto = false;
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;left:16px;top:16px;background:#000c;color:#9f9;padding:8px;font:12px monospace;margin:0;z-index:9;white-space:pre-wrap;max-width:760px';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
})()
