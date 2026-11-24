// The whisker harp (gag 7; no sigil). Tap a whisker and it plucks a note. His six whiskers are in tune: B3 C4 D4 on
// the three on your left (top to bottom), E4 F#4 B4 on the three on your right.
// Nothing more happens until Aaron's tune is played on them: C C B C D C (playtest 2; the middle-left whisker twice,
// the top-left, the middle-left, the bottom-left, the middle-left). Then Butterman gives an encore, a fourth scene that
// the B sigil does not play, and the ticket falls. The encore plays once ever (src/eggs/butterman.js encore()); the
// tune played again after that makes all six whiskers flare gold together.
// A plucked whisker that is the next right note rings gold and glows (a wide soft halo under a bright line, held a
// little longer); a wrong note rings pale and thin, and the tune starts over from whatever it can still be the start of.
// Plucking any whisker keeps him in his pose for four seconds (cat.stay), so he does not pop away mid-tune.
// The keyboard plays them at any time: A S D for the whiskers on your left (top to bottom), J K L for the ones on your
// right (playtest 2; always on since the harp lane, music round, e1116-11). A key is a pluck like any other, tune
// included. Once the harp is found and the encore has been seen, he tells you about the keys.
// On a phone (a coarse pointer, as Nearer/Deeper), a pluck brings up six whisker buttons at the bottom for 10 s after
// the last pluck (harp lane, music round, e1116-11); a held item's Nearer/Deeper win the place while it is held.
// The whiskers' places come from the splats (tools/splats/whiskers.mjs, SITE.cat.whiskers).
import {cardService} from '../world/cards.js';
import { css, el } from '../core/util.js';

export const HARP = {
  reach: 12,             // px: how near a whisker a tap must be
  // each whisker's note, in semitones above B3: his left three (top to bottom), then his right three
  notes: [0, 1, 3, 5, 7, 12],
  sample: { name: 'pluck', semitone: 1 },      // the synthesized tine is exact C4, one semitone above B3
  tune: [1, 1, 0, 1, 2, 1],                    // the whiskers to pluck, in order: C C B C D C
  patience: 4,           // seconds between notes before the tune starts over
  gain: 0.6,
  stay: 4,               // seconds he keeps his pose after any pluck (playtest 2)
  keys: { a: 0, s: 1, d: 2, j: 3, k: 4, l: 5 },  // the keyboard's whiskers: yours-left top to bottom, then yours-right
  ring: { right: 0.95, wrong: 0.7 },           // seconds a plucked whisker rings
  // the phone's whisker buttons (harp lane, music round): shown for `seconds` after the last pluck, then faded out over
  // `fade` s; each `w` x `h` px, `gap` apart, the left three and the right three `split` apart, `lift` px over the sigils
  buttons: { seconds: 10, fade: 0.35, w: 48, h: 44, gap: 6, split: 24, lift: 6 },
};
css('harp', `
#harp-fx { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; overflow: visible; }
#harp-fx path { fill: none; stroke-linecap: round; }
#harp-keys { position: fixed; z-index: 7; display: flex; gap: ${HARP.buttons.split}px; translate: -50% 0; transition: opacity ${HARP.buttons.fade}s;
  touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
#harp-keys.out { opacity: 0; pointer-events: none; }
#harp-keys.still { transition: none; }
#harp-keys .side { display: flex; gap: ${HARP.buttons.gap}px; }
#harp-keys button { width: ${HARP.buttons.w}px; height: ${HARP.buttons.h}px; padding: 0; display: grid; place-items: center; touch-action: none; }
#harp-keys button svg { width: 30px; height: 22px; overflow: visible; pointer-events: none; }
#harp-keys button line { stroke: currentColor; stroke-linecap: round; stroke-width: 1.3; opacity: .3; }
#harp-keys button line.it { stroke-width: 2.6; opacity: 1; }
#harp-keys button.on { translate: 0 1px; box-shadow: 0 0 0 3px var(--glow), inset 0 1px 3px rgba(43, 39, 36, .2); border-color: var(--dark); }
.k-ticket svg { overflow: visible; filter: drop-shadow(1px 2px 2px rgba(60, 40, 20, .28)); rotate: 7deg; }
`);
export default function createHarp(site) {
  const { stage, cat, audio, keepsakes, input, registry } = site, H = HARP;
  audio.load(H.sample.name);
  let progress = 0, lastAt = -Infinity, plucks = 0, unlocked = registry.has('harp'), played = [], keyPlucks = 0, flares = 0;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'harp-fx'; svg.setAttribute('aria-hidden', 'true');
  document.body.appendChild(svg);
  const ringing = [];

  // His whiskers on the page as they are now: [{ index, pts: [root, middle, tip] (px), seen }]
  function whiskers() {
    if (!cat.loaded || cat.hidden || cat.standIn || cat.popping) return [];
    const list = cat.config.whiskers[cat.shown] || [];
    return list.map((w, index) => { const pts = w.map((p) => cat.screenOf(p, {})); return { index, pts, seen: pts[2].facing > -0.1 }; });
  }
  const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); };
  function whiskerAt(x, y) {
    let best = null, d = H.reach;
    for (const w of whiskers()) {
      if (!w.seen) continue;
      const p = { x, y }, near = Math.min(segDist(p, w.pts[1], w.pts[2]), segDist(p, { x: (w.pts[0].x + w.pts[1].x) / 2, y: (w.pts[0].y + w.pts[1].y) / 2 }, w.pts[1]));   // its outer three quarters
      if (near < d) { d = near; best = w; }
    }
    return best;
  }
  // How much of the tune the last notes played are: the longest run at the end of them that starts the tune.
  const matched = () => { for (let k = Math.min(played.length, H.tune.length); k > 0; k--) if (played.slice(-k).every((n, i) => n === H.tune[i])) return k; return 0; };
  function pluck(index, w = null) {
    plucks++;
    const now = stage.clock;
    if (now - lastAt > H.patience) played = [];
    lastAt = now;
    const right = index === H.tune[progress];
    played.push(index); if (played.length > H.tune.length) played.shift();
    progress = matched();
    cat.stay?.(H.stay);
    audio.play(H.sample.name, { gain: H.gain, rate: 2 ** ((H.notes[index] - H.sample.semitone) / 12) });
    if (w) ringing.push({ w, t: 0, right });
    padArm();
    if (progress >= H.tune.length) { progress = 0; played = []; encore(); }
    return right;
  }
  // The tune played. The encore plays once ever (butterman lane, playtest 2: bm.encore() plays it and drops the ticket
  // itself, and returns false once it is used up). "encore" is said only when the scene really plays; after that the
  // tune's payoff is all six whiskers flaring gold together, with no words (gags lane, playtest 2).
  function encore() {
    const first = !unlocked; unlocked = true;
    registry.find('harp');
    const bm = site.eggs.butterman;
    stage.after(0.7).then(() => {
      let played;
      if (bm?.encore) played = bm.encore();
      else {                                        // before the butterman lane's once-ever encore: the old route
        played = !!bm && !bm.running && !!bm.play({ scene: 'encore' });
        if (!keepsakes.has('ticket')) stage.after(.5).then(() => keepsakes.give('ticket', { from: { x: stage.width / 2, y: stage.insets.top } }));
        if (first) tellKeys(2);
      }
      if (played) padEnd();                         // the encore has the stage: the phone's whisker buttons go (harp lane)
      if (played) site.ui.speak?.('encore') ?? site.ui.say('encore');   // the cat says it (text lane, e1112-32)
      else flare();
    });
  }
  function flare() { flares++; for (const w of whiskers()) if (w.seen) ringing.push({ w, t: 0, right: true }); }
  // A tap on a whisker is a pluck (before the cat's own tap gets it). A press that starts on a whisker but moves off
  // is a drag after all, and is handed to the cat so he still turns.
  input.claim(60, (e) => {
    const w = whiskerAt(e.clientX, e.clientY);
    if (!w) return null;
    let dragging = false;
    return {
      move(ev) {
        if (!dragging && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 8 && cat.hitTest(e.clientX, e.clientY)) { dragging = true; cat.dragStart(e); }
        if (dragging) cat.dragMove(ev);
      },
      end(ev) { if (dragging) cat.dragEnd(ev); else if (ev.type === 'pointerup') pluck(w.index, whiskerAt(ev.clientX, ev.clientY) || w); },
    };
  }, { covers: (x, y) => !!whiskerAt(x, y) });   // grab lane: a finger's grace never takes a press off a whisker (src/core/input.js GRACE)
  input.cursors.push((e) => (whiskerAt(e.clientX, e.clientY) ? 'pointer' : null));
  // the plucked whisker rings: a line laid along it that shivers and dies away
  stage.onFrame.push((dt) => {
    if (!ringing.length) { if (svg.firstChild) svg.textContent = ''; return; }
    let out = '';
    for (let i = ringing.length - 1; i >= 0; i--) {
      const r = ringing[i], life = r.right ? H.ring.right : H.ring.wrong; r.t += dt;
      if (r.t > life) { ringing.splice(i, 1); continue; }
      const [a, m, b] = r.w.pts, nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1;
      const amp = (stage.reducedMotion ? 0 : 7) * Math.exp(-r.t * 5) * Math.sin(r.t * 70), fade = 1 - r.t / life;
      const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${(m.x + nx / l * amp).toFixed(1)} ${(m.y + ny / l * amp).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      // A right note: a wide gold halo under a bright near-white gold line, so it reads at a glance on the beige page.
      if (r.right) out += `<path filter="url(#harp-glow)" d="${d}" stroke="#ffcf3a" stroke-width="14" opacity="${(0.85 * fade).toFixed(2)}"/><path d="${d}" stroke="#f0a800" stroke-width="4.5" opacity="${Math.min(1, 1.2 * fade).toFixed(2)}"/>`;
      else out += `<path d="${d}" stroke="#fdf0e6" stroke-width="2.5" opacity="${(0.85 * fade).toFixed(2)}"/>`;
    }
    svg.innerHTML = (out.includes('harp-glow') ? '<defs><filter id="harp-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>' : '') + out;
  });

  // ---- the keyboard plays them too (playtest 2) ----
  // Found the harp and saw the encore: he tells you once (per device), when nothing else is on.
  const touchOnly = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
  async function tellKeys(wait = 0) {
    if (site.store.get('harp.keysTold') || touchOnly()) return false;
    await stage.after(wait);
    const bm = site.eggs.butterman;
    for (let n = 0; n < 240 && (bm?.running || input.locked || cat.hidden || cat.standIn); n++) await stage.after(0.5);
    if (site.store.get('harp.keysTold') || input.locked || cat.hidden || cat.standIn) return false;
    site.store.set('harp.keysTold', Date.now());
    const lines = ['Hey!', 'Did you know you can use your keyboard to play my whiskers?', 'A, S, D for the ones on your left. J, K, L for your right.'];
    if (site.ui.speak) { site.ui.speak(lines); return true; }
    // Without the text lane's speech: one line at a time on the line above the sigils, a hop and a bonk at each.
    for (const line of lines) { cat.playEmote('hop', 'harp keys'); audio.play('tap-bonk', { gain: 0.5 }); const ms = 1200 + line.length * 45; site.ui.say(line, { ms }); await stage.after(ms / 1000 + 0.3); }
    return true;
  }
  // The lesson follows the encore: harp found and the encore seen (butterman lane: the store flag and its event).
  const encoreSeen = () => site.eggs.butterman?.encoreSeen ?? !!site.store.get('butterman.encoreSeen');
  addEventListener('sigilcat:encore-seen', () => { if (unlocked) tellKeys(1.2); });
  if (unlocked && !site.store.get('harp.keysTold')) stage.onLoaded.push(() => { if (!site.eggs.butterman?.encore || encoreSeen()) tellKeys(3); });
  // Always on (harp lane, music round, e1116-11: "the ASD JKL playable whiskers should be playable at all times"); a key
  // is a pluck, so the tune on the keys finds the harp exactly as on the whiskers, once. Not while typing in a text
  // field (a slider or a button keeps focus without taking letters, so it does not block them), not with a modifier or a
  // held key, not while the page is locked (a scene, the 360 film, the cake) or a pop-up or mode is up (flappy, the
  // chest, the books, a card, the full-screen step: all aria-modal).
  const typing = (t) => t?.closest?.('input:not([type=range]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=""], [contenteditable="true"]');
  addEventListener('keydown', (e) => {
    const index = H.keys[e.key?.toLowerCase?.()];
    if (index === undefined || e.repeat || e.ctrlKey || e.metaKey || e.altKey || input.locked || typing(e.target)) return;
    if (document.querySelector('[aria-modal="true"], #bird-screen, #party-error') || !cat.loaded || cat.hidden || cat.standIn) return;
    keyPlucks++;
    pluck(index, whiskers().find((w) => w.index === index && w.seen) || null);
  });

  // ---- the phone's whisker buttons (harp lane, music round, e1116-11) ----
  // Aaron: "on mobile, similar to how the "closer, further" buttons are set up, there should be 6 buttons you can click to
  // play the harp whiskers for about ~10s after playing a whisker, and then it can disappear (or it can be replaced by
  // the "futher closer" if someone picks something up)". On a coarse pointer (Nearer/Deeper's test), every pluck (a
  // whisker, a button, a key) arms them for H.buttons.seconds; they fade out when that runs out. Left to right they are
  // A S D J K L: the three whiskers on your left, top to bottom, then the three on your right, top to bottom; each
  // shows its side's three whiskers with its own drawn bold. A press plucks on pointerdown, as a finger on a string,
  // through pluck() like a tap on the whisker. While Nearer/Deeper are up (an item held) they are hidden; let go within
  // the time and they are back. A lock (a scene, a mode) ends them. Nothing runs while they are away: a timeout, and
  // a watch on the page's top level (for Nearer/Deeper) only while armed.
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  let pad = null, padUntil = 0, padTimer = 0, padGone = 0, padWatch = null, padTaps = 0, padShows = 0;
  const glyph = (i) => {
    const side = i < 3 ? 1 : -1, row = i % 3, X = (x) => (side > 0 ? x : 30 - x);
    return `<svg viewBox="0 0 30 22" aria-hidden="true">${[[8, 3], [11, 11], [14, 19]].map(([y0, y1], r) => `<line class="${r === row ? 'it' : ''}" x1="${X(25)}" y1="${y0}" x2="${X(3)}" y2="${y1}"/>`).join('')}</svg>`;
  };
  const NAMES = ['top left', 'middle left', 'bottom left', 'top right', 'middle right', 'bottom right'];
  function padMake() {
    pad = el('div'); pad.id = 'harp-keys'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'His whiskers'); pad.hidden = true; pad.classList.add('out');
    for (const group of [[0, 1, 2], [3, 4, 5]]) {
      const side = el('div', 'side');
      for (const i of group) {
        const b = el('button', 'felt', glyph(i)); b.type = 'button'; b.dataset.whisker = i; b.setAttribute('aria-label', `Pluck the ${NAMES[i]} whisker`);
        let pressed = -1e9;
        const play = () => { padTaps++; pluck(i, whiskers().find((w) => w.index === i && w.seen) || null); };
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation();
          if (input.locked || !cat.loaded || cat.hidden || cat.standIn) return;
          pressed = performance.now(); try { b.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
          b.classList.add('on'); play();
        });
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, () => b.classList.remove('on'));
        // a click with no press before it is the keyboard's (Enter on a focused button): one pluck
        b.addEventListener('click', (e) => { e.preventDefault(); if (performance.now() - pressed < 1500 || input.locked || !cat.loaded || cat.hidden || cat.standIn) return; play(); });
        side.appendChild(b);
      }
      pad.appendChild(side);
    }
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(pad);
    addEventListener('resize', () => { if (!pad.hidden) padPlace(); });
  }
  // Just over the row of sigils, centred in the safe width (under him): the left three below his left whiskers, the
  // right three below his right. Six thumb-sized buttons do not fit beside the row as Nearer/Deeper do (at 844x390 there
  // are 91 px between ZOOM/SOUND and the row).
  function padPlace() {
    const B = H.buttons, marks = [...document.querySelectorAll('#marks > li')].map((li) => li.getBoundingClientRect()).filter((r) => r.width > 0);
    const floor = marks.length ? Math.min(...marks.map((r) => r.top)) : stage.height - (stage.insets.bottom || 0);
    const L = stage.insets.left || 0, R = stage.width - (stage.insets.right || 0);
    pad.style.left = Math.round((L + R) / 2) + 'px'; pad.style.top = Math.round(floor - B.lift - B.h) + 'px';
  }
  const padOpen = () => padUntil > performance.now();
  function padSync() {
    if (!pad) return;
    const show = padOpen() && !input.locked && !document.querySelector('.world-grip');
    if (show === !pad.classList.contains('out')) return;
    clearTimeout(padGone);
    pad.classList.toggle('still', stage.reducedMotion);
    if (show) { padShows++; pad.hidden = false; padPlace(); void pad.offsetWidth; pad.classList.remove('out'); }
    else {
      pad.classList.add('out'); for (const b of pad.querySelectorAll('button.on')) b.classList.remove('on');
      if (stage.reducedMotion) pad.hidden = true; else padGone = setTimeout(() => { if (pad.classList.contains('out')) pad.hidden = true; }, H.buttons.fade * 1000 + 50);
    }
  }
  function padEnd() { padUntil = 0; clearTimeout(padTimer); padWatch?.disconnect(); padWatch = null; padSync(); }
  function padArm() {
    if (!coarse()) return;
    if (!pad) padMake();
    padUntil = performance.now() + H.buttons.seconds * 1000;
    clearTimeout(padTimer); padTimer = setTimeout(padEnd, H.buttons.seconds * 1000);
    if (!padWatch) { padWatch = new MutationObserver(padSync); padWatch.observe(document.body, { childList: true }); }
    padSync();
  }
  input.onLock.push(() => { if (padUntil) padEnd(); });
  const buttons = { get el() { return pad; }, get shown() { return !!pad && !pad.hidden && !pad.classList.contains('out'); }, get left() { return Math.max(0, padUntil - performance.now()) / 1000; },
    get taps() { return padTaps; }, get shows() { return padShows; }, end: padEnd };

  cardService(site).define({
    id: 'ticket', label: 'the ticket to the encore', size: 0.4, aspect: 0.45, home: () => ({ x: -0.78, y: -0.44 }),
    // a keepsake now (the encore is once ever); a tap wiggles it, no page (cards lane, playtest 3: src/world/cards.js wiggle)
    tap(inst) { site.cards?.wiggle(inst); site.audio.play('paper', { gain: 0.4 }); },
  }, 'ADMIT ONE\nBUTTAMAN\nthe encore\nNo. 0001\n\nBack: KEEP THIS STUB. One more for the road.');

  return { find: 'harp', config: HARP, pluck, whiskers, whiskerAt, tellKeys, get progress() { return progress; }, get plucks() { return plucks; }, get keyPlucks() { return keyPlucks; }, get flares() { return flares; }, get unlocked() { return unlocked; }, buttons,
    again: () => site.eggs.butterman?.encore?.() ?? false };   // once ever (butterman lane, playtest-2)
}
