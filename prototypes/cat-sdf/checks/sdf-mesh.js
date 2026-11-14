(async () => {
  // Mesh-mode checks: the generated skinned cat is in budget, skinned sanely, built fast, and the
  // existing clips really deform it. Run on index.html#mode=mesh&debug (no #t freeze).
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cv = window.catViewer, out = [];
  const expect = (label, ok, detail = '') => out.push((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  -> ' + detail : ''));
  const waitFor = async (fn, ms = 8000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (fn()) return true; await sleep(30); } return false; };
  const s = cv.sdf;
  expect('mode is mesh', cv.mode === 'mesh' && !!s, cv.mode);
  expect('triangles 8k-20k', s.tris >= 8000 && s.tris <= 20000, s.tris + ' tris, ' + s.verts + ' verts');
  expect('bones = the 15 named parts', s.bones === 15, s.bones);
  expect('max weights per vertex <= 4', s.maxInfluences <= 4, String(s.maxInfluences));
  expect('weights sum to 1', s.weightSumError < 1e-5, String(s.weightSumError));
  expect('generated in under 300 ms', s.genMs < 300, s.genMs + ' ms (nets ' + s.split.netsMs + ', snap ' + s.split.snapMs + ', skin ' + s.split.skinMs + ')');

  // A pose change moves vertices: sample every 37th vertex in the sit hold, then in the sleep hold.
  cv.auto = false;
  const ids = Array.from({ length: Math.floor(s.verts / 37) }, (_, i) => i * 37);
  await waitFor(() => cv.phase === 'hold' && cv.pose === 'sit');
  const a = cv.skinnedPositions(ids);
  cv.request('sleep');
  await waitFor(() => cv.phase === 'hold' && cv.pose === 'sleep', 9000);
  const b = cv.skinnedPositions(ids);
  const d = a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1], p[2] - b[i][2]));
  const mean = d.reduce((x, y) => x + y, 0) / d.length, max = Math.max(...d), moved = d.filter((x) => x > 0.05).length;
  expect('sit -> sleep moves vertices', mean > 0.05 && moved > d.length / 2, `mean ${mean.toFixed(3)}, max ${max.toFixed(3)}, ${moved}/${d.length} moved > 0.05`);
  expect('no NaN in skinned positions', b.every((p) => p.every(Number.isFinite)));

  // Baking: the same cat, bones and clips as one GLB (so the site could ship a file, not the generator).
  const bytes = await cv.exportGLB(false);
  expect('exports to GLB', bytes > 0, (bytes / 1024).toFixed(0) + ' KB uncompressed, with every non-additive clip');

  const pre = document.createElement('pre');
  pre.id = 'check-out';
  pre.style.cssText = 'position:fixed;left:16px;top:44px;background:#000c;color:#9f9;padding:8px;font:12px monospace;margin:0;z-index:9;white-space:pre-wrap;max-width:640px';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
})()
