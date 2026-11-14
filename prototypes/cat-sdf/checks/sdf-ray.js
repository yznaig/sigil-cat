(async () => {
  // Ray-mode checks: every pose renders cat pixels (the march hits), and the per-pixel cost is read
  // back from the GPU. Run on index.html#mode=ray&debug (no #t freeze). Add ?dpr=3 at 390x844 for
  // iPhone-sized numbers.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cv = window.catViewer, out = [];
  const expect = (label, ok, detail = '') => out.push((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  -> ' + detail : ''));
  const waitFor = async (fn, ms = 9000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (fn()) return true; await sleep(30); } return false; };
  expect('mode is ray', cv.mode === 'ray', cv.mode);
  cv.auto = false;
  for (const p of ['sit', 'lie', 'sleep', 'stretch']) {
    cv.request(p);
    if (p === 'stretch') { await waitFor(() => cv.phase === 'oneshot'); await sleep(900); }   // a one-shot: sample it mid-stretch
    else await waitFor(() => cv.phase === 'hold' && cv.pose === p);
    const r = cv.rayStats();
    expect(`${p}: cat drawn`, r.catPixels > 1000,
      `${r.catPixels} cat px of ${r.boxPixels} box px (${r.target}); steps on cat ${r.avgStepsOnCat}, max ${r.maxSteps}; prim evals/frame ${(r.primEvalsPerFrame / 1e6).toFixed(1)}M`);
  }
  const pre = document.createElement('pre');
  pre.id = 'check-out';
  pre.style.cssText = 'position:fixed;left:16px;top:44px;background:#000c;color:#9f9;padding:8px;font:12px monospace;margin:0;z-index:9;white-space:pre-wrap;max-width:640px';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
})()
