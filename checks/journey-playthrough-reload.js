// After checks/journey-playthrough.js, reloaded: the post-game. A welcome back (a return line, not the hook), no
// ending on its own, Goodnight and the whole page kept, nothing left to nudge but the post-game.
const J = site.journey, A = site.achievements;
check('playthrough reload: the voice is up', await until(() => J.voice?.on === true && J.ending, 10000));
const V = J.voice;
check('playthrough reload: a welcome back, not the hook', await until(() => V.log.some((l) => /^return/.test(l.trigger)), 15000) && !V.log.some((l) => /^hook/.test(l.id)), V.log.map((l) => l.id).join());
check('playthrough reload: the ending is kept and does not replay', !!store.get('journey.ended') && A.has('ending') && !J.ending.running && !input.locked);
check('playthrough reload: all eight pieces kept', J.lastpage.count() === 8 && J.lastpage.whole());
check('playthrough reload: the post-game idle lines are his now', (await import(new URL('src/journey/lines.js', document.baseURI).href)).LINES.some((l) => l.when === 'idle-post'));
