// Achievements at runtime: what earns each one (src/achievements.js is the list), the reveal on the message line
// (e1112-31: his script settles into the name, a wax seal stamps beside it with the soft chime, a shimmer sweeps
// across; Platinum Cat gets a bigger one), and the small mark by the grimoire link that opens the book.
//   site.achievements.unlock('void')     earn one now (no-op when already earned); returns true the first time
//   site.achievements.score(n)           the bird game's score (Flappy at 1, Pipe Dream at 15)
//   site.achievements.has(id), .count, .total, .onUnlock(fn)
//   #debug: site.achievements.grant(id), .grantAll(), .forget()
// What earns what:
//   - a grimoire find (store 'found.<id>') earns the achievement that names it (`find` in the list)
//   - most of the rest is read from what the page already saves (store.watch): bonks, rare bonks, discoveries of
//     the shelf / board, the rack keepsake, the hats worn, the lamp's bulb, the charged top, the shelf's bays, the
//     cake chain. So it is earned the same way whichever code path saved it, and a returning visitor is credited
//     quietly on load (no toasts for what was found before this book existed).
//   - a few moments are not saved anywhere, and are told directly: a fizzle (src/sigils/ink.js), a fast spin and
//     the purr (cat.onDrag, below), the galaxy opening (src/eggs/galaxy.js), Butterman's yell
//     (src/eggs/butterman.js), the bird clicked (src/eggs/bird.js), the bird game's score (src/flappy/screen.js).
//   - Let There Be Light: the window event 'sigilcat:lamp-lit', or the lamp's saved state (bulb in the rack's
//     socket and switched on).
// Platinum Cat (e1112-37): earned when every other achievement in the list is. An achievement added later counts
// toward it for those who do not have it yet; one already earned is never taken back (nothing here ever clears an
// 'achievements.<id>', only the debug forget() and the grimoire's start over, which wipe everything).
import { ACHIEVEMENTS, SIGN_IDS } from '../achievements.js';

export const ACH = {
  revealMs: 2600,         // how long a reveal stays once its seal has landed
  platinumMs: 4600,       // the same for Platinum Cat
  gapMs: 380,             // between two reveals in a row
  // playtest 3 (Aaron: "make 'freesound_community-point-in-space' ... the sound for achievements"): assets/audio/designed/
  // achieve-space.wav, by tools/audio/make-p3-sounds.py (the old two-note chime, achieve.wav, is kept in the repo, unplayed)
  chime: 'achieve-space', chimeGain: 0.5,
  spinSpeed: 8,           // rad/s at release that counts as a fast spin (Spin Doctor); the galaxy now needs more (> 13 rad/s held, src/eggs/galaxy.js GALAXY.spin)
  purrLevel: 0.6,         // the purr's level (0-1) that counts as purring (three strokes in a row)
  platinumDelay: 1.4,     // seconds after Platinum Cat is earned before the badge falls
  watched: ['found', 'bonks', 'rareBonks', 'worldDiscoveries', 'keepsakes', 'worldBodies', 'cakeChain', 'hat', 'lamp'],
};
const HATS = ['wizard', 'cone', 'party', 'crown'];
// What fills the shelf, its hooks and the board (furniture lane, playtest 2)
const FULL = { shelf: ['rifle', 'top', 'pat', 'tin'], hooks: ['bucket', 'flour'], board: ['paper', 'postcard', 'ticket', 'recipe'] };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const dateOf = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
// The round seal the book used before playtest-3 (now wax() and blank(), below); kept for anything that wants the old
// look. A locked secret shows no drawing at all. The bonk tiers are struck in their metal once earned.
export function seal(a, { earned = false, show = earned || !a.secret } = {}) {
  const cls = `seal${earned ? ' earned' : ''}${a.id === 'platinum' ? ' platinum' : ''}${earned && a.metal ? ` metal metal-${a.metal}` : ''}${show ? '' : ' hidden'}`;
  return `<span class="${cls}" aria-hidden="true">${show ? `<svg viewBox="0 0 24 24"><path d="${a.d}"/></svg>` : '<i>?</i>'}</span>`;
}
// The wax seal the reveal stamps: gold wax, or the tier's metal, Platinum Cat's platinum. The achievements book shows
// the same stamp, static, for every earned one (e1113-02).
export const metalOf = (a) => a.metal || (a.id === 'platinum' ? 'platinum' : 'gold');
export function wax(a) {
  return `<span class="wax metal-${metalOf(a)}" aria-hidden="true"><i class="ring"></i><i class="face"></i><svg viewBox="0 0 24 24"><path d="${a.d}"/></svg><i class="glint"></i></span>`;
}
// A locked stamp in the book (e1113-02): the wax's blob (the --blob mask in hush.css, the same path) as a faint dashed
// outline, its faint mark inside; a secret shows only "?" (no drawing in the page).
const BLOB = 'M95.5 46.6Q97.6 50.0 97.0 53.7Q96.5 57.4 94.9 60.7Q93.4 64.1 92.2 67.5Q90.9 70.9 87.8 73.0Q84.6 75.2 82.9 78.1Q81.1 81.1 79.4 84.6Q77.7 88.1 75.0 90.9Q72.3 93.7 67.9 92.8Q63.6 91.8 60.3 93.0Q57.0 94.1 53.5 94.0Q50.0 93.9 46.5 94.3Q42.9 94.8 39.4 94.2Q35.8 93.6 31.7 93.8Q27.6 93.9 25.7 90.0Q23.8 86.1 21.7 83.2Q19.7 80.3 17.0 78.1Q14.3 75.9 11.1 73.7Q8.0 71.4 7.1 67.8Q6.1 64.3 4.8 60.8Q3.5 57.4 3.8 53.7Q4.1 50.0 6.1 46.7Q8.1 43.4 8.2 39.9Q8.3 36.4 8.0 32.4Q7.6 28.4 9.3 25.1Q11.1 21.7 14.8 20.1Q18.5 18.5 20.9 15.9Q23.3 13.2 26.8 12.3Q30.3 11.3 33.3 9.5Q36.2 7.7 39.5 5.9Q42.7 4.2 46.4 2.3Q50.0 0.4 53.4 3.4Q56.9 6.5 60.2 7.5Q63.5 8.5 66.8 9.6Q70.0 10.7 73.6 11.6Q77.2 12.5 79.8 15.1Q82.3 17.7 85.8 19.6Q89.2 21.5 89.8 25.5Q90.4 29.4 90.4 33.2Q90.3 36.9 91.9 40.0Q93.4 43.1 95.5 46.6Z';
export function blank(a) {
  return `<span class="blank" aria-hidden="true"><svg class="out" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${BLOB}"/></svg>${a.secret ? '<i>?</i>' : `<svg class="mark" viewBox="0 0 24 24"><path d="${a.d}"/></svg>`}</span>`;
}

export function createAchievements(site) {
  const { store, stage, cat, registry, audio, input } = site;
  const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  const has = (id) => !!store.get('achievements.' + id);
  const listeners = [], queue = [];
  let chimes = 0, booted = false, timer = 0, revealEl = null, showing = false, retry = 0, badge = null;
  audio.load(ACH.chime);

  function unlock(id, { quiet = false } = {}) {
    const a = byId.get(id);
    if (!a || has(id)) return false;
    store.set('achievements.' + id, Date.now());
    if (!quiet) { queue.push(a); pump(); }
    for (const f of listeners) f(a, { quiet });
    showMark();
    meta(quiet);
    if (id === 'platinum') givePlatinum(quiet ? 0 : ACH.platinumDelay);
    return true;
  }
  // the three that are made of the others
  function meta(quiet) {
    if (SIGN_IDS.every(has)) unlock('fluent', { quiet });
    if (registry.count() === registry.total) unlock('complete', { quiet });
    if (ACHIEVEMENTS.every((a) => a.id === 'platinum' || has(a.id))) unlock('platinum', { quiet });
  }

  // ---- what the page saves ----
  const get = (p, d = null) => store.get(p, d);
  function evaluate(quiet) {
    for (const a of ACHIEVEMENTS) {
      if (a.find && get('found.' + a.find)) unlock(a.id, { quiet });
      if (a.bonks && Number(get('bonks', 0)) >= a.bonks) unlock(a.id, { quiet });
    }
    if (Number(get('rareBonks', 0)) > 0) unlock('lucky', { quiet });
    if (get('found.bite')) unlock('purr', { quiet });                      // he only bites a cat who was purring
    const found = Object.values(get('worldDiscoveries', {}));
    if (found.filter((c) => c === 'solid').length >= 2) unlock('shelf', { quiet });   // src/world/shelf.js ensure()
    if (found.filter((c) => c === 'flat').length >= 2) unlock('board', { quiet });    // src/world/pinboard.js ensure()
    if (get('keepsakes.rack') || site.keepsakes.has('rack')) unlock('rack', { quiet });
    const worn = get('achievementProgress.hats', []);
    if (HATS.every((h) => worn.includes(h))) unlock('dressup', { quiet });
    if (lampLit()) unlock('light', { quiet });
    if (get('keepsakes.top')?.state?.charged) unlock('charged', { quiet });
    // a full shelf: its four bays (src/world/shelf.js) and both hooks under it (the pail and the sack hang there);
    // a full board: all four cards pinned (src/world/pinboard.js)
    const on = (id) => get('worldBodies.' + id)?.support?.id;
    if (FULL.shelf.every((id) => on(id) === 'shelf') && FULL.hooks.every((id) => on(id) === 'shelf-hooks')) unlock('collector', { quiet });
    if (FULL.board.every((id) => on(id) === 'pinboard')) unlock('curator', { quiet });
    const cake = get('cakeChain') || {};
    if (cake.milkFull || cake.visit?.milked || cake.portions?.milk) unlock('milk', { quiet });
    if (cake.bakes > 0 || ['baked', 'revealed', 'eaten'].includes(cake.phase)) unlock('baker', { quiet });
    if (cake.eaten > 0 || cake.phase === 'eaten') unlock('birthday', { quiet });
    meta(quiet);
  }
  function lampLit() {
    if (site.lamp?.occupied && site.lamp?.on) return true;
    const b = get('worldBodies.bulb');
    return !!(b?.adapter?.on && b?.support?.id === 'rack-lamp');
  }
  store.watch((path, value) => {
    const top = path.split('.')[0];
    if (top === 'hat' && HATS.includes(value)) {
      const worn = get('achievementProgress.hats', []);
      if (!worn.includes(value)) store.set('achievementProgress.hats', [...worn, value]);
    }
    if (!booted || !ACH.watched.includes(top) || timer) return;
    timer = setTimeout(() => { timer = 0; evaluate(false); }, 120);       // a drag saves many times a second
  });
  addEventListener('sigilcat:lamp-lit', () => unlock('light'));

  // ---- moments nobody saves ----
  cat.onDrag.push((kind) => {
    if (kind === 'move' && (site.eggs.petbite?.purr ?? 0) >= ACH.purrLevel) unlock('purr');
    if (kind === 'end' && Math.abs(cat.vel) >= ACH.spinSpeed) unlock('spin');
  });
  function score(n) { if (n >= 1) unlock('flappy'); if (n >= 15) unlock('pipes'); }

  // ---- the reveal: one at a time, never over a takeover, never over a message still on the line ----
  const blocked = () => input.locked || document.hidden || ['bm-big', 'galaxy-showing', 'party-error'].some((c) => document.body.classList.contains(c));
  function pump() {
    if (showing || !queue.length) return;
    if (blocked() || site.ui?.lineFree === false) { clearTimeout(retry); retry = setTimeout(pump, 500); return; }   // waits only while one is due
    show(queue.shift());
  }
  // It sits on the message line, above the row of marks: its bottom on the line's bottom, growing upward.
  function place() {
    const say = document.getElementById('say'), mid = say?.parentElement;
    if (!mid) return;
    if (revealEl.parentElement !== mid) mid.appendChild(revealEl);
    revealEl.style.setProperty('--reveal-bottom', Math.round(mid.offsetHeight - say.offsetTop - say.offsetHeight) + 'px');
    // never wider than the page: the whole reveal steps down in size until it fits
    revealEl.style.removeProperty('--reveal-scale');
    const w = revealEl.getBoundingClientRect().width, room = innerWidth - 24;
    if (w > room) revealEl.style.setProperty('--reveal-scale', (room / w).toFixed(3));
  }
  function show(a) {
    showing = true;
    site.ui?.holdLine?.(true);
    if (!revealEl) { revealEl = document.createElement('div'); revealEl.setAttribute('role', 'status'); }
    const plat = a.id === 'platinum', calm = stage.reducedMotion;
    revealEl.className = `ach-reveal${plat ? ' platinum' : ''}${calm ? ' calm' : ''}`;
    revealEl.innerHTML = `${wax(a)}<span class="words"><small>${plat ? 'platinum' : 'achievement'}</small><b>${esc(a.name)}</b></span>${plat ? '<i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>' : ''}`;
    revealEl.hidden = false;
    place();
    const name = revealEl.querySelector('b'), sealEl = revealEl.querySelector('.wax');
    const settle = site.ui?.runes ? site.ui.runes(name, a.name, { plain: calm, delay: 380, step: 34 }) : 0;
    revealEl.animate(calm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: calm ? 220 : 320, easing: 'ease-out' });
    sealEl.style.opacity = '0';
    setTimeout(() => stamp(sealEl, plat, calm), calm ? 120 : settle + 140);
  }
  // The seal lands: the chime, a little thud through the line, a ring of wax pressed out, then the shimmer.
  function stamp(sealEl, plat, calm) {
    sealEl.style.opacity = '';
    if (audio.play(ACH.chime, { gain: ACH.chimeGain })) chimes++;
    if (!calm) {
      const land = plat ? 360 : 280;
      sealEl.animate([{ transform: 'scale(2.5) rotate(-24deg)', opacity: 0, easing: 'cubic-bezier(.55,0,.9,.45)' }, { transform: 'scale(.82) rotate(5deg)', opacity: 1, offset: 0.5, easing: 'ease-out' },
        { transform: 'scale(1.08) rotate(-2deg)', offset: 0.75 }, { transform: 'none', opacity: 1 }], { duration: plat ? 720 : 560, fill: 'backwards' });
      sealEl.querySelector('.ring')?.animate([{ transform: 'scale(.7)', opacity: 0.85 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 520, delay: land, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
      revealEl.querySelector('.words')?.animate([{ transform: 'none' }, { transform: 'translateY(1.5px)', offset: 0.3 }, { transform: 'none' }], { duration: 260, delay: land, easing: 'ease-out' });
      setTimeout(() => revealEl.classList.add('shine'), land + 200);
    } else revealEl.classList.add('shine');
    tickMark();
    setTimeout(() => {
      const out = revealEl.animate(calm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: calm ? 220 : 380, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => {
        out.cancel(); revealEl.hidden = true; revealEl.classList.remove('shine'); showing = false;
        site.ui?.holdLine?.(false);
        setTimeout(pump, ACH.gapMs);
      };
    }, plat ? ACH.platinumMs : ACH.revealMs);
  }

  // ---- the mark by the grimoire link ----
  const markEl = document.getElementById('achievements');
  function showMark() {
    if (!markEl) return;
    const n = ACHIEVEMENTS.filter((a) => has(a.id)).length;
    markEl.hidden = n === 0;
    markEl.setAttribute('aria-label', `achievements: ${n} of ${ACHIEVEMENTS.length}`);
    markEl.title = `achievements · ${n} of ${ACHIEVEMENTS.length}`;
  }
  // The tick turns the icon, not the link: its 44px hit area (::before) stays put beside the ask-the-butter row.
  function tickMark() { if (!markEl || stage.reducedMotion) return; (markEl.querySelector('svg') || markEl).animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35) rotate(-8deg)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 650, delay: 260, easing: 'cubic-bezier(.3,1.5,.5,1)' }); }
  showMark();

  // ---- the platinum badge: a physical keepsake (src/world/platinum.js), loaded only for those who earn it ----
  function loadBadge() { return (badge ??= import('../world/platinum.js').then((m) => m.platinumBadge(site))); }
  async function givePlatinum(delay) {
    const b = await loadBadge();
    if (site.keepsakes.has('platinum')) return b;
    if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    b.drop();
    return b;
  }
  if (has('platinum') || store.get('keepsakes.platinum')) loadBadge();

  // boot: credit what was found before (quietly), then listen
  site.ready?.then?.(() => { evaluate(true); booted = true; });

  const api = {
    ACHIEVEMENTS, has, unlock, score, evaluate, onUnlock: (f) => listeners.push(f),
    get count() { return ACHIEVEMENTS.filter((a) => has(a.id)).length; }, get total() { return ACHIEVEMENTS.length; },
    get queued() { return queue.length + (showing ? 1 : 0); }, get reveal() { return revealEl; }, get showing() { return showing; },
    get toast() { return revealEl; },   // the old name, for checks written before the reveal
    get chimes() { return chimes; }, get badge() { return badge; },
    // #debug and the checks
    grant: (id, o) => unlock(id, o),
    grantAll({ except = [], quiet = false } = {}) { for (const a of ACHIEVEMENTS) if (!except.includes(a.id) && a.id !== 'platinum') unlock(a.id, { quiet: true }); if (!except.includes('platinum')) unlock('platinum', { quiet }); },
    forget() { store.del('achievements'); store.del('achievementProgress'); store.del('rareBonks'); site.ui.showRare?.(); showMark(); },
  };
  return api;
}
