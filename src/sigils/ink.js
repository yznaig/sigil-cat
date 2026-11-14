// Drawing on the air. A press on empty space draws ink on the #ink canvas; on release the recognizer names it:
//   a sigil               the ink lights up once and sinks into the cat, and site.cast(name) does the rest
//   a straight-ish line   it was a swipe, not a sigil: he is flung by its speed (so swiping beside him still spins him)
//   too short             a tap on the void; the ink just fades
//   anything else         the ink crumbles to dust with a fizzle
// The canvas is only repainted while there is ink on it.
import { SIGILS } from './templates.js';
import { createRecognizer } from './recognize.js';

export const INK = { width: 5, color: '18,18,18', glow: '243,211,107', minScore: 0.8 };

export function createInk(site) {
  const { stage, cat, audio, input, ui } = site;
  const recognizer = createRecognizer(SIGILS, { minScore: INK.minScore });
  const canvas = document.getElementById('ink'), g = canvas.getContext('2d');
  let dpr = 1, stroke = null, clean = true;
  const fx = [], log = [];
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    clean = false;
  }
  addEventListener('resize', resize); resize();
  audio.loadAll(['cast-wind', 'fizzle']);

  input.claim(10, (e) => {
    if (!cat.loaded) return null;
    stroke = { pts: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
    return {
      move(ev) {
        if (!stroke) return;
        const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [];
        for (const c of evs.length ? evs : [ev]) stroke.pts.push({ x: c.clientX, y: c.clientY, t: c.timeStamp || ev.timeStamp });
      },
      end(ev) {
        const st = stroke; stroke = null;
        if (!st) return;
        if (ev.type === 'pointercancel') { fx.push({ kind: 'fade', pts: st.pts, t: 0 }); return; }
        finish(st);
      },
    };
  });

  function finish(st) {
    const res = recognizer.recognize(st.pts);
    log.push({ at: Math.round(performance.now()), ...res, n: st.pts.length }); if (log.length > 20) log.shift();
    if (res.name && site.spells[res.name]) {
      fx.push({ kind: 'cast', pts: st.pts, t: 0, target: cat.screenOf([0, cat.height * 0.55, 0]) });
      ui.hintDone(2);
      return site.cast(res.name, { ...res, stroke: st.pts });
    }
    if (res.reason === 'line') return flingFrom(st);
    if (res.reason === 'short') { fx.push({ kind: 'fade', pts: st.pts, t: 0 }); return null; }
    ui.hintDone(2);
    audio.play('fizzle', { gain: 0.5 });
    site.achievements?.unlock('scribble');
    const dust = [];
    for (let i = 0; i < st.pts.length; i += Math.max(1, Math.floor(st.pts.length / 70))) {
      const p = st.pts[i];
      dust.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 50, r: 1 + Math.random() * 2.2 });
    }
    fx.push({ kind: 'dust', dust, t: 0 });
    return null;
  }
  // A sideways swipe beside him: spin him by its speed over the last ~100 ms, like a drag would have.
  function flingFrom(st) {
    fx.push({ kind: 'fade', pts: st.pts, t: 0 });
    const p = st.pts, last = p[p.length - 1], R = cat.config.rotate;
    let j = p.length - 1;
    while (j > 0 && last.t - p[j].t < 100) j--;
    const dt = Math.max((last.t - p[j].t) / 1000, 1 / 60), dx = last.x - p[j].x, total = last.x - p[0].x;
    // he did not turn while it was drawn (it might have been a sigil), so the coast also covers the swipe's whole
    // length: a coast from speed v travels v / damping radians
    if (Math.abs(total) > Math.abs(last.y - p[0].y)) { cat.fling(dx * R.radiansPerPixel / dt + total * R.radiansPerPixel * R.damping); ui.hintDone(0); }
  }

  const path = (pts, k = 1, tx = 0, ty = 0) => {
    g.beginPath();
    pts.forEach((p, i) => { const x = (p.x + (tx - p.x) * (1 - k)) * dpr, y = (p.y + (ty - p.y) * (1 - k)) * dpr; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  };
  function draw(dt) {
    if (!stroke && !fx.length) { if (!clean) { g.clearRect(0, 0, canvas.width, canvas.height); clean = true; } return; }
    clean = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const W = INK.width * dpr;
    if (stroke && stroke.pts.length > 1) { g.strokeStyle = `rgba(${INK.color},0.85)`; g.lineWidth = W; path(stroke.pts); g.stroke(); }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt;
      if (f.kind === 'fade') {
        const a = 1 - f.t / 0.35;
        if (a <= 0) { fx.splice(i, 1); continue; }
        g.strokeStyle = `rgba(${INK.color},${0.85 * a})`; g.lineWidth = W; path(f.pts); g.stroke();
      } else if (f.kind === 'cast') {
        const T = 0.75;
        if (f.t >= T) { fx.splice(i, 1); continue; }
        const glow = Math.min(1, f.t / 0.12), sink = Math.max(0, (f.t - 0.25) / (T - 0.25));
        const k = 1 - sink * sink;                                  // shrink toward the cat
        // the glow is three wide soft strokes, not a canvas shadow (a shadow blur over a full-page canvas is what
        // made the old bolt freeze for a second)
        for (const [w, a] of [[5, 0.12], [3, 0.22], [1.6, 0.9]]) {
          g.lineWidth = W * (1 + glow * (1 - sink)) * w / 1.6; g.strokeStyle = `rgba(${INK.glow},${(1 - sink) * a})`;
          path(f.pts, k, f.target.x, f.target.y); g.stroke();
        }
        g.strokeStyle = `rgba(${INK.color},${(1 - glow) * 0.85})`; g.lineWidth = W; path(f.pts); g.stroke();
      } else if (f.kind === 'dust') {
        const a = 1 - f.t / 0.8;
        if (a <= 0) { fx.splice(i, 1); continue; }
        g.fillStyle = `rgba(60,55,50,${a * 0.8})`;
        for (const d of f.dust) {
          d.vy += 220 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
          g.beginPath(); g.arc(d.x * dpr, d.y * dpr, d.r * dpr * a, 0, Math.PI * 2); g.fill();
        }
      }
    }
  }
  stage.onFrame.push(draw);

  const api = {
    recognizer, SIGILS, get log() { return [...log]; }, get drawing() { return !!stroke; }, get busy() { return !!stroke || fx.length > 0; },
    // Tests and #debug: run a stroke through the same path as a real one.
    castStroke(pts) { finish({ pts: pts.map((p, i) => ({ t: p.t ?? i * 16, ...p })) }); return log[log.length - 1]; },
  };
  stage.debugExtra.push(() => { const l = log[log.length - 1]; return `sigil   ${l ? (l.name ? `${l.name} ${l.score.toFixed(2)}` : `${l.reason}${l.best ? ' (' + l.best + ' ' + l.score.toFixed(2) + (l.why ? ', ' + l.why : '') + ')' : ''}`) : '-'}`; });
  return api;
}
