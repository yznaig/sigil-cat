// fx lane, playtest 3: the GPU cost of one galaxy frame (held: the portal open, the dark and its halo at full), per pose,
// a timer query around REPS frames submitted back to back (as checks/diag/speed-gpu.js). Diagnostic; run it on two
// builds to compare (the halo's nine taps against the old single coarse tap).
//   node checks/run.mjs "$BASE/?dpr=1" --lib checks/lib.js --js checks/diag/galaxy-cost.js --size 1920x1080 --gpu amd --timeout 600
cat.auto = false;
const R = stage.renderer, gl = R.getContext(), g = E.galaxy, REPS = Number(stage.opt('reps') || 20), px = new Uint8Array(4);
const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
async function gpu(fn) {
  fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
  for (let i = 0; i < REPS; i++) fn();
  gl.endQuery(ext.TIME_ELAPSED_EXT); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  await until(() => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE), 5000, 5);
  const ms = gl.getParameter(ext.GPU_DISJOINT_EXT) ? NaN : gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6 / REPS; gl.deleteQuery(q); return ms;
}
const frame = () => { R.setRenderTarget(null); R.render(stage.scene, stage.camera); };
for (const pose of (stage.opt('poses') || 'sit,lie').split(',')) {
  cat.request(pose); await until(() => cat.pose === pose && cat.phase === 'hold' && !cat.popping, 15000);
  g.pin(1); g.pinDim(1); await sleep(900); stage.timeScale = 0; await sleep(200);
  const runs = []; for (let k = 0; k < 5; k++) runs.push(await gpu(frame));
  runs.sort((a, b) => a - b);
  note(`galaxy frame ${pose}`, `GPU median ${runs[2].toFixed(2)} ms (runs ${runs.map((v) => v.toFixed(2)).join(' ')})`);
  stage.timeScale = 1; g.pin(1, -1); g.pinDim(0); await sleep(300); g.pin(null); g.pinDim(null); await until(() => !g.isOpen, 10000); await sleep(300);
}
