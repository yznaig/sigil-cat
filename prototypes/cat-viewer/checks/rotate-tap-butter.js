(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cv = window.catViewer, c = document.getElementById('c');
  const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: true }));
  const out = [];
  cv.auto = false;
  await sleep(500);
  const q0 = cv.quaternion.join(',');
  // drag diagonally (should tumble on two axes)
  fire('pointerdown', 640, 450);
  for (let i = 1; i <= 10; i++) { await sleep(16); fire('pointermove', 640 + i * 20, 450 - i * 14); }
  fire('pointerup', 840, 310);
  await sleep(300);
  const q1 = cv.quaternion.join(',');
  out.push('drag rotates: ' + (q0 !== q1) + '  [' + q0 + '] -> [' + q1 + ']');
  await sleep(1200);
  const q2 = cv.quaternion.join(',');
  out.push('inertia then settles: ' + (q1 !== q2));
  // tap on the cat (centre of screen) and on empty space
  const t0 = cv.taps;
  fire('pointerdown', 640, 470); await sleep(60); fire('pointerup', 640, 470);
  fire('pointerdown', 80, 300); await sleep(60); fire('pointerup', 80, 300);
  await sleep(100);
  out.push('tap on cat counted: ' + (cv.taps === t0 + 1) + ' (taps ' + cv.taps + ', sounds loaded ' + cv.sounds + ')');
  // states
  cv.request('lie'); await sleep(1600); out.push('pose after request(lie): ' + cv.phase + ' ' + cv.pose);
  cv.emote('add_hop'); await sleep(300); out.push('hop emote over the lie hold: ' + cv.phase + ' ' + cv.pose);
  await sleep(900); out.push('after hop (expect hold lie): ' + cv.phase + ' ' + cv.pose);
  cv.setButter(true); await sleep(900);
  out.push('butter on: ' + cv.butter);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;right:16px;top:44px;background:#000c;color:#9f9;padding:8px;font:12px monospace;margin:0;z-index:9';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
})()
