// Fetching and unpacking a splat file off the main thread (a module worker), so that loading the other poses and the
// bread never stops the page. Hands back the Gaussians already laid out as the textures the renderer wants.
import { parseSpz } from './spz.js';

const TEX_W = 1024;
// The body as it arrives, with { of: id, progress } along the way (the loading screen's ring, index.html), at most
// ~20 a file. Without a length (or a stream) it is read in one go, as before.
async function bytes(r, id) {
  const total = Number(r.headers.get('content-length')) || 0;
  if (!total || !r.body?.getReader) return new Uint8Array(await r.arrayBuffer());
  const out = new Uint8Array(total), reader = r.body.getReader();
  let got = 0, told = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (got + value.length > total) return concatRest(out.subarray(0, got), value, reader);
    out.set(value, got); got += value.length;
    if (got - told > total / 20) { told = got; self.postMessage({ of: id, progress: got / total }); }
  }
  return got === total ? out : out.subarray(0, got);
}
// a body longer than its stated length (a server that compressed it): finish reading it the plain way
async function concatRest(head, value, reader) {
  const parts = [head, value];
  for (;;) { const { done, value: v } = await reader.read(); if (done) break; parts.push(v); }
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0; for (const p of parts) { all.set(p, at); at += p.length; }
  return all;
}
self.onmessage = async (e) => {
  const { id, url } = e.data;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    const s = parseSpz(await bytes(r, id)), n = s.count, h = Math.ceil(n / TEX_W), len = TEX_W * h * 4;
    const tCenter = new Float32Array(len), tCovA = new Float32Array(len), tCovB = new Float32Array(len), tColor = new Uint8Array(len);
    for (let i = 0; i < n; i++) {
      tCenter[i * 4] = s.center[i * 3]; tCenter[i * 4 + 1] = s.center[i * 3 + 1]; tCenter[i * 4 + 2] = s.center[i * 3 + 2];
      tCovA[i * 4] = s.cov[i * 6]; tCovA[i * 4 + 1] = s.cov[i * 6 + 1]; tCovA[i * 4 + 2] = s.cov[i * 6 + 2]; tCovA[i * 4 + 3] = s.cov[i * 6 + 3];
      tCovB[i * 4] = s.cov[i * 6 + 4]; tCovB[i * 4 + 1] = s.cov[i * 6 + 5];
    }
    tColor.set(s.rgba);
    const out = { id, count: n, min: s.min, max: s.max, texH: h, center: s.center, tCenter, tCovA, tCovB, tColor };
    self.postMessage(out, [s.center.buffer, tCenter.buffer, tCovA.buffer, tCovB.buffer, tColor.buffer]);
  } catch (err) { self.postMessage({ id, error: String(err.message || err) }); }
};
