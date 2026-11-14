// Gaussian splats, drawn by us. The cat is five still splat models (four poses and the bread) that only ever turn left
// and right, so the site does not need a general splat engine: this file reads an .spz, keeps its Gaussians in
// textures, sorts them back to front on the CPU (a counting sort, about a millisecond for 68k) and draws them as
// instanced quads. No GPU read-back, no second library. The projection, the 0.3 px blur with its opacity
// correction, the 2.83 sigma cut-off and the radial sort order all follow Spark 2.4's defaults, which is what Aaron
// approved the look in (checks/look.js compares the two).
// The file reader is src/core/spz.js.
import * as THREE from 'three';
import { parseSpz } from './spz.js';

const TEX_W = 1024;

// ---- reading ----------------------------------------------------------------------------------------------------
// The file is fetched and unpacked in a worker (src/core/spz-worker.js), so a pose arriving never stops the page.
// Without workers (or if one cannot start) it is done here instead.
// index.html starts the worker, and his first pose in it, before this file (and the 3D library it needs) has even
// arrived: globalThis.__splat = { worker, url, first } (first: a promise of that pose's unpacked data, or null).
const early = globalThis.__splat;
let worker = null, nextId = 1;
const waiting = new Map();
function viaWorker(url) {
  if (worker === null) {
    try {
      worker = early && !early.dead ? early.worker : new Worker(new URL('./spz-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const w = waiting.get(e.data.id); waiting.delete(e.data.id); if (w) (e.data.error ? w.reject(new Error(e.data.error)) : w.resolve(e.data)); };
      worker.onerror = () => { worker = false; for (const w of waiting.values()) w.fallback(); waiting.clear(); };
    } catch { worker = false; }
  }
  if (!worker) return null;
  return new Promise((resolve, reject) => { const id = nextId++; waiting.set(id, { resolve, reject, fallback: () => here(url).then(resolve, reject) }); worker.postMessage({ id, url }); });
}
async function here(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const s = parseSpz(new Uint8Array(await r.arrayBuffer())), n = s.count, h = Math.ceil(n / TEX_W), len = TEX_W * h * 4;
  const tCenter = new Float32Array(len), tCovA = new Float32Array(len), tCovB = new Float32Array(len), tColor = new Uint8Array(len);
  for (let i = 0; i < n; i++) {
    tCenter.set(s.center.subarray(i * 3, i * 3 + 3), i * 4); tCovA.set(s.cov.subarray(i * 6, i * 6 + 4), i * 4);
    tCovB[i * 4] = s.cov[i * 6 + 4]; tCovB[i * 4 + 1] = s.cov[i * 6 + 5];
  }
  tColor.set(s.rgba);
  return { count: n, min: s.min, max: s.max, texH: h, center: s.center, tCenter, tCovA, tCovB, tColor };
}
export async function fetchSplat(url) {
  let s = null;
  if (early && early.url === url && !early.taken) { early.taken = true; s = await early.first; }
  s ??= await (viaWorker(url) || here(url));
  s.box = new THREE.Box3(new THREE.Vector3(...s.min), new THREE.Vector3(...s.max));
  return s;
}

// ---- sorting off the main thread ----
// One shared module worker (src/core/splat-sort-worker.js) for the props that ask for it. Without workers it is never
// used: sortAsync falls back to sorting here.
let sorter = null, nextSortId = 1;
const sortHandlers = new Map();
function sortWorker() {
  if (sorter === null) {
    try {
      sorter = new Worker(new URL('./splat-sort-worker.js', import.meta.url), { type: 'module' });
      sorter.onmessage = (e) => sortHandlers.get(e.data.id)?.(e.data);
      sorter.onerror = () => { sorter = false; for (const h of sortHandlers.values()) h(null); };
    } catch { sorter = false; }
  }
  return sorter || null;
}

// ---- drawing ----------------------------------------------------------------------------------------------------
const VERT = /* glsl */`
precision highp float; precision highp int; precision highp sampler2D;
uniform mat4 modelViewMatrix, projectionMatrix;
uniform sampler2D tCenter, tCovA, tCovB, tColor;
uniform vec2 uViewport;      // the size of what is being drawn into, px
uniform float uPhase;        // the pop: 0 all here, 1 all gone (each Gaussian shrinks away on its own small delay)
in vec3 position;
in float splatIndex;
out vec4 vRgba; out vec2 vUv;
const float MAX_STD = 2.8284271, MIN_ALPHA = 0.00196, BLUR = 0.3;
float popHash(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return float(x) / 4294967295.0; }
void main() {
  gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  int idx = int(splatIndex);
  ivec2 tc = ivec2(idx % ${TEX_W}, idx / ${TEX_W});
  vec4 c = texelFetch(tCenter, tc, 0), ca = texelFetch(tCovA, tc, 0), cb = texelFetch(tCovB, tc, 0);
  vec4 rgba = texelFetch(tColor, tc, 0);
  float shrink = 1.0;
  if (uPhase > 0.0) {
    float k = clamp((uPhase - popHash(uint(idx) * 3u + 1u) * 0.35) / 0.65, 0.0, 1.0);
    shrink = 1.0 - k; rgba.a *= 1.0 - k * k;
  }
  if (rgba.a < MIN_ALPHA || shrink <= 0.0) return;
  vec4 view = modelViewMatrix * vec4(c.xyz, 1.0);
  if (view.z >= 0.0) return;
  vec4 clip = projectionMatrix * view;
  if (abs(clip.z) >= clip.w) return;
  float edge = 1.4 * clip.w;
  if (abs(clip.x) > edge || abs(clip.y) > edge) return;
  mat3 cov = mat3(ca.x, ca.y, ca.z, ca.y, ca.w, cb.x, ca.z, cb.x, cb.y) * (shrink * shrink);
  mat3 M = mat3(modelViewMatrix);
  cov = M * cov * transpose(M);
  vec2 focal = 0.5 * uViewport * vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
  float invZ = 1.0 / view.z;
  vec2 J1 = focal * invZ, J2 = -(J1 * view.xy) * invZ;
  mat3 J = mat3(J1.x, 0.0, J2.x, 0.0, J1.y, J2.y, 0.0, 0.0, 0.0);
  mat3 c2 = transpose(J) * cov * J;
  float a = c2[0][0], d = c2[1][1], b = c2[0][1];
  float detOrig = a * d - b * b;
  a += BLUR; d += BLUR;
  float det = a * d - b * b;
  rgba.a *= sqrt(max(0.0, detOrig / det));          // a Gaussian smaller than a pixel fades instead of sparkling
  if (rgba.a < MIN_ALPHA) return;
  float avg = 0.5 * (a + d), half_ = 0.5 * (a - d), delta = sqrt(half_ * half_ + b * b);
  float e1 = avg + delta, e2 = max(0.0, det / e1);
  vec2 v1 = half_ >= 0.0 ? vec2(delta + half_, b) : vec2(b, delta - half_);
  float l = dot(v1, v1);
  v1 = l > 0.0 ? v1 * inversesqrt(l) : vec2(1.0, 0.0);
  vec2 v2 = vec2(v1.y, -v1.x);
  vec2 px = position.x * v1 * min(512.0, MAX_STD * sqrt(e1)) + position.y * v2 * min(512.0, MAX_STD * sqrt(e2));
  vec3 ndc = clip.xyz / clip.w;
  vRgba = rgba; vUv = position.xy * MAX_STD;
  gl_Position = vec4((ndc.xy + px * 2.0 / uViewport) * clip.w, clip.zw);
}`;
const FRAG = /* glsl */`
precision highp float;
in vec4 vRgba; in vec2 vUv;
out vec4 frag;
void main() {
  float z2 = dot(vUv, vUv);
  if (z2 > 8.0) discard;
  float a = vRgba.a * exp(-0.5 * z2);
  if (a < 0.00196) discard;
  frag = vec4(vRgba.rgb * a, a);                    // premultiplied; colours are written as stored (display space)
}`;

const quad = new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3);
const quadIndex = new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1);

function dataTexture(data, h, type, internal) {
  const t = new THREE.DataTexture(data, TEX_W, h, THREE.RGBAFormat, type);
  if (internal) t.internalFormat = internal;
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// One splat model as a THREE.Mesh. Call mesh.sortFor(camera) after it or the camera has moved; set mesh.phase for the pop.
export function makeSplatMesh(splat) {
  const n = splat.count;
  const uniforms = {
    tCenter: { value: dataTexture(splat.tCenter, splat.texH, THREE.FloatType, 'RGBA32F') },
    tCovA: { value: dataTexture(splat.tCovA, splat.texH, THREE.FloatType, 'RGBA32F') },
    tCovB: { value: dataTexture(splat.tCovB, splat.texH, THREE.FloatType, 'RGBA32F') },
    tColor: { value: dataTexture(splat.tColor, splat.texH, THREE.UnsignedByteType) },
    uViewport: { value: new THREE.Vector2(1, 1) }, uPhase: { value: 0 },
  };
  let order = new Float32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', quad); geo.setIndex(quadIndex);
  const orderAttr = new THREE.InstancedBufferAttribute(order, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('splatIndex', orderAttr);
  geo.instanceCount = n;
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,   // the quad's axes can come out mirrored
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const viewport = new THREE.Vector4();
  mesh.onBeforeRender = (renderer) => {
    renderer.getCurrentViewport(viewport);
    uniforms.uViewport.value.set(viewport.z, viewport.w);
  };
  // Back to front by distance from the eye, in the model's own space. Skipped while the eye has barely moved.
  const keys = new Float32Array(n), bins = new Uint16Array(n), counts = new Uint32Array(65537), eye = new THREE.Vector3(), last = new THREE.Vector3(1e9, 0, 0);
  const inv = new THREE.Matrix4(), _e = new THREE.Vector3();
  let sorts = 0;
  // How far (radians) the eye has swung round the model since its last sort; Infinity before the first. A cheap test
  // that lets a small tumbling prop sort every few frames instead of every frame (src/core/prop-picture.js).
  mesh.sortAngle = (camera) => {
    if (last.x === 1e9) return Infinity;
    inv.copy(mesh.matrixWorld).invert();
    _e.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    const a = _e.length(), b = last.length();
    if (!a || !b) return Infinity;
    return Math.acos(Math.max(-1, Math.min(1, _e.dot(last) / (a * b)))) + Math.abs(Math.log(a / b));
  };
  // Level of detail (physics lane, cost gates): setLod(f) draws, sorts and uploads only the share f of the Gaussians
  // that matter most (opacity × size), ranked once on first use. A prop does this only while it tumbles; at rest f = 1.
  let lod = 1, rank = null, m = n;
  function ranking() {
    if (rank) return rank;
    const ca = splat.tCovA, cb = splat.tCovB, rgba = splat.tColor, imp = new Float32Array(n);
    let top = 0;
    for (let i = 0; i < n; i++) { const t = ca[i * 4] + ca[i * 4 + 3] + cb[i * 4 + 1]; imp[i] = rgba[i * 4 + 3] * Math.sqrt(Math.max(0, t)); if (imp[i] > top) top = imp[i]; }
    // most important first: a 4096-bucket counting sort is plenty for a cut-off
    const B = 4096, cnt = new Uint32Array(B + 1), bucket = new Uint16Array(n), k = (B - 1) / Math.max(1e-12, top);
    for (let i = 0; i < n; i++) { const b = B - 1 - (imp[i] * k | 0); bucket[i] = b; cnt[b]++; }
    for (let b = 0, sum = 0; b < B; b++) { const c = cnt[b]; cnt[b] = sum; sum += c; }
    rank = new Uint32Array(n);
    for (let i = 0; i < n; i++) rank[cnt[bucket[i]]++] = i;
    return rank;
  }
  // Returns true when the share changed (the caller must sort again before drawing).
  mesh.setLod = (f) => {
    f = Math.max(.05, Math.min(1, f));
    if (f === lod) return false;
    lod = f; m = f < 1 ? Math.max(1, Math.round(n * f)) : n;
    if (f < 1) ranking();
    geo.instanceCount = m; last.set(1e9, 0, 0);
    return true;
  };
  Object.defineProperty(mesh, 'lod', { get: () => lod });
  mesh.sortFor = (camera, force = false) => {
    inv.copy(mesh.matrixWorld).invert();
    eye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    if (!force && eye.distanceToSquared(last) < 1e-8 * eye.lengthSq()) return false;
    last.copy(eye);
    const c = splat.center, ex = eye.x, ey = eye.y, ez = eye.z, sub = m < n ? rank : null;
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < m; j++) {
      const i = sub ? sub[j] : j, o = i * 3;
      const dx = c[o] - ex, dy = c[o + 1] - ey, dz = c[o + 2] - ez, d = dx * dx + dy * dy + dz * dz;
      keys[j] = d; if (d < lo) lo = d; if (d > hi) hi = d;
    }
    const scale = 65535 / Math.max(1e-12, hi - lo);
    counts.fill(0);
    // Same buckets and stable scatter as before; each bucket is computed once.
    for (let j = 0; j < m; j++) { const b = 65535 - ((keys[j] - lo) * scale | 0); bins[j] = b; counts[b]++; }      // far first
    let sum = 0;
    for (let b = 0; b < 65536; b++) { const k = counts[b]; counts[b] = sum; sum += k; }
    for (let j = 0; j < m; j++) order[counts[bins[j]]++] = sub ? sub[j] : j;
    orderAttr.clearUpdateRanges(); if (m < n) orderAttr.addUpdateRange(0, m);
    orderAttr.needsUpdate = true;
    sorts++; exact = seq; wanted = null;
    return true;
  };
  // sortAsync(camera, onSorted): the same order, computed by the shared worker; the picture keeps its last order until
  // the answer arrives (between frames), then onSorted() is called once the new order is in place. One request is in
  // flight per mesh; a newer eye waiting behind it replaces any older one. An exact sortFor in between wins: answers
  // older than it are dropped. Returns false when there is no worker (the caller sorts here instead).
  let asyncId = 0, seq = 0, exact = 0, inFlight = false, spare = null, wanted = null, onSorted = null, rankSent = false;
  const post = (w, e) => {
    if (m < n && !rankSent) { w.postMessage({ type: 'rank', id: asyncId, rank: ranking().slice() }); rankSent = true; }
    const buf = spare || new Float32Array(n); spare = null; inFlight = true;
    w.postMessage({ type: 'sort', id: asyncId, seq: ++seq, eye: [e.x, e.y, e.z], m, buf }, [buf.buffer]);
  };
  mesh.sortAsync = (camera, done) => {
    const w = sortWorker(); if (!w) return false;
    if (!asyncId) {
      asyncId = nextSortId++;
      w.postMessage({ type: 'init', id: asyncId, center: splat.center.slice() });
      sortHandlers.set(asyncId, (d) => {
        if (!d) { inFlight = false; return; }                          // the worker died: callers fall back next time
        inFlight = false;
        if (d.seq > exact && d.m === m) {
          spare = orderAttr.array; orderAttr.array = d.buf; order = d.buf; last.set(...d.eye);
          orderAttr.clearUpdateRanges(); if (d.m < n) orderAttr.addUpdateRange(0, d.m);
          orderAttr.needsUpdate = true; sorts++; asyncSorts++;
          onSorted?.();
        } else spare = d.buf;
        if (wanted) { const e = wanted; wanted = null; post(w, e); }
      });
    }
    onSorted = done;
    inv.copy(mesh.matrixWorld).invert();
    const e = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    if (inFlight) wanted = e; else post(w, e);
    return true;
  };
  let asyncSorts = 0;
  Object.defineProperty(mesh, 'asyncSorts', { get: () => asyncSorts });
  Object.defineProperty(mesh, 'phase', { get: () => uniforms.uPhase.value, set: (v) => { uniforms.uPhase.value = v; } });
  Object.defineProperty(mesh, 'sorts', { get: () => sorts });
  mesh.splat = splat;
  mesh.dispose = () => { if (asyncId) { sortHandlers.delete(asyncId); sorter?.postMessage({ type: 'drop', id: asyncId }); } geo.dispose(); mat.dispose(); for (const k of ['tCenter', 'tCovA', 'tCovB', 'tColor']) uniforms[k].value.dispose(); };
  return mesh;
}
