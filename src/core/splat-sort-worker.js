// Back-to-front order for a moving splat prop, off the main thread (physics lane, e1111-58 cost gates). The same
// radial counting sort as splats.js sortFor. Messages:
//   {type:'init', id, center}            the prop's Gaussian centres (model space), once
//   {type:'rank', id, rank}              its importance ranking, once, before the first level-of-detail sort
//   {type:'sort', id, seq, eye, m, buf}  sort the first m ranked Gaussians (all when no rank / m = n) for this eye,
//                                        into buf (a Float32Array of length n, transferred); answered {id, seq, eye, m, buf}
const props = new Map();
self.onmessage = (e) => {
  const d = e.data;
  if (d.type === 'init') { const n = d.center.length / 3; props.set(d.id, { center: d.center, n, rank: null, keys: new Float32Array(n), bins: new Uint16Array(n), counts: new Uint32Array(65537) }); return; }
  const p = props.get(d.id); if (!p) return;
  if (d.type === 'rank') { p.rank = d.rank; return; }
  if (d.type === 'drop') { props.delete(d.id); return; }
  const { center: c, keys, bins, counts } = p, order = d.buf, m = Math.min(d.m, p.n), sub = m < p.n ? p.rank : null, [ex, ey, ez] = d.eye;
  let lo = Infinity, hi = -Infinity;
  for (let j = 0; j < m; j++) {
    const i = sub ? sub[j] : j, o = i * 3, dx = c[o] - ex, dy = c[o + 1] - ey, dz = c[o + 2] - ez, k = dx * dx + dy * dy + dz * dz;
    keys[j] = k; if (k < lo) lo = k; if (k > hi) hi = k;
  }
  const scale = 65535 / Math.max(1e-12, hi - lo);
  counts.fill(0);
  for (let j = 0; j < m; j++) { const b = 65535 - ((keys[j] - lo) * scale | 0); bins[j] = b; counts[b]++; }
  for (let b = 0, sum = 0; b < 65536; b++) { const k = counts[b]; counts[b] = sum; sum += k; }
  for (let j = 0; j < m; j++) order[counts[bins[j]]++] = sub ? sub[j] : j;
  self.postMessage({ id: d.id, seq: d.seq, eye: d.eye, m, buf: order }, [order.buffer]);
};
