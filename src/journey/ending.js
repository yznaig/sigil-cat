// The ending (docs/journey/design.md §5.3): his own sign drawn with the last page whole. About twenty seconds with the
// player's hands taken away (input.lock('ending')): the music fades, the room dims to dusk (one full-screen gradient
// layer, not a relight), the lamp glows warmer if it is lit, every trophy in the room glints once, one by one, he says
// end-1 ... end-4, goes to sleep, and his script writes the credits across the middle. Then the achievement Goodnight,
// 'journey.ended' saved, 'ending-done', the hands back, and the room card (journey.snapshot, unit sc/p9-share, if it is
// there). He sleeps until the next tap on him: that is the post-game. Reduced motion: the dusk cuts in, no glints,
// the same lines and card. Drawing the sign again replays it, once per visit.
//   journey.ending.play({ replay }) -> Promise   journey.ending.running   journey.ending.ended   journey.ending.log
import { byWhen } from './lines.js';

const E = {
  credits: ['sigil cat', 'made by two brothers', 'thank you for playing'],   // Aaron's call on names (design REPORT Q2)
  duskIn: 3200,       // ms the dusk takes to come in (reduced motion: a cut)
  duskOut: 2200,      // ms it takes to go when he wakes
  glintGap: 380,      // ms between two trophies' glints
  glintMs: 900,       // one glint
  creditsMs: 5200,    // how long the credits stay once written
  sleepHold: 600,     // s he stays asleep unless tapped
  fade: 2.5,          // s the music takes to fade out
};
const SPARK = '<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0-10C1-3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10z"/></svg>';
const CSS = `
.journey-dusk { position: fixed; inset: 0; z-index: 4; pointer-events: none; opacity: 0;
  background: linear-gradient(180deg, rgba(38, 34, 70, .62) 0%, rgba(74, 52, 82, .42) 48%, rgba(150, 92, 70, .30) 100%); mix-blend-mode: multiply; }
.journey-lamp { position: fixed; z-index: 4; pointer-events: none; width: 340px; height: 340px; margin: -170px 0 0 -170px; border-radius: 50%; opacity: 0;
  background: radial-gradient(closest-side, rgba(255, 196, 110, .55), rgba(255, 170, 90, .18) 55%, rgba(255, 160, 80, 0)); mix-blend-mode: screen; }
.journey-glint { position: fixed; z-index: 7; pointer-events: none; width: 34px; height: 34px; margin: -17px 0 0 -17px; }
.journey-glint svg { width: 100%; height: 100%; fill: #fff6d8; filter: drop-shadow(0 0 4px rgba(243, 211, 107, .95)) drop-shadow(0 0 10px rgba(243, 211, 107, .7)); }
.journey-credits { position: fixed; z-index: 6; left: 50%; top: 50%; translate: -50% -50%; margin: 0; width: max-content; max-width: calc(100vw - 32px);
  pointer-events: none; text-align: center; color: var(--dark, #2b2724); opacity: 0; transition: opacity .8s;
  text-shadow: 0 0 2px var(--page), 0 0 6px var(--page), 0 0 14px rgba(253, 240, 230, .9); }
.journey-credits.on { opacity: 1; }
.journey-credits p { margin: 0 0 .5em; font-weight: 800; letter-spacing: .12em; font-size: 15px; }
.journey-credits p:first-child { font-size: 26px; letter-spacing: .16em; margin-bottom: .6em; }
@media (max-height: 500px) { .journey-credits p { font-size: 13px; } .journey-credits p:first-child { font-size: 20px; } }
body.journey-ending .top, body.journey-ending #footer { opacity: .18; }
`;

export default function createEnding(site, journey) {
  const { store, ui, cat, input, stage, audio } = site;
  if (!document.getElementById('journey-ending-css')) {
    const st = document.createElement('style'); st.id = 'journey-ending-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const calm = () => stage.reducedMotion;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let running = false, playedThisVisit = false, dusk = null, lampGlow = null, sleeping = false;
  const log = [];
  const note = (what) => { log.push({ at: Math.round(performance.now()), what }); };

  // an ending from an older save (the achievement row came later, or was lost): earn it quietly
  if (store.get('journey.ended') && !journey.has('ending')) site.achievements?.unlock?.('ending', { quiet: true });

  function layer(cls) { const el = document.createElement('div'); el.className = cls; document.body.appendChild(el); return el; }
  function fadeTo(el, to, ms) {
    if (!el) return Promise.resolve();
    if (calm() || !ms) { el.style.opacity = String(to); return Promise.resolve(); }
    const from = Number(getComputedStyle(el).opacity) || 0;
    const a = el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    return a.finished.then(() => { el.style.opacity = String(to); a.cancel(); }).catch(() => {});
  }

  // where the trophies are on the screen: every keepsake in the room (shelf, board, rack, floor) and every sticker
  function trophySpots() {
    const out = [], W = innerWidth, H = innerHeight;
    const add = (r, id) => {
      if (!r || !(r.w > 2 && r.h > 2)) return;
      const x = r.x + r.w / 2, y = r.y + r.h / 2;
      if (x < 0 || y < 0 || x > W || y > H) return;
      if (out.some((p) => Math.hypot(p.x - x, p.y - y) < 18)) return;
      out.push({ x, y, id });
    };
    for (const i of site.keepsakes?.live?.values?.() || []) {
      if (i.stored || i.held || i.def?.inert) continue;
      const b = i.el?.getBoundingClientRect?.();
      add(b && b.width > 2 ? { x: b.left, y: b.top, w: b.width, h: b.height } : i.box, i.id);
    }
    for (const el of document.querySelectorAll('.sticker')) { const b = el.getBoundingClientRect(); add({ x: b.left, y: b.top, w: b.width, h: b.height }, 'sticker'); }
    return out.sort((a, b) => a.x - b.x);
  }
  async function glints() {
    const spots = trophySpots();
    note(`glints ${spots.length}`);
    if (calm()) return spots.length;
    for (const s of spots) {
      const g = layer('journey-glint'); g.innerHTML = SPARK; g.style.left = s.x + 'px'; g.style.top = s.y + 'px';
      g.animate([{ opacity: 0, transform: 'scale(.2) rotate(0deg)' }, { opacity: 1, transform: 'scale(1.15) rotate(45deg)', offset: 0.4 }, { opacity: 0, transform: 'scale(.4) rotate(90deg)' }],
        { duration: E.glintMs, easing: 'ease-out' }).finished.then(() => g.remove(), () => g.remove());
      audio?.play?.('click', { gain: 0.12 });
      await wait(E.glintGap);
    }
    return spots.length;
  }
  function warmLamp() {
    if (!site.lamp?.on) return;
    const b = site.keepsakes?.get?.('bulb'), r = b?.el?.getBoundingClientRect?.();
    const box = r && r.width > 2 ? { x: r.left, y: r.top, w: r.width, h: r.height } : b?.box;
    if (!box) return;
    lampGlow = layer('journey-lamp');
    lampGlow.style.left = box.x + box.w / 2 + 'px'; lampGlow.style.top = box.y + box.h / 2 + 'px';
    fadeTo(lampGlow, 1, E.duskIn);
    note('lamp warmer');
  }
  async function speakEnd() {
    const lines = byWhen('ending');
    for (const l of lines) {
      journey.emit('said', { id: l.id, text: l.text, node: 'ending' });
      note('said ' + l.id);
      if (l.id === 'end-4') { await ui.speak(l.text); break; }
      await ui.speak(l.text);
    }
  }
  async function credits() {
    const el = document.createElement('div'); el.className = 'journey-credits'; el.setAttribute('aria-live', 'polite');
    el.innerHTML = E.credits.map((t) => `<p class="runes">${t.replace(/./g, '&nbsp;')}</p>`).join('');
    document.body.appendChild(el);
    placeCredits(el);
    requestAnimationFrame(() => el.classList.add('on'));
    let settle = 0;
    [...el.children].forEach((p, i) => { setTimeout(() => ui.runes?.(p, E.credits[i], { plain: calm(), words: true, delay: 300, step: 45 }) ?? (p.textContent = E.credits[i]), i * 900); settle = Math.max(settle, i * 900 + 300 + E.credits[i].length * 45); });
    if (!ui.runes) [...el.children].forEach((p, i) => { p.textContent = E.credits[i]; });
    note('credits');
    await wait(settle + E.creditsMs);
    el.classList.remove('on');
    await wait(900);
    el.remove();
  }
  // above his head as he sleeps, if there is room between it and the words at the top; else across the middle
  function placeCredits(el) {
    const crown = site.config?.cat?.crown?.sleep, top = (stage.insets?.top || 40) + 8;
    const p = crown && cat.loaded ? cat.screenOf([crown[0], crown[1] + 0.12, crown[2]]) : null;
    const h = el.getBoundingClientRect().height;
    if (p && Number.isFinite(p.y) && p.y - h >= top) { el.style.top = p.y - h / 2 + 'px'; }
  }
  function goToSleep() {
    cat.stay?.(E.sleepHold);
    cat.request?.('sleep');
    sleeping = true;
    note('sleep');
  }
  // the post-game: he wakes on the next tap on him (the pose cycle's own sleep -> wake), and the dusk lifts
  function wakeOnTap() {
    const off = () => {
      if (!sleeping) return;
      sleeping = false;
      const d = dusk, g = lampGlow; dusk = null; lampGlow = null;
      Promise.all([fadeTo(d, 0, E.duskOut), fadeTo(g, 0, E.duskOut)]).then(() => { d?.remove(); g?.remove(); });
      note('woke');
    };
    cat.onTap?.push?.(off);
    // a sleeping cat that is never tapped still lets the room come back after a while
    setTimeout(off, E.sleepHold * 1000);
  }

  async function play({ replay = !!store.get('journey.ended') } = {}) {
    if (running) return false;
    if (playedThisVisit) { ui.speak('once a night is plenty.'); journey.emit('said', { id: 'end-again', text: 'once a night is plenty.', node: 'ending' }); return false; }
    running = true; playedThisVisit = true; log.length = 0;
    note(replay ? 'start (replay)' : 'start');
    journey.emit('ending-start', { replay });
    input.lock('ending', true);
    const release = site.music?.hold?.('ending', { fade: E.fade });
    try {
      document.body.classList.add('journey-ending');
      dusk?.remove(); lampGlow?.remove();
      dusk = layer('journey-dusk');
      cat.setYawTarget?.(0, 2);
      const dim = fadeTo(dusk, 1, E.duskIn);
      warmLamp();
      await wait(calm() ? 300 : 900);
      const talk = speakEnd();
      await Promise.all([dim, glints()]);
      await talk;
      goToSleep();
      await wait(calm() ? 400 : 1600);
      await credits();
      if (!replay) {
        store.set('journey.ended', Date.now());
        site.achievements?.unlock?.('ending');
      }
      cat.setYawTarget?.(null);
      document.body.classList.remove('journey-ending');      // the words come back for Goodnight's stamp; the dusk stays
      note('done');
    } catch (e) {
      console.error('journey ending', e);
    } finally {
      input.lock('ending', false);
      release?.();
      running = false;
      document.body.classList.remove('journey-ending');
      wakeOnTap();
      journey.emit('ending-done', { replay });
    }
    // the room card, ending variant (unit sc/p9-share), once the achievement's stamp has had its moment. This is its
    // only opener (snapshot.js no longer opens it on 'ending-done' too), and the card shows once per ending.
    await wait(replay ? 600 : 3800);
    try { journey.snapshot?.open?.({ ending: true }); note('card'); } catch (e) { console.error('journey ending card', e); }
    return true;
  }

  return { play, get running() { return running; }, get ended() { return !!store.get('journey.ended'); }, get sleeping() { return sleeping; }, log, config: E };
}
