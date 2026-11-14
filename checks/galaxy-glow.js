// galaxy-glow.js (fx lane, playtest 3; Aaron: "it looks like the cats glow gets cut off sharply in some positions as seen
// in IMG5"). The halo round his outline in the galaxy's dark came from blurred copies of his picture, and ended where his
// picture's box ends: hard straight lines. In every pose, the glow just outside his picture's box must carry on from
// the glow just inside it. Pixels are read straight after a frame (stage.onPresented), with the galaxy held: the dark
// and the halo at full, his felt as it is (the portal's sky held closed, so only the halo is measured), stage clock stopped.
cat.auto = false;
const g = E.galaxy, gl = stage.renderer.getContext(), d = () => stage.dpr;
async function grab() {
  let out = null; const f = () => { const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); out = { w, h, px }; };
  stage.onPresented.push(f); await until(() => out, 3000, 10); stage.onPresented.splice(stage.onPresented.indexOf(f), 1); return out;
}
// the halo's colour: violet-blue over a neutral felt and a near-black sky (b - g, 0-255)
const glowAt = (A, x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= A.w || y >= A.h) return null; const i = (y * A.w + x) * 4; return Math.max(0, A.px[i + 2] - A.px[i + 1]); };
const results = [];
for (const pose of ['sit', 'lie', 'sleep', 'stretch']) {
  cat.request(pose); await until(() => cat.pose === pose && cat.phase === 'hold' && !cat.popping, 15000); await sleep(400);
  g.pin(0); g.pinDim(1); g.uniforms.uStars.value = 0; await sleep(600);   // the dark's faint stars off: they are not the halo
  stage.timeScale = 0; await sleep(150);
  const A = await grab(), r = cat.rect, k = d(), H = A.h;
  // the box in drawing-buffer pixels, y up (as the shader has it)
  const x0 = r.x * k, x1 = (r.x + r.w) * k, y0 = H - (r.y + r.h) * k, y1 = H - r.y * k;
  let worst = 0, at = null, inside = 0, spot = null;
  // a cut is a jump at the box edge beyond the glow's own fall just inside it: (inside 1.5 px - outside 1.5 px) minus
  // (inside 4.5 px - inside 1.5 px). A glow cut off there jumps by its full height; one that fades on does not.
  const edge = (xi, yi, xo, yo, where) => {
    const a = glowAt(A, xi, yi), b = glowAt(A, xo, yo), a2 = glowAt(A, xi + (xi - xo), yi + (yi - yo));
    if (a === null || b === null || a2 === null) return;
    inside = Math.max(inside, a);
    const jump = (a - b) - Math.max(0, a2 - a);
    if (jump > worst) { worst = jump; at = where; spot = [xi, yi, xo, yo]; }
  };
  for (let y = y0 + 2; y < y1 - 2; y += 2) { edge(x0 + 1.5, y, x0 - 1.5, y, 'left'); edge(x1 - 1.5, y, x1 + 1.5, y, 'right'); }
  for (let x = x0 + 2; x < x1 - 2; x += 2) { edge(x, y0 + 1.5, x, y0 - 1.5, 'bottom'); edge(x, y1 - 1.5, x, y1 + 1.5, 'top'); }
  if (spot && worst > 6) { const [xi, yi, xo, yo] = spot, dx = Math.sign(xo - xi), dy = Math.sign(yo - yi), prof = [];
    for (let s = -8; s <= 8; s++) prof.push(glowAt(A, (xi + xo) / 2 + dx * s, (yi + yo) / 2 + dy * s));
    note('galaxy glow profile across the ' + at + ' edge, ' + cat.pose, prof.join(' ')); }
  results.push({ pose: cat.pose, worst, at, inside });
  await __shot('galaxy-glow-' + pose);
  g.pin(1); g.uniforms.uStars.value = g.config.cutscene.stars; stage.timeScale = 1; await sleep(200); stage.timeScale = 0; await sleep(150);
  await __shot('galaxy-glow-' + pose + '-sky');   // the whole look, the portal open (for the eye; not measured)
  stage.timeScale = 1; g.pin(null); g.pinDim(null); g.uniforms.uStars.value = g.config.cutscene.stars;
  await until(() => !g.isOpen, 8000); await sleep(200);
}
check('the glow carries on past his picture\'s box in every pose (no hard straight edge)', results.every((r) => r.worst <= 8),
  results.map((r) => `${r.pose}: jump ${r.worst}/255${r.at ? ' at ' + r.at : ''} (glow inside up to ${r.inside})`).join('; '));
check('and there is a glow to see near the box edges in at least one pose', results.some((r) => r.inside >= 10), results.map((r) => r.inside).join(', '));
