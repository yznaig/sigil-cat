// The cat's voice (docs/journey/design.md §4): the hook, coming back, idle chatter, reactions, last-page pieces and
// the stuck nudges. Every line goes through site.ui.speak (his script above his head); this file only decides WHEN
// and WHICH. The lines are ./lines.js (his own) and the 'cat' hints in ./graph.js (the nudges).
//
// One timer, once a second (no per-frame work). Nothing is said while the page is frozen or hidden, the doors are
// shut, or journey.busy() (a book, another line, an egg, a drag, a held thing, ink on the air), nor during the ending.
//   stuck    visible play since the last live achievement >= 3 min (first nudge of a visit), then every 4 min more,
//            only after 8 s without input. pickNudge() names the node; its next 'cat' hint is spoken and counted in
//            'journey.hinted'. All of a node's hints said: once per visit he points at the journal instead.
//   idle     45 s without input: a flavour line (never a hint), at most one per 90 s, four per visit.
//   pacing   at most one line per 20 s (the hook and the reactions keep their own small gaps); a line said in his
//            last 12 ('journey.said') is skipped.
// Every line spoken emits journey 'said' {id, text, node} (the journal keeps them); a nudge also emits 'hint'.
//
// URL: ?nudge=fast  stuck after 10 s, then every 15 s (checks; voice on under automation too)
//      ?voice=0     he says nothing of his own; ?voice=1 turns him on under automation (off there by default, like the
//                   doors, so the older checks keep a quiet cat)
// Debug/checks: journey.voice.log (what he said, with the trigger), .state(), .tick() (one step now).
import { LINES } from './lines.js';

const T = {
  first: 180e3, repeat: 240e3, still: 8e3,         // stuck: first nudge, then every; ms without input before a nudge
  visitMin: 60e3,                                  // a returning player gets a minute of play before any nudge
  idle: 45e3, idleGap: 90e3, idleMax: 4,           // idle chatter
  gap: 20e3, reactGap: 4e3,                         // pacing between journey lines
  hookAt: 3e3, hookNext: 6e3, returnAt: 4e3,
  recent: 12, keep: 40, longAway: 3 * 864e5,
};
const FAST = { first: 10e3, repeat: 15e3, visitMin: 0 };
// where each last-page piece "was" ({thing} in piece-2): the last page's own names (journey.lastpage.things) win, so
// he and the page agree; these are only the fallback if that part is missing
const THING = { fluent: 'ninth sign', lostgame: 'controller', recycle: 'bin', birthday: 'cake', dressup: 'last hat',
  light: 'lamp', collector: 'shelf', curator: 'board' };
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

export default function createVoice(site, journey) {
  const { stage, store } = site;
  const want = stage.opt('voice'), fast = stage.opt('nudge') === 'fast';
  const on = want === '1' || (want !== '0' && (fast || !navigator.webdriver));
  const K = fast ? { ...T, ...FAST } : T;
  const log = [];
  const api = { log, on, timing: K, state: () => ({}), tick: () => {} };
  if (!on) return api;

  const byId = new Map(LINES.map((l) => [l.id, l]));
  const firstVisit = Number(journey.get('journey.visits', 1)) <= 1 && !journey.get('journey.hooked');
  const lastVisit = Number(journey.get('journey.lastVisit', 0)) || 0;   // the visit before this one (index.js writes this one's after the parts load)
  let lastLineAt = -1e9, lastInput = performance.now(), revealedAt = null, ending = false;
  let lastNudgePlay = null, idleCount = 0, lastIdleAt = -1e9, booksSaid = false, noneSaid = false, fizzleSaid = false;
  const pending = [];   // reactions and pieces waiting for a free moment: {id, vars, node, at, until, when?, gap}

  const said = () => journey.get('journey.said', []) || [];
  const recent = (id) => said().slice(-K.recent).includes(id);
  const okLine = (l) => (!l.if || journey.has(l.if) || journey.node(l.if)?.doneKey && journey.get(journey.node(l.if).doneKey))
    && (!l.unless || !(journey.has(l.unless) || journey.node(l.unless)?.doneKey && journey.get(journey.node(l.unless).doneKey)));
  const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));

  // the shell, the freeze, a hidden tab, the ending: the stage is not his to talk on
  const away = () => !site.shell?.revealed || site.freeze?.frozen || document.hidden || ending;
  const busy = () => journey.busy() || !!site.ink?.busy || !!site.worldInput?.held || !!site.cat?.popping;
  const free = () => !away() && !busy();

  function say(id, text, { node = null, trigger = '', vars } = {}) {
    text = fill(text, vars);
    site.ui.speak(text);
    lastLineAt = performance.now();
    const list = [...said().filter((x) => x !== id), id].slice(-K.keep);
    store.set('journey.said', list);
    log.push({ id, text, node, trigger, at: Math.round(lastLineAt), play: Math.round(journey.playMs()) });
    if (log.length > 60) log.shift();
    journey.emit('said', { id, text, node });
    return true;
  }
  const sayLine = (id, opts = {}) => { const l = byId.get(id); return l ? say(id, l.text, { trigger: l.when, ...opts }) : false; };
  // one line for a trigger: its eligible lines, not said lately (oldest-said first, then random)
  function pickFor(when) {
    const ok = LINES.filter((l) => l.when === when && okLine(l));
    const fresh = ok.filter((l) => !recent(l.id));
    if (!fresh.length) return null;
    const s = said(), never = fresh.filter((l) => !s.includes(l.id));
    const pool = never.length ? never : fresh;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const queue = (id, o = {}) => { if (pending.some((p) => p.id === id && p.key === o.key)) return; const now = performance.now(); pending.push({ id, at: now + (o.delay || 0), until: now + (o.ttl || 90e3), gap: K.reactGap, ...o }); };
  const onceEver = (id) => !said().includes(id) && !journey.get('journey.voiceOnce', {})?.[id];
  const markOnce = (id) => store.set('journey.voiceOnce', { ...(journey.get('journey.voiceOnce', {}) || {}), [id]: Date.now() });

  // ---- input: anything the player does resets the idle clock ----
  const touched = () => { lastInput = performance.now(); };
  for (const t of ['pointerdown', 'keydown', 'wheel']) addEventListener(t, touched, { capture: true, passive: true });

  // ---- first visit: the hook (design §6.2) ----
  if (firstVisit) {
    store.set('journey.hooked', Date.now());
    site.cat?.onTap?.push(() => { if (!said().includes('hook-3')) queue('hook-3', { gap: 0, ttl: 20e3, front: true }); });
  }

  // ---- reactions: things that already happen, through the hooks the page already has ----
  const REACT = {   // achievement -> [line id, delay ms, wait-until?]
    shelf: ['react-shelf', 2500], board: ['react-board', 2500], spin: ['react-spin', 600],
    bite: ['react-bite', 1200], void: ['react-void', 800, () => !site.eggs?.galaxy?.isOpen],
    loaf: ['react-bread', 600, () => (site.eggs?.bread?.state ?? 'cat') === 'cat'],
    birthday: ['react-cake', 1500], platinum: ['post-4', 3000],
  };
  site.achievements?.onUnlock?.((a, { quiet } = {}) => {
    if (quiet) return;
    // a new piece takes the moment (index.js has already emitted it); its reaction would be one line too many
    if (pieced.has(a.id)) return;
    const r = REACT[a.id];
    if (r && onceEver(r[0])) queue(r[0], { delay: r[1], when: r[2], once: true });
  });
  site.registry?.onFind?.((f, { quiet } = {}) => {
    if (quiet || f.kind !== 'sigil') return;
    const sigils = site.registry.FINDS.filter((x) => x.kind === 'sigil' && site.registry.has(x.id)).length;
    if (sigils === 1 && onceEver('react-first-sigil')) queue('react-first-sigil', { delay: 3500, once: true });
  });
  journey.on('book-closed', ({ name } = {}) => {
    if (name === 'grimoire' && onceEver('react-grimoire')) queue('react-grimoire', { delay: 1200, once: true, ttl: 30e3 });
  });
  // a fizzle: the ink has no event, so after each release read its last verdict (once per visit)
  let inkSeen = site.ink?.log?.length ? site.ink.log.at(-1).at : -1;
  addEventListener('pointerup', () => setTimeout(() => {
    const l = site.ink?.log?.at(-1);
    if (!l || l.at === inkSeen) return;
    inkSeen = l.at;
    if (!l.name && l.reason !== 'line' && l.reason !== 'short' && !fizzleSaid) { fizzleSaid = true; queue('react-scribble', { delay: 900, ttl: 15e3 }); }
  }, 120), { capture: true, passive: true });
  // several pieces at once (a seeded save, two trophies in one moment): only the newest is told, not a line for each
  const pieced = new Set();
  journey.on('piece', ({ id, n } = {}) => {
    pieced.add(id);
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i].key?.startsWith('piece:')) pending.splice(i, 1);
    // the middle pieces take turns: "it was in the {thing}", then "{n} of eight", so no one line comes four times running
    const lastMid = log.filter((l) => l.id === 'piece-2' || l.id === 'piece-3').at(-1)?.id ?? said().filter((x) => x === 'piece-2' || x === 'piece-3').at(-1);
    let line = n >= 8 ? 'piece-8' : n === 7 ? 'piece-7' : n === 1 ? 'piece-1' : lastMid === 'piece-2' ? 'piece-3' : 'piece-2';
    queue(line, { key: 'piece:' + id, delay: 2200, ttl: 120e3, vars: { n: WORDS[n] || n, thing: journey.lastpage?.things?.[id] || THING[id] || 'room' }, force: true });
  });
  journey.on('ending-start', () => { ending = true; pending.length = 0; });
  journey.on('ending-done', () => { ending = false; lastInput = performance.now(); lastLineAt = performance.now(); });
  journey.on('progress', () => { lastNudgePlay = null; });

  // ---- the doors open: the hook, or a welcome back ----
  const startVisit = () => {
    revealedAt = performance.now();
    if (firstVisit) {
      queue('hook-1', { delay: K.hookAt, gap: 0, ttl: 60e3, front: true });
      queue('hook-2', { delay: K.hookAt + K.hookNext, gap: K.hookNext - 1000, ttl: 60e3, when: () => said().includes('hook-1') });
    } else {
      const long = lastVisit && Date.now() - lastVisit > K.longAway;
      const l = (long && pickFor('return-long')) || pickFor('return');
      if (l) queue(l.id, { delay: K.returnAt, gap: 0, ttl: 30e3, front: true, trigger: long ? 'return-long' : 'return' });
    }
  };

  // ---- the stuck nudge ----
  function nudge() {
    const hinted = journey.get('journey.hinted', {}) || {};
    const p = journey.pickNudge({ last: journey.get('journey.lastNudge') });
    lastNudgePlay = journey.playMs();   // whatever happens, the next try is one interval away
    if (!p) {
      if (!noneSaid && !journey.get('journey.ended')) { noneSaid = true; return sayLine('stuck-none'); }
      return false;
    }
    const id = `hint:${p.node.id}:${p.index}`;
    if (p.exhausted) {
      if (!booksSaid) { booksSaid = true; store.set('journey.lastNudge', p.node.id); return sayLine('stuck-books', { node: p.node.id, trigger: 'stuck-repeat' }); }
      if (recent(id) || log.at(-1)?.id === id) return false;
      return say(id, p.text, { node: p.node.id, trigger: 'stuck-again' });
    }
    store.set('journey.hinted', { ...hinted, [p.node.id]: (hinted[p.node.id] || 0) + 1 });
    store.set('journey.lastNudge', p.node.id);
    say(id, p.text, { node: p.node.id, trigger: 'stuck' });
    journey.emit('hint', { node: p.node.id, index: p.index });
    return true;
  }
  const nudgeDue = () => {
    const play = journey.playMs();
    return journey.sinceProgressMs() >= K.first && play >= K.visitMin && (lastNudgePlay === null || play - lastNudgePlay >= K.repeat);
  };

  function tick() {
    if (revealedAt === null) { if (site.shell?.revealed) startVisit(); else return; }
    const now = performance.now();
    for (let i = pending.length - 1; i >= 0; i--) if (now > pending[i].until || pending[i].skip?.()) pending.splice(i, 1);
    if (!free()) return;
    // reactions, pieces and the hook first: the oldest that is ready and whose own gap has passed
    const ready = pending.filter((p) => now >= p.at && (!p.when || p.when()) && now - lastLineAt >= p.gap);
    const p = ready.find((x) => x.front) || ready.sort((a, b) => a.at - b.at)[0];
    if (p) {
      pending.splice(pending.indexOf(p), 1);
      if (p.once) markOnce(p.id);
      sayLine(p.id, { vars: p.vars, trigger: p.trigger });
      return;
    }
    if (pending.length) return;   // a hook, a piece or a reaction is about to be said: it goes first (each expires)
    if (now - lastLineAt < K.gap) return;
    const still = now - lastInput;
    if (still >= K.still && nudgeDue()) { nudge(); return; }
    if (still >= K.idle && now - lastIdleAt >= K.idleGap && idleCount < K.idleMax) {
      const l = pickFor(journey.get('journey.ended') ? 'idle-post' : 'idle');
      lastIdleAt = now;
      if (l) { idleCount++; sayLine(l.id); }
    }
  }
  setInterval(tick, fast ? 250 : 1000);

  api.tick = tick;
  api.state = () => ({ firstVisit, revealedAt, lastLineAt, lastInput, lastNudgePlay, idleCount, ending, pending: pending.map((p) => p.id),
    since: Math.round(journey.sinceProgressMs()), play: Math.round(journey.playMs()), hinted: journey.get('journey.hinted', {}) });
  api.say = (id) => sayLine(id);
  return api;
}
