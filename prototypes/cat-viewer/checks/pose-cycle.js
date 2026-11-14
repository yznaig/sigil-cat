(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cv = window.catViewer, c = document.getElementById('c'), out = [];
  const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 3, clientX: x, clientY: y, bubbles: true, pointerType: 'mouse', isPrimary: true }));
  const log = (label) => out.push(label + ': ' + cv.phase + ' ' + cv.pose);
  cv.auto = false;
  cv.request('sleep'); log('request sleep from sit (expect moving)');
  await sleep(4000); log('after 4s (expect hold sleep)');
  cv.request('sit'); await sleep(200); log('request sit from sleep (expect moving sleep->lie)');
  await sleep(1300); log('after 1.5s (expect moving lie->sit)');
  await sleep(1500); log('after 3s (expect hold sit)');
  // tap on him while asleep wakes him
  cv.request('lie'); await sleep(1600); cv.request('sleep'); await sleep(1800); log('back asleep');
  fire('pointerdown', 640, 470); await sleep(50); fire('pointerup', 640, 470);
  await sleep(150); log('tap while asleep (expect emote: wake, lands in lie)');
  await sleep(1500);
  // auto cycle: shrink holds so it moves at the next loop seam
  for (const p of Object.values(cv.config.cycle.poses)) if (p.hold) p.hold = [0.1, 0.2];
  cv.auto = true; cv.request('sit'); await sleep(2000); const t0 = performance.now();
  let moved = false; while (performance.now() - t0 < 9000) { if (cv.phase !== 'hold') { moved = true; break; } await sleep(50); }
  out.push('auto cycle left the sit hold by itself: ' + moved + ' -> ' + cv.phase + ' ' + cv.pose);
  cv.auto = false;
  await sleep(3500);
  cv.request('stretch'); await sleep(1700); log('mid stretch (expect oneshot stretch)');
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;right:16px;top:44px;background:#000c;color:#9f9;padding:8px;font:12px monospace;margin:0;z-index:9;white-space:pre-wrap;max-width:620px';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
})()
