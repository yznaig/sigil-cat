// The stage: one WebGL canvas, one camera, one render loop. Everything that moves hooks into stage.onFrame; nothing
// else on the page calls requestAnimationFrame. Also here: the framing (he floats centred in the space the page's
// chrome leaves), the lights the felt things share, the pixel ratio (adaptive), shader warm-up, and ?perf=1.
import * as THREE from 'three';

const PERF = { maxDpr: 2, minDpr: 1, step: 0.25, sampleMs: 1000, warmupMs: 2500, lowFps: 45, highFps: 57, lowWindows: 2, highWindows: 4,
  // speed lane (playtest-2): in a window bigger than floorPixels page pixels, a machine that cannot keep up may go
  // below one picture pixel per page pixel, down to floorPixels in all (never below lowestDpr). Small windows: as before.
  floorPixels: 1.2e6, lowestDpr: 0.5 };
// What must stay in view around him (scene units), and the lens.
const VIEW = { fov: 30, needH: 1.9, needW: 1.7, lookAt: [0, 0.5, 0], camY: 0.62, camRise: 0.12 };
// The sheets' studio light: frontal, low-contrast, lots of wrap-around. [intensity, x, y, z]
const LIGHTS = { env: 0.95, hemi: 1.5, key: [1.5, -0.3, 3.0, 3.5], fill: [1.0, 2.5, 1.2, 2.5], rim: [0.6, 0.5, 2.0, -3.0] };

export function createStage(canvas) {
  const params = new URLSearchParams(location.hash.slice(1)), query = new URLSearchParams(location.search);
  const opt = (k) => query.get(k) ?? params.get(k);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedReduced = opt('rm') === '1';

  // No antialiasing: it multiplies the cost of every blended pixel and the splats do not need it. The page asks for
  // the fast graphics card (a PC with two otherwise hands the browser the weak one).
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, stencil: false, powerPreference: 'high-performance' });
  const deviceDpr = Number(opt('fakedpr')) || devicePixelRatio || 1, pinnedDpr = Number(opt('dpr')) || null;
  let dpr = pinnedDpr ?? Math.min(deviceDpr, PERF.maxDpr);
  renderer.setPixelRatio(dpr);
  // three checks every new shader's logs on its first use, a wait on the GPU process each time (up to ~0.1 s apiece in
  // the boot warm-ups, speed lane e1112-59). Only #debug wants that.
  renderer.debug.checkShaderErrors = params.has('debug');
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.05, 40);
  const hemi = new THREE.HemisphereLight(0xfffaf2, 0x6b5f52, LIGHTS.hemi);
  const mk = (color, v) => { const l = new THREE.DirectionalLight(color, v[0]); l.position.set(v[1], v[2], v[3]); return l; };
  const lights = [hemi, mk(0xfff4e6, LIGHTS.key), mk(0xffffff, LIGHTS.fill), mk(0xffffff, LIGHTS.rim)];
  for (const l of lights) { l.layers.enable(1); scene.add(l); }      // layer 1: the pass that draws the cat's picture
  scene.environmentIntensity = LIGHTS.env;

  // The soft room light the felt and the butter are lit by: three's RoomEnvironment, baked once to a tiny picture of
  // the whole surrounding (tools/art/bake-room-light.js) and then prefiltered for every roughness the way three's PMREM
  // does it, also baked (tools/art/bake-room-pmrem.js: 336 x 64 half floats, the very numbers three computed). Building
  // that in the browser compiled two shaders and stopped the page for 0.3-0.5 s while he was being warmed up (speed
  // lane, e1112-59). Loaded on first need, so it never delays the first cat.
  let envPromise = null;
  function ensureEnv() {
    return (envPromise ??= (async () => {
      const W = 336, H = 64, r = await fetch(new URL('../../assets/textures/room-light.pmrem.f16', import.meta.url));
      const tex = new THREE.DataTexture(new Uint16Array(await r.arrayBuffer()), W, H, THREE.RGBAFormat, THREE.HalfFloatType);
      tex.mapping = THREE.CubeUVReflectionMapping; tex.colorSpace = THREE.LinearSRGBColorSpace;
      tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.name = 'PMREM.cubeUv'; tex.needsUpdate = true;
      scene.environment = tex;
    })());
  }

  const onFrame = [], onRender = [], onPresent = [], onPresented = [], onResize = [], onLoaded = [], onEarly = [], perfExtra = [], debugExtra = [];
  // Presentation masks must not survive into asynchronous layout/unlock events.
  function present() {
    for (const f of onPresent) f();
    try { renderer.render(scene, camera); }
    finally { for (const f of onPresented) f(); }
  }
  // an egg that starts after he is already on screen still gets its "he is loaded" call, at once
  onLoaded.push = (f) => { if (loaded) { try { f(); } catch (e) { console.error(e); } return onLoaded.length; } return Array.prototype.push.call(onLoaded, f); };
  // Behind the doors (integration, playtest-2): his first pose is in and the loading screen still covers the page. The
  // physical world and a returning player's restored keepsakes and furniture start here (stage.prepare(), src/main.js),
  // so their first build (pictures, shaders) happens before he is shown; ready() runs it too if nobody did.
  let early = false;
  onEarly.push = (f) => { if (early) { try { f(); } catch (e) { console.error(e); } return onEarly.length; } return Array.prototype.push.call(onEarly, f); };
  function prepare() { if (early) return; early = true; for (const f of onEarly) { try { f(); } catch (e) { console.error(e); } } }
  const insets = { top: 0, bottom: 0 };
  let width = 1, height = 1, layoutHeld = false, layoutPending = false, layoutGate = () => false;
  function frame() {
    // Shell lane (playtest-2): while the page is frozen (src/core/freeze.js), or about to be (a phone just turned
    // upright: the gate), a resize waits for the release.
    if (layoutHeld || layoutGate()) { layoutPending = true; return; }
    width = innerWidth; height = innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const usable = Math.max(0.3, 1 - (insets.top + insets.bottom) / height);     // the share of the height he may use
    const dist = Math.max(VIEW.needH / 2 / (half * usable), VIEW.needW / 2 / (half * camera.aspect));
    camera.position.set(0, VIEW.camY + dist * VIEW.camRise, dist);
    camera.lookAt(...VIEW.lookAt);
    // slide the picture so he is centred between the top and bottom chrome, whatever their sizes
    const shift = (insets.bottom - insets.top) / 2;
    if (shift) camera.setViewOffset(width, height, 0, shift, width, height); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    for (const f of onResize) f();
  }
  // (held: the chrome's size for a screen nobody sees is not kept; the resize on the release measures it again)
  function setInsets(top, bottom) { if (layoutHeld || layoutGate() || (top === insets.top && bottom === insets.bottom)) return; insets.top = top; insets.bottom = bottom; frame(); }
  addEventListener('resize', frame);
  frame();

  // Scene point -> page pixels, and back onto a plane.
  const _direction = new THREE.Vector3(), _v = new THREE.Vector3(), _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
  function toScreen(p, out = {}) {
    _v.copy(p).project(camera);
    out.x = (_v.x + 1) / 2 * width; out.y = (1 - _v.y) / 2 * height; out.behind = _v.z > 1;
    return out;
  }
  function ray(x, y) { _ndc.set(x / width * 2 - 1, -(y / height) * 2 + 1); _ray.setFromCamera(_ndc, camera); return _ray.ray; }
  const _plane = new THREE.Plane();
  // where a page pixel lands on the floor (y = 0) or on an upright plane facing the camera at depth z
  function onFloor(x, y, out = new THREE.Vector3()) { _plane.set(new THREE.Vector3(0, 1, 0), 0); return ray(x, y).intersectPlane(_plane, out) || out.set(0, 0, 0); }
  function onWall(x, y, z = 0, out = new THREE.Vector3()) { _plane.set(new THREE.Vector3(0, 0, 1), -z); return ray(x, y).intersectPlane(_plane, out) || out.set(0, 0, z); }
  // screen pixels per scene unit at a point
  function pxPerUnit(p = new THREE.Vector3(...VIEW.lookAt)) {
    const d = _v.copy(p).sub(camera.position).dot(camera.getWorldDirection(_direction));
    return height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d);
  }

  // ---- warm-up ----
  // A GPU driver builds a shader for real the first time something is drawn with it, which can stop the page for a
  // moment (half a second for the galaxy on a slow driver). So everything an egg will draw is drawn once ahead, on one
  // pixel nobody sees. What is queued by the time he is ready is drawn behind the loading screen's closed doors
  // (stage.warmAll, src/main.js); anything queued later, a piece per quiet moment, never under a finger or mid-spin.
  //   stage.warm(object)            compile (in the background where the browser can), then draw it once
  //   stage.warm(object, 1)         the same for something that lives in the cat's picture (camera layer 1)
  //   stage.warm(() => { ... })     anything else (its own off-screen pass)
  const warmQueue = [], warmLog = [];
  const warmRT = new THREE.WebGLRenderTarget(4, 4);
  let loaded = false, warmBusy = false, busyCheck = () => false;
  function warm(thing, layer = 0) { warmQueue.push({ thing, layer }); if (loaded) nextWarm(); }
  async function compile(obj) {
    try { await renderer.compileAsync(obj, camera, scene); } catch (e) { console.warn('warm-up:', e); }
  }
  // Draw just these objects (their own visibility forced on, nothing culled), with the scene's lights, into the tiny target.
  function warmDraw(objects, layer = 0) {
    const chain = new Set(), inside = new Set(), forced = [], hidden = [], culled = [];
    for (const o of objects) if (o) {
      for (let a = o; a; a = a.parent) { chain.add(a); if (!a.visible) { a.visible = true; forced.push(a); } }
      o.traverse((c) => { inside.add(c); if (!c.visible) { c.visible = true; forced.push(c); } if (c.frustumCulled) { c.frustumCulled = false; culled.push(c); } });
    }
    scene.traverse((o) => { if (!chain.has(o) && !inside.has(o) && chain.has(o.parent) && o.visible && !o.isLight) { o.visible = false; hidden.push(o); } });
    // Things in the cat's picture (layer 1) are drawn to a render target, everything else to the screen: three builds a
    // different shader for each (the screen's has the tone curve and sRGB in it), so the rehearsal must use the same
    // one. On the screen it is one pixel in the corner, and the real frame is drawn over it straight away.
    const mask = camera.layers.mask;
    camera.layers.set(layer);
    if (layer === 0) { renderer.setRenderTarget(null); renderer.setScissor(0, 0, 1, 1); renderer.setScissorTest(true); } else renderer.setRenderTarget(warmRT);
    try { renderer.render(scene, camera); } finally {
      renderer.setScissorTest(false); renderer.setRenderTarget(null);
      camera.layers.mask = mask;
      for (const o of forced) o.visible = false;
      for (const o of hidden) o.visible = true;
      for (const o of culled) o.frustumCulled = true;
      if (layer === 0) present();
    }
  }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  async function warmOne({ thing, layer }) {
    const t0 = performance.now();
    try {
      if (typeof thing === 'function') await thing();
      // compileAsync builds in the background (KHR_parallel_shader_compile); the one real draw waits for a frame of its own
      else { await compile(thing); await nextFrame(); warmDraw([thing], layer); }
    } catch (e) { console.warn('warm-up:', e); }
    warmLog.push(`${(t0 / 1000).toFixed(2)}s ${thing.name || thing.type || 'step'} ${(performance.now() - t0).toFixed(0)} ms`);
  }
  // Wait, without blocking, until the GPU process has done everything asked of it so far: a fence, polled once a frame
  // (at most `limit` ms). three's first use of a program asks the GPU process about it, and that question waits behind
  // whatever is still queued; after this, it has nothing to wait behind (integration, playtest-2, speed follow-up).
  async function gpuIdle(limit = 1500) {
    const gl = renderer.getContext(), fence = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!fence) return;
    gl.flush();
    const until = performance.now() + limit;
    try {
      while (performance.now() < until) {
        const s = gl.clientWaitSync(fence, 0, 0);
        if (s === gl.ALREADY_SIGNALED || s === gl.CONDITION_SATISFIED || s === gl.WAIT_FAILED) return;
        await nextFrame();
      }
    } finally { gl.deleteSync(fence); }
  }
  // before he is shown: everything in the queue, one after another, for at most `limit` ms; each step's driver work and
  // its first-use questions settle (a frame, then the fence) before the next. onStep(done, of) after each.
  async function warmAll(limit = 3000, onStep = null) {
    const until = performance.now() + limit;
    warmBusy = true;
    let done = 0;
    while (warmQueue.length && performance.now() < until) {
      await warmOne(warmQueue.shift());
      await nextFrame();                       // the driver's own work on it lands in this frame
      await gpuIdle();
      done++; onStep?.(done, done + warmQueue.length);
    }
    warmBusy = false;
  }
  function nextWarm() {
    if (!loaded || warmBusy || !warmQueue.length) return;
    warmBusy = true;
    const go = async () => {
      if (busyCheck()) { warmBusy = false; setTimeout(nextWarm, 400); return; }
      await warmOne(warmQueue.shift());
      warmBusy = false;
      // the driver's own share of that step lands in the next frame: let that frame pass before the next step is chosen
      nextFrame().then(() => setTimeout(nextWarm, 120));
    };
    (window.requestIdleCallback || setTimeout)(go, { timeout: 1200 });
  }

  // ---- perf readout and the adaptive pixel ratio ----
  const P = PERF, perfEl = document.getElementById('perf'), showPerf = opt('perf') === '1';
  const perf = { last: 0, start: 0, frames: 0, worst: 0, low: 0, high: 0, fps: 0, avg: 0, worstMs: 0, ceiling: P.maxDpr, lastDir: 0, events: [], gpu: '', longest: 0 };
  if (perfEl) perfEl.hidden = !showPerf;
  if (showPerf) {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    perf.gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  }
  function setDpr(v, why) {
    dpr = Math.round(v * 100) / 100; renderer.setPixelRatio(dpr);
    perf.events.push(`${(performance.now() / 1000).toFixed(0)}s ${why} -> ${dpr}`); if (perf.events.length > 3) perf.events.shift();
    for (const f of onResize) f();
  }
  function perfFrame(now) {
    const dt = now - perf.last; perf.last = now;
    if (dt <= 0 || dt > 1000 || now < P.warmupMs) { perf.start = now; perf.frames = 0; perf.worst = 0; return; }
    perf.frames++; perf.worst = Math.max(perf.worst, dt); perf.longest = Math.max(perf.longest, dt);
    if (now - perf.start < P.sampleMs) return;
    perf.fps = (perf.frames * 1000) / (now - perf.start); perf.avg = (now - perf.start) / perf.frames; perf.worstMs = perf.worst;
    perf.start = now; perf.frames = 0; perf.worst = 0;
    if (pinnedDpr) return;
    if (Math.abs(perf.avg - 33.3) < 2 && perf.worstMs < 42) { perf.low = perf.high = 0; return; }   // a steady 30: Low Power Mode, not us
    if (perf.fps < P.lowFps) { perf.low++; perf.high = 0; } else if (perf.fps >= P.highFps) { perf.high++; perf.low = 0; } else { perf.low = perf.high = 0; }
    const minDpr = Math.min(P.minDpr, Math.max(P.lowestDpr, Math.sqrt(P.floorPixels / (width * height))));
    if (perf.low >= P.lowWindows && dpr > minDpr) { if (perf.lastDir > 0) perf.ceiling = Math.max(minDpr, dpr - P.step); setDpr(Math.max(minDpr, dpr - P.step), `slow (${perf.fps.toFixed(0)} fps)`); perf.low = 0; perf.lastDir = -1; }
    else if (perf.high >= P.highWindows && dpr < Math.min(perf.ceiling, deviceDpr)) { setDpr(Math.min(perf.ceiling, deviceDpr, dpr + P.step), `smooth (${perf.fps.toFixed(0)} fps)`); perf.high = 0; perf.lastDir = 1; }
  }
  document.addEventListener('visibilitychange', () => { perf.last = 0; last = 0; });

  // ---- the loop ----
  const debugEl = document.getElementById('debug'), showDebug = params.has('debug');
  if (debugEl) debugEl.hidden = !showDebug;
  let last = 0, clock = 0, timeScale = 1, paused = false;
  // Waiting and easing on the stage's own clock (so a slowed or stopped page keeps its timing and nothing uses timers):
  //   await stage.after(0.5)                      half a second from now
  //   await stage.tween(0.4, (u) => { ... })      called every frame with u going 0 -> 1
  const waits = [], tweens = [];
  const after = (seconds) => new Promise((r) => waits.push({ at: clock + seconds, r }));
  const tween = (seconds, fn) => new Promise((r) => { fn(0); tweens.push({ t0: clock, seconds: Math.max(1e-4, seconds), fn, r }); });
  function runClock() {
    for (let i = waits.length - 1; i >= 0; i--) if (clock >= waits[i].at) waits.splice(i, 1)[0].r();
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i], u = Math.min(1, (clock - t.t0) / t.seconds);
      try { t.fn(u); } catch (e) { console.error(e); }
      if (u >= 1) tweens.splice(i, 1)[0].r();
    }
  }
  const size = new THREE.Vector2();
  function loop(now) {
    perfFrame(now);
    const dt = last ? Math.min((now - last) / 1000, 0.1) * timeScale : 0;
    last = now; clock += dt;
    runClock();
    for (const f of onFrame) f(dt, now);
    if (!paused) {
      for (const f of onRender) f(dt, now);
      // Visibility takeovers run after cached pictures finish updating.
      renderer.setRenderTarget(null);
      present();
    }
    if (showPerf) {
      const info = renderer.info.render; renderer.getDrawingBufferSize(size);
      perfEl.textContent = `fps     ${perf.fps ? perf.fps.toFixed(1) : '…'}\nframe   ${perf.avg.toFixed(1)} ms avg, ${perf.worstMs.toFixed(1)} worst, ${perf.longest.toFixed(0)} longest\n` +
        `calls   ${info.calls}\ndpr     ${dpr} of ${deviceDpr}${pinnedDpr ? ' (pinned)' : ''}\ncanvas  ${size.x}×${size.y}\ngpu     ${perf.gpu.slice(0, 48)}` +
        (perf.events.length ? '\n' + perf.events.join('\n') : '') + perfExtra.map((f) => '\n' + f()).join('');
    }
    if (showDebug) debugEl.textContent = debugExtra.map((f) => f()).join('\n');
  }

  const stage = {
    THREE, renderer, scene, camera, canvas, params, opt, VIEW,
    onFrame, onRender, onPresent, onPresented, onResize, onLoaded, onEarly, prepare, get early() { return early; }, perfExtra, debugExtra,
    get width() { return width; }, get height() { return height; }, get dpr() { return dpr; },
    get clock() { return clock; }, get reducedMotion() { return forcedReduced || motion.matches; },
    get loaded() { return loaded; }, get insets() { return insets; },
    get timeScale() { return timeScale; }, set timeScale(v) { timeScale = v; },
    get paused() { return paused; }, set paused(v) { paused = v; },
    get longestFrame() { return perf.longest; }, resetLongest() { perf.longest = 0; },
    frame, setInsets, toScreen, ray, onFloor, onWall, pxPerUnit, ensureEnv, warm, warmDraw, warmAll, compile, after, tween, warmLog,
    setBusyCheck(f) { busyCheck = f; },
    holdLayout(on) { layoutHeld = on; if (!on && layoutPending) { layoutPending = false; frame(); } },
    setLayoutGate(f) { layoutGate = f; },
    start() { renderer.setAnimationLoop(loop); },
    // the cat is in: show the canvas, let the warm-ups and everything that waited for him begin
    ready() {
      prepare();
      loaded = true;
      canvas.classList.add('on');
      for (const f of onLoaded) f();
      setTimeout(nextWarm, 900);
    },
    nextWarm,
    get warmLeft() { return warmQueue.length + (warmBusy ? 1 : 0); },
  };
  return stage;
}
