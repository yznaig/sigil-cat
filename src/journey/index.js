// The Journey (docs/journey/design.md): the guided progression layered over what the page already has. One entry
// point, wired once in src/main.js after the achievements: `site.journey = createJourney(site)`.
//
// This file is the SHARED interface; each build unit fills one of the parts below in its own file and does not edit
// the others (design §7). Every part is `export default function (site, journey) { ... return api }`, loaded lazily
// after the page is ready so the cat's first frame never waits on it. A part that throws is logged and skipped: the
// page plays on without it.
//   voice.js     unit sc/p9-voice     the cat's lines: hook, idle, return, reactions, stuck nudges   -> journey.voice
//   tells.js     unit sc/p9-tells     environmental tells (scrape, butter shimmer, whisker hum, ...)   -> journey.tells
//   journal.js   unit sc/p9-tells     the grimoire's "what he said" page                            -> journey.journal
//   lastpage.js  unit sc/p9-ending    the torn last page, his own sign (the cat-head sigil)        -> journey.lastpage
//   ending.js    unit sc/p9-ending    the ending scene                                              -> journey.ending
//   snapshot.js  unit sc/p9-share     the "my room" card: canvas image, title, share/save           -> journey.snapshot
//
// journey (what every part gets):
//   journey.has(id) / journey.get(path)         achievements / the store, read the same way everywhere
//   journey.frontier() / .pickNudge() / .pieces() / .chapter() / .title() / .score()   (./progress.js, bound)
//   journey.on(name, fn) / journey.emit(name, detail)   a tiny event bus between parts. Names in use (design §7):
//     'progress' {id}          an achievement was earned (any; quiet ones on load are NOT emitted)
//     'piece' {id, n}          a last-page piece was earned (n of 8)
//     'said' {id, text, node}  the cat said a journey line (the journal records it)
//     'hint' {node, index}     a stuck nudge was spoken for node (index into its 'cat' hints)
//     'ending-start' / 'ending-done'
//     'book-open' {name} / 'book-closed' {name}   (from src/ui/books.js)
//   journey.playMs()                            visible play time this visit (ms; hidden tab does not count)
//   journey.sinceProgressMs()                   visible play time since the last 'progress' (saved across reloads)
//   journey.busy()                              true while something has the stage (an egg, a book, speech, a drag)
// Saved state, all under 'journey.' (design §4): hinted {node: n}, said [line ids, newest last, max 40],
//   lastProgressPlay (ms of play since progress, saved on hide), visits, lastVisit, ended (time), pieceSeen [ids].
import { NODES, PIECES, byId } from './graph.js';
import * as P from './progress.js';

export const PARTS = ['voice', 'tells', 'journal', 'lastpage', 'ending', 'snapshot'];

export function createJourney(site) {
  const { store } = site;
  const has = (id) => !!store.get('achievements.' + id);
  const get = (path, fallback = null) => store.get(path, fallback);
  const listeners = new Map(), sections = {};
  const on = (name, fn) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); return () => listeners.get(name).splice(listeners.get(name).indexOf(fn), 1); };
  const emit = (name, detail = {}) => { for (const fn of [...(listeners.get(name) || [])]) { try { fn(detail); } catch (e) { console.error('journey', name, e); } } };

  // visible play time: counted only while the tab is visible
  let play = 0, since = Number(get('journey.lastProgressPlay', 0)) || 0, last = performance.now(), visible = !document.hidden;
  const tick = () => { const now = performance.now(); if (visible) { play += now - last; since += now - last; } last = now; };
  document.addEventListener('visibilitychange', () => { tick(); visible = !document.hidden; if (!visible) store.set('journey.lastProgressPlay', Math.round(since)); });
  addEventListener('pagehide', () => { tick(); store.set('journey.lastProgressPlay', Math.round(since)); });   // a plain reload keeps the stuck clock too

  const journey = {
    NODES, PIECES, node: (id) => byId.get(id), has, get, on, emit,
    frontier: () => P.frontier(has, get),
    pickNudge: (opts) => P.pickNudge(has, get, get('journey.hinted', {}) || {}, opts),
    pieces: () => P.pieces(has, get), chapter: () => P.chapter(has, get),
    title: () => P.title(has, get), score: () => P.score(has, get),
    playMs: () => { tick(); return play; },
    sinceProgressMs: () => { tick(); return since; },
    busy: () => !!(site.books?.showing || site.ui?.speaking || site.input?.locked || site.cat?.pressing
      || site.eggs?.butterman?.running || site.eggs?.paradox?.active || site.cat?.hidden),
    parts: {},
    // Pages in the books (src/ui/books.js calls bookSections/mountBook; parts only call addSection):
    //   addSection(book, { id, order, html() -> string ('' hides it), mount?(el, sheet) })
    //   book is 'grimoire' or 'achievements'; sections sort by order, go before the grimoire's credits, and each is
    //   wrapped in <section class="journey" data-journey="<id>">. mount runs after every render of that book.
    addSection(book, sec) { (sections[book] ||= []).push(sec); sections[book].sort((a, b) => (a.order || 0) - (b.order || 0)); },
    bookSections(book) {
      return (sections[book] || []).map((s) => { let h = ''; try { h = s.html() || ''; } catch (e) { console.error('journey section', s.id, e); } return h ? `<section class="journey" data-journey="${s.id}">${h}</section>` : ''; }).join('');
    },
    mountBook(book, sheet) {
      emit('book-open', { name: book });
      for (const s of sections[book] || []) { const el = sheet.querySelector(`[data-journey="${s.id}"]`); if (el && s.mount) { try { s.mount(el, sheet); } catch (e) { console.error('journey mount', s.id, e); } } }
    },
  };

  // progress: a live (not quiet) achievement resets the stuck clock; a new piece is announced
  const seen = new Set(P.pieces(has, get));
  site.achievements?.onUnlock?.((a, { quiet } = {}) => {
    if (quiet) return;
    tick(); since = 0; store.set('journey.lastProgressPlay', 0);
    emit('progress', { id: a.id });
    for (const id of P.pieces(has, get)) if (!seen.has(id)) { seen.add(id); emit('piece', { id, n: seen.size }); }
  });

  store.set('journey.visits', Number(get('journey.visits', 0)) + 1);

  // the parts, after the page is up (never on the cat's critical path)
  const start = async () => {
    for (const name of PARTS) {
      try { const m = await import(`./${name}.js`); journey.parts[name] = journey[name] = m.default(site, journey) || {}; }
      catch (e) { console.error('journey part', name, e); }
    }
    store.set('journey.lastVisit', Date.now());
    emit('ready');
  };
  (site.ready ? Promise.resolve(site.ready) : Promise.resolve()).then(start);
  return journey;
}
