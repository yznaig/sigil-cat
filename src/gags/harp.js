// The whisker harp (gag 7; no sigil). Tap a whisker and it plucks a note. His six whiskers are in tune: B3 C4 D4 on
// the three on your left (top to bottom), E4 F#4 B4 on the three on your right.
// Nothing more happens until Aaron's tune is played on them: C C B C D C (playtest 2; the middle-left whisker twice,
// the top-left, the middle-left, the bottom-left, the middle-left). Then Butterman gives an encore, a fourth scene that
// the B sigil does not play, and the ticket falls. The encore plays once ever (src/eggs/butterman.js encore()); the
// tune played again after that makes all six whiskers flare gold together.
// A plucked whisker that is the next right note rings gold and glows (a wide soft halo under a bright line, held a
// little longer); a wrong note rings pale and thin, and the tune starts over from whatever it can still be the start of.
// Plucking any whisker keeps him in his pose for four seconds (cat.stay), so he does not pop away mid-tune.
// Once the harp is found and the encore has been seen, he tells you the keyboard plays them too: A S D for the whiskers
// on your left, J K L for the ones on your right (playtest 2).
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
};
css('harp', `
#harp-fx { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; overflow: visible; }
#harp-fx path { fill: none; stroke-linecap: round; }
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
  });
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
  const typing = (t) => t?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
  addEventListener('keydown', (e) => {
    const index = H.keys[e.key?.toLowerCase?.()];
    if (index === undefined || !unlocked || e.repeat || e.ctrlKey || e.metaKey || e.altKey || input.locked || typing(e.target)) return;
    if (document.querySelector('[aria-modal="true"]') || !cat.loaded || cat.hidden || cat.standIn) return;
    keyPlucks++;
    pluck(index, whiskers().find((w) => w.index === index && w.seen) || null);
  });

  cardService(site).define({
    id: 'ticket', label: 'the ticket to the encore', size: 0.4, aspect: 0.45, home: () => ({ x: -0.78, y: -0.44 }),
    // a keepsake now (the encore is once ever); a tap wiggles it, no page (cards lane, playtest 3: src/world/cards.js wiggle)
    tap(inst) { site.cards?.wiggle(inst); site.audio.play('paper', { gain: 0.4 }); },
  }, 'ADMIT ONE\nBUTTAMAN\nthe encore\nNo. 0001\n\nBack: KEEP THIS STUB. One more for the road.');

  return { find: 'harp', config: HARP, pluck, whiskers, whiskerAt, tellKeys, get progress() { return progress; }, get plucks() { return plucks; }, get keyPlucks() { return keyPlucks; }, get flares() { return flares; }, get unlocked() { return unlocked; },
    again: () => site.eggs.butterman?.encore?.() ?? false };   // once ever (butterman lane, playtest-2)
}
