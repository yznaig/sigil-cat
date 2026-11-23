// The last page (docs/journey/design.md §5.1-5.2): a torn grimoire page in eight scraps, one per room trophy
// (PIECES in ./graph.js), and his own sign, the cat-head outline (the `cathead` sigil in src/sigils/templates.js).
// The scraps are the sign's stroke cut in eight by length: the nth piece earned brings back the nth stretch of it, so
// the shape assembles in drawing order. Whole, the page shows the sign with its start dot. Drawing the sign before
// then: he looks at you and says "not yet." (no find, no fizzle). With the page whole: the ending (./ending.js).
//   journey.lastpage.count()        pieces earned (0-8)       .whole()   all eight
//   journey.lastpage.things         piece id -> where its scrap was ("it was in the {thing}", voice unit)
//   journey.lastpage.cast(info)     what drawing the sign does (site.spells.cathead)
//   journey.lastpage.svg(n)         the page's picture with n scraps (the room card may borrow it)
// Saved: 'journey.pieceSeen' [ids]: the pieces already seen in the grimoire. One not yet seen puts a small butter dot
// on the grimoire link (and a tick, as the achievements' mark does) until the book is opened; there it fades in.
import { SIGILS } from '../sigils/templates.js';

export const THINGS = {
  fluent: 'grimoire', lostgame: 'controller', recycle: 'bin', birthday: 'cake',
  dressup: 'hat rack', light: 'lamp', collector: 'shelf', curator: 'board',
};
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const list = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
const NOT_YET = ['not yet.', 'not yet. the page is not whole.', 'still not yet. i do not make the rules. i do, but still.'];

// the sign, fitted into the page's 200 x 200 picture, and cut into eight stretches of equal length
const W = 200, BOX = [38, 44, 124, 124];          // x, y, w, h of the sign inside the page
function signPoints() {
  const pts = SIGILS.cathead.templates[0];
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), x0 = Math.min(...xs), y0 = Math.min(...ys);
  const k = Math.min(BOX[2] / (Math.max(...xs) - x0), BOX[3] / (Math.max(...ys) - y0));
  const ox = BOX[0] + (BOX[2] - (Math.max(...xs) - x0) * k) / 2, oy = BOX[1] + (BOX[3] - (Math.max(...ys) - y0) * k) / 2;
  return pts.map((p) => [(p.x - x0) * k + ox, (p.y - y0) * k + oy]);
}
const SIGN = signPoints();
const SEGS = (() => {
  const cum = [0];
  for (let i = 1; i < SIGN.length; i++) cum.push(cum[i - 1] + Math.hypot(SIGN[i][0] - SIGN[i - 1][0], SIGN[i][1] - SIGN[i - 1][1]));
  const total = cum[cum.length - 1], out = [];
  for (let s = 0; s < 8; s++) {
    const a = (total * s) / 8, b = (total * (s + 1)) / 8;
    out.push(SIGN.filter((_, i) => cum[i] >= a - 0.01 && cum[i] <= b + 0.01));
  }
  return out;
})();
const d = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
// a small steady wobble (no Math.random: the same torn edges on every render)
const wob = (i, amp) => Math.sin(i * 12.9898 + amp * 78.233) * 43758.5453 % 1 * amp;
// a scrap of paper round one stretch: its box, grown a little, with torn (zig-zag) edges
function scrapPath(seg, s) {
  const xs = seg.map((p) => p[0]), ys = seg.map((p) => p[1]), pad = 11;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const edge = (ax, ay, bx, by, n, seed) => Array.from({ length: n }, (_, i) => {
    const t = i / n, j = i % 2 ? 1.5 : -1.5;
    return [ax + (bx - ax) * t + (ay === by ? 0 : j + wob(seed + i, 1)), ay + (by - ay) * t + (ay === by ? j + wob(seed + i, 1) : 0)];
  });
  const n = (len) => Math.max(3, Math.round(len / 9));
  const ring = [...edge(x0, y0, x1, y0, n(x1 - x0), s * 7), ...edge(x1, y0, x1, y1, n(y1 - y0), s * 7 + 50),
    ...edge(x1, y1, x0, y1, n(x1 - x0), s * 7 + 100), ...edge(x0, y1, x0, y0, n(y1 - y0), s * 7 + 150)];
  return d(ring) + 'Z';
}
const SCRAPS = SEGS.map(scrapPath);
// the page itself: a sheet torn off along its left edge
const SHEET = (() => {
  const left = Array.from({ length: 15 }, (_, i) => [14 + (i % 2 ? 5 : 0) + wob(i, 3), 10 + i * 12.9]);
  return d([[186, 10], [186, 190], ...left.reverse(), [14, 10]]) + 'Z';
})();

export function pageSvg(n, { fresh = [] } = {}) {
  const whole = n >= 8, s = SIGN[0];
  // all the paper first, then all the ink: a later scrap never covers an earlier one's stroke
  const scrap = (i, inner) => `<g class="lp-scrap${fresh.includes(i) ? ' fresh' : ''}" data-scrap="${i}" style="--i:${fresh.indexOf(i)}">${inner}</g>`;
  const shown = SEGS.slice(0, Math.min(n, 8));
  const scraps = shown.map((_, i) => scrap(i, `<path class="paper" d="${SCRAPS[i]}"/>`)).join('')
    + shown.map((seg, i) => `<g class="lp-ink${fresh.includes(i) ? ' fresh' : ''}" style="--i:${fresh.indexOf(i)}"><path class="ink" d="${d(seg)}"/></g>`).join('');
  return `<svg class="lp-page${whole ? ' whole' : ''}" viewBox="0 0 ${W} ${W}" role="img" aria-label="${whole ? 'the last page, whole: his own sign' : `the last page: ${n} of eight scraps`}">`
    + `<path class="sheet" d="${SHEET}"/>${scraps}`
    + (whole ? `<path class="sign" d="${d(SIGN)}"/><circle class="dot" cx="${s[0].toFixed(1)}" cy="${s[1].toFixed(1)}" r="5.5"/>` : '')
    + '</svg>';
}

const CSS = `
.journey[data-journey="lastpage"] { margin: 34px auto 10px; max-width: 420px; text-align: center; }
.journey[data-journey="lastpage"] h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: .14em; }
.lp-count { margin: 0 0 10px; color: var(--soft); font-size: 12px; letter-spacing: .12em; }
.lp-page { display: block; width: min(220px, 62vw); height: auto; margin: 0 auto; overflow: visible; }
.lp-page .sheet { fill: none; stroke: rgba(43, 39, 36, .28); stroke-width: 1; stroke-dasharray: 3 4; }
.lp-page .paper { fill: #f6e3cf; stroke: rgba(43, 39, 36, .35); stroke-width: .8; }
.lp-page .ink, .lp-page .sign { fill: none; stroke: var(--ink, #121212); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.lp-page.whole .lp-ink { display: none; }
.lp-page .dot { fill: var(--ink, #121212); }
.lp-page .fresh { animation: lp-in 1.1s calc(.35s + var(--i) * .45s) both cubic-bezier(.3, 1.3, .5, 1); transform-box: fill-box; transform-origin: center; }
.lp-page .lp-ink.fresh { animation-name: lp-ink; }
@keyframes lp-ink { from { opacity: 0; transform: translateY(-10px) rotate(-6deg) scale(1.08); } 40% { opacity: 0; } }
@keyframes lp-in { from { opacity: 0; transform: translateY(-10px) rotate(-6deg) scale(1.08); } }
.lp-line { margin: 12px 0 0; font-weight: 700; }
.lp-from { margin: 6px 0 0; color: var(--soft); font-size: 12px; letter-spacing: .06em; }
.lp-card { margin-top: 12px; }
@media (prefers-reduced-motion: reduce) { .lp-page .lp-ink.fresh { animation-name: lp-ink; }
@keyframes lp-ink { from { opacity: 0; transform: translateY(-10px) rotate(-6deg) scale(1.08); } 40% { opacity: 0; } }
.lp-page .fresh { animation: none; } }
#grimoire.lp-new::after { content: ""; display: inline-block; width: 6px; height: 6px; margin-left: 5px; border-radius: 50%;
  background: var(--butter, #f3d36b); box-shadow: 0 0 0 1.5px var(--dark, #2b2724); vertical-align: 3px; }
`;

export default function createLastPage(site, journey) {
  const { store, ui, cat, stage } = site;
  if (!document.getElementById('journey-lastpage-css')) {
    const st = document.createElement('style'); st.id = 'journey-lastpage-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const earned = () => journey.pieces();
  const count = () => earned().length;
  const seen = () => store.get('journey.pieceSeen', []) || [];
  let tries = 0, saidAt = 0;

  // ---- the grimoire link's mark: a piece not yet seen ----
  const link = document.getElementById('grimoire');
  const markLink = () => link?.classList.toggle('lp-new', earned().some((id) => !seen().includes(id)));
  markLink();
  journey.on('piece', () => {
    markLink();
    if (link && !stage.reducedMotion) link.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-6deg)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 650, delay: 260, easing: 'cubic-bezier(.3,1.5,.5,1)' });
  });

  // ---- the page in the grimoire ----
  let fresh = [];
  journey.addSection('grimoire', {
    id: 'lastpage', order: 50,
    html() {
      const ids = earned(), n = ids.length, before = seen();
      fresh = ids.map((id, i) => (before.includes(id) ? -1 : i)).filter((i) => i >= 0 && i < 8);
      const ended = !!store.get('journey.ended');
      const line = !n ? 'a page is missing.' : n < 8 ? 'the rest of it is somewhere in the room.'
        : ended ? 'his own sign. the room was full.' : 'his own sign. draw it when the room is full.';
      const from = n && n < 8 ? `<p class="lp-from">${n === 1 ? 'a scrap' : 'scraps'} found in ${list(ids.map((id) => 'the ' + THINGS[id]))}</p>` : '';
      const card = ended && journey.snapshot?.open ? '<p class="lp-card"><button type="button" class="felt" data-lp-card>the room card</button></p>' : '';
      return `<h2>the last page</h2><p class="lp-count">${n ? `${WORDS[Math.min(n, 8)]} of eight` : 'torn out'}</p>${pageSvg(n, { fresh })}<p class="lp-line">${line}</p>${from}${card}`;
    },
    mount(el) {
      store.set('journey.pieceSeen', earned());
      markLink();
      el.querySelector('[data-lp-card]')?.addEventListener('click', () => { site.books?.close?.(); journey.snapshot?.open?.({ ending: true }); });
    },
  });

  // ---- his own sign ----
  // The first sigil ever drawn hangs a bulb over his head (src/world/lamp.js beforeCast): never for this one.
  const before = site.beforeCast;
  if (before) site.beforeCast = (name, info) => (name === 'cathead' ? null : before(name, info));

  function say(id, text) {
    saidAt = performance.now();
    ui.speak(text);
    journey.emit('said', { id, text, node: 'ending' });
  }
  function notYet() {
    // he turns to face you for a moment
    cat.setYawTarget?.(0, 4);
    setTimeout(() => cat.setYawTarget?.(null), 1800);
    const text = NOT_YET[Math.min(tries, NOT_YET.length - 1)];
    tries++;
    if (performance.now() - saidAt > 1500) say('not-yet', text);
    return 'not-yet';
  }
  function cast(info = {}) {
    if (journey.ending?.running) return null;
    if (count() < 8) return notYet();
    if (journey.ending?.play) return journey.ending.play({ info });
    return notYet();
  }
  site.spells.cathead = cast;

  return { THINGS, things: THINGS, count, whole: () => count() >= 8, cast, svg: pageSvg, get tries() { return tries; } };
}
