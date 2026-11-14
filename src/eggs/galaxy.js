import {cardService} from '../world/cards.js';
// Hole in the universe (spin him really fast: playtest 2 made the star a secret, not a sigil). His felt stops being a cat-shaped object and
// becomes a cat-shaped window onto deep space: nebula gas in magenta, teal and gold, stars coloured by temperature, a
// few bright stars with diffraction spikes and a slowly turning spiral galaxy. Butter, if he has it, stays solid.
// He is a portal, not a painted skin (Aaron, e1109-04: "like the minecraft end portal"): the universe is fixed on the
// screen, so turning him only turns the cut-out. Spin him fast and he goes to warp (the old Windows "Starfield").
// How: one full-screen pass after the scene. The cat's own picture (src/core/cat.js) is the mask: wherever it has
// him, the pass paints the universe; its blurred copies (the picture's mip levels) give his outline's glow and the
// bend of light near it. Nothing of him is drawn twice.
// It is a takeover (e1109-04): the player loses control (no drag, tap or sigil gets through), he spins fast as the
// galaxy takes over (about three times slower than it first did: Aaron, playtest 2) and winds down to rest, and then
// the galaxy stays until the player clicks or taps (or presses Esc, which also works earlier); then it recedes and the
// page is back. The page goes into space around him meanwhile: the dark closes in from the screen's edges, faint stars
// wheel in it, the page's words and keepsakes fade out. He is frozen in the pose he had.
// The black hole that once framed him (shadow, lensed accretion disk, photon ring, the page spiralling into it) is
// gone: Aaron, playtest 2, "remove the black hole from the code entirely, it's a bit too laggy".
// Spinning him really fast while he is bread blasts the bread off instead (src/eggs/bread.js); `space(on)` lends that
// blast-off the dark. It leaves a postcard.
import { css } from '../core/util.js';

export const GALAXY = {
  openSeconds: 2.7, closeSeconds: 1.3,         // the dissolve in (3x the old 0.9 s: playtest 2) and out
  // The trigger: time above `speed` fills a tally, which drains at `decay` x real time when he is slower. "Really
  // fast" (playtest 2, e1112-38): well past Spin Doctor's 8 rad/s at release (src/ui/achievements.js), so one fast
  // flick earns Spin Doctor and only sustained hard swiping opens the galaxy; swipes at 1400 px/s never do.
  // Playtest 3 (gags lane; Aaron: "it needs to activate after roughly 7 seconds of fast spinning"): `seconds` of
  // sustained fast spinning open it. Between two hard swipes he dips below `speed` for a moment (measured: at most
  // ~0.15 s at 1800-2600 px/s), so a dip shorter than `gap` still counts as spinning; a longer slowdown drains the
  // tally at `decay`. Seven seconds of steady hard swiping opens it at about seven seconds. The bread's blast-off keeps
  // the old quick trigger (`bread` s): he is bread for only five seconds (src/eggs/bread.js).
  spin: { speed: 13, seconds: 7, gap: 0.35, decay: 2, bread: 0.6 },
  warp: { from: 6, full: 13, base: 0.1, perRad: 0.06, max: 1.2 },   // warp shows from..full rad/s; star speed base + per rad/s
  exposure: 1.0,                              // overall brightness of the universe
  galaxy: { x: 0.12, y: 0.08, size: 0.34, tilt: 0.55, squash: 0.42 },   // in cat heights, where it sits at his home yaw
  hum: { gain: 0.05 },                        // the drone while it is open (0 = off)
  drift: 1,                                   // how fast the sky's layers drift (0 = a still sky)
  cutscene: {
    spin: 14,            // rad/s he spins at when it takes over (a faster spin keeps its speed; the sigil spins him up)
    spinDown: 5,         // seconds the spin takes to wind down to rest
    // then it holds until a click or tap (playtest 2), counted once the way in has finished (below), so the swipes
    // that opened it never close it
    dimIn: 6.6,          // seconds for the dark to close in from the edges (3x the old 2.2 s: playtest 2)
    dimOut: 1.8,         // seconds for it to ease back out (the felt knits back in at the same time)
    dark: 1,             // how dark the page gets at the deepest point: opaque, nothing on the page shows through
                         // (e1111-58: "the background should also not be see through")
    stars: 0.7,          // faint stars in the dark around him
    glow: 0.6,           // the halo hugging his outline in the dark
  },
};
const HOLE = GALAXY;

// ---------------------------------------------------------------------------------------------------------------
// The noise texture: four independent tileable fbm fields (RGBA), 256x256, built once (about 20 ms).
// R, G: broad gas (base period 4 cells), B: medium (6), A: fine (12). Each normalised to 0..1.
// ---------------------------------------------------------------------------------------------------------------
function makeNoise(THREE, N = 256) {
  const data = new Uint8Array(N * N * 4);
  let seed = 1337;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const field = (period, octaves) => {
    const out = new Float32Array(N * N);
    let amp = 1;
    for (let o = 0, P = period; o < octaves; o++, P *= 2, amp *= 0.5) {
      const g = new Float32Array(P * P * 2);
      for (let i = 0; i < P * P; i++) { const a = rnd() * Math.PI * 2; g[i * 2] = Math.cos(a); g[i * 2 + 1] = Math.sin(a); }
      const s = P / N;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const fx = x * s, fy = y * s, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const dot = (cx, cy) => { const k = ((cy % P) * P + (cx % P)) * 2; return g[k] * (tx - (cx - ix)) + g[k + 1] * (ty - (cy - iy)); };
        const u = tx * tx * tx * (tx * (tx * 6 - 15) + 10), v = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
        const a = dot(ix, iy) + (dot(ix + 1, iy) - dot(ix, iy)) * u;
        const b = dot(ix, iy + 1) + (dot(ix + 1, iy + 1) - dot(ix, iy + 1)) * u;
        out[y * N + x] += (a + (b - a) * v) * amp;
      }
    }
    let lo = Infinity, hi = -Infinity;
    for (const v of out) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo);
    return out;
  };
  const chans = [field(4, 5), field(4, 5), field(6, 5), field(12, 4)];
  for (let i = 0; i < N * N; i++) for (let c = 0; c < 4; c++) data[i * 4 + c] = Math.round(chans[c][i] * 255);
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------------------------------------------
// The shader. Coordinates: `cp` = (pixel - cat centre) / cat height in pixels, y up, so the universe has the same
// framing on a phone and a desktop. Colours are linear (tone mapping follows).
// ---------------------------------------------------------------------------------------------------------------
const FRAG = /* glsl */`
uniform float uHole, uHoleClock, uHoleWarpT, uHoleWarp, uHoleDrift, uHoleExp, uHoleDir;
uniform vec3 uHoleCat;           // centre x, y (px), cat height (px)
uniform vec4 uHoleGal;           // galaxy x, y, size (cat heights), tilt
uniform float uHoleSquash;
uniform sampler2D uHoleNoise;
const float H_TAU = 6.2831853;

float hHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hHash2(vec2 p) { float a = hHash(p); return vec2(a, hHash(p + a * 19.19 + 3.1)); }
vec4 hTex(vec2 p) { return texture2D(uHoleNoise, p); }

// Star colour by temperature: blue-white, white, yellow, orange.
vec3 hTemp(float h) {
  vec3 c = mix(vec3(0.55, 0.7, 1.0), vec3(1.0, 0.97, 0.94), smoothstep(0.0, 0.3, h));
  c = mix(c, vec3(1.0, 0.82, 0.55), smoothstep(0.55, 0.8, h));
  return mix(c, vec3(1.0, 0.5, 0.3), smoothstep(0.9, 1.0, h));
}

// One layer of point stars on a grid that repeats every 'per' cells across.
vec3 hStars(vec2 p, float per, float density, float size, float seed) {
  float px = max(fwidth(p.x), 1e-4);   // derivatives before any early return (undefined after one on some GPUs)
  vec2 id = floor(p), f = fract(p) - 0.5;
  vec2 key = vec2(mod(id.x, per), id.y) + seed;
  float h = hHash(key);
  if (h > density) return vec3(0.0);
  vec2 o = (hHash2(key + 7.1) - 0.5) * 0.6;
  float b = hHash(key + 3.3);
  float s = max(size * (0.35 + b * b * 1.4), px * 0.6);   // never thinner than a pixel: no shimmer
  vec2 q = f - o;
  float core = exp(-dot(q, q) / (s * s));
  float tw = 0.78 + 0.22 * b;   // steady emission: motion comes from the sky, never brightness pulses
  return hTemp(fract(h * 7.13 + b)) * core * tw * (0.35 + 1.1 * b * b) * min(1.0, size / s * 1.4);
}

// Sparse bright stars with a halo and four diffraction spikes.
vec3 hBright(vec2 p, float per, float seed) {
  float px = max(fwidth(p.x), 1e-4), w = px * 0.8 + 0.002;
  vec2 id = floor(p), f = fract(p) - 0.5;
  vec2 key = vec2(mod(id.x, per), id.y) + seed;
  float h = hHash(key);
  if (h > 0.22) return vec3(0.0);
  vec2 q = f - (hHash2(key + 1.7) - 0.5) * 0.25;
  float d2 = dot(q, q);
  float core = exp(-d2 / (0.0008 + px * px));
  float halo = exp(-sqrt(d2) * 11.0) * 0.28;
  float spikes = exp(-abs(q.y) / w) * exp(-abs(q.x) * 6.5) + exp(-abs(q.x) / w) * exp(-abs(q.y) * 6.5);
  // ...faded out before their grid cell's edge (fx lane, playtest 3): cut there, they drew faint straight lines and squares
  spikes *= (1.0 - smoothstep(0.3, 0.5, abs(f.x))) * (1.0 - smoothstep(0.3, 0.5, abs(f.y)));
  float tw = 0.88 + 0.12 * h;
  float b = 0.55 + 0.45 * hHash(key + 9.9);
  return hTemp(fract(h * 23.7)) * (core * 2.2 + halo + spikes * 0.55) * tw * b;
}

// Nebula: domain-warped gas, teal into magenta, gold where it's densest, dark dust lanes across it.
// Two scales: a broad soft glow (the body of the cloud) and finer wisps riding on it.
vec3 hNebula(vec2 p, float t) {
  vec2 w = vec2(hTex(p * 0.5 + vec2(t * 0.012, 0.0)).g, hTex(p * 0.5 + vec2(0.37, 0.61 - t * 0.009)).b) - 0.5;
  vec2 q = p + w * 0.45;
  float body = hTex(q * 0.5 + 0.23).r;                                   // broad
  float wisp = hTex(q).r * 0.6 + hTex(q * 2.0 + 0.31).b * 0.28 + hTex(q * 4.0 + 0.7).a * 0.12;
  float dens = smoothstep(0.3, 0.95, body * 0.55 + wisp * 0.45);
  float hue = hTex(q * 0.5 + vec2(0.17, 0.53)).g * 0.7 + hTex(q * 1.5 + 0.4).b * 0.3;
  vec3 col = mix(vec3(0.0, 0.42, 0.5), vec3(0.75, 0.02, 0.36), smoothstep(0.42, 0.58, hue));
  col = mix(col, vec3(0.12, 0.04, 0.45), smoothstep(0.66, 0.85, hue) * 0.8);       // violet edges
  float hot = smoothstep(0.55, 1.0, dens);
  col = mix(col, vec3(1.0, 0.58, 0.22), hot * hot * 0.9);                       // gold, lit from within
  float glow = dens * dens * 1.5 + hot * hot * 1.8;
  float dust = smoothstep(0.5, 0.72, hTex(q * 1.5 + vec2(0.5, 0.2)).a * 0.45 + hTex(q * 0.75 + 0.9).r * 0.55);
  vec3 wash = mix(vec3(0.003, 0.004, 0.014), vec3(0.016, 0.004, 0.02), hue) * (0.4 + body);
  return (col * glow + wash) * (1.0 - dust * 0.8);
}

// A spiral galaxy: warm core, blue arms with pink star-forming knots, dust lanes on the arms' inner edges.
vec3 hGalaxy(vec2 p, float t) {
  float c = cos(uHoleGal.w), s = sin(uHoleGal.w);
  p = mat2(c, -s, s, c) * p;
  p.y /= uHoleSquash;
  float r = length(p);
  float a = atan(p.y, p.x) + t * 0.05;
  float kn = hTex(p * 0.9 + vec2(a * 0.05, 0.3)).a;   // before the early return (mip level needs derivatives)
  if (r > 1.6) return vec3(0.0);
  float lr = log(r + 0.03);
  float arm = pow(0.5 + 0.5 * cos(2.0 * (a - 2.4 * lr)), 3.0);
  float lane = pow(0.5 + 0.5 * cos(2.0 * (a - 2.4 * lr) + 1.0), 10.0);
  float disk = exp(-r * 3.0);
  float knots = smoothstep(0.62, 0.85, kn) * arm;
  float bulge = exp(-r * r * 38.0);
  vec3 col = vec3(0.45, 0.6, 1.0) * arm * disk * 1.6 + vec3(0.25, 0.22, 0.4) * disk * 0.5;
  col += vec3(1.0, 0.3, 0.55) * knots * disk * 2.2;
  col *= 1.0 - lane * smoothstep(0.08, 0.3, r) * 0.85;
  col += vec3(1.0, 0.8, 0.52) * (bulge * 3.0 + exp(-r * 9.0) * 0.6);
  return col * smoothstep(1.6, 0.9, r);
}

// Warp: the Windows "Starfield" screensaver, streaming out of his chest. Polar cells (angle x log radius), each
// column's rows staggered so no rings line up; streaks stay a pixel or two wide at any size.
vec3 hWarp(vec2 cp, float t, float streak) {
  float r = length(cp), a = atan(cp.y, cp.x) / H_TAU;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i), per = 90.0 + fi * 47.0;
    float gx = a * per, fw = max(fwidth(gx), 1e-4);
    float column = floor(gx);
    float ckey = mod(column, per) + fi * 11.0;
    float gy = log(r + 0.002) * 2.5 - t * (2.0 + fi * 0.8) + hHash(vec2(ckey, 4.0)) * 7.0;
    float row = floor(gy), fy = fract(gy);
    vec2 key = vec2(ckey, row);
    float h = hHash(key);
    if (h > 0.5) continue;
    float len = mix(0.02, 0.6, streak);
    float cx = 0.2 + 0.6 * hHash(key + 5.0), cy = hHash(key + 8.0) * (1.0 - len);
    float dxPix = (fract(gx) - cx) / fw;
    float dy = max(0.0, abs(fy - cy - len * 0.5) - len * 0.5);
    float s = exp(-dxPix * dxPix * 0.6) * exp(-dy * dy * 1500.0) * smoothstep(cy, cy + len, fy) ;
    col += hTemp(fract(h * 9.1)) * s * smoothstep(0.03, 0.4, r) * (0.8 + 1.2 * hHash(key + 2.0));
  }
  return col;
}

// The whole universe at this pixel. fres: 0 facing us, 1 at the silhouette. nrm: view-space normal.
vec3 holeUniverse(vec2 frag, float fres, vec3 nrm, out float reveal, out vec3 front, out float scorch) {
  vec2 cp = (frag - uHoleCat.xy) / uHoleCat.z;

  // Opening and closing: a ragged front from his chest outward, glowing where it passes.
  float field = length(cp * vec2(1.15, 0.85)) * 1.25 + (hTex(cp * 0.9 + 0.13).a - 0.5) * 0.5;
  float L = uHole * 1.4 - 0.28;          // -0.28 = all felt, 1.12 = all space
  reveal = 1.0 - smoothstep(L - 0.05, L + 0.01, field);
  float edge = exp(-abs(field - L) * 70.0) * smoothstep(0.0, 0.08, uHole) * smoothstep(1.0, 0.85, uHole);
  float embers = step(0.95, hHash(floor(cp * 160.0))) * smoothstep(L + 0.1, L, field) * step(L, field);
  float charred = smoothstep(L + 0.09, L + 0.01, field) * step(L, field);   // a dark scorch just outside the edge
  // opening burns gold; closing knits back cool violet and ends in one soft star in his chest
  vec3 edgeCol = uHoleDir > 0.0 ? vec3(1.0, 0.55, 0.25) : vec3(0.45, 0.4, 1.0);
  vec3 emberCol = uHoleDir > 0.0 ? vec3(0.75, 0.4, 1.0) : vec3(0.5, 0.85, 1.0);
  front = (edgeCol * edge * 1.6 + emberCol * embers * 1.2) * smoothstep(0.0, 0.05, uHole);
  scorch = charred * smoothstep(0.0, 0.05, uHole);
  if (uHoleDir < 0.0 && uHole < 0.2) {
    float k = smoothstep(0.0, 0.06, uHole) * smoothstep(0.2, 0.1, uHole);
    vec2 sc = cp * 60.0;
    float spark = exp(-dot(sc, sc) * 0.5) * 1.6 + exp(-length(sc) * 0.6) * 0.3
                + (exp(-abs(sc.y) * 2.5) * exp(-abs(sc.x) * 0.25) + exp(-abs(sc.x) * 2.5) * exp(-abs(sc.y) * 0.25)) * 0.35;
    front += vec3(0.75, 0.82, 1.0) * spark * k;
  }

  // Lensing: light near his outline (and near the opening front) bends, magnifying the sky toward the edge.
  vec2 lens = -nrm.xy * pow(fres, 4.0) * 0.05 + normalize(cp + 1e-4) * edge * 0.03;
  vec2 sp = cp + lens;

  // The sky is fixed on the screen (he is a window onto it); each layer drifts at its own rate, nearer faster.
  vec2 dr = vec2(0.8, 0.35) * uHoleDrift;   // cat heights the nearest stars have drifted
  float calm = 1.0 - uHoleWarp * 0.75;   // the sky dims as warp takes over

  vec3 col = vec3(0.002, 0.002, 0.008);
  col += hNebula(sp + dr * 0.08 + vec2(0.31, 0.12), uHoleClock) * calm;
  vec2 gp = (sp - uHoleGal.xy - dr * 0.12) / uHoleGal.z;   // the galaxy, in his face at rest
  col += hGalaxy(gp, uHoleClock) * calm;
  col += hStars((sp + dr * 0.25) * 46.0, 1e4, 0.55, 0.06, 0.0) * 0.55 * calm;    // far: dense, faint
  col += hStars((sp + dr * 0.5) * 22.0, 1e4, 0.4, 0.07, 31.0) * 0.85 * calm;     // middle
  col += hStars((sp + dr) * 9.0, 1e4, 0.28, 0.06, 57.0) * 1.2 * calm;            // near: few, bright
  col += hBright((sp + dr * 0.7) * 4.0, 1e4, 91.0) * calm;
  if (uHoleWarp > 0.001) col += hWarp(sp, uHoleWarpT, uHoleWarp) * uHoleWarp * 1.4;

  // Event-horizon rim along the silhouette: deep blue into hot gold right at the edge.
  float rim = pow(fres, 7.0);
  col = col * (1.0 - rim * 0.6) + mix(vec3(0.1, 0.25, 0.9), vec3(1.0, 0.7, 0.4), pow(fres, 14.0)) * rim * 0.7;
  return col * uHoleExp;
}`;

// The full-screen pass. uMask: the cat's picture (premultiplied, mip-mapped: a coarse level is a ready-made blur),
// placed by uRect (where the picture sits in the drawing buffer) and uMaskUv (how much of the texture is in use).
// uSolid: what sits on him and stays solid (the butter). Output is premultiplied, so the front's glow adds.
const OVERLAY_VERT = /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const OVERLAY_FRAG = /* glsl */`
uniform sampler2D uMask, uSolid;
uniform vec2 uRes, uMaskUv;      // drawing-buffer size, px; the used part of the picture
uniform vec4 uRect;              // the picture's place in the drawing buffer: x, y (from the bottom), w, h
uniform float uSky, uDim, uDimT, uDark, uStars, uGlow, uLod;
${FRAG}
float maskAt(vec2 frag, float lod) {
  vec2 q = (frag - uRect.xy) / uRect.zw;
  if (q.x <= 0.0 || q.y <= 0.0 || q.x >= 1.0 || q.y >= 1.0) return 0.0;
  return textureLod(uMask, q * uMaskUv, lod).a;
}
// The halo's blur, carried on past his picture's box (fx lane, playtest 3, IMG5: where he comes near the box's side or
// bottom, as the loaf, the sleep and the stretch do, the glow ended in a hard straight line). Outside the box the blur
// carries on from the box's edge: falling at the slope it had coming up to the edge (one mip texel back inside), and
// fading over that texel's width (in drawing-buffer pixels) wherever it was not falling, so no edge is left in it.
// Nine taps a texel and a half apart on the level below (a tent) make the blur, as wide as before: the finer level still knows the empty margin
// under his feet, so the glow fades out inside the box instead of being clamped flat at its edge (a tiny, cached mip).
float haloTap(vec2 frag, float lod, float reach) {
  vec2 q = (frag - uRect.xy) / uRect.zw, qc = clamp(q, 0.0, 1.0);
  float v = textureLod(uMask, qc * uMaskUv, lod).a;
  vec2 out_ = (q - qc) * uRect.zw;                                   // pixels past the box (0 inside it)
  float dist = length(out_);
  if (dist > 0.0) {
    vec2 back = clamp(qc - out_ / dist * reach / uRect.zw, 0.0, 1.0);
    float slope = min(0.0, v - textureLod(uMask, back * uMaskUv, lod).a) / reach;
    v = max(0.0, v + slope * dist) * exp(-dist * dist / (reach * reach));
  }
  return v;
}
float haloAt(vec2 frag, float lod) {
  float reach = exp2(lod) * uRect.z / (uMaskUv.x * float(textureSize(uMask, 0).x));
  // only near him: far past the box, or where a coarser look finds nothing of him around, there is no glow (one fetch)
  vec2 q = (frag - uRect.xy) / uRect.zw, past = (q - clamp(q, 0.0, 1.0)) * uRect.zw;
  if (dot(past, past) > 9.0 * reach * reach || haloTap(frag, lod + 2.0, 4.0 * reach) < 0.02) return 0.0;
  float sum = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++)
    sum += float((2 - abs(i)) * (2 - abs(j))) * haloTap(frag + vec2(float(i), float(j)) * reach * 1.5, lod, reach);
  return sum / 16.0;
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  float m = 0.0, soft = 0.0;
  if (uSky > 0.5) {
    m = min(1.0, maskAt(fc, 0.0) * 2.0);          // doubled: thin, faint splats (whiskers) still count as him
    soft = maskAt(fc, uLod);                      // blurred: 1 deep inside him, 0.5 on his outline, 0 well outside
    vec2 q = (fc - uRect.xy) / uRect.zw;
    m *= 1.0 - smoothstep(0.15, 0.6, texture2D(uSolid, clamp(q, 0.0, 1.0) * uMaskUv).a);   // the butter stays butter
  }
  vec3 col = vec3(0.0); float a = 0.0;
  if (uSky > 0.5 && uHole > 0.0) {
    vec2 px = vec2(12.0);
    vec2 g = vec2(maskAt(fc + vec2(px.x, 0.0), uLod) - maskAt(fc - vec2(px.x, 0.0), uLod),
                  maskAt(fc + vec2(0.0, px.y), uLod) - maskAt(fc - vec2(0.0, px.y), uLod));
    vec3 nrm = vec3(-g / max(length(g), 1e-4) * min(1.0, length(g) * 4.0), 0.0);   // outward along his outline
    float fres = clamp(1.0 - (soft - 0.5) * 2.0, 0.0, 1.0) * step(0.001, m);
    if (soft > 0.002) {                                // only near him (blurred, so whole 2x2 quads agree at the edge)
      float reveal, scorch; vec3 front;
      vec3 sky = holeUniverse(fc, fres, nrm, reveal, front, scorch);
      col = (sky * reveal + front) * m;
      a = m * max(reveal, scorch * 0.7);
    }
  }
  if (uDim > 0.0) {
    // The dark closes in from the screen's edges toward him; its front is ragged and wheels slowly round him.
    vec2 cp = (fc - uHoleCat.xy) / uHoleCat.z;
    float rn = length(fc - uHoleCat.xy) / length(uRes) * 1.6;   // ~0 at him, ~1 at the far corner
    float ang = atan(cp.y, cp.x), r = length(cp);
    float wheel = uDimT * 0.12 / (0.25 + r);          // uDimT already advances at 30% in reduced motion
    vec2 sw = vec2(cos(ang + wheel), sin(ang + wheel)) * r;
    float rag = (hTex(sw * 0.6 + 0.37).r - 0.5) * 0.35;
    float f = mix(1.25, -0.62, uDim);                 // fully closed (every pixel dark) at the deepest point
    float dark = smoothstep(f, f + 0.4, rn + rag) * uDark;
    // Deep space: near black, with only the faintest grey dust where the nebula would be (e1111-58: the background
    // swirl was too colourful; the colour belongs to the galaxy in his outline).
    float deep = uSky * smoothstep(0.0, 0.8, uDim);
    vec3 neb = hNebula(sw * 0.8 + 3.1, uDimT);
    vec3 space = vec3(0.0010, 0.0011, 0.0016) + vec3(0.8, 0.85, 1.0) * dot(neb, vec3(0.2126, 0.7152, 0.0722)) * mix(0.012, 0.007, deep);
    space += (hStars(sw * 22.0, 1e4, 0.35, 0.07, 13.0) + hStars(sw * 9.0, 1e4, 0.2, 0.06, 71.0) * 1.3) * uStars;
    float halo = uSky > 0.5 && m < 0.999 ? haloAt(fc, uLod) : 0.0;   // a soft glow round his outline (none over him)
    vec3 glow = mix(vec3(0.35, 0.2, 0.9), vec3(1.0, 0.6, 0.3), halo) * smoothstep(0.03, 0.6, halo) * (1.0 - halo) * uGlow * uDim;
    float out_ = 1.0 - m;
    col += (space * dark + glow) * out_;
    a += dark * out_;
  }
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export default function createGalaxy(site) {
  const { stage, cat, audio, input, keepsakes, THREE } = site;
  const G = HOLE.galaxy, CUT = HOLE.cutscene;
  const uniforms = {
    uHole: { value: 0 }, uHoleClock: { value: 0 }, uHoleWarpT: { value: 0 }, uHoleWarp: { value: 0 },
    uHoleDrift: { value: 0 }, uHoleExp: { value: HOLE.exposure }, uHoleDir: { value: 1 },
    uHoleCat: { value: new THREE.Vector3(0, 0, 1) },
    uHoleGal: { value: new THREE.Vector4(G.x, G.y, G.size, G.tilt) }, uHoleSquash: { value: G.squash },
    uHoleNoise: { value: makeNoise(THREE) },
    uMask: { value: cat.picture }, uSolid: { value: cat.solids }, uRes: { value: new THREE.Vector2(1, 1) }, uMaskUv: { value: new THREE.Vector2(1, 1) },
    uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uSky: { value: 1 }, uLod: { value: 4 },
    uDim: { value: 0 }, uDimT: { value: 0 }, uDark: { value: CUT.dark }, uStars: { value: CUT.stars }, uGlow: { value: CUT.glow },
  };
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, vertexShader: OVERLAY_VERT, fragmentShader: OVERLAY_FRAG,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  }));
  overlay.name = 'galaxy'; overlay.frustumCulled = false; overlay.renderOrder = 1e6; overlay.visible = false;
  stage.scene.add(overlay);
  stage.warm(overlay);

  // Where the portal is anchored, in drawing-buffer pixels (y up): on his turntable's axis at his middle height, scaled
  // by his height. Turning him leaves all three unchanged. And where his picture sits, for the mask.
  const size = new THREE.Vector2(), v = new THREE.Vector3(), s = {};
  function frame() {
    stage.renderer.getDrawingBufferSize(size);
    const d = stage.dpr, h = cat.height;
    stage.toScreen(v.set(0, cat.spin.position.y + h / 2, 0), s);
    uniforms.uHoleCat.value.set(s.x * d, size.y - s.y * d, Math.max(1, cat.rect.ppu * h * d));
    uniforms.uRes.value.copy(size);
    const r = cat.rect;
    uniforms.uRect.value.set(r.x * d, size.y - (r.y + r.h) * d, r.w * d, r.h * d);
    uniforms.uMaskUv.value.copy(cat.uv);
    uniforms.uLod.value = Math.log2(Math.max(1, 16 * cat.quality / d));      // about 16 screen pixels of blur
  }

  // A breathing fifth and distant glass dust, faded with the existing aperture envelope.
  audio.load('galaxy-hum');
  let hum = null, humAt = 0;
  function humLevel(level) {
    if (!HOLE.hum.gain || (Math.abs(level - humAt) < 0.02 && (hum || level <= 0) && !(level <= 0 && hum))) return;
    humAt = level;
    if (!hum && level > 0) {
      hum = audio.loop('galaxy-hum', { cross: .8 });
    }
    hum?.gain(level * HOLE.hum.gain * 4, .24);
    if (hum && level <= 0) {
      hum.stop(.24); hum = null;
    }
  }

  // The page's words and buttons fade into the dark with it (the spiral into the black hole's disk went with the
  // hole). The furniture's buttons (shelf, pinboard, rack, the box's baking panel) are page chrome too. Only opacity
  // changes, and only while the dark is moving; each element's own inline opacity comes back afterwards.
  const CHROME = '.top > *, #footer > *, #ink, #back, #front, .world-furniture-actions';
  const CHROME_WITH_SOUND = '.top > *, #footer > :not(.fl), #footer .fl > :not(.sound), #ink, #back, #front, .world-furniture-actions';
  let pulled = null, pulledAt = -1;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function pullChrome(k) {
    if (k <= 0) {
      if (pulled) for (const { el, value, priority, will } of pulled) {
        if (value) el.style.setProperty('opacity', value, priority); else el.style.removeProperty('opacity');
        el.style.willChange = will;
      }
      pulled = null; pulledAt = -1; return;
    }
    if (!pulled) {
      pulled = [...document.querySelectorAll(st.open || st.space ? CHROME_WITH_SOUND : CHROME)].map(el => ({
        el, value: el.style.getPropertyValue('opacity'), priority: el.style.getPropertyPriority('opacity'), will: el.style.willChange }));
      // speed lane (e1112-59, cost 3): a compositor layer each while the dark moves, so a frame fades layers instead
      // of painting the words again (restored when it ends)
      for (const { el } of pulled) el.style.willChange = 'opacity';
    }
    const o = (1 - smooth(0.1, 0.88, k)).toFixed(3);
    if (o === pulledAt) return;
    pulledAt = o;
    for (const { el } of pulled) el.style.opacity = o;
  }

  // The blast-off's space (gags lane, playtest 3): the page goes under the dark as it does for the galaxy (the
  // takeover class: stickers, his speech and the badge reveal step aside, the sound control stays, lit), and his
  // picture (the bread) is drawn after the dark, over it, without the depth test. Put back when the dark has gone.
  let lifted = null;
  function lift(on) {
    if (!!lifted === on) return;
    if (on) {
      const sprite = cat.sprite; if (!sprite) return;
      lifted = { sprite, order: sprite.renderOrder, depth: sprite.material.depthTest };
      sprite.renderOrder = overlay.renderOrder + 1; sprite.material.depthTest = false;
      document.body.classList.add('galaxy-showing');
    } else {
      lifted.sprite.renderOrder = lifted.order; lifted.sprite.material.depthTest = lifted.depth; lifted = null;
      if (!st.open) document.body.classList.remove('galaxy-showing');
    }
  }

  // Timeline: trigger -> takeover (locked; the hole opens and the dark closes in while he spins fast, then winds down
  // to rest over `spinDown`) -> hold (the galaxy stays until a click, a tap or Esc) -> recede (dark out, felt back)
  // -> unlocked. The way in is everything that moves at the start: the dissolve, the dark and the wind-down.
  const WAY_IN = Math.max(HOLE.openSeconds, CUT.dimIn, CUT.spinDown);
  css('galaxy', 'body.galaxy-hold canvas#c { cursor: pointer; }');   // the hold: a click brings him back
  const st = { level: 0, fast: 0, lastFast: -1e9, open: false, by: null, warpT: 0, clock: 0, warp: 0, pin: null, dir: 1,
    at: null, v0: 0, sign: 1, cancelTurn: null, recede: false, dim: 0, dimT: 0, turnDir: 1, dimPin: null, trips: 0, space: null };
  function open(by = 'spin') {
    if (st.open && st.by !== 'pin') return false;   // already under way
    if (cat.hidden || cat.standIn || st.space) return false;
    const speed = Math.abs(cat.vel);
    st.open = true; st.by = by; st.at = stage.clock; st.recede = false;
    st.sign = Math.sign(cat.vel) || st.turnDir;
    st.v0 = stage.reducedMotion ? Math.min(speed, 1) : Math.max(speed, CUT.spin);
    st.cancelTurn = cat.landFacing(CUT.spinDown, stage.reducedMotion ? 0 : cat.vel, stage.reducedMotion ? 0 : st.sign * st.v0);
    input.lock('galaxy', true);document.body.classList.add('galaxy-showing');
    site.achievements?.unlock('void');
    cat.wantSolids = true; cat.touch();
    if (by === 'spin') site.registry.find('star');                        // the star is found by spinning (a secret)
    return true;
  }
  const taking = () => st.at !== null && !st.recede;
  const holding = () => taking() && stage.clock - st.at >= WAY_IN;
  function skip() { if (taking()) { st.cancelTurn?.(); st.recede = true; document.body.classList.remove('galaxy-hold'); } }
  input.onEscape.push(skip);                                               // Esc: at any point
  // A click or tap anywhere (input.js hands this the presses the lock swallows), once the way in has finished.
  input.onLockedPress?.push(() => { if (holding()) skip(); });

  stage.onFrame.push((dt) => {
    const speed = Math.abs(cat.vel);
    if (speed > 0.5) st.turnDir = Math.sign(cat.vel);
    // the spin trigger: time above the speed fills a tally, which drains when he slows. Only the player's own spin
    // counts (cat.vel): the circle's twenty turns never touch it.
    if (!st.open) {
      const S = HOLE.spin, bread = site.eggs.bread, need = bread?.isBread ? S.bread : S.seconds;
      if (speed > S.speed) st.lastFast = stage.clock;
      const spinning = speed > S.speed || stage.clock - st.lastFast < S.gap;
      st.fast = Math.min(need, Math.max(0, st.fast + (spinning ? dt : -dt * S.decay)));
      if (st.fast >= need) {
        // While he is bread, the same really fast spin sends the bread to space (the blast-off; it used to be the star
        // sigil cast while he was bread). Either way the tally starts again.
        if (bread?.isBread) { st.fast = 0; site.registry.find('blastoff'); bread.blastOff(); }
        else if (open('spin')) st.fast = 0;
      }
    }
    if (holding() !== document.body.classList.contains('galaxy-hold')) document.body.classList.toggle('galaxy-hold', holding());
    // The cat owns a planned angle curve through the whole wind-down, ending
    // exactly face-on with zero speed; no residual damping or end correction.
    const want = st.open && (st.by === 'pin' || taking()) ? 1 : 0;
    const cut = taking();
    // the dissolve runs at a steady pace (the shader shapes it), not an exponential fade
    st.level = Math.min(1, Math.max(0, st.level + (want ? dt / HOLE.openSeconds : -dt / HOLE.closeSeconds)));
    if (st.space) {                                                        // lent to the blast-off: just the dark
      const sp = st.space;
      st.dim = Math.min(1, Math.max(0, st.dim + (sp.on ? dt / sp.seconds : -dt / sp.seconds)));
      if (!sp.on && st.dim <= 0) st.space = null;
    } else st.dim = Math.min(1, Math.max(0, st.dim + (cut ? dt / CUT.dimIn : -dt / CUT.dimOut)));
    st.dir = want ? 1 : -1;
    if (st.pin) { st.level = st.pin.level; st.dir = st.pin.dir; }   // screenshots: hold a moment of the dissolve
    if (st.dimPin !== null) st.dim = st.dimPin;
    if (st.open && !want && st.level <= 0 && st.dim <= 0) {
      st.open = false; st.fast = 0; st.at = null; st.trips++;
      input.lock('galaxy', false);document.body.classList.remove('galaxy-showing'); cat.fling(0); cat.wantSolids = false;
      if (st.by !== 'pin' && st.by !== 'unpinned' && !keepsakes.has('postcard')) keepsakes.give('postcard', { from: cat.pivotPx });
    }
    cat.freeze('galaxy', st.open);   // frozen in the pose he had when it opened, until it has fully closed
    humLevel(Math.max(st.level, st.dim));
    pullChrome(st.dim);
    lift(!!st.space && st.dim > 0);
    const active = st.level > 0 || st.dim > 0;
    overlay.visible = active;
    if (!active) { uniforms.uHole.value = 0; uniforms.uDim.value = 0; return; }
    // Lent to the blast-off, the dark covers everything exactly as the galaxy's does (playtest 3, gags lane: "it needs
    // to cover all the other stuff just like the regular galaxy scene does"); only the bread is drawn over it (his
    // picture is lifted above the dark below, while the space lasts). No cut-out: the bread flies off his place.
    uniforms.uSky.value = st.space ? 0 : 1;
    uniforms.uDark.value = CUT.dark;
    overlay.renderOrder = 1e6;
    const W = HOLE.warp, calm = stage.reducedMotion ? 0.3 : 1;
    const shownSpeed = taking() ? Math.abs(cat.yawRate) : speed;
    st.warp += ((stage.reducedMotion ? 0 : smooth(W.from, W.full, shownSpeed)) - st.warp) * Math.min(1, dt * 4);
    st.warpT += dt * Math.min(W.max, W.base + shownSpeed * W.perRad) * calm;
    st.clock += dt * calm;
    st.dimT += dt * calm;
    uniforms.uHole.value = st.level;
    uniforms.uHoleDir.value = st.dir;
    uniforms.uHoleClock.value = st.clock;
    uniforms.uHoleWarpT.value = st.warpT;
    uniforms.uHoleWarp.value = st.warp;
    uniforms.uHoleDrift.value = st.clock * 0.012 * HOLE.drift;
    uniforms.uDim.value = smooth(0, 1, st.dim);
    uniforms.uDimT.value = st.dimT;
  });
  // after the cat's picture is drawn this frame: where it sits now
  stage.onRender.push(() => { if (overlay.visible) frame(); });

  const cards=cardService(site);
  cards.define({
    id: 'postcard', label: 'the postcard from the void', size: 0.44, aspect: 0.667, home: () => ({ x: 1.05, y: 0.28 }),
    // a tap flips it in place, as before integration to-do 6 (cards lane, playtest 3: "Clicking the void paper and flipping it was fine")
    tap(inst) { cards.flip(inst); audio.play('paper', { gain: 0.5, rate: 0.9 + Math.random() * 0.25 }); },
  }, 'Greetings from THE VOID\nnothing for miles\n\nwish you were here.\nthere is nothing here.\nit is very nice.\n— the cat\n\nStamp: B');
  audio.load('paper');

  const api = {
    find: 'star', open, config: HOLE, uniforms, skip,
    get level() { return st.level; }, get isOpen() { return st.open; }, get dim() { return st.dim; }, get trips() { return st.trips; },
    get cutscene() { return taking(); }, get fast() { return st.fast; }, get holding() { return holding(); }, wayIn: WAY_IN,
    get phase() { if (!st.open) return st.space ? 'space' : 'closed'; if (st.at === null) return st.by; if (st.recede) return 'recede'; return holding() ? 'hold' : 'spin'; },
    // the dark alone, for the bread's blast-off: closes in over `seconds`, or eases back out
    space(on, seconds = 1) { if (st.open) return; st.space = { on, seconds }; },
    pin(level, dir = 1) {                                        // screenshots: hold a moment of the dissolve
      st.pin = level == null ? null : { level, dir };
      if (level != null && !st.open) { st.open = true; st.by = 'pin'; st.at = null; cat.wantSolids = true; cat.touch(); }
      if (level == null && st.by === 'pin') st.by = 'unpinned';   // let go: it closes, and leaves no postcard (fx lane checks)
    },
    pinDim(k) { st.dimPin = k == null ? null : k; },
    again: () => open('again'),                                  // the grimoire's mark pressed again
  };
  stage.debugExtra.push(() => `galaxy  ${st.level.toFixed(2)} ${api.phase}${input.locked ? ' LOCKED' : ''}  fast ${st.fast.toFixed(1)} s  warp ${st.warp.toFixed(2)}  dim ${st.dim.toFixed(2)}`);
  return api;
}
