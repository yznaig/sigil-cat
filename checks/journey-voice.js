// The cat's voice (docs/journey/design.md §4, §7 unit "voice"; src/journey/voice.js). Run on a fresh save with
// ?nudge=fast (stuck after 10 s, then every 15 s; the voice is on under automation with it), then
// checks/journey-voice-reload.js after a reload:
//   the hook: hook-1 within 5 s of the doors, hook-3 on the first real tap; the line is on the page; never hook-4
//     (the ghost doodle's line, removed with it)
//   stuck: with no input a nudge is spoken whose text is the next 'cat' hint of a node the picker could choose (the
//     lowest open chapter), journey.hinted counts it, 'hint' is emitted; the next stuck interval speaks the next hint
//     or another node, never the same line twice in a row
//   an achievement resets the stuck clock (no nudge for the next interval)
//   nothing is said while a book is open or Butterman runs
//   every line spoken emitted 'said' and is in 'journey.said'
const J = site.journey;
// a book freezes the page's timers (src/core/freeze.js), the check's own sleep too: wait on the wall clock there
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
check('voice: the part is there and on', await until(() => J.voice?.on === true, 10000), JSON.stringify(Object.keys(J.voice || {})));
const V = J.voice, L = () => V.log;
const saidEv = [];
const unsaid = J.on('said', (d) => saidEv.push(d));
const n0 = L().length;
const catHints = (id) => J.node(id).hints.filter((h) => h.via === 'cat').map((h) => h.text);

// ---- the hook ----
check('voice: the doors open', await until(() => site.shell.revealed, 15000));
const h1 = await until(() => L().some((l) => l.id === 'hook-1'), 9000) && L().find((l) => l.id === 'hook-1');
const st = V.state();
check('voice: hook-1 is spoken within 5 s of the doors', !!h1 && h1.at - st.revealedAt <= 5000 && h1.at - st.revealedAt >= 1000, h1 ? `${h1.at - st.revealedAt} ms after` : JSON.stringify(L()));
check('voice: hook-1 is on the page, in his speech line', await until(() => (ui.speechEl?.textContent || '').includes('see me') || L().length > 1, 4000), ui.speechEl?.textContent);
await until(() => L().some((l) => l.id === 'hook-2'), 12000);
await until(() => !ui.speaking, 8000);
await __shot('voice-hook');
const m = catMid(); await tap(m.x, m.y);
const h3 = await until(() => L().some((l) => l.id === 'hook-3'), 8000);
check('voice: hook-3 on the first tap', h3, L().map((l) => l.id).join());
check('voice: the first visit has no return line', !L().some((l) => /^back-/.test(l.id)));

// ---- stuck: no input from here ----
const stuck = () => L().filter((l) => l.trigger === 'stuck' || l.trigger === 'stuck-repeat' || l.trigger === 'stuck-again');
const hints = [];
J.on('hint', (d) => hints.push(d));
// what the picker could choose right now (the frontier's lowest chapter among nodes that have cat hints)
const hinted0 = { ...(store.get('journey.hinted', {}) || {}) };
const open = J.frontier().filter((n) => !n.grind && n.hints.some((h) => h.via === 'cat'));
const minCh = Math.min(...open.map((n) => n.ch));
const got1 = await until(() => stuck().length >= 1, 60000, 100);
const s1 = stuck()[0];
const node1 = s1 && J.node(s1.node);
check('voice: stuck with no input speaks a nudge', got1, JSON.stringify(V.state()));
check('voice: the nudge names a node the picker could choose (open, lowest chapter)', !!node1 && open.includes(node1) && node1.ch === minCh, `${s1?.node} ch${node1?.ch}, lowest ${minCh}`);
check('voice: its text is that node\'s next cat hint', !!node1 && s1.text === catHints(node1.id)[hinted0[node1.id] || 0], JSON.stringify(s1));
check('voice: journey.hinted counts it', !!node1 && (store.get('journey.hinted', {})[node1.id] || 0) === (hinted0[node1.id] || 0) + 1, JSON.stringify(store.get('journey.hinted')));
check('voice: a hint event is emitted', hints.some((h) => h.node === s1?.node), JSON.stringify(hints));
await until(() => !ui.speaking, 8000);
await __shot('voice-nudge');
const got2 = await until(() => stuck().length >= 2, 60000, 100);
const s2 = stuck()[1];
const okNext = !!s2 && s2.id !== s1.id && (s2.node !== s1.node || s2.text === catHints(s1.node)[(hinted0[s1.node] || 0) + 1]);
check('voice: the next stuck interval speaks the next hint or another node, not the same line', got2 && okNext, JSON.stringify([s1?.id, s2?.id]));
check('voice: never the same line twice in a row', L().every((l, i, a) => !i || a[i - 1].id !== l.id), L().map((l) => l.id).join());
check('voice: nudges are a stuck interval apart (>= 15 s of play)', !!s2 && s2.play - s1.play >= V.timing.repeat - 500, `${s2 && s2.play - s1.play} ms`);

// ---- an achievement resets the stuck clock ----
await until(() => !ui.speaking, 8000);
const before = stuck().length;
site.achievements.unlock('spin');
const t0 = performance.now();
await sleep(V.timing.first - 1500);
check('voice: an achievement resets the stuck clock (no nudge for the next interval)', stuck().length === before && J.sinceProgressMs() < V.timing.first, `${stuck().length - before} nudges in ${Math.round(performance.now() - t0)} ms`);
check('voice: the achievement got its reaction', L().some((l) => l.id === 'react-spin'), L().slice(-3).map((l) => l.id).join());

// ---- quiet while a book is open, or Butterman runs ----
const watch = async (ms, busyNow) => { const n = L().length; let leaked = null; const t = performance.now(); while (performance.now() - t < ms && busyNow()) { if (L().length > n && busyNow()) { leaked = L().at(-1).id; break; } await sleep(100); } return leaked; };
await until(() => !ui.speaking, 8000);
site.books.open('grimoire');
for (let i = 0; i < 30 && !site.books.showing; i++) await wsleep(100);
const nBook = L().length;
await wsleep(Math.max(V.timing.repeat, V.timing.first) + 6000);
check('voice: the book was open and stuck time ran under it', site.books.showing === 'grimoire' && J.sinceProgressMs() > V.timing.first, `${site.books.showing} ${Math.round(J.sinceProgressMs())}`);
check('voice: nothing is said while a book is open', L().length === nBook, L().slice(nBook).map((l) => l.id).join());
await __shot('voice-book-quiet');
site.books.close();
check('voice: after the book closes he speaks again', await until(() => L().length > nBook, 30000, 100), L().slice(-2).map((l) => l.id).join());
await until(() => !ui.speaking, 8000);
const nB = L().length;
site.fire('butterman');
check('voice: Butterman starts', await until(() => E.butterman?.running, 5000));
const tb = performance.now(), leak = await watch(90000, () => E.butterman?.running);
note('voice: butterman', `ran ${Math.round((performance.now() - tb) / 1000)} s`);
check('voice: nothing is said while Butterman runs', !leak, `${leak} (${L().slice(nB).map((l) => l.id).join()})`);

// ---- reactions: a last-page piece is announced (and takes its achievement's own reaction's place); a fizzle ----
await until(() => !ui.speaking, 8000);
const nP = L().length;
site.achievements.unlock('birthday');
check('voice: a last-page piece is announced', await until(() => L().slice(nP).some((l) => l.id === 'piece-1'), 20000, 100), L().slice(nP).map((l) => l.id).join());
check('voice: ...instead of that achievement\'s own reaction', !L().slice(nP).some((l) => l.id === 'react-cake'));
await until(() => !ui.speaking, 8000);
const spiral = Array.from({ length: 80 }, (_, i) => { const a = i / 79 * Math.PI * 5, r = 8 + i * 0.7; return { x: r * Math.cos(a), y: r * Math.sin(a) }; });
const ox = MOBILE ? 130 : 220, oy = stage.height * 0.6;
await drag(spiral.map((p) => ({ x: ox + p.x, y: oy + p.y })), 5);
const inked = site.ink.log.at(-1);
if (inked && !inked.name && inked.reason !== 'line' && inked.reason !== 'short') check('voice: a fizzle gets a reaction', await until(() => L().some((l) => l.id === 'react-scribble'), 15000, 100), L().slice(-2).map((l) => l.id).join());
else note('voice: fizzle not drawn', JSON.stringify(inked));

// ---- every line emitted 'said', and is saved ----
const mine = L().slice(n0).filter((l) => l.at >= 0);
const evIds = saidEv.map((d) => d.id);
check('voice: every line spoken emitted said', mine.length > 4 && mine.every((l) => evIds.includes(l.id)) && saidEv.every((d) => d.text), `${mine.length} lines, ${saidEv.length} said`);
const saved = store.get('journey.said', []);
check('voice: what he said is saved (journey.said)', mine.slice(-12).every((l) => saved.includes(l.id)), saved.join());
check('voice: no hook-4 (the ghost doodle\'s "the air takes ink" is gone), nothing waiting to say it', !L().some((l) => l.id === 'hook-4') && !V.state().pending.includes('hook-4') && !saved.includes('hook-4'), L().map((l) => l.id).join());
check('voice: one line at a time on the page, and nothing queued behind his own', !ui.speaking || (ui.speechEl?.textContent || '').length > 0);
unsaid();
store.set('voiceCheck', { lines: L().map((l) => l.id) });
