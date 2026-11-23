// After checks/journey-voice.js, reload: a later visit is welcomed back (a return line, 4 s after the doors), never
// the hook again, and the hint counts and his saved lines survive.
const J = site.journey;
check('voice reload: the part is there and on', await until(() => J.voice?.on === true, 10000));
const V = J.voice, before = store.get('voiceCheck', { lines: [] });
check('voice reload: not a first visit', V.state().firstVisit === false && Number(store.get('journey.visits', 0)) >= 2, JSON.stringify(V.state()));
const back = await until(() => V.log.some((l) => l.trigger === 'return' || l.trigger === 'return-long'), 15000);
const r = V.log.find((l) => /^return/.test(l.trigger));
check('voice reload: a return line is spoken, a few seconds after the doors', back && r.at - V.state().revealedAt >= 2000 && r.at - V.state().revealedAt <= 8000, r ? `${r.id} "${r.text}" ${r.at - V.state().revealedAt} ms` : JSON.stringify(V.log));
await until(() => !ui.speaking, 8000);
await sleep(2000);
check('voice reload: no hook line', !V.log.some((l) => /^hook/.test(l.id)), V.log.map((l) => l.id).join());
check('voice reload: hint counts survive', Object.values(store.get('journey.hinted', {}) || {}).reduce((a, b) => a + b, 0) >= 2, JSON.stringify(store.get('journey.hinted')));
check('voice reload: his saved lines survive', before.lines.length > 4 && (store.get('journey.said', []) || []).includes(before.lines.at(-1)), JSON.stringify(store.get('journey.said')));
await __shot('voice-return');
