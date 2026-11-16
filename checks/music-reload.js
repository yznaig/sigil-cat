// music-reload.js (music lane, 2026-11-15): after checks/music.js, a reload is a new visit. glass-garden is its first
// song again, and orbit-loaf stays in the rotation (the galaxy loaf scene was played on this device).
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wait = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const M = site.music;
const t0 = performance.now(); while (performance.now() - t0 < 20000 && !(M.state.phase === 'playing' && M.element?.currentTime > 0.2)) await wait(40);
check('music reload: the first song is glass-garden again', M.state.track === 'glass-garden' && M.history[0]?.track === 'glass-garden', M.history.map((h) => h.track).join(', '));
check('music reload: orbit-loaf is still unlocked', M.isUnlocked('orbit-loaf') && M.state.unlocked.includes('orbit-loaf'), M.state.unlocked.join(', '));
