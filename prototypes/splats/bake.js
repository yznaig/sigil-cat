// Bake a posed, skinned mesh into Gaussian splats (Spark PackedSplats).
// Used by index.html (the pop poses) and skin.html (the skinning test). See index.html's header for the look.
import * as THREE from 'three';

export const LOOK = {
  base: [0.165, 0.155, 0.148],    // lit charcoal (sRGB 0..1), sampled off the sheet's lit felt
  fibre: [0.34, 0.32, 0.30],      // the lighter fibres that show even in shade
  fuzzShare: 0.3,                 // share of Gaussians spent on lifted fibres
  light: [-0.35, 0.75, 0.6],      // key light: upper front left, like the sheets
};

export async function loadFibre(url) {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const lum = new Float32Array(c.width * c.height); let mean = 0;
  for (let i = 0; i < lum.length; i++) { lum[i] = d[i * 4]; mean += lum[i]; }
  mean /= lum.length;
  for (let i = 0; i < lum.length; i++) lum[i] /= mean;   // ~1 on average
  return { w: c.width, h: c.height, lum };
}
// Triplanar lookup of the fibre tile: brightness factor around 1.
function fibreAt(f, p, n, tile = 0.22) {
  const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), s = ax + ay + az;
  const look = (u, v) => {
    const x = ((Math.floor(u / tile * f.w) % f.w) + f.w) % f.w, y = ((Math.floor(v / tile * f.h) % f.h) + f.h) % f.h;
    return f.lum[y * f.w + x];
  };
  return (look(p.y, p.z) * ax + look(p.x, p.z) * ay + look(p.x, p.y) * az) / s;
}

// Mulberry32: the same pose bakes the same splats every time.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Posed, world-space triangles of one skinned mesh.
export function posedTriangles(mesh) {
  const g = mesh.geometry, pos = g.attributes.position, idx = g.index;
  const nv = pos.count, P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), v = new THREE.Vector3();
  for (let i = 0; i < nv; i++) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); P.set([v.x, v.y, v.z], i * 3); }
  const tris = idx ? idx.array : Array.from({ length: nv }, (_, i) => i);
  const nt = tris.length / 3, area = new Float64Array(nt);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let t = 0; t < nt; t++) {
    const i0 = tris[t * 3], i1 = tris[t * 3 + 1], i2 = tris[t * 3 + 2];
    a.fromArray(P, i0 * 3); b.fromArray(P, i1 * 3); c.fromArray(P, i2 * 3);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
    area[t] = e1.length() / 2;
    for (const i of [i0, i1, i2]) { N[i * 3] += e1.x; N[i * 3 + 1] += e1.y; N[i * 3 + 2] += e1.z; }   // area-weighted vertex normals
  }
  for (let i = 0; i < nv; i++) { v.fromArray(N, i * 3).normalize(); N.set([v.x, v.y, v.z], i * 3); }
  const cdf = new Float64Array(nt); let total = 0;
  for (let t = 0; t < nt; t++) { total += area[t]; cdf[t] = total; }
  return { P, N, tris, cdf, total };
}

function sampleSurface(T, rand, p, n) {
  const r = rand() * T.total; let lo = 0, hi = T.cdf.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (T.cdf[m] < r) lo = m + 1; else hi = m; }
  let u = rand(), w = rand(); if (u + w > 1) { u = 1 - u; w = 1 - w; }
  const i0 = T.tris[lo * 3], i1 = T.tris[lo * 3 + 1], i2 = T.tris[lo * 3 + 2], k = 1 - u - w;
  for (const [arr, out] of [[T.P, p], [T.N, n]]) {
    out.set(arr[i0 * 3] * k + arr[i1 * 3] * u + arr[i2 * 3] * w, arr[i0 * 3 + 1] * k + arr[i1 * 3 + 1] * u + arr[i2 * 3 + 1] * w,
      arr[i0 * 3 + 2] * k + arr[i1 * 3 + 2] * u + arr[i2 * 3 + 2] * w);
  }
  n.normalize();
}

// Soft studio light baked into the colour (splats are unlit): wrap diffuse + floor occlusion.
const L = new THREE.Vector3(...LOOK.light).normalize();
function shade(p, n) {
  const wrap = THREE.MathUtils.clamp((n.dot(L) + 0.6) / 1.6, 0, 1);
  const floorAO = 0.7 + 0.3 * THREE.MathUtils.smoothstep(p.y, 0.0, 0.14);
  const top = 0.9 + 0.1 * Math.max(n.y, 0);
  return (0.34 + 0.9 * wrap * wrap) * floorAO * top;
}

export function bakeSplats({ body, whiskers, fibre, count, seed, fuzz = true, look = LOOK }) {
  const rand = rng(seed);
  const TB = posedTriangles(body), TW = whiskers ? posedTriangles(whiskers) : null;
  const nWhisk = TW ? Math.round(count * 0.02) : 0;
  const nFuzz = fuzz ? Math.round((count - nWhisk) * look.fuzzShare) : 0;
  const nSurf = count - nWhisk - nFuzz;
  const spacing = Math.sqrt(TB.total / nSurf);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), col = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(1, 0, 0);
  const frameAt = (n, ang) => {      // tangent frame around the normal, turned by ang
    t1.crossVectors(Math.abs(n.y) < 0.9 ? up : side, n).normalize(); t2.crossVectors(n, t1);
    const c = Math.cos(ang), si = Math.sin(ang), x = t1.clone().multiplyScalar(c).addScaledVector(t2, si);
    t2.crossVectors(n, x); t1.copy(x);
    m.makeBasis(t1, t2, n); q.setFromRotationMatrix(m);
  };
  const box = new THREE.Box3();
  return (splats) => {
    const [br, bg, bb] = look.base, [fr, fg, fb] = look.fibre;
    for (let i = 0; i < nSurf; i++) {              // the felt skin: flat, overlapping, opaque discs
      sampleSurface(TB, rand, p, n); box.expandByPoint(p);
      frameAt(n, rand() * Math.PI);
      const sh = shade(p, n), fib = 0.82 + 0.18 * fibreAt(fibre, p, n);
      col.setRGB(br * sh * fib, bg * sh * fib, bb * sh * fib);
      s.set(spacing * (0.62 + 0.2 * rand()), spacing * (0.62 + 0.2 * rand()), spacing * 0.08);
      splats.pushSplat(p, s, q, 1, col);
    }
    const dirA = new THREE.Vector3(), mid = new THREE.Vector3();
    for (let i = 0; i < nFuzz; i += 2) {           // flocked fibres: short curly strands (two bent segments), lifted a hair
      sampleSurface(TB, rand, p, n);
      p.addScaledVector(n, spacing * (0.1 + 0.6 * rand() * rand()));
      let ang = rand() * Math.PI * 2;
      const len = spacing * (0.35 + 0.35 * rand()), bend = (rand() < 0.5 ? -1 : 1) * (0.7 + 0.8 * rand());
      const sh = shade(p, n) * (0.7 + 0.45 * fibreAt(fibre, p, n));
      col.setRGB(fr * sh, fg * sh, fb * sh);
      const op = 0.3 + 0.35 * rand();
      for (let k = 0; k < 2 && i + k < nFuzz; k++) {
        frameAt(n, ang);                           // t1 = strand direction in the tangent plane
        dirA.copy(t1);
        mid.copy(p).addScaledVector(dirA, len);
        s.set(len, spacing * 0.09, spacing * 0.05);
        splats.pushSplat(mid, s, q, op, col);
        p.addScaledVector(dirA, len * 2); ang += bend;
      }
    }
    if (TW) {                                      // whiskers: smooth Sigil Black, no fibres (cat-look.md)
      const ws = Math.sqrt(TW.total / nWhisk);
      for (let i = 0; i < nWhisk; i++) {
        sampleSurface(TW, rand, p, n); frameAt(n, rand() * Math.PI);
        const sh = 0.55 + 0.45 * THREE.MathUtils.clamp((n.dot(L) + 0.6) / 1.6, 0, 1);
        col.setRGB(0.09 * sh, 0.088 * sh, 0.085 * sh);
        s.set(ws * 0.7, ws * 0.7, ws * 0.1);
        splats.pushSplat(p, s, q, 1, col);
      }
    }
    splats.userBox = box;
  };
}

