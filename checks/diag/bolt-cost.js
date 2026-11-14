// fx lane, playtest 3: what the bolt costs a frame, measured in the live loop (diagnostic, not in run-all).
//   node checks/run.mjs "$BASE/?dpr=1" --lib checks/lib.js --js checks/diag/bolt-cost.js --size 1920x1080 --gpu amd --uncapped --timeout 300
// Uncapped (no vsync), so a frame takes as long as its work. Five strikes; each frame's interval is filed under the
// stroke (the first 0.7 s after the flash, the bolt drawn every frame) or the dark (the 0.4 s after it, page dark, no bolt).
// The difference of their medians is the bolt's cost. Works on the old SVG bolt too (it reads only `flashes`).
cat.auto = false; await until(() => settled(), 20000);
const B = E.bolt, stroke = [], dark = [];
let last = 0, on = true, flashAt = -1, f = B.flashes;
const tick = (t) => {
  if (B.flashes !== f) { f = B.flashes; flashAt = t; }
  if (last && flashAt >= 0) { const s = t - flashAt; (s > 40 && s < 700 ? stroke : s > 800 && s < 1200 ? dark : []).push(t - last); }
  last = t; if (on) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
for (let n = 0; n < Number(stage.opt('strikes') || 5); n++) { await B.strike(); await sleep(400); }
on = false;
const q = (a, k) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * k))]; };
const row = (a) => `${a.length} frames, median ${q(a, .5)?.toFixed(2)} ms, p95 ${q(a, .95)?.toFixed(2)} ms`;
note('bolt cost stroke', row(stroke)); note('bolt cost dark', row(dark));
note('bolt cost difference of medians', `${(q(stroke, .5) - q(dark, .5)).toFixed(2)} ms; draw ${B.stats ? (B.stats.drawMs / B.stats.draws).toFixed(2) + ' ms main thread' : 'n/a'}; load ${'see runner'}`);
