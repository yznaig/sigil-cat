// Touchfeel lane (playtest 4, 2026-11-14), item 4. Aaron (on his phone): "The cloud goes way too far off to the left
// and right off the screen, it should be going back and forth between the edges of the screen". Over a full drift
// cycle (there and back, sped up 8x) the cloud's visible billows stay on the screen, reach close to both edges and turn
// there; no jump (it never wraps round). Desktop at 1280x900; the phone run also at 932x430 (a wide-notch phone).
// A cloud left past its turning point (a drag, a smaller screen) glides back in; a drag lets go and it carries on.
cat.auto = false;
const { BOLT } = await import('/src/eggs/bolt.js'), C = BOLT.cloud, T = site.THREE;
const c = keepsakes.give('cloud'); await sleep(300); c.arrival = null; c.ox = 0;
// how far across its card the billows reach: the cloud's own picture, read back (alpha over 3%), at a few moments
function visible() {
  const tex = c.object.material.uniforms.map.value, W = tex.image?.width || 288, H = tex.image?.height || 161;
  const rt = new T.WebGLRenderTarget(W, H), scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 2); cam.position.z = 1;
  scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: 'uniform sampler2D map;varying vec2 vUv;void main(){gl_FragColor=texture2D(map,vUv);}' })));
  const R = stage.renderer, prev = R.getRenderTarget(); R.setRenderTarget(rt); R.setClearColor(0, 0); R.clear(); R.render(scene, cam);
  const px = new Uint8Array(W * H * 4); R.readRenderTargetPixels(rt, 0, 0, W, H, px); R.setRenderTarget(prev); rt.dispose();
  let l = W, r = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 8) { l = Math.min(l, x); r = Math.max(r, x); }
  return { l: l / W, r: (r + 1) / W };
}
let reach = { l: 1, r: 0 };
for (let i = 0; i < 4; i++) { const v = visible(); reach = { l: Math.min(reach.l, v.l), r: Math.max(reach.r, v.r) }; await sleep(150); }
check('touchfeel cloud: its billows fill its card nearly edge to edge (the card is the cloud the sweep keeps on the screen)', reach.r - reach.l >= 0.94, `billows from ${reach.l.toFixed(3)} to ${reach.r.toFixed(3)} of the card`);
const edges = () => ({ left: c.box.x + c.box.w * reach.l, right: c.box.x + c.box.w * reach.r });
async function cycle(label) {
  const xs = [], L = [], R = [];
  await fast(8, async () => { const t0 = stage.clock; while (stage.clock - t0 < C.legSeconds * 2.15) { await sleep(40); const e = edges(); xs.push(c.box.x + c.box.w / 2); L.push(e.left); R.push(e.right); } });
  const minL = Math.min(...L), maxR = Math.max(...R), steps = xs.slice(1).map((x, k) => x - xs[k]);
  const turns = steps.slice(1).filter((d, k) => Math.sign(d) && Math.sign(steps[k]) && Math.sign(d) !== Math.sign(steps[k])).length;
  const jump = Math.max(...steps.map(Math.abs));
  check(`touchfeel cloud ${label}: over a full there-and-back its billows stay on the screen and reach both edges, turning there`,
    minL >= 0 && maxR <= stage.width && minL <= C.edge + 8 && maxR >= stage.width - C.edge - 8 && turns >= 2 && jump < stage.width * 0.05,
    `${stage.width} px wide, card ${c.box.w.toFixed(0)} px; billows from ${minL.toFixed(1)} to ${maxR.toFixed(1)}; ${turns} turns; largest step ${jump.toFixed(1)} px over ${xs.length} samples`);
}
await cycle(`${stage.width}x${stage.height}`);
await __shot('touchfeel-cloud');
if (MOBILE) {
  await __resize(932, 430); await sleep(600);
  await cycle('932x430');
  await __shot('touchfeel-cloud-wide');
  await __resize(844, 390); await sleep(600);
}
// beyond its turning point (as after a resize from a wider screen): it glides back in, no jump, then sweeps as before
if (!stage.reducedMotion) {
  c.cross = null; c.x = keepsakes.toUnits(stage.width + c.box.w * 0.3, 0).x; await sleep(80);
  const xs = []; await fast(8, async () => { for (let i = 0; i < 60; i++) { await sleep(40); xs.push(edges().right); } });
  const steps = xs.slice(1).map((x, k) => x - xs[k]);
  check('touchfeel cloud: left past the right edge, it glides back onto the screen without a jump', xs.at(-1) <= stage.width && Math.max(...steps.map(Math.abs)) < stage.width * 0.05,
    `right edge ${xs[0].toFixed(0)} -> ${xs.at(-1).toFixed(0)} of ${stage.width}`);
}
// a drag lets go near the left edge: it carries on from there, still on the screen
{
  const p = { x: c.box.x + c.box.w / 2, y: c.box.y + c.box.h / 2 }, to = { x: c.box.w / 2 + 30, y: p.y + 10 };
  await __pointer(Array.from({ length: 10 }, (_, i) => ({ x: p.x + (to.x - p.x) * i / 9, y: p.y + (to.y - p.y) * i / 9 })));
  await sleep(200);
  const xs = []; await fast(8, async () => { for (let i = 0; i < 50; i++) { await sleep(40); xs.push(edges()); } });
  check('touchfeel cloud: dragged and let go, it carries on and stays on the screen', xs.every((e) => e.left >= 0 && e.right <= stage.width) && (stage.reducedMotion || Math.abs(xs.at(-1).left - xs[0].left) > 5),
    `left edge ${xs[0].left.toFixed(0)} -> ${xs.at(-1).left.toFixed(0)}`);
}
