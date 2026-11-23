// The Journey left alone (docs/journey/design.md §7, unit 5): a fresh save, the voice on at its real timings
// (?voice=1, no ?nudge=fast), the hook heard, then ten minutes with no input at all. He must stay within his caps:
// at most 3 stuck nudges, at most 4 idle lines, never one line twice, never two lines on top of each other (20 s
// apart at least, the hook excepted); no page errors; the frame cost at the end is no worse than at the start, and the
// page does not grow (DOM nodes, his saved lines).
const J = site.journey;
const SOAK = Number(new URLSearchParams(location.search).get('soak') || 600) * 1000;
check('soak: the voice is up at its real timings', await until(() => J.voice?.on === true, 15000) && J.voice.timing.first === 180e3);
const V = J.voice, errors = [];
addEventListener('error', (e) => errors.push(String(e.message)));
addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
await until(() => site.shell.revealed, 15000);
// frame cost: the median and p95 of rAF intervals over 10 s
const frames = (ms) => new Promise((res) => { const d = []; let last = performance.now(); const t0 = last; const f = (t) => { d.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res({ med: d[d.length >> 1], p95: d[Math.floor(d.length * 0.95)], n: d.length }); } }; requestAnimationFrame(f); });
await sleep(12000);   // past the hook
const startFrames = await frames(10000), startNodes = document.getElementsByTagName('*').length;
const t0 = performance.now();
let lastShot = 0;
while (performance.now() - t0 < SOAK) {
  await sleep(5000);
  const n = V.log.filter((l) => l.trigger === 'stuck').length;
  if (n > lastShot && ui.speaking) { lastShot = n; await __shot('soak-nudge-' + n); }
}
const endFrames = await frames(10000), endNodes = document.getElementsByTagName('*').length;
const log = V.log, after = log.filter((l) => !/^hook/.test(l.id));
note('soak: what he said', log.map((l) => `${(l.play / 1000).toFixed(0)}s ${l.trigger || '-'} ${l.id}`).join(' | '));
const nudges = log.filter((l) => /^stuck/.test(l.trigger)).length, idles = log.filter((l) => l.trigger === 'idle').length;
check('soak: at most 3 nudges in ten minutes', nudges <= 3 && nudges >= 1, `${nudges} nudges`);
check('soak: at most 4 idle lines in a visit', idles <= 4, `${idles} idle lines`);
check('soak: never the same line twice', new Set(log.map((l) => l.id)).size === log.length && new Set(log.map((l) => l.text)).size === log.length, log.map((l) => l.id).join());
const gaps = after.slice(1).map((l, i) => l.at - after[i].at);
check('soak: never two lines on top of each other (20 s apart at least, after the hook)', gaps.every((g) => g >= 19500), gaps.map((g) => (g / 1000).toFixed(0)).join(','));
check('soak: the first nudge only after three minutes of standing still', (log.find((l) => l.trigger === 'stuck')?.play ?? 1e9) >= 180e3, String(log.find((l) => l.trigger === 'stuck')?.play));
check('soak: no page errors', !errors.length, errors.join(' | '));
check('soak: the frame cost at the end is no worse than at the start', endFrames.med <= startFrames.med * 1.25 + 1 && endFrames.p95 <= startFrames.p95 * 1.5 + 4, `start ${startFrames.med.toFixed(1)}/${startFrames.p95.toFixed(1)} ms (median/p95, ${startFrames.n}), end ${endFrames.med.toFixed(1)}/${endFrames.p95.toFixed(1)} ms (${endFrames.n})`);
check('soak: the page does not grow', endNodes <= startNodes + 40 && (store.get('journey.said', []) || []).length <= 40 && (store.get('journey.journal', []) || []).length <= 80, `${startNodes} -> ${endNodes} nodes`);
