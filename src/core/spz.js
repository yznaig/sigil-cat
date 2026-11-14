// Reading an .spz (Gaussian splats, github.com/nianticlabs/spz), version 4: a 32-byte header, a table of streams, each
// stream packed with zstd. Plain numbers in, plain arrays out: no 3D library here, so the tools can use it from node.
import { decompress } from '../vendor/fzstd.js';

const SH_C0 = 0.28209479177387814;

export function parseSpz(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x5053474e) throw new Error('not an .spz file');
  const version = dv.getUint32(4, true), n = dv.getUint32(8, true);
  if (version !== 4) throw new Error(`.spz version ${version}: this reader takes version 4`);
  const fractionalBits = dv.getUint8(13), streams = dv.getUint8(15), toc = dv.getUint32(16, true);
  const parts = [];
  let at = toc + streams * 16;
  for (let i = 0; i < streams; i++) {
    const packed = Number(dv.getBigUint64(toc + i * 16, true)), raw = Number(dv.getBigUint64(toc + i * 16 + 8, true));
    parts.push(decompress(bytes.subarray(at, at + packed), new Uint8Array(raw)));
    at += packed;
  }
  const [P, A, C, S, R] = parts;                      // positions, alphas, colours, scales, rotations
  const center = new Float32Array(n * 3), cov = new Float32Array(n * 6), rgba = new Uint8Array(n * 4);
  const fix = 1 / (1 << fractionalBits), q = [0, 0, 0, 0];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const o = i * 9 + k * 3;
      let v = P[o] | (P[o + 1] << 8) | (P[o + 2] << 16);
      if (v & 0x800000) v -= 0x1000000;
      const c = v * fix;
      center[i * 3 + k] = c;
      if (c < lo[k]) lo[k] = c;
      if (c > hi[k]) hi[k] = c;
    }
    // colour: the stored byte is the first spherical-harmonic term; alpha is stored as it is drawn
    for (let k = 0; k < 3; k++) rgba[i * 4 + k] = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * ((C[i * 3 + k] / 255 - 0.5) / 0.15)) * 255)));
    rgba[i * 4 + 3] = A[i];
    // rotation: "smallest three", 10 bits each (9 of size, 1 of sign), the largest rebuilt from the others
    let comp = (R[i * 4] | (R[i * 4 + 1] << 8) | (R[i * 4 + 2] << 16) | (R[i * 4 + 3] << 24)) >>> 0;
    const largest = comp >>> 30;
    let sum = 0;
    for (let k = 3; k >= 0; k--) {
      if (k === largest) continue;
      const mag = comp & 511, neg = (comp >>> 9) & 1;
      comp >>>= 10;
      q[k] = Math.SQRT1_2 * mag / 511 * (neg ? -1 : 1);
      sum += q[k] * q[k];
    }
    q[largest] = Math.sqrt(Math.max(0, 1 - sum));
    const [x, y, z, w] = q;
    const sx = Math.exp(S[i * 3] / 16 - 10), sy = Math.exp(S[i * 3 + 1] / 16 - 10), sz = Math.exp(S[i * 3 + 2] / 16 - 10);
    // covariance = R S S^T R^T, kept as its six distinct numbers
    const m00 = (1 - 2 * (y * y + z * z)) * sx, m01 = 2 * (x * y - w * z) * sy, m02 = 2 * (x * z + w * y) * sz;
    const m10 = 2 * (x * y + w * z) * sx, m11 = (1 - 2 * (x * x + z * z)) * sy, m12 = 2 * (y * z - w * x) * sz;
    const m20 = 2 * (x * z - w * y) * sx, m21 = 2 * (y * z + w * x) * sy, m22 = (1 - 2 * (x * x + y * y)) * sz;
    const o = i * 6;
    cov[o] = m00 * m00 + m01 * m01 + m02 * m02; cov[o + 1] = m00 * m10 + m01 * m11 + m02 * m12; cov[o + 2] = m00 * m20 + m01 * m21 + m02 * m22;
    cov[o + 3] = m10 * m10 + m11 * m11 + m12 * m12; cov[o + 4] = m10 * m20 + m11 * m21 + m12 * m22; cov[o + 5] = m20 * m20 + m21 * m21 + m22 * m22;
  }
  return { count: n, center, cov, rgba, min: lo, max: hi };
}
