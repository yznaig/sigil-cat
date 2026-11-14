// fx lane, playtest 3 (Aaron asked whether pmndrs postprocessing could improve the galaxy without lag). Diagnostic, not
// in run-all, and nothing of it ships unless it earns its place: the vanilla library (pmndrs/postprocessing 6.39.5,
// peer three >= 0.168 < 0.187; the page has three 0.186.1), its mipmap bloom at half resolution, only while the galaxy
// shows. Takes before/after shots of the galaxy held, per pose, and measures the GPU cost of a galaxy frame with and
// without the bloom (a timer query around REPS frames submitted back to back, as checks/diag/speed-gpu.js does).
//   node checks/run.mjs "$BASE/?dpr=1" --lib checks/lib.js --js checks/diag/galaxy-bloom.js --size 1920x1080 --gpu amd --timeout 600
// ?bloomscale=0.5 (resolution scale), ?bloomreps=20, ?bloomposes=sit,lie
cat.auto = false;
const T = site.THREE, R = stage.renderer, gl = R.getContext(), g = E.galaxy;
const PP = await import('https://cdn.jsdelivr.net/npm/postprocessing@6.39.5/build/index.js');
const scale = Number(stage.opt('bloomscale') || 0.5), REPS = Number(stage.opt('bloomreps') || 20);
note('bloom setup', `postprocessing ${PP.VERSION ?? '6.39.5'}, three r${T.REVISION}, resolution scale ${scale}, ${R.getContext().getParameter((gl.getExtension('WEBGL_debug_renderer_info') || {}).UNMASKED_RENDERER_WEBGL || gl.RENDERER)}`);
// The page renders straight to the canvas with Neutral tone mapping; into a render target three skips tone mapping,
// so the composer ends with the same Neutral curve (ToneMappingEffect) after the bloom, on a half-float buffer.
const composer = new PP.EffectComposer(R, { frameBufferType: T.HalfFloatType });
composer.addPass(new PP.RenderPass(stage.scene, stage.camera));
const bloom = new PP.BloomEffect({ mipmapBlur: true, luminanceThreshold: Number(stage.opt('bloomthreshold') || 0.55), luminanceSmoothing: 0.25, intensity: Number(stage.opt('bloomintensity') || 1.1), radius: 0.72, resolutionScale: scale });
composer.addPass(new PP.EffectPass(stage.camera, bloom, new PP.ToneMappingEffect({ mode: PP.ToneMappingMode.NEUTRAL })));
const size = new T.Vector2(); R.getSize(size); composer.setSize(size.x, size.y);
// While on: the stage's own present (renderer.render(scene, camera) to the screen) goes through the composer.
let on = false, inside = false, composed = 0;
const render = R.render.bind(R);
R.render = (scene, camera) => {
  if (on && !inside && scene === stage.scene && R.getRenderTarget() === null) { inside = true; composed++; try { composer.render(); } finally { inside = false; } return; }
  return render(scene, camera);
};
const until2 = (f, ms = 15000) => until(f, ms, 30);
const px = new Uint8Array(4);
async function gpu(fn) {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const q = ext && gl.createQuery(); if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
  const t0 = performance.now(); for (let i = 0; i < REPS; i++) fn();
  if (q) gl.endQuery(ext.TIME_ELAPSED_EXT); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const wall = (performance.now() - t0) / REPS; let ms = NaN;
  if (q) { await until(() => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE), 5000, 5); if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6 / REPS; gl.deleteQuery(q); }
  return { gpu: ms, wall };
}
const frame = () => { R.setRenderTarget(null); R.render(stage.scene, stage.camera); };
const rows = [];
for (const pose of (stage.opt('bloomposes') || 'sit,lie').split(',')) {
  cat.request(pose); await until2(() => cat.pose === pose && cat.phase === 'hold' && !cat.popping);
  g.pin(1); g.pinDim(1); await sleep(900); stage.timeScale = 0; await sleep(200);
  const grab = async () => { let out = null; const f = () => { const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, a = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a); out = a; };
    stage.onPresented.push(f); await until(() => out, 3000, 10); stage.onPresented.splice(stage.onPresented.indexOf(f), 1); return out; };
  on = false; await sleep(120); await __shot(`bloom-${pose}-off`); const A = await grab();
  on = true; const c0 = composed; await sleep(120); await __shot(`bloom-${pose}-on`); const B = await grab();
  let diff = 0, brighter = 0; for (let i = 0; i < A.length; i += 4) { const d = (B[i] + B[i + 1] + B[i + 2]) - (A[i] + A[i + 1] + A[i + 2]); diff += Math.abs(d); if (d > 15) brighter++; }
  note(`bloom look ${pose}`, `composer frames ${composed - c0}; mean |change| ${(diff / (A.length / 4) / 3).toFixed(2)}/255; ${brighter} px brighter by > 5/255 a channel`);
  // cost, three rounds alternating
  const res = { off: [], on: [] };
  for (let k = 0; k < 3; k++) for (const mode of ['off', 'on']) { on = mode === 'on'; res[mode].push(await gpu(frame)); }
  on = false;
  const med = (a, key) => { const v = a.map((r) => r[key]).sort((x, y) => x - y); return v[v.length >> 1]; };
  const row = { pose, offGpu: med(res.off, 'gpu'), onGpu: med(res.on, 'gpu'), offWall: med(res.off, 'wall'), onWall: med(res.on, 'wall') };
  rows.push(row);
  note(`bloom cost ${pose}`, `galaxy frame GPU ${row.offGpu.toFixed(2)} ms -> with bloom ${row.onGpu.toFixed(2)} ms (+${(row.onGpu - row.offGpu).toFixed(2)}); wall ${row.offWall.toFixed(2)} -> ${row.onWall.toFixed(2)} ms`);
  stage.timeScale = 1; g.pin(null); g.pinDim(null); await until2(() => !g.isOpen); await sleep(300);
}
// Live frames with the bloom on through a whole galaxy (uncapped runs only: --uncapped): p95 of the frame interval.
if (stage.opt('bloomlive') === '1') {
  for (const mode of ['off', 'on']) {
    on = mode === 'on'; const gaps = []; let last = 0, live = true;
    const tick = (t) => { if (last) gaps.push(t - last); last = t; if (live) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    g.open('check'); await until2(() => g.phase === 'hold', 20000); await sleep(1500); g.skip(); await until2(() => !g.isOpen, 10000); live = false;
    gaps.sort((a, b) => a - b);
    note(`bloom live ${mode}`, `${gaps.length} frames, median ${gaps[gaps.length >> 1].toFixed(2)} ms, p95 ${gaps[Math.floor(gaps.length * .95)].toFixed(2)} ms`);
    await sleep(500);
  }
}
on = false; R.render = render; composer.dispose();
