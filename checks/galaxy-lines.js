// galaxy-lines.js (galaxy lane, music round 2026-11-16; Aaron: "all these little visual imperfections in the galaxy ...
// I was just talking about all the lines primarily"). His screenshot (Windows Chrome) had thin straight lines in the sky
// inside the cat and stair-stepped ones in the swirling dark: star-grid cell edges drawn by screen-space derivatives
// that went wrong next to an early return, plus lone white rules where a bright star's spike came in through his
// outline from a star outside him.
// 1. The galaxy pass uses no screen-space derivatives at all (fwidth / dFdx / dFdy): the cause of the cell-edge lines on
//    a GPU whose compiler moves them past an early return. That GPU is not here, so this is checked in the source.
// 2. Held open, in three poses and at three drifts of the sky: no straight thin bright line inside him without a star on
//    it (a horizontal or vertical run of 24+ px, each pixel 10+ levels brighter than the pixels 2 px either side of the
//    line, with no star core, 200+, on the run or as far past its ends as a spike reaches, half a bright star's grid cell). A real star's spikes pass: they carry
//    their core. His outline, 6 px of it, is left out (the rim is a line by design).
cat.auto = false;
await until(() => stage.warmLeft === 0, 30000);
const g = E.galaxy, U = g.uniforms, gl = stage.renderer.getContext();
const overlay = stage.scene.getObjectByName('galaxy');
const src = overlay.material.fragmentShader.replace(/\/\/.*$/gm, '');   // code only, not the comments
const derivs = (src.match(/\b(fwidth|dFdx|dFdy)\s*\(/g) || []);
check('the galaxy pass uses no screen-space derivatives (no cell-edge lines on any GPU)', derivs.length === 0, derivs.join(', ') || 'none');

async function grab() {
  let out = null; const f = () => { const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); out = { w, h, px }; };
  stage.onPresented.push(f); await until(() => out, 3000, 10); stage.onPresented.splice(stage.onPresented.indexOf(f), 1); return out;
}
let drift = 0.144, exp = 1;
const fix = () => { U.uHoleClock.value = 12; U.uHoleDrift.value = drift; U.uDimT.value = 14; U.uHoleWarp.value = 0; U.uHoleExp.value = exp; };
stage.onFrame.push(fix);
const lum = (A, i) => A.px[i] * 0.2126 + A.px[i + 1] * 0.7152 + A.px[i + 2] * 0.0722;
const results = [];
for (const pose of ['sleep', 'lie', 'sit']) {
  cat.request(pose); await until(() => cat.pose === pose && cat.phase === 'hold' && !cat.popping, 15000); await sleep(400);
  g.pin(1); g.pinDim(0); exp = 0; await sleep(1200); stage.timeScale = 0; await sleep(200);
  // his silhouette: with the universe's light off and no dark, the portal is pure black over the lit room
  const S = await grab(), W = S.w, H = S.h, sil = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) sil[i] = lum(S, i * 4) < 3 && S.px[i * 4 + 3] > 250 ? 1 : 0;   // drawn (opaque) and black
  const E6 = 6, inside = (x, y) => x >= E6 && y >= E6 && x < W - E6 && y < H - E6 && sil[y * W + x] && sil[y * W + x - E6] && sil[y * W + x + E6] && sil[(y - E6) * W + x] && sil[(y + E6) * W + x];
  let worst = null, count = 0, area = 0;
  for (const d of [0.144, 0.6, 0.9]) {
    drift = d; exp = 1; g.pinDim(1); stage.timeScale = 1; await sleep(250); stage.timeScale = 0; await sleep(200);
    const A = await grab(), L = new Float32Array(W * H), reach = Math.round(U.uHoleCat.value.z / 8) + 6;   // half a bright star's cell: as far as a spike reaches
    for (let i = 0; i < W * H; i++) L[i] = lum(A, i * 4);
    for (const horiz of [true, false]) {
      const n1 = horiz ? H : W, n2 = horiz ? W : H, at = (a, b) => horiz ? b + a * W : a + b * W;
      for (let a = 4; a < n1 - 4; a++) {
        let run = 0;
        for (let b = 0; b <= n2; b++) {
          const x = horiz ? b : a, y = horiz ? a : b;
          let on = false;
          if (b < n2 && inside(x, y)) {
            if (d === 0.144 && horiz) area++;
            const v = L[at(a, b)], side = Math.max(L[at(a - 2, b)], L[at(a + 2, b)]);
            on = v - side >= 10;
          }
          if (on) { run++; continue; }
          if (run >= 24) {
            let top = 0; for (let k = Math.max(0, b - run - reach); k < Math.min(n2, b + reach); k++) top = Math.max(top, L[at(a, k)]);
            if (top < 200) { count++; if (!worst || run > worst.run) worst = { run, x: horiz ? b - run : a, y: horiz ? H - 1 - a : H - 1 - (b - run), dir: horiz ? 'across' : 'down', drift: d, top: Math.round(top) }; }
          }
          run = 0;
        }
      }
    }
    if (d === 0.6) await __shot('galaxy-lines-' + pose);
  }
  results.push({ pose, count, worst, area });
  stage.timeScale = 1; exp = 1; g.pin(null); g.pinDim(null); await until(() => !g.isOpen, 10000); await sleep(300);
}
stage.onFrame.splice(stage.onFrame.indexOf(fix), 1); U.uHoleExp.value = g.config.exposure;
check('the inside of his silhouette was found in every pose', results.every((r) => r.area > 20000), results.map((r) => `${r.pose} ${r.area} px`).join(', '));
check('no straight thin bright line without a star inside him (three poses, three drifts)', results.every((r) => r.count === 0),
  results.map((r) => `${r.pose}: ${r.count}${r.worst ? ` (longest ${r.worst.run} px ${r.worst.dir} at ${r.worst.x},${r.worst.y} page-down, drift ${r.worst.drift}, brightest ${r.worst.top})` : ''}`).join('; '));
