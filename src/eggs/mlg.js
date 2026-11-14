// MLG mode: the "360 no-scope" egg (docs/research/nostalgia-shortlist.md, pick 4). Two seconds of 2014 montage parody
// over the page, centred on the cat: one air horn, three hitmarkers, pixel shades dropping onto his face, a plain
// nacho chip orbiting him once, a slammed caption, then everything slides off and the overlay removes itself.
// Every shape is drawn here as SVG (no images, nothing branded). Nothing changes colour or flashes: elements only
// move, scale and fade (WCAG 2.3.1). prefers-reduced-motion: a shorter version with no shake, no orbit, fades only.
//
//   const mlg = createMLG({ playSound: (name) => ... });   // names: 'airhorn' (once), 'hitmarker' (x3)
//   mlg.fire(x, y, { faceY, size, caption });              // screen px; returns a Promise that resolves when done
//     faceY: where the shades land (default y - 0.2 size); size: the cat's on-screen height in px (sets every
//     size); caption: force one; shadesWidth: px; speed: time scale for debugging (0.1 = ten times slower)
//   mlg.active                                             // true while it plays; fire() while active is ignored
//   mlg.stop()                                             // remove it at once

const INK = '#121212', BUTTER = '#f3d36b';
const CAPTIONS = [['OH BABY A TRIPLE', 5], ['360 NO SCOPE', 3], ['GET REKT', 2], ['MOM GET THE CAMERA', 1]];
const FONT = '"Anton", Impact, Haettenschweiler, "Arial Narrow Bold", "Franklin Gothic Bold", sans-serif';

// Timeline, in seconds. hits: when each hitmarker ticks on (and its sound plays).
const TIMES = {
  full:    { hits: [0.12, 0.3, 0.48], hitLife: 0.55, chip: [0.04, 1.42], shades: [0.16, 0.78], slam: 0.84, exit: 1.56, end: 2.0 },
  reduced: { hits: [0.06, 0.2, 0.34], hitLife: 0.5, chip: [0.04, 1.0], shades: [0.1, 0.4], slam: 0.45, exit: 1.0, end: 1.3 },
};

// "Deal with it" shades, one char per pixel: X = black, W = white glint, . = clear. 30 x 6.
const SHADES = [
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  '...XXXXXXXXXXXXXXXXXXXXXXXX...',
  '...XWWXXXXXXXX..XWWXXXXXXXX...',
  '...XXWWXXXXXXX..XXWWXXXXXXX...',
  '....XXXXXXXXX....XXXXXXXXX....',
  '.....XXXXXXX......XXXXXXX.....',
];

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t * t * t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.9) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inBack: (t, s = 1.4) => (s + 1) * t ** 3 - s * t ** 2,
};
const SVG_NS = 'http://www.w3.org/2000/svg';
let uid = 0;

function pickCaption() {
  const total = CAPTIONS.reduce((n, [, w]) => n + w, 0);
  let r = Math.random() * total;
  for (const [text, w] of CAPTIONS) if ((r -= w) < 0) return text;
  return CAPTIONS[0][0];
}

function svg(w, h, viewBox, inner) {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('width', w); el.setAttribute('height', h);
  el.setAttribute('viewBox', viewBox);
  el.innerHTML = inner;
  return el;
}

// The classic hitmarker: four short diagonal strokes with the centre left open. Light grey on a dark outline.
function hitmarkerSVG(px) {
  const arm = (a, b, w, color) => [[1, 1], [1, -1], [-1, 1], [-1, -1]]
    .map(([sx, sy]) => `<line x1="${sx * a}" y1="${sy * a}" x2="${sx * b}" y2="${sy * b}" stroke="${color}" stroke-width="${w}" stroke-linecap="square"/>`).join('');
  return svg(px, px, '-50 -50 100 100', arm(15, 40, 13, INK) + arm(15, 40, 5.5, '#eeeeee'));
}

// Pixel shades: one path per colour, one unit square per pixel, crisp edges.
function shadesSVG(pixel) {
  let black = '', white = '';
  SHADES.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === 'X') black += `M${x} ${y}h1v1h-1z`;
    if (c === 'W') white += `M${x} ${y}h1v1h-1z`;
  }));
  const w = SHADES[0].length, h = SHADES.length;
  return svg(w * pixel, h * pixel, `0 0 ${w} ${h}`,
    `<g shape-rendering="crispEdges"><path d="${black}" fill="${INK}"/><path d="${white}" fill="#ffffff"/></g>`);
}

// A plain corn chip: a rounded triangle with bowed edges, warm orange, seasoning flecks, an ink outline.
function chipSVG(px) {
  const id = 'mlgchip' + ++uid;
  const P = [[0, -42], [38, 30], [-38, 30]];
  const r = 9, bow = 4;
  const along = (a, b, d) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [a[0] + dx / l * d, a[1] + dy / l * d]; };
  let d = '';
  P.forEach((p, i) => {
    const n = P[(i + 1) % 3], prev = P[(i + 2) % 3];
    const s = along(p, prev, r), e = along(p, n, r), e2 = along(n, p, r);
    // the bowed edge: control point pushed outward from the triangle's centre
    const mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2, ml = Math.hypot(mx, my);
    if (!i) d += `M${s[0].toFixed(1)} ${s[1].toFixed(1)}`;
    d += `Q${p[0]} ${p[1]} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
    d += `Q${(mx + mx / ml * bow).toFixed(1)} ${(my + my / ml * bow).toFixed(1)} ${e2[0].toFixed(1)} ${e2[1].toFixed(1)}`;
  });
  d += 'Z';
  const flecks = [[-8, -14, 2.6], [9, -4, 2.2], [-14, 12, 2.4], [4, 16, 2.8], [18, 18, 2], [-2, 2, 1.8], [-22, 22, 1.8], [2, -26, 1.8], [13, 8, 1.6]]
    .map(([x, y, rr], i) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${i % 3 ? '#b8430f' : '#8f2f0a'}" opacity=".8"/>`).join('');
  return svg(px, px, '-50 -50 100 100', `
    <defs><linearGradient id="${id}" x1="0" y1="-1" x2="0.3" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#fbc35a"/><stop offset=".55" stop-color="#f09a32"/><stop offset="1" stop-color="#dc7420"/>
    </linearGradient></defs>
    <path d="${d}" fill="url(#${id})" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-5 -30 Q-14 -10 -24 14" fill="none" stroke="#fff3cf" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>
    ${flecks}`);
}

function ensureFont() {
  if (document.getElementById('mlg-font')) return;
  const link = document.createElement('link');
  link.id = 'mlg-font'; link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Anton&display=swap';
  document.head.appendChild(link);
  link.addEventListener('load', () => document.fonts?.load?.('64px Anton').catch(() => {}));
}

function place(el, x, y, { scale = 1, rotate = 0, opacity = 1 } = {}) {
  el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  el.style.opacity = opacity.toFixed(3);
}

// onFrame: the page's one frame loop (an array of functions called every frame); the overlay rides it while it plays.
export function createMLG({ playSound = () => {}, onFrame = null } = {}) {
  ensureFont();
  let run = null;   // { root, frame, resolve, promise }
  if (onFrame) onFrame.push(() => { if (run?.frame) run.frame(performance.now()); });

  function stop() {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    run.frame = null;
    run.root.remove();
    const { resolve } = run;
    run = null;
    resolve();
  }

  function fire(x, y, opts = {}) {
    if (run) return run.promise;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const T = reduced ? TIMES.reduced : TIMES.full;
    const vw = innerWidth, vh = innerHeight;
    const size = opts.size ?? Math.min(vh * 0.42, 380);          // the cat's on-screen height, px
    const faceY = opts.faceY ?? y - size * 0.2;
    const caption = opts.caption ?? pickCaption();
    const speed = opts.speed ?? 1;

    const root = document.createElement('div');
    root.className = 'mlg';
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden;contain:strict;';
    const stage = document.createElement('div');
    stage.style.cssText = 'position:absolute;inset:0;';
    root.appendChild(stage);
    const add = (node) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;left:0;top:0;will-change:transform,opacity;opacity:0;line-height:0;';
      wrap.appendChild(node);
      stage.appendChild(wrap);
      return wrap;
    };

    // Hitmarkers on his body, in a loose triangle around the centre.
    const hitPx = Math.round(Math.min(72, Math.max(36, size * 0.18)));
    const hitAt = [[-0.2, -0.1], [0.19, 0.04], [-0.04, 0.21]].map(([dx, dy]) => [x + dx * size, y + dy * size]);
    const hits = hitAt.map(() => add(hitmarkerSVG(hitPx)));

    // Shades: about the width of his face, whole pixels so they stay crisp.
    const pixel = Math.max(2, Math.round((opts.shadesWidth ?? size * 0.5) / SHADES[0].length));
    const shades = add(shadesSVG(pixel));
    const shadesH = SHADES.length * pixel;

    const chipPx = Math.round(Math.min(96, Math.max(44, size * 0.24)));
    const chip = add(chipSVG(chipPx));
    const orbit = { rx: Math.min(size * 0.62, vw / 2 - chipPx * 0.6), ry: size * 0.2 };

    const cap = document.createElement('div');
    cap.textContent = caption;
    let capPx = Math.round(Math.min(size * 0.3, 96));
    cap.style.cssText = `font:${capPx}px/1 ${FONT};letter-spacing:.01em;white-space:nowrap;color:${BUTTER};` +
      `-webkit-text-stroke:.085em ${INK};paint-order:stroke fill;text-shadow:.05em .06em 0 ${INK};padding:.1em .15em;`;
    const capWrap = add(cap);
    capWrap.style.lineHeight = '1';
    document.body.appendChild(root);
    // Fit the caption inside the screen with a 16 px gutter.
    const capW = cap.offsetWidth;
    if (capW > vw - 32) { capPx = Math.floor(capPx * (vw - 32) / capW); cap.style.fontSize = capPx + 'px'; }
    const capY = Math.min(y + size * 0.36, vh - capPx * 0.9);
    const tilt = -6 + Math.random() * 2;

    playSound('airhorn');
    const ticked = [false, false, false];
    const t0 = performance.now();
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    run = { root, raf: 0, resolve, promise };

    const frame = (now) => {
      const t = (now - t0) / 1000 * speed;
      const out = seg(t, T.exit, T.end);   // 0 -> 1 as it leaves

      // Hitmarkers: tick on with a scale pop, hold briefly, fade.
      hits.forEach((el, i) => {
        const a = T.hits[i];
        if (t >= a && !ticked[i]) { ticked[i] = true; playSound('hitmarker'); }
        const pop = seg(t, a, a + 0.12), fade = seg(t, a + T.hitLife, a + T.hitLife + 0.15);
        const scale = reduced ? 1 : lerp(1.7, 1, ease.outCubic(pop));
        place(el, hitAt[i][0], hitAt[i][1], { scale, opacity: t < a ? 0 : 1 - fade, rotate: i * 4 - 4 });
      });

      // Chip: one full orbit (front of the ellipse is larger, back smaller), spinning as it goes.
      {
        const [a, b] = T.chip;
        const k = seg(t, a, b);
        const appear = ease.outBack(seg(t, a, a + 0.18));
        if (reduced) {
          const ox = x + orbit.rx, oy = y - size * 0.05;
          place(chip, lerp(ox, ox + vw * 0.1, ease.inCubic(out)), oy,
            { rotate: -10 + 20 * ease.inOutSine(k), opacity: seg(t, a, a + 0.15) * (1 - out) });
        } else {
          const ang = Math.PI * 0.15 + Math.PI * 2 * ease.inOutSine(k);   // starts front-right, goes round once
          const depth = Math.sin(ang);                                      // +1 front, -1 back
          let cx = x + Math.cos(ang) * orbit.rx, cy = y + depth * orbit.ry;
          cx -= (vw * 0.6) * ease.inBack(seg(t, T.exit + 0.08, T.end));     // then off to the left
          place(chip, cx, cy, { scale: appear * (0.92 + depth * 0.16), rotate: 25 + 720 * ease.inOutSine(k), opacity: 1 });
        }
      }

      // Shades: drop from above the screen onto his face, a small settle on landing, then up and away.
      {
        const [a, b] = T.shades;
        const k = seg(t, a, b);
        const startY = reduced ? faceY - shadesH * 3 : -shadesH * 2;
        let sy = lerp(startY, faceY, reduced ? ease.outCubic(k) : k * (2 - k));   // ease-out quad: the meme's slow fall
        const land = seg(t, b, b + 0.16);
        const squash = reduced ? 0 : Math.sin(land * Math.PI) * 0.06;
        let opacity = reduced ? seg(t, a, a + 0.2) : t >= a ? 1 : 0;
        if (reduced) opacity *= 1 - out;
        else sy -= (faceY + shadesH * 3) * ease.inBack(seg(t, T.exit, T.end - 0.06));
        place(shades, x, sy, { opacity });
        shades.style.transform += ` scale(${(1 + squash).toFixed(3)}, ${(1 - squash).toFixed(3)})`;
      }

      // Caption: slammed in with a tilt, then off to the right.
      {
        const k = seg(t, T.slam, T.slam + (reduced ? 0.2 : 0.18));
        const scale = reduced ? lerp(1.08, 1, ease.outCubic(k)) : lerp(2.3, 1, ease.outBack(k));
        const opacity = (t < T.slam ? 0 : Math.min(1, k * 3)) * (reduced ? 1 - out : 1);
        const cx = vw / 2 + (reduced ? 0 : vw * 1.1 * ease.inBack(seg(t, T.exit + 0.04, T.end)));
        place(capWrap, cx, capY, { scale, rotate: tilt, opacity });
      }

      // Shake on the slam: a short decaying jolt of the whole overlay (not with reduced motion).
      if (!reduced) {
        const s = seg(t, T.slam + 0.06, T.slam + 0.32);
        const amp = s > 0 && s < 1 ? 7 * (1 - s) : 0;
        stage.style.transform = amp ? `translate(${(Math.sin(t * 95) * amp).toFixed(1)}px, ${(Math.cos(t * 77) * amp * 0.6).toFixed(1)}px)` : '';
      }

      if (t >= T.end) { stop(); return; }
      if (!onFrame) run.raf = requestAnimationFrame(frame);
    };
    if (onFrame) run.frame = frame;
    frame(t0);   // draws the first frame now; the rest follow the page's frame loop
    return promise;
  }

  return { fire, stop, get active() { return !!run; } };
}
