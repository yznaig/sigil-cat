// The bolt (the zig-zag sigil): a real storm moment. The page darkens, a leader forks down from the top of the page,
// the bolt connects with his head in a hot white core and a blue glow, the screen flashes once, sparks fly off where it
// hit and a soft afterglow lingers there, the page shakes a little, the energy beam fires, and he jumps. It leaves a
// cloud, which drifts along the top of the page from then on.
// The flash: one per cast, never a strobe, and none at all under prefers-reduced-motion (revamp brief, Decided 5).
// The bolt itself (fx lane, playtest 3, e1113-10: "make the lightning bolt a way sicker/cooler visual effect"): a
// branching, jagged bolt drawn additively ('lighter') into a 2D canvas sized to the bolt's own box, never the whole
// screen: four strokes per path (wide blue glow, halo, blue-white body, white core) with no blur filters. It is drawn
// again only when its shape changes (the leader's 90 ms, then the crackle 24 times a second); its brightness (the
// stroke dying back, two re-strikes: the screen flash stays one, the fade) is the canvas's opacity, which the
// compositor does. The sparks and the strike's glow sprite have their own small canvas round the strike. It lives
// in the storm layer above the dark (a DOM layer over the WebGL canvas: a bolt in the WebGL scene would be under the
// dark at 28%). Calm motion: no leader, crackle, sparks, flash or shake; it fades in and out, the afterglow stays.
// The cloud is the page's one volumetric thing: a small ray-marched cumulus, lit from above (style clash, on purpose).
// It is drawn into its own little picture a few times a second, so it costs next to nothing.
// Tap the cloud: it grumbles and lights up inside. A bolt while there is a puddle on the floor goes through the water
// (src/combos.js, 'shock').
import { css, el, clamp, rand, smooth, rawPicture } from '../core/util.js';

export const BOLT = {
  darken: 0.45,          // seconds for the page to go dark
  dark: 0.72,            // how dark (0-1)
  hold: 0.5,             // seconds of dark after the strike before it lifts
  lift: 1.3,             // seconds for the light to come back
  flash: { peak: 0.85, seconds: 0.22 },   // the one flash: how white, how long it takes to die away
  shake: { px: 7, seconds: 0.4 },
  leader: 0.09,          // seconds the leader takes to fork down from the top (calm: none)
  boltSeconds: 0.75,     // the return stroke, its crackle and its fade
  hot: 0.06,             // seconds it burns at full power before dying back to `glowing`
  glowing: 0.5,          // the lit channel's brightness between re-strikes
  restrikes: [[0.16, 1], [0.31, 0.8]],   // [seconds after the stroke, brightness]: the channel re-lit, not the screen
  fadeFrom: 0.42,        // seconds after the stroke the bolt starts to fade out
  crackleHz: 24,         // how often the channel's fine jitter changes while it is lit
  branches: 6,           // forks off the trunk (each may fork once more)
  // the four strokes, widest first: [width px at a 900 px tall page, red, green, blue, alpha at full power]
  strokes: [[46, 60, 90, 255, 0.09], [19, 110, 145, 255, 0.24], [7.5, 175, 200, 255, 0.6], [3, 255, 255, 255, 1]],
  sparks: { count: 26, speed: [260, 760], life: [0.32, 0.72], gravity: 1500 },
  glow: 240,             // px across, the strike's glow sprite at full power
  after: { px: 260, seconds: 1.6 },   // the afterglow left where it struck
  beamGain: 0.9,         // e1113-10: Aaron's energy beam (assets/audio/designed/bolt-beam.wav)
  cloud: { size: 0.72, aspect: 0.56, drift: 0.16, driftSeconds: 26, crossSeconds: 75, fps: 8, steps: 26,
    arrive: 7 },         // seconds the first cloud takes to float in from the nearer side of the page (e1111-58)
};

css('bolt', `
.storm { position: fixed; inset: 0; z-index: 7; pointer-events: none; }
.storm .dark { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 70% at 50% 45%, #1b2030, #0b0d16); opacity: 0; }
.storm .flash { position: absolute; inset: 0; background: #eef2ff; opacity: 0; }
.storm canvas { position: absolute; left: 0; top: 0; mix-blend-mode: plus-lighter; }   /* light added to the dark page */
.storm .after { position: absolute; left: 0; top: 0; border-radius: 50%; opacity: 0; mix-blend-mode: plus-lighter;
  background: radial-gradient(circle, rgba(225,235,255,.85), rgba(150,175,255,.42) 22%, rgba(95,120,255,.14) 46%, transparent 70%); }
`);

// A jagged path from a to b: midpoint displacement, rougher at the top.
function jag(a, b, rough, depth = 5) {
  let pts = [a, b];
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i], len = Math.hypot(q.x - p.x, q.y - p.y);
      const nx = -(q.y - p.y) / (len || 1), ny = (q.x - p.x) / (len || 1), k = (Math.random() - 0.5) * rough * len;
      next.push({ x: (p.x + q.x) / 2 + nx * k, y: (p.y + q.y) / 2 + ny * k }, q);
    }
    pts = next;
  }
  return pts;
}

// The bolt's shape: the trunk from the top of the page to where it strikes, forks off it (some forking again), and,
// through a puddle, the run along the floor to his feet. Each path: points, where along the trunk it starts (0-1, for
// the leader), its power and whether it tapers to a tip.
function shape(top, end, feet, branches, scale) {
  const trunk = jag(top, end, 0.3, 6), paths = [{ pts: trunk, from: 0, power: 1, taper: false }];
  for (let i = 0; i < branches; i++) {
    const at = rand(0.12, 0.8), k = Math.floor(at * (trunk.length - 1)), from = trunk[k];
    const len = rand(0.09, 0.24) * scale * 900 * (1 - at * 0.4), side = Math.random() < 0.5 ? -1 : 1, ang = side * rand(0.35, 1.0);
    const twig = jag(from, { x: from.x + Math.sin(ang) * len, y: from.y + Math.cos(ang) * len * 0.85 }, 0.42, 4);
    paths.push({ pts: twig, from: at, power: rand(0.45, 0.7), taper: true });
    if (Math.random() < 0.55) {
      const j = Math.floor(rand(0.3, 0.7) * (twig.length - 1)), f2 = twig[j], a2 = ang + side * rand(0.3, 0.7), l2 = len * rand(0.35, 0.6);
      paths.push({ pts: jag(f2, { x: f2.x + Math.sin(a2) * l2, y: f2.y + Math.cos(a2) * l2 * 0.85 }, 0.45, 3), from: at + 0.04, power: rand(0.3, 0.45), taper: true });
    }
  }
  if (feet) paths.push({ pts: jag(end, feet, 0.22, 5), from: 1, power: 0.85, taper: false, run: true });
  return paths;
}

export default function createBolt(site) {
  const { stage, cat, audio, keepsakes, THREE } = site, C = BOLT.cloud;
  audio.load('thunder');      // the cloud's grumble
  audio.load('bolt-beam');    // the strike (e1113-10)
  let busy = false, casts = 0, flashes = 0, lastVia = null;
  // for the checks: bolt redraws, spark-canvas draws, their main-thread ms
  const last = { draws: 0, sparkDraws: 0, drawMs: 0, maxDrawMs: 0, sparks: 0, box: null, paths: 0, afterglows: 0 };

  const root = el('div', 'storm', '<div class="dark"></div><canvas aria-hidden="true"></canvas><canvas aria-hidden="true"></canvas><div class="after"></div><div class="flash"></div>');
  root.setAttribute('aria-hidden', 'true');
  const dark = root.children[0], cvs = root.children[1], spk = root.children[2], after = root.children[3], flash = root.children[4];
  const g = cvs.getContext('2d'), gs = spk.getContext('2d');
  let mounted = false, glowSprite = null;
  // the strike's glow, drawn once: white-hot middle, blue falloff
  function sprite() {
    if (glowSprite) return glowSprite;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(225,235,255,.85)'); gr.addColorStop(0.35, 'rgba(130,160,255,.32)');
    gr.addColorStop(0.65, 'rgba(80,105,255,.08)'); gr.addColorStop(1, 'rgba(60,80,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return (glowSprite = c);
  }

  // Draw the bolt at full power: reach (0-1, the leader's progress down the trunk), jitter (px of crackle, by seed).
  function draw(paths, box, { reach = 1, jitter = 0, seed = 0, k = 1 }) {
    const t0 = performance.now();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvs.width, cvs.height);
    g.setTransform(box.dpr, 0, 0, box.dpr, -box.x * box.dpr, -box.y * box.dpr);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    let s = seed;
    const jit = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2 * jitter;
    for (const p of paths) {
      const own = p.run ? (reach >= 1 ? 1 : 0) : clamp((reach - p.from) / Math.max(0.05, 1 - p.from) * (p.from ? 2.2 : 1));
      if (own <= 0) continue;
      const n = Math.max(2, Math.ceil(own * (p.pts.length - 1)) + 1), pts = p.pts.slice(0, n).map((q, i) => (i && jitter ? { x: q.x + jit(), y: q.y + jit() } : q));
      // a fork tapers to its tip: drawn in four pieces, each thinner and dimmer
      const pieces = p.taper ? 4 : 1, per = Math.ceil((pts.length - 1) / pieces);
      for (const [w, r, gg, b, a] of BOLT.strokes) {
        for (let c = 0; c < pieces; c++) {
          const seg = pts.slice(c * per, c * per + per + 1); if (seg.length < 2) continue;
          const tip = p.taper ? 1 - c / pieces * 0.75 : 1;
          g.lineWidth = w * k * tip * (0.5 + 0.5 * p.power);
          g.strokeStyle = `rgba(${r},${gg},${b},${Math.min(1, a * p.power * tip).toFixed(3)})`;
          g.beginPath(); g.moveTo(seg[0].x, seg[0].y); for (let i = 1; i < seg.length; i++) g.lineTo(seg[i].x, seg[i].y); g.stroke();
        }
      }
    }
    const ms = performance.now() - t0; last.draws++; last.drawMs += ms; last.maxDrawMs = Math.max(last.maxDrawMs, ms);
  }
  // The sparks and the strike's glow, every frame of the stroke, in their own small canvas round the strike.
  function drawSparks(sbox, sparks, glow, k) {
    const t0 = performance.now();
    gs.setTransform(1, 0, 0, 1, 0, 0); gs.clearRect(0, 0, spk.width, spk.height);
    gs.setTransform(sbox.dpr, 0, 0, sbox.dpr, -sbox.x * sbox.dpr, -sbox.y * sbox.dpr);
    gs.globalCompositeOperation = 'lighter'; gs.lineCap = 'round';
    if (glow > 0) { const d = BOLT.glow * k * glow; gs.globalAlpha = Math.min(1, glow); gs.drawImage(sprite(), sbox.ex - d / 2, sbox.ey - d / 2, d, d); gs.globalAlpha = 1; }
    for (const sp of sparks) {
      if (sp.age >= sp.life) continue;
      const u = sp.age / sp.life, a = (1 - u) * (1 - u), tail = 0.045;
      gs.strokeStyle = `rgba(255,${Math.round(200 - 90 * u)},${Math.round(130 - 100 * u)},${(a * 0.55).toFixed(3)})`;   // the ember's trail
      gs.lineWidth = 4 * k * (1 - u * 0.5);
      gs.beginPath(); gs.moveTo(sp.x, sp.y); gs.lineTo(sp.x - sp.vx * tail, sp.y - sp.vy * tail); gs.stroke();
      gs.strokeStyle = `rgba(255,${Math.round(245 - 60 * u)},${Math.round(215 - 110 * u)},${a.toFixed(3)})`;          // its hot head
      gs.lineWidth = 1.8 * k;
      gs.beginPath(); gs.moveTo(sp.x, sp.y); gs.lineTo(sp.x - sp.vx * tail * 0.4, sp.y - sp.vy * tail * 0.4); gs.stroke();
    }
    const ms = performance.now() - t0; last.sparkDraws++; last.drawMs += ms; last.maxDrawMs = Math.max(last.maxDrawMs, ms);
  }

  // The bolt's canvas covers only the bolt's box; the sparks' canvas the square they can fly in round the strike. Both at
  // the screen's sharpness (at most 2x).
  function place(c, box) {
    c.width = Math.ceil(box.w * box.dpr); c.height = Math.ceil(box.h * box.dpr);
    Object.assign(c.style, { width: box.w + 'px', height: box.h + 'px', transform: `translate(${box.x}px, ${box.y}px)`, opacity: '0' });
  }
  function fit(paths, end, k) {
    let x0 = end.x, x1 = end.x, y0 = end.y, y1 = end.y;
    for (const p of paths) for (const q of p.pts) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    const m = 24 * k, dpr = Math.min(2, devicePixelRatio || 1);
    x0 = Math.max(0, Math.floor(x0 - m)); x1 = Math.min(stage.width, Math.ceil(x1 + m));
    y0 = Math.max(0, Math.floor(y0 - m)); y1 = Math.min(stage.height, Math.ceil(y1 + m));
    const box = { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), dpr };
    const r = Math.ceil(Math.max(BOLT.glow / 2, 170) * k), sbox = { x: Math.floor(end.x - r), y: Math.floor(end.y - r), w: 2 * r, h: 2 * r, dpr, ex: end.x, ey: end.y };
    place(cvs, box); place(spk, sbox);
    last.box = box;
    return [box, sbox];
  }

  // The strike. via: a point on the page the bolt goes to first (the puddle), then along the floor to him.
  async function strike({ via = null } = {}) {
    if (busy) return false;
    busy = true; casts++; lastVia = via;
    if(via)site.eggs.glass?.energize();
    if (!mounted) { document.body.appendChild(root); mounted = true; }
    root.style.display = '';
    const calm = stage.reducedMotion;
    await stage.tween(BOLT.darken, (u) => { dark.style.opacity = (smooth(u) * BOLT.dark).toFixed(3); });
    // where it lands: the crown of his head, or the puddle
    const crown = cat.screenOf([cat.seat.position.x, cat.seat.position.y + 0.04, cat.seat.position.z]);
    const end = via ? { x: via.x, y: via.y } : crown;
    const k = clamp(stage.height / 900, 0.55, 1.4);
    const top = { x: end.x + rand(-0.16, 0.16) * stage.width, y: -20 };
    const paths = shape(top, end, via ? cat.screenOf([0, 0.02, 0]) : null, BOLT.branches, k);
    const [box, sbox] = fit(paths, end, k);
    last.paths = paths.length; last.draws = 0; last.sparkDraws = 0; last.drawMs = 0; last.maxDrawMs = 0;
    audio.play('bolt-beam', { gain: BOLT.beamGain });
    // the leader forks down, faint (calm: none)
    if (!calm) { cvs.style.opacity = '0.4'; await stage.tween(BOLT.leader, (u) => draw(paths, box, { reach: u, k })); }
    // the return stroke: it connects
    cat.playEmote('startle', 'bolt');
    if (via) stage.after(0.18).then(() => cat.playEmote('startle', 'shock'));
    if (!calm) { flashes++; flash.style.opacity = String(BOLT.flash.peak); }
    const sparks = calm ? [] : Array.from({ length: BOLT.sparks.count }, () => {
      const a = -Math.PI / 2 + rand(-1.35, 1.35), v = rand(...BOLT.sparks.speed) * k;
      return { x: end.x, y: end.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rand(...BOLT.sparks.life) };
    });
    last.sparks = sparks.length;
    const ad = BOLT.after.px * k;
    Object.assign(after.style, { width: ad + 'px', height: ad + 'px', transform: `translate(${end.x - ad / 2}px, ${end.y - ad / 2}px)` });
    after.animate(calm ? [{ opacity: 0 }, { opacity: 0.7, offset: 0.25 }, { opacity: 0 }]
      : [{ opacity: 1, scale: 0.6 }, { opacity: 0.75, scale: 1, offset: 0.2 }, { opacity: 0, scale: 1.25 }],
    { duration: BOLT.after.seconds * 1000, easing: 'ease-out' });
    last.afterglows++;
    // one flash dying away, a small shake, the channel crackling and re-lit twice, sparks, then the bolt fades
    const body = document.body.style, T = BOLT.boltSeconds;
    let prev = 0, seed = 1, drawn = -1;
    if (!calm) spk.style.opacity = '1';
    await stage.tween(T, (u) => {
      const t = u * T, dt = t - prev; prev = t;
      if (!calm) {
        flash.style.opacity = (BOLT.flash.peak * Math.max(0, 1 - t / BOLT.flash.seconds) ** 2).toFixed(3);
        const sh = clamp(1 - t / BOLT.shake.seconds);
        body.translate = sh > 0 ? `${(Math.sin(t * 95) * BOLT.shake.px * sh).toFixed(1)}px ${(Math.cos(t * 77) * BOLT.shake.px * 0.6 * sh).toFixed(1)}px` : '';
        for (const sp of sparks) { sp.age += dt; sp.vx *= 1 - 2.2 * dt; sp.vy = sp.vy * (1 - 2.2 * dt) + BOLT.sparks.gravity * k * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; }
      }
      // brightness: the stroke dying away, the two re-strikes, a faint glowing channel until the fade
      let power = calm ? Math.sin(Math.PI * u) : t < BOLT.hot ? 1 : BOLT.glowing + (1 - BOLT.glowing) * Math.exp(-(t - BOLT.hot) / 0.05);
      if (!calm) for (const [at, b] of BOLT.restrikes) power = Math.max(power, b * Math.exp(-(((t - at) / 0.03) ** 2)));
      const fade = calm ? 1 : 1 - smooth((t - BOLT.fadeFrom) / (T - BOLT.fadeFrom));
      if (!calm) seed = 1 + Math.floor(t * BOLT.crackleHz);
      if (seed !== drawn) { drawn = seed; draw(paths, box, { jitter: calm ? 0 : 1.6 * k * (1 - u), seed, k }); }   // its shape: on a new crackle
      cvs.style.opacity = (power * fade).toFixed(3);                                                            // its brightness: the compositor's
      if (!calm) drawSparks(sbox, sparks, power * fade, k);
    });
    body.translate = ''; flash.style.opacity = '0';
    for (const [c, x] of [[cvs, g], [spk, gs]]) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); c.width = c.height = 1; c.style.opacity = '0'; }   // their memory back
    // the cloud it leaves (or, the next times, a darker cloud)
    const cloud = keepsakes.get('cloud');
    if (cloud) { cloud.setState({ dark: Math.min(0.6, (cloud.state.dark || 0) + 0.12) }); grumble(cloud, 0.6); }
    else floatIn(keepsakes.give('cloud'));
    await stage.after(BOLT.hold);
    await stage.tween(BOLT.lift, (u) => { dark.style.opacity = ((1 - smooth(u)) * BOLT.dark).toFixed(3); });
    root.style.display = 'none';
    busy = false;
    return true;
  }
  site.spells.zigzag = () => strike();

  // ---- the cloud ----
  // A 3D field of soft noise, made once (about 10 ms): four lookups of it make the cloud's billows.
  let noise3 = null, cloudRT = null, cloudScene = null, cloudCam = null, cloudU = null, nextDraw = 0;
  function ensureCloudPicture() {
    if (cloudRT) return;
    const N = 48, data = new Uint8Array(N * N * N);
    let seed = 20261109;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const lattice = new Float32Array(16 * 16 * 16); for (let i = 0; i < lattice.length; i++) lattice[i] = rnd();
    const at = (x, y, z) => lattice[((z & 15) * 16 + (y & 15)) * 16 + (x & 15)];
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / 3, fy = y / 3, fz = z / 3, ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
      const s = (t) => t * t * (3 - 2 * t), u = s(fx - ix), v = s(fy - iy), w = s(fz - iz);
      const mix = (a, b, t) => a + (b - a) * t;
      const val = mix(mix(mix(at(ix, iy, iz), at(ix + 1, iy, iz), u), mix(at(ix, iy + 1, iz), at(ix + 1, iy + 1, iz), u), v),
        mix(mix(at(ix, iy, iz + 1), at(ix + 1, iy, iz + 1), u), mix(at(ix, iy + 1, iz + 1), at(ix + 1, iy + 1, iz + 1), u), v), w);
      data[(z * N + y) * N + x] = Math.round(val * 255);
    }
    noise3 = new THREE.Data3DTexture(data, N, N, N);
    noise3.format = THREE.RedFormat; noise3.minFilter = noise3.magFilter = THREE.LinearFilter;
    noise3.wrapS = noise3.wrapT = noise3.wrapR = THREE.RepeatWrapping; noise3.needsUpdate = true;
    cloudRT = new THREE.WebGLRenderTarget(288, Math.round(288 * C.aspect), { depthBuffer: false });
    cloudU = { uNoise: { value: noise3 }, uTime: { value: 0 }, uDark: { value: 0 }, uGlow: { value: 0 }, uAspect: { value: 1 / C.aspect } };
    cloudScene = new THREE.Scene(); cloudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cloudScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: cloudU, depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv * 2.0 - 1.0; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */`
        precision highp float; precision highp sampler3D;
        uniform sampler3D uNoise; uniform float uTime, uDark, uGlow, uAspect; varying vec2 vUv;
        float fbm(vec3 p) { return texture(uNoise, p * 0.11).r * 0.55 + texture(uNoise, p * 0.23 + 0.31).r * 0.28 + texture(uNoise, p * 0.47 + 0.67).r * 0.17; }
        // three soft lumps with a flattish bottom, eaten into by the noise
        float density(vec3 p) {
          float s = max(max(1.0 - length((p - vec3(-0.78, -0.12, 0.0)) / vec3(0.74, 0.5, 0.58)), 1.0 - length((p - vec3(0.02, 0.14, 0.0)) / vec3(0.86, 0.7, 0.7))),
                        1.0 - length((p - vec3(0.84, -0.08, 0.0)) / vec3(0.68, 0.5, 0.55)));
          s *= smoothstep(-0.58, -0.22, p.y);
          return clamp(s * 1.15 + (fbm(p * 1.9 + vec3(uTime * 0.05, 0.0, uTime * 0.02)) - 0.5) * 0.85 - 0.14, 0.0, 1.0);
        }
        void main() {
          vec3 ro = vec3(vUv.x * uAspect * 0.86, vUv.y * 0.86 + 0.08, 1.0), L = normalize(vec3(-0.35, 0.85, 0.45));
          const int STEPS = ${C.steps};
          float T = 1.0, dz = 2.0 / float(STEPS); vec3 col = vec3(0.0);
          for (int i = 0; i < STEPS; i++) {
            vec3 p = ro - vec3(0.0, 0.0, (float(i) + 0.5) * dz);
            float dn = density(p);
            if (dn > 0.01) {
              float toSun = density(p + L * 0.16) + density(p + L * 0.36) * 0.8 + density(p + L * 0.62) * 0.6;
              float lit = exp(-toSun * 1.15);
              vec3 c = mix(vec3(0.63, 0.67, 0.78), vec3(1.0), smoothstep(0.05, 0.75, lit));   // shade to sunlit
              c = mix(c, c * vec3(0.42, 0.45, 0.55), uDark);                             // a storm in it
              c += vec3(0.75, 0.85, 1.0) * uGlow * (1.0 - length(p.xy) * 0.5);           // lightning inside
              float a = 1.0 - exp(-dn * dz * 6.5);
              col += c * a * T; T *= 1.0 - a;
              if (T < 0.02) break;
            }
          }
          gl_FragColor = vec4(col, 1.0 - T);                                              // premultiplied
        }`,
    })));
  }
  // The first cloud does not pop into being: it floats in slowly from the side of the page nearer its spot and eases
  // to a stop there (Aaron, e1111-58). Reduced motion: it is simply there.
  function floatIn(inst) {
    if (!inst || stage.reducedMotion || !inst.box) return;
    const fromLeft = inst.box.x + inst.box.w / 2 < stage.width / 2;
    const clear = 30 + C.drift * inst.u;            // past the edge, whatever its slow side-to-side drift is doing
    inst.arrival = { t: 0, dx: fromLeft ? -(inst.box.x + inst.box.w + clear) : stage.width - inst.box.x + clear };
    inst.ox = inst.arrival.dx; inst.el.classList.remove('arrive');
  }
  function grumble(inst, gain = 0.35) {
    audio.play('thunder', { gain, rate: 0.72, offset: 0.35 });
    inst.glow = 1; inst.wiggle();
  }
  keepsakes.define({
    id: 'cloud', label: 'the cloud', kind: 'gl', size: C.size, aspect: C.aspect, anchor: 'center', layer: 'back', sky: true,
    home: () => keepsakes.toUnits(stage.width * 0.27, stage.insets.top + stage.height * 0.13),
    object() {
      ensureCloudPicture();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rawPicture(THREE, cloudRT.texture));
      m.renderOrder = -3; m.frustumCulled = false;
      return m;
    },
    // a card facing the camera, on an upright plane a little behind him, covering the keepsake's box on the page
    place(obj, inst) {
      const cx = inst.box.x + inst.box.w / 2, cy = inst.box.y + inst.box.h / 2;
      stage.onWall(cx, cy, -0.5, obj.position);
      const ppu = stage.pxPerUnit(obj.position);
      obj.quaternion.copy(stage.camera.quaternion); obj.scale.set(inst.box.w / ppu, inst.box.h / ppu, 1);
    },
    frame(inst, dt) {
      // Physics lane, playtest-2 (Aaron, item 4: "the cloud also gets stuck, but this could be solved by simply letting
      // it float all the way from left to right"): it drifts across the whole page, left to right, crossing in
      // C.crossSeconds, and once wholly past the right edge it comes in again from the left, at the height it was left
      // at. Its own x moves (not an offset), so a drag picks it up where it is; held or calm motion, it waits.
      // Its page x is kept here (inst.cross), so a re-layout that clamps keepsakes onto the page cannot pull it back.
      inst.ox = 0;
      if (inst.arrival && inst.held) inst.arrival = null;
      if (inst.held || stage.reducedMotion || inst.arrival || !inst.w) inst.cross = null;
      else {
        const clear = 30, speed = (stage.width + inst.w + 2 * clear) / C.crossSeconds;
        inst.cross = (inst.cross ?? keepsakes.toPx(inst.x, inst.y).x) + speed * dt;
        if (inst.cross - inst.w / 2 > stage.width + clear) inst.cross = -inst.w / 2 - clear;
        inst.x = keepsakes.toUnits(inst.cross, 0).x;
      }
      if (inst.arrival) {                             // floating in: a long, slowing glide (no stop, no bounce)
        const a = inst.arrival, u = Math.min(1, (a.t += dt) / C.arrive), e = 1 - (1 - u) ** 2.4;
        inst.ox += a.dx * (1 - e);
        if (u >= 1) inst.arrival = null;
      }
      inst.glow = Math.max(0, (inst.glow || 0) - dt * 2.2);
    },
    hit(inst, x, y) { const b = inst.box, dx = (x - b.x - b.w / 2) / (b.w / 2), dy = (y - b.y - b.h / 2) / (b.h / 2); return dx * dx + dy * dy < 1.1; },
    tap(inst) { grumble(inst); },
  });
  // redraw the cloud's little picture a few times a second, only while there is a cloud
  stage.onRender.push((dt, now) => {
    const inst = keepsakes.get('cloud');
    if (!inst || !cloudRT || (now < nextDraw && !(inst.glow > 0))) return;
    nextDraw = now + 1000 / C.fps;
    cloudU.uTime.value = stage.clock; cloudU.uDark.value = inst.state.dark || 0; cloudU.uGlow.value = (inst.glow || 0) * 0.9;
    stage.renderer.setRenderTarget(cloudRT); stage.renderer.setClearColor(0x000000, 0); stage.renderer.clear();
    stage.renderer.render(cloudScene, cloudCam);
    stage.renderer.setRenderTarget(null);
  });
  // compile the cloud ahead, so the first storm does not hitch when it arrives
  // draw the cloud's picture once ahead (its noise is made and uploaded then too), so the first storm does not hitch
  stage.warm(function cloud() {
    ensureCloudPicture();
    stage.renderer.setRenderTarget(cloudRT); stage.renderer.render(cloudScene, cloudCam); stage.renderer.setRenderTarget(null);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rawPicture(THREE, cloudRT.texture));
    stage.scene.add(card); stage.warmDraw([card]); stage.scene.remove(card);
  });
  // the bolt's canvas and glow sprite drawn once, unseen (the storm layer mounted, the canvas transparent), so the first
  // strike's first frame does not set the canvas up (fx lane, playtest 3)
  stage.warm(function boltCanvas() {
    if (!mounted) { document.body.appendChild(root); mounted = true; }
    root.style.display = '';
    const paths = [{ pts: [{ x: 40, y: 0 }, { x: 40, y: 40 }], from: 0, power: 1, taper: false }], box = { x: 0, y: 0, w: 80, h: 80, dpr: 1 };
    place(cvs, box); place(spk, { ...box, ex: 40, ey: 40 });
    draw(paths, box, { k: 1 }); drawSparks({ ...box, ex: 40, ey: 40 }, [{ x: 40, y: 40, vx: 10, vy: 10, age: 0, life: 1 }], 0.5, 1);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (!busy) { cvs.width = cvs.height = spk.width = spk.height = 1; root.style.display = 'none'; } }));
    last.draws = 0; last.sparkDraws = 0; last.drawMs = 0; last.maxDrawMs = 0;
  });

  return { find: 'bolt', strike, config: BOLT, stats: last, canvas: cvs, sparksCanvas: spk, afterglow: after, get busy() { return busy; }, get casts() { return casts; }, get flashes() { return flashes; }, get lastVia() { return lastVia; }, again: () => site.cast('zigzag') };
}
