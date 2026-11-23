// loader-bars.js (loadbars lane, p8): the loading screen on a phone has no bare bands. iPhone Safari fills its own bars
// (the strip under the status bar, the strip where its toolbar sits) flat in the page's background colour and does not
// draw our fixed layers there, so the loading screen must (a) cover the whole screen, (b) meet every screen edge in that
// same page colour, and (c) keep its frame and its spine inside the safe areas, the spine never running past the frame.
// Run at a phone size with ?doors=hold (the loading screen stays until the check says go; this check never does).
// The safe areas are emulated (Emulation.setSafeAreaInsetsOverride, as on an iPhone); the toolbar growing and
// shrinking is emulated by changing the viewport height by 80px and back.
// At --size desktop it only checks the desktop rules are untouched (the doors are the screen, no bleed).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const loader = document.getElementById('loader'), doors = [...loader.querySelectorAll('.door')];
const PAGE = [253, 240, 230];   // --page, the colour Safari fills its bars with
const W0 = innerWidth, H0 = innerHeight, upright = H0 > W0;

if (!matchMedia('(pointer: coarse)').matches) {
  const cs = doors.map((d) => getComputedStyle(d));
  check('loader-bars desktop: the doors are the screen, as before (no bleed, the seam a box-shadow)', cs.every((c) => c.top === '0px' && c.bottom === '0px' && c.boxShadow !== 'none') && getComputedStyle(loader).overflow === 'hidden',
    JSON.stringify(cs.map((c) => [c.top, c.bottom])));

} else {
  // an iPhone's safe areas: upright, the status bar and the home bar; on its side, the notch and the home bar
  const inset = upright ? { top: 59, bottom: 34, left: 0, right: 0 } : { top: 0, bottom: 21, left: 47, right: 47 };
  const ok = await __safeArea(inset);
  await sleep(300);

  // the screen as it shows, in device pixels
  const grab = async () => {
    const img = new Image(); img.src = 'data:image/png;base64,' + await __png(); await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    return { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data, k: c.width / innerWidth };
  };
  const px = (g, x, y) => { const i = (y * g.w + x) * 4; return [g.d[i], g.d[i + 1], g.d[i + 2]]; };
  const off = (p, ref = PAGE) => Math.max(...p.map((v, i) => Math.abs(v - ref[i])));
  // the worst pixel in a band (device-pixel rows y0..y1, columns x0..x1) against the page colour
  const worst = (g, x0, x1, y0, y1) => { let m = 0, at = null; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const o = off(px(g, x, y)); if (o > m) { m = o; at = [x, y]; } } return { m, at }; };

  const measure = async (tag) => {
    await sleep(350);
    const W = innerWidth, H = innerHeight;
    const rects = doors.map((d) => d.getBoundingClientRect());
    const covers = rects.every((r) => r.top <= 0 && r.bottom >= H) && Math.min(...rects.map((r) => r.left)) <= 0 && Math.max(...rects.map((r) => r.right)) >= W &&
      Math.abs(rects[0].right - rects[1].left) < 1;
    check(`loader-bars ${tag}: the paper covers the whole screen and runs past it, top and bottom`, covers, JSON.stringify({ W, H, doors: rects.map((r) => [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)]) }));
    const g = await grab(), k = g.k;
    // (b) every screen edge meets Safari's bars in the page colour: the outermost 2 css px on all four sides
    const e = Math.round(2 * k);
    const edges = { top: worst(g, 0, g.w, 0, e), bottom: worst(g, 0, g.w, g.h - e, g.h), left: worst(g, 0, e, 0, g.h), right: worst(g, g.w - e, g.w, 0, g.h) };
    // top and bottom: within 4 levels of the page colour; the sides (no Safari bar there, upright or under the notch on
    // its side) are the paper itself, its grain and glow a few levels off the page colour (on main: up to 7)
    check(`loader-bars ${tag}: top and bottom screen edges are the page colour (what Safari fills its bars with), the sides are the paper`, edges.top.m <= 4 && edges.bottom.m <= 4 && edges.left.m <= 12 && edges.right.m <= 12, JSON.stringify(edges));
    // (c) what the safe areas cover is flat page colour: nothing of the frame or the spine under the status bar or the home bar
    const st = Math.round(inset.top * k), sb = Math.round(inset.bottom * k);
    const bands = { top: st ? worst(g, 0, g.w, 0, st) : { m: 0 }, bottom: worst(g, 0, g.w, g.h - sb, g.h) };
    check(`loader-bars ${tag}: under the status bar and the home bar only the page colour (within 4 levels)`, bands.top.m <= 4 && bands.bottom.m <= 4, JSON.stringify(bands));
    // the outer 5% top and bottom: what is there is the loading design (page colour, paper, the frame), never darker than its frame line where the gutter shades it
    // (the spine's own hairline, darker than the frame, is checked below, so its few columns are left out here)
    const b5 = Math.round(g.h * 0.05), seam = Math.round(rects[0].right * k), sp = Math.round(4 * k), most = (y0, y1) => [worst(g, 0, seam - sp, y0, y1), worst(g, seam + sp, g.w, y0, y1)].sort((p, q) => q.m - p.m)[0];
    const strips = { top: most(0, b5), bottom: most(g.h - b5, g.h) };
    check(`loader-bars ${tag}: the top and bottom 5% are the design's paper and frame (no band darker or lighter than them)`, strips.top.m <= 40 && strips.bottom.m <= 40, JSON.stringify(strips));
    // the spine: the seam's hairline runs only as far as the frame, which sits inside the safe areas
    const sx = Math.round(rects[0].right * k) - 1, dark = [];
    for (let y = 0; y < g.h; y++) if (off(px(g, sx, y)) > 12) dark.push(y);
    const frameTop = (inset.top + 14) * k, frameBot = g.h - (inset.bottom + 14) * k, first = dark[0], last = dark[dark.length - 1];
    check(`loader-bars ${tag}: the spine runs only as far as the frame, inside the safe areas`, dark.length > g.h * 0.5 && first >= frameTop - 2 && last <= frameBot + 2,
      JSON.stringify({ spine: [first, last], frame: [frameTop, frameBot] }));
    // the frame: its top and bottom lines are on screen, clear of the safe areas
    const fx = Math.round(g.w * 0.25), row = (y) => off(px(g, fx, Math.round(y)));
    const lines = [Math.max(...[-1, 0, 1].map((d) => row(frameTop + d))), Math.max(...[-2, -1, 0].map((d) => row(frameBot + d)))];
    check(`loader-bars ${tag}: the frame's top and bottom lines are on screen, inside the safe areas`, lines.every((v) => v >= 10), JSON.stringify({ lines }));
    return g;
  };

  check('loader-bars this run is a phone with its safe areas emulated', ok && !window.shell?.revealed && !!document.getElementById('loader'), JSON.stringify({ W0, H0, inset }));
  await measure('as loaded');
  await __shot('loader-bars');
  // Safari's toolbar: the visible height shrinks and grows by about 80px while the loading screen is up
  await __resize(W0, H0 - 80);
  await measure('toolbar in (80px shorter)');
  await __resize(W0, H0);
  await measure('toolbar out (back to full height)');
  await __shot('loader-bars-after-resize');

}
