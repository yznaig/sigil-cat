// The two books, the grimoire and the achievements, as pop-ups over the cat (playtest-2: "Opening achievements and
// the grimoire should be popup screens that unload some stuff so the player doesnt have to load absolutely everything
// back in when they return to the cat"). They used to be pages of their own (spellbook.html, achievements.html), so
// coming back meant loading the whole page again; those addresses now open the pop-up here.
// While a book is open the world is frozen (src/core/freeze.js: no render loop, physics, splat sorting, timers or
// sound) and three's render lists are let go (rebuilt on the first frame back). Nothing that costs a download is
// dropped, so closing is instant and every item is where it was. Escape or a click outside the sheet closes it
// (e1112-41). The grimoire's "start over" (e1112-39) wipes the store after a confirm and reloads into a fresh game.
//   site.books.open('grimoire' | 'achievements')   site.books.close()   site.books.showing   (null or the book's name)
// The content and look are the old pages' (src/ui/hush.css, .book rules); the achievements book has two views (playtest-3).
import { store } from '../core/store.js';
import { FINDS } from '../finds.js';
import { SIGILS } from '../sigils/templates.js';
import { ACHIEVEMENTS, GROUPS } from '../achievements.js';
import { markSvg } from './hush.js';
import { wax, blank, dateOf } from './achievements.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---- the grimoire: what has been found on this device ----
// A found sigil shows its shape, with a dot where the pen starts. An unfound one shows no shape at all, only a riddle
// (its shape is not even in the page). Combos stay off the page entirely until they are found.
// A sigil's shape, from the template the recognizer itself uses, fitted into a 100 box, with its starting dot.
function shape(f) {
  let pts = SIGILS[f.sigil]?.templates[f.sigil === 'zigzag' ? 4 : 0];
  if (f.sigil === 'cup') pts = SIGILS.dome.templates[0].map((p) => ({ x: p.x, y: -p.y }));           // the dome, turned over
  if (f.sigil === 'eight') pts = Array.from({ length: 81 }, (_, i) => { const t = Math.PI / 2 + i / 80 * 2 * Math.PI; return { x: 50 * Math.sin(t), y: 26 * Math.sin(2 * t) }; });
  if (!pts) return markSvg(f.d);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), x0 = Math.min(...xs), y0 = Math.min(...ys), k = 84 / Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0, 1);
  const ox = (100 - (Math.max(...xs) - x0) * k) / 2, oy = (100 - (Math.max(...ys) - y0) * k) / 2;
  const q = pts.map((p) => [(p.x - x0) * k + ox, (p.y - y0) * k + oy]);
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${q.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('')}"/><circle cx="${q[0][0].toFixed(1)}" cy="${q[0][1].toFixed(1)}" r="4.5"/></svg>`;
}
const KIND = { sigil: 'a sign', combo: 'two things together', secret: 'a secret' };
export function grimoireHTML() {
  const has = (id) => !!store.get('found.' + id);
  const found = FINDS.filter((f) => has(f.id)).length;
  const cards = FINDS.filter((f) => f.kind !== 'combo' || has(f.id)).map((f) => (has(f.id)
    ? `<li class="card ${f.kind}"><div class="fig">${f.kind === 'sigil' ? shape(f) : markSvg(f.d)}</div><h2>${esc(f.name)}</h2><p>${esc(f.does)}</p><small>${KIND[f.kind]}</small></li>`
    : `<li class="card unknown"><div class="fig" aria-hidden="true">???</div><h2>not yet found</h2><p>${esc(f.riddle)}</p><small>${KIND[f.kind]}</small></li>`)).join('');
  return {
    title: 'the grimoire', tally: `<b>${found}</b> of ${FINDS.length} found on this device`,
    body: `<p class="lead">Signs of the cat. Draw them on the empty air around him, in one stroke.<br>The dot marks where the pen starts.</p>
  <ol class="cards" id="cards">${cards}</ol>
  <!-- Acknowledgements (e1111-03, e1111-38): what others made that the page uses, as their licences and authors ask. -->
  <section class="credits" aria-labelledby="thanks">
    <h2 id="thanks">With thanks</h2>
    <ul>
      <li>The cow: &ldquo;<a href="https://sketchfab.com/3d-models/farm-cow-animated-dairy-cattle-0e780cb5ab6d457198ded7d4e191a03e" target="_blank" rel="noopener">Farm Cow Animated Dairy cattle</a>&rdquo; by <a href="https://sketchfab.com/rukh3d" target="_blank" rel="noopener">Rukh3D</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Materials and walk/graze animation adapted.</li>
      <li>The second fanfare: &ldquo;RPG Victory Fanfare 2&rdquo; by <a href="https://www.youtube.com/@LuxAeterna22878" target="_blank" rel="noopener">Lux Aeterna Audio</a>.</li>
    </ul>
  </section>
  <p class="forget"><button type="button" class="start-over" data-start-over>start over</button></p>`,
  };
}

// ---- the achievements: things he noticed you doing ----
// Earned: the reveal's wax stamp in its metal (e1113-02), name, the date and a line. Locked: the same blob as a faint
// dashed outline with a faint mark, the name and a vague hint; one that would give a secret away is only "???" (no
// name, no hint, no drawing: not even in the page). A section whose every entry is such a secret is untitled until one
// of them is earned. The stamps are static here: the stamp-down and the chime are the reveal's.
// Two views (e1113-05), remembered on this device (store 'books.achView', wiped by start over with everything else):
// by section (the default), or all at once: one compact column per section, its short name across the top, every
// stamp running down it. Tapping a stamp there puts its name and line in a bar at the top that stays while the
// columns scroll (achievement's line once earned, its hint while locked, "locked" for a secret).
export const ACH_VIEW = 'books.achView';
const GRID = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z"/></svg>';
const LINES = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
export function achievementsHTML() {
  const at = (a) => Number(store.get('achievements.' + a.id)) || 0;
  const all = store.get(ACH_VIEW) === 'all';
  const earned = ACHIEVEMENTS.filter(at).length;
  const card = (a) => {
    const t = at(a);
    if (t) return `<li class="ach earned ${a.id === 'platinum' ? 'platinum' : ''}" data-id="${a.id}">${wax(a)}<h2>${esc(a.name)}</h2><p>${esc(a.said)}</p><small>${dateOf(t)}</small></li>`;
    if (a.secret) return `<li class="ach locked secret">${blank(a)}<h2>???</h2><small>locked</small></li>`;
    return `<li class="ach locked" data-id="${a.id}">${blank(a)}<h2>${esc(a.name)}</h2><p>${esc(a.hint)}</p><small>locked</small></li>`;
  };
  // a stamp in the all-at-once view: a button that names itself (a locked secret is only "locked", with no id)
  const stamp = (a) => {
    const t = at(a), hide = !t && a.secret;
    return `<li><button type="button" class="stamp${t ? ' earned' : ''}" data-stamp${hide ? '' : ` data-id="${a.id}"`} aria-label="${hide ? 'locked' : esc(a.name)}">${t ? wax(a) : blank(a)}</button></li>`;
  };
  const sections = GROUPS.map(([id, title, short]) => {
    const list = ACHIEVEMENTS.filter((a) => a.group === id), got = list.filter(at).length;
    const named = got || list.some((a) => !a.secret);
    return { title: named ? title : '???', short: named ? short : '???', list, got };
  });
  const groups = all
    ? `<div class="ach-peek" aria-live="polite"><span>tap a stamp</span></div>
  <div class="ach-cols">${sections.map((g) => `<section class="ach-col" aria-label="${esc(g.title)}"><h3><span>${esc(g.short)}</span><small>${g.got}/${g.list.length}</small></h3><ol>${g.list.map(stamp).join('')}</ol></section>`).join('')}</div>`
    : sections.map((g) => `<section class="ach-group"><h3>${esc(g.title)} <small>${g.got} / ${g.list.length}</small></h3><ol class="achs">${g.list.map(card).join('')}</ol></section>`).join('');
  return {
    title: 'achievements', tally: `<b>${earned}</b> of ${ACHIEVEMENTS.length} earned`,
    tools: `<button type="button" class="felt ach-view" data-ach-view>${all ? LINES + 'by section' : GRID + 'all at once'}</button>`,
    // all at once keeps the columns right under the header (all 46 on one desktop screen): no lead, the link below
    body: all ? `<div id="groups" class="all">${groups}</div>
  <p class="book-links after"><a href="spellbook.html" data-book="grimoire">the grimoire</a></p>`
      : `<p class="lead">Things he noticed you doing.<br>Some of them he would rather you found yourself.</p>
  <p class="book-links"><a href="spellbook.html" data-book="grimoire">the grimoire</a></p>
  <div id="groups" class="by-section">${groups}</div>`,
  };
}
// What the bar at the top says for a tapped stamp (by its data-id; none for a locked secret)
function peekHTML(id) {
  const a = id && ACHIEVEMENTS.find((x) => x.id === id), t = a && Number(store.get('achievements.' + a.id));
  if (!a || (!t && a.secret)) return '<b>???</b><span>locked</span>';
  return `<b>${esc(a.name)}</b><span>${esc(t ? a.said : a.hint)}</span>`;
}

const BOOKS = { grimoire: grimoireHTML, achievements: achievementsHTML };

export function createBooks(site) {
  const { stage, input, freeze, renderer = stage.renderer } = site;
  let pop = null, sheet = null, showing = null, release = null, opener = null, inertBefore = [], confirmEl = null;
  // The phone's back button (integration, playtest-2): an open book has a history entry of its own (same address),
  // so Back closes the book instead of leaving the page. Closing it any other way steps back over that entry.
  let pushed = false, skipPop = 0;
  const calm = () => stage.reducedMotion;

  function render(name) {
    const b = BOOKS[name]();
    pop.setAttribute('aria-label', b.title);
    sheet.innerHTML = `<main><header>
    <button type="button" class="home" data-close>&larr; the cat</button>
    <h1 class="name" aria-label="Sigil Cat">${document.getElementById('name')?.innerHTML || 'Sigil Cat'}</h1>
    <div class="head-r"><p class="tally">${b.tally}</p>${b.tools || ''}</div></header>
  ${b.body}</main>`;
    sheet.scrollTop = 0;
    sheet.dataset.book = name;
  }
  function open(name) {
    if (!BOOKS[name]) return false;
    if (showing) { closeConfirm(); render(name); showing = name; sheet.focus({ preventScroll: true }); return true; }
    if (!stage.loaded) return false;
    showing = name; opener = document.activeElement;
    // Freeze first: the sheet's own animation starts after, so it is the one thing on the page still moving.
    release = freeze.hold('book');
    input.lock('book', true);
    // three keeps a list of what to draw per scene; it is rebuilt on the first frame back
    renderer.renderLists?.dispose?.();
    pop = document.createElement('div'); pop.className = 'book-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true');
    sheet = document.createElement('div'); sheet.className = 'book book-sheet'; sheet.tabIndex = -1;
    pop.append(sheet);
    inertBefore = [...document.body.children].map((n) => [n, n.inert]);
    for (const [n] of inertBefore) n.inert = true;
    document.body.append(pop); document.body.classList.add('book-open');
    render(name);
    pop.addEventListener('pointerdown', (e) => { pop.downOutside = e.target === pop; });
    pop.addEventListener('click', onClick);
    pop.addEventListener('keydown', onKey);
    sheet.focus({ preventScroll: true });
    try { history.pushState({ ...(history.state || {}), sigilBook: name }, ''); pushed = true; } catch { pushed = false; }
    pop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: calm() ? 160 : 200, easing: 'ease-out' });
    if (!calm()) sheet.animate([{ transform: 'translateY(14px) scale(.985)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1)' });
    return true;
  }
  function close(fromBack = false) {
    if (!showing) return false;
    if (pushed) { pushed = false; if (!fromBack) { skipPop++; history.back(); } }
    const was = pop, r = release;
    showing = null; release = null; pop = sheet = confirmEl = null;
    for (const [n, v] of inertBefore) n.inert = v;
    inertBefore = [];
    document.body.classList.remove('book-open');
    input.lock('book', false);
    r?.();                        // the world runs again at once, under the sheet as it fades
    was.style.pointerEvents = 'none';
    const out = was.animate([{ opacity: 1 }, { opacity: 0 }], { duration: calm() ? 120 : 160, easing: 'ease-in', fill: 'forwards' });
    out.finished.then(() => was.remove(), () => was.remove());
    if (opener?.isConnected) opener.focus({ preventScroll: true }); else stage.canvas.focus({ preventScroll: true });
    opener = null;
    return true;
  }

  // ---- start over (e1112-39): a clear confirm, then a wipe and a fresh game ----
  function openConfirm() {
    if (confirmEl) return;
    confirmEl = document.createElement('div'); confirmEl.className = 'book-confirm';
    confirmEl.innerHTML = `<div class="card-confirm" role="alertdialog" aria-modal="true" aria-labelledby="wipe-title" aria-describedby="wipe-words">
      <h2 id="wipe-title">Start over?</h2>
      <p id="wipe-words">Everything on this device is wiped: every sign and secret found, every achievement, every keepsake and where it sits, his butter, your bonks. He forgets you, and the cat begins again from nothing. This can't be undone.</p>
      <div class="row"><button type="button" class="pill felt" data-keep>keep playing</button><button type="button" class="pill felt danger" data-wipe>wipe it all and start over</button></div></div>`;
    pop.append(confirmEl);
    confirmEl.querySelector('[data-keep]').focus({ preventScroll: true });
    if (!calm()) confirmEl.firstElementChild.animate([{ transform: 'scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1)' });
  }
  function closeConfirm() {
    if (!confirmEl) return false;
    confirmEl.remove(); confirmEl = null;
    sheet?.querySelector('[data-start-over]')?.focus({ preventScroll: true });
    return true;
  }
  function startOver() {
    store.wipe();
    pushed = false;               // the fresh game replaces this entry; nothing to step back over
    // a fresh game at the same address, without anything that asked for a book
    const u = new URL(location.href); u.searchParams.delete('book');
    location.replace(u.href);
  }

  // ---- the achievements book's two views (e1113-05) ----
  function switchView() {
    if (store.get(ACH_VIEW) === 'all') store.del(ACH_VIEW); else store.set(ACH_VIEW, 'all');
    store.flush();                // the world (and its timers) is frozen while a book is open; keep it now
    render('achievements');
    sheet.querySelector('[data-ach-view]')?.focus({ preventScroll: true });
  }
  function peek(btn) {
    for (const n of sheet.querySelectorAll('.stamp.on')) n.classList.remove('on');
    btn.classList.add('on');
    const bar = sheet.querySelector('.ach-peek');
    if (bar) bar.innerHTML = peekHTML(btn.dataset.id);
  }

  function onClick(e) {
    const t = e.target;
    if (t === pop && pop.downOutside) { close(); return; }                     // a click outside the sheet
    if (confirmEl && t === confirmEl) { closeConfirm(); return; }               // outside the confirm's card
    const b = t.closest?.('[data-close], [data-book], [data-start-over], [data-keep], [data-wipe], [data-ach-view], [data-stamp]');
    if (!b) return;
    if (b.matches('[data-stamp]')) peek(b);
    else if (b.matches('[data-ach-view]')) switchView();
    else if (b.matches('[data-close]')) close();
    else if (b.matches('[data-book]')) { e.preventDefault(); open(b.dataset.book); }
    else if (b.matches('[data-start-over]')) openConfirm();
    else if (b.matches('[data-keep]')) closeConfirm();
    else if (b.matches('[data-wipe]')) startOver();
  }
  // Back: the book closes (a confirm with it). The step back close() takes itself is skipped.
  addEventListener('popstate', () => { if (skipPop) { skipPop--; return; } if (showing) close(true); });
  // Escape: the confirm first, then the book (the input lock hands every Escape to input.onEscape)
  input.onEscape.push(() => { if (!showing) return; if (!closeConfirm()) close(); });
  // Tab stays inside the pop-up (the page under it is inert anyway).
  function onKey(e) {
    if (e.key !== 'Tab') return;
    const scope = confirmEl || sheet, items = [...scope.querySelectorAll('button, a[href]')];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && (i === items.length - 1 || i < 0)) { e.preventDefault(); items[0].focus(); }
  }

  // The footer's links open the pop-ups. They keep their addresses, so a new tab or a copied link still works.
  for (const [id, name] of [['grimoire', 'grimoire'], ['achievements', 'achievements']]) {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); open(name);
    });
  }

  return {
    open, close, get showing() { return showing; }, get element() { return pop; }, get confirming() { return !!confirmEl; },
    // the old addresses (spellbook.html, achievements.html) arrive as ?book=...: opened once he is on screen
    fromAddress() {
      const want = stage.opt('book'); if (!BOOKS[want]) return;
      const u = new URL(location.href); u.searchParams.delete('book'); history.replaceState(history.state, '', u.href);
      open(want);
    },
  };
}
